/** Lote 2 da auditoria do painel: comunicação com disjuntor (S-17), alertas (S-09) e S-26. */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarBancoTeste, type BancoTeste } from '@fuse/db/teste';
import { completarCpf } from '@fuse/shared';
import { definirJobs } from '../src/agenda.js';
import { enviarComunicacoes, executarBackup, falhaDoSmtp, verificarAlertas, type EnviadorEmail } from '../src/jobs/index.js';
import { logMudo } from '../src/util.js';

let b: BancoTeste;
let n = 0;
const { usuarios, comunicacoes, comunicacoesEnvios, jobsExecucoes, estadoSistema } = schema;

beforeAll(async () => {
  b = await criarBancoTeste({ seed: { semCatalogo: true } });
}, 60_000);
afterAll(() => b.fechar());

async function aluno(extra: Partial<typeof usuarios.$inferInsert> = {}) {
  n++;
  const [u] = await b.db
    .insert(usuarios)
    .values({ nome: `Aluno L2 ${n}`, email: `l2-${n}@teste.com`, cpf: completarCpf(String(700000000 + n)), acesso: true, marketing: true, ...extra })
    .returning();
  return u!;
}

async function comunicacao(qtd: number, agora: Date) {
  const [c] = await b.db.insert(comunicacoes).values({ canal: 'email', segmento: 'todos', assunto: `Lote ${++n}`, mensagem: 'Oi', total: qtd, criadoEm: agora }).returning();
  for (let i = 0; i < qtd; i++) await b.db.insert(comunicacoesEnvios).values({ comunicacaoId: c!.id, usuarioId: (await aluno()).id });
  return c!;
}

const envios = async (id: string) => b.db.select().from(comunicacoesEnvios).where(eq(comunicacoesEnvios.comunicacaoId, id));
const com = async (id: string) => (await b.db.select().from(comunicacoes).where(eq(comunicacoes.id, id)))[0]!;

describe('S-17: disjuntor do SMTP', () => {
  it('SMTP fora: pausa, nenhum envio "falhou", job ok=false; retomada envia todos', async () => {
    const agora = new Date('2026-12-01T12:00:00-03:00');
    const c = await comunicacao(5, agora);
    let fora = true;
    const enviados: string[] = [];
    const email: EnviadorEmail = {
      async enviar(m) {
        if (fora) throw Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:587'), { code: 'ESOCKET' });
        enviados.push(m.para);
      },
    };
    const r = await enviarComunicacoes(b.db, { email, push: null, appUrl: 'https://app.x' }, agora);
    expect(r).toMatchObject({ ok: false, falhas: 0, pausadas: 1, enviados: 0 });
    expect((await com(c.id)).status).toBe('pausada');
    expect((await com(c.id)).pausadaMotivo).toMatch(/SMTP/);
    expect((await envios(c.id)).every((e) => e.status === 'pendente')).toBe(true);
    // O superadmin retoma (rota da API faz isto) com o SMTP de volta.
    fora = false;
    await b.db.update(comunicacoes).set({ status: 'enviando', pausadaMotivo: null }).where(eq(comunicacoes.id, c.id));
    await b.db.update(comunicacoesEnvios).set({ proximaTentativaEm: null, tentativas: 0 }).where(eq(comunicacoesEnvios.comunicacaoId, c.id));
    const r2 = await enviarComunicacoes(b.db, { email, push: null, appUrl: 'https://app.x' }, new Date(agora.getTime() + 60_000));
    expect(r2).toMatchObject({ enviados: 5, concluidas: 1 });
    expect(r2.ok).toBeUndefined();
    expect(enviados).toHaveLength(5);
  });

  it('falha temporária isolada volta para a fila com espera; rejeição do destinatário marca só ele', async () => {
    const agora = new Date('2026-12-02T12:00:00-03:00');
    const c = await comunicacao(2, agora);
    let i = 0;
    const email: EnviadorEmail = {
      async enviar() {
        i++;
        if (i === 1) throw Object.assign(new Error('450 tente depois'), { responseCode: 450 });
        throw Object.assign(new Error('550 caixa inexistente'), { responseCode: 550, code: 'EENVELOPE' });
      },
    };
    const r = await enviarComunicacoes(b.db, { email, push: null, appUrl: 'https://app.x' }, agora);
    expect(r).toMatchObject({ adiados: 1, falhas: 1, pausadas: 0 });
    const es = await envios(c.id);
    expect(es.find((e) => e.status === 'pendente')).toMatchObject({ tentativas: 1 });
    expect(es.find((e) => e.status === 'pendente')!.proximaTentativaEm!.getTime()).toBe(agora.getTime() + 60_000);
    expect(falhaDoSmtp({ code: 'EAUTH' })).toBe(true);
    expect(falhaDoSmtp({ code: 'EENVELOPE' })).toBe(false);
  });

  it('o cancelamento interrompe o lote em andamento', async () => {
    const agora = new Date('2026-12-03T12:00:00-03:00');
    await b.db.update(comunicacoes).set({ status: 'concluida' });
    const c = await comunicacao(4, agora);
    let k = 0;
    const email: EnviadorEmail = {
      async enviar() {
        if (++k === 2) {
          await b.db.update(comunicacoes).set({ status: 'cancelada' }).where(eq(comunicacoes.id, c.id));
          await b.db.update(comunicacoesEnvios).set({ status: 'ignorado', erro: 'cancelada' }).where(eq(comunicacoesEnvios.status, 'pendente'));
        }
      },
    };
    await enviarComunicacoes(b.db, { email, push: null, appUrl: 'https://app.x' }, agora);
    expect(k).toBe(2);
    const es = await envios(c.id);
    expect(es.filter((e) => e.status === 'enviado')).toHaveLength(1);
    expect(es.filter((e) => e.status === 'ignorado')).toHaveLength(3);
    expect((await com(c.id)).status).toBe('cancelada');
  });
});

