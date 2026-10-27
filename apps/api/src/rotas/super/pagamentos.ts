/**
 * /super/pagamentos e /super/webhooks (D13): lista com busca, detalhe com linha do tempo,
 * conciliação (individual e em lote), reembolso, cancelar Pix, reenviar e-mail, aprovação
 * manual (e desfazer), comprovantes e o histórico de webhooks com reprocessamento.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lt, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { schema } from '@fuse/db';
import { dentroDoArrependimento, NOMES_FORMA_PAGAMENTO_MANUAL, somenteDigitos } from '@fuse/shared';
import {
  gerarCsv,
  type EventoLinhaTempo,
  type WebhookEventoSuper,
} from '@fuse/shared/api';
import type { Deps } from '../../contexto.js';
import type { Registrador } from '../../http/registrar.js';
import { existe, falha } from '../../http/erros.js';
import { ErroAsaas } from '../../integracoes/asaas.js';
import { conciliarPedido } from '../../servicos/conciliacao.js';
import { reconfirmar } from '../../servicos/doisfatores.js';
import { enviarEmailConfirmacao, type Pedido } from '../../servicos/pagamento.js';
import { aprovarPagamentoManual, desfazerAprovacaoManual } from '../../servicos/pagamentoManual.js';
import { reprocessarEvento } from '../../servicos/webhook.js';
import { contar, iso, type Db } from '../../util.js';
import { paginacao } from '../admin/comum.js';
import { auditarSuper, mapPagamento, nomeArquivoCsv, periodo, reais } from './comum.js';

const { pedidos, usuarios, webhookEventos, auditoria } = schema;
const aprovador = alias(usuarios, 'aprovador');

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface FiltrosPagamento {
  q?: string | undefined;
  status?: Pedido['status'] | undefined;
  metodo?: Pedido['metodo'] | undefined;
  de?: string | undefined;
  ate?: string | undefined;
}

function ondePagamentos(q: FiltrosPagamento, agora: Date): SQL | undefined {
  const dig = q.q ? somenteDigitos(q.q) : '';
  const termo = q.q?.trim();
  const p = q.de || q.ate ? periodo(q, agora, 3650) : null;
  return and(
    termo
      ? or(
          ilike(usuarios.nome, `%${termo}%`),
          ilike(usuarios.email, `%${termo}%`),
          ilike(pedidos.asaasPaymentId, `%${termo}%`),
          dig.length >= 3 ? sql`${usuarios.cpf} like ${`%${dig}%`}` : undefined,
          RE_UUID.test(termo) ? eq(pedidos.id, termo) : undefined,
        )
      : undefined,
    q.status ? eq(pedidos.status, q.status) : undefined,
    q.metodo ? eq(pedidos.metodo, q.metodo) : undefined,
    p ? gte(pedidos.criadoEm, p.inicio) : undefined,
    p ? lt(pedidos.criadoEm, p.fim) : undefined,
  );
}

const selPagamentos = (db: Db) =>
  db
    .select({ p: pedidos, u: usuarios, a: { id: aprovador.id, nome: aprovador.nome } })
    .from(pedidos)
    .innerJoin(usuarios, eq(usuarios.id, pedidos.usuarioId))
    .leftJoin(aprovador, eq(aprovador.id, pedidos.aprovadoPor));

type LinhaPagamento = Awaited<ReturnType<ReturnType<typeof selPagamentos>['where']>>[number];
const mapLinha = (x: LinhaPagamento, agora: Date) => mapPagamento(x.p, x.u, x.a?.id ? { id: x.a.id, nome: x.a.nome } : null, agora);

async function pagamentoPorId(db: Db, id: string, agora: Date) {
  const [x] = await selPagamentos(db).where(eq(pedidos.id, id));
  return mapLinha(existe(x, 'Pagamento não encontrado.'), agora);
}

async function pedidoPorId(db: Db, id: string): Promise<Pedido> {
  const [p] = await db.select().from(pedidos).where(eq(pedidos.id, id));
  return existe(p, 'Pagamento não encontrado.');
}

/** Resumo do pedido para o antes/depois da auditoria (sem payload Pix). */
function resumo(p: Pedido): Record<string, unknown> {
  return {
    status: p.status,
    metodo: p.metodo,
    valorCentavos: p.valorCentavos,
    asaasPaymentId: p.asaasPaymentId,
    pagoEm: p.pagoEm?.toISOString() ?? null,
    estornadoEm: p.estornadoEm?.toISOString() ?? null,
    canceladoEm: p.canceladoEm?.toISOString() ?? null,
  };
}

