/**
 * /auth/* (PRD 5.2, 5.4, 5.5, 8.2). D24: três logins (aluno, conteúdo e super), uma só
 * recuperação de senha; a redefinição devolve a área da conta para a web ir ao login certo.
 */
import { createHash } from 'node:crypto';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { schema } from '@fuse/db';
import { AREA_DO_PAPEL, type AreaConta, type Papel } from '@fuse/shared';
import {
  MENSAGEM_RECUPERAR,
  MENSAGENS_CADASTRO,
  VALIDADE_LINK_SENHA_MS,
  type ProximoPasso,
  type SessaoResposta,
} from '@fuse/shared/api';
import type { Deps, Usuario } from '../contexto.js';
import { definirCookieSessao, limparCookieSessao } from '../http/cookies.js';
import { ehViolacaoUnica, falha } from '../http/erros.js';
import type { Contexto, Registrador } from '../http/registrar.js';
import { emailRecuperacao } from '../integracoes/email.js';
import { conferirSenha, gerarHashSenha } from '../servicos/senhas.js';
import { abrirSessao, encerrarSessao, encerrarSessoesDoUsuario, gerarToken } from '../servicos/sessoes.js';
import { concursoAtivo } from '../servicos/usuario.js';

const { usuarios, redefinicoesSenha, usuariosConcursos } = schema;

export function proximoPasso(u: Pick<Usuario, 'papel' | 'acesso' | 'onboardingConcluidoEm'>): ProximoPasso {
  // D13: o superadmin sempre passa pelo 2FA (configurar ou digitar o código) ao entrar.
  if (u.papel === 'superadmin') return 'dois_fatores';
  if (u.papel === 'admin') return 'conteudo';
  if (!u.acesso) return 'pagamento';
  if (!u.onboardingConcluidoEm) return 'onboarding';
  return 'trilha';
}

export function respostaSessao(u: Usuario): SessaoResposta {
  return {
    usuario: { id: u.id, nome: u.nome, email: u.email, papel: u.papel, acesso: u.acesso },
    proximo: proximoPasso(u),
    area: AREA_DO_PAPEL[u.papel],
  };
}

/** D24: cada portal aceita um papel só. */
const PAPEL_DO_PORTAL = { aluno: 'aluno', conteudo: 'admin', super: 'superadmin' } as const satisfies Record<AreaConta, Papel>;

/**
 * D24 + V-04: além do balde por IP dos três logins (definido no registro), dois limites por conta:
 * 10 tentativas por e-mail **e IP** (quem tenta de um lugar só) e 50 por e-mail somando todos os IPs
 * (força bruta distribuída). Com só "10 por e-mail", qualquer um que soubesse o e-mail do dono
 * travava o login dele com a senha certa.
 */
const LIMITE_LOGIN_EMAIL_IP = { max: 10, janelaMs: 15 * 60_000 };
const LIMITE_LOGIN_EMAIL = { max: 50, janelaMs: 15 * 60_000 };

export async function iniciarSessao(
  deps: Deps,
  req: FastifyRequest,
  reply: Parameters<typeof definirCookieSessao>[0],
  usuarioId: string,
  agora: Date,
  opcoes: { superadmin?: boolean } = {},
): Promise<void> {
  const { token, expiraEm } = await abrirSessao(
    deps.db,
    deps.config.segredoSessao,
    usuarioId,
    { userAgent: req.headers['user-agent'], ip: req.ip, superadmin: opcoes.superadmin },
    agora,
  );
  definirCookieSessao(reply, deps.config, token, expiraEm);
}

const hashSimples = (t: string) => createHash('sha256').update(t).digest('hex');

