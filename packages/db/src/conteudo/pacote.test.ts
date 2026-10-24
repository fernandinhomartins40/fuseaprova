import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import * as s from '../schema/index.js';
import { criarBancoTeste, type BancoTeste } from '../teste.js';
import { idFixo } from '../seed/ids.js';
import {
  aplicarPacote,
  FORMATO_PACOTE,
  validarPacote,
  type PacoteConteudo,
  type QuestaoPacote,
} from './pacote.js';

const URL =
  'https://www.pciconcursos.com.br/provas/download/agente-administrativo-teste-pr-fau-unicentro-2025';

function questao(numero: number, extra: Partial<QuestaoPacote> = {}): QuestaoPacote {
  return {
    prova: URL,
    numero,
    disciplina: 'portugues',
    assunto: 'ortografia',
    areas: [],
    dificuldade: 2,
    textoApoio: null,
    enunciado: `Enunciado ${numero}`,
    alternativas: (['A', 'B', 'C', 'D', 'E'] as const).map((letra) => ({
      letra,
      texto: `Alt ${letra}`,
    })),
    gabarito: 'B',
    status: 'publicada',
    dica: 'Dica.',
    explicacao: 'Explicação.',
    dicaBolso: 'Bolso.',
    ...extra,
  };
}

function pacote(questoes: QuestaoPacote[]): PacoteConteudo {
  return {
    formato: FORMATO_PACOTE,
    assuntos: [
      {
        disciplina: 'portugues',
        slug: 'ortografia',
        nome: 'Ortografia',
        dicaTitulo: 'Grafia',
        dicaTexto: 'Texto.',
        dicaExemplo: 'Ex.',
      },
      { disciplina: 'especificos', slug: 'atos-administrativos', nome: 'Atos administrativos' },
    ],
    provas: [{ url: URL, cargo: 'Agente Administrativo', ano: 2025, orgao: 'Pref. Teste/PR' }],
    questoes,
  };
}

let banco: BancoTeste;
beforeAll(async () => {
  banco = await criarBancoTeste({ seed: { semCatalogo: true, semExemplos: true } });
});
afterAll(async () => {
  await banco?.fechar();
});

