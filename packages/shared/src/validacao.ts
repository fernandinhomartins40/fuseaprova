/**
 * Validações de formulário usadas no cadastro (PRD 5.2), no front e na API.
 */

export const SENHA_MINIMA = 8;

/** Nome com 2 ou mais palavras (cada uma com 2+ letras, exceto preposições curtas). */
export function validarNomeCompleto(nome: string): boolean {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length < 2) return false;
  return partes.filter((p) => /\p{L}{2,}/u.test(p)).length >= 2;
}

/** E-mail com formato razoável (usuário@domínio.tld). */
export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validarSenha(senha: string): boolean {
  return senha.length >= SENHA_MINIMA;
}

/** "HH:MM" de 00:00 a 23:59. */
export function validarHora(hora: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}

export interface QuestaoParaPublicar {
  enunciado: string;
  alternativas: readonly { letra: string; texto: string }[];
  gabarito: string;
  explicacao: string | null;
  dicaBolso: string | null;
  /** Dica da questão ou, na falta, a dica do assunto. */
  dica: string | null;
  revisadoPor: string | null;
}

/** Pendências que impedem publicar (PRD 7.4: sem dica, explicação e revisão humana não publica). */
export function pendenciasParaPublicar(q: QuestaoParaPublicar): string[] {
  const p: string[] = [];
  if (!q.enunciado.trim()) p.push('Falta o enunciado.');
  const letras = q.alternativas.map((a) => a.letra).join('');
  if (letras !== 'ABCDE' || q.alternativas.some((a) => !a.texto.trim())) {
    p.push('A questão precisa de 5 alternativas (A a E) preenchidas.');
  }
  if (!'ABCDE'.includes(q.gabarito) || q.gabarito.length !== 1) p.push('Falta o gabarito.');
  if (!q.explicacao?.trim()) p.push('Falta a explicação.');
  if (!q.dica?.trim()) p.push('Falta a dica.');
  if (!q.dicaBolso?.trim()) p.push('Falta a dica de bolso.');
  if (!q.revisadoPor) p.push('Falta a revisão humana no painel.');
  return p;
}

/** Número de reports abertos que retira a questão do ar automaticamente. */
export const LIMITE_REPORTS_AUTO_RETIRADA = 3;

export function deveAutoRetirar(reportsAbertos: number): boolean {
  return reportsAbertos >= LIMITE_REPORTS_AUTO_RETIRADA;
}

/** Prazo do direito de arrependimento (CDC art. 49). */
export const DIAS_ARREPENDIMENTO = 7;

export function dentroDoArrependimento(pagoEm: Date, agora: Date): boolean {
  return agora.getTime() - pagoEm.getTime() <= DIAS_ARREPENDIMENTO * 24 * 60 * 60 * 1000;
}
