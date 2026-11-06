import { FPS } from './tema';

export const T = 12; // duração de cada transição, em quadros
const ENTRADA = 8; // do início da cena até a primeira fala
const INTERVALO = 3; // entre falas da mesma cena
const SAIDA = T + 5; // depois da última fala (a transição come parte disso)
const MARCA = 50; // quadro final com a logo, sem narração

export type Fala = { arquivo: string; ini: number; fim: number };
export type Cena = { nome: string; inicio: number; duracao: number; falas: Fala[] };
export type Narracao = Record<string, { arquivo: string; segundos: number }[]>;
export type Linha = { cenas: Cena[]; duracao: number; volumeTrilha: (quadro: number) => number };

/**
 * Monta a linha do tempo a partir da narração: cada fala é um clipe, a cena dura o que suas falas duram
 * e termina no quadro final com a logo. `minimo` dá tempo mínimo por fala numa cena (ex.: vitrine de telas).
 */
export const montarLinha = (narracao: Narracao, ordem: string[], minimo: Record<string, number> = {}, comMarca = true): Linha => {
  const cenas: Cena[] = [];
  let inicio = 0;
  for (const nome of ordem) {
    let f = ENTRADA;
    const falas = narracao[nome].map((c) => {
      const quadros = Math.ceil(c.segundos * FPS);
      const fala = { arquivo: c.arquivo, ini: f, fim: f + quadros };
      f += Math.max(quadros + INTERVALO, minimo[nome] ?? 0);
      return fala;
    });
    const duracao = falas[falas.length - 1].fim + SAIDA;
    cenas.push({ nome, inicio, duracao, falas });
    inicio += duracao - T;
  }
  // Videoaula do app: sem o quadro da logo; o vídeo acaba no fim da última cena.
  if (comMarca) cenas.push({ nome: 'marca', inicio, duracao: MARCA, falas: [] });
  const duracao = comMarca ? inicio + MARCA : inicio + T;

  // Volume da trilha por quadro: abaixa enquanto a narração fala.
  const ALTO = 0.42;
  const BAIXO = 0.1;
  const falando = new Uint8Array(duracao);
  for (const c of cenas) for (const fa of c.falas) falando.fill(1, c.inicio + fa.ini, c.inicio + fa.fim);
  const volumeTrilha = (quadro: number): number => {
    let perto = 99;
    for (let d = -6; d <= 6; d++) if (falando[quadro + d]) perto = Math.min(perto, Math.abs(d));
    const v = perto === 99 ? ALTO : BAIXO + ((ALTO - BAIXO) * perto) / 7;
    const fim = Math.min(1, (duracao - quadro) / 30);
    return v * Math.max(0, fim);
  };
  return { cenas, duracao, volumeTrilha };
};
