/**
 * Formatação para a interface (pt-BR).
 */
import { MS_HORA, MS_MINUTO, MS_SEGUNDO } from './datas.js';

/** "R$ 397,00" a partir de centavos. */
export function formatarReais(centavos: number): string {
  const reais = Math.trunc(centavos / 100);
  const cent = Math.abs(centavos % 100);
  const milhar = Math.abs(reais)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${centavos < 0 ? '-' : ''}R$ ${milhar},${String(cent).padStart(2, '0')}`;
}

/** Valor em reais para a API do Asaas (397.00). */
export function centavosParaReais(centavos: number): number {
  return Math.round(centavos) / 100;
}

/** "197", "197,5", "R$ 1.297,90" → centavos. Texto que não é valor → null. */
export function reaisParaCentavos(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpo)) return null;
  const [inteiro, frac = ''] = limpo.replace(/\./g, '').split(',');
  return Number(inteiro) * 100 + Number(frac.padEnd(2, '0'));
}

/** Duração legível: "3 h 20 min", "45 min", "menos de 1 min". */
export function formatarDuracao(ms: number): string {
  const totalMin = Math.ceil(Math.max(0, ms) / MS_MINUTO);
  if (totalMin <= 0) return 'menos de 1 min';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Relógio "3:59:07" ou "04:12" (sem horas). */
export function formatarCronometro(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / MS_SEGUNDO);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Tempo da lição para o cartão TEMPO: "2:35" (min:seg) ou "1 h 05 min". */
export function formatarTempoLicao(ms: number): string {
  if (ms >= MS_HORA) {
    const h = Math.floor(ms / MS_HORA);
    const m = Math.floor((ms % MS_HORA) / MS_MINUTO);
    return `${h} h ${String(m).padStart(2, '0')} min`;
  }
  const total = Math.floor(Math.max(0, ms) / MS_SEGUNDO);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Iniciais para o avatar: "Marina Souza" → "MS". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0]!.charAt(0);
  const ultima = partes.length > 1 ? partes[partes.length - 1]!.charAt(0) : '';
  return (primeira + ultima).toUpperCase();
}

/** "Marina Souza Lima" → "Marina S. L." (nome com sobrenomes abreviados, para o Perfil). */
export function nomeComSobrenomeAbreviado(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return partes[0] ?? '';
  const preposicoes = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
  const resto = partes
    .slice(1)
    .filter((p) => !preposicoes.has(p.toLowerCase()))
    .map((p) => `${p.charAt(0).toUpperCase()}.`);
  return [partes[0], ...resto].join(' ');
}

/** Cores de avatar (texto branco com contraste AA). */
export const CORES_AVATAR = [
  '#00545D',
  '#008A92',
  '#C2410C',
  '#15803D',
  '#1D6FE0',
  '#6D3FE0',
  '#B91C1C',
  '#A16207',
] as const;

/** Cor derivada do id (estável). */
export function corDoAvatar(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CORES_AVATAR[h % CORES_AVATAR.length]!;
}

/** Normaliza texto para slug: "Crase e Regência" → "crase-e-regencia". */
export function slugificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
