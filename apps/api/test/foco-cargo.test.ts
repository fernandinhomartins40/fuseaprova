/**
 * D46: foco no cargo. Uma unidade de Saúde (nível superior) com temas de médico, veterinário e
 * dentista, como na produção: o médico só vê os temas e as questões das provas de médico, e quem
 * não tem questões suficientes da profissão fica com a área inteira, como antes.
 */
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import {
  devolverRevisoesDoFoco,
  relatorioFoco,
  retirarRevisoesForaDoFoco,
} from '../src/servicos/focoCli.js';
import { calcularTrilha } from '../src/servicos/trilha.js';
import { criarAmbienteTeste, type Aluno, type AmbienteTeste } from '../src/teste/index.js';
import { licaoAtual, responderTudo, usuario } from './ajuda.js';

let t: AmbienteTeste;
const questoesDa = {
  medico: [] as string[],
  vet: [] as string[],
  dentista: [] as string[],
  fono: [] as string[],
};
const secao: Record<string, string> = {};
const assunto: Record<string, string> = {};
const primeiraLicao: Record<string, string> = {};
let unidadeId: string;
let desafioId: string;

type Prof = keyof typeof questoesDa;
// Questões de cada prova por tema. O desafio mora na última seção (Odontologia), como na produção.
const TEMAS: [string, Partial<Record<Prof, number>>][] = [
  ['SUS', { medico: 9, vet: 6 }],
  ['Medicina veterinária', { vet: 8 }],
  ['Clínica médica', { medico: 9 }],
  ['Pediatria', { medico: 9 }],
  // Todas as questões de fono num tema só, como na produção.
  ['Fonoaudiologia', { fono: 26 }],
  ['Odontologia clínica', { dentista: 6 }],
];
const alternativas = ['A', 'B', 'C', 'D', 'E'].map((letra) => ({ letra, texto: `Opção ${letra}` }));

beforeAll(async () => {
  t = await criarAmbienteTeste();
  const [c] = await t.db.select().from(schema.concursos).where(eq(schema.concursos.ativo, true));
  const [esp] = await t.db
    .select()
    .from(schema.disciplinas)
    .where(eq(schema.disciplinas.slug, 'especificos'));
  const [u] = await t.db
    .insert(schema.unidades)
    .values({
      concursoId: c!.id,
      area: 'saude_superior',
      ordem: 50,
      titulo: 'Específicos: Saúde (nível superior)',
      disciplinaId: esp!.id,
    })
    .returning();
  unidadeId = u!.id;
  // Cargos sem genérico no seed: poucas questões da profissão, e todas num tema só.
  await t.db.insert(schema.cargos).values([
    { concursoId: c!.id, nome: 'Médico Veterinário', area: 'saude_superior' },
    { concursoId: c!.id, nome: 'Fonoaudiólogo', area: 'saude_superior' },
  ]);
  const prova = async (cargo: string) =>
    (
      await t.db
        .insert(schema.provasOrigem)
        .values({ orgao: `Prefeitura de ${cargo}`, ano: 2025, cargo })
        .returning()
    )[0]!.id;
  const provas: Record<Prof, string> = {
    medico: await prova('Médico Clínico Geral'),
    vet: await prova('Médico Veterinário'),
    dentista: await prova('Cirurgião Dentista'),
    fono: await prova('Fonoaudiólogo'),
  };
  let numero = 0;
  for (const [i, [nome, qtd]] of TEMAS.entries()) {
    const [a] = await t.db
      .insert(schema.assuntos)
      .values({ disciplinaId: esp!.id, nome, slug: `d46-${i}` })
      .returning();
    assunto[nome] = a!.id;
    const [s] = await t.db
      .insert(schema.secoes)
      .values({ unidadeId, ordem: i + 1, titulo: nome, assuntoId: a!.id })
      .returning();
    secao[nome] = s!.id;
    const [l] = await t.db.insert(schema.licoes).values({ secaoId: s!.id, ordem: 1 }).returning();
    primeiraLicao[nome] = l!.id;
    await t.db.insert(schema.licoes).values({ secaoId: s!.id, ordem: 2, tipo: 'bau' });
    for (const [prof, n] of Object.entries(qtd) as [Prof, number][]) {
      for (let k = 0; k < n; k++) {
        const [q] = await t.db
          .insert(schema.questoes)
          .values({
            origem: 'fau_real',
            provaOrigemId: provas[prof],
            numeroOrigem: ++numero,
            disciplinaId: esp!.id,
            assuntoId: a!.id,
            areas: ['saude_superior'],
            enunciado: `${nome}: questão ${k + 1} da prova de ${prof}`,
            alternativas: alternativas as never,
            gabarito: 'A',
            status: 'publicada',
            publicadoEm: t.relogio.agora(),
          })
          .returning();
        questoesDa[prof].push(q!.id);
      }
    }
  }
  const [d] = await t.db
    .insert(schema.licoes)
    .values({ secaoId: secao['Odontologia clínica']!, ordem: 3, tipo: 'desafio', tamanho: 10 })
    .returning();
  desafioId = d!.id;
}, 120_000);
afterAll(() => t.fechar());

