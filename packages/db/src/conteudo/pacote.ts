/**
 * Pacote de conteúdo (D15): questões OFICIAIS de provas da banca, já com assunto, áreas,
 * dica, explicação e dica de bolso, num JSON que roda igual em dev e em produção.
 *
 *   pnpm --filter @fuse/db conteudo:aplicar <pacote.json> [--simular]
 *
 * O pacote é a fonte da verdade do texto: aplicar de novo atualiza as mesmas linhas
 * (ids determinísticos), nunca duplica. Uma questão que o admin `retirou` continua retirada.
 *
 * A trilha é montada a partir das questões publicadas:
 * - Português, Matemática e Gerais: uma unidade comum (área null) por disciplina;
 * - Específicos: uma unidade por área de cargo;
 * - uma seção por assunto com pelo menos `MIN_QUESTOES_SECAO` questões visíveis
 *   (das específicas, contando só as da área), na ordem dos assuntos do pacote;
 * - 3 lições normais e um baú por seção, e o desafio (10 questões) no fim da unidade.
 */
import { and, eq, sql } from 'drizzle-orm';
import {
  AREAS_CARGO,
  LETRAS,
  SLUGS_DISCIPLINA,
  type AreaCargo,
  type Letra,
  type SlugDisciplina,
} from '@fuse/shared';
import type { BancoDados } from '../cliente.js';
import {
  assuntos,
  concursos,
  disciplinas,
  licoes,
  provasOrigem,
  questoes,
  secoes,
  unidades,
} from '../schema/tabelas.js';
import { linhasProvasOrigem } from '../seed/catalogo.js';
import { CONCURSO_PALMITAL } from '../seed/dados-base.js';
import { idFixo } from '../seed/ids.js';

export const FORMATO_PACOTE = 'fuse-aprova/conteudo@1';
export const MIN_QUESTOES_SECAO = 5;
const LICOES_NORMAIS_POR_SECAO = 3;

const STATUS_PACOTE = ['publicada', 'revisao', 'rascunho', 'anulada'] as const;
type StatusPacote = (typeof STATUS_PACOTE)[number];

export interface AssuntoPacote {
  disciplina: SlugDisciplina;
  slug: string;
  nome: string;
  dicaTitulo?: string | null;
  dicaTexto?: string | null;
  dicaExemplo?: string | null;
}

export interface ProvaPacote {
  /** URL da página da prova (PCI). É a chave da prova. */
  url: string;
  cargo: string;
  ano: number | null;
  /** Como o PCI escreve, com a UF no fim: "Pref. Pinhalão/PR". */
  orgao: string;
}

export interface QuestaoPacote {
  prova: string;
  numero: number;
  disciplina: SlugDisciplina;
  assunto: string;
  areas: AreaCargo[];
  dificuldade: 1 | 2 | 3;
  textoApoio: string | null;
  enunciado: string;
  alternativas: { letra: Letra; texto: string }[];
  gabarito: Letra | null;
  status: StatusPacote;
  anuladaMotivo?: string | null;
  dica: string | null;
  explicacao: string | null;
  dicaBolso: string | null;
}

export interface PacoteConteudo {
  formato: typeof FORMATO_PACOTE;
  assuntos: AssuntoPacote[];
  provas: ProvaPacote[];
  questoes: QuestaoPacote[];
}

const TITULO_UNIDADE: Record<Exclude<SlugDisciplina, 'especificos'>, string> = {
  portugues: 'Língua Portuguesa',
  matematica: 'Matemática e Raciocínio Lógico',
  gerais: 'Conhecimentos Gerais',
};

const TITULO_AREA: Record<AreaCargo, string> = {
  administrativo: 'Específicos: Administrativo',
  saude_medio: 'Específicos: Saúde (nível médio)',
  saude_superior: 'Específicos: Saúde (nível superior)',
  educacao: 'Específicos: Educação',
  operacional: 'Específicos: Operacional',
  servicos_gerais: 'Específicos: Serviços gerais',
  social_juridico: 'Específicos: Social e jurídico',
};

