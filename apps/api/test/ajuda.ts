import { eq, inArray } from 'drizzle-orm';
import { expect } from 'vitest';
import { schema } from '@fuse/db';
import type { AmbienteTeste } from '../src/teste/index.js';

export const UUID_X = '3f0c7a8e-2b1d-4c5e-9f00-0123456789ab';

export async function gabaritos(t: AmbienteTeste, ids: string[]): Promise<Map<string, string>> {
  const rows = await t.db.select({ id: schema.questoes.id, g: schema.questoes.gabarito }).from(schema.questoes).where(inArray(schema.questoes.id, ids));
  return new Map(rows.map((r) => [r.id, r.g ?? 'A']));
}

export const errada = (g: string) => (g === 'A' ? 'B' : 'A');

/** Responde todas as questões da sessão; `erros` = quantas errar (as primeiras). */
export async function responderTudo(
  t: AmbienteTeste,
  cookie: string,
  sessaoId: string,
  questoes: string[],
  erros = 0,
) {
  const gab = await gabaritos(t, questoes);
  const respostas = [];
  for (const [i, q] of questoes.entries()) {
    const g = gab.get(q)!;
    const r = await t.chamar('sessaoResponder', {
      cookie,
      params: { id: sessaoId },
      corpo: { questaoId: q, resposta: i < erros ? errada(g) : g, tempoMs: 5000 },
    });
    expect(r.statusCode, r.body).toBe(200);
    respostas.push(r.json());
  }
  return respostas;
}

/** Lição atual da trilha (abre o baú se ele for o nó atual). */
export async function licaoAtual(t: AmbienteTeste, cookie: string): Promise<string> {
  for (;;) {
    const tr = await t.chamar('trilha', { cookie });
    expect(tr.statusCode, tr.body).toBe(200);
    const j = tr.json();
    const id = j.atual.licaoId as string;
    const no = j.unidades
      .flatMap((u: { secoes: { licoes: { id: string; tipo: string }[] }[] }) => u.secoes.flatMap((s) => s.licoes))
      .find((l: { id: string }) => l.id === id);
    if (no.tipo !== 'bau') return id;
    expect((await t.chamar('licaoAbrirBau', { cookie, params: { id } })).statusCode).toBe(200);
  }
}

/** Faz uma lição completa: inicia, responde (com `erros`) e conclui. */
export async function fazerLicao(t: AmbienteTeste, cookie: string, erros = 0, licaoId?: string) {
  const id = licaoId ?? (await licaoAtual(t, cookie));
  const ini = await t.chamar('licaoIniciar', { cookie, params: { id } });
  expect(ini.statusCode, ini.body).toBe(200);
  const ses = ini.json();
  const respostas = await responderTudo(t, cookie, ses.sessaoId, ses.questoes.map((q: { id: string }) => q.id), erros);
  const fim = await t.chamar('sessaoConcluir', { cookie, params: { id: ses.sessaoId } });
  expect(fim.statusCode, fim.body).toBe(200);
  return { inicio: ses, respostas, fim: fim.json() };
}

export async function usuario(t: AmbienteTeste, id: string) {
  const [u] = await t.db.select().from(schema.usuarios).where(eq(schema.usuarios.id, id));
  return u!;
}
