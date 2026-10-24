/**
 * Conteúdo: /concurso, /trilha, /guia/:unidadeId (PRD 5.6, 5.7, 7). Guarda: exigirAcesso.
 */
import { z } from 'zod';
import {
  CargoResumo,
  Dia,
  DicaLicao,
  DisciplinaResumo,
  LinkOficial,
  Uuid,
  ZAreaCargo,
  ZStatusConcurso,
  ZTipoLicao,
} from './comum.js';

/** Cartão de área para o onboarding (passo 1), antes do edital. */
export const AreaOnboarding = z.object({
  area: ZAreaCargo,
  nome: z.string(),
  exemplos: z.array(z.string()),
});

/** GET /concurso */
export const ConcursoResposta = z.object({
  id: Uuid,
  nome: z.string(),
  /** "PAL · FAU" */
  sigla: z.string(),
  banca: z.string(),
  orgao: z.string(),
  municipio: z.string(),
  uf: z.string(),
  ano: z.number().int(),
  status: ZStatusConcurso,
  statusTexto: z.string(),
  dataProva: Dia.nullable(),
  /** Dias até a prova (contagem regressiva), null sem data. */
  diasParaProva: z.number().int().nullable(),
  links: z.array(LinkOficial),
  /** Modo edital ligado (edital publicado). */
  modoEdital: z.boolean(),
  cargos: z.array(CargoResumo),
  areas: z.array(AreaOnboarding),
  avisoEdital: z.string(),
});
export type ConcursoResposta = z.infer<typeof ConcursoResposta>;

export const EstadoNo = z.enum(['concluida', 'atual', 'bloqueada']);

export const LicaoTrilha = z.object({
  id: Uuid,
  ordem: z.number().int(),
  tipo: ZTipoLicao,
  tamanho: z.number().int(),
  titulo: z.string(),
  estado: EstadoNo,
  /** Vezes concluída (o anel mostra até 3). */
  vezes: z.number().int(),
  anel: z.number().min(0).max(1),
  podeAbrir: z.boolean(),
  melhorPrecisao: z.number().int().min(0).max(100).nullable(),
});
export type LicaoTrilha = z.infer<typeof LicaoTrilha>;

export const SecaoTrilha = z.object({
  id: Uuid,
  ordem: z.number().int(),
  titulo: z.string(),
  assuntoId: Uuid,
  /** Selo "No edital" / "Fora do edital" no modo edital; null antes do edital. */
  noEdital: z.boolean().nullable(),
  licoes: z.array(LicaoTrilha),
});
export type SecaoTrilha = z.infer<typeof SecaoTrilha>;

export const UnidadeTrilha = z.object({
  id: Uuid,
  /** Número exibido no banner ("UNIDADE n"). */
  numero: z.number().int(),
  ordem: z.number().int(),
  titulo: z.string(),
  area: ZAreaCargo.nullable(),
  disciplina: DisciplinaResumo,
  /** Desafio da unidade aprovado (coroa). */
  coroada: z.boolean(),
  secoes: z.array(SecaoTrilha),
});
export type UnidadeTrilha = z.infer<typeof UnidadeTrilha>;

/** GET /trilha — unidades, seções e lições com o estado do aluno. */
export const TrilhaResposta = z.object({
  area: ZAreaCargo.nullable(),
  unidades: z.array(UnidadeTrilha),
  atual: z.object({ unidadeId: Uuid, secaoId: Uuid, licaoId: Uuid }).nullable(),
  /** Frase contextual da Capi ("Faltam 2 lições para o baú!"). */
  fraseCapi: z.string(),
  licoesAteBau: z.number().int().nullable(),
  versaoConteudo: z.number().int(),
});
export type TrilhaResposta = z.infer<typeof TrilhaResposta>;

export const GuiaUnidadeParams = z.object({ unidadeId: Uuid });

/** GET /guia/:unidadeId — dicas de todas as lições da unidade, para ler sem responder. */
export const GuiaResposta = z.object({
  unidade: z.object({ id: Uuid, titulo: z.string(), disciplina: DisciplinaResumo }),
  secoes: z.array(
    z.object({
      id: Uuid,
      titulo: z.string(),
      noEdital: z.boolean().nullable(),
      /** Fora do edital: saiu da trilha mas continua no Guia. */
      naTrilha: z.boolean(),
      dicas: z.array(DicaLicao.extend({ licaoId: Uuid.nullable() })),
    }),
  ),
});
export type GuiaResposta = z.infer<typeof GuiaResposta>;
