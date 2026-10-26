/**
 * Textos-chave (PRD 11) e frases usadas em mais de um lugar.
 * Mensagens de erro da API ficam em `api/erros.ts`.
 */
import { escolher, rngPadrao, type Rng } from './aleatorio.js';
import type { Letra } from './dominio.js';

export const NOME_PRODUTO = 'Fuse Aprova';

export const AVISO_EDITAL =
  'Quando o edital de Palmital sair, as trilhas e os simulados se ajustam ao seu cargo, sem custo extra.';

export const RODAPE_LEGAL =
  'Fuse Aprova não tem vínculo com a FAU-Unicentro nem com a Prefeitura de Palmital.';

export const TITULOS_ACERTO = [
  'Mandou bem!',
  'Isso aí!',
  'Certinho!',
  'Boa, {nome}!',
  'Tá voando!',
] as const;

/** Primeiro nome, para "Boa, Marina!". */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? '';
}

/** Título da folha de acerto, sorteado entre as variações. */
export function tituloAcerto(nome: string | null | undefined, rng: Rng = rngPadrao): string {
  const pn = nome ? primeiroNome(nome) : '';
  const opcoes = pn ? TITULOS_ACERTO : TITULOS_ACERTO.filter((t) => !t.includes('{nome}'));
  return escolher(opcoes, rng)!.replace('{nome}', pn);
}

/** Título da folha de erro: sempre "Resposta correta: X", sem frases de culpa. */
export function tituloErro(gabarito: Letra): string {
  return `Resposta correta: ${gabarito}`;
}

export const LINHA_REVISAO_AMANHA = 'Essa questão volta na sua revisão amanhã';

export const TEXTO_REVISAO_VAZIA = 'Nada para revisar hoje. Que tal uma lição nova?';
export const TEXTO_LIGA_VAZIA = 'Complete 1 lição para entrar na liga desta semana';
export const TEXTO_SAIR_LICAO = 'Quer mesmo sair? Você perde o progresso desta lição.';
export const TEXTO_PIX_STATUS =
  'Aguardando pagamento… o acesso libera sozinho assim que o Pix cair';
export const TEXTO_PIX_EXPIRADO = 'Esse Pix expirou.';
export const TEXTO_PIX_ERRO =
  'Não foi possível gerar o Pix agora. Tente de novo em alguns minutos.';
export const TEXTO_EDITAL_SAIU = 'O edital saiu! Confirme seu cargo';
export const TEXTO_OFENSIVA_ZEROU = 'Sua ofensiva zerou';
export const TEXTO_PROTETOR_SALVOU = 'O protetor salvou sua ofensiva!';
export const TITULO_BOAS_VINDAS =
  'Treine para o concurso da Prefeitura de Palmital com as provas da FAU';

export const LEMBRETES_PUSH = [
  'A Capi está te esperando. 5 minutinhos e a ofensiva continua!',
  'Sua ofensiva de {n} dias está em risco.',
] as const;

/** Texto do lembrete diário. Com ofensiva ≥ 2, avisa o risco. */
export function textoLembrete(ofensiva: number): string {
  return ofensiva >= 2 ? LEMBRETES_PUSH[1].replace('{n}', String(ofensiva)) : LEMBRETES_PUSH[0];
}

export function textoTerminaEmDias(dias: number): string {
  if (dias <= 1) return 'termina hoje';
  return `termina em ${dias} dias`;
}

export function textoRegraLiga(dias: number): string {
  return `Os 3 primeiros sobem de liga · ${textoTerminaEmDias(dias)}`;
}

export function textoQuestoesParaHoje(n: number): string {
  return n === 1 ? '1 questão para hoje' : `${n} questões para hoje`;
}

export function textoFaltamParaBau(n: number): string {
  return n === 1 ? 'Falta 1 lição para o baú!' : `Faltam ${n} lições para o baú!`;
}

/** Frase motivacional da tela de Ofensiva. */
export function fraseOfensiva(ofensiva: number): string {
  if (ofensiva <= 1) return 'Começou! Volte amanhã para manter a chama acesa.';
  if (ofensiva < 7) return 'Constância é o que aprova. Continue assim!';
  if (ofensiva < 30) return 'Você está criando o hábito. A prova sente isso!';
  return 'Ofensiva de respeito! Ninguém segura você.';
}

export interface OrigemExibicao {
  origem: 'fau_real' | 'autoral';
  orgao?: string | null;
  ano?: number | null;
}

/** Chip de origem: "FAU-Unicentro · {Órgão} · {Ano}" ou "Questão Fuse Aprova · estilo FAU". */
export function textoChipOrigem(o: OrigemExibicao): string {
  if (o.origem === 'autoral') return 'Questão Fuse Aprova · estilo FAU';
  return ['FAU-Unicentro', o.orgao, o.ano ? String(o.ano) : null].filter(Boolean).join(' · ');
}

/** Status do edital para o cartão do Perfil. */
export function textoStatusEdital(
  status: 'aguardando_edital' | 'edital_publicado' | 'prova_realizada' | 'homologado',
  dataProvaBR?: string | null,
): string {
  if (dataProvaBR && (status === 'edital_publicado' || status === 'aguardando_edital')) {
    return `prova em ${dataProvaBR}`;
  }
  switch (status) {
    case 'aguardando_edital':
      return 'em elaboração pela FAU';
    case 'edital_publicado':
      return 'publicado: veja seus cargos';
    case 'prova_realizada':
      return 'prova realizada';
    case 'homologado':
      return 'concurso homologado';
  }
}
