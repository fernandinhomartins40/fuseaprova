import { and, count, eq } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { AVISO_EDITAL, AVISO_EDITAL_PUBLICADO } from '@fuse/shared';
import { criarAmbienteTeste, type Aluno, type AmbienteTeste } from '../src/teste/index.js';
import {
  aplicarEditalPalmital,
  descreverPlano,
  desfazerEditalPalmital,
  planejarEditalPalmital,
  publicarEditalPalmital,
  SLUG_CONCURSO_PALMITAL,
} from '../src/servicos/editalPalmital.js';

/** D45: cargos do edital de Palmital importados sem perder questões, trilha nem alunos. */
let t: AmbienteTeste;
let concursoId: string;
let original: { dataProva: string | null; links: unknown };

beforeAll(async () => {
  t = await criarAmbienteTeste();
  const [c] = await t.db
    .select()
    .from(schema.concursos)
    .where(eq(schema.concursos.slug, SLUG_CONCURSO_PALMITAL));
  concursoId = c!.id;
  original = { dataProva: c!.dataProva, links: c!.links };
}, 60_000);
afterAll(() => t.fechar());

const IGUAIS = [
  'Agente Comunitário de Saúde',
  'Assistente Social',
  'Auxiliar Administrativo',
  'Enfermeiro',
  'Farmacêutico',
  'Fisioterapeuta',
  'Motorista',
  'Nutricionista',
  'Odontólogo',
  'Operador de Máquinas',
  'Psicólogo',
  'Técnico de Enfermagem',
];

const n = async (tabela: PgTable) => Number((await t.db.select({ n: count() }).from(tabela))[0]!.n);
/** Tudo o que a importação NÃO pode mexer. */
const intocaveis = async () => ({
  questoes: await n(schema.questoes),
  assuntos: await n(schema.assuntos),
  unidades: await n(schema.unidades),
  secoes: await n(schema.secoes),
  licoes: await n(schema.licoes),
  progresso: await n(schema.progressoLicoes),
  tentativas: await n(schema.tentativas),
  pedidos: await n(schema.pedidos),
  usuarios: await n(schema.usuarios),
  usuariosConcursos: await n(schema.usuariosConcursos),
});
const cargo = async (nome: string) =>
  (
    await t.db
      .select()
      .from(schema.cargos)
      .where(and(eq(schema.cargos.concursoId, concursoId), eq(schema.cargos.nome, nome)))
  )[0]!;
const concurso = async () =>
  (await t.db.select().from(schema.concursos).where(eq(schema.concursos.id, concursoId)))[0]!;
const me = async (a: Aluno) => (await t.chamar('meObter', { cookie: a.cookie })).json();
const unidadesDaTrilha = async (a: Aluno) =>
  (
    (await t.chamar('trilha', { cookie: a.cookie })).json() as { unidades: { id: string }[] }
  ).unidades.map((u) => u.id);
const agora = () => {
  t.relogio.avancar(60_000);
  return t.relogio.agora();
};

