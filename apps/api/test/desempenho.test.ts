import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { classificarTema, dominioDoAssunto, QUESTOES_REVISAO_PARA_CONTAR, TAMANHO_TREINO, XP } from '@fuse/shared';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { fazerLicao, gabaritos, responderTudo, usuario } from './ajuda.js';

/** D29: central de desempenho, reforço de um tema e treino inteligente. */
let t: AmbienteTeste;
beforeAll(async () => {
  t = await criarAmbienteTeste({ inicio: '2026-11-02T20:00:00-03:00' });
}, 60_000);
afterAll(() => t.fechar());

interface Tema {
  assuntoId: string;
  nome: string;
  disciplina: string;
  classe: string;
  dominio: number | null;
  tentativas: number;
  ultimaEm: string | null;
}
interface QuestaoSessao {
  id: string;
  assunto: { id: string };
  revisao: boolean;
}

async function desempenho(cookie: string) {
  const r = await t.chamar('desempenho', { cookie });
  expect(r.statusCode, r.body).toBe(200);
  return r.json() as {
    resumo: { questoes: number; acertos: number; precisao: number | null; revisoesPendentes: number; trilhaConcluida: boolean; temasNaTrilha: number };
    proximoPasso: string;
    disciplinas: { slug: string; tentativas: number }[];
    temas: Tema[];
  };
}

describe('central de desempenho (D29)', () => {
  it('aluno novo: tudo ainda não visto e o próximo passo é a trilha', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-11-02T20:00:00-03:00');
    const d = await desempenho(a.cookie);
    expect(d.proximoPasso).toBe('trilha');
    expect(d.resumo).toMatchObject({ questoes: 0, acertos: 0, precisao: null, revisoesPendentes: 0, trilhaConcluida: false });
    expect(d.temas.length).toBeGreaterThan(0);
    expect(d.resumo.temasNaTrilha).toBe(d.temas.length);
    for (const tema of d.temas) {
      expect(tema).toMatchObject({ classe: 'nao_visto', tentativas: 0, dominio: null, ultimaEm: null });
    }
  });

  it('depois de uma lição com erros, o tema mostra as tentativas e a classe certa', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-11-03T10:00:00-03:00');
    const l = await fazerLicao(t, a.cookie, 3);
    const qs = l.inicio.questoes as QuestaoSessao[];
    const gab = await gabaritos(t, qs.map((q) => q.id));
    const d = await desempenho(a.cookie);

    expect(d.resumo.questoes).toBe(qs.length);
    expect(d.resumo.acertos).toBe(qs.length - 3);
    expect(d.resumo.precisao).toBe(Math.round(((qs.length - 3) / qs.length) * 100));

    // Respostas por assunto, na ordem: as 3 primeiras erradas (responderTudo).
    const porAssunto = new Map<string, boolean[]>();
    qs.forEach((q, i) => porAssunto.set(q.assunto.id, [...(porAssunto.get(q.assunto.id) ?? []), i >= 3]));
    expect(gab.size).toBe(qs.length);
    for (const [assuntoId, respostas] of porAssunto) {
      const tema = d.temas.find((x) => x.assuntoId === assuntoId)!;
      expect(tema, `tema ${assuntoId} na trilha`).toBeTruthy();
      expect(tema.tentativas).toBe(respostas.length);
      expect(tema.classe).toBe(classificarTema(dominioDoAssunto(respostas)));
      expect(tema.ultimaEm).not.toBeNull();
      expect(d.disciplinas.map((x) => x.slug)).toContain(tema.disciplina);
    }
    const slug = d.temas.find((y) => y.assuntoId === qs[0]!.assunto.id)!.disciplina;
    expect(d.disciplinas.find((x) => x.slug === slug)!.tentativas).toBeGreaterThanOrEqual(1);
  });

  it('com menos de 5 tentativas o tema fica "pouco praticado"', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-11-04T10:00:00-03:00');
    const { temas } = await desempenho(a.cookie);
    const r = await t.chamar('reforcoIniciar', { cookie: a.cookie, corpo: { assuntoId: temas[0]!.assuntoId } });
    expect(r.statusCode, r.body).toBe(200);
    const s = r.json();
    await responderTudo(t, a.cookie, s.sessaoId, s.questoes.slice(0, 2).map((q: QuestaoSessao) => q.id), 1);
    const tema = (await desempenho(a.cookie)).temas.find((x) => x.assuntoId === temas[0]!.assuntoId)!;
    expect(tema).toMatchObject({ tentativas: 2, classe: 'pouco_praticado', dominio: null });
  });
});

