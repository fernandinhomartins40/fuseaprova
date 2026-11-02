import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarBancoTeste, type BancoTeste } from '@fuse/db/teste';
import { avisarTeste } from '../src/jobs/teste.js';
import type { EnviadorEmail } from '../src/jobs/comunicacoes.js';

const agora = new Date('2026-11-10T10:00:00-03:00');
const horas = (n: number) => new Date(agora.getTime() + n * 3600_000);
const APP = 'https://app.teste';

let b: BancoTeste;
let enviados: { para: string; assunto: string; texto: string }[];
let n = 0;
const email: EnviadorEmail = {
  async enviar(m) {
    enviados.push(m);
  },
};

async function aluno(dados: Partial<typeof schema.usuarios.$inferInsert>) {
  const [u] = await b.db
    .insert(schema.usuarios)
    .values({ nome: 'Marina Souza', email: `aluno${++n}@teste.com`, senhaHash: 'x', ...dados })
    .returning();
  return u!;
}

beforeAll(async () => {
  b = await criarBancoTeste({ seed: { semCatalogo: true } });
}, 60_000);
afterAll(() => b.fechar());
beforeEach(async () => {
  enviados = [];
  await b.db.delete(schema.usuarios);
});

describe('avisos do teste grátis (D32)', () => {
  it('avisa na véspera e no fim, com o link do Pix, uma vez cada', async () => {
    const u = await aluno({ testeAte: horas(20) });
    await avisarTeste(b.db, { email, appUrl: APP }, agora);
    await avisarTeste(b.db, { email, appUrl: APP }, agora);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toMatchObject({ para: u.email, assunto: 'Fuse Aprova: seu teste grátis termina amanhã' });
    expect(enviados[0]!.texto).toContain(`${APP}/pagamento`);

    const depois = new Date(u.testeAte!.getTime() + 3600_000);
    await avisarTeste(b.db, { email, appUrl: APP }, depois);
    await avisarTeste(b.db, { email, appUrl: APP }, depois);
    expect(enviados.map((e) => e.assunto)).toEqual([
      'Fuse Aprova: seu teste grátis termina amanhã',
      'Fuse Aprova: seu teste grátis terminou',
    ]);
  });

  it('não avisa quem tem mais de 24 horas de teste, pagou, saiu ou está fora da janela', async () => {
    await aluno({ testeAte: horas(30) });
    await aluno({ testeAte: horas(10), acesso: true });
    await aluno({ testeAte: horas(10), excluidoEm: agora });
    await aluno({ testeAte: horas(10), bloqueadoEm: agora });
    await aluno({ testeAte: horas(-200) });
    await aluno({ testeAte: null });
    expect(await avisarTeste(b.db, { email, appUrl: APP }, agora)).toEqual({ ok: true, vespera: 0, fim: 0, falhas: 0 });
    expect(enviados).toEqual([]);
  });

  it('falha no envio fica para a próxima rodada e sem SMTP o job só informa', async () => {
    const u = await aluno({ testeAte: horas(-1) });
    const quebrado: EnviadorEmail = { enviar: () => Promise.reject(new Error('smtp fora')) };
    expect(await avisarTeste(b.db, { email: quebrado, appUrl: APP }, agora)).toEqual({ ok: false, vespera: 0, fim: 0, falhas: 1 });
    const [l] = await b.db.select().from(schema.usuarios).where(eq(schema.usuarios.id, u.id));
    expect(l!.testeAvisoFimEm).toBeNull();
    expect(await avisarTeste(b.db, { email: null, appUrl: APP }, agora)).toEqual({ desligado: 'SMTP não configurado' });
    await avisarTeste(b.db, { email, appUrl: APP }, agora);
    expect(enviados).toHaveLength(1);
  });
});
