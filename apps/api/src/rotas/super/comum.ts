/**
 * Peças comuns das rotas /super (D13): auditoria com IP e motivo, mapeamento de pedidos,
 * período padrão e CSV.
 */
import type { FastifyRequest } from 'fastify';
import { and, count, eq, isNull, ne } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { dentroDoArrependimento, diaSP, diferencaDias, inicioDoDiaSP, ocultarCpf, somarDias } from '@fuse/shared';
import type { AcaoAuditoria, PagamentoSuper } from '@fuse/shared/api';
import type { Deps, Usuario } from '../../contexto.js';
import { falha } from '../../http/erros.js';
import { iso, isoOuNull, type Db } from '../../util.js';
import { auditar, type ExtraAuditoria } from '../admin/comum.js';

const { usuarios } = schema;
type Pedido = typeof schema.pedidos.$inferSelect;

export interface CtxAuditoria {
  deps: Deps;
  usuario: { id: string };
  req: FastifyRequest;
  agora: Date;
}

/** Auditoria do superadmin: quem fez, o quê, antes, depois, IP e motivo. */
export function auditarSuper(
  ctx: CtxAuditoria,
  acao: AcaoAuditoria,
  alvo: string | null,
  extra: ExtraAuditoria & { detalhes?: Record<string, unknown> | null } = {},
  db: Db = ctx.deps.db,
): Promise<void> {
  const { detalhes, ...resto } = extra;
  return auditar(db, ctx.usuario.id, acao, alvo, detalhes ?? null, ctx.agora, { ip: ctx.req.ip, ...resto });
}

/** Período [de, ate] em dias de São Paulo. Padrão: os últimos 30 dias. Máximo de 2 anos. */
export function periodo(q: { de?: string | undefined; ate?: string | undefined }, agora: Date, diasPadrao = 30) {
  const ate = q.ate ?? diaSP(agora);
  const de = q.de ?? somarDias(ate, -(diasPadrao - 1));
  if (diferencaDias(ate, de) < 0) throw falha('validacao', 'A data inicial é depois da final.', { de: 'A data inicial é depois da final.' });
  if (diferencaDias(ate, de) > 731) throw falha('validacao', 'Escolha um período de até 2 anos.', { de: 'Escolha um período de até 2 anos.' });
  return { de, ate, inicio: inicioDoDiaSP(de), fim: inicioDoDiaSP(somarDias(ate, 1)) };
}

export function celularOculto(c: string | null | undefined): string {
  return c ? `(${c.slice(0, 2)}) *****-${c.slice(-4)}` : '';
}

/** D21/D23: o concurso do pedido, o cupom e se o concurso do pedido está liberado agora. */
export interface ExtrasPagamento {
  concurso: { id: string; nome: string } | null;
  cupomCodigo: string | null;
  /** `usuarios_concursos.acesso` do concurso do pedido (null = sem linha). */
  acessoConcurso: boolean | null;
}

/**
 * Colunas para montar `ExtrasPagamento` num select com `pedidos` e `usuarios` (left joins em
 * concursos, cupons e usuarios_concursos, ver `comExtrasPagamento`).
 */
export const colunasExtrasPagamento = {
  concursoId: schema.concursos.id,
  concursoNome: schema.concursos.nome,
  cupomCodigo: schema.cupons.codigo,
  acessoConcurso: schema.usuariosConcursos.acesso,
};

export function extrasDaLinha(x: { concursoId: string | null; concursoNome: string | null; cupomCodigo: string | null; acessoConcurso: boolean | null }): ExtrasPagamento {
  return {
    concurso: x.concursoId ? { id: x.concursoId, nome: x.concursoNome ?? '' } : null,
    cupomCodigo: x.cupomCodigo,
    acessoConcurso: x.acessoConcurso,
  };
}

export function mapPagamento(
  p: Pedido,
  u: Pick<Usuario, 'id' | 'nome' | 'email' | 'cpf' | 'acesso'>,
  aprovador: { id: string; nome: string } | null,
  agora: Date,
  extras: ExtrasPagamento,
): PagamentoSuper {
  return {
    id: p.id,
    usuario: { id: u.id, nome: u.nome, email: u.email, cpfOculto: ocultarCpf(u.cpf ?? ''), acesso: u.acesso },
    metodo: p.metodo,
    status: p.status,
    valorCentavos: p.valorCentavos,
    valorLiquidoCentavos: p.metodo === 'manual' ? p.valorCentavos : p.valorLiquidoCentavos,
    asaasPaymentId: p.asaasPaymentId,
    asaasCustomerId: p.asaasCustomerId,
    criadoEm: iso(p.criadoEm),
    pagoEm: isoOuNull(p.pagoEm),
    pixExpiraEm: isoOuNull(p.pixExpiraEm),
    canceladoEm: isoOuNull(p.canceladoEm),
    reembolsoSolicitadoEm: isoOuNull(p.reembolsoSolicitadoEm),
    estornadoEm: isoOuNull(p.estornadoEm),
    conciliadoEm: isoOuNull(p.conciliadoEm),
    dentroDoArrependimento: p.status === 'pago' && p.pagoEm !== null && dentroDoArrependimento(p.pagoEm, agora),
    manual:
      p.metodo === 'manual'
        ? {
            forma: p.manualForma ?? 'outro',
            recebidoEm: p.manualRecebidoEm ?? diaSP(p.criadoEm),
            observacao: p.manualObservacao ?? '',
            referencia: p.manualReferencia,
            comprovante: p.manualComprovante,
            aprovadoPor: aprovador,
          }
        : null,
    concurso: extras.concurso,
    // Pedido sem concurso (antigo): vale o acesso geral do aluno.
    concursoLiberado: p.concursoId ? extras.acessoConcurso === true : u.acesso,
    cupomCodigo: extras.cupomCodigo,
    valorOriginalCentavos: p.valorOriginalCentavos,
    descontoCentavos: p.valorOriginalCentavos !== null ? Math.max(0, p.valorOriginalCentavos - p.valorCentavos) : 0,
  };
}

/** Superadmins ativos (não excluídos e não bloqueados), sem contar `exceto`. */
export async function superadminsAtivos(db: Db, exceto?: string): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.papel, 'superadmin'),
        isNull(usuarios.excluidoEm),
        isNull(usuarios.bloqueadoEm),
        exceto ? ne(usuarios.id, exceto) : undefined,
      ),
    );
  return Number(r?.n ?? 0);
}

/**
 * Impede remover (rebaixar, bloquear, excluir) o último superadmin ativo. Chame DENTRO da
 * transação que faz a mudança: as linhas dos superadmins ficam travadas (`for update`) até o fim
 * dela, então dois superadmins não rebaixam um ao outro ao mesmo tempo (S-24, sem TOCTOU).
 */
export async function garantirOutroSuperadmin(tx: Db, alvo: Pick<Usuario, 'id' | 'papel'>): Promise<void> {
  if (alvo.papel !== 'superadmin') return;
  const ativos = await tx
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.papel, 'superadmin'), isNull(usuarios.excluidoEm), isNull(usuarios.bloqueadoEm)))
    .orderBy(usuarios.id)
    .for('update');
  if (ativos.filter((a) => a.id !== alvo.id).length === 0) throw falha('ultimo_superadmin');
}

export function nomeArquivoCsv(prefixo: string, agora: Date): string {
  return `${prefixo}-${diaSP(agora)}.csv`;
}

export const reais = (centavos: number | null | undefined) =>
  centavos === null || centavos === undefined ? '' : (centavos / 100).toFixed(2).replace('.', ',');
