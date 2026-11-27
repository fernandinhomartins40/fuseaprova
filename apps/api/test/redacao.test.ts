import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { schema } from '@fuse/db';
import { criarAmbienteTeste, type AmbienteTeste } from '../src/teste/index.js';
import { lerCorrecao } from '../src/servicos/redacao/ia.js';

/** D49: preparatório de redação — isolamento, cota de 3 por semana e correção por IA. */
let t: AmbienteTeste;
beforeAll(async () => {
  t = await criarAmbienteTeste({
    inicio: '2026-11-27T10:00:00-03:00', // sexta
    config: { fusai: { apiKey: 'chave', baseUrl: 'http://fusai.invalido/v1', modelo: 'fuse/deepseek-chat' } },
  });
}, 60_000);
afterAll(() => t.fechar());
afterEach(() => vi.unstubAllGlobals());

const PARAGRAFO =
  'A escola democrática precisa ouvir a comunidade para construir o seu projeto pedagógico de forma coletiva e real, ' +
  'pois só assim as metas refletem as necessidades dos estudantes e das famílias que vivem naquela realidade.';
/** Cerca de 24 linhas na folha. */
const TEXTO = Array(6).fill(Array(3).fill(PARAGRAFO).join(' ')).join('\n');

const RESPOSTA_IA = {
  zerada: false,
  motivoZero: null,
  notas: { conteudo: 70, estrutura: 30, expressao: 8 },
  resumo: 'Texto com tese clara, mas repetitivo.',
  comentarios: { conteudo: 'Bom recorte.', estrutura: 'Parágrafos repetidos.', expressao: 'Poucos desvios.' },
  pontosFortes: ['Tese clara'],
  melhorar: ['Varie os argumentos'],
  trechos: [
    { trecho: 'A escola democrática precisa ouvir a comunidade', problema: 'Repetição', sugestao: 'Varie.' },
    { trecho: 'frase que não está no texto', problema: 'Inventado', sugestao: 'x' },
  ],
};

function iaResponde(conteudo: unknown, status = 200) {
  const chamadas: unknown[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    chamadas.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ choices: [{ message: { content: typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo) } }] }), { status });
  });
  return chamadas;
}

async function nova(cookie: string, texto = TEXTO, temaId = 'fuse-ppp-gestao-democratica') {
  const r = await t.chamar('redacaoCriar', { cookie, corpo: { temaId, texto } });
  expect(r.statusCode, r.body).toBe(200);
  return r.json();
}

