/**
 * D30: "Adicionar à agenda" sem permissão de calendário.
 *
 * Gera um arquivo .ics (RFC 5545) com o horário de estudo diário (no `lembrete_hora`, fuso de
 * São Paulo, com alarme na hora) e, se houver, o dia da prova (dia inteiro, com alarme na véspera).
 * O site baixa o arquivo; o app grava no cache e abre o compartilhamento do sistema. Também há o
 * link do Google Agenda, que abre o app ou o site do Google sem pedir nada.
 *
 * Sem nome de banca nem de prefeitura (D27): só "Fuse Aprova" e "Dia da prova".
 */
import { diaSP, somarDias, type Dia } from './datas.js';

export const NOME_ARQUIVO_AGENDA = 'fuse-aprova-estudos.ics';
export const DURACAO_ESTUDO_MIN = 20;
const TITULO_ESTUDO = 'Estudar no Fuse Aprova';
const TITULO_PROVA = 'Dia da prova';
const DOMINIO_UID = 'fuseaprova.com.br';

export interface EntradaAgenda {
  /** 'HH:MM' em São Paulo. */
  hora: string;
  agora: Date;
  /** Endereço que abre o app/site (vai na descrição do evento). */
  url: string;
  dataProva: Dia | null;
}

/** Escapa texto do iCalendar (barra, ponto e vírgula, vírgula e quebras de linha). */
export function escaparIcs(texto: string): string {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Dobra linhas em 75 octetos (RFC 5545, 3.1), sem partir caracteres UTF-8. */
export function dobrarLinhaIcs(linha: string): string {
  const enc = new TextEncoder();
  const partes: string[] = [];
  let atual = '';
  let tam = 0;
  for (const ch of linha) {
    const n = enc.encode(ch).length;
    const max = partes.length === 0 ? 75 : 74; // as continuações começam com um espaço
    if (tam + n > max) {
      partes.push(atual);
      atual = '';
      tam = 0;
    }
    atual += ch;
    tam += n;
  }
  partes.push(atual);
  return partes.join('\r\n ');
}

function soNumeros(dia: Dia): string {
  return dia.replace(/-/g, '');
}

function carimboUtc(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function horaLocal(hora: string, somarMin = 0): string {
  const [h, m] = hora.split(':').map(Number) as [number, number];
  const total = (h * 60 + m + somarMin) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}${String(total % 60).padStart(2, '0')}00`;
}

/** O estudo cruza a meia-noite? (ex.: 23:50 + 20 min) */
function viraODia(hora: string): boolean {
  const [h, m] = hora.split(':').map(Number) as [number, number];
  return h * 60 + m + DURACAO_ESTUDO_MIN >= 24 * 60;
}

/** O arquivo .ics com o estudo diário e o dia da prova. */
export function gerarIcsEstudo(e: EntradaAgenda): string {
  const hoje = diaSP(e.agora);
  const inicio = `${soNumeros(hoje)}T${horaLocal(e.hora)}`;
  const fimDia = viraODia(e.hora) ? somarDias(hoje, 1) : hoje;
  const fim = `${soNumeros(fimDia)}T${horaLocal(e.hora, DURACAO_ESTUDO_MIN)}`;
  const carimbo = carimboUtc(e.agora);
  const provaFutura = e.dataProva !== null && e.dataProva > hoje ? e.dataProva : null;
  const repeticao = provaFutura
    ? `RRULE:FREQ=DAILY;UNTIL=${soNumeros(provaFutura)}T025959Z` // 23:59:59 da véspera em SP
    : 'RRULE:FREQ=DAILY';
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fuse Aprova//Lembretes de estudo//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:America/Sao_Paulo',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:-03',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:estudo-diario@${DOMINIO_UID}`,
    `DTSTAMP:${carimbo}`,
    `DTSTART;TZID=America/Sao_Paulo:${inicio}`,
    `DTEND;TZID=America/Sao_Paulo:${fim}`,
    repeticao,
    `SUMMARY:${escaparIcs(TITULO_ESTUDO)}`,
    `DESCRIPTION:${escaparIcs(`Uma lição ou a revisão do dia. Abra: ${e.url}`)}`,
    `URL:${e.url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escaparIcs(TITULO_ESTUDO)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
  ];
  if (provaFutura) {
    linhas.push(
      'BEGIN:VEVENT',
      `UID:dia-da-prova-${provaFutura}@${DOMINIO_UID}`,
      `DTSTAMP:${carimbo}`,
      `DTSTART;VALUE=DATE:${soNumeros(provaFutura)}`,
      `DTEND;VALUE=DATE:${soNumeros(somarDias(provaFutura, 1))}`,
      `SUMMARY:${escaparIcs(TITULO_PROVA)}`,
      `DESCRIPTION:${escaparIcs('Boa prova! Confira o local e o horário no edital.')}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escaparIcs('Amanhã é o dia da prova')}`,
      'TRIGGER:-PT12H',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  linhas.push('END:VCALENDAR');
  return `${linhas.map(dobrarLinhaIcs).join('\r\n')}\r\n`;
}

/** Link do Google Agenda para criar o estudo diário (sem login no Fuse, sem permissão). */
export function linkGoogleAgenda(e: EntradaAgenda): string {
  const hoje = diaSP(e.agora);
  const fimDia = viraODia(e.hora) ? somarDias(hoje, 1) : hoje;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: TITULO_ESTUDO,
    details: `Uma lição ou a revisão do dia. Abra: ${e.url}`,
    dates: `${soNumeros(hoje)}T${horaLocal(e.hora)}/${soNumeros(fimDia)}T${horaLocal(e.hora, DURACAO_ESTUDO_MIN)}`,
    ctz: 'America/Sao_Paulo',
    recur: 'RRULE:FREQ=DAILY',
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
