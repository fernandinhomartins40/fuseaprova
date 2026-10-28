/**
 * Vários concursos por aluno (D21). O acesso é por concurso: cada um é uma compra (o primeiro a
 * preço cheio, os adicionais com desconto) e `usuarios_concursos.acesso` diz se está liberado.
 *
 * Invariantes mantidas aqui (todo código que libera ou revoga acesso passa por estas funções):
 *  - `usuarios.acesso` = o aluno tem algum concurso liberado (a guarda 402 lê dele);
 *  - se tem concurso liberado, o concurso ATIVO (`usuarios.concurso_id`) é um liberado, e
 *    `cargo_id`/`area` do usuário espelham a linha dele em `usuarios_concursos`.
 */
import { and, asc, eq, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import {
  AREAS_CARGO,
  AVISO_EDITAL,
  diaSP,
  diferencaDias,
  NOMES_AREA,
  NOMES_STATUS_CONCURSO,
  type Dia,
} from '@fuse/shared';
import type {
  ConcursoClonarEntrada,
  ConcursoClonarResposta,
  ConcursoResposta,
  ConcursoResumo,
  MeusConcursosResposta,
} from '@fuse/shared/api';
import type { Deps, Usuario } from '../contexto.js';
import { falha } from '../http/erros.js';
import type { Db } from '../util.js';
import { lerPrecos, precoBase } from './precos.js';
import { concursoDoUsuario, modoEdital, siglaConcurso, type Cargo, type Concurso } from './usuario.js';

const { concursos, cargos, usuarios, usuariosConcursos, pedidos, unidades, secoes, licoes } = schema;

export function diasParaProva(dataProva: Dia | null, agora: Date): number | null {
  return dataProva ? Math.max(0, diferencaDias(dataProva, diaSP(agora))) : null;
}

export function cargoResumo(c: Cargo) {
  return {
    id: c.id,
    nome: c.nome,
    area: c.area,
    escolaridade: c.escolaridade,
    vagas: c.vagas,
    generico: c.generico,
    distribuicao: c.distribuicao,
  };
}

/* ------------------------------------------------------------------ preço */

/**
 * Quanto este aluno paga agora por este concurso: o preço cheio no primeiro e o adicional (com
 * desconto) se ele já pagou outro concurso. Pedido pago e não estornado é o que conta; acesso
 * liberado à mão pelo admin, sem pedido, não dá desconto.
 */
export async function precoDoConcurso(
  deps: Pick<Deps, 'config'>,
  db: Db,
  usuarioId: string,
  concursoId: string,
): Promise<{ centavos: number; comDesconto: boolean }> {
  // D23: os valores são os vigentes (painel do superadmin ou, sem nada salvo, o .env).
  return precoBase(deps, db, usuarioId, concursoId);
}

/* --------------------------------------------------------- acesso por concurso */

/** Grava o concurso ativo do aluno copiando o cargo e a área da linha dele. */
async function ativarLinha(
  tx: Db,
  usuarioId: string,
  linha: { concursoId: string; cargoId: string | null; area: Usuario['area'] },
): Promise<void> {
  await tx
    .update(usuarios)
    .set({ concursoId: linha.concursoId, cargoId: linha.cargoId, area: linha.area })
    .where(eq(usuarios.id, usuarioId));
}

/**
 * Recalcula `usuarios.acesso` e garante que o concurso ativo é um liberado. Devolve se o aluno
 * ainda tem algum concurso liberado. Aluno sem nenhuma linha (equipe, legado) não é mexido.
 */
export async function sincronizarAcesso(tx: Db, usuarioId: string): Promise<boolean> {
  const linhas = await tx.select().from(usuariosConcursos).where(eq(usuariosConcursos.usuarioId, usuarioId));
  if (linhas.length === 0) return (await tx.select({ a: usuarios.acesso }).from(usuarios).where(eq(usuarios.id, usuarioId)))[0]?.a ?? false;
  const liberados = linhas
    .filter((l) => l.acesso)
    .sort((a, b) => (a.acessoEm?.getTime() ?? 0) - (b.acessoEm?.getTime() ?? 0));
  if (liberados.length === 0) {
    await tx.update(usuarios).set({ acesso: false }).where(eq(usuarios.id, usuarioId));
    return false;
  }
  const [u] = await tx.select({ concursoId: usuarios.concursoId }).from(usuarios).where(eq(usuarios.id, usuarioId));
  await tx.update(usuarios).set({ acesso: true }).where(eq(usuarios.id, usuarioId));
  if (!liberados.some((l) => l.concursoId === u?.concursoId)) await ativarLinha(tx, usuarioId, liberados[0]!);
  return true;
}

/** Libera um concurso para o aluno (pagamento confirmado ou liberação do admin). */
export async function liberarConcurso(tx: Db, usuarioId: string, concursoId: string, agora: Date): Promise<void> {
  await tx
    .insert(usuariosConcursos)
    .values({ usuarioId, concursoId, acesso: true, acessoEm: agora, criadoEm: agora })
    .onConflictDoUpdate({
      target: [usuariosConcursos.usuarioId, usuariosConcursos.concursoId],
      set: { acesso: true, acessoEm: sql`coalesce(${usuariosConcursos.acessoEm}, ${agora.toISOString()}::timestamptz)` },
    });
  await sincronizarAcesso(tx, usuarioId);
}

/** Revoga um concurso (estorno, chargeback). Devolve se o aluno ainda tem outro liberado. */
export async function revogarConcurso(tx: Db, usuarioId: string, concursoId: string): Promise<boolean> {
  const feito = await tx
    .update(usuariosConcursos)
    .set({ acesso: false })
    .where(and(eq(usuariosConcursos.usuarioId, usuarioId), eq(usuariosConcursos.concursoId, concursoId)))
    .returning({ c: usuariosConcursos.concursoId });
  if (feito.length === 0) {
    // Sem linha (equipe, legado): o acesso era o global.
    await tx.update(usuarios).set({ acesso: false }).where(eq(usuarios.id, usuarioId));
    return false;
  }
  return sincronizarAcesso(tx, usuarioId);
}

/** Revoga tudo (admin "revogar acesso", exclusão da conta). */
export async function revogarTudo(tx: Db, usuarioId: string): Promise<void> {
  await tx.update(usuariosConcursos).set({ acesso: false }).where(eq(usuariosConcursos.usuarioId, usuarioId));
  await tx.update(usuarios).set({ acesso: false }).where(eq(usuarios.id, usuarioId));
}

/** O cargo do aluno num concurso (PATCH /me): a linha acompanha o que o aluno escolheu. */
export async function guardarCargoNoConcurso(
  tx: Db,
  u: Pick<Usuario, 'id' | 'acesso'>,
  concursoId: string,
  cargo: { id: string; area: Usuario['area'] },
  agora: Date,
): Promise<void> {
  await tx
    .insert(usuariosConcursos)
    // A linha do concurso ativo nasce com o acesso do aluno (invariante: ativo liberado se há acesso).
    .values({ usuarioId: u.id, concursoId, cargoId: cargo.id, area: cargo.area, acesso: u.acesso, acessoEm: u.acesso ? agora : null, criadoEm: agora })
    .onConflictDoUpdate({
      target: [usuariosConcursos.usuarioId, usuariosConcursos.concursoId],
      set: { cargoId: cargo.id, area: cargo.area },
    });
}

/* ----------------------------------------------------------- listas e ações */

function resumo(c: Concurso, agora: Date, preco: { centavos: number; comDesconto: boolean }): ConcursoResumo {
  return {
    id: c.id,
    nome: c.nome,
    sigla: siglaConcurso(c),
    banca: c.banca,
    orgao: c.orgao,
    municipio: c.municipio,
    uf: c.uf,
    ano: c.ano,
    status: c.status,
    statusTexto: NOMES_STATUS_CONCURSO[c.status],
    dataProva: c.dataProva,
    diasParaProva: diasParaProva(c.dataProva, agora),
    precoCentavos: preco.centavos,
    comDesconto: preco.comDesconto,
  };
}

export async function montarMeusConcursos(deps: Deps, u: Usuario, agora: Date): Promise<MeusConcursosResposta> {
  const { db } = deps;
  const { valores: precos } = await lerPrecos(db, deps.config);
  const [ativo, linhas, abertos, pagos] = await Promise.all([
    concursoDoUsuario(db, u),
    db
      .select({ l: usuariosConcursos, c: concursos, cargoNome: cargos.nome })
      .from(usuariosConcursos)
      .innerJoin(concursos, eq(concursos.id, usuariosConcursos.concursoId))
      .leftJoin(cargos, eq(cargos.id, usuariosConcursos.cargoId))
      .where(eq(usuariosConcursos.usuarioId, u.id))
      .orderBy(asc(usuariosConcursos.criadoEm)),
    db.select().from(concursos).where(eq(concursos.ativo, true)).orderBy(asc(concursos.criadoEm)),
    db
      .selectDistinct({ concursoId: pedidos.concursoId })
      .from(pedidos)
      .where(and(eq(pedidos.usuarioId, u.id), eq(pedidos.status, 'pago'))),
  ]);
  const pagosIds = new Set(pagos.map((p) => p.concursoId).filter((x): x is string => x !== null));
  const precoPara = (concursoId: string) => {
    const desconto = [...pagosIds].some((id) => id !== concursoId);
    return desconto
      ? { centavos: precos.precoAdicionalCentavos, comDesconto: true }
      : { centavos: precos.precoCentavos, comDesconto: false };
  };
  const seguidosIds = new Set(linhas.map((x) => x.l.concursoId));
  return {
    ativoId: ativo?.id ?? null,
    seguidos: linhas.map(({ l, c, cargoNome }) => ({
      ...resumo(c, agora, l.acesso ? { centavos: 0, comDesconto: false } : precoPara(c.id)),
      cargo: l.cargoId && cargoNome ? { id: l.cargoId, nome: cargoNome } : null,
      acesso: l.acesso,
      ativo: c.id === ativo?.id,
    })),
    disponiveis: abertos.filter((c) => !seguidosIds.has(c.id)).map((c) => resumo(c, agora, precoPara(c.id))),
    precoCheioCentavos: precos.precoCentavos,
    precoAdicionalCentavos: precos.precoAdicionalCentavos,
  };
}

async function concursoAberto(db: Db, id: string): Promise<Concurso> {
  const [c] = await db.select().from(concursos).where(and(eq(concursos.id, id), eq(concursos.ativo, true)));
  if (!c) throw falha('nao_encontrado', 'Concurso não encontrado.');
  return c;
}

/** Cargo escolhido para um concurso: do concurso, ativo e, com edital publicado, do edital. */
export async function validarCargo(db: Db, c: Concurso, cargoId: string) {
  const [cargo] = await db.select().from(cargos).where(and(eq(cargos.id, cargoId), eq(cargos.ativo, true)));
  if (!cargo || cargo.concursoId !== c.id) {
    throw falha('validacao', 'Escolha um cargo da lista.', { cargoId: 'Escolha um cargo da lista.' });
  }
  if (modoEdital(c) && cargo.generico) {
    throw falha('validacao', 'O edital saiu: escolha um cargo do edital.', { cargoId: 'Escolha um cargo do edital.' });
  }
  return cargo;
}

export async function seguirConcurso(
  deps: Deps,
  u: Usuario,
  concursoId: string,
  cargoId: string | null,
  agora: Date,
): Promise<MeusConcursosResposta> {
  await deps.db.transaction(async (tx) => {
    const c = await concursoAberto(tx, concursoId);
    const cargo = cargoId ? await validarCargo(tx, c, cargoId) : null;
    await tx
      .insert(usuariosConcursos)
      .values({ usuarioId: u.id, concursoId: c.id, cargoId: cargo?.id ?? null, area: cargo?.area ?? null, criadoEm: agora })
      .onConflictDoUpdate({
        target: [usuariosConcursos.usuarioId, usuariosConcursos.concursoId],
        set: cargo ? { cargoId: cargo.id, area: cargo.area } : { criadoEm: sql`${usuariosConcursos.criadoEm}` },
      });
    const [linha] = await tx
      .select()
      .from(usuariosConcursos)
      .where(and(eq(usuariosConcursos.usuarioId, u.id), eq(usuariosConcursos.concursoId, c.id)));
    const [atual] = await tx.select().from(usuarios).where(eq(usuarios.id, u.id)).for('update');
    // Sem nenhum concurso liberado, este é o concurso que o aluno vai pagar: vira o ativo.
    // Com concurso liberado, só ativa se este também estiver liberado.
    if (!atual!.acesso || linha!.acesso) await ativarLinha(tx, u.id, linha!);
  });
  return montarMeusConcursos(deps, await recarregar(deps.db, u.id), agora);
}

async function recarregar(db: Db, id: string): Promise<Usuario> {
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, id));
  return u!;
}

