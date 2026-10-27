/**
 * Aprovação manual de pagamento (D13): o aluno pagou por fora (transferência, dinheiro, Pix
 * direto na conta). Registra um pagamento RECEBIDO de R$ 397 (PRICE_CENTS) — não é acesso
 * gratuito — e libera o acesso pelo mesmo caminho do webhook (pedido pago + e-mail).
 *
 * Idempotente: se o aluno já tem pedido pago, nada é criado. Um webhook que chegue depois para
 * a cobrança Pix que foi aproveitada encontra o pedido pago e não muda nada.
 */
import { and, desc, eq, ne } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { centavosParaReais, diaSP, diferencaDias } from '@fuse/shared';
import type { FormaPagamentoManual } from '@fuse/shared';
import type { AprovarManualResposta } from '@fuse/shared/api';
import type { Deps, Usuario } from '../contexto.js';
import { existe, falha } from '../http/erros.js';
import { ErroAsaas } from '../integracoes/asaas.js';
import { liberarConcurso, revogarConcurso } from './concursos.js';
import { enviarEmailConfirmacao, type Pedido } from './pagamento.js';
import { concursoDoUsuario } from './usuario.js';
import { encerrarSessoesDoUsuario } from './sessoes.js';

const { pedidos, usuarios } = schema;

export interface DadosAprovacao {
  recebidoEm: string;
  forma: FormaPagamentoManual;
  observacao: string;
  referencia?: string | undefined;
  comprovante?: string | undefined;
  acaoAsaas: 'receber_em_dinheiro' | 'cancelar' | 'nenhuma';
}

export interface ResultadoAprovacao {
  resposta: AprovarManualResposta;
  antes: Pedido | null;
  depois: Pedido;
}

export async function aprovarPagamentoManual(
  deps: Deps,
  aprovadorId: string,
  usuarioId: string,
  d: DadosAprovacao,
  agora: Date,
): Promise<ResultadoAprovacao> {
  const hoje = diaSP(agora);
  if (diferencaDias(hoje, d.recebidoEm) < 0) {
    throw falha('validacao', 'A data do recebimento não pode ser no futuro.', { recebidoEm: 'A data do recebimento não pode ser no futuro.' });
  }
  if (diferencaDias(hoje, d.recebidoEm) > 365) {
    throw falha('validacao', 'A data do recebimento é de mais de um ano atrás.', { recebidoEm: 'Confira a data do recebimento.' });
  }

  const r = await deps.db.transaction(async (tx) => {
    // A trava na linha do aluno serializa duas aprovações ao mesmo tempo.
    const [u] = await tx.select().from(usuarios).where(eq(usuarios.id, usuarioId)).for('update');
    const aluno = existe(u, 'Usuário não encontrado.');
    if (aluno.excluidoEm) throw falha('conflito', 'Esta conta foi excluída.');
    // D21: a aprovação vale para o concurso ativo do aluno (um pedido por concurso).
    const concursoId = (await concursoDoUsuario(tx, aluno))?.id ?? null;
    const [jaPago] = await tx
      .select()
      .from(pedidos)
      .where(
        and(
          eq(pedidos.usuarioId, aluno.id),
          eq(pedidos.status, 'pago'),
          concursoId ? eq(pedidos.concursoId, concursoId) : undefined,
        ),
      )
      .orderBy(desc(pedidos.pagoEm))
      .limit(1);
    if (jaPago) {
      if (concursoId) await liberarConcurso(tx, aluno.id, concursoId, agora);
      else if (!aluno.acesso) await tx.update(usuarios).set({ acesso: true }).where(eq(usuarios.id, aluno.id));
      return { jaAprovado: true as const, aluno, antes: jaPago, depois: jaPago, cobranca: null };
    }
    const [pendente] = await tx
      .select()
      .from(pedidos)
      .where(
        and(
          eq(pedidos.usuarioId, aluno.id),
          eq(pedidos.status, 'pendente'),
          concursoId ? eq(pedidos.concursoId, concursoId) : undefined,
        ),
      )
      .orderBy(desc(pedidos.criadoEm))
      .limit(1);
    const dadosManuais = {
      concursoId,
      status: 'pago' as const,
      metodo: 'manual' as const,
      valorCentavos: deps.config.precoCentavos,
      valorLiquidoCentavos: deps.config.precoCentavos,
      pagoEm: agora,
      manualForma: d.forma,
      manualRecebidoEm: d.recebidoEm,
      manualObservacao: d.observacao,
      manualReferencia: d.referencia ?? null,
      manualComprovante: d.comprovante ?? null,
      aprovadoPor: aprovadorId,
    };
    let depois: Pedido;
    if (pendente) {
      [depois] = (await tx.update(pedidos).set(dadosManuais).where(eq(pedidos.id, pendente.id)).returning()) as [Pedido];
    } else {
      [depois] = (await tx
        .insert(pedidos)
        .values({ usuarioId: aluno.id, asaasCustomerId: aluno.asaasCustomerId, criadoEm: agora, ...dadosManuais })
        .returning()) as [Pedido];
    }
    if (concursoId) await liberarConcurso(tx, aluno.id, concursoId, agora);
    else await tx.update(usuarios).set({ acesso: true }).where(eq(usuarios.id, aluno.id));
    const [atualizado] = await tx.select().from(usuarios).where(eq(usuarios.id, aluno.id));
    return { jaAprovado: false as const, aluno: atualizado!, antes: pendente ?? null, depois, cobranca: pendente?.asaasPaymentId ?? null };
  });

  if (r.jaAprovado) {
    return {
      resposta: { pedidoId: r.depois.id, jaAprovado: true, asaas: { acao: 'nenhuma', ok: true, mensagem: 'O aluno já tinha pagamento aprovado: nada foi duplicado.' } },
      antes: r.antes,
      depois: r.depois,
    };
  }
  enviarEmailConfirmacao(deps, r.depois, r.aluno);
  const asaas = await tratarCobrancaPendente(deps, r.cobranca, d, agora);
  return { resposta: { pedidoId: r.depois.id, jaAprovado: false, asaas }, antes: r.antes, depois: r.depois };
}