describe('preparatório de redação (D49)', () => {
  it('exige pagamento (402)', async () => {
    const a = await t.cadastrar();
    expect((await t.chamar('redacaoPainel', { cookie: a.cookie })).statusCode).toBe(402);
  });

  it('painel traz o mini-curso, os temas (FAU e nossos) e a cota cheia', async () => {
    const a = await t.alunoPago();
    const p = (await t.chamar('redacaoPainel', { cookie: a.cookie })).json();
    expect(p.aulas.length).toBeGreaterThanOrEqual(10);
    expect(p.temas.some((x: { origem: string }) => x.origem === 'fau')).toBe(true);
    expect(p.temas.some((x: { origem: string }) => x.origem === 'fuse')).toBe(true);
    // tema nosso nunca aparece com prova da FAU
    expect(p.temas.filter((x: { origem: string; prova: string | null }) => x.origem === 'fuse' && x.prova)).toEqual([]);
    expect(p.cota).toMatchObject({ usadas: 0, limite: 3, restantes: 3 });
    expect(new Set(p.temas.map((x: { id: string }) => x.id)).size).toBe(p.temas.length);
  });

  it('cria, salva e lê só a própria redação; tema inválido é 404', async () => {
    const a = await t.alunoPago();
    const b = await t.alunoPago();
    expect((await t.chamar('redacaoCriar', { cookie: a.cookie, corpo: { temaId: 'nao-existe' } })).statusCode).toBe(404);
    const r = await nova(a.cookie, 'Começo.');
    expect(r).toMatchObject({ status: 'rascunho', linhas: 1, correcao: null });
    const s = await t.chamar('redacaoSalvar', { cookie: a.cookie, params: { id: r.id }, corpo: { texto: TEXTO } });
    expect(s.json().linhas).toBeGreaterThanOrEqual(20);
    expect((await t.chamar('redacaoObter', { cookie: b.cookie, params: { id: r.id } })).statusCode).toBe(404);
    expect((await t.chamar('redacaoSalvar', { cookie: b.cookie, params: { id: r.id }, corpo: { texto: 'x' } })).statusCode).toBe(404);
    expect((await t.chamar('redacaoPainel', { cookie: b.cookie })).json().redacoes).toEqual([]);
    const longo = await t.chamar('redacaoSalvar', { cookie: a.cookie, params: { id: r.id }, corpo: { texto: 'x'.repeat(4001) } });
    expect(longo.statusCode).toBe(400);
  });

  it('texto curto não gasta correção', async () => {
    const a = await t.alunoPago();
    const r = await nova(a.cookie, 'Só uma linha.');
    const c = await t.chamar('redacaoCorrigir', { cookie: a.cookie, params: { id: r.id } });
    expect(c.statusCode).toBe(400);
  });

  it('IA fora do ar: volta a rascunho e não gasta a cota', async () => {
    const a = await t.alunoPago();
    const r = await nova(a.cookie);
    iaResponde('erro', 500);
    const c = await t.chamar('redacaoCorrigir', { cookie: a.cookie, params: { id: r.id } });
    expect(c.statusCode).toBe(503);
    expect(c.json().erro).toContain('cota não foi usada');
    const depois = (await t.chamar('redacaoObter', { cookie: a.cookie, params: { id: r.id } })).json();
    expect(depois.status).toBe('rascunho');
    expect((await t.chamar('redacaoPainel', { cookie: a.cookie })).json().cota.usadas).toBe(0);
    // resposta fora do formato também não gasta
    iaResponde('não é json');
    expect((await t.chamar('redacaoCorrigir', { cookie: a.cookie, params: { id: r.id } })).statusCode).toBe(503);
  });

  it('corrige com a Tabela 10.1: prende as notas, descarta trecho inventado e trava a edição', async () => {
    const a = await t.alunoPago();
    const r = await nova(a.cookie);
    const chamadas = iaResponde(RESPOSTA_IA);
    const c = await t.chamar('redacaoCorrigir', { cookie: a.cookie, params: { id: r.id } });
    expect(c.statusCode, c.body).toBe(200);
    const { redacao, cota } = c.json();
    expect(redacao.status).toBe('corrigida');
    expect(redacao.correcao.notas).toEqual({ conteudo: 50, estrutura: 30, expressao: 8 });
    expect(redacao.nota).toBe(88);
    expect(redacao.correcao.trechos).toHaveLength(1);
    expect(cota).toMatchObject({ usadas: 1, restantes: 2 });
    const enviado = chamadas[0] as { messages: { content: string }[] };
    expect(enviado.messages[0]!.content).toContain('Tabela 10.1');
    expect(enviado.messages[1]!.content).toContain('O Projeto Político-Pedagógico como instrumento de gestão democrática');
    expect(enviado.messages[1]!.content).toContain('<<<REDACAO>>>');

    expect((await t.chamar('redacaoSalvar', { cookie: a.cookie, params: { id: r.id }, corpo: { texto: 'x' } })).statusCode).toBe(409);
    expect((await t.chamar('redacaoCorrigir', { cookie: a.cookie, params: { id: r.id } })).statusCode).toBe(409);
    expect((await t.chamar('redacaoExcluir', { cookie: a.cookie, params: { id: r.id } })).statusCode).toBe(409);
  });

  it('3 correções por semana; a cota volta na segunda-feira', async () => {
    const a = await t.alunoPago();
    iaResponde(RESPOSTA_IA);
    for (let i = 0; i < 3; i++) {
      const r = await nova(a.cookie);
      expect((await t.chamar('redacaoCorrigir', { cookie: a.cookie, params: { id: r.id } })).statusCode).toBe(200);
    }
    const quarta = await nova(a.cookie);
    const negada = await t.chamar('redacaoCorrigir', { cookie: a.cookie, params: { id: quarta.id } });
    expect(negada.statusCode).toBe(429);
    expect(negada.json().codigo).toBe('cota_redacao');
    const antes = t.relogio.agora();
    t.relogio.definir('2026-11-30T00:01:00-03:00'); // segunda
    expect((await t.chamar('redacaoCorrigir', { cookie: a.cookie, params: { id: quarta.id } })).statusCode).toBe(200);
    t.relogio.definir(antes);
  });

  it('apaga rascunho e entra na exportação LGPD', async () => {
    const a = await t.alunoPago();
    const r = await nova(a.cookie);
    const exp = await t.chamar('meExportar', { cookie: a.cookie });
    expect(exp.statusCode, exp.body).toBe(200);
    expect(exp.json().redacoes).toHaveLength(1);
    expect((await t.chamar('redacaoExcluir', { cookie: a.cookie, params: { id: r.id } })).statusCode).toBe(204);
    const [resto] = await t.db.select().from(schema.redacoes).where(eq(schema.redacoes.id, r.id));
    expect(resto).toBeUndefined();
  });

  it('aulas interativas: passos válidos em todas as aulas', async () => {
    const a = await t.alunoPago();
    const p = (await t.chamar('redacaoPainel', { cookie: a.cookie })).json();
    expect(p.aulasConcluidas).toEqual([]);
    for (const aula of p.aulas) {
      const exercicios = aula.passos.filter((x: { tipo: string }) => x.tipo !== 'explica');
      expect(exercicios.length, aula.id).toBeGreaterThanOrEqual(5);
      for (const x of exercicios) {
        if (x.tipo === 'escolha') expect(x.correta).toBeLessThan(x.alternativas.length);
        if (x.tipo === 'lacuna') {
          expect(x.correta).toBeLessThan(x.opcoes.length);
          expect(x.frase).toContain('___');
        }
      }
    }
  });

  it('concluir aula: XP só na primeira vez e libera no painel', async () => {
    const a = await t.alunoPago();
    const xp = async () =>
      (await t.db.select({ xp: schema.usuarios.xpTotal }).from(schema.usuarios).where(eq(schema.usuarios.id, a.id)))[0]!.xp;
    const antes = await xp();
    const c = (corpo: { perfeita: boolean }, id = 'introducao') =>
      t.chamar('redacaoAulaConcluir', { cookie: a.cookie, params: { id }, corpo });
    expect((await c({ perfeita: true }, 'nao-existe')).statusCode).toBe(404);
    const r1 = await c({ perfeita: true });
    expect(r1.statusCode, r1.body).toBe(200);
    expect(r1.json()).toEqual({ xpGanho: 15, primeiraVez: true });
    expect((await c({ perfeita: true })).json()).toEqual({ xpGanho: 0, primeiraVez: false });
    expect(await xp()).toBe(antes + 15);
    const p = (await t.chamar('redacaoPainel', { cookie: a.cookie })).json();
    expect(p.aulasConcluidas).toEqual(['introducao']);
    expect((await c({ perfeita: false }, 'coesao')).json()).toEqual({ xpGanho: 5, primeiraVez: true });
  });
});

describe('lerCorrecao', () => {
  it('JSON inválido ou sem resumo não vale', () => {
    expect(lerCorrecao('{', TEXTO)).toBeNull();
    expect(lerCorrecao(JSON.stringify({ ...RESPOSTA_IA, resumo: '' }), TEXTO)).toBeNull();
  });

  it('aceita bloco ```json``` e zera só com motivo', () => {
    const c = lerCorrecao('```json\n' + JSON.stringify({ ...RESPOSTA_IA, zerada: true, motivoZero: 'Fuga ao tema.' }) + '\n```', TEXTO);
    expect(c).toMatchObject({ zerada: true, nota: 0, motivoZero: 'Fuga ao tema.' });
    const semMotivo = lerCorrecao(JSON.stringify({ ...RESPOSTA_IA, zerada: true, motivoZero: null }), TEXTO);
    expect(semMotivo?.zerada).toBe(false);
    expect(semMotivo?.nota).toBe(88);
  });
});