/** Corpo do webhook sem dados que não precisamos mostrar. */
function corpoReduzido(c: unknown): Record<string, unknown> {
  const o = (c ?? {}) as Record<string, unknown>;
  const pay = (o.payment ?? {}) as Record<string, unknown>;
  const pegar = (k: string) => (pay[k] === undefined ? undefined : pay[k]);
  return {
    id: o.id,
    event: o.event,
    dateCreated: o.dateCreated,
    payment: o.payment
      ? {
          id: pegar('id'),
          status: pegar('status'),
          value: pegar('value'),
          netValue: pegar('netValue'),
          billingType: pegar('billingType'),
          externalReference: pegar('externalReference'),
          paymentDate: pegar('paymentDate'),
          confirmedDate: pegar('confirmedDate'),
        }
      : undefined,
  };
}

const paymentIdDe = sql<string | null>`${webhookEventos.corpo} -> 'payment' ->> 'id'`;

function mapWebhook(e: typeof webhookEventos.$inferSelect, pedidoId: string | null): WebhookEventoSuper {
  const pay = (e.corpo as { payment?: { id?: string } }).payment;
  return {
    id: e.id,
    evento: e.evento,
    paymentId: pay?.id ?? null,
    pedidoId,
    recebidoEm: iso(e.recebidoEm),
    processadoEm: e.processadoEm ? iso(e.processadoEm) : null,
    erro: e.erro,
    resultado: e.resultado,
    tentativas: e.tentativas,
    corpo: corpoReduzido(e.corpo),
  };
}

const NOMES_RESULTADO: Record<string, string> = {
  pago: 'pedido marcado como pago',
  estornado: 'pedido estornado',
  vencido: 'pedido vencido',
  sem_mudanca: 'sem mudança (já estava assim)',
  ignorado: 'evento ignorado',
  sem_pedido: 'sem pedido correspondente',
  valor_divergente: 'valor pago menor que o do pedido (acesso não liberado)',
  erro: 'falhou',
};

async function linhaDoTempo(db: Db, p: Pedido): Promise<{ eventos: EventoLinhaTempo[]; webhooks: WebhookEventoSuper[] }> {
  const ev: EventoLinhaTempo[] = [];
  const add = (em: Date | null, tipo: EventoLinhaTempo['tipo'], titulo: string, detalhe: string | null = null, erro: string | null = null) => {
    if (em) ev.push({ em: iso(em), tipo, titulo, detalhe, erro });
  };
  add(p.criadoEm, 'pedido', p.metodo === 'manual' && !p.asaasPaymentId ? 'Pagamento manual registrado' : 'Pix gerado no Asaas', p.asaasPaymentId);
  if (p.metodo === 'manual') {
    add(
      p.pagoEm,
      'pagamento',
      'Aprovado manualmente',
      `${NOMES_FORMA_PAGAMENTO_MANUAL[p.manualForma ?? 'outro']}, recebido em ${p.manualRecebidoEm ?? '—'}${p.manualReferencia ? ` · ref. ${p.manualReferencia}` : ''}`,
    );
  } else add(p.pagoEm, 'pagamento', 'Pagamento confirmado');
  add(p.canceladoEm, 'pedido', 'Cobrança Pix cancelada');
  add(p.reembolsoSolicitadoEm, 'estorno', 'Reembolso pedido ao Asaas');
  add(p.estornadoEm, 'estorno', p.metodo === 'manual' ? 'Aprovação manual desfeita' : 'Estorno confirmado');
  add(p.conciliadoEm, 'pedido', 'Última conciliação com o Asaas');
  let webhooks: WebhookEventoSuper[] = [];
  if (p.asaasPaymentId) {
    const ws = await db.select().from(webhookEventos).where(sql`${paymentIdDe} = ${p.asaasPaymentId}`).orderBy(asc(webhookEventos.recebidoEm));
    webhooks = ws.map((w) => mapWebhook(w, p.id));
    for (const w of ws) {
      add(w.recebidoEm, 'webhook', `Webhook ${w.evento}`, `${NOMES_RESULTADO[w.resultado ?? ''] ?? (w.processadoEm ? 'processado' : 'não processado')} · ${w.tentativas} tentativa(s)`, w.erro);
    }
  }
  const auds = await db
    .select({ a: auditoria, nome: usuarios.nome })
    .from(auditoria)
    .leftJoin(usuarios, eq(usuarios.id, auditoria.adminId))
    .where(eq(auditoria.alvo, `pedido:${p.id}`))
    .orderBy(asc(auditoria.criadoEm));
  for (const a of auds) add(a.a.criadoEm, 'auditoria', `${a.a.acao} por ${a.nome ?? 'sistema'}`, a.a.motivo);
  ev.sort((a, b) => a.em.localeCompare(b.em));
  return { eventos: ev, webhooks };
}

