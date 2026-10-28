/**
 * /super/2fa: configurar, ativar e confirmar a verificação em duas etapas (D13).
 */
import type { Registrador } from '../../http/registrar.js';
import {
  ativarDoisFatores,
  gerarCodigosRecuperacao,
  iniciarDoisFatores,
  reconfirmar,
  statusDoisFatores,
  verificarDoisFatores,
} from '../../servicos/doisfatores.js';
import { auditarSuper } from './comum.js';

export function rotasSuperSeguranca(r: Registrador): void {
  r.rota('super2faStatus', async ({ usuario, deps }) => statusDoisFatores(deps.db, usuario));

  r.rota('super2faIniciar', async ({ usuario, deps }) => iniciarDoisFatores(deps, usuario));

  r.rota('super2faAtivar', async (ctx) => {
    const codigos = await ativarDoisFatores(ctx.deps, ctx.usuario, ctx.corpo.codigo, ctx.agora);
    await auditarSuper(ctx, '2fa.ativar', `usuario:${ctx.usuario.id}`);
    return { codigos };
  });

  r.rota('super2faVerificar', async (ctx) => {
    // S-16: código errado conta num limite persistente por conta e fica na auditoria (2fa.falha).
    const como = await verificarDoisFatores(ctx.deps, ctx.usuario, ctx.corpo, ctx.agora, ctx.req.ip);
    if (como === 'recuperacao') {
      await auditarSuper(ctx, '2fa.recuperacao_usada', `usuario:${ctx.usuario.id}`);
    }
    return statusDoisFatores(ctx.deps.db, { ...ctx.usuario, sessaoDoisFatoresEm: ctx.agora });
  });

  r.rota('super2faCodigos', async (ctx) => {
    await reconfirmar(ctx.deps, ctx.usuario, ctx.corpo.confirmacao, ctx.agora);
    const codigos = await gerarCodigosRecuperacao(ctx.deps.db, ctx.usuario.id, ctx.agora);
    await auditarSuper(ctx, '2fa.codigos', `usuario:${ctx.usuario.id}`);
    return { codigos };
  });
}
