/**
 * /super/precos e /super/cupons (D23): o superadmin muda os preços e cria cupons pelo painel.
 * O Asaas não guarda preço: cada Pix é criado com o valor calculado no servidor. Ao salvar, os
 * Pix pendentes com o valor antigo são cancelados no Asaas (`sincronizarPixPendentes`).
 */
import { and, asc, count, eq, ne } from 'drizzle-orm';
import { schema } from '@fuse/db';
import type { CupomItem, CupomSalvarEntrada, PrecosResposta } from '@fuse/shared/api';
import type { Config } from '../../config.js';
import { falha } from '../../http/erros.js';
import type { Registrador } from '../../http/registrar.js';
import { reconfirmar } from '../../servicos/doisfatores.js';
import { lerPrecos, precosPadrao, salvarPrecos, sincronizarPixPendentes, usosDosCupons, type Cupom } from '../../servicos/precos.js';
import { iso, isoOuNull, type Db } from '../../util.js';
import { auditarSuper } from './comum.js';

const { concursos, cupons, pedidos, usuarios } = schema;

async function respostaPrecos(db: Db, config: Config): Promise<PrecosResposta> {
  const l = await lerPrecos(db, config, { semCache: true });
  const [autor] = l.atualizadoPor ? await db.select({ id: usuarios.id, nome: usuarios.nome }).from(usuarios).where(eq(usuarios.id, l.atualizadoPor)) : [];
  const [pend] = await db.select({ n: count() }).from(pedidos).where(and(eq(pedidos.status, 'pendente'), eq(pedidos.metodo, 'asaas')));
  const padrao = precosPadrao(config);
  return {
    valores: l.valores,
    padrao: { precoCentavos: padrao.precoCentavos, precoAdicionalCentavos: padrao.precoAdicionalCentavos },
    atualizadoEm: isoOuNull(l.atualizadoEm),
    atualizadoPor: autor ?? null,
    pixPendentes: Number(pend?.n ?? 0),
  };
}

async function itensCupons(db: Db, onde?: ReturnType<typeof eq>): Promise<CupomItem[]> {
  const linhas = await db
    .select({ c: cupons, concursoNome: concursos.nome })
    .from(cupons)
    .leftJoin(concursos, eq(concursos.id, cupons.concursoId))
    .where(onde)
    .orderBy(asc(cupons.criadoEm));
  const usos = await usosDosCupons(db, linhas.map((l) => l.c.id));
  return linhas.map(({ c, concursoNome }) => ({
    id: c.id,
    codigo: c.codigo,
    descricao: c.descricao,
    tipo: c.tipo,
    valor: c.valor,
    validoAte: isoOuNull(c.validoAte),
    limiteUsos: c.limiteUsos,
    concursoId: c.concursoId,
    concursoNome: concursoNome ?? null,
    ativo: c.ativo,
    usos: usos.get(c.id)?.usos ?? 0,
    pendentes: usos.get(c.id)?.pendentes ?? 0,
    criadoEm: iso(c.criadoEm),
    atualizadoEm: iso(c.atualizadoEm),
  }));
}

async function cupomItem(db: Db, id: string): Promise<CupomItem> {
  const [item] = await itensCupons(db, eq(cupons.id, id));
  if (!item) throw falha('nao_encontrado', 'Cupom não encontrado.');
  return item;
}

/** Campos do cupom como vão para o banco (o código já vem normalizado pelo Zod). */
function dadosCupom(c: Omit<CupomSalvarEntrada, 'motivo'> & { codigo: string }) {
  return {
    codigo: c.codigo,
    descricao: c.descricao ?? '',
    tipo: c.tipo,
    valor: c.valor,
    validoAte: c.validoAte ? new Date(c.validoAte) : null,
    limiteUsos: c.limiteUsos,
    concursoId: c.concursoId,
    ativo: c.ativo,
  };
}