/** Para o Asaas não cobrar nem expirar a cobrança em paralelo. Falha aqui não desfaz a aprovação. */
async function tratarCobrancaPendente(
  deps: Deps,
  paymentId: string | null,
  d: DadosAprovacao,
  agora: Date,
): Promise<AprovarManualResposta['asaas']> {
  if (!paymentId) return { acao: 'nenhuma', ok: true, mensagem: 'Não havia cobrança Pix pendente no Asaas.' };
  if (d.acaoAsaas === 'nenhuma') {
    return { acao: 'nenhuma', ok: true, mensagem: `A cobrança ${paymentId} ficou como estava no Asaas.` };
  }
  try {
    if (d.acaoAsaas === 'receber_em_dinheiro') {
      await deps.asaas.receberEmDinheiro(paymentId, {
        paymentDate: d.recebidoEm,
        value: centavosParaReais(deps.config.precoCentavos),
        notifyCustomer: false,
      });
      return { acao: 'receber_em_dinheiro', ok: true, mensagem: `Recebimento confirmado no Asaas (cobrança ${paymentId}).` };
    }
    await deps.asaas.removerCobranca(paymentId);
    await deps.db.update(pedidos).set({ canceladoEm: agora }).where(eq(pedidos.asaasPaymentId, paymentId));
    return { acao: 'cancelar', ok: true, mensagem: `Cobrança ${paymentId} cancelada no Asaas.` };
  } catch (e) {
    const msg = e instanceof ErroAsaas ? e.message : 'falha de rede';
    deps.log.warn({ paymentId, erro: msg }, 'aprovação manual: Asaas não aceitou a ação');
    return {
      acao: d.acaoAsaas,
      ok: false,
      mensagem: `O pagamento foi aprovado, mas o Asaas não aceitou a ação na cobrança ${paymentId}. Cancele-a no detalhe do pagamento.`,
    };
  }
}

/** Desfaz a aprovação manual (estorno manual): pedido estornado, acesso revogado, sessões derrubadas. */
export async function desfazerAprovacaoManual(deps: Deps, pedidoId: string, agora: Date): Promise<{ antes: Pedido; depois: Pedido; usuario: Usuario }> {
  return deps.db.transaction(async (tx) => {
    const [p] = await tx.select().from(pedidos).where(eq(pedidos.id, pedidoId)).for('update');
    const pedido = existe(p, 'Pagamento não encontrado.');
    if (pedido.metodo !== 'manual' || pedido.status !== 'pago') {
      throw falha('conflito', 'Só é possível desfazer uma aprovação manual que está paga.');
    }
    const [depois] = await tx.update(pedidos).set({ status: 'estornado', estornadoEm: agora }).where(eq(pedidos.id, pedido.id)).returning();
    const concursoId = pedido.concursoId;
    const [outroPago] = await tx
      .select({ id: pedidos.id })
      .from(pedidos)
      .where(
        and(
          eq(pedidos.usuarioId, pedido.usuarioId),
          eq(pedidos.status, 'pago'),
          ne(pedidos.id, pedido.id),
          concursoId ? eq(pedidos.concursoId, concursoId) : undefined,
        ),
      )
      .limit(1);
    let temAcesso = true;
    if (!outroPago) {
      temAcesso = concursoId
        ? await revogarConcurso(tx, pedido.usuarioId, concursoId)
        : (await tx.update(usuarios).set({ acesso: false }).where(eq(usuarios.id, pedido.usuarioId)), false);
    }
    if (!temAcesso) await encerrarSessoesDoUsuario(tx, pedido.usuarioId);
    const [u] = await tx.select().from(usuarios).where(eq(usuarios.id, pedido.usuarioId));
    return { antes: pedido, depois: depois!, usuario: u! };
  });
}
