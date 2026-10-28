/**
 * /super/usuarios e /super/equipe (D13): busca com filtros, ficha completa, edição, senha,
 * bloqueio, papel (sem rebaixar o último superadmin), LGPD (exportar e anonimizar), sessões,
 * CSV e convites da equipe.
 */
import { createHash } from 'node:crypto';
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lt, max, or, sql, type SQL } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { NOMES_PAPEL, ocultarCpf, somenteDigitos, MS_DIA } from '@fuse/shared';
import {
  gerarCsv,
  VALIDADE_CONVITE_MS,
  VALIDADE_LINK_SENHA_MS,
  type ConcursoDoUsuario,
  type FichaUsuarioResposta,
  type Reconfirmacao,
  type UsuarioSuperResumo,
} from '@fuse/shared/api';
import type { Deps, Usuario, UsuarioSessao } from '../../contexto.js';
import type { Contexto, Registrador } from '../../http/registrar.js';
import { ehViolacaoUnica, existe, falha } from '../../http/erros.js';
import { emailAvisoTrocaEmail, emailConvite, emailRecuperacao } from '../../integracoes/email.js';
import { liberarConcurso, recalcularAcessoPorPedidos, revogarConcurso } from '../../servicos/concursos.js';
import { reconfirmar } from '../../servicos/doisfatores.js';
import { alunoAlvo, concursoEstaLiberado } from '../../servicos/pagamentoManual.js';
import { dominioPorDisciplina } from '../../servicos/dominio.js';
import { anonimizarUsuario, exportarDadosUsuario } from '../../servicos/lgpd.js';
import { encerrarSessoesDoUsuario, gerarToken } from '../../servicos/sessoes.js';
import { cargoDoUsuario, revisoesPendentes } from '../../servicos/usuario.js';
import { contar, contem, dataSql, iso, isoOuNull, type Db } from '../../util.js';
import { paginacao } from '../admin/comum.js';
import { auditarSuper, avisoCorte, celularOculto, garantirOutroSuperadmin, limiteCsv, mapPagamento, nomeArquivoCsv, periodo, semDadosPessoais } from './comum.js';

const {
  usuarios,
  pedidos,
  tentativas,
  sessoes,
  sessoesEstudo,
  simulados,
  progressoLicoes,
  pushInscricoes,
  auditoria,
  redefinicoesSenha,
  usuariosConcursos,
  concursos,
  cargos,
  cupons,
} = schema;

const hashSimples = (t: string) => createHash('sha256').update(t).digest('hex');

// Coluna qualificada à mão: no select de uma tabela só o Drizzle omite o nome da tabela.
const subUltimaAtividade = sql<Date | null>`(select max(t.respondida_em) from tentativas t where t.usuario_id = "usuarios"."id")`;
const subPago = sql<boolean>`exists (select 1 from pedidos p where p.usuario_id = "usuarios"."id" and p.status = 'pago')`;

interface FiltrosUsuarios {
  q?: string | undefined;
  papel?: Usuario['papel'] | undefined;
  acesso?: boolean | undefined;
  pago?: boolean | undefined;
  bloqueado?: boolean | undefined;
  ativoDias?: number | undefined;
  inativoDias?: number | undefined;
  incluirExcluidos?: boolean | undefined;
  de?: string | undefined;
  ate?: string | undefined;
}

function ondeUsuarios(q: FiltrosUsuarios, agora: Date): SQL | undefined {
  const termo = q.q?.trim();
  const dig = termo ? somenteDigitos(termo) : '';
  const per = q.de || q.ate ? periodo(q, agora, 3650) : null;
  const desde = (dias: number) => new Date(agora.getTime() - dias * MS_DIA);
  return and(
    termo
      ? or(
          // S-22: curingas escapados; S-21: CPF só pelo número completo (o trecho do meio
          // reconstruía o CPF que a tela mostra mascarado).
          contem(usuarios.nome, termo),
          contem(usuarios.email, termo),
          dig.length === 11 ? eq(usuarios.cpf, dig) : undefined,
          dig.length >= 4 ? sql`${usuarios.celular} like ${`%${dig}%`}` : undefined,
        )
      : undefined,
    q.papel ? eq(usuarios.papel, q.papel) : undefined,
    q.acesso !== undefined ? eq(usuarios.acesso, q.acesso) : undefined,
    q.pago === true ? subPago : q.pago === false ? sql`not ${subPago}` : undefined,
    q.bloqueado === true ? isNotNull(usuarios.bloqueadoEm) : q.bloqueado === false ? isNull(usuarios.bloqueadoEm) : undefined,
    q.ativoDias ? sql`exists (select 1 from tentativas t where t.usuario_id = "usuarios"."id" and t.respondida_em >= ${dataSql(desde(q.ativoDias))})` : undefined,
    q.inativoDias ? sql`not exists (select 1 from tentativas t where t.usuario_id = "usuarios"."id" and t.respondida_em >= ${dataSql(desde(q.inativoDias))})` : undefined,
    q.incluirExcluidos ? undefined : isNull(usuarios.excluidoEm),
    per ? gte(usuarios.criadoEm, per.inicio) : undefined,
    per ? lt(usuarios.criadoEm, per.fim) : undefined,
  );
}