/** Valida o JSON do pacote e devolve a lista de problemas (vazia = ok). */
export function validarPacote(p: unknown): string[] {
  const erros: string[] = [];
  const x = p as Partial<PacoteConteudo>;
  if (!x || x.formato !== FORMATO_PACOTE) return [`formato diferente de ${FORMATO_PACOTE}`];
  if (!Array.isArray(x.assuntos) || !Array.isArray(x.provas) || !Array.isArray(x.questoes))
    return ['assuntos, provas e questoes têm de ser listas'];
  const chavesAssunto = new Set<string>();
  for (const a of x.assuntos) {
    if (!SLUGS_DISCIPLINA.includes(a.disciplina))
      erros.push(`assunto ${a.slug}: disciplina inválida`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug ?? ''))
      erros.push(`assunto "${a.slug}": slug inválido`);
    if (!a.nome?.trim()) erros.push(`assunto ${a.slug}: sem nome`);
    chavesAssunto.add(`${a.disciplina}:${a.slug}`);
  }
  const urls = new Set(x.provas.map((p) => p.url));
  const vistas = new Set<string>();
  for (const q of x.questoes) {
    const ref = `${q.prova} #${q.numero}`;
    if (!urls.has(q.prova)) erros.push(`${ref}: prova fora da lista de provas`);
    if (vistas.has(ref)) erros.push(`${ref}: repetida`);
    vistas.add(ref);
    if (!STATUS_PACOTE.includes(q.status)) erros.push(`${ref}: status inválido`);
    if (!chavesAssunto.has(`${q.disciplina}:${q.assunto}`))
      erros.push(`${ref}: assunto ${q.disciplina}:${q.assunto} fora da lista`);
    if (q.alternativas?.map((a) => a.letra).join('') !== LETRAS.join(''))
      erros.push(`${ref}: alternativas têm de ser A a E`);
    if (q.alternativas?.some((a) => !a.texto?.trim())) erros.push(`${ref}: alternativa vazia`);
    if (!q.enunciado?.trim()) erros.push(`${ref}: sem enunciado`);
    if (q.status !== 'anulada' && !(q.gabarito && LETRAS.includes(q.gabarito)))
      erros.push(`${ref}: sem gabarito`);
    if (q.areas?.some((a) => !AREAS_CARGO.includes(a))) erros.push(`${ref}: área inválida`);
    if (q.disciplina === 'especificos' && !q.areas?.length)
      erros.push(`${ref}: específica sem área`);
    if (![1, 2, 3].includes(q.dificuldade)) erros.push(`${ref}: dificuldade inválida`);
    // PRD 7.4: nada é publicado sem dica, explicação (e revisão).
    if (
      q.status === 'publicada' &&
      !(q.dica?.trim() && q.explicacao?.trim() && q.dicaBolso?.trim())
    )
      erros.push(`${ref}: publicada sem dica, explicação ou dica de bolso`);
  }
  return erros;
}

export function idQuestaoPacote(provaOrigemId: string, numero: number): string {
  return idFixo(`questao:prova:${provaOrigemId}:${numero}`);
}

export interface ResumoPacote {
  provas: number;
  assuntos: number;
  questoes: Record<StatusPacote, number>;
  retiradasMantidas: number;
  unidades: number;
  secoes: number;
  licoes: number;
  versaoConteudo: number;
}