describe('validarPacote', () => {
  it('aceita um pacote certo e aponta os problemas de um errado', () => {
    expect(validarPacote(pacote([questao(1)]))).toEqual([]);
    expect(validarPacote({ formato: 'x' })[0]).toMatch(/formato/);
    const erros = validarPacote(
      pacote([
        questao(1, { dica: null }),
        questao(1),
        questao(2, { assunto: 'inexistente' }),
        questao(3, { disciplina: 'especificos', assunto: 'atos-administrativos', areas: [] }),
        questao(4, { gabarito: null }),
        questao(5, { status: 'anulada', gabarito: null, dica: null }),
      ]),
    );
    expect(erros.join('\n')).toMatch(/#1: publicada sem dica/);
    expect(erros.join('\n')).toMatch(/#1: repetida/);
    expect(erros.join('\n')).toMatch(/#2: assunto portugues:inexistente/);
    expect(erros.join('\n')).toMatch(/#3: específica sem área/);
    expect(erros.join('\n')).toMatch(/#4: sem gabarito/);
    expect(erros.join('\n')).not.toMatch(/#5/);
  });
});

describe('aplicarPacote', () => {
  const lista = [
    ...[1, 2, 3, 4, 5].map((n) => questao(n)),
    questao(6, { status: 'revisao' }),
    questao(7, { status: 'anulada', gabarito: null }),
    ...[16, 17, 18, 19, 20].map((n) =>
      questao(n, {
        disciplina: 'especificos',
        assunto: 'atos-administrativos',
        areas: ['administrativo'],
      }),
    ),
  ];

  it('grava as questões oficiais e monta a trilha só com o que está publicado', async () => {
    const r = await aplicarPacote(banco.db, pacote(lista));
    expect(r.questoes).toEqual({ publicada: 10, revisao: 1, rascunho: 0, anulada: 1 });
    expect(r.unidades).toBe(2);
    expect(r.secoes).toBe(2);
    // 2 seções × (3 lições + baú) + 2 desafios
    expect(r.licoes).toBe(10);

    const qs = await banco.db.select().from(s.questoes).where(eq(s.questoes.origem, 'fau_real'));
    expect(qs).toHaveLength(12);
    const anulada = qs.find((q) => q.numeroOrigem === 7)!;
    expect(anulada.status).toBe('anulada');
    expect(anulada.anuladaMotivo).toMatch(/banca/);
    expect(qs.every((q) => q.provaOrigemId === qs[0]!.provaOrigemId)).toBe(true);

    const [prova] = await banco.db
      .select()
      .from(s.provasOrigem)
      .where(eq(s.provasOrigem.id, qs[0]!.provaOrigemId!));
    expect(prova).toMatchObject({
      cargo: 'Agente Administrativo',
      ano: 2025,
      orgao: 'Pref. Teste',
      uf: 'PR',
      status: 'ativa',
    });

    const us = await banco.db.select().from(s.unidades);
    expect(us.map((u) => [u.titulo, u.area]).sort()).toEqual([
      ['Específicos: Administrativo', 'administrativo'],
      ['Língua Portuguesa', null],
    ]);
    const desafios = await banco.db.select().from(s.licoes).where(eq(s.licoes.tipo, 'desafio'));
    expect(desafios.map((d) => d.tamanho)).toEqual([10, 10]);
    const [a] = await banco.db.select().from(s.assuntos).where(eq(s.assuntos.slug, 'ortografia'));
    expect(a!.dicaTitulo).toBe('Grafia');
  });

  it('aplicar de novo atualiza sem duplicar e mantém a retirada do admin', async () => {
    const [q1] = await banco.db
      .select()
      .from(s.questoes)
      .where(and(eq(s.questoes.origem, 'fau_real'), eq(s.questoes.numeroOrigem, 1)));
    await banco.db.update(s.questoes).set({ status: 'retirada' }).where(eq(s.questoes.id, q1!.id));
    const [antes] = await banco.db.select().from(s.concursos);

    const r = await aplicarPacote(
      banco.db,
      pacote(lista.map((q) => (q.numero === 2 ? { ...q, explicacao: 'Nova.' } : q))),
    );
    expect(r.retiradasMantidas).toBe(1);
    expect(r.versaoConteudo).toBe(antes!.versaoConteudo + 1);
    const qs = await banco.db.select().from(s.questoes).where(eq(s.questoes.origem, 'fau_real'));
    expect(qs).toHaveLength(12);
    expect(qs.find((q) => q.numeroOrigem === 1)!.status).toBe('retirada');
    expect(qs.find((q) => q.numeroOrigem === 2)!.explicacao).toBe('Nova.');
    expect(await banco.db.select().from(s.secoes)).toHaveLength(2);
    expect(await banco.db.select().from(s.licoes)).toHaveLength(10);
  });

  it('seção nova entra no fim e o desafio passa para a última seção', async () => {
    const mais = pacote([
      ...lista,
      ...[21, 22, 23, 24, 25].map((n) => questao(n, { assunto: 'crase' })),
    ]);
    mais.assuntos.push({ disciplina: 'portugues', slug: 'crase', nome: 'Crase' });
    await aplicarPacote(banco.db, mais);
    const unidadeId = idFixo(`trilha:portugues:${idFixo('concurso:palmital-pr-2026')}`);
    const secs = (
      await banco.db.select().from(s.secoes).where(eq(s.secoes.unidadeId, unidadeId))
    ).sort((a, b) => a.ordem - b.ordem);
    expect(secs.map((x) => x.titulo)).toEqual(['Ortografia', 'Crase']);
    const [desafio] = await banco.db
      .select()
      .from(s.licoes)
      .where(eq(s.licoes.id, idFixo(`desafio:${unidadeId}`)));
    expect(desafio!.secaoId).toBe(secs[1]!.id);
  });

  it('recusa pacote inválido sem gravar nada', async () => {
    await expect(aplicarPacote(banco.db, pacote([questao(1, { gabarito: null })]))).rejects.toThrow(
      /inválido/,
    );
  });
});
