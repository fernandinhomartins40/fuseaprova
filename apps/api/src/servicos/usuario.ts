/**
 * Perfil e contadores do aluno (GET /me e cabeçalhos).
 */
import { and, count, eq, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import {
  corDoAvatar,
  diaSP,
  iniciais,
  nomeComSobrenomeAbreviado,
  normalizarVidas,
  ocultarCpf,
  VIDAS_MAX,
} from '@fuse/shared';
import type { MeResposta } from '@fuse/shared/api';
import type { Usuario } from '../contexto.js';
import { contar, iso, isoOuNull, type Db } from '../util.js';
import { licoesConcluidasHoje, ofensivaHoje } from './progresso.js';
import { questaoVisivel } from './questoes.js';

const { usuarios, revisoes, questoes, concursos, cargos, ligasMembros } = schema;

export type Concurso = typeof schema.concursos.$inferSelect;
export type Cargo = typeof schema.cargos.$inferSelect;

/** "PAL · FAU" */
export function siglaConcurso(c: Pick<Concurso, 'municipio' | 'banca'>): string {
  const mun = c.municipio
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .slice(0, 3)
    .toUpperCase();
  const banca = (c.banca.split(/[-\s]/)[0] ?? c.banca).toUpperCase();
  return `${mun} · ${banca}`;
}

/** Modo edital (PRD 7.3): ligado quando o admin publica o edital. */
export function modoEdital(c: Pick<Concurso, 'status' | 'editalPublicadoEm'>): boolean {
  return c.editalPublicadoEm !== null && c.status !== 'aguardando_edital';
}

/** Vidas atuais (recarga de 4 h e reset da meia-noite aplicados). */
export function vidasAtuais(u: Pick<Usuario, 'vidas' | 'vidasAtualizadoEm'>, agora: Date) {
  return normalizarVidas({ vidas: u.vidas, atualizadoEm: u.vidasAtualizadoEm }, agora);
}

/** Grava a normalização das vidas, se mudou. */
export async function salvarVidas(
  tx: Db,
  u: Usuario,
  estado: { vidas: number; atualizadoEm: Date },
): Promise<void> {
  if (estado.vidas === u.vidas && estado.atualizadoEm.getTime() === u.vidasAtualizadoEm.getTime()) return;
  await tx
    .update(usuarios)
    .set({ vidas: estado.vidas, vidasAtualizadoEm: estado.atualizadoEm })
    .where(eq(usuarios.id, u.id));
  u.vidas = estado.vidas;
  u.vidasAtualizadoEm = estado.atualizadoEm;
}

export async function revisoesPendentes(db: Db, usuarioId: string, agora: Date): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(revisoes)
    .innerJoin(questoes, eq(questoes.id, revisoes.questaoId))
    .where(
      and(
        eq(revisoes.usuarioId, usuarioId),
        eq(revisoes.status, 'ativa'),
        lte(revisoes.venceEm, agora),
        questaoVisivel(),
      ),
    );
  return contar(r?.n);
}

export async function concursoDoUsuario(db: Db, u: Pick<Usuario, 'concursoId'>): Promise<Concurso | null> {
  if (u.concursoId) {
    const [c] = await db.select().from(concursos).where(eq(concursos.id, u.concursoId));
    if (c) return c;
  }
  return concursoAtivo(db);
}

/** O concurso exposto na interface (só Palmital, PRD 2.10): o ativo mais antigo. */
export async function concursoAtivo(db: Db): Promise<Concurso | null> {
  const [c] = await db
    .select()
    .from(concursos)
    .where(eq(concursos.ativo, true))
    .orderBy(concursos.criadoEm)
    .limit(1);
  return c ?? null;
}

export async function cargoDoUsuario(db: Db, u: Pick<Usuario, 'cargoId'>): Promise<Cargo | null> {
  if (!u.cargoId) return null;
  const [c] = await db.select().from(cargos).where(eq(cargos.id, u.cargoId));
  return c ?? null;
}

export async function montarMe(db: Db, u: Usuario, agora: Date): Promise<MeResposta> {
  const vidas = vidasAtuais(u, agora);
  const [concurso, cargo, pendentes, feitasHoje, ligaPend] = await Promise.all([
    concursoDoUsuario(db, u),
    cargoDoUsuario(db, u),
    revisoesPendentes(db, u.id, agora),
    licoesConcluidasHoje(db, u.id, agora),
    db
      .select({ n: count() })
      .from(ligasMembros)
      .where(
        and(
          eq(ligasMembros.usuarioId, u.id),
          isNotNull(ligasMembros.resultado),
          isNull(ligasMembros.resultadoVistoEm),
        ),
      ),
  ]);
  const edital = concurso ? modoEdital(concurso) : false;
  const meta = u.metaDiaria;
  return {
    id: u.id,
    nome: u.nome,
    nomeExibicao: nomeComSobrenomeAbreviado(u.nome),
    email: u.email,
    cpfOculto: ocultarCpf(u.cpf ?? ''),
    celular: u.celular ?? '',
    papel: u.papel,
    acesso: u.acesso,
    avatar: { iniciais: iniciais(u.nome), cor: corDoAvatar(u.id) },
    concurso: concurso
      ? {
          id: concurso.id,
          nome: concurso.nome,
          sigla: siglaConcurso(concurso),
          status: concurso.status,
          dataProva: concurso.dataProva,
        }
      : null,
    cargo: cargo ? { id: cargo.id, nome: cargo.nome, area: cargo.area, generico: cargo.generico } : null,
    area: u.area,
    metaDiaria: (meta >= 1 && meta <= 3 ? meta : 1) as 1 | 2 | 3,
    lembreteHora: u.lembreteHora,
    notificacoes: u.notificacoes,
    apelidoLiga: u.apelidoLiga,
    sons: u.sons,
    xpTotal: u.xpTotal,
    gemas: u.gemas,
    vidas: vidas.vidas,
    vidasMax: VIDAS_MAX,
    proximaVidaEm: isoOuNull(vidas.proximaVidaEm),
    ofensiva: ofensivaHoje(u, agora),
    ofensivaRecorde: u.ofensivaRecorde,
    ofensivaHojeContou: u.ultimoDiaEstudo === diaSP(agora),
    protetores: u.protetores,
    revisoesPendentes: pendentes,
    divisao: u.divisao,
    metaHoje: { feitas: feitasHoje, meta, cumprida: feitasHoje >= meta },
    onboardingConcluido: u.onboardingConcluidoEm !== null,
    confirmarCargoEdital: edital && cargo !== null && cargo.generico,
    resultadoLigaPendente: contar(ligaPend[0]?.n) > 0,
    versaoConteudo: concurso?.versaoConteudo ?? 1,
    criadoEm: iso(u.criadoEm),
  };
}

/** Sobe a versão do conteúdo (invalida cache do service worker e o pacote offline). */
export async function subirVersaoConteudo(db: Db, concursoId?: string | null): Promise<void> {
  const set = { versaoConteudo: sql`${concursos.versaoConteudo} + 1` };
  if (concursoId) await db.update(concursos).set(set).where(eq(concursos.id, concursoId));
  else await db.update(concursos).set(set);
}
