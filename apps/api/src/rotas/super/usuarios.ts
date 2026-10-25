/**
 * /super/usuarios e /super/equipe (D13): busca com filtros, ficha completa, edição, senha,
 * bloqueio, papel (sem rebaixar o último superadmin), LGPD (exportar e anonimizar), sessões,
 * CSV e convites da equipe.
 */
import { createHash } from 'node:crypto';
import { and, count, desc, eq, gte, inArray, isNotNull, isNull, lt, max, or, sql, type SQL } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { NOMES_PAPEL, ocultarCpf, somenteDigitos, MS_DIA } from '@fuse/shared';
import { gerarCsv, VALIDADE_CONVITE_MS, VALIDADE_LINK_SENHA_MS, type FichaUsuarioResposta, type UsuarioSuperResumo } from '@fuse/shared/api';
import type { Deps, Usuario } from '../../contexto.js';
import type { Registrador } from '../../http/registrar.js';
import { ehViolacaoUnica, existe, falha } from '../../http/erros.js';
import { emailConvite, emailRecuperacao } from '../../integracoes/email.js';
import { reconfirmar } from '../../servicos/doisfatores.js';
import { dominioPorDisciplina } from '../../servicos/dominio.js';
import { anonimizarUsuario, exportarDadosUsuario } from '../../servicos/lgpd.js';
import { encerrarSessoesDoUsuario, gerarToken } from '../../servicos/sessoes.js';
import { cargoDoUsuario, revisoesPendentes } from '../../servicos/usuario.js';
import { contar, iso, isoOuNull, type Db } from '../../util.js';
import { paginacao } from '../admin/comum.js';
import { auditarSuper, celularOculto, garantirOutroSuperadmin, mapPagamento, nomeArquivoCsv, periodo } from './comum.js';

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
          sql`${usuarios.nome} ilike ${`%${termo}%`}`,
          sql`${usuarios.email} ilike ${`%${termo}%`}`,
          dig.length >= 3 ? sql`${usuarios.cpf} like ${`%${dig}%`}` : undefined,
          dig.length >= 4 ? sql`${usuarios.celular} like ${`%${dig}%`}` : undefined,
        )
      : undefined,
    q.papel ? eq(usuarios.papel, q.papel) : undefined,
    q.acesso !== undefined ? eq(usuarios.acesso, q.acesso) : undefined,
    q.pago === true ? subPago : q.pago === false ? sql`not ${subPago}` : undefined,
    q.bloqueado === true ? isNotNull(usuarios.bloqueadoEm) : q.bloqueado === false ? isNull(usuarios.bloqueadoEm) : undefined,
    q.ativoDias ? sql`exists (select 1 from tentativas t where t.usuario_id = "usuarios"."id" and t.respondida_em >= ${desde(q.ativoDias)})` : undefined,
    q.inativoDias ? sql`not exists (select 1 from tentativas t where t.usuario_id = "usuarios"."id" and t.respondida_em >= ${desde(q.inativoDias)})` : undefined,
    q.incluirExcluidos ? undefined : isNull(usuarios.excluidoEm),
    per ? gte(usuarios.criadoEm, per.inicio) : undefined,
    per ? lt(usuarios.criadoEm, per.fim) : undefined,
  );
}

const selUsuarios = (db: Db) =>
  db.select({ u: usuarios, ultima: subUltimaAtividade, pago: subPago }).from(usuarios);

function mapResumo(u: Usuario, ultima: Date | string | null, pago: boolean): UsuarioSuperResumo {
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
    db.select().from(sessoes).where(and(eq(sessoes.usuarioId, id), sql`${sessoes.expiraEm} > ${agora}`)).orderBy(desc(sessoes.ultimoUsoEm)),
    db.select().from(pushInscricoes).where(eq(pushInscricoes.usuarioId, id)).orderBy(desc(pushInscricoes.criadoEm)),
    cargoDoUsuario(db, u),
  ]);
  const aprovadores = new Map<string, string>();
  const idsAprov = [...new Set(ped.map((p) => p.aprovadoPor).filter((x): x is string => !!x))];
  if (idsAprov.length) {
    for (const a of await db.select({ id: usuarios.id, nome: usuarios.nome }).from(usuarios).where(inArray(usuarios.id, idsAprov))) aprovadores.set(a.id, a.nome);
  }
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
      const { usuario: _u, ...resto } = mapPagamento(p, u, p.aprovadoPor ? { id: p.aprovadoPor, nome: aprovadores.get(p.aprovadoPor) ?? '—' } : null, agora);
      return resto;
    }),
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
    auditoria: auds.map((x) => ({
      id: x.a.id,
      admin: x.a.adminId ? { id: x.a.adminId, nome: x.nome ?? '—' } : null,
      acao: x.a.acao,
      alvo: x.a.alvo,
      motivo: x.a.motivo,
      ip: x.a.ip,
      antes: x.a.antes ?? null,
      depois: x.a.depois ?? null,
      detalhes: x.a.detalhes ?? null,
      criadoEm: iso(x.a.criadoEm),
    })),
  };
}