export async function ativarConcurso(deps: Deps, u: Usuario, concursoId: string, agora: Date): Promise<MeusConcursosResposta> {
  await deps.db.transaction(async (tx) => {
    const [linha] = await tx
      .select()
      .from(usuariosConcursos)
      .where(and(eq(usuariosConcursos.usuarioId, u.id), eq(usuariosConcursos.concursoId, concursoId)));
    if (!linha) throw falha('nao_encontrado', 'Você não acompanha este concurso.');
    if (!linha.acesso) throw falha('sem_acesso', 'Este concurso ainda não está liberado para você.');
    await ativarLinha(tx, u.id, linha);
  });
  return montarMeusConcursos(deps, await recarregar(deps.db, u.id), agora);
}

export async function deixarConcurso(deps: Deps, u: Usuario, concursoId: string, agora: Date): Promise<MeusConcursosResposta> {
  await deps.db.transaction(async (tx) => {
    const [linha] = await tx
      .select()
      .from(usuariosConcursos)
      .where(and(eq(usuariosConcursos.usuarioId, u.id), eq(usuariosConcursos.concursoId, concursoId)));
    if (!linha) throw falha('nao_encontrado', 'Você não acompanha este concurso.');
    if (linha.acesso) throw falha('conflito', 'Este concurso já está liberado para você e fica na sua lista.');
    await tx
      .delete(usuariosConcursos)
      .where(and(eq(usuariosConcursos.usuarioId, u.id), eq(usuariosConcursos.concursoId, concursoId)));
    const [atual] = await tx.select({ c: usuarios.concursoId }).from(usuarios).where(eq(usuarios.id, u.id));
    if (atual?.c === concursoId) {
      const [outro] = await tx
        .select()
        .from(usuariosConcursos)
        .where(and(eq(usuariosConcursos.usuarioId, u.id), eq(usuariosConcursos.acesso, true)))
        .orderBy(asc(usuariosConcursos.acessoEm))
        .limit(1);
      if (outro) await ativarLinha(tx, u.id, outro);
      else await tx.update(usuarios).set({ concursoId: null, cargoId: null, area: null }).where(eq(usuarios.id, u.id));
    }
  });
  return montarMeusConcursos(deps, await recarregar(deps.db, u.id), agora);
}