type TrilhaJson = {
  atual: { licaoId: string } | null;
  unidades: { id: string; secoes: { titulo: string; licoes: { id: string; tipo: string }[] }[] }[];
};
const trilha = async (a: Aluno) =>
  (await t.chamar('trilha', { cookie: a.cookie })).json() as TrilhaJson;
const unidadeSaude = (tr: TrilhaJson) => tr.unidades.find((u) => u.id === unidadeId);

/** Conclui (direto no banco) todas as lições da trilha antes de `licaoId`. */
async function concluirAte(a: Aluno, licaoId: string, semFoco = false) {
  const tr = (await calcularTrilha(t.db, await usuario(t, a.id), { semFoco }))!;
  const i = tr.ordem.indexOf(licaoId);
  expect(i, 'lição fora da trilha').toBeGreaterThan(0);
  const agora = t.relogio.agora();
  await t.db
    .insert(schema.progressoLicoes)
    .values(
      tr.ordem
        .slice(0, i)
        .map((id) => ({
          usuarioId: a.id,
          licaoId: id,
          vezes: 1,
          concluidaEm: agora,
          atualizadoEm: agora,
        })),
    )
    .onConflictDoNothing();
}

const soDa = (prof: Prof, ids: string[]) => {
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) expect(questoesDa[prof]).toContain(id);
};
const soDoMedico = (ids: string[]) => soDa('medico', ids);

/** Cria o simulado do cargo e devolve as questões dele que são da unidade de saúde. */
async function especificasDoSimulado(a: Aluno, cargo: string) {
  const [k] = await t.db.select().from(schema.cargos).where(eq(schema.cargos.nome, cargo));
  const r = await t.chamar('simuladoCriar', { cookie: a.cookie, corpo: { cargoId: k!.id } });
  expect(r.statusCode, r.body).toBe(200);
  const [s] = await t.db
    .select()
    .from(schema.simulados)
    .where(eq(schema.simulados.usuarioId, a.id));
  const daSaude = new Set(Object.values(questoesDa).flat());
  return s!.questoes.filter((q) => daSaude.has(q));
}

