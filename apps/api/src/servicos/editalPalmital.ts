/**
 * D45: importa os 49 cargos do edital de Palmital (Concurso Público nº 01/2026, FAU) para o concurso
 * do app, pelo comando `pnpm --filter @fuse/api cli edital:palmital`.
 *
 *   simular   mostra o que vai mudar e não grava nada (padrão);
 *   aplicar   grava numa transação, com a foto do "antes" na auditoria. Os cargos do edital ficam
 *             invisíveis para o aluno até publicar;
 *   publicar  liga o modo edital (o mesmo botão "Publicar edital" do painel);
 *   desfazer  volta o concurso e os cargos à foto da primeira importação (sem tocar em aluno,
 *             progresso, questões ou pagamentos).
 *
 * Não mexe em questões, assuntos, trilha (unidades, seções, lições, `no_edital`), progresso, XP,
 * revisões, simulados, pedidos nem nas áreas extras dos alunos. Os cargos genéricos nunca são
 * apagados: os que têm nome igual a um cargo do edital viram o cargo do edital (mesma área), e os
 * outros só somem das listas quando o edital é publicado.
 */
import { and, asc, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { schema } from '@fuse/db';
import { cargosAppPalmital, EDITAL_PALMITAL } from '@fuse/shared/palmital2026';
import { auditar } from '../rotas/admin/comum.js';
import { isoOuNull, type Db } from '../util.js';
import { publicarEdital, salvarEdital, type EditalSalvar } from './edital.js';

const { concursos, cargos, usuarios, auditoria } = schema;

export const SLUG_CONCURSO_PALMITAL = 'palmital-pr-2026';
/** Item 10.2 do edital (data provável). */
export const DATA_PROVA_PALMITAL = '2027-02-21';
export const ORIGEM_EDITAL_PALMITAL = 'cli:edital:palmital';

const PDF = (arquivo: string) => `https://www.concursosfau.com.br/sistema/uploads/${arquivo}.pdf`;
export const LINKS_EDITAL_PALMITAL = [
  { titulo: 'Página do concurso na FAU', url: EDITAL_PALMITAL.site },
  { titulo: 'Edital de Abertura nº 01/2026', url: PDF('EDITAL_CONCURSO_PUBLICO_PALMITAL_2') },
  {
    titulo: 'Retificação: datas da prova de títulos',
    url: PDF('RETIFICACAO_EDITAL_ABERTURA_-_PROVA_DE_TITULOS_1'),
  },
  {
    titulo: 'Anexo I: requisitos e atribuições dos cargos',
    url: PDF('ANEXO_I_-_REQUISITOS_E_ATRIBUICOES_DOS_CARGOS_-_PALMITAL'),
  },
  {
    titulo: 'Anexo II: conteúdo programático',
    url: PDF('ANEXO_II_-_CONTEUDO_PROGRAMATICO_-_PALMITAL'),
  },
  {
    titulo: 'Anexo III: autodeclaração de afrodescendente',
    url: PDF('ANEXO_III_-_AUTODECLARACAO_DE_AFRODESCENDENTE_2'),
  },
];

type Cargo = typeof schema.cargos.$inferSelect;
type Concurso = typeof schema.concursos.$inferSelect;

/** O que a importação vai fazer, para conferir antes de aplicar. */
export interface PlanoEditalPalmital {
  concurso: Pick<Concurso, 'id' | 'nome' | 'status' | 'dataProva'>;
  corpo: EditalSalvar;
  linksNovos: string[];
  /** Cargos do edital que ainda não existem no concurso. */
  criar: string[];
  /** Cargos genéricos com o mesmo nome de um cargo do edital: viram o cargo do edital. */
  converter: { nome: string; areaAntes: string; areaDepois: string }[];
  /** Cargos que já eram do edital (rodar de novo só atualiza). */
  atualizar: string[];
  /** Cargos genéricos que continuam genéricos: somem das listas quando o edital é publicado. */
  genericosQueSomem: string[];
  /** Alunos (concurso ativo) num desses genéricos: veem "Confirme seu cargo" ao publicar. */
  alunosParaConfirmar: number;
}

export interface FotoEdital {
  concurso: {
    status: Concurso['status'];
    editalPublicadoEm: string | null;
    dataProva: string | null;
    links: Concurso['links'];
  };
  cargos: Pick<
    Cargo,
    | 'id'
    | 'nome'
    | 'area'
    | 'escolaridade'
    | 'vagas'
    | 'distribuicao'
    | 'generico'
    | 'conteudoProgramatico'
    | 'ordem'
    | 'ativo'
  >[];
}

async function concursoPalmital(db: Db): Promise<Concurso> {
  const [c] = await db.select().from(concursos).where(eq(concursos.slug, SLUG_CONCURSO_PALMITAL));
  if (!c) throw new Error(`Não achei o concurso ${SLUG_CONCURSO_PALMITAL}.`);
  return c;
}

export async function planejarEditalPalmital(db: Db): Promise<PlanoEditalPalmital> {
  const c = await concursoPalmital(db);
  const atuais = await db.select().from(cargos).where(eq(cargos.concursoId, c.id));
  const porNome = new Map(atuais.map((k) => [k.nome, k]));
  const novos = cargosAppPalmital();
  const nomesNovos = new Set(novos.map((k) => k.nome));

  const linksNovos = LINKS_EDITAL_PALMITAL.filter((l) => !c.links.some((x) => x.url === l.url));
  const corpo: EditalSalvar = {
    concursoId: c.id,
    dataProva: DATA_PROVA_PALMITAL,
    // Mantém os links que já existem e acrescenta os do edital.
    links: [...c.links, ...linksNovos],
    cargos: novos.map((k) => ({
      id: porNome.get(k.nome)?.id,
      nome: k.nome,
      area: k.area,
      escolaridade: k.escolaridade,
      vagas: k.vagas,
      distribuicao: k.distribuicao,
      conteudoProgramatico: k.conteudoProgramatico,
    })),
    // Não mexe nas marcações "fora do edital": elas valem para a área inteira (D45).
    secoes: [],
  };

  const criar: string[] = [];
  const converter: PlanoEditalPalmital['converter'] = [];
  const atualizar: string[] = [];
  for (const k of novos) {
    const atual = porNome.get(k.nome);
    if (!atual) criar.push(k.nome);
    else if (atual.generico)
      converter.push({ nome: k.nome, areaAntes: atual.area, areaDepois: k.area });
    else atualizar.push(k.nome);
  }
  const somem = atuais.filter((k) => k.generico && k.ativo && !nomesNovos.has(k.nome));
  const [n] = somem.length
    ? await db
        .select({ n: sql<number>`count(*)` })
        .from(usuarios)
        .where(
          and(
            eq(usuarios.concursoId, c.id),
            inArray(
              usuarios.cargoId,
              somem.map((k) => k.id),
            ),
            isNull(usuarios.excluidoEm),
          ),
        )
    : [{ n: 0 }];
  return {
    concurso: { id: c.id, nome: c.nome, status: c.status, dataProva: c.dataProva },
    corpo,
    linksNovos: linksNovos.map((l) => l.titulo),
    criar,
    converter,
    atualizar,
    genericosQueSomem: somem.map((k) => k.nome),
    alunosParaConfirmar: Number(n?.n ?? 0),
  };
}

async function fotografar(db: Db, c: Concurso): Promise<FotoEdital> {
  const cs = await db
    .select()
    .from(cargos)
    .where(eq(cargos.concursoId, c.id))
    .orderBy(asc(cargos.ordem));
  return {
    concurso: {
      status: c.status,
      editalPublicadoEm: isoOuNull(c.editalPublicadoEm),
      dataProva: c.dataProva,
      links: c.links,
    },
    cargos: cs.map((k) => ({
      id: k.id,
      nome: k.nome,
      area: k.area,
      escolaridade: k.escolaridade,
      vagas: k.vagas,
      distribuicao: k.distribuicao,
      generico: k.generico,
      conteudoProgramatico: k.conteudoProgramatico,
      ordem: k.ordem,
      ativo: k.ativo,
    })),
  };
}

/** Grava os cargos do edital numa transação, com a foto do antes na auditoria. Não publica. */
export async function aplicarEditalPalmital(db: Db, agora: Date): Promise<PlanoEditalPalmital> {
  return db.transaction(async (tx) => {
    const plano = await planejarEditalPalmital(tx);
    const foto = await fotografar(tx, await concursoPalmital(tx));
    await salvarEdital(tx, plano.corpo, null, agora, {
      origem: ORIGEM_EDITAL_PALMITAL,
      motivo: 'CLI edital:palmital --aplicar',
      antes: foto as unknown as Record<string, unknown>,
    });
    return plano;
  });
}

/** Liga o modo edital (igual ao botão "Publicar edital" do painel). */
export async function publicarEditalPalmital(db: Db, agora: Date) {
  return db.transaction(async (tx) => {
    const c = await concursoPalmital(tx);
    return publicarEdital(tx, c.id, null, agora, { motivo: 'CLI edital:palmital --publicar' });
  });
}

/**
 * Volta o concurso e os cargos à foto da PRIMEIRA importação depois do último "desfazer". Cargos
 * criados pela importação continuam no banco (alunos e simulados podem apontar para eles), mas ficam
 * fora das listas, porque o concurso volta a "aguardando edital".
 */
export async function desfazerEditalPalmital(
  db: Db,
  agora: Date,
): Promise<{ restaurados: number; fotoDe: string }> {
  return db.transaction(async (tx) => {
    const c = await concursoPalmital(tx);
    const alvo = `concurso:${c.id}`;
    const [ultimo] = await tx
      .select({ em: auditoria.criadoEm })
      .from(auditoria)
      .where(and(eq(auditoria.acao, 'edital.desfazer'), eq(auditoria.alvo, alvo)))
      .orderBy(desc(auditoria.criadoEm))
      .limit(1);
    const [registro] = await tx
      .select()
      .from(auditoria)
      .where(
        and(
          eq(auditoria.acao, 'edital.salvar'),
          eq(auditoria.alvo, alvo),
          sql`${auditoria.detalhes}->>'origem' = ${ORIGEM_EDITAL_PALMITAL}`,
          sql`${auditoria.antes} is not null`,
          ultimo ? gt(auditoria.criadoEm, ultimo.em) : undefined,
        ),
      )
      .orderBy(asc(auditoria.criadoEm))
      .limit(1);
    if (!registro) throw new Error('Não há importação do edital para desfazer.');
    const foto = registro.antes as unknown as FotoEdital;
    await tx
      .update(concursos)
      .set({
        status: foto.concurso.status,
        editalPublicadoEm: foto.concurso.editalPublicadoEm
          ? new Date(foto.concurso.editalPublicadoEm)
          : null,
        dataProva: foto.concurso.dataProva,
        links: foto.concurso.links,
        versaoConteudo: sql`${concursos.versaoConteudo} + 1`,
      })
      .where(eq(concursos.id, c.id));
    for (const k of foto.cargos) {
      const { id, ...campos } = k;
      await tx
        .update(cargos)
        .set(campos)
        .where(and(eq(cargos.id, id), eq(cargos.concursoId, c.id)));
    }
    await auditar(
      tx,
      null,
      'edital.desfazer',
      alvo,
      { restaurados: foto.cargos.length, foto: registro.id },
      agora,
      {
        motivo: 'CLI edital:palmital --desfazer',
      },
    );
    return { restaurados: foto.cargos.length, fotoDe: registro.criadoEm.toISOString() };
  });
}

/** Texto do plano para o terminal. */
export function descreverPlano(p: PlanoEditalPalmital): string {
  const lista = (itens: string[]) =>
    itens.length ? itens.map((x) => `      - ${x}`).join('\n') : '      (nenhum)';
  const mudouArea = p.converter.filter((x) => x.areaAntes !== x.areaDepois);
  return [
    `Concurso: ${p.concurso.nome} (status: ${p.concurso.status})`,
    `Data da prova: ${p.concurso.dataProva ?? '(vazia)'} -> ${p.corpo.dataProva}`,
    `Links oficiais: ${p.linksNovos.length} novos (os que já existem continuam)`,
    `Cargos do edital: ${p.corpo.cargos.length}`,
    `  ${p.criar.length} novos:`,
    lista(p.criar),
    `  ${p.converter.length} cargos genéricos com o mesmo nome viram o cargo do edital:`,
    lista(
      p.converter.map(
        (x) =>
          `${x.nome} (área ${x.areaAntes}${x.areaAntes !== x.areaDepois ? ` -> ${x.areaDepois}` : ''})`,
      ),
    ),
    `  ${p.atualizar.length} já eram do edital (só atualiza):`,
    lista(p.atualizar),
    `Ao publicar, ${p.genericosQueSomem.length} cargos genéricos somem das listas (não são apagados):`,
    lista(p.genericosQueSomem),
    `Alunos que vão ver "Confirme seu cargo" ao publicar: ${p.alunosParaConfirmar}`,
    mudouArea.length
      ? `ATENÇÃO: ${mudouArea.length} cargos convertidos mudam de área.`
      : 'Nenhum cargo convertido muda de área.',
    'Nada muda em questões, trilha, progresso, XP, revisões, simulados, pagamentos ou áreas extras.',
  ].join('\n');
}