export function rotasAuth(r: Registrador): void {
  r.rota('authCadastro', async ({ corpo, deps, req, reply, agora }) => {
    const { db } = deps;
    const existente = await db
      .select({ email: usuarios.email, cpf: usuarios.cpf })
      .from(usuarios)
      .where(or(eq(usuarios.email, corpo.email), eq(usuarios.cpf, corpo.cpf)))
      .limit(1);
    const contaExistente = () => {
      const msg = MENSAGENS_CADASTRO.contaExistente;
      return falha('conta_existente', msg, { email: msg, cpf: msg });
    };
    if (existente.length) throw contaExistente();
    const concurso = await concursoAtivo(db);
    let novo: Usuario;
    try {
      [novo] = (await db
        .insert(usuarios)
        .values({
          nome: corpo.nome,
          email: corpo.email,
          cpf: corpo.cpf,
          celular: corpo.celular,
          senhaHash: await gerarHashSenha(corpo.senha),
          concursoId: concurso?.id ?? null,
          aceiteTermosEm: agora,
          versaoTermos: corpo.versaoTermos,
          vidasAtualizadoEm: agora,
          criadoEm: agora,
        })
        .returning()) as [Usuario];
    } catch (e) {
      if (ehViolacaoUnica(e)) throw contaExistente();
      throw e;
    }
    if (concurso) {
      await db
        .insert(usuariosConcursos)
        .values({ usuarioId: novo.id, concursoId: concurso.id, criadoEm: agora })
        .onConflictDoNothing();
    }
    await iniciarSessao(deps, req, reply, novo.id, agora);
    reply.status(201);
    return respostaSessao(novo);
  });

  /**
   * D24: um login por portal. A senha é conferida SEMPRE (mesmo tempo com ou sem conta), e uma
   * conta de outro papel recebe exatamente a resposta de credenciais inválidas: o portal errado
   * não revela que o e-mail existe nem o papel dele, e não abre sessão.
   */
  const entrar = (area: AreaConta) => async (ctx: Contexto<'authLogin'>) => {
    const { corpo, deps, req, reply, agora } = ctx;
    await ctx.limitar(`login:email-ip:${corpo.email}:${req.ip}`, LIMITE_LOGIN_EMAIL_IP.max, LIMITE_LOGIN_EMAIL_IP.janelaMs);
    await ctx.limitar(`login:email:${corpo.email}`, LIMITE_LOGIN_EMAIL.max, LIMITE_LOGIN_EMAIL.janelaMs);
    const [u] = await deps.db
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.email, corpo.email), isNull(usuarios.excluidoEm)))
      .limit(1);
    const ok = await conferirSenha(u?.senhaHash, corpo.senha);
    if (!u || !ok || u.papel !== PAPEL_DO_PORTAL[area]) throw falha('credenciais_invalidas');
    if (u.bloqueadoEm) throw falha('conta_bloqueada');
    await iniciarSessao(deps, req, reply, u.id, agora, { superadmin: u.papel === 'superadmin' });
    return respostaSessao(u);
  };
  // Os três têm o mesmo contrato (LoginEntrada → SessaoResposta).
  type CtxLogin = Contexto<'authLogin'>;
  r.rota('authLogin', entrar('aluno'));
  r.rota('authLoginConteudo', (ctx) => entrar('conteudo')(ctx as unknown as CtxLogin));
  r.rota('authLoginSuper', (ctx) => entrar('super')(ctx as unknown as CtxLogin));

  r.rota('authSair', async ({ usuario, deps, reply }) => {
    await encerrarSessao(deps.db, usuario.sessaoId);
    limparCookieSessao(reply, deps.config);
    return { ok: true as const };
  });

  r.rota('authRecuperar', async ({ corpo, deps, agora }) => {
    const [u] = await deps.db
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.email, corpo.email), isNull(usuarios.excluidoEm)))
      .limit(1);
    if (u) {
      const token = gerarToken();
      await deps.db.insert(redefinicoesSenha).values({
        usuarioId: u.id,
        tokenHash: hashSimples(token),
        expiraEm: new Date(agora.getTime() + VALIDADE_LINK_SENHA_MS),
        criadoEm: agora,
      });
      deps.enviarEmail(
        emailRecuperacao({ nome: u.nome, email: u.email, link: `${deps.config.appUrl}/recuperar/${token}` }),
      );
    }
    // Sempre a mesma resposta: não revela se o e-mail existe.
    return { ok: true as const, mensagem: MENSAGEM_RECUPERAR };
  });

  r.rota('authRedefinir', async ({ corpo, deps, req, reply, agora }) => {
    const { db } = deps;
    const usuario = await db.transaction(async (tx) => {
      const [red] = await tx
        .select()
        .from(redefinicoesSenha)
        .where(
          and(
            eq(redefinicoesSenha.tokenHash, hashSimples(corpo.token)),
            isNull(redefinicoesSenha.usadoEm),
            gt(redefinicoesSenha.expiraEm, agora),
          ),
        )
        .for('update');
      if (!red) throw falha('token_invalido');
      const [u] = await tx
        .update(usuarios)
        .set({ senhaHash: await gerarHashSenha(corpo.senha) })
        .where(and(eq(usuarios.id, red.usuarioId), isNull(usuarios.excluidoEm), isNull(usuarios.bloqueadoEm)))
        .returning();
      if (!u) throw falha('token_invalido');
      await tx.update(redefinicoesSenha).set({ usadoEm: agora }).where(eq(redefinicoesSenha.usuarioId, u.id));
      // Redefinir encerra todas as outras sessões (PRD 5.5).
      await encerrarSessoesDoUsuario(tx, u.id);
      return u;
    });
    await iniciarSessao(deps, req, reply, usuario.id, agora, { superadmin: usuario.papel === 'superadmin' });
    return respostaSessao(usuario);
  });
}