/* ------------------------------------------------------- concurso por id */

/** Dados do concurso, status do edital e cargos (o mesmo corpo de GET /concurso). */
export async function montarConcursoResposta(db: Db, c: Concurso, agora: Date): Promise<ConcursoResposta> {
  const edital = modoEdital(c);
  const lista = await db
    .select()
    .from(cargos)
    .where(and(eq(cargos.concursoId, c.id), eq(cargos.ativo, true), eq(cargos.generico, !edital)))
    .orderBy(asc(cargos.ordem), asc(cargos.nome));
  return {
    id: c.id,
    nome: c.nome,
    sigla: siglaConcurso(c),
    banca: c.banca,
    orgao: c.orgao,
    municipio: c.municipio,
    uf: c.uf,
    ano: c.ano,
    status: c.status,
    statusTexto: NOMES_STATUS_CONCURSO[c.status],
    dataProva: c.dataProva,
    diasParaProva: diasParaProva(c.dataProva, agora),
    links: c.links,
    modoEdital: edital,
    cargos: lista.map(cargoResumo),
    areas: AREAS_CARGO.filter((a) => lista.some((x) => x.area === a)).map((area) => ({
      area,
      nome: NOMES_AREA[area],
      exemplos: lista.filter((x) => x.area === area).map((x) => x.nome),
    })),
    avisoEdital: AVISO_EDITAL,
  };
}