function erroAsaas(deps: Deps, e: unknown, contexto: Record<string, unknown>): never {
  if (e instanceof ErroAsaas) {
    deps.log.error({ ...contexto, erro: e.message }, 'falha no Asaas');
    throw falha('asaas_indisponivel', `O Asaas não aceitou a operação agora. ${e.status === 404 ? 'A cobrança não existe mais no Asaas.' : 'Tente de novo em alguns minutos.'}`);
  }
  throw e;
}

export function rotasSuperPagamentos(r: Registrador): void {
  r.rota('superPagamentosListar', async ({ query, deps, agora }) => {
    const onde = ondePagamentos(query, agora);
    const [t] = await deps.db.select({ n: count() }).from(pedidos).innerJoin(usuarios, eq(usuarios.id, pedidos.usuarioId)).where(onde);
    const lista = await selPagamentos(deps.db)
      .where(onde)
      .orderBy(desc(pedidos.criadoEm))
      .limit(paginacao(query).limit)
      .offset(paginacao(query).offset);
    return { itens: lista.map((x) => mapLinha(x, agora)), total: contar(t?.n), pagina: query.pagina, porPagina: query.porPagina };
  });

  r.rota('superPagamentosCsv', async (ctx) => {
    const q = ctx.query;
    const lista = await selPagamentos(ctx.deps.db).where(ondePagamentos(q, ctx.agora)).orderBy(desc(pedidos.criadoEm)).limit(10_000);
    await auditarSuper(ctx, 'exportar.csv', 'pagamentos', { detalhes: { linhas: lista.length, q: q.q ?? null, status: q.status ?? null, metodo: q.metodo ?? null, de: q.de ?? null, ate: q.ate ?? null } });
    const conteudo = gerarCsv(
      ['pedido_id', 'criado_em', 'pago_em', 'status', 'metodo', 'valor_reais', 'liquido_reais', 'aluno', 'email', 'cpf', 'cobranca_asaas', 'forma_manual', 'recebido_em', 'referencia', 'aprovado_por', 'estornado_em', 'cancelado_em'],
      lista.map((x) => {
        const p = mapLinha(x, ctx.agora);
        return [
          p.id,
          p.criadoEm,
          p.pagoEm,
          p.status,
          p.metodo,
          reais(p.valorCentavos),
          reais(p.valorLiquidoCentavos),
          p.usuario.nome,
          p.usuario.email,
          p.usuario.cpfOculto,
          p.asaasPaymentId,
          p.manual ? NOMES_FORMA_PAGAMENTO_MANUAL[p.manual.forma] : '',
          p.manual?.recebidoEm ?? '',
          p.manual?.referencia ?? '',
          p.manual?.aprovadoPor?.nome ?? '',
          p.estornadoEm,
          p.canceladoEm,
        ];
      }),
    );
    return { nomeArquivo: nomeArquivoCsv('pagamentos', ctx.agora), conteudo };
  });

  r.rota('superPagamentoObter', async ({ params, deps, agora }) => {
    const pagamento = await pagamentoPorId(deps.db, params.id, agora);
    const p = await pedidoPorId(deps.db, params.id);
    const { eventos, webhooks } = await linhaDoTempo(deps.db, p);
    return { pagamento, linhaDoTempo: eventos, webhooks };
  });

  r.rota('superPagamentoConciliar', async (ctx) => {
    const { deps, params, agora } = ctx;
    const p = await pedidoPorId(deps.db, params.id);
    const [u] = await deps.db.select({ nome: usuarios.nome }).from(usuarios).where(eq(usuarios.id, p.usuarioId));
    let item;
    try {
      item = await conciliarPedido(deps, p, u?.nome ?? '', agora, { corrigir: true });
    } catch (e) {
      erroAsaas(deps, e, { pedidoId: p.id });
    }
    const depois = await pedidoPorId(deps.db, p.id);
    await auditarSuper(ctx, 'pedido.conciliar', `pedido:${p.id}`, {
      motivo: ctx.corpo.motivo ?? null,
      antes: resumo(p),
      depois: resumo(depois),
      detalhes: { statusAsaas: item.statusAsaas, divergente: item.divergente, corrigido: item.corrigido },
    });
    return item;
  });

  r.rota('superConciliarLote', async (ctx) => {
    const { deps, corpo, agora } = ctx;
    const per = periodo(corpo, agora);
    const LIMITE = 200;
    const lista = await deps.db
      .select({ p: pedidos, nome: usuarios.nome })
      .from(pedidos)
      .innerJoin(usuarios, eq(usuarios.id, pedidos.usuarioId))
      .where(and(gte(pedidos.criadoEm, per.inicio), lt(pedidos.criadoEm, per.fim), isNotNull(pedidos.asaasPaymentId), eq(pedidos.metodo, 'asaas')))
      .orderBy(asc(pedidos.criadoEm))
      .limit(LIMITE + 1);
    const [manuais] = await deps.db
      .select({ n: count() })
      .from(pedidos)
      .where(and(gte(pedidos.criadoEm, per.inicio), lt(pedidos.criadoEm, per.fim), eq(pedidos.metodo, 'manual')));
    const itens = [];
    let erros = 0;
    for (const x of lista.slice(0, LIMITE)) {
      try {
        const item = await conciliarPedido(deps, x.p, x.nome, agora, { corrigir: corpo.corrigir });
        if (item.corrigido) {
          await auditarSuper(ctx, 'pedido.conciliar', `pedido:${x.p.id}`, {
            motivo: corpo.motivo ?? 'conciliação em lote',
            antes: { status: item.statusLocalAntes },
            depois: { status: item.statusLocalDepois },
            detalhes: { statusAsaas: item.statusAsaas, lote: true },
          });
        }
        itens.push(item);
      } catch (e) {
        erros++;
        itens.push({
          pedidoId: x.p.id,
          asaasPaymentId: x.p.asaasPaymentId,
          usuario: x.nome,
          statusLocalAntes: x.p.status,
          statusLocalDepois: x.p.status,
          statusAsaas: null,
          divergente: false,
          corrigido: false,
          mensagem: `Não foi possível consultar o Asaas: ${(e as Error).message.slice(0, 160)}`,
        });
      }
    }
    const resposta = {
      verificados: itens.length,
      divergentes: itens.filter((i) => i.divergente).length,
      corrigidos: itens.filter((i) => i.corrigido).length,
      erros,
      ignoradosManuais: contar(manuais?.n),
      limiteAtingido: lista.length > LIMITE,
      // O relatório traz primeiro as divergências e os erros.
      itens: [...itens].sort((a, b) => Number(b.divergente || b.statusAsaas === null) - Number(a.divergente || a.statusAsaas === null)),
    };
    await auditarSuper(ctx, 'pedido.conciliar_lote', `periodo:${per.de}..${per.ate}`, {
      motivo: corpo.motivo ?? null,
      detalhes: { corrigir: corpo.corrigir, verificados: resposta.verificados, divergentes: resposta.divergentes, corrigidos: resposta.corrigidos, erros },
    });
    return resposta;
  });

  r.rota('superPagamentoReembolso', async (ctx) => {
    const { deps, params, corpo, usuario, agora } = ctx;
    await reconfirmar(deps, usuario, corpo.confirmacao, agora);
    const pedido = await pedidoPorId(deps.db, params.id);
    if (pedido.metodo === 'manual') throw falha('conflito', 'Este pagamento foi aprovado manualmente: use "Desfazer aprovação manual".');
    if (pedido.status !== 'pago' || !pedido.asaasPaymentId) throw falha('conflito', 'Só é possível reembolsar um pedido pago.');
    if (!corpo.foraDoPrazo && !(pedido.pagoEm && dentroDoArrependimento(pedido.pagoEm, agora))) {
      throw falha('fora_do_prazo', 'Passaram mais de 7 dias do pagamento. Marque "fora do prazo" para reembolsar mesmo assim.');
    }
    try {
      await deps.asaas.estornar(pedido.asaasPaymentId, { description: 'Reembolso Fuse Aprova' });
    } catch (e) {
      erroAsaas(deps, e, { pedidoId: pedido.id });
    }
    await deps.db.update(pedidos).set({ reembolsoSolicitadoEm: agora }).where(eq(pedidos.id, pedido.id));
    await auditarSuper(ctx, 'pedido.reembolso', `pedido:${pedido.id}`, {
      motivo: corpo.motivo,
      antes: resumo(pedido),
      depois: { ...resumo(pedido), reembolsoSolicitadoEm: agora.toISOString() },
      detalhes: { foraDoPrazo: corpo.foraDoPrazo },
    });
    return { ok: true as const, status: 'aguardando_webhook' as const };
  });

  r.rota('superPagamentoCancelarPix', async (ctx) => {
    const { deps, params, corpo, agora } = ctx;
    const pedido = await pedidoPorId(deps.db, params.id);
    const cancelavel = pedido.asaasPaymentId && !pedido.canceladoEm && (pedido.status === 'pendente' || pedido.metodo === 'manual' || pedido.status === 'vencido');
    if (!cancelavel) throw falha('conflito', 'Só é possível cancelar uma cobrança Pix que ainda está aberta no Asaas.');
    try {
      await deps.asaas.removerCobranca(pedido.asaasPaymentId!);
    } catch (e) {
      // Já removida no Asaas: segue e marca aqui.
      if (!(e instanceof ErroAsaas && e.status === 404)) erroAsaas(deps, e, { pedidoId: pedido.id });
    }
    const [depois] = await deps.db
      .update(pedidos)
      .set({ canceladoEm: agora, ...(pedido.status === 'pendente' ? { status: 'vencido' as const } : {}) })
      .where(eq(pedidos.id, pedido.id))
      .returning();
    await auditarSuper(ctx, 'pedido.cancelar_pix', `pedido:${pedido.id}`, { motivo: corpo.motivo, antes: resumo(pedido), depois: resumo(depois!) });
    return pagamentoPorId(deps.db, pedido.id, agora);
  });

  r.rota('superPagamentoReenviarEmail', async (ctx) => {
    const { deps, params } = ctx;
    const pedido = await pedidoPorId(deps.db, params.id);
    if (pedido.status !== 'pago') throw falha('conflito', 'Só há e-mail de confirmação para um pagamento pago.');
    const [u] = await deps.db.select().from(usuarios).where(eq(usuarios.id, pedido.usuarioId));
    const aluno = existe(u, 'Usuário não encontrado.');
    if (aluno.excluidoEm) throw falha('conflito', 'Esta conta foi excluída.');
    enviarEmailConfirmacao(deps, pedido, aluno);
    await auditarSuper(ctx, 'pedido.reenviar_email', `pedido:${pedido.id}`, { detalhes: { para: aluno.email } });
    return { ok: true as const, para: aluno.email };
  });

  r.rota('superAprovarManual', async (ctx) => {
    const { deps, params, corpo, usuario, agora } = ctx;
    await reconfirmar(deps, usuario, corpo.confirmacao, agora);
    const r = await aprovarPagamentoManual(deps, usuario.id, params.id, corpo, agora);
    await auditarSuper(ctx, 'pedido.aprovar_manual', `pedido:${r.depois.id}`, {
      motivo: corpo.observacao,
      antes: r.antes ? resumo(r.antes) : null,
      depois: resumo(r.depois),
      detalhes: {
        usuarioId: params.id,
        jaAprovado: r.resposta.jaAprovado,
        forma: corpo.forma,
        recebidoEm: corpo.recebidoEm,
        referencia: corpo.referencia ?? null,
        comprovante: corpo.comprovante ?? null,
        asaas: r.resposta.asaas,
      },
    });
    return r.resposta;
  });

  r.rota('superPagamentoDesfazerManual', async (ctx) => {
    const { deps, params, corpo, usuario, agora } = ctx;
    await reconfirmar(deps, usuario, corpo.confirmacao, agora);
    const r = await desfazerAprovacaoManual(deps, params.id, agora);
    await auditarSuper(ctx, 'pedido.desfazer_manual', `pedido:${params.id}`, {
      motivo: corpo.motivo,
      antes: resumo(r.antes),
      depois: { ...resumo(r.depois), acessoDoAluno: r.usuario.acesso },
    });
    return pagamentoPorId(deps.db, params.id, agora);
  });

  r.rota('superComprovanteEnviar', async (ctx) => {
    const { req, deps } = ctx;
    const arquivo = await req.file({ limits: { fileSize: 5 * 1024 * 1024 } });
    if (!arquivo || arquivo.fieldname !== 'arquivo') throw falha('validacao', 'Envie o comprovante no campo "arquivo".');
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf' }[arquivo.mimetype];
    if (!ext) throw falha('validacao', 'Use uma imagem (PNG, JPG, WEBP) ou um PDF.');
    const dados = await arquivo.toBuffer();
    if (arquivo.file.truncated) throw falha('validacao', 'O comprovante pode ter no máximo 5 MB.');
    // Confere a assinatura do arquivo (não confia só no tipo declarado).
    const assinatura = dados.subarray(0, 4).toString('hex');
    const ok = { png: assinatura === '89504e47', jpg: assinatura.startsWith('ffd8ff'), webp: dados.subarray(8, 12).toString() === 'WEBP', pdf: assinatura === '25504446' }[ext];
    if (!ok) throw falha('validacao', 'O arquivo não parece ser uma imagem ou um PDF válido.');
    const nome = `${randomUUID()}.${ext}`;
    const pasta = join(deps.config.arquivosDir, 'comprovantes');
    await mkdir(pasta, { recursive: true });
    await writeFile(join(pasta, nome), dados, { mode: 0o600 });
    await auditarSuper(ctx, 'comprovante.enviar', `comprovante:${nome}`, { detalhes: { bytes: dados.length } });
    return { arquivo: nome, url: `/api/super/comprovantes/${nome}` };
  });

  /* ------------------------------------------------------------ webhooks */
  r.rota('superWebhooksListar', async ({ query, deps }) => {
    const termo = query.q?.trim();
    const onde = and(
      query.situacao === 'erro' ? isNotNull(webhookEventos.erro) : undefined,
      query.situacao === 'pendente' ? isNull(webhookEventos.processadoEm) : undefined,
      query.situacao === 'processado' ? and(isNotNull(webhookEventos.processadoEm), isNull(webhookEventos.erro)) : undefined,
      query.evento ? eq(webhookEventos.evento, query.evento) : undefined,
      termo ? or(ilike(webhookEventos.id, `%${termo}%`), sql`${paymentIdDe} = ${termo}`) : undefined,
    );
    const [t] = await deps.db.select({ n: count() }).from(webhookEventos).where(onde);
    const lista = await deps.db
      .select({ e: webhookEventos, pedidoId: pedidos.id })
      .from(webhookEventos)
      .leftJoin(pedidos, sql`${pedidos.asaasPaymentId} = ${paymentIdDe}`)
      .where(onde)
      .orderBy(desc(webhookEventos.recebidoEm))
      .limit(paginacao(query).limit)
      .offset(paginacao(query).offset);
    return { itens: lista.map((x) => mapWebhook(x.e, x.pedidoId)), total: contar(t?.n), pagina: query.pagina, porPagina: query.porPagina };
  });

  r.rota('superWebhookReprocessar', async (ctx) => {
    const r = await reprocessarEvento(ctx.deps, ctx.params.id, ctx.agora);
    if (!r) throw falha('nao_encontrado', 'Evento não encontrado.');
    await auditarSuper(ctx, 'webhook.reprocessar', `webhook:${ctx.params.id}`, { detalhes: { ok: r.ok, resultado: r.resultado, erro: r.erro } });
    return { id: ctx.params.id, ok: r.ok, resultado: r.resultado, erro: r.erro };
  });

  r.rota('superWebhooksReprocessarLote', async (ctx) => {
    const { deps, corpo, usuario, agora } = ctx;
    await reconfirmar(deps, usuario, corpo.confirmacao, agora);
    const ids = corpo.ids?.length
      ? corpo.ids
      : (
          await deps.db
            .select({ id: webhookEventos.id })
            .from(webhookEventos)
            .where(or(isNotNull(webhookEventos.erro), isNull(webhookEventos.processadoEm)))
            .orderBy(asc(webhookEventos.recebidoEm))
            .limit(200)
        ).map((x) => x.id);
    const existentes = ids.length
      ? (await deps.db.select({ id: webhookEventos.id }).from(webhookEventos).where(inArray(webhookEventos.id, ids))).map((x) => x.id)
      : [];
    const itens = [];
    for (const id of existentes) {
      const r = await reprocessarEvento(deps, id, agora);
      if (r) itens.push({ id, ok: r.ok, resultado: r.resultado, erro: r.erro });
    }
    const resposta = { total: itens.length, ok: itens.filter((i) => i.ok).length, falhas: itens.filter((i) => !i.ok).length, itens };
    await auditarSuper(ctx, 'webhook.reprocessar_lote', 'webhooks', {
      motivo: corpo.motivo,
      detalhes: { total: resposta.total, ok: resposta.ok, falhas: resposta.falhas, ids: existentes.slice(0, 50) },
    });
    return resposta;
  });
}