/**
 * S-18: as colunas que o painel mostra. Nunca `senha_hash`, `totp_segredo` nem
 * `totp_ultimo_passo` (antes a lista e o CSV liam a linha inteira).
 */
const colunasResumo = {
  id: usuarios.id,
  nome: usuarios.nome,
  email: usuarios.email,
  cpf: usuarios.cpf,
  celular: usuarios.celular,
  papel: usuarios.papel,
  acesso: usuarios.acesso,
  bloqueadoEm: usuarios.bloqueadoEm,
  totpAtivadoEm: usuarios.totpAtivadoEm,
  marketing: usuarios.marketing,
  xpTotal: usuarios.xpTotal,
  ofensiva: usuarios.ofensiva,
  criadoEm: usuarios.criadoEm,
  excluidoEm: usuarios.excluidoEm,
};
type UsuarioResumoDb = Pick<Usuario, keyof typeof colunasResumo>;

const selUsuarios = (db: Db) =>
  db.select({ u: colunasResumo, ultima: subUltimaAtividade, pago: subPago }).from(usuarios);

function mapResumo(u: UsuarioResumoDb, ultima: Date | string | null, pago: boolean): UsuarioSuperResumo {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    cpfOculto: ocultarCpf(u.cpf ?? ''),
    celularOculto: celularOculto(u.celular),
    papel: u.papel,
    acesso: u.acesso,
    pago: !!pago,
    bloqueado: !!u.bloqueadoEm,
    doisFatores: !!u.totpAtivadoEm,
    marketing: u.marketing,
    xpTotal: u.xpTotal,
    ofensiva: u.ofensiva,
    ultimaAtividadeEm: ultima ? new Date(ultima).toISOString() : null,
    criadoEm: iso(u.criadoEm),
    excluidoEm: isoOuNull(u.excluidoEm),
  };
}

async function usuarioPorId(db: Db, id: string): Promise<Usuario> {
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, id));
  return existe(u, 'Usuário não encontrado.');
}

function navegadorDe(endpoint: string): string {
  if (endpoint.includes('fcm.googleapis.com')) return 'Chrome / Edge / Android';
  if (endpoint.includes('mozilla.com')) return 'Firefox';
  if (endpoint.includes('push.apple.com')) return 'Safari / iPhone';
  if (endpoint.includes('notify.windows.com')) return 'Edge (Windows)';
  return 'Navegador';
}

