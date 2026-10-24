import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { criarBancoTeste, type BancoTeste } from '@fuse/db/teste';
import { completarCpf } from '@fuse/shared';
import { definirJobs } from '../src/agenda.js';
import {
  enviarLembretes,
  executarBackup,
  expirarPix,
  fecharLiga,
  horariosDaRodada,
  limparSessoes,
  resetarVidas,
  verificarOfensivas,
  type EnviadorPush,
} from '../src/jobs/index.js';
import { comTrava, logMudo, type Log } from '../src/util.js';

let b: BancoTeste;
let concursoId: string;
let n = 0;
const { usuarios, ligasGrupos, ligasMembros, pedidos, sessoes, pushInscricoes, sessoesEstudo, conquistasUsuario } = schema;

beforeAll(async () => {
  b = await criarBancoTeste({ seed: { semCatalogo: true } });
  concursoId = b.seed!.concursoId;
}, 60_000);
afterAll(() => b.fechar());

async function aluno(extra: Partial<typeof usuarios.$inferInsert> = {}) {
  n++;
  const [u] = await b.db
    .insert(usuarios)
    .values({ nome: `Aluno ${n} Teste`, email: `w${n}@teste.com`, cpf: completarCpf(String(300000000 + n)), acesso: true, concursoId, ...extra })
    .returning();
  return u!;
}

async function u(id: string) {
  return (await b.db.select().from(usuarios).where(eq(usuarios.id, id)))[0]!;
}

describe('fechar liga (domingo 23:59)', () => {
  it('3 primeiros sobem (+50 gemas), 3 últimos descem, cria grupos novos', async () => {
    const semana = '2026-11-02';
    const [g] = await b.db.insert(ligasGrupos).values({ semana, divisao: 'prata', concursoId }).returning();
    const membros = [];
    for (let i = 0; i < 12; i++) {
      const a = await aluno({ divisao: 'prata', gemas: 0 });
      membros.push(a);
      await b.db.insert(ligasMembros).values({
        grupoId: g!.id,
        usuarioId: a.id,
        semana,
        xpSemana: 1000 - i * 10,
        alcancadoEm: new Date(`2026-11-03T1${i % 10}:00:00Z`),
      });
    }
    const agora = new Date('2026-11-08T23:59:00-03:00');
    const r = await fecharLiga(b.db, agora);
    expect(r).toMatchObject({ grupos: 1, subiram: 3, desceram: 3 });
    expect((await u(membros[0]!.id))).toMatchObject({ divisao: 'ouro', gemas: 50 });
    expect((await u(membros[3]!.id)).divisao).toBe('prata');
    expect((await u(membros[11]!.id)).divisao).toBe('bronze');
    const [m] = await b.db.select().from(ligasMembros).where(eq(ligasMembros.usuarioId, membros[0]!.id));
    expect(m).toMatchObject({ resultado: 'subiu', posicaoFinal: 1 });
    const ouro = await b.db.select().from(conquistasUsuario).where(eq(conquistasUsuario.usuarioId, membros[0]!.id));
    expect(ouro.map((c) => c.codigo)).toContain('liga_ouro');
    const novos = await b.db.select().from(ligasGrupos).where(eq(ligasGrupos.semana, '2026-11-09'));
    expect(novos.map((x) => x.divisao).sort()).toEqual(['bronze', 'ouro', 'prata']);
    // rodar de novo não fecha duas vezes
    expect((await fecharLiga(b.db, agora)).grupos).toBe(0);
  });

  it('empate: vence quem chegou primeiro; grupo pequeno não rebaixa; bronze não desce', async () => {
    const semana = '2026-11-16';
    const [g] = await b.db.insert(ligasGrupos).values({ semana, divisao: 'bronze', concursoId }).returning();
    const a1 = await aluno();
    const a2 = await aluno();
    const a3 = await aluno();
    const a4 = await aluno();
    await b.db.insert(ligasMembros).values([
      { grupoId: g!.id, usuarioId: a1.id, semana, xpSemana: 50, alcancadoEm: new Date('2026-11-17T12:00:00Z') },
      { grupoId: g!.id, usuarioId: a2.id, semana, xpSemana: 50, alcancadoEm: new Date('2026-11-17T10:00:00Z') },
      { grupoId: g!.id, usuarioId: a3.id, semana, xpSemana: 40, alcancadoEm: new Date('2026-11-17T10:00:00Z') },
      { grupoId: g!.id, usuarioId: a4.id, semana, xpSemana: 10, alcancadoEm: new Date('2026-11-17T10:00:00Z') },
    ]);
    await fecharLiga(b.db, new Date('2026-11-22T23:59:00-03:00'));
    const pos = async (id: string) => (await b.db.select().from(ligasMembros).where(eq(ligasMembros.usuarioId, id)))[0]!;
    expect((await pos(a2.id)).posicaoFinal).toBe(1);
    expect((await pos(a1.id)).posicaoFinal).toBe(2);
    expect((await pos(a4.id)).resultado).toBe('ficou');
    expect((await u(a3.id)).divisao).toBe('prata');
  });
});

