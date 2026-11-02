/**
 * D32: e-mails do teste grátis, de hora em hora no horário comercial de São Paulo: um na véspera
 * do fim e outro depois do fim, com o link para gerar o Pix no site. Quem pagou não recebe. Cada
 * aviso sai uma vez; se o envio falhar, fica para a próxima rodada.
 */
import { and, eq, gt, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { emailTeste, JANELA_AVISO_FIM_TESTE_MS } from '@fuse/shared';
import type { EnviadorEmail } from './comunicacoes.js';
import type { Db, Log } from '../util.js';

const { usuarios } = schema;
const VESPERA_MS = 24 * 3600_000;
/** Limite por rodada: o restante sai na hora seguinte. */
const LOTE = 200;

export interface ResultadoAvisosTeste {
  ok: boolean;
  vespera: number;
  fim: number;
  falhas: number;
}

export async function avisarTeste(
  db: Db,
  d: { email: EnviadorEmail | null; appUrl: string; log?: Log },
  agora: Date,
): Promise<ResultadoAvisosTeste | { desligado: string }> {
  if (!d.email) return { desligado: 'SMTP não configurado' };
  const vesperaAte = new Date(agora.getTime() + VESPERA_MS);
  const fimDesde = new Date(agora.getTime() - JANELA_AVISO_FIM_TESTE_MS);
  const linhas = await db
    .select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email, testeAte: usuarios.testeAte })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.papel, 'aluno'),
        eq(usuarios.acesso, false),
        isNull(usuarios.excluidoEm),
        isNull(usuarios.bloqueadoEm),
        isNotNull(usuarios.testeAte),
        or(
          and(gt(usuarios.testeAte, agora), lte(usuarios.testeAte, vesperaAte), isNull(usuarios.testeAvisoVesperaEm)),
          and(lte(usuarios.testeAte, agora), gt(usuarios.testeAte, fimDesde), isNull(usuarios.testeAvisoFimEm)),
        ),
      ),
    )
    .limit(LOTE);

  const r: ResultadoAvisosTeste = { ok: true, vespera: 0, fim: 0, falhas: 0 };
  for (const u of linhas) {
    const momento = u.testeAte! > agora ? 'vespera' : 'fim';
    try {
      await d.email.enviar({ para: u.email, ...emailTeste({ nome: u.nome, momento, appUrl: d.appUrl }) });
    } catch (e) {
      d.log?.warn({ usuarioId: u.id, erro: (e as Error).message }, 'falha ao enviar o aviso do teste');
      r.falhas++;
      r.ok = false;
      continue;
    }
    await db
      .update(usuarios)
      .set(momento === 'vespera' ? { testeAvisoVesperaEm: agora } : { testeAvisoFimEm: agora })
      .where(eq(usuarios.id, u.id));
    r[momento]++;
  }
  return r;
}