describe('edital de Palmital (D45)', () => {
  let medico: Aluno;
  let enfermeiro: Aluno;

  it('simular mostra o plano e não grava nada', async () => {
    const antes = await t.db
      .select()
      .from(schema.cargos)
      .where(eq(schema.cargos.concursoId, concursoId));
    const p = await planejarEditalPalmital(t.db);
    expect(p.corpo.cargos).toHaveLength(49);
    expect(p.criar.length + p.converter.length + p.atualizar.length).toBe(49);
    expect(p.converter.map((x) => x.nome).sort()).toEqual([...IGUAIS].sort());
    expect(p.converter.every((x) => x.areaAntes === x.areaDepois)).toBe(true);
    expect(p.atualizar).toEqual([]);
    expect(p.genericosQueSomem).toHaveLength(17);
    expect(p.genericosQueSomem).toContain('Médico');
    expect(p.corpo.secoes).toEqual([]);
    expect(descreverPlano(p)).toContain('Nenhum cargo convertido muda de área.');
    const depois = await t.db
      .select()
      .from(schema.cargos)
      .where(eq(schema.cargos.concursoId, concursoId));
    expect(depois).toEqual(antes);
  });

  it('aplicar grava os 49 cargos sem mexer em questões, trilha nem alunos, e o aluno só vê depois de publicar', async () => {
    medico = await t.alunoPago({}, 'Médico');
    enfermeiro = await t.alunoPago({}, 'Enfermeiro');
    const trilhaAntes = await unidadesDaTrilha(medico);
    const enfermeiroAntes = await cargo('Enfermeiro');
    const base = await intocaveis();

    const plano = await aplicarEditalPalmital(t.db, agora());
    expect(plano.alunosParaConfirmar).toBeGreaterThanOrEqual(1);

    expect(await intocaveis()).toEqual(base);
    const doEdital = await t.db
      .select()
      .from(schema.cargos)
      .where(
        and(
          eq(schema.cargos.concursoId, concursoId),
          eq(schema.cargos.generico, false),
          eq(schema.cargos.ativo, true),
        ),
      );
    expect(doEdital).toHaveLength(49);
    // O genérico de mesmo nome virou o cargo do edital: mesmo id, mesma área.
    const enf = await cargo('Enfermeiro');
    expect(enf).toMatchObject({
      id: enfermeiroAntes.id,
      area: enfermeiroAntes.area,
      generico: false,
      ativo: true,
    });
    expect(enf.distribuicao).toEqual({
      portugues: 7,
      matematica: 7,
      gerais: 6,
      especificos: 20,
      pesos: { portugues: 2, matematica: 2, gerais: 2, especificos: 3 },
    });
    expect((await cargo('Médico')).generico).toBe(true);

    const c = await concurso();
    expect(c.status).toBe('aguardando_edital');
    expect(c.dataProva).toBe('2027-02-21');
    expect(c.links.map((l) => l.url)).toContain(
      'https://www.concursosfau.com.br/novo/concurso/pmpal',
    );

    // Antes de publicar, o aluno continua vendo os genéricos e a mesma trilha.
    const resp = (await t.chamar('concurso', { cookie: medico.cookie })).json();
    expect(resp.modoEdital).toBe(false);
    expect(resp.cargos.some((x: { nome: string }) => x.nome === 'Médico')).toBe(true);
    expect(resp.cargos.some((x: { nome: string }) => x.nome === 'Médico Pediatra')).toBe(false);
    expect(resp.avisoEdital).toBe(AVISO_EDITAL);
    expect((await me(medico)).confirmarCargoEdital).toBe(false);
    expect(await unidadesDaTrilha(medico)).toEqual(trilhaAntes);
  });

  it('publicar: os genéricos somem, quem está num genérico confirma o cargo, e as áreas extras continuam', async () => {
    expect(
      (
        await t.chamar('meAtualizar', {
          cookie: medico.cookie,
          corpo: { areasExtras: ['educacao'] },
        })
      ).statusCode,
    ).toBe(200);
    const r = await publicarEditalPalmital(t.db, agora());
    expect(r.usuariosParaConfirmar).toBeGreaterThanOrEqual(1);

    const resp = (await t.chamar('concurso', { cookie: medico.cookie })).json();
    expect(resp.modoEdital).toBe(true);
    expect(resp.cargos).toHaveLength(49);
    expect(resp.cargos.some((x: { nome: string }) => x.nome === 'Médico')).toBe(false);
    expect(resp.avisoEdital).toBe(AVISO_EDITAL_PUBLICADO);

    const m = await me(medico);
    expect(m.confirmarCargoEdital).toBe(true);
    expect(m.areasExtras).toEqual(['educacao']);
    // Quem estava num genérico de mesmo nome já está no cargo do edital.
    expect((await me(enfermeiro)).confirmarCargoEdital).toBe(false);

    // D45: escolher outras áreas continua valendo depois do edital.
    const extras = await t.chamar('meAtualizar', {
      cookie: medico.cookie,
      corpo: { areasExtras: ['educacao', 'operacional'] },
    });
    expect(extras.statusCode, extras.body).toBe(200);
    expect(extras.json().areasExtras).toEqual(['educacao', 'operacional']);

    // Genérico é recusado; o cargo do edital é aceito e mantém a área.
    const gari = await t.chamar('meAtualizar', {
      cookie: medico.cookie,
      corpo: { cargoId: (await cargo('Gari')).id },
    });
    expect(gari.statusCode).toBe(400);
    // Nem o simulado aceita cargo genérico depois do edital: só os cargos do edital.
    const simGenerico = await t.chamar('simuladoCriar', {
      cookie: medico.cookie,
      corpo: { cargoId: (await cargo('Médico')).id },
    });
    expect(simGenerico.statusCode, simGenerico.body).toBe(400);
    expect(simGenerico.json().erro).toMatch(/edital saiu/);
    const ok = await t.chamar('meAtualizar', {
      cookie: medico.cookie,
      corpo: { cargoId: (await cargo('Médico Pediatra')).id },
    });
    expect(ok.statusCode, ok.body).toBe(200);
    expect(ok.json()).toMatchObject({
      confirmarCargoEdital: false,
      area: 'saude_superior',
      cargo: { nome: 'Médico Pediatra', generico: false },
    });
    expect((await t.chamar('trilha', { cookie: medico.cookie })).statusCode).toBe(200);
  });

  it('desfazer volta o concurso e os cargos à foto, sem tocar nos alunos', async () => {
    const base = await intocaveis();
    const r = await desfazerEditalPalmital(t.db, agora());
    expect(r.restaurados).toBe(29);
    expect(await intocaveis()).toEqual(base);

    const c = await concurso();
    expect(c).toMatchObject({
      status: 'aguardando_edital',
      editalPublicadoEm: null,
      dataProva: original.dataProva,
    });
    expect(c.links).toEqual(original.links);
    const enf = await cargo('Enfermeiro');
    expect(enf.generico).toBe(true);
    expect(enf.distribuicao).toEqual({ portugues: 5, matematica: 5, gerais: 5, especificos: 25 });

    const resp = (await t.chamar('concurso', { cookie: medico.cookie })).json();
    expect(resp.modoEdital).toBe(false);
    expect(resp.cargos.map((x: { nome: string }) => x.nome)).toContain('Médico');
    expect(resp.cargos).toHaveLength(29);
    // O aluno que já tinha confirmado continua no cargo dele e com a trilha funcionando.
    const m = await me(medico);
    expect(m).toMatchObject({ confirmarCargoEdital: false, cargo: { nome: 'Médico Pediatra' } });
    expect((await t.chamar('trilha', { cookie: medico.cookie })).statusCode).toBe(200);

    await expect(desfazerEditalPalmital(t.db, agora())).rejects.toThrow(/Não há importação/);
  });

  it('aplicar duas vezes e desfazer volta ao original (usa a primeira foto)', async () => {
    const enfAntes = await cargo('Enfermeiro');
    await aplicarEditalPalmital(t.db, agora());
    await aplicarEditalPalmital(t.db, agora());
    expect((await planejarEditalPalmital(t.db)).atualizar).toHaveLength(49);
    await desfazerEditalPalmital(t.db, agora());
    expect(await cargo('Enfermeiro')).toEqual(enfAntes);
    expect((await concurso()).dataProva).toBe(original.dataProva);
  });
});