describe('jobs diários', () => {
  it('00:00 vidas voltam para 5', async () => {
    const a = await aluno({ vidas: 1 });
    expect(await resetarVidas(b.db, new Date('2026-11-10T00:00:00-03:00'))).toBeGreaterThanOrEqual(1);
    expect((await u(a.id)).vidas).toBe(5);
  });

  it('00:05 ofensiva zera sem protetor e consome protetor quando há', async () => {
    const agora = new Date('2026-11-10T00:05:00-03:00');
    const sem = await aluno({ ofensiva: 4, ofensivaRecorde: 4, ultimoDiaEstudo: '2026-11-08' });
    const com = await aluno({ ofensiva: 6, ofensivaRecorde: 6, ultimoDiaEstudo: '2026-11-08', protetores: 2 });
    const ok = await aluno({ ofensiva: 3, ofensivaRecorde: 3, ultimoDiaEstudo: '2026-11-09' });
    const r = await verificarOfensivas(b.db, agora);
    expect(r.zeradas).toBeGreaterThanOrEqual(1);
    expect((await u(sem.id)).ofensiva).toBe(0);
    expect(await u(com.id)).toMatchObject({ ofensiva: 6, protetores: 1, ultimoDiaEstudo: '2026-11-09' });
    expect((await u(ok.id)).ofensiva).toBe(3);
  });

  it('expira Pix vencidos e limpa sessões expiradas', async () => {
    const a = await aluno();
    const agora = new Date('2026-11-10T12:00:00-03:00');
    const [p1] = await b.db.insert(pedidos).values({ usuarioId: a.id, valorCentavos: 39700, pixExpiraEm: new Date(agora.getTime() - 1000) }).returning();
    const [p2] = await b.db.insert(pedidos).values({ usuarioId: a.id, valorCentavos: 39700, pixExpiraEm: new Date(agora.getTime() + 60_000) }).returning();
    expect(await expirarPix(b.db, agora)).toBe(1);
    const st = async (id: string) => (await b.db.select().from(pedidos).where(eq(pedidos.id, id)))[0]!.status;
    expect(await st(p1!.id)).toBe('vencido');
    expect(await st(p2!.id)).toBe('pendente');
    await b.db.insert(sessoes).values([
      { usuarioId: a.id, tokenHash: `h${n}a`, expiraEm: new Date(agora.getTime() - 1) },
      { usuarioId: a.id, tokenHash: `h${n}b`, expiraEm: new Date(agora.getTime() + 1e6) },
    ]);
    expect((await limparSessoes(b.db, agora)).sessoes).toBe(1);
  });
});

