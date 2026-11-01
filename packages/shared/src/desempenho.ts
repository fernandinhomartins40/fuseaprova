/**
 * D29: central de desempenho e treino inteligente.
 *
 * Cada tema (assunto da trilha) é classificado pelo domínio das últimas 30 tentativas
 * (`dominioDoAssunto`): forte, regular, fraco, pouco praticado ou ainda não visto.
 *
 * O treino inteligente monta 10 questões que nunca acabam, mesmo depois da trilha e da revisão:
 * erros vencidos da revisão, reforço dos temas fracos, temas pouco vistos e manutenção dos temas
 * fortes vistos há mais tempo (para não esquecer até a prova).
 */
import { embaralhar, type Rng } from './aleatorio.js';
import { MS_DIA } from './datas.js';
import { MINIMO_TENTATIVAS_DOMINIO } from './dominio-estudo.js';

export const CLASSES_TEMA = ['forte', 'regular', 'fraco', 'pouco_praticado', 'nao_visto'] as const;
export type ClasseTema = (typeof CLASSES_TEMA)[number];

/** Domínio a partir do qual o tema conta como forte (e o limite de regular). */
export const LIMITE_FORTE = 0.8;
export const LIMITE_REGULAR = 0.6;
export const TAMANHO_TREINO = 10;
/** Tema forte entra na manutenção quando está há pelo menos este tempo sem ser visto. */
export const DIAS_MANUTENCAO = 7;

export const NOMES_CLASSE_TEMA: Record<ClasseTema, string> = {
  forte: 'Você está bem',
  regular: 'Mais ou menos',
  fraco: 'Para aprimorar',
  pouco_praticado: 'Pouco praticados',
  nao_visto: 'Ainda não vistos',
};

export function classificarTema(d: { tentativas: number; valor: number | null }): ClasseTema {
  if (d.tentativas === 0) return 'nao_visto';
  if (d.valor === null || d.tentativas < MINIMO_TENTATIVAS_DOMINIO) return 'pouco_praticado';
  if (d.valor >= LIMITE_FORTE) return 'forte';
  if (d.valor >= LIMITE_REGULAR) return 'regular';
  return 'fraco';
}

export interface TemaParaTreino {
  assuntoId: string;
  classe: ClasseTema;
  /** Domínio 0–1 (null sem tentativas suficientes). */
  valor: number | null;
  ultimaEm: Date | null;
}

export type MotivoTreino = 'reforco' | 'novo' | 'manutencao';

export interface ItemPlanoTreino {
  assuntoId: string;
  quantidade: number;
  motivo: MotivoTreino;
}

export interface PlanoTreino {
  /** Questões da revisão vencida que entram (as mais atrasadas primeiro). */
  revisao: string[];
  temas: ItemPlanoTreino[];
}

/**
 * Plano do treino inteligente (D29), em vagas de questões:
 * - até 3 erros vencidos da revisão;
 * - reforço: os 2 temas mais fracos, 2 questões cada;
 * - novos: 2 temas pouco praticados ou ainda não vistos, 1 questão cada;
 * - manutenção: os 2 temas fortes ou regulares vistos há mais tempo (≥ 7 dias), 1 questão cada;
 * - o que sobrar vai para os temas mais fracos de novo (ou qualquer tema), até fechar o tamanho.
 */
export function planejarTreino(e: {
  vencidas: readonly string[];
  temas: readonly TemaParaTreino[];
  agora: Date;
  rng: Rng;
  tamanho?: number;
}): PlanoTreino {
  const tamanho = e.tamanho ?? TAMANHO_TREINO;
  const revisao = e.vencidas.slice(0, Math.min(3, tamanho));
  let vagas = tamanho - revisao.length;
  const itens = new Map<string, ItemPlanoTreino>();
  const pegar = (t: TemaParaTreino, n: number, motivo: MotivoTreino) => {
    const q = Math.min(n, vagas);
    if (q <= 0) return;
    const atual = itens.get(t.assuntoId);
    if (atual) atual.quantidade += q;
    else itens.set(t.assuntoId, { assuntoId: t.assuntoId, quantidade: q, motivo });
    vagas -= q;
  };

  const porValor = (a: TemaParaTreino, b: TemaParaTreino) => (a.valor ?? 0) - (b.valor ?? 0);
  const fracos = e.temas.filter((t) => t.classe === 'fraco').sort(porValor);
  const novos = embaralhar(
    e.temas.filter((t) => t.classe === 'pouco_praticado' || t.classe === 'nao_visto'),
    e.rng,
  ).sort((a, b) => Number(b.classe === 'pouco_praticado') - Number(a.classe === 'pouco_praticado'));
  const limiteManutencao = e.agora.getTime() - DIAS_MANUTENCAO * MS_DIA;
  const manutencao = e.temas
    .filter(
      (t) =>
        (t.classe === 'forte' || t.classe === 'regular') &&
        t.ultimaEm !== null &&
        t.ultimaEm.getTime() <= limiteManutencao,
    )
    .sort((a, b) => a.ultimaEm!.getTime() - b.ultimaEm!.getTime());

  for (const t of fracos.slice(0, 2)) pegar(t, 2, 'reforco');
  for (const t of novos.slice(0, 2)) pegar(t, 1, 'novo');
  for (const t of manutencao.slice(0, 2)) pegar(t, 1, 'manutencao');

  // Sobra: mais reforço nos fracos e regulares, depois os temas novos; com tudo forte, mantém
  // primeiro os vistos há mais tempo.
  const regulares = e.temas.filter((t) => t.classe === 'regular').sort(porValor);
  const fortes = e.temas
    .filter((t) => t.classe === 'forte')
    .sort((a, b) => (a.ultimaEm?.getTime() ?? 0) - (b.ultimaEm?.getTime() ?? 0));
  const resto = [...fracos, ...regulares, ...novos, ...fortes];
  const motivoDe = (t: TemaParaTreino): MotivoTreino =>
    t.classe === 'fraco' || t.classe === 'regular'
      ? 'reforco'
      : t.classe === 'forte'
        ? 'manutencao'
        : 'novo';
  for (let i = 0; vagas > 0 && resto.length > 0 && i < tamanho * 4; i++) {
    const t = resto[i % resto.length]!;
    pegar(t, 1, motivoDe(t));
  }
  return { revisao, temas: [...itens.values()] };
}

export type ProximoPasso = 'revisao' | 'trilha' | 'treino';

/**
 * O que a central sugere primeiro: revisão vencida; senão a trilha (enquanto houver lição);
 * com tudo em dia, o treino inteligente, que nunca acaba.
 */
export function proximoPasso(e: {
  revisoesPendentes: number;
  trilhaConcluida: boolean;
}): ProximoPasso {
  if (e.revisoesPendentes > 0) return 'revisao';
  if (!e.trilhaConcluida) return 'trilha';
  return 'treino';
}