async function codigoLivre(db: Db, codigo: string, exceto?: string): Promise<void> {
  const [outro] = await db
    .select({ id: cupons.id })
    .from(cupons)
    .where(and(eq(cupons.codigo, codigo), exceto ? ne(cupons.id, exceto) : undefined));
  if (outro) throw falha('conflito', 'Já existe um cupom com este código.', { codigo: 'Já existe um cupom com este código.' });
}

async function concursoExiste(db: Db, id: string | null): Promise<void> {
  if (!id) return;
  const [c] = await db.select({ id: concursos.id }).from(concursos).where(eq(concursos.id, id));
  if (!c) throw falha('validacao', 'Concurso não encontrado.', { concursoId: 'Concurso não encontrado.' });
}

function resumoCupom(c: Cupom) {
  return { codigo: c.codigo, tipo: c.tipo, valor: c.valor, validoAte: isoOuNull(c.validoAte), limiteUsos: c.limiteUsos, concursoId: c.concursoId, ativo: c.ativo };
}

export function rotasSuperPrecos(r: Registrador): void {
  r.rota('superPrecos', async ({ deps }) => respostaPrecos(deps.db, deps.config));

  r.rota('superPrecosSalvar', async (ctx) => {
    const { deps, corpo, usuario, agora } = ctx;
    await reconfirmar(deps, usuario, corpo.confirmacao, agora);
    const antes = (await lerPrecos(deps.db, deps.config, { semCache: true })).valores;
    const { motivo, confirmacao: _c, ...valores } = corpo;
    await salvarPrecos(deps.db, valores, usuario.id, agora);
    const cobrancasCanceladas = await sincronizarPixPendentes(deps, agora);
    await auditarSuper(ctx, 'precos.salvar', 'configuracoes:precos', {
      motivo,
      antes: { ...antes },
      depois: { ...valores },
      detalhes: { cobrancasCanceladas },
    });
    return { ...(await respostaPrecos(deps.db, deps.config)), cobrancasCanceladas };
  });

  r.rota('superCupons', async ({ deps }) => ({ itens: await itensCupons(deps.db) }));

  r.rota('superCupomCriar', async (ctx) => {
    const { deps, corpo, usuario, agora } = ctx;
    const { motivo, ...dados } = corpo;
    await codigoLivre(deps.db, dados.codigo);
    await concursoExiste(deps.db, dados.concursoId);
    const [novo] = await deps.db
      .insert(cupons)
      .values({ ...dadosCupom(dados), criadoPor: usuario.id, criadoEm: agora, atualizadoEm: agora })
      .returning();
    await auditarSuper(ctx, 'cupom.criar', `cupom:${novo!.id}`, { motivo, depois: resumoCupom(novo!) });
    return { cupom: await cupomItem(deps.db, novo!.id), cobrancasCanceladas: 0 };
  });

  r.rota('superCupomAtualizar', async (ctx) => {
    const { deps, corpo, params, agora } = ctx;
    const [antes] = await deps.db.select().from(cupons).where(eq(cupons.id, params.id));
    if (!antes) throw falha('nao_encontrado', 'Cupom não encontrado.');
    const { motivo, ...dados } = corpo;
    await codigoLivre(deps.db, dados.codigo, antes.id);
    await concursoExiste(deps.db, dados.concursoId);
    const [depois] = await deps.db
      .update(cupons)
      .set({ ...dadosCupom(dados), atualizadoEm: agora })
      .where(eq(cupons.id, antes.id))
      .returning();
    // Pix gerados com o cupom antigo (outro desconto, desativado, vencido) saem do Asaas.
    const cobrancasCanceladas = await sincronizarPixPendentes(deps, agora, { cupomId: antes.id });
    await auditarSuper(ctx, 'cupom.atualizar', `cupom:${antes.id}`, {
      motivo,
      antes: resumoCupom(antes),
      depois: resumoCupom(depois!),
      detalhes: { cobrancasCanceladas },
    });
    return { cupom: await cupomItem(deps.db, antes.id), cobrancasCanceladas };
  });
}