describe('lembretes (a cada 5 min)', () => {
  function enviadorFalso(expirar = false) {
    const enviados: { endpoint: string; payload: string }[] = [];
    const e: EnviadorPush = {
      async enviar(i, payload) {
        enviados.push({ endpoint: i.endpoint, payload });
        return expirar ? { ok: false, expirada: true } : { ok: true };
      },
    };
    return { e, enviados };
  }
  beforeEach(async () => {
    await b.db.update(usuarios).set({ lembreteHora: null });
  });

  it('cobre os 5 minutos da rodada', () => {
    expect(horariosDaRodada(new Date('2026-11-10T19:05:00-03:00'))).toEqual(['19:05', '19:04', '19:03', '19:02', '19:01']);
  });

  it('só quem tem lembrete no horário, meta não cumprida e máximo 1 por dia', async () => {
    const agora = new Date('2026-11-10T19:05:00-03:00');
    const alvo = await aluno({ lembreteHora: '19:03', ofensiva: 8, ofensivaRecorde: 8, ultimoDiaEstudo: '2026-11-09' });
    const outroHorario = await aluno({ lembreteHora: '20:00' });
    const cumpriu = await aluno({ lembreteHora: '19:05' });
    const desligado = await aluno({ lembreteHora: '19:05', notificacoes: false });
    for (const x of [alvo, outroHorario, cumpriu, desligado]) {
      await b.db.insert(pushInscricoes).values({ usuarioId: x.id, endpoint: `https://push.exemplo.com/${x.id}`, p256dh: 'k', auth: 'a' });
    }
    await b.db.insert(sessoesEstudo).values({ usuarioId: cumpriu.id, tipo: 'licao', concluidaEm: new Date('2026-11-10T08:00:00-03:00') });
    const { e, enviados } = enviadorFalso();
    const r = await enviarLembretes(b.db, e, agora);
    expect(r.enviados).toBe(1);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]!.endpoint).toContain(alvo.id);
    expect(JSON.parse(enviados[0]!.payload).corpo).toBe('Sua ofensiva de 8 dias está em risco.');
    expect((await enviarLembretes(b.db, e, new Date('2026-11-10T19:05:30-03:00'))).enviados).toBe(0);
  });

  it('texto padrão sem ofensiva e remove inscrições expiradas', async () => {
    const a = await aluno({ lembreteHora: '08:00' });
    await b.db.insert(pushInscricoes).values({ usuarioId: a.id, endpoint: `https://push.exemplo.com/x${a.id}`, p256dh: 'k', auth: 'a' });
    const { e, enviados } = enviadorFalso(true);
    const r = await enviarLembretes(b.db, e, new Date('2026-11-11T08:00:00-03:00'));
    expect(JSON.parse(enviados[0]!.payload).corpo).toBe('A Capi está te esperando. 5 minutinhos e a ofensiva continua!');
    expect(r.inscricoesRemovidas).toBe(1);
    expect(await b.db.select().from(pushInscricoes).where(eq(pushInscricoes.usuarioId, a.id))).toHaveLength(0);
  });
});

describe('backup e agendamento', () => {
  const erros: string[] = [];
  const log: Log = { info: () => {}, warn: () => {}, error: (_o, m) => erros.push(m ?? '') };

  it('roda o script e registra a falha', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'fuse-bkp-'));
    const ok = join(pasta, 'ok.sh');
    const falha = join(pasta, 'falha.sh');
    writeFileSync(ok, 'echo feito\nexit 0\n');
    writeFileSync(falha, 'echo erro >&2\nexit 3\n');
    expect((await executarBackup(ok, log)).ok).toBe(true);
    const r = await executarBackup(falha, log);
    expect(r).toMatchObject({ ok: false, codigo: 3 });
    expect(erros).toContain('backup falhou');
    expect((await executarBackup(join(pasta, 'nao-existe.sh'), log)).ok).toBe(false);
  });

  it('trava: o mesmo job não roda em paralelo', async () => {
    let solta!: () => void;
    const lento = comTrava('x', () => new Promise<number>((res) => (solta = () => res(1))), logMudo);
    expect(await comTrava('x', async () => 2, logMudo)).toBeNull();
    solta();
    expect(await lento).toBe(1);
    expect(await comTrava('x', async () => 3, logMudo)).toBe(3);
  });

  it('todos os jobs da seção 8.7 com os horários certos', () => {
    const jobs = definirJobs({ db: b.db, push: null, log: logMudo });
    expect(Object.fromEntries(jobs.map((j) => [j.nome, j.cron]))).toEqual({
      'fechar-liga': '59 23 * * 0',
      'resetar-vidas': '0 0 * * *',
      'verificar-ofensivas': '5 0 * * *',
      'enviar-lembretes': '*/5 * * * *',
      'expirar-pix': '*/10 * * * *',
      'limpar-sessoes': '0 3 * * *',
      backup: '30 3 * * *',
    });
  });
});