async function ficha(db: Db, id: string, agora: Date): Promise<FichaUsuarioResposta> {
  const u = await usuarioPorId(db, id);
  const [[res], [lic], [tent], [sims], [sess], ped, ses, push, cargo] = await Promise.all([
    selUsuarios(db).where(eq(usuarios.id, id)),
    db.select({ n: count() }).from(progressoLicoes).where(and(eq(progressoLicoes.usuarioId, id), isNotNull(progressoLicoes.concluidaEm))),
    db.select({ n: count(), a: sql<number>`count(*) filter (where ${tentativas.acertou})::int` }).from(tentativas).where(eq(tentativas.usuarioId, id)),
    db.select({ n: count() }).from(simulados).where(and(eq(simulados.usuarioId, id), isNotNull(simulados.entregueEm))),
    db.select({ n: count() }).from(sessoesEstudo).where(eq(sessoesEstudo.usuarioId, id)),
    db.select().from(pedidos).where(eq(pedidos.usuarioId, id)).orderBy(desc(pedidos.criadoEm)),
    db.select().from(sessoes).where(and(eq(sessoes.usuarioId, id), sql`${sessoes.expiraEm} > ${dataSql(agora)}`)).orderBy(desc(sessoes.ultimoUsoEm)),
    db.select().from(pushInscricoes).where(eq(pushInscricoes.usuarioId, id)).orderBy(desc(pushInscricoes.criadoEm)),
    cargoDoUsuario(db, u),
  ]);
  const aprovadores = new Map<string, string>();
  const idsAprov = [...new Set(ped.map((p) => p.aprovadoPor).filter((x): x is string => !!x))];
  if (idsAprov.length) {
    for (const a of await db.select({ id: usuarios.id, nome: usuarios.nome }).from(usuarios).where(inArray(usuarios.id, idsAprov))) aprovadores.set(a.id, a.nome);
  }
  const concursosDoAluno = await concursosDaFicha(db, u, ped);
  const nomesConcurso = new Map(concursosDoAluno.map((c) => [c.id, c.nome]));
  const idsSemNome = [...new Set(ped.map((p) => p.concursoId).filter((c): c is string => !!c && !nomesConcurso.has(c)))];
  if (idsSemNome.length) {
    for (const c of await db.select({ id: concursos.id, nome: concursos.nome }).from(concursos).where(inArray(concursos.id, idsSemNome))) nomesConcurso.set(c.id, c.nome);
  }
  const idsCupom = [...new Set(ped.map((p) => p.cupomId).filter((c): c is string => !!c))];
  const codigosCupom = new Map(
    idsCupom.length ? (await db.select({ id: cupons.id, codigo: cupons.codigo }).from(cupons).where(inArray(cupons.id, idsCupom))).map((c) => [c.id, c.codigo]) : [],
  );
  const acessoPorConcurso = new Map(concursosDoAluno.map((c) => [c.id, c.acesso]));
  const alvos = [`usuario:${id}`, ...ped.map((p) => `pedido:${p.id}`)];
  const auds = await db
    .select({ a: auditoria, nome: usuarios.nome })
    .from(auditoria)
    .leftJoin(usuarios, eq(usuarios.id, auditoria.adminId))
    .where(inArray(auditoria.alvo, alvos))
    .orderBy(desc(auditoria.criadoEm))
    .limit(100);
  const feitas = contar(tent?.n);
  return {
    usuario: {
      ...mapResumo(u, res?.ultima ?? null, res?.pago ?? false),
      celular: u.celular,
      bloqueadoEm: isoOuNull(u.bloqueadoEm),
      bloqueioMotivo: u.bloqueioMotivo,
      doisFatoresAtivadoEm: isoOuNull(u.totpAtivadoEm),
      cargo: cargo?.nome ?? null,
      area: u.area,
      notificacoes: u.notificacoes,
      lembreteHora: u.lembreteHora,
      aceiteTermosEm: isoOuNull(u.aceiteTermosEm),
      versaoTermos: u.versaoTermos,
    },
    progresso: {
      xpTotal: u.xpTotal,
      gemas: u.gemas,
      vidas: u.vidas,
      ofensiva: u.ofensiva,
      ofensivaRecorde: u.ofensivaRecorde,
      divisao: u.divisao,
      ultimoDiaEstudo: u.ultimoDiaEstudo,
      licoesConcluidas: contar(lic?.n),
      questoesFeitas: feitas,
      precisao: feitas ? Math.round((contar(tent?.a) / feitas) * 100) : null,
      sessoesEstudo: contar(sess?.n),
      simuladosEntregues: contar(sims?.n),
      revisoesPendentes: await revisoesPendentes(db, id, agora),
      dominio: (await dominioPorDisciplina(db, id)).map((d) => ({ slug: d.slug, nome: d.nome, valor: d.valor })),
    },
    pedidos: ped.map((p) => {
      const { usuario: _u, ...resto } = mapPagamento(p, u, p.aprovadoPor ? { id: p.aprovadoPor, nome: aprovadores.get(p.aprovadoPor) ?? '—' } : null, agora, {
        concurso: p.concursoId ? { id: p.concursoId, nome: nomesConcurso.get(p.concursoId) ?? '' } : null,
        cupomCodigo: p.cupomId ? (codigosCupom.get(p.cupomId) ?? null) : null,
        acessoConcurso: p.concursoId ? (acessoPorConcurso.get(p.concursoId) ?? null) : null,
      });
      return resto;
    }),
    concursos: concursosDoAluno,
    sessoes: ses.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      criadoEm: iso(s.criadoEm),
      ultimoUsoEm: iso(s.ultimoUsoEm),
      expiraEm: iso(s.expiraEm),
      doisFatores: !!s.doisFatoresEm,
    })),
    push: push.map((p) => ({ id: p.id, navegador: navegadorDe(p.endpoint), criadoEm: iso(p.criadoEm) })),
    // S-21: na ficha de uma conta excluída, os dados pessoais antigos não aparecem (nem os de
    // registros anteriores à limpeza feita na anonimização).
    auditoria: auds.map((x) => ({
      id: x.a.id,
      admin: x.a.adminId ? { id: x.a.adminId, nome: x.nome ?? '—' } : null,
      acao: x.a.acao,
      alvo: x.a.alvo,
      motivo: x.a.motivo,
      ip: x.a.ip,
      antes: u.excluidoEm ? semDadosPessoais(x.a.antes) : (x.a.antes ?? null),
      depois: u.excluidoEm ? semDadosPessoais(x.a.depois) : (x.a.depois ?? null),
      detalhes: u.excluidoEm ? semDadosPessoais(x.a.detalhes) : (x.a.detalhes ?? null),
      criadoEm: iso(x.a.criadoEm),
    })),
  };
}

