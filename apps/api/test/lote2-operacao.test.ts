/**
 * Lote 2 da auditoria do painel superadmin (docs/pie/super): cada teste reprova o código antigo.
 * Roda no PGlite e no Postgres 16 (TESTE_DATABASE_URL).
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schema } from '@fuse/db';
import { HEADER_SEGUNDO_PLANO } from '@fuse/shared/api';
import { criarApp } from '../src/app.js';
import { criarAmbienteTeste, type AmbienteTeste, type Aluno } from '../src/teste/index.js';
import { gerarCodigoTotp } from '../src/servicos/totp.js';
import { garantirReservaCupom } from '../src/servicos/precos.js';
import { TEMPOS_ASAAS } from '../src/rotas/super/asaas.js';
import { limiteCsv } from '../src/rotas/super/comum.js';
import { escaparLike } from '../src/util.js';
import { usuario } from './ajuda.js';

const pastaBackup = mkdtempSync(join(tmpdir(), 'fuse-l2-bkp-'));
let t: AmbienteTeste;
let sup: Awaited<ReturnType<AmbienteTeste['superadmin']>>;
let aluno: Aluno;

beforeAll(async () => {
  t = await criarAmbienteTeste({ config: { backupDir: pastaBackup } });
  sup = await t.superadmin();
  aluno = await t.alunoPago();
}, 90_000);
afterAll(() => t.fechar());

const conf = () => ({ senha: sup.senha });
const sqlDe = (): string[] => {
  const log: string[] = [];
  const c = t.banco.conexao;
  if (c.tipo !== 'pglite') return log;
  const pg = c.pg as unknown as { query: (...a: unknown[]) => unknown };
  const orig = pg.query.bind(pg);
  pg.query = (...a: unknown[]) => {
    log.push(String(a[0]));
    return orig(...a);
  };
  (log as unknown as { parar: () => void }).parar = () => {
    pg.query = orig;
  };
  return log;
};

describe('S-08: financeiro e estatísticas agregados no SQL', () => {
  it('não lê pix_imagem nem pix_payload e soma certo', async () => {
    const log = sqlDe();
    const f = await t.chamar('superFinanceiro', { cookie: sup.cookie, query: { de: '2026-10-01', ate: '2026-10-31', agrupamento: 'semana' } });
    const e = await t.chamar('superAsaasEstatisticas', { cookie: sup.cookie, query: { de: '2026-10-01', ate: '2026-10-31' } });
    const csv = await t.chamar('superPagamentosCsv', { cookie: sup.cookie });
    (log as unknown as { parar?: () => void }).parar?.();
    expect(f.statusCode, f.body).toBe(200);
    expect(f.json().totais.pagos).toBeGreaterThanOrEqual(1);
    expect(f.json().pix.pagos).toBeGreaterThanOrEqual(1);
    expect(e.json().porStatus.find((x: { status: string }) => x.status === 'RECEIVED').quantidade).toBeGreaterThanOrEqual(1);
    expect(csv.statusCode).toBe(200);
    if (t.banco.conexao.tipo === 'pglite') {
      expect(log.length).toBeGreaterThan(0);
      expect(log.filter((q) => /pix_imagem|pix_payload/.test(q))).toEqual([]);
    }
  });
});

describe('S-09: /super/sistema mostra a verdade', () => {
  it('backup de 10 dias, job atrasado, worker parado, 5xx e SMTP testado de verdade', async () => {
    const agora = t.relogio.agora();
    const dezDias = new Date(agora.getTime() - 10 * 86_400_000);
    writeFileSync(join(pastaBackup, 'ULTIMO_BACKUP'), `${dezDias.toISOString()} /srv/x.dump arquivos=ok\n`);
    await t.db.insert(schema.jobsExecucoes).values([
      { job: 'backup', iniciadoEm: dezDias, terminadoEm: dezDias, ok: true },
      { job: 'expirar-pix', iniciadoEm: new Date(agora.getTime() - 3 * 86_400_000), terminadoEm: dezDias, ok: true },
    ]);
    // Uma rota que estoura (500) fica registrada em erros_api, sem dado pessoal.
    const saldoOrig = t.asaas.saldo;
    t.asaas.saldo = async () => {
      throw new Error('quebrou');
    };
    expect((await t.chamar('superAsaasSaldo', { cookie: sup.cookie })).statusCode).toBe(500);
    t.asaas.saldo = saldoOrig;
    await new Promise((r) => setTimeout(r, 50));
    t.config.smtp.host = '127.0.0.1';
    t.config.smtp.porta = 1;
    const r = await t.chamar('superSistema', { cookie: sup.cookie });
    t.config.smtp.host = '';
    t.config.smtp.porta = 587;
    expect(r.statusCode, r.body).toBe(200);
    const s = r.json();
    expect(s.backup).toMatchObject({ estado: 'falhou', atrasado: true });
    expect(s.backup.idadeHoras).toBeGreaterThan(200);
    const pix = s.worker.jobs.find((j: { job: string }) => j.job === 'expirar-pix');
    expect(pix).toMatchObject({ nome: 'Expiração dos Pix', estado: 'atrasado', atrasado: true });
    expect(s.worker.parado).toBe(true);
    expect(s.erros5xx.ultimas24h).toBeGreaterThanOrEqual(1);
    expect(s.erros5xx.porRota[0]).toMatchObject({ rota: '/api/super/asaas/saldo', status: 500 });
    expect(s.smtp).toMatchObject({ configurado: true, estado: 'falhou' });
    expect(s.asaas.estado).toBe('ok');
    expect(s.push).toMatchObject({ configurado: true, estado: 'nao_testado' });
    expect(s.resumo.estado).toBe('falhou');
    expect(s.resumo.problemas.join(' ')).toMatch(/backup/i);
  });

  it('banco fora do ar responde 503 banco_indisponivel, não 500', async () => {
    const t2 = await criarAmbienteTeste({ seed: false });
    const s2 = await t2.superadmin();
    await t2.banco.fechar();
    const r = await t2.chamar('superSistema', { cookie: s2.cookie });
    expect(r.statusCode).toBe(503);
    expect(r.json().codigo).toBe('banco_indisponivel');
    await t2.app.close();
  }, 60_000);
});

describe('S-15: requisição em segundo plano não renova a sessão', () => {
  it('polling com o cabeçalho cai depois de 2 h sem uso humano; sem ele, seguiria', async () => {
    const s = await t.superadmin();
    const h = { [HEADER_SEGUNDO_PLANO]: '1' };
    for (let i = 0; i < 3; i++) {
      t.relogio.avancar(30 * 60_000);
      expect((await t.chamar('superSistema', { cookie: s.cookie, headers: h })).statusCode).toBe(200);
    }
    // Sem o cabeçalho, a mesma chamada renovaria (controle, noutra sessão).
    const s2 = await t.superadmin();
    t.relogio.avancar(90 * 60_000);
    expect((await t.chamar('superSistema', { cookie: s2.cookie })).statusCode).toBe(200);
    t.relogio.avancar(60 * 60_000);
    expect((await t.chamar('superSistema', { cookie: s2.cookie })).statusCode).toBe(200);
    // A sessão do polling: 2 h e meia sem nenhuma requisição humana.
    expect((await t.chamar('superSistema', { cookie: s.cookie, headers: h })).statusCode).toBe(401);
    sup = await t.superadmin();
  });
});

describe('S-16: 2FA com falhas persistidas e auditadas', () => {
  it('10 códigos errados → bloqueio (429), que vale numa nova instância da API', async () => {
    const s = await t.superadmin();
    const l = await t.chamar('authLoginSuper', { corpo: { email: s.email, senha: s.senha } });
    const cookie = l.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    for (let i = 0; i < 10; i++) {
      const r = await t.chamar('super2faVerificar', { cookie, corpo: { codigo: '000000' } });
      expect(r.statusCode).toBe(400);
    }
    const bloq = await t.chamar('super2faVerificar', { cookie, corpo: { codigo: gerarCodigoTotp(s.segredo(), t.relogio.agora()) } });
    expect(bloq.statusCode).toBe(429);
    expect(bloq.json().codigo).toBe('dois_fatores_bloqueado');
    const aud = await t.db.select().from(schema.auditoria).where(and(eq(schema.auditoria.adminId, s.id), eq(schema.auditoria.acao, '2fa.falha')));
    expect(aud).toHaveLength(10);
    expect(JSON.stringify(aud)).not.toContain('000000');
    const outra = await criarApp({ db: t.db, config: t.config, asaas: t.asaas, mailer: t.mailer, relogio: t.relogio, rateLimit: false, logger: false });
    const r2 = await outra.inject({ method: 'POST', url: '/api/super/2fa/verificar', headers: { cookie }, payload: { codigo: '123456' } });
    expect(r2.statusCode).toBe(429);
    await outra.close();
    expect(t.mailer.enviados.some((m) => m.para === s.email && /códigos errados/.test(m.assunto))).toBe(true);
    // Passada a janela, volta a aceitar.
    t.relogio.avancar(16 * 60_000);
    const ok = await t.chamar('super2faVerificar', { cookie, corpo: { codigo: gerarCodigoTotp(s.segredo(), t.relogio.agora()) } });
    expect(ok.statusCode, ok.body).toBe(200);
    sup = await t.superadmin();
  });

  it('limite das ações sensíveis é por usuário (soma as rotas) e sobrevive a reinício', async () => {
    const t3 = await criarAmbienteTeste({ seed: false, rateLimit: true });
    const s = await t3.superadmin();
    for (let i = 0; i < 20; i++) expect((await t3.chamar('superPrecosSalvar', { cookie: s.cookie, corpo: {} })).statusCode).toBe(400);
    const outraRota = await t3.chamar('superCupomCriar', { cookie: s.cookie, corpo: {} });
    expect(outraRota.statusCode, outraRota.body).toBe(429);
    const outra = await criarApp({ db: t3.db, config: t3.config, asaas: t3.asaas, mailer: t3.mailer, relogio: t3.relogio, rateLimit: true, logger: false });
    const r = await outra.inject({ method: 'PUT', url: '/api/super/configuracoes', headers: { cookie: s.cookie }, payload: {} });
    expect(r.statusCode).toBe(429);
    await outra.close();
    await t3.fechar();
  }, 60_000);
});

describe('S-11: equipe exige reconfirmação; troca de e-mail avisa o antigo', () => {
  it('e-mail de admin, forçar senha de admin e bloquear superadmin pedem a confirmação', async () => {
    const adm = await t.admin();
    const novoEmail = `novo.${Date.now()}@teste.com`;
    const sem = await t.chamar('superUsuarioEditar', { cookie: sup.cookie, params: { id: adm.id }, corpo: { email: novoEmail, motivo: 'Troca de e-mail' } });
    expect(sem.statusCode).toBe(400);
    expect(sem.json().campos.confirmacao).toBeDefined();
    expect((await t.chamar('superUsuarioForcarSenha', { cookie: sup.cookie, params: { id: adm.id }, corpo: { motivo: 'Suspeita' } })).statusCode).toBe(400);
    const outro = await t.superadmin();
    expect((await t.chamar('superUsuarioBloquear', { cookie: sup.cookie, params: { id: outro.id }, corpo: { motivo: 'Saiu da empresa' } })).statusCode).toBe(400);
    const ok = await t.chamar('superUsuarioEditar', { cookie: sup.cookie, params: { id: adm.id }, corpo: { email: novoEmail, motivo: 'Troca de e-mail', confirmacao: conf() } });
    expect(ok.statusCode, ok.body).toBe(200);
    await t.app.deps.aguardarTarefas();
    const aviso = t.mailer.enviados.find((m) => m.para === adm.email && /e-mail da sua conta foi trocado/.test(m.assunto));
    expect(aviso).toBeDefined();
    expect(aviso!.texto).not.toContain(novoEmail);
    // A sessão do admin caiu com a troca.
    expect((await t.chamar('meObter', { cookie: adm.cookie })).statusCode).toBe(401);
    // Aluno: troca sem reconfirmação, mas o endereço antigo também é avisado.
    const a = await t.cadastrar();
    const ea = await t.chamar('superUsuarioEditar', { cookie: sup.cookie, params: { id: a.id }, corpo: { email: `a.${Date.now()}@teste.com`, motivo: 'Pedido do aluno' } });
    expect(ea.statusCode, ea.body).toBe(200);
    await t.app.deps.aguardarTarefas();
    expect(t.mailer.enviados.some((m) => m.para === a.email && /trocado/.test(m.assunto))).toBe(true);
  });
});

describe('S-12: cupom com reconfirmação e limite com reserva (C8)', () => {
  const base = { descricao: '', validoAte: null, concursoId: null, ativo: true, motivo: 'Campanha' };
  it('criar sem confirmação dá 400', async () => {
    const r = await t.chamar('superCupomCriar', { cookie: sup.cookie, corpo: { ...base, codigo: 'SEMCONF', tipo: 'fixo', valor: 1000, limiteUsos: null } });
    expect(r.statusCode).toBe(400);
  });

  it('limite 1: o Pix pendente reserva; o 2º aluno é recusado; o pago é honrado', async () => {
    const c = await t.chamar('superCupomCriar', { cookie: sup.cookie, corpo: { ...base, codigo: 'RESERVA1', tipo: 'fixo', valor: 1000, limiteUsos: 1, confirmacao: conf() } });
    expect(c.statusCode, c.body).toBe(200);
    const a = await t.cadastrar();
    const b = await t.cadastrar();
    const pa = await t.chamar('pagamentoPix', { cookie: a.cookie, corpo: { cupom: 'RESERVA1' } });
    expect(pa.statusCode, pa.body).toBe(200);
    // O mesmo aluno pode pedir o Pix de novo (não é outro uso).
    expect((await t.chamar('pagamentoPix', { cookie: a.cookie, corpo: { cupom: 'RESERVA1' } })).statusCode).toBe(200);
    const pb = await t.chamar('pagamentoPix', { cookie: b.cookie, corpo: { cupom: 'RESERVA1' } });
    expect(pb.statusCode).toBe(400);
    expect(pb.json().campos.cupom).toMatch(/limite/);
    const lista = (await t.chamar('superCupons', { cookie: sup.cookie })).json();
    expect(lista.itens.find((x: { codigo: string }) => x.codigo === 'RESERVA1')).toMatchObject({ reservados: 1, usos: 0, pendentes: 1 });
    const [p] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, pa.json().pedidoId));
    expect((await t.webhook('PAYMENT_CONFIRMED', p!.asaasPaymentId!)).statusCode).toBe(200);
    expect((await usuario(t, a.id)).acesso).toBe(true);
  });

  it('corrida: dois Pix com o cupom de limite 1 → o segundo sai do Asaas e é recusado', async () => {
    const c = (await t.chamar('superCupomCriar', { cookie: sup.cookie, corpo: { ...base, codigo: 'CORRIDA', tipo: 'fixo', valor: 1000, limiteUsos: 1, confirmacao: conf() } })).json().cupom;
    const [cc] = await t.db.select().from(schema.concursos).limit(1);
    const agora = t.relogio.agora();
    const novo = async (u: string, ms: number) =>
      (
        await t.db
          .insert(schema.pedidos)
          .values({ usuarioId: u, concursoId: cc!.id, cupomId: c.id, valorCentavos: 500, status: 'pendente', asaasPaymentId: `pay_corrida_${ms}`, pixExpiraEm: new Date(agora.getTime() + 86_400_000), criadoEm: new Date(agora.getTime() + ms) })
          .returning()
      )[0]!;
    const a = await t.cadastrar();
    const b = await t.cadastrar();
    const p1 = await novo(a.id, 0);
    const p2 = await novo(b.id, 1);
    await garantirReservaCupom(t.app.deps, p1, agora);
    await expect(garantirReservaCupom(t.app.deps, p2, agora)).rejects.toMatchObject({ codigo: 'validacao' });
    const [d2] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, p2.id));
    expect(d2).toMatchObject({ status: 'vencido' });
    const [d1] = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.id, p1.id));
    expect(d1).toMatchObject({ status: 'pendente' });
  });
});

describe('S-17: comunicação em massa', () => {
  const corpo = { canal: 'email', segmento: 'todos', assunto: 'Aviso geral', mensagem: 'Mensagem de teste para todos.' };
  it('sem reconfirmação 400; mesma chave devolve a mesma; idêntica sem chave 409; retomar a pausada', async () => {
    t.config.smtp.host = 'smtp.teste.local';
    try {
      expect((await t.chamar('superComunicacaoCriar', { cookie: sup.cookie, corpo: { ...corpo, motivo: 'Aviso' } })).statusCode).toBe(400);
      const chave = '0b6c1f8e-3a2d-4b5e-8f00-0123456789ab';
      const c1 = await t.chamar('superComunicacaoCriar', { cookie: sup.cookie, corpo: { ...corpo, motivo: 'Aviso', confirmacao: conf(), chaveIdempotencia: chave } });
      expect(c1.statusCode, c1.body).toBe(200);
      const c2 = await t.chamar('superComunicacaoCriar', { cookie: sup.cookie, corpo: { ...corpo, motivo: 'Aviso', confirmacao: conf(), chaveIdempotencia: chave } });
      expect(c2.json().id).toBe(c1.json().id);
      const dup = await t.chamar('superComunicacaoCriar', { cookie: sup.cookie, corpo: { ...corpo, motivo: 'Aviso', confirmacao: conf() } });
      expect(dup.statusCode).toBe(409);
      expect(await t.db.select().from(schema.comunicacoes).where(eq(schema.comunicacoes.assunto, 'Aviso geral'))).toHaveLength(1);
      await t.db.update(schema.comunicacoes).set({ status: 'pausada', pausadaMotivo: 'Falha do SMTP: ECONNREFUSED' }).where(eq(schema.comunicacoes.id, c1.json().id));
      const ret = await t.chamar('superComunicacaoRetomar', { cookie: sup.cookie, params: { id: c1.json().id }, corpo: { motivo: 'SMTP voltou' } });
      expect(ret.statusCode, ret.body).toBe(200);
      expect(ret.json()).toMatchObject({ status: 'enviando', pausadaMotivo: null });
    } finally {
      t.config.smtp.host = '';
    }
  });

  it('o limite de 5 por dia vale com criações em paralelo', async () => {
    t.config.smtp.host = 'smtp.teste.local';
    try {
      t.relogio.avancar(86_400_000);
      sup = await t.superadmin();
      const rs = await Promise.all(
        Array.from({ length: 7 }, (_, i) =>
          t.chamar('superComunicacaoCriar', { cookie: sup.cookie, corpo: { ...corpo, assunto: `Paralela ${i}`, motivo: 'Aviso', confirmacao: conf() } }),
        ),
      );
      expect(rs.filter((r) => r.statusCode === 200)).toHaveLength(5);
      expect(rs.filter((r) => r.statusCode === 429)).toHaveLength(2);
    } finally {
      t.config.smtp.host = '';
    }
  });
});

describe('S-18: CSV sem corte silencioso e sem segredos', () => {
  it('acima do teto, o aviso vem no arquivo e na resposta', async () => {
    await t.alunoPago();
    limiteCsv.linhas = 1;
    try {
      const p = (await t.chamar('superPagamentosCsv', { cookie: sup.cookie })).json();
      expect(p.linhas).toBe(1);
      expect(p.aviso).toMatch(/exportadas 1 de \d+/);
      expect(p.conteudo.trim().split('\r\n').at(-1)).toContain('Atenção: exportadas 1 de');
      const u = (await t.chamar('superUsuariosCsv', { cookie: sup.cookie })).json();
      expect(u.aviso).toMatch(/exportadas 1 de/);
    } finally {
      limiteCsv.linhas = 100_000;
    }
    const tudo = (await t.chamar('superUsuariosCsv', { cookie: sup.cookie, query: { papel: 'aluno' } })).json();
    expect(tudo.aviso).toBeNull();
    expect(tudo.conteudo).not.toMatch(/argon2|\$argon/);
  });
});

describe('S-20: conciliação em lote dentro do tempo', () => {
  it('Asaas lento: resposta parcial honesta em vez de 504', async () => {
    const orig = t.asaas.obterCobranca;
    const antes = { ...TEMPOS_ASAAS };
    t.asaas.obterCobranca = (id: string) => new Promise((r) => setTimeout(() => r(orig(id)), 300));
    TEMPOS_ASAAS.prazoChamadaMs = 100;
    TEMPOS_ASAAS.orcamentoMs = 1;
    try {
      const r = await t.chamar('superConciliarLote', { cookie: sup.cookie, corpo: { de: '2026-10-01', ate: '2026-10-31' } });
      expect(r.statusCode, r.body).toBe(200);
      const j = r.json();
      expect(j.verificados + j.naoConferidos).toBeGreaterThan(0);
      expect(j.erros).toBe(j.verificados);
      if (j.naoConferidos) expect(j.mensagem).toMatch(/Rode de novo/);
      expect(j.itens.every((i: { mensagem: string }) => /não respondeu/.test(i.mensagem))).toBe(true);
    } finally {
      t.asaas.obterCobranca = orig;
      Object.assign(TEMPOS_ASAAS, antes);
    }
  });
});

describe('S-21: anonimização, exportação e CPF', () => {
  it('a auditoria e a ficha do excluído não guardam nome, e-mail nem celular', async () => {
    const a = await t.alunoPago();
    const emailAntigo = a.email;
    await t.chamar('superUsuarioEditar', { cookie: sup.cookie, params: { id: a.id }, corpo: { celular: '42991112222', motivo: 'Correção' } });
    await t.chamar('superUsuarioForcarSenha', { cookie: sup.cookie, params: { id: a.id }, corpo: { motivo: 'Suspeita' } });
    const an = await t.chamar('superUsuarioAnonimizar', { cookie: sup.cookie, params: { id: a.id }, corpo: { motivo: 'Pedido do titular', confirmacao: conf(), emailConfirmado: emailAntigo } });
    expect(an.statusCode, an.body).toBe(200);
    const auds = await t.db.select().from(schema.auditoria).where(eq(schema.auditoria.alvo, `usuario:${a.id}`));
    expect(JSON.stringify(auds)).not.toContain(emailAntigo);
    expect(JSON.stringify(auds)).not.toContain('42991112222');
    const ficha = await t.chamar('superUsuarioObter', { cookie: sup.cookie, params: { id: a.id } });
    expect(ficha.body).not.toContain(emailAntigo);
    const ped = await t.db.select().from(schema.pedidos).where(eq(schema.pedidos.usuarioId, a.id));
    expect(ped.every((p) => p.pixPayload === null && p.pixImagem === null)).toBe(true);
  });

  it('exportar sem motivo e confirmação dá 400; com, fica auditado com o motivo', async () => {
    expect((await t.chamar('superUsuarioExportar', { cookie: sup.cookie, params: { id: aluno.id }, corpo: {} })).statusCode).toBe(400);
    const ok = await t.chamar('superUsuarioExportar', { cookie: sup.cookie, params: { id: aluno.id }, corpo: { motivo: 'Pedido do titular por e-mail', confirmacao: conf() } });
    expect(ok.statusCode, ok.body).toBe(200);
    const [aud] = await t.db.select().from(schema.auditoria).where(and(eq(schema.auditoria.acao, 'usuario.exportar'), eq(schema.auditoria.alvo, `usuario:${aluno.id}`)));
    expect(aud!.motivo).toBe('Pedido do titular por e-mail');
  });

  it('a busca só acha CPF pelo número completo', async () => {
    const u = await usuario(t, aluno.id);
    const meio = (await t.chamar('superUsuariosListar', { cookie: sup.cookie, query: { q: u.cpf!.slice(2, 9) } })).json();
    expect(meio.itens.map((x: { id: string }) => x.id)).not.toContain(aluno.id);
    const cheio = (await t.chamar('superUsuariosListar', { cookie: sup.cookie, query: { q: u.cpf! } })).json();
    expect(cheio.itens.map((x: { id: string }) => x.id)).toContain(aluno.id);
  });
});

describe('S-22: curingas escapados na busca', () => {
  it('% e _ valem literalmente', async () => {
    expect(escaparLike('a%b_c\\d')).toBe('a\\%b\\_c\\\\d');
    for (const nome of ['superUsuariosListar', 'superPagamentosListar', 'superWebhooksListar'] as const) {
      expect((await t.chamar(nome, { cookie: sup.cookie, query: { q: '%' } })).json().total, `${nome} %`).toBe(0);
      // "__" literal não existe; como curinga (2 caracteres quaisquer) trazia tudo.
      expect((await t.chamar(nome, { cookie: sup.cookie, query: { q: '__' } })).json().total, `${nome} __`).toBe(0);
    }
    expect((await t.chamar('superAuditoria', { cookie: sup.cookie, query: { alvo: '%' } })).json().total).toBe(0);
    expect((await t.chamar('superAuditoria', { cookie: sup.cookie, query: { alvo: 'usuario:' } })).json().total).toBeGreaterThan(0);
  });
});