export async function aplicarPacote(db: BancoDados, pacote: PacoteConteudo): Promise<ResumoPacote> {
  const erros = validarPacote(pacote);
  if (erros.length) throw new Error(`Pacote inválido:\n- ${erros.slice(0, 30).join('\n- ')}`);

  return db.transaction(async (tx) => {
    const concursoId = idFixo(CONCURSO_PALMITAL.chave);
    const [concurso] = await tx.select().from(concursos).where(eq(concursos.id, concursoId));
    if (!concurso) throw new Error('Concurso de Palmital não existe: rode o seed antes.');
    const idDisciplina = Object.fromEntries(
      (await tx.select({ id: disciplinas.id, slug: disciplinas.slug }).from(disciplinas)).map(
        (d) => [d.slug, d.id],
      ),
    ) as Record<SlugDisciplina, string>;

    /* ------------------------------------------------------------ provas */
    const linhas = linhasProvasOrigem({
      certames: [],
      provas_pci_amostra: pacote.provas.map((p) => ({ ...p, ano: p.ano ?? 0 })),
    });
    for (const [i, l] of linhas.entries()) {
      const ano = pacote.provas[i]!.ano;
      await tx
        .insert(provasOrigem)
        .values({ ...l, ano })
        .onConflictDoUpdate({
          target: provasOrigem.id,
          set: {
            cargo: l.cargo,
            ano,
            orgao: l.orgao,
            uf: sql`coalesce(${l.uf}, ${provasOrigem.uf})`,
            urlPagina: l.urlPagina,
          },
        });
    }
    const idProva = new Map(pacote.provas.map((p, i) => [p.url, linhas[i]!.id]));

    /* ---------------------------------------------------------- assuntos */
    for (const a of pacote.assuntos) {
      const dica = {
        dicaTitulo: a.dicaTitulo ?? null,
        dicaTexto: a.dicaTexto ?? null,
        dicaExemplo: a.dicaExemplo ?? null,
      };
      await tx
        .insert(assuntos)
        .values({
          id: idFixo(`assunto:${a.disciplina}:${a.slug}`),
          disciplinaId: idDisciplina[a.disciplina],
          slug: a.slug,
          nome: a.nome,
          ...dica,
        })
        .onConflictDoUpdate({
          target: [assuntos.disciplinaId, assuntos.slug],
          // A dica do assunto só é trocada quando o pacote traz uma.
          set: {
            nome: a.nome,
            ...(a.dicaTexto ? dica : {}),
          },
        });
    }
    const idAssunto = new Map(
      (
        await tx
          .select({ id: assuntos.id, slug: assuntos.slug, d: assuntos.disciplinaId })
          .from(assuntos)
      ).map((a) => [`${a.d}:${a.slug}`, a.id]),
    );

    /* ---------------------------------------------------------- questões */
    const contagem: Record<StatusPacote, number> = {
      publicada: 0,
      revisao: 0,
      rascunho: 0,
      anulada: 0,
    };
    let retiradasMantidas = 0;
    const agora = new Date();
    for (const q of pacote.questoes) {
      const provaOrigemId = idProva.get(q.prova)!;
      const disciplinaId = idDisciplina[q.disciplina];
      const id = idQuestaoPacote(provaOrigemId, q.numero);
      const conteudo = {
        disciplinaId,
        assuntoId: idAssunto.get(`${disciplinaId}:${q.assunto}`)!,
        areas: q.areas,
        dificuldade: q.dificuldade,
        textoApoio: q.textoApoio,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        gabarito: q.gabarito,
        dica: q.dica,
        explicacao: q.explicacao,
        dicaBolso: q.dicaBolso,
        anuladaMotivo:
          q.status === 'anulada'
            ? (q.anuladaMotivo ?? 'Anulada pela banca no gabarito definitivo.')
            : null,
      };
      const [atual] = await tx
        .select({ status: questoes.status, publicadoEm: questoes.publicadoEm })
        .from(questoes)
        .where(eq(questoes.id, id));
      const status = atual?.status === 'retirada' ? 'retirada' : q.status;
      if (status === 'retirada') retiradasMantidas++;
      else contagem[q.status]++;
      const publicadoEm = status === 'publicada' ? (atual?.publicadoEm ?? agora) : null;
      await tx
        .insert(questoes)
        .values({
          id,
          origem: 'fau_real',
          provaOrigemId,
          numeroOrigem: q.numero,
          ...conteudo,
          status,
          publicadoEm,
        })
        .onConflictDoUpdate({
          target: questoes.id,
          set: {
            ...conteudo,
            status,
            publicadoEm,
            versao: sql`${questoes.versao} + 1`,
            atualizadoEm: agora,
          },
        });
    }

    /* ------------------------------------------------------------ trilha */
    const visiveis = await tx
      .select({
        assuntoId: questoes.assuntoId,
        disciplinaId: questoes.disciplinaId,
        areas: questoes.areas,
      })
      .from(questoes)
      .where(and(eq(questoes.status, 'publicada'), eq(questoes.origem, 'fau_real')));
    const ordemAssunto = new Map(
      pacote.assuntos.map((a, i) => [`${idDisciplina[a.disciplina]}:${a.slug}`, i]),
    );
    const slugDoAssunto = new Map([...idAssunto].map(([k, v]) => [v, k]));
    const nomeAssunto = new Map(
      pacote.assuntos.map((a) => [`${idDisciplina[a.disciplina]}:${a.slug}`, a.nome]),
    );

    const planos: {
      chave: string;
      titulo: string;
      disciplina: SlugDisciplina;
      area: AreaCargo | null;
      ordem: number;
    }[] = [
      ...(['portugues', 'matematica', 'gerais'] as const).map((d, i) => ({
        chave: `trilha:${d}`,
        titulo: TITULO_UNIDADE[d],
        disciplina: d,
        area: null,
        ordem: 10 + i,
      })),
      ...AREAS_CARGO.map((a, i) => ({
        chave: `trilha:especificos:${a}`,
        titulo: TITULO_AREA[a],
        disciplina: 'especificos' as const,
        area: a,
        ordem: 20 + i,
      })),
    ];
    let nUnidades = 0;
    let nSecoes = 0;
    let nLicoes = 0;
    for (const u of planos) {
      const disciplinaId = idDisciplina[u.disciplina];
      const porAssunto = new Map<string, number>();
      for (const v of visiveis) {
        if (v.disciplinaId !== disciplinaId) continue;
        if (u.area && !(v.areas ?? []).includes(u.area)) continue;
        porAssunto.set(v.assuntoId, (porAssunto.get(v.assuntoId) ?? 0) + 1);
      }
      const escolhidos = [...porAssunto]
        .filter(([, n]) => n >= MIN_QUESTOES_SECAO)
        .map(([id]) => id)
        .sort(
          (a, b) =>
            (ordemAssunto.get(slugDoAssunto.get(a)!) ?? 999) -
            (ordemAssunto.get(slugDoAssunto.get(b)!) ?? 999),
        );
      if (!escolhidos.length) continue;

      const unidadeId = idFixo(`${u.chave}:${concursoId}`);
      await tx
        .insert(unidades)
        .values({
          id: unidadeId,
          concursoId,
          area: u.area,
          ordem: u.ordem,
          titulo: u.titulo,
          disciplinaId,
        })
        .onConflictDoUpdate({ target: unidades.id, set: { titulo: u.titulo, ordem: u.ordem } });
      nUnidades++;

      // Seções já criadas mantêm a ordem; as novas entram no fim.
      const existentes = await tx.select().from(secoes).where(eq(secoes.unidadeId, unidadeId));
      let proxima = Math.max(0, ...existentes.map((s) => s.ordem)) + 1;
      for (const assuntoId of escolhidos) {
        const secaoId = idFixo(`secao:${unidadeId}:${assuntoId}`);
        const ja = existentes.find((s) => s.id === secaoId);
        if (!ja) {
          await tx
            .insert(secoes)
            .values({
              id: secaoId,
              unidadeId,
              ordem: proxima++,
              titulo: nomeAssunto.get(slugDoAssunto.get(assuntoId)!) ?? 'Seção',
              assuntoId,
            });
        }
        nSecoes++;
        const titulo = nomeAssunto.get(slugDoAssunto.get(assuntoId)!) ?? 'Seção';
        const plano = [
          ...Array.from({ length: LICOES_NORMAIS_POR_SECAO }, (_, k) => ({
            ordem: k + 1,
            tipo: 'normal' as const,
            tamanho: 5 as const,
            titulo: `${titulo} · Lição ${k + 1}`,
          })),
          {
            ordem: LICOES_NORMAIS_POR_SECAO + 1,
            tipo: 'bau' as const,
            tamanho: 5 as const,
            titulo: 'Baú',
          },
        ];
        await tx
          .insert(licoes)
          .values(plano.map((l) => ({ id: idFixo(`licao:${secaoId}:${l.ordem}`), secaoId, ...l })))
          .onConflictDoNothing();
        nLicoes += plano.length;
      }
      // O desafio fica sempre depois da última lição da última seção da unidade.
      const todas = await tx.select().from(secoes).where(eq(secoes.unidadeId, unidadeId));
      const ultima = todas.sort((a, b) => b.ordem - a.ordem)[0]!;
      await tx
        .insert(licoes)
        .values({
          id: idFixo(`desafio:${unidadeId}`),
          secaoId: ultima.id,
          ordem: 99,
          tipo: 'desafio',
          tamanho: 10,
          titulo: `Desafio: ${u.titulo}`,
        })
        .onConflictDoUpdate({
          target: licoes.id,
          set: { secaoId: ultima.id, titulo: `Desafio: ${u.titulo}` },
        });
      nLicoes++;
    }

    // Invalida o pacote offline dos alunos (PRD 7.4, retirada rápida).
    const [c] = await tx
      .update(concursos)
      .set({ versaoConteudo: sql`${concursos.versaoConteudo} + 1` })
      .where(eq(concursos.id, concursoId))
      .returning({ v: concursos.versaoConteudo });

    return {
      provas: pacote.provas.length,
      assuntos: pacote.assuntos.length,
      questoes: contagem,
      retiradasMantidas,
      unidades: nUnidades,
      secoes: nSecoes,
      licoes: nLicoes,
      versaoConteudo: c!.v,
    };
  });
}