export async function concursoAbertoPorId(db: Db, id: string): Promise<Concurso> {
  return concursoAberto(db, id);
}

/* ------------------------------------------------------------------ clonar */

/**
 * Cria um concurso novo com a trilha do modelo: unidades, seções e lições apontam para os mesmos
 * assuntos, então as questões já valem. Entra `aguardando_edital`, com os cargos genéricos do
 * modelo, e INATIVO: o admin revisa e ativa quando quiser vender.
 */
export async function clonarConcurso(
  db: Db,
  modeloId: string,
  d: ConcursoClonarEntrada & { links?: unknown },
  agora: Date,
): Promise<{ concurso: Concurso } & Omit<ConcursoClonarResposta, 'concurso'>> {
  return db.transaction(async (tx) => {
    const [modelo] = await tx.select().from(concursos).where(eq(concursos.id, modeloId));
    if (!modelo) throw falha('nao_encontrado', 'Concurso modelo não encontrado.');
    const [novo] = await tx
      .insert(concursos)
      .values({
        slug: d.slug,
        nome: d.nome,
        banca: d.banca,
        orgao: d.orgao,
        municipio: d.municipio,
        uf: d.uf,
        ano: d.ano,
        dataProva: d.dataProva ?? null,
        links: (d.links as Concurso['links']) ?? [],
        status: 'aguardando_edital',
        ativo: false,
        // criadoEm pelo relógio do banco: "o concurso padrão" é o ativo mais antigo, e um clone
        // nunca deve passar na frente do modelo.
      })
      .returning();
    const us = await tx.select().from(unidades).where(eq(unidades.concursoId, modelo.id)).orderBy(asc(unidades.ordem), asc(unidades.criadoEm));
    let nSecoes = 0;
    let nLicoes = 0;
    for (const un of us) {
      const [nu] = await tx
        .insert(unidades)
        .values({ concursoId: novo!.id, area: un.area, ordem: un.ordem, titulo: un.titulo, disciplinaId: un.disciplinaId, criadoEm: agora })
        .returning({ id: unidades.id });
      const ss = await tx.select().from(secoes).where(eq(secoes.unidadeId, un.id)).orderBy(asc(secoes.ordem));
      for (const se of ss) {
        const [ns] = await tx
          .insert(secoes)
          .values({ unidadeId: nu!.id, ordem: se.ordem, titulo: se.titulo, assuntoId: se.assuntoId, noEdital: se.noEdital })
          .returning({ id: secoes.id });
        nSecoes++;
        const ls = await tx.select().from(licoes).where(eq(licoes.secaoId, se.id)).orderBy(asc(licoes.ordem));
        if (ls.length) {
          await tx.insert(licoes).values(
            ls.map((l) => ({
              secaoId: ns!.id,
              ordem: l.ordem,
              tipo: l.tipo,
              tamanho: l.tamanho,
              titulo: l.titulo,
              dicaTitulo: l.dicaTitulo,
              dicaTexto: l.dicaTexto,
              dicaExemplo: l.dicaExemplo,
            })),
          );
          nLicoes += ls.length;
        }
      }
    }
    const cs = await tx.select().from(cargos).where(and(eq(cargos.concursoId, modelo.id), eq(cargos.generico, true)));
    if (cs.length) {
      await tx.insert(cargos).values(
        cs.map((c) => ({
          concursoId: novo!.id,
          nome: c.nome,
          area: c.area,
          escolaridade: c.escolaridade,
          vagas: null,
          distribuicao: c.distribuicao,
          generico: true,
          conteudoProgramatico: null,
          ordem: c.ordem,
          ativo: c.ativo,
          criadoEm: agora,
        })),
      );
    }
    return { concurso: novo!, unidades: us.length, secoes: nSecoes, licoes: nLicoes, cargos: cs.length };
  });
}
