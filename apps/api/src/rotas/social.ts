/**
 * Liga, estatísticas do perfil e Web Push (exigirAcesso).
 */
import { and, asc, count, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { schema } from '@fuse/db';
import {
  AVISO_EDITAL,
  CONQUISTAS,
  corDoAvatar,
  diasParaFimDaSemana,
  divisaoAnterior,
  fimSemanaSP,
  formatarDiaMes,
  formatarDominio,
  GEMAS,
  iniciais,
  NOMES_DIVISAO,
  nomeNaLiga,
  proximaDivisao,
  semanaSP,
  textoRegraLiga,
  textoStatusEdital,
  zonasDoGrupo,
} from '@fuse/shared';
import { mensagemResultadoLiga, type LigaResposta } from '@fuse/shared/api';
import type { Registrador } from '../http/registrar.js';
import { falha } from '../http/erros.js';
import { dominioPorDisciplina } from '../servicos/dominio.js';
import { ofensivaHoje } from '../servicos/progresso.js';
import { cargoDoUsuario, concursoDoUsuario } from '../servicos/usuario.js';
import { diasParaProva } from '../servicos/concursos.js';
import { contar, iso } from '../util.js';

const { ligasGrupos, ligasMembros, usuarios, tentativas, conquistasUsuario, pushInscricoes } = schema;

export function rotasSocial(r: Registrador): void {
  r.rota('liga', async ({ usuario, deps, agora }): Promise<LigaResposta> => {
    const { db } = deps;
    const semana = semanaSP(agora);
    const dias = diasParaFimDaSemana(agora);
    const [membro] = await db
      .select({ m: ligasMembros, g: ligasGrupos })
      .from(ligasMembros)
      .innerJoin(ligasGrupos, eq(ligasGrupos.id, ligasMembros.grupoId))
      .where(and(eq(ligasMembros.usuarioId, usuario.id), eq(ligasMembros.semana, semana)));
    const divisao = membro?.g.divisao ?? usuario.divisao;
    let ranking: LigaResposta['ranking'] = [];
    let grupo: LigaResposta['grupo'] = null;
    let minhaPosicao: number | null = null;
    if (membro) {
      const lista = await db
        .select({ id: usuarios.id, nome: usuarios.nome, apelido: usuarios.apelidoLiga, xp: ligasMembros.xpSemana })
        .from(ligasMembros)
        .innerJoin(usuarios, eq(usuarios.id, ligasMembros.usuarioId))
        .where(eq(ligasMembros.grupoId, membro.g.id))
        .orderBy(desc(ligasMembros.xpSemana), asc(ligasMembros.alcancadoEm), asc(ligasMembros.usuarioId))
        .limit(30);
      ranking = lista.map((l, i) => {
        const nome = nomeNaLiga(l.nome, l.apelido);
        return { posicao: i + 1, nome, iniciais: iniciais(nome), cor: corDoAvatar(l.id), xpSemana: l.xp, eu: l.id === usuario.id };
      });
      minhaPosicao = ranking.find((x) => x.eu)?.posicao ?? null;
      const z = zonasDoGrupo(lista.length, divisao);
      grupo = { id: membro.g.id, tamanho: lista.length, promocaoAte: z.promocaoAte, rebaixamentoDesde: z.rebaixamentoDesde };
    }
    const [ant] = await db
      .select({ m: ligasMembros, g: ligasGrupos })
      .from(ligasMembros)
      .innerJoin(ligasGrupos, eq(ligasGrupos.id, ligasMembros.grupoId))
      .where(
        and(eq(ligasMembros.usuarioId, usuario.id), isNotNull(ligasMembros.resultado), isNull(ligasMembros.resultadoVistoEm)),
      )
      .orderBy(desc(ligasMembros.semana))
      .limit(1);
    let resultadoAnterior: LigaResposta['resultadoAnterior'] = null;
    if (ant && ant.m.resultado) {
      const nova =
        ant.m.resultado === 'subiu'
          ? proximaDivisao(ant.g.divisao)
          : ant.m.resultado === 'desceu'
            ? divisaoAnterior(ant.g.divisao)
            : ant.g.divisao;
      resultadoAnterior = {
        semana: ant.m.semana,
        resultado: ant.m.resultado,
        posicao: ant.m.posicaoFinal ?? 0,
        divisaoAnterior: ant.g.divisao,
        divisaoNova: nova,
        mensagem: mensagemResultadoLiga(ant.m.resultado, NOMES_DIVISAO[nova]),
        gemasGanhas: ant.m.resultado === 'subiu' ? GEMAS.SUBIR_LIGA : 0,
      };
    }
    return {
      semana,
      divisao,
      nomeDivisao: NOMES_DIVISAO[divisao],
      terminaEm: iso(fimSemanaSP(agora)),
      diasRestantes: dias,
      regra: textoRegraLiga(dias),
      participando: Boolean(membro),
      grupo,
      ranking,
      minhaPosicao,
      resultadoAnterior,
    };
  });

  r.rota('ligaResultadoVisto', async ({ usuario, corpo, deps, agora }) => {
    await deps.db
      .update(ligasMembros)
      .set({ resultadoVistoEm: agora })
      .where(and(eq(ligasMembros.usuarioId, usuario.id), eq(ligasMembros.semana, corpo.semana)));
    return { ok: true as const };
  });

  r.rota('perfilEstatisticas', async ({ usuario, deps, agora }) => {
    const { db } = deps;
    const [tent] = await db
      .select({ n: count() })
      .from(tentativas)
      .where(eq(tentativas.usuarioId, usuario.id));
    const [ac] = await db
      .select({ n: count() })
      .from(tentativas)
      .where(and(eq(tentativas.usuarioId, usuario.id), eq(tentativas.acertou, true)));
    const feitas = contar(tent?.n);
    const obtidas = new Map(
      (await db.select().from(conquistasUsuario).where(eq(conquistasUsuario.usuarioId, usuario.id))).map((c) => [
        c.codigo,
        c.obtidaEm,
      ]),
    );
    const [dominio, concurso, cargo] = await Promise.all([
      dominioPorDisciplina(db, usuario.id),
      concursoDoUsuario(db, usuario),
      cargoDoUsuario(db, usuario),
    ]);
    const status = concurso?.status ?? 'aguardando_edital';
    const dataProva = concurso?.dataProva ?? null;
    return {
      ofensiva: ofensivaHoje(usuario, agora),
      ofensivaRecorde: usuario.ofensivaRecorde,
      xpTotal: usuario.xpTotal,
      questoesFeitas: feitas,
      precisao: feitas ? Math.round((contar(ac?.n) / feitas) * 100) : null,
      dominio: dominio.map((d) => ({ ...d, texto: formatarDominio(d.valor) })),
      conquistas: CONQUISTAS.map((c) => {
        const em = obtidas.get(c.codigo);
        return { codigo: c.codigo, titulo: c.titulo, descricao: c.descricao, obtida: Boolean(em), obtidaEm: em ? iso(em) : null };
      }),
      cargo: cargo ? { nome: cargo.nome, area: cargo.area } : null,
      orgao: concurso?.orgao ?? null,
      seloAcesso: 'Acesso completo · pago via Pix',
      edital: {
        status,
        texto: textoStatusEdital(status, dataProva ? formatarDiaMes(dataProva) : null),
        dataProva,
        diasParaProva: diasParaProva(dataProva, agora),
      },
      avisoEdital: AVISO_EDITAL,
    };
  });

  r.rota('pushChave', async ({ deps }) => {
    if (!deps.config.vapid.publica) throw falha('nao_encontrado', 'Notificações indisponíveis no momento.');
    return { chavePublica: deps.config.vapid.publica };
  });

  r.rota('pushInscrever', async ({ usuario, corpo, deps, agora }) => {
    await deps.db
      .insert(pushInscricoes)
      .values({ usuarioId: usuario.id, endpoint: corpo.endpoint, p256dh: corpo.keys.p256dh, auth: corpo.keys.auth, criadoEm: agora })
      .onConflictDoUpdate({
        target: pushInscricoes.endpoint,
        set: { usuarioId: usuario.id, p256dh: corpo.keys.p256dh, auth: corpo.keys.auth },
      });
    return { ok: true as const };
  });

  r.rota('pushRemover', async ({ usuario, corpo, deps }) => {
    await deps.db
      .delete(pushInscricoes)
      .where(
        corpo.endpoint
          ? and(eq(pushInscricoes.usuarioId, usuario.id), eq(pushInscricoes.endpoint, corpo.endpoint))
          : eq(pushInscricoes.usuarioId, usuario.id),
      );
    return { ok: true as const };
  });
}