/**
 * Link de senha (a mesma tabela da recuperação). D24: o convite da equipe tem página própria
 * (`/convite/:token`); `/recuperar/:token` continua aceitando o token de convite já enviado.
 */
async function criarLinkSenha(
  deps: Deps,
  usuarioId: string,
  agora: Date,
  validadeMs: number,
  pagina: 'recuperar' | 'convite' = 'recuperar',
): Promise<{ link: string; expiraEm: Date }> {
  const token = gerarToken();
  const expiraEm = new Date(agora.getTime() + validadeMs);
  await deps.db.insert(redefinicoesSenha).values({ usuarioId, tokenHash: hashSimples(token), expiraEm, criadoEm: agora });
  return { link: `${deps.config.appUrl}/${pagina}/${token}`, expiraEm };
}

/** D24: a página de login de cada área. */
const PAGINA_LOGIN: Record<Usuario['papel'], string> = { aluno: '/entrar', admin: '/admin/entrar', superadmin: '/super/entrar' };

/** D21: os concursos do aluno na ficha, com o acesso de cada um e o pedido pago que o libera. */
async function concursosDaFicha(db: Db, u: Usuario, ped: (typeof pedidos.$inferSelect)[]): Promise<ConcursoDoUsuario[]> {
  const linhas = await db
    .select({ l: usuariosConcursos, nome: concursos.nome, cargo: cargos.nome })
    .from(usuariosConcursos)
    .innerJoin(concursos, eq(concursos.id, usuariosConcursos.concursoId))
    .leftJoin(cargos, eq(cargos.id, usuariosConcursos.cargoId))
    .where(eq(usuariosConcursos.usuarioId, u.id))
    .orderBy(asc(usuariosConcursos.criadoEm));
  return linhas.map((x) => ({
    id: x.l.concursoId,
    nome: x.nome,
    acesso: x.l.acesso,
    acessoEm: isoOuNull(x.l.acessoEm),
    ativo: u.concursoId === x.l.concursoId,
    cargo: x.cargo ?? null,
    pedidoPagoId: ped.find((p) => p.status === 'pago' && p.concursoId === x.l.concursoId)?.id ?? null,
  }));
}

async function concursosDoId(db: Db, id: string): Promise<ConcursoDoUsuario[]> {
  const u = await usuarioPorId(db, id);
  const ped = await db.select().from(pedidos).where(eq(pedidos.usuarioId, id)).orderBy(desc(pedidos.criadoEm));
  return concursosDaFicha(db, u, ped);
}

/** S-11: reconfirmação obrigatória quando o alvo é da equipe (400 sem ela, 403 se errada). */
async function exigirReconfirmacao(
  ctx: { deps: Deps; usuario: UsuarioSessao; agora: Date },
  confirmacao: Reconfirmacao | undefined,
  acao: string,
): Promise<void> {
  if (!confirmacao) {
    const msg = `Para ${acao}, confirme com sua senha ou com o código do app.`;
    throw falha('validacao', msg, { confirmacao: msg });
  }
  await reconfirmar(ctx.deps, ctx.usuario, confirmacao, ctx.agora);
}

const dadosAuditaveis = (u: Usuario) => ({
  nome: u.nome,
  email: u.email,
  celular: u.celular,
  papel: u.papel,
  acesso: u.acesso,
  bloqueado: !!u.bloqueadoEm,
});

