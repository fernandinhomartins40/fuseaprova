/**
 * D49: preparatório de redação. Regras puras da folha (linhas), da cota de correções e da nota,
 * seguindo o Edital nº 01/2026 de Palmital (itens 10.28 a 10.41 e Tabela 10.1).
 */
import { inicioSemanaSP, fimSemanaSP } from './datas.js';

/** Item 10.31: "texto dissertativo-argumentativo ... de 20 a 30 linhas". */
export const LINHAS_MIN_REDACAO = 20;
export const LINHAS_MAX_REDACAO = 30;
/**
 * Caracteres que cabem numa linha da folha manuscrita (cerca de 10 a 12 palavras).
 * shortcut: estimativa fixa; a letra de cada um muda isso, por isso a tela diz "cerca de".
 */
export const CARACTERES_POR_LINHA = 68;
/** Recuo de parágrafo, em caracteres, como na folha. */
const RECUO = 3;
/** Abaixo disso não vale gastar uma correção: o texto ainda não é uma redação. */
export const LINHAS_MIN_PARA_CORRIGIR = 8;
/** Teto do texto aceito (folga sobre as 30 linhas, para o aluno ver que passou). */
export const CARACTERES_MAX_REDACAO = 4000;
/** D49: correções por IA por aluno, por semana (segunda a domingo, em São Paulo). */
export const CORRECOES_POR_SEMANA = 3;

/** Tabela 10.1 do edital: aspectos e pontuação máxima (total 100). */
export const ASPECTOS_REDACAO = [
  { chave: 'conteudo', nome: 'Conteúdo', max: 50 },
  { chave: 'estrutura', nome: 'Estrutura', max: 40 },
  { chave: 'expressao', nome: 'Expressão', max: 10 },
] as const;
export type AspectoRedacao = (typeof ASPECTOS_REDACAO)[number]['chave'];

/**
 * Linhas que o texto ocupa na folha: cada parágrafo começa com recuo e quebra por palavra em
 * CARACTERES_POR_LINHA. Linhas em branco entre parágrafos não contam (na folha não se pula linha).
 */
export function contarLinhas(texto: string, porLinha = CARACTERES_POR_LINHA): number {
  let total = 0;
  for (const paragrafo of texto.split(/\n+/)) {
    const palavras = paragrafo.trim().split(/\s+/).filter(Boolean);
    if (palavras.length === 0) continue;
    let linhas = 1;
    let ocupado = RECUO;
    let vazia = true;
    for (const p of palavras) {
      let resto = p.length;
      if (ocupado + (vazia ? 0 : 1) + resto <= porLinha) {
        ocupado += (vazia ? 0 : 1) + resto;
        vazia = false;
        continue;
      }
      if (!vazia) {
        linhas++;
        ocupado = 0;
      }
      // palavra maior que a linha inteira ocupa as linhas que precisar
      while (ocupado + resto > porLinha) {
        resto -= porLinha - ocupado;
        linhas++;
        ocupado = 0;
      }
      ocupado += resto;
      vazia = false;
    }
    total += linhas;
  }
  return total;
}

export type SituacaoLinhas = 'curta' | 'ok' | 'longa';

/** Dentro de 20 a 30 linhas, abaixo ou acima. */
export function situacaoLinhas(linhas: number): SituacaoLinhas {
  if (linhas < LINHAS_MIN_REDACAO) return 'curta';
  if (linhas > LINHAS_MAX_REDACAO) return 'longa';
  return 'ok';
}

/** Cota da semana: quantas correções ainda cabem e quando renova (próxima segunda, 0h SP). */
export function cotaRedacao(usadasNaSemana: number, agora: Date) {
  const usadas = Math.max(0, usadasNaSemana);
  return {
    usadas,
    limite: CORRECOES_POR_SEMANA,
    restantes: Math.max(0, CORRECOES_POR_SEMANA - usadas),
    desde: inicioSemanaSP(agora),
    renovaEm: fimSemanaSP(agora),
  };
}

/** Prende cada aspecto entre 0 e o máximo da Tabela 10.1 (inteiro) e soma. Nota zerada vale 0. */
export function notaRedacao(
  notas: Record<AspectoRedacao, number>,
  zerada: boolean,
): { notas: Record<AspectoRedacao, number>; total: number } {
  const limpas = Object.fromEntries(
    ASPECTOS_REDACAO.map((a) => {
      const v = Number.isFinite(notas[a.chave]) ? Math.round(notas[a.chave]) : 0;
      return [a.chave, zerada ? 0 : Math.min(a.max, Math.max(0, v))];
    }),
  ) as Record<AspectoRedacao, number>;
  return { notas: limpas, total: limpas.conteudo + limpas.estrutura + limpas.expressao };
}