describe('foco no cargo (D46)', () => {
  it('a trilha do médico só tem os temas das provas de médico, e o desafio vai para a última seção que ficou', async () => {
    const a = await t.alunoPago({}, 'Médico');
    const esp = unidadeSaude(await trilha(a))!;
    expect(esp.secoes.map((s) => s.titulo)).toEqual(['SUS', 'Clínica médica', 'Pediatria']);
    expect(esp.secoes.at(-1)!.licoes.map((l) => l.tipo)).toEqual(['normal', 'bau', 'desafio']);
    expect(esp.secoes.at(-1)!.licoes.at(-1)!.id).toBe(desafioId);
    // As unidades comuns continuam iguais.
    const semFoco = (await calcularTrilha(t.db, await usuario(t, a.id), { semFoco: true }))!;
    const comuns = semFoco.estrutura.unidades
      .filter((x) => x.unidade.area === null)
      .map((x) => x.unidade.id);
    for (const id of comuns) expect((await trilha(a)).unidades.some((u) => u.id === id)).toBe(true);
  });

  it('lição, desafio e treino do médico só usam questões das provas de médico, mesmo num tema com veterinária', async () => {
    const a = await t.alunoPago({}, 'Médico');
    await concluirAte(a, primeiraLicao['SUS']!);
    const id = await licaoAtual(t, a.cookie);
    expect(id).toBe(primeiraLicao['SUS']);
    const licao = (await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id } })).json();
    soDoMedico(licao.questoes.map((q: { id: string }) => q.id));

    const treino = await t.chamar('reforcoIniciar', {
      cookie: a.cookie,
      corpo: { assuntoId: assunto['SUS'] },
    });
    expect(treino.statusCode, treino.body).toBe(200);
    soDoMedico(treino.json().questoes.map((q: { id: string }) => q.id));

    const b = await t.alunoPago({}, 'Médico');
    await concluirAte(b, desafioId);
    expect((await trilha(b)).atual?.licaoId).toBe(desafioId);
    const desafio = (
      await t.chamar('licaoIniciar', { cookie: b.cookie, params: { id: desafioId } })
    ).json();
    expect(desafio.questoes).toHaveLength(10);
    soDoMedico(desafio.questoes.map((q: { id: string }) => q.id));
  });

  it('o simulado do médico tira as específicas só das provas de médico', async () => {
    const especificas = await especificasDoSimulado(await t.alunoPago({}, 'Médico'), 'Médico');
    expect(especificas).toHaveLength(25);
    soDoMedico(especificas);
  });

  it('questões da profissão num tema só: a trilha fica com a área inteira, mas o simulado usa a profissão', async () => {
    const a = await t.alunoPago({}, 'Fonoaudiólogo');
    expect(unidadeSaude(await trilha(a))!.secoes.map((s) => s.titulo)).toEqual(
      TEMAS.map(([nome]) => nome),
    );
    const especificas = await especificasDoSimulado(a, 'Fonoaudiólogo');
    expect(especificas).toHaveLength(25);
    soDa('fono', especificas);
  });

  it('sem profissão no banco ou com poucas questões dela, fica a área inteira, como antes', async () => {
    const todos = TEMAS.map(([nome]) => nome);
    // Psicólogo: nenhuma prova de psicólogo. Veterinário: 14 questões, menos que o mínimo (20).
    for (const cargo of ['Psicólogo', 'Médico Veterinário']) {
      const a = await t.alunoPago({}, cargo);
      expect(
        unidadeSaude(await trilha(a))!.secoes.map((s) => s.titulo),
        cargo,
      ).toEqual(todos);
    }
  });

  it('offline: o pacote segue o foco, e a lição de um pacote de antes do foco ainda vale no sync', async () => {
    const a = await t.alunoPago({}, 'Médico');
    await concluirAte(a, primeiraLicao['SUS']!);
    const pac = (await t.chamar('offlinePacote', { cookie: a.cookie })).json();
    for (const l of pac.licoes) soDoMedico(l.questoes.map((q: { id: string }) => q.id));

    // Pacote antigo: na trilha da área inteira, a lição de veterinária era a 2ª do pacote.
    const vet = primeiraLicao['Medicina veterinária']!;
    const sessao = randomUUID();
    const agora = t.relogio.agora();
    // As 6 primeiras do veterinário são do SUS; as seguintes, do tema da lição.
    const questoes = questoesDa.vet.slice(6, 11);
    const r = await t.chamar('syncTentativas', {
      cookie: a.cookie,
      corpo: {
        pacoteId: pac.pacoteId,
        sessoes: [
          {
            idCliente: sessao,
            tipo: 'licao',
            licaoId: vet,
            iniciadaEm: agora.toISOString(),
            concluidaEm: agora.toISOString(),
          },
        ],
        tentativas: questoes.map((questaoId) => ({
          idCliente: randomUUID(),
          sessaoIdCliente: sessao,
          questaoId,
          resposta: 'A',
          tempoMs: 3000,
          respondidaEm: agora.toISOString(),
        })),
      },
    });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json().rejeitadas).toEqual([]);
    expect(r.json().aceitas).toHaveLength(5);
    const [p] = await t.db
      .select()
      .from(schema.progressoLicoes)
      .where(
        and(eq(schema.progressoLicoes.usuarioId, a.id), eq(schema.progressoLicoes.licaoId, vet)),
      );
    expect(p?.concluidaEm).not.toBeNull();
  });

  it('foco:cargo: o relatório mostra o foco, e as revisões de outra profissão saem da fila e voltam no desfazer', async () => {
    const a = await t.alunoPago({}, 'Médico');
    await concluirAte(a, primeiraLicao['SUS']!);
    const ini = (
      await t.chamar('licaoIniciar', { cookie: a.cookie, params: { id: primeiraLicao['SUS']! } })
    ).json();
    await responderTudo(
      t,
      a.cookie,
      ini.sessaoId,
      ini.questoes.map((q: { id: string }) => q.id),
      1,
    );
    // Uma revisão de veterinária, como as de quem estudou antes do foco.
    const vencida = new Date(t.relogio.agora().getTime() - 60_000);
    await t.db
      .insert(schema.revisoes)
      .values({ usuarioId: a.id, questaoId: questoesDa.vet[0]!, venceEm: vencida });
    const doMedico = ini.questoes[0].id as string;

    const linha = (await relatorioFoco(t.db)).find((l) => l.aluno === a.id.slice(0, 8))!;
    expect(linha).toMatchObject({
      cargo: 'Médico',
      foco: true,
      temasAntes: TEMAS.length,
      temasDepois: 3,
      revisoesFora: 1,
    });
    expect(linha.profissoes).toEqual(['medicina']);

    const status = async () =>
      new Map(
        (await t.db.select().from(schema.revisoes).where(eq(schema.revisoes.usuarioId, a.id))).map(
          (r) => [r.questaoId, r.status],
        ),
      );
    const r = await retirarRevisoesForaDoFoco(t.db, t.relogio.agora());
    expect(r.revisoes).toBeGreaterThanOrEqual(1);
    expect((await status()).get(questoesDa.vet[0]!)).toBe('dominada');
    expect((await status()).get(doMedico)).toBe('ativa');

    expect((await devolverRevisoesDoFoco(t.db, t.relogio.agora())).revisoes).toBeGreaterThanOrEqual(
      1,
    );
    expect((await status()).get(questoesDa.vet[0]!)).toBe('ativa');
    await expect(devolverRevisoesDoFoco(t.db, t.relogio.agora())).rejects.toThrow(
      'Não há revisões',
    );
  });
});