export function rotasSuperUsuarios(r: Registrador): void {
  r.rota('superUsuariosListar', async ({ query, deps, agora }) => {
    const onde = ondeUsuarios(query, agora);
    const [t] = await deps.db.select({ n: count() }).from(usuarios).where(onde);
    const lista = await selUsuarios(deps.db)
      .where(onde)
      .orderBy(desc(usuarios.criadoEm))
      .limit(paginacao(query).limit)
      .offset(paginacao(query).offset);
    return { itens: lista.map((x) => mapResumo(x.u, x.ultima, x.pago)), total: contar(t?.n), pagina: query.pagina, porPagina: query.porPagina };
  });

  r.rota('superUsuariosCsv', async (ctx) => {
    // S-18: só as colunas exportadas; "última atividade" e "pago" por junção agregada (antes era
    // uma subconsulta por linha); sem corte silencioso: acima do teto, o aviso vai no arquivo e
    // na resposta.
    const onde = ondeUsuarios(ctx.query, ctx.agora);
    const ult = ctx.deps.db
      .select({ usuarioId: tentativas.usuarioId, em: max(tentativas.respondidaEm).as('ult_em') })
      .from(tentativas)
      .groupBy(tentativas.usuarioId)
      .as('ult');
    const pg = ctx.deps.db
      .selectDistinct({ usuarioId: pedidos.usuarioId })
      .from(pedidos)
      .where(eq(pedidos.status, 'pago'))
      .as('pg');
    const lista = await ctx.deps.db
      .select({ u: colunasResumo, ultima: ult.em, pago: sql<boolean>`${pg.usuarioId} is not null` })
      .from(usuarios)
      .leftJoin(ult, eq(ult.usuarioId, usuarios.id))
      .leftJoin(pg, eq(pg.usuarioId, usuarios.id))
      .where(onde)
      .orderBy(desc(usuarios.criadoEm))
      .limit(limiteCsv.linhas + 1);
    const cortado = lista.length > limiteCsv.linhas;
    const linhas = cortado ? lista.slice(0, limiteCsv.linhas) : lista;
    const total = cortado ? contar((await ctx.deps.db.select({ n: count() }).from(usuarios).where(onde))[0]?.n) : linhas.length;
    const aviso = cortado ? avisoCorte(limiteCsv.linhas, total) : null;
    await auditarSuper(ctx, 'exportar.csv', 'usuarios', { detalhes: { linhas: linhas.length, total } });
    const conteudo = gerarCsv(
      ['id', 'nome', 'email', 'cpf', 'celular', 'papel', 'acesso', 'pago', 'bloqueado', '2fa', 'marketing', 'xp', 'ofensiva', 'ultima_atividade', 'criado_em', 'excluido_em'],
      [
        ...linhas.map((x) => {
          const u = mapResumo(x.u, x.ultima, x.pago);
          return [u.id, u.nome, u.email, u.cpfOculto, u.celularOculto, NOMES_PAPEL[u.papel], u.acesso ? 'sim' : 'não', u.pago ? 'sim' : 'não', u.bloqueado ? 'sim' : 'não', u.doisFatores ? 'sim' : 'não', u.marketing ? 'sim' : 'não', u.xpTotal, u.ofensiva, u.ultimaAtividadeEm, u.criadoEm, u.excluidoEm];
        }),
        ...(aviso ? [[aviso]] : []),
      ],
    );
    return { nomeArquivo: nomeArquivoCsv('usuarios', ctx.agora), conteudo, linhas: linhas.length, aviso };
  });

  r.rota('superUsuarioObter', async ({ params, deps, agora }) => ficha(deps.db, params.id, agora));

  r.rota('superUsuarioEditar', async (ctx) => {
    const { deps, params, corpo, usuario, agora } = ctx;
    const antes = await usuarioPorId(deps.db, params.id);
    if (antes.excluidoEm) throw falha('conflito', 'Esta conta foi excluída.');
    const trocaEmail = corpo.email !== undefined && corpo.email.toLowerCase() !== antes.email.toLowerCase();
    // S-11: trocar o e-mail de uma conta da equipe é tomar a conta (o link de senha passa a ir
    // para o endereço novo): pede reconfirmação.
    if (trocaEmail && antes.papel !== 'aluno') await exigirReconfirmacao(ctx, corpo.confirmacao, 'trocar o e-mail de uma conta da equipe');
    const set: Partial<typeof usuarios.$inferInsert> = {};
    if (corpo.nome !== undefined) set.nome = corpo.nome;
    if (corpo.email !== undefined) set.email = corpo.email;
    if (corpo.celular !== undefined) set.celular = corpo.celular;
    let depois: Usuario;
    try {
      [depois] = (await deps.db.update(usuarios).set(set).where(eq(usuarios.id, antes.id)).returning()) as [Usuario];
    } catch (e) {
      if (ehViolacaoUnica(e)) throw falha('conta_existente', 'Já existe outra conta com este e-mail.', { email: 'Já existe outra conta com este e-mail.' });
      throw e;
    }
    let revogadas = 0;
    if (trocaEmail) {
      // O endereço antigo fica sabendo; na equipe, os links de senha pendentes e as sessões caem.
      deps.enviarEmail(emailAvisoTrocaEmail({ nome: antes.nome, emailAntigo: antes.email, emailNovo: depois.email, quando: agora }));
      if (antes.papel !== 'aluno' && antes.id !== usuario.id) {
        await deps.db.delete(redefinicoesSenha).where(eq(redefinicoesSenha.usuarioId, antes.id));
        revogadas = await encerrarSessoesDoUsuario(deps.db, antes.id);
      }
    }
    await auditarSuper(ctx, 'usuario.editar', `usuario:${antes.id}`, {
      motivo: corpo.motivo,
      antes: dadosAuditaveis(antes),
      depois: dadosAuditaveis(depois),
      detalhes: trocaEmail ? { avisoAoEmailAntigo: true, revogadas } : null,
    });
    return ficha(deps.db, antes.id, agora);
  });

  r.rota('superUsuarioForcarSenha', async (ctx) => {
    const { deps, params, corpo, agora } = ctx;
    const u = await usuarioPorId(deps.db, params.id);
    if (u.excluidoEm) throw falha('conflito', 'Esta conta foi excluída.');
    if (u.papel !== 'aluno') await exigirReconfirmacao(ctx, corpo.confirmacao, 'forçar a troca de senha de uma conta da equipe');
    const { link } = await criarLinkSenha(deps, u.id, agora, VALIDADE_LINK_SENHA_MS);
    deps.enviarEmail(emailRecuperacao({ nome: u.nome, email: u.email, link }));
    const revogadas = corpo.revogarSessoes ? await encerrarSessoesDoUsuario(deps.db, u.id) : 0;
    await auditarSuper(ctx, 'usuario.forcar_senha', `usuario:${u.id}`, { motivo: corpo.motivo, detalhes: { para: u.email, revogadas } });
    return { ok: true as const };
  });

  r.rota('superUsuarioBloquear', async (ctx) => {
    const { deps, params, corpo, usuario, agora } = ctx;
    if (params.id === usuario.id) throw falha('conflito', 'Você não pode bloquear a própria conta.');
    const u = await usuarioPorId(deps.db, params.id);
    if (u.bloqueadoEm) throw falha('conflito', 'A conta já está bloqueada.');
    // S-11: bloquear outro superadmin derruba a sessão dele: pede reconfirmação.
    if (u.papel === 'superadmin') await exigirReconfirmacao(ctx, corpo.confirmacao, 'bloquear um superadmin');
    const revogadas = await deps.db.transaction(async (tx) => {
      await garantirOutroSuperadmin(tx, u);
      await tx.update(usuarios).set({ bloqueadoEm: agora, bloqueioMotivo: corpo.motivo }).where(eq(usuarios.id, u.id));
      return encerrarSessoesDoUsuario(tx, u.id);
    });
    await auditarSuper(ctx, 'usuario.bloquear', `usuario:${u.id}`, { motivo: corpo.motivo, antes: { bloqueado: false }, depois: { bloqueado: true }, detalhes: { revogadas } });
    return { ok: true as const };
  });

  r.rota('superUsuarioDesbloquear', async (ctx) => {
    const { deps, params, corpo } = ctx;
    const u = await usuarioPorId(deps.db, params.id);
    if (!u.bloqueadoEm) throw falha('conflito', 'A conta não está bloqueada.');
    await deps.db.update(usuarios).set({ bloqueadoEm: null, bloqueioMotivo: null }).where(eq(usuarios.id, u.id));
    await auditarSuper(ctx, 'usuario.desbloquear', `usuario:${u.id}`, { motivo: corpo.motivo, antes: { bloqueado: true, motivo: u.bloqueioMotivo }, depois: { bloqueado: false } });
    return { ok: true as const };
  });

  r.rota('superUsuarioPapel', async (ctx) => {
    const { deps, params, corpo, usuario, agora } = ctx;
    await reconfirmar(deps, usuario, corpo.confirmacao, agora);
    const u = await usuarioPorId(deps.db, params.id);
    if (u.excluidoEm) throw falha('conflito', 'Esta conta foi excluída.');
    if (u.papel === corpo.papel) throw falha('conflito', `O usuário já é ${NOMES_PAPEL[u.papel].toLowerCase()}.`);
    await deps.db.transaction(async (tx) => {
      // S-24: trava as linhas dos superadmins até o fim da transação (sem TOCTOU).
      if (corpo.papel !== 'superadmin') await garantirOutroSuperadmin(tx, u);
      await tx.update(usuarios).set({ papel: corpo.papel }).where(eq(usuarios.id, u.id));
      // S-05: quem volta a ser aluno fica só com o acesso que os pedidos pagos dão (nada de
      // acesso gratuito herdado da equipe).
      const acesso = corpo.papel === 'aluno' ? await recalcularAcessoPorPedidos(tx, u.id, agora) : u.acesso;
      // As sessões abertas caem: o novo papel vale com as regras dele (portal, 2FA e validade).
      const revogadas = await encerrarSessoesDoUsuario(tx, u.id);
      await auditarSuper(
        ctx,
        'usuario.papel',
        `usuario:${u.id}`,
        { motivo: corpo.motivo, antes: { papel: u.papel, acesso: u.acesso }, depois: { papel: corpo.papel, acesso }, detalhes: { revogadas } },
        tx,
      );
    });
    return { ok: true as const };
  });

  r.rota('superUsuarioExportar', async (ctx) => {
    // S-21: sai com o CPF completo; pede motivo e reconfirmação e fica na auditoria.
    await reconfirmar(ctx.deps, ctx.usuario, ctx.corpo.confirmacao, ctx.agora);
    const u = await usuarioPorId(ctx.deps.db, ctx.params.id);
    await auditarSuper(ctx, 'usuario.exportar', `usuario:${u.id}`, { motivo: ctx.corpo.motivo });
    return exportarDadosUsuario(ctx.deps.db, u, ctx.agora);
  });

  r.rota('superUsuarioAnonimizar', async (ctx) => {
    const { deps, params, corpo, usuario, agora } = ctx;
    await reconfirmar(deps, usuario, corpo.confirmacao, agora);
    if (params.id === usuario.id) throw falha('conflito', 'Você não pode excluir a própria conta por aqui.');
    const u = await usuarioPorId(deps.db, params.id);
    if (u.excluidoEm) throw falha('conflito', 'Esta conta já foi excluída.');
    if (corpo.emailConfirmado.trim().toLowerCase() !== u.email.toLowerCase()) {
      throw falha('validacao', 'O e-mail digitado não é o deste usuário.', { emailConfirmado: 'O e-mail digitado não é o deste usuário.' });
    }
    await deps.db.transaction(async (tx) => {
      await garantirOutroSuperadmin(tx, u);
      await anonimizarUsuario(tx, u.id, agora);
    });
    // Sem dados pessoais no "antes": só o que identifica o registro.
    await auditarSuper(ctx, 'usuario.anonimizar', `usuario:${u.id}`, { motivo: corpo.motivo, antes: { papel: u.papel, acesso: u.acesso }, depois: { excluido: true } });
    return { ok: true as const };
  });

  /* --------------------------------------------- acesso por concurso (D21, D24) */
  const acaoConcurso = (liberar: boolean) => async (ctx: Contexto<'superUsuarioConcursoLiberar'>) => {
    const { deps, params, corpo, usuario, agora } = ctx;
    await reconfirmar(deps, usuario, corpo.confirmacao, agora);
    const [c] = await deps.db.select({ id: concursos.id, nome: concursos.nome }).from(concursos).where(eq(concursos.id, params.concursoId));
    const concurso = existe(c, 'Concurso não encontrado.');
    const r = await deps.db.transaction(async (tx) => {
      const aluno = await alunoAlvo(tx, params.id, usuario.id, { travar: true });
      const antes = await concursoEstaLiberado(tx, aluno, concurso.id);
      if (liberar && !antes) await liberarConcurso(tx, aluno.id, concurso.id, agora);
      if (!liberar && antes) {
        // Sem nenhum concurso liberado, as sessões caem (como no estorno).
        if (!(await revogarConcurso(tx, aluno.id, concurso.id))) await encerrarSessoesDoUsuario(tx, aluno.id);
      }
      const alterado = liberar ? !antes : antes;
      const [depois] = await tx.select({ acesso: usuarios.acesso }).from(usuarios).where(eq(usuarios.id, aluno.id));
      await auditarSuper(
        ctx,
        liberar ? 'acesso.liberar' : 'acesso.revogar',
        `usuario:${aluno.id}`,
        {
          motivo: corpo.motivo,
          antes: { concursoId: concurso.id, concursoLiberado: antes, acesso: aluno.acesso },
          depois: { concursoId: concurso.id, concursoLiberado: liberar, acesso: depois!.acesso },
          detalhes: { concurso: concurso.nome, alterado, semPedido: liberar },
        },
        tx,
      );
      return { alterado, acesso: depois!.acesso };
    });
    const mensagem = r.alterado
      ? liberar
        ? `${concurso.nome}: acesso liberado (cortesia, sem pagamento).`
        : `${concurso.nome}: acesso revogado.`
      : liberar
        ? `${concurso.nome} já estava liberado: nada mudou.`
        : `${concurso.nome} já estava sem acesso: nada mudou.`;
    return { alterado: r.alterado, acesso: r.acesso, mensagem, concursos: await concursosDoId(deps.db, params.id) };
  };
  r.rota('superUsuarioConcursoLiberar', acaoConcurso(true));
  r.rota('superUsuarioConcursoRevogar', (ctx) => acaoConcurso(false)(ctx as unknown as Contexto<'superUsuarioConcursoLiberar'>));

  r.rota('superUsuarioRevogarSessao', async (ctx) => {
    const { deps, params } = ctx;
    const r = await deps.db
      .delete(sessoes)
      .where(and(eq(sessoes.id, params.sessaoId), eq(sessoes.usuarioId, params.id)))
      .returning({ id: sessoes.id });
    existe(r[0], 'Sessão não encontrada.');
    await auditarSuper(ctx, 'usuario.revogar_sessao', `usuario:${params.id}`, { detalhes: { sessaoId: params.sessaoId } });
    return { ok: true as const };
  });

  /* -------------------------------------------------------------- equipe */
  r.rota('superEquipe', async ({ deps }) => {
    const ult = deps.db
      .select({ usuarioId: sessoes.usuarioId, ultimo: max(sessoes.ultimoUsoEm).as('ultimo') })
      .from(sessoes)
      .groupBy(sessoes.usuarioId)
      .as('ult');
    const lista = await deps.db
      .select({ u: usuarios, ultimo: ult.ultimo })
      .from(usuarios)
      .leftJoin(ult, eq(ult.usuarioId, usuarios.id))
      .where(and(inArray(usuarios.papel, ['admin', 'superadmin']), isNull(usuarios.excluidoEm)))
      .orderBy(desc(usuarios.papel), usuarios.nome);
    return {
      itens: lista.map(({ u, ultimo }) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        papel: u.papel,
        doisFatores: !!u.totpAtivadoEm,
        doisFatoresAtivadoEm: isoOuNull(u.totpAtivadoEm),
        convitePendente: !u.senhaHash,
        bloqueado: !!u.bloqueadoEm,
        ultimoAcessoEm: ultimo ? new Date(ultimo).toISOString() : null,
        criadoEm: iso(u.criadoEm),
      })),
    };
  });

  r.rota('superEquipeConvidar', async (ctx) => {
    const { deps, corpo, usuario, agora } = ctx;
    await reconfirmar(deps, usuario, corpo.confirmacao, agora);
    const [existente] = await deps.db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, corpo.email));
    if (existente) {
      throw falha('conta_existente', 'Já existe uma conta com este e-mail. Mude o papel dela na ficha do usuário.', { email: 'Já existe uma conta com este e-mail.' });
    }
    // Conta da equipe sem senha (definida pelo link) e sem acesso pago: o painel não precisa dele.
    const [novo] = await deps.db
      .insert(usuarios)
      .values({ nome: corpo.nome, email: corpo.email, papel: corpo.papel, acesso: false, aceiteTermosEm: agora, versaoTermos: 'equipe', criadoEm: agora, onboardingConcluidoEm: agora })
      .returning();
    const { link, expiraEm } = await criarLinkSenha(deps, novo!.id, agora, VALIDADE_CONVITE_MS, 'convite');
    deps.enviarEmail(
      emailConvite({
        nome: corpo.nome,
        email: corpo.email,
        papel: NOMES_PAPEL[corpo.papel],
        link,
        entrar: `${deps.config.appUrl}${PAGINA_LOGIN[corpo.papel]}`,
        validadeHoras: VALIDADE_CONVITE_MS / 3_600_000,
      }),
    );
    await auditarSuper(ctx, 'equipe.convidar', `usuario:${novo!.id}`, { motivo: corpo.motivo, depois: { email: corpo.email, papel: corpo.papel } });
    return { id: novo!.id, email: corpo.email, expiraEm: iso(expiraEm) };
  });
  /* ------------------------------------------- convite pendente (S-19) */

  /** A conta convidada que ainda não definiu a senha (404 se não existe; 409 se já entrou). */
  async function convitePendente(db: Db, id: string): Promise<Usuario> {
    const u = await usuarioPorId(db, id);
    if (u.papel === 'aluno' || u.excluidoEm) throw falha('nao_encontrado', 'Convite não encontrado.');
    if (u.senhaHash) throw falha('conflito', 'Este membro já aceitou o convite e definiu a senha.');
    return u;
  }

  r.rota('superEquipeConviteReenviar', async (ctx) => {
    const { deps, params, corpo, agora } = ctx;
    const u = await convitePendente(deps.db, params.id);
    // O link anterior deixa de valer: só o novo define a senha.
    await deps.db.delete(redefinicoesSenha).where(eq(redefinicoesSenha.usuarioId, u.id));
    const { link, expiraEm } = await criarLinkSenha(deps, u.id, agora, VALIDADE_CONVITE_MS, 'convite');
    deps.enviarEmail(
      emailConvite({
        nome: u.nome,
        email: u.email,
        papel: NOMES_PAPEL[u.papel],
        link,
        entrar: `${deps.config.appUrl}${PAGINA_LOGIN[u.papel]}`,
        validadeHoras: VALIDADE_CONVITE_MS / 3_600_000,
      }),
    );
    await auditarSuper(ctx, 'equipe.convite_reenviar', `usuario:${u.id}`, { motivo: corpo.motivo, depois: { expiraEm: iso(expiraEm) } });
    return { id: u.id, email: u.email, expiraEm: iso(expiraEm) };
  });

  r.rota('superEquipeConviteCancelar', async (ctx) => {
    const { deps, params, corpo } = ctx;
    const u = await convitePendente(deps.db, params.id);
    // A conta convidada nunca entrou (sem senha, sem pedidos): sai junto com o link (cascata),
    // e o e-mail fica livre para outro convite. A auditoria guarda só o papel.
    await deps.db.transaction(async (tx) => {
      await tx.delete(redefinicoesSenha).where(eq(redefinicoesSenha.usuarioId, u.id));
      await tx.delete(usuarios).where(and(eq(usuarios.id, u.id), isNull(usuarios.senhaHash)));
    });
    await auditarSuper(ctx, 'equipe.convite_cancelar', `usuario:${u.id}`, { motivo: corpo.motivo, antes: { papel: u.papel } });
    return { ok: true as const };
  });
}