describe('reforço de um tema (D29)', () => {
  it('só traz questões do tema, vale XP só pelos acertos, sem gemas, e o erro vai para a revisão', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-11-05T10:00:00-03:00');
    const { temas } = await desempenho(a.cookie);
    const assuntoId = temas[0]!.assuntoId;
    const [assunto] = await t.db.select().from(schema.assuntos).where(eq(schema.assuntos.id, assuntoId));

    const r = await t.chamar('reforcoIniciar', { cookie: a.cookie, corpo: { assuntoId } });
    expect(r.statusCode, r.body).toBe(200);
    const s = r.json();
    expect(s.tipo).toBe('reforco');
    expect(s.gastaVidas).toBe(false);
    expect(s.questoes.length).toBeGreaterThanOrEqual(1);
    expect(s.questoes.length).toBeLessThanOrEqual(TAMANHO_TREINO);
    for (const q of s.questoes as QuestaoSessao[]) expect(q.assunto.id).toBe(assuntoId);
    if (assunto!.dicaTexto?.trim()) expect(s.dica).not.toBeNull();
    expect(r.body).not.toContain('"gabarito"');

    const ids = (s.questoes as QuestaoSessao[]).map((q) => q.id);
    const antes = await usuario(t, a.id);
    await responderTudo(t, a.cookie, s.sessaoId, ids, 1);
    const fim = await t.chamar('sessaoConcluir', { cookie: a.cookie, params: { id: s.sessaoId } });
    expect(fim.statusCode, fim.body).toBe(200);
    const f = fim.json();
    const acertos = ids.length - 1;
    expect(f.tipo).toBe('reforco');
    expect(f.acertos).toBe(acertos);
    expect(f.xpGanho).toBe(acertos * XP.ACERTO);
    expect(f.itensXp.map((i: { tipo: string }) => i.tipo)).not.toContain('licao_concluida');
    expect(f.itensXp.map((i: { tipo: string }) => i.tipo)).not.toContain('licao_perfeita');
    expect(f.gemasGanhas).toBe(0);
    const depois = await usuario(t, a.id);
    expect(depois.gemas).toBe(antes.gemas);
    expect(depois.xpTotal - antes.xpTotal).toBe(acertos * XP.ACERTO);

    // Nenhum progresso de trilha.
    const prog = await t.db.select().from(schema.progressoLicoes).where(eq(schema.progressoLicoes.usuarioId, a.id));
    expect(prog).toHaveLength(0);

    const [rev] = await t.db
      .select()
      .from(schema.revisoes)
      .where(and(eq(schema.revisoes.usuarioId, a.id), eq(schema.revisoes.questaoId, ids[0]!)));
    expect(rev?.status).toBe('ativa');
  });

  it('tema fora da trilha: 404', async () => {
    const a = await t.alunoPago();
    const r = await t.chamar('reforcoIniciar', { cookie: a.cookie, corpo: { assuntoId: randomUUID() } });
    expect(r.statusCode).toBe(404);
    expect(r.json().erro).toBe('Esse tema não está na sua trilha.');
  });

  it('as questões do reforço contam para a ofensiva como as da revisão', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-11-06T10:00:00-03:00');
    const { temas } = await desempenho(a.cookie);
    // Junta questões de reforço até bater o mínimo de questões de revisão do dia.
    let respondidas = 0;
    for (const tema of temas) {
      if (respondidas >= QUESTOES_REVISAO_PARA_CONTAR) break;
      const r = await t.chamar('reforcoIniciar', { cookie: a.cookie, corpo: { assuntoId: tema.assuntoId } });
      if (r.statusCode !== 200) continue;
      const s = r.json();
      const ids = (s.questoes as QuestaoSessao[]).map((q) => q.id);
      await responderTudo(t, a.cookie, s.sessaoId, ids);
      respondidas += ids.length;
      expect((await t.chamar('sessaoConcluir', { cookie: a.cookie, params: { id: s.sessaoId } })).statusCode).toBe(200);
    }
    expect(respondidas).toBeGreaterThanOrEqual(QUESTOES_REVISAO_PARA_CONTAR);
    expect((await usuario(t, a.id)).ofensiva).toBe(1);
  });
});

describe('treino inteligente (D29)', () => {
  it('aluno novo: até 10 questões numa sessão de reforço', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-11-07T10:00:00-03:00');
    const r = await t.chamar('reforcoIniciar', { cookie: a.cookie, corpo: {} });
    expect(r.statusCode, r.body).toBe(200);
    const s = r.json();
    expect(s.tipo).toBe('reforco');
    expect(s.questoes.length).toBeGreaterThanOrEqual(1);
    expect(s.questoes.length).toBeLessThanOrEqual(TAMANHO_TREINO);
    expect(new Set(s.questoes.map((q: QuestaoSessao) => q.id)).size).toBe(s.questoes.length);
    for (const q of s.questoes as QuestaoSessao[]) expect(q.revisao).toBe(false);
  });

  it('com revisão vencida: a central sugere a revisão e o treino inclui o erro', async () => {
    const a = await t.alunoPago();
    t.relogio.definir('2026-11-08T10:00:00-03:00');
    const l = await fazerLicao(t, a.cookie, 1);
    const errou = l.fim.erros[0] as string;
    expect((await desempenho(a.cookie)).proximoPasso).toBe('trilha');

    t.relogio.definir('2026-11-10T10:00:00-03:00');
    const d = await desempenho(a.cookie);
    expect(d.proximoPasso).toBe('revisao');
    expect(d.resumo.revisoesPendentes).toBe(1);

    const r = await t.chamar('reforcoIniciar', { cookie: a.cookie, corpo: {} });
    expect(r.statusCode, r.body).toBe(200);
    const qs = r.json().questoes as QuestaoSessao[];
    expect(qs.length).toBeLessThanOrEqual(TAMANHO_TREINO);
    const q = qs.find((x) => x.id === errou);
    expect(q, 'o erro vencido entra no treino').toBeTruthy();
    expect(q!.revisao).toBe(true);
    for (const x of qs.filter((y) => y.id !== errou)) expect(x.revisao).toBe(false);

    // Acertar o erro no treino avança a revisão (sai da fila de hoje).
    const gab = await gabaritos(t, [errou]);
    const resp = await t.chamar('sessaoResponder', {
      cookie: a.cookie,
      params: { id: r.json().sessaoId },
      corpo: { questaoId: errou, resposta: gab.get(errou)!, tempoMs: 4000 },
    });
    expect(resp.statusCode, resp.body).toBe(200);
    expect((await desempenho(a.cookie)).resumo.revisoesPendentes).toBe(0);
  });
});