/** Link de redefinição (a mesma tabela da recuperação de senha). */
async function criarLinkSenha(deps: Deps, usuarioId: string, agora: Date, validadeMs: number): Promise<{ link: string; expiraEm: Date }> {
  const token = gerarToken();
  const expiraEm = new Date(agora.getTime() + validadeMs);
  await deps.db.insert(redefinicoesSenha).values({ usuarioId, tokenHash: hashSimples(token), expiraEm, criadoEm: agora });
  return { link: `${deps.config.appUrl}/recuperar/${token}`, expiraEm };
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
    const lista = await selUsuarios(ctx.deps.db).where(ondeUsuarios(ctx.query, ctx.agora)).orderBy(desc(usuarios.criadoEm)).limit(20_000);
    await auditarSuper(ctx, 'exportar.csv', 'usuarios', { detalhes: { linhas: lista.length } });
    const conteudo = gerarCsv(
      ['id', 'nome', 'email', 'cpf', 'celular', 'papel', 'acesso', 'pago', 'bloqueado', '2fa', 'marketing', 'xp', 'ofensiva', 'ultima_atividade', 'criado_em', 'excluido_em'],
      lista.map((x) => {
        const u = mapResumo(x.u, x.ultima, x.pago);
        return [u.id, u.nome, u.email, u.cpfOculto, u.celularOculto, NOMES_PAPEL[u.papel], u.acesso ? 'sim' : 'não', u.pago ? 'sim' : 'não', u.bloqueado ? 'sim' : 'não', u.doisFatores ? 'sim' : 'não', u.marketing ? 'sim' : 'não', u.xpTotal, u.ofensiva, u.ultimaAtividadeEm, u.criadoEm, u.excluidoEm];
      }),
    );
    return { nomeArquivo: nomeArquivoCsv('usuarios', ctx.agora), conteudo };
  });

  r.rota('superUsuarioObter', async ({ params, deps, agora }) => ficha(deps.db, params.id, agora));

  r.rota('superUsuarioEditar', async (ctx) => {
    const { deps, params, corpo, agora } = ctx;
    const antes = await usuarioPorId(deps.db, params.id);
    if (antes.excluidoEm) throw falha('conflito', 'Esta conta foi excluída.');
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
    await auditarSuper(ctx, 'usuario.editar', `usuario:${antes.id}`, { motivo: corpo.motivo, antes: dadosAuditaveis(antes), depois: dadosAuditaveis(depois) });
    return ficha(deps.db, antes.id, agora);
  });

  r.rota('superUsuarioForcarSenha', async (ctx) => {
    const { deps, params, corpo, agora } = ctx;
    const u = await usuarioPorId(deps.db, params.id);
    if (u.excluidoEm) throw falha('conflito', 'Esta conta foi excluída.');
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
    await garantirOutroSuperadmin(deps.db, u);
    await deps.db.update(usuarios).set({ bloqueadoEm: agora, bloqueioMotivo: corpo.motivo }).where(eq(usuarios.id, u.id));
    const revogadas = await encerrarSessoesDoUsuario(deps.db, u.id);
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
    if (corpo.papel !== 'superadmin') await garantirOutroSuperadmin(deps.db, u);
    await deps.db.update(usuarios).set({ papel: corpo.papel }).where(eq(usuarios.id, u.id));
    // As sessões abertas caem: o novo papel vale com as regras dele (2FA e validade curta).
    const revogadas = await encerrarSessoesDoUsuario(deps.db, u.id);
    await auditarSuper(ctx, 'usuario.papel', `usuario:${u.id}`, { motivo: corpo.motivo, antes: { papel: u.papel }, depois: { papel: corpo.papel }, detalhes: { revogadas } });
    return { ok: true as const };
  });

  r.rota('superUsuarioExportar', async (ctx) => {
    const u = await usuarioPorId(ctx.deps.db, ctx.params.id);
    await auditarSuper(ctx, 'usuario.exportar', `usuario:${u.id}`);
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
    await garantirOutroSuperadmin(deps.db, u);
    await deps.db.transaction((tx) => anonimizarUsuario(tx, u.id, agora));
    // Sem dados pessoais no "antes": só o que identifica o registro.
    await auditarSuper(ctx, 'usuario.anonimizar', `usuario:${u.id}`, { motivo: corpo.motivo, antes: { papel: u.papel, acesso: u.acesso }, depois: { excluido: true } });
    return { ok: true as const };
  });

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
    const { link, expiraEm } = await criarLinkSenha(deps, novo!.id, agora, VALIDADE_CONVITE_MS);
    deps.enviarEmail(
      emailConvite({ nome: corpo.nome, email: corpo.email, papel: NOMES_PAPEL[corpo.papel], link, entrar: `${deps.config.appUrl}/entrar`, validadeHoras: VALIDADE_CONVITE_MS / 3_600_000 }),
    );
    await auditarSuper(ctx, 'equipe.convidar', `usuario:${novo!.id}`, { motivo: corpo.motivo, depois: { email: corpo.email, papel: corpo.papel } });
    return { id: novo!.id, email: corpo.email, expiraEm: iso(expiraEm) };
  });
}
