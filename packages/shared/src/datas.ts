/**
 * Datas no fuso America/Sao_Paulo, só com Intl (sem bibliotecas).
 *
 * Convenções:
 * - `Dia` é uma string 'AAAA-MM-DD' que representa um dia civil em São Paulo
 *   (é o formato de colunas `date` do Postgres).
 * - Instantes são `Date` (timestamptz no banco).
 * - A semana vai de segunda 00:00 a domingo 23:59:59 (regra da liga, PRD 6.7).
 */

export const FUSO = 'America/Sao_Paulo';

export const MS_SEGUNDO = 1000;
export const MS_MINUTO = 60 * MS_SEGUNDO;
export const MS_HORA = 60 * MS_MINUTO;
export const MS_DIA = 24 * MS_HORA;

/** 'AAAA-MM-DD' */
export type Dia = string;

const RE_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

const formatador = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export interface PartesData {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
}

/** Componentes do relógio de parede de São Paulo para um instante. */
export function partesSP(instante: Date): PartesData {
  const p: Record<string, number> = {};
  for (const parte of formatador.formatToParts(instante)) {
    if (parte.type !== 'literal') p[parte.type] = Number(parte.value);
  }
  return {
    ano: p.year!,
    mes: p.month!,
    dia: p.day!,
    hora: p.hour!,
    minuto: p.minute!,
    segundo: p.second!,
  };
}

/** Diferença (ms) entre o relógio de São Paulo e o UTC naquele instante (ex.: -3 h). */
export function deslocamentoSP(instante: Date): number {
  const p = partesSP(instante);
  const comoUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  const truncado = Math.floor(instante.getTime() / MS_SEGUNDO) * MS_SEGUNDO;
  return comoUtc - truncado;
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function montarDia(ano: number, mes: number, dia: number): Dia {
  return `${String(ano).padStart(4, '0')}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

/** Valida o formato 'AAAA-MM-DD' e se a data existe no calendário. */
export function ehDiaValido(valor: string): boolean {
  const m = RE_DIA.exec(valor);
  if (!m) return false;
  const [, a, me, d] = m.map(Number) as [number, number, number, number];
  const data = new Date(Date.UTC(a, me - 1, d));
  return data.getUTCFullYear() === a && data.getUTCMonth() === me - 1 && data.getUTCDate() === d;
}

function separarDia(dia: Dia): [number, number, number] {
  if (!ehDiaValido(dia)) throw new RangeError(`Dia inválido: ${dia}`);
  const [a, m, d] = dia.split('-').map(Number) as [number, number, number];
  return [a, m, d];
}

/** O dia civil em São Paulo para um instante. */
export function diaSP(instante: Date): Dia {
  const p = partesSP(instante);
  return montarDia(p.ano, p.mes, p.dia);
}

/** Instante de 00:00 em São Paulo do dia informado. */
export function inicioDoDiaSP(dia: Dia): Date {
  const [a, m, d] = separarDia(dia);
  const palpite = Date.UTC(a, m - 1, d);
  const desloc1 = deslocamentoSP(new Date(palpite));
  const t = palpite - desloc1;
  const desloc2 = deslocamentoSP(new Date(t));
  // Em transição de horário de verão os dois palpites diferem; vale o mais cedo
  // que ainda cai no dia pedido (num "buraco" à meia-noite, o dia começa à 01:00).
  const candidatos = [t, palpite - desloc2].filter((c) => diaSP(new Date(c)) === dia);
  return new Date(Math.min(...candidatos));
}

/** Meia-noite (00:00 em São Paulo) que inicia o dia do instante. */
export function meiaNoiteSP(instante: Date): Date {
  return inicioDoDiaSP(diaSP(instante));
}

/** Próxima meia-noite em São Paulo depois do instante. */
export function proximaMeiaNoiteSP(instante: Date): Date {
  return inicioDoDiaSP(somarDias(diaSP(instante), 1));
}

/** Soma (ou subtrai) dias corridos a um dia civil. */
export function somarDias(dia: Dia, dias: number): Dia {
  const [a, m, d] = separarDia(dia);
  const data = new Date(Date.UTC(a, m - 1, d + dias));
  return montarDia(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate());
}

/** Quantos dias de `b` até `a` (a − b). */
export function diferencaDias(a: Dia, b: Dia): number {
  const [aa, am, ad] = separarDia(a);
  const [ba, bm, bd] = separarDia(b);
  return Math.round((Date.UTC(aa, am - 1, ad) - Date.UTC(ba, bm - 1, bd)) / MS_DIA);
}

/** Dia da semana: 0 = domingo … 6 = sábado. */
export function diaDaSemana(dia: Dia): number {
  const [a, m, d] = separarDia(dia);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** A segunda-feira da semana (seg–dom) que contém o dia. */
export function segundaDaSemana(dia: Dia): Dia {
  const dds = diaDaSemana(dia);
  const recuo = dds === 0 ? 6 : dds - 1;
  return somarDias(dia, -recuo);
}

/** A segunda-feira (coluna `semana`) da semana do instante, em São Paulo. */
export function semanaSP(instante: Date): Dia {
  return segundaDaSemana(diaSP(instante));
}

/** Os 7 dias (seg → dom) da semana que começa na segunda informada. */
export function diasDaSemana(segunda: Dia): Dia[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}

/** Instante de início da semana (segunda 00:00 em São Paulo). */
export function inicioSemanaSP(instante: Date): Date {
  return inicioDoDiaSP(semanaSP(instante));
}

/** Instante em que a semana termina (a segunda seguinte, 00:00, exclusivo). */
export function fimSemanaSP(instante: Date): Date {
  return inicioDoDiaSP(somarDias(semanaSP(instante), 7));
}

/** Dias que faltam para a semana fechar, contando o dia de hoje (domingo = 1). */
export function diasParaFimDaSemana(instante: Date): number {
  return diferencaDias(somarDias(semanaSP(instante), 7), diaSP(instante));
}

/** 'dd/mm/aaaa' */
export function formatarDataBR(dia: Dia): string {
  const [a, m, d] = separarDia(dia);
  return `${doisDigitos(d)}/${doisDigitos(m)}/${a}`;
}

/** 'dd/mm' */
export function formatarDiaMes(dia: Dia): string {
  return formatarDataBR(dia).slice(0, 5);
}

/** 'HH:MM' no relógio de São Paulo. */
export function horaMinutoSP(instante: Date): string {
  const p = partesSP(instante);
  return `${doisDigitos(p.hora)}:${doisDigitos(p.minuto)}`;
}

/** Converte 'dd/mm/aaaa' em Dia, ou null se inválido. */
export function lerDataBR(texto: string): Dia | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const dia = `${m[3]}-${m[2]}-${m[1]}`;
  return ehDiaValido(dia) ? dia : null;
}