describe('S-26: fila vazia não grava execução; o sinal de vida sim', () => {
  it('enviar-comunicacoes sem fila só atualiza o sinal', async () => {
    await b.db.update(comunicacoes).set({ status: 'concluida' });
    const agora = new Date('2026-12-04T12:00:00-03:00');
    const jobs = definirJobs({ db: b.db, push: null, log: logMudo, agora: () => agora, versao: 'abc123' });
    const antes = (await b.db.select().from(jobsExecucoes).where(eq(jobsExecucoes.job, 'enviar-comunicacoes'))).length;
    await jobs.find((j) => j.nome === 'enviar-comunicacoes')!.executar();
    expect((await b.db.select().from(jobsExecucoes).where(eq(jobsExecucoes.job, 'enviar-comunicacoes'))).length).toBe(antes);
    const [sinal] = await b.db.select().from(estadoSistema).where(eq(estadoSistema.chave, 'worker:sinal'));
    expect(sinal).toMatchObject({ valor: { versao: 'abc123' } });
    expect(sinal!.atualizadoEm.getTime()).toBe(agora.getTime());
  });
});

describe('S-09: alertas por e-mail', () => {
  it('job atrasado e backup velho geram 1 e-mail por superadmin; a 2ª rodada em menos de 6 h não repete', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'fuse-alerta-'));
    const agora = new Date('2026-12-10T12:00:00-03:00');
    writeFileSync(join(pasta, 'ULTIMO_BACKUP'), `${new Date(agora.getTime() - 3 * 86_400_000).toISOString()} /x.dump arquivos=ok\n`);
    await b.db.insert(jobsExecucoes).values({ job: 'expirar-pix', iniciadoEm: new Date(agora.getTime() - 86_400_000), terminadoEm: agora, ok: true });
    await aluno({ papel: 'superadmin', email: 'dono@teste.com', nome: 'Dono Fuse' });
    await aluno({ papel: 'superadmin', email: 'bloqueado@teste.com', bloqueadoEm: agora });
    const enviados: { para: string; texto: string }[] = [];
    const email: EnviadorEmail = { enviar: async (m) => void enviados.push(m) };
    const d = { email, appUrl: 'https://app.x', backupDir: pasta, log: logMudo };
    const r = await verificarAlertas(b.db, d, agora);
    expect(r.enviados).toBeGreaterThanOrEqual(2);
    expect(enviados.map((e) => e.para)).toEqual(['dono@teste.com']);
    expect(enviados[0]!.texto).toMatch(/Expiração dos Pix/);
    expect(enviados[0]!.texto).toMatch(/backup/);
    expect(enviados[0]!.texto).toContain('https://app.x/super/sistema');
    const r2 = await verificarAlertas(b.db, d, new Date(agora.getTime() + 15 * 60_000));
    expect(r2.enviados).toBe(0);
    expect(r2.repetidos).toBe(r.problemas);
    expect(enviados).toHaveLength(1);
    const r3 = await verificarAlertas(b.db, d, new Date(agora.getTime() + 7 * 3_600_000));
    expect(r3.enviados).toBeGreaterThan(0);
    // Sem SMTP o job fica vermelho (ok: false) e nada é marcado como avisado.
    const r4 = await verificarAlertas(b.db, { ...d, email: null }, new Date(agora.getTime() + 14 * 3_600_000));
    expect(r4).toMatchObject({ ok: false });
  });

  it('rajada de 5xx entra no alerta', async () => {
    const agora = new Date('2026-12-20T12:00:00-03:00');
    for (let i = 0; i < 10; i++) await b.db.insert(schema.errosApi).values({ rota: '/api/x', metodo: 'GET', status: 500, criadoEm: agora });
    const enviados: { texto: string }[] = [];
    await verificarAlertas(b.db, { email: { enviar: async (m) => void enviados.push(m) }, appUrl: 'https://app.x' }, agora);
    expect(enviados[0]!.texto).toMatch(/10 erros 5xx/);
  });

  it('backup.sh com falha só nos arquivos (código 3) deixa o job vermelho com a explicação', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'fuse-bkp3-'));
    const s = join(pasta, 'b.sh');
    writeFileSync(s, 'exit 3\n');
    expect(await executarBackup(s, logMudo)).toMatchObject({ ok: false, codigo: 3, erro: expect.stringMatching(/arquivos/) });
  });
});
