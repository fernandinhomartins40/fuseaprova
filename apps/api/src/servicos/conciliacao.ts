/**
 * Conciliação com o Asaas (D13): consulta o status real da cobrança e corrige o pedido.
 * Só os pedidos do Fuse Aprova (os que têm `asaas_payment_id` em `pedidos`; a conta é
 * compartilhada, D14). Pedidos manuais não são conciliados (nunca contam como divergência).
 */
import { and, eq } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { statusLocalDoAsaas, type ConciliacaoItem } from '@fuse/shared/api';
import type { Deps } from '../contexto.js';
import { ErroAsaas } from '../integracoes/asaas.js';
import { liberarConcurso } from './concursos.js';
import { concursoDoUsuario } from './usuario.js';
import { confirmarPagamento, estornarPagamento, valorMenorQueOPedido, vencerPagamento, type Pedido } from './pagamento.js';

const { pedidos, usuarios, usuariosConcursos } = schema;

/**
 * Pedido pago cujo concurso não está liberado para o aluno (ex.: a liberação falhou). Só vale para
 * conta de aluno ativa, com reembolso não pedido; devolve o concurso a liberar.
 */
async function pagoSemLiberacao(deps: Deps, p: Pedido): Promise<{ concursoId: string } | null> {
  if (p.reembolsoSolicitadoEm) return null;
  const [u] = await deps.db.select().from(usuarios).where(eq(usuarios.id, p.usuarioId));
  if (!u || u.papel !== 'aluno' || u.excluidoEm) return null;
  const concursoId = p.concursoId ?? (await concursoDoUsuario(deps.db, u))?.id ?? null;
  if (!concursoId) return null;
  const [l] = await deps.db
    .select({ acesso: usuariosConcursos.acesso })
    .from(usuariosConcursos)
    .where(and(eq(usuariosConcursos.usuarioId, u.id), eq(usuariosConcursos.concursoId, concursoId)));
  return l?.acesso ? null : { concursoId };
}

export async function conciliarPedido(
  deps: Deps,
  p: Pedido,
  nomeUsuario: string,
  agora: Date,
  opcoes: { corrigir: boolean },
): Promise<ConciliacaoItem> {
  const base = {
    pedidoId: p.id,
    asaasPaymentId: p.asaasPaymentId,
    usuario: nomeUsuario,
    statusLocalAntes: p.status,
    statusLocalDepois: p.status,
    statusAsaas: null as string | null,
    divergente: false,
    corrigido: false,
  };
  if (p.metodo === 'manual') return { ...base, mensagem: 'Pagamento manual: não é conciliado com o Asaas.' };
  if (!p.asaasPaymentId) return { ...base, mensagem: 'Pedido sem cobrança no Asaas.' };

  let statusAsaas: string;
  let removida = false;
  let liquido: number | null = null;
  let valorPago: number | null = null;
  try {
    const c = await deps.asaas.obterCobranca(p.asaasPaymentId);
    statusAsaas = c.status;
    removida = c.deleted === true;
    if (typeof c.netValue === 'number') liquido = Math.round(c.netValue * 100);
    if (typeof c.value === 'number') valorPago = Math.round(c.value * 100);
  } catch (e) {
    if (e instanceof ErroAsaas && e.status === 404) {
      statusAsaas = 'REMOVIDA';
      removida = true;
    } else throw e;
  }
  const esperado = statusLocalDoAsaas(statusAsaas, removida);
  const item = { ...base, statusAsaas };
  const marcar = async () => {
    await deps.db
      .update(pedidos)
      .set({ conciliadoEm: agora, ...(liquido !== null && p.valorLiquidoCentavos === null ? { valorLiquidoCentavos: liquido } : {}) })
      .where(eq(pedidos.id, p.id));
  };

  if (esperado === null) {
    await marcar();
    return { ...item, mensagem: `O status ${statusAsaas} do Asaas não muda o pedido.` };
  }
  if (esperado === 'pago' && p.status === 'pago') {
    // RQ4 (S-07): pago aqui e no Asaas — o concurso do pedido está mesmo liberado para o aluno?
    const semLiberacao = await pagoSemLiberacao(deps, p);
    if (semLiberacao) {
      if (opcoes.corrigir) {
        await deps.db.transaction((tx) => liberarConcurso(tx, p.usuarioId, semLiberacao.concursoId, agora));
        await marcar();
        return { ...item, divergente: true, corrigido: true, mensagem: 'Pago sem liberação: o pedido está pago aqui e no Asaas, e o concurso dele foi liberado agora.' };
      }
      await marcar();
      return { ...item, divergente: true, mensagem: 'Pago sem liberação: o pedido está pago aqui e no Asaas, mas o concurso dele não está liberado para o aluno. Corrija para liberar.' };
    }
  }
  if (esperado === p.status || (esperado === 'pendente' && p.status === 'vencido')) {
    await marcar();
    return { ...item, mensagem: esperado === p.status ? 'Tudo certo: o pedido bate com o Asaas.' : 'O Pix expirou aqui e ainda está aberto no Asaas (sem efeito).' };
  }

  // Divergência. Correções seguras automáticas; o resto fica para análise humana.
  let acao: (() => Promise<unknown>) | null = null;
  let mensagem: string;
  if (esperado === 'pago' && (p.status === 'pendente' || p.status === 'vencido') && valorMenorQueOPedido(valorPago, p.valorCentavos)) {
    mensagem = 'Divergência: pago no Asaas com valor menor que o do pedido. Confira antes de liberar o acesso.';
  } else if (esperado === 'pago' && (p.status === 'pendente' || p.status === 'vencido')) {
    acao = () => confirmarPagamento(deps, p.asaasPaymentId!, agora, { valorLiquidoCentavos: liquido, valorPagoCentavos: valorPago });
    mensagem = 'Pago no Asaas: pedido marcado como pago e acesso liberado.';
  } else if (esperado === 'estornado' && p.status === 'pago') {
    acao = () => estornarPagamento(deps, p.asaasPaymentId!, agora);
    mensagem = 'Estornado no Asaas: pedido estornado e acesso revogado.';
  } else if (esperado === 'vencido' && p.status === 'pendente') {
    acao = () => vencerPagamento(deps.db, p.asaasPaymentId!);
    mensagem = 'Vencido ou removido no Asaas: pedido marcado como vencido.';
  } else {
    mensagem = `Divergência: aqui está "${p.status}" e no Asaas "${statusAsaas}". Confira antes de mudar o acesso.`;
  }
  if (!acao || !opcoes.corrigir) {
    await marcar();
    return { ...item, divergente: true, mensagem: acao ? `${mensagem.split(':')[0]}: corrija para aplicar.` : mensagem };
  }
  await acao();
  await marcar();
  const [depois] = await deps.db.select({ status: pedidos.status }).from(pedidos).where(eq(pedidos.id, p.id));
  return { ...item, divergente: true, corrigido: true, statusLocalDepois: depois?.status ?? p.status, mensagem };
}
