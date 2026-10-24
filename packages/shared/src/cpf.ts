/**
 * CPF: validação dos dígitos verificadores, máscara de digitação e
 * mascaramento para logs e admin (`***.123.456-**`, PRD 8.8).
 */

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D+/g, '');
}

export function limparCpf(valor: string): string {
  return somenteDigitos(valor).slice(0, 11);
}

function digitoVerificador(base: string): number {
  let soma = 0;
  for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

/** CPF válido: 11 dígitos, não repetidos, com os dois dígitos verificadores corretos. */
export function validarCpf(valor: string): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const d1 = digitoVerificador(cpf.slice(0, 9));
  const d2 = digitoVerificador(cpf.slice(0, 10));
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

/** Máscara progressiva de digitação: "12345" → "123.45", "12345678909" → "123.456.789-09". */
export function formatarCpf(valor: string): string {
  const d = limparCpf(valor);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** CPF oculto para logs e painel: "***.456.789-**" (mostra só os dígitos 4 a 9). */
export function ocultarCpf(valor: string): string {
  const d = limparCpf(valor);
  if (d.length !== 11) return '***.***.***-**';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/** Gera um CPF válido a partir de 9 dígitos-base (útil em testes e no seed). */
export function completarCpf(base9: string): string {
  const base = somenteDigitos(base9).slice(0, 9).padStart(9, '0');
  const d1 = digitoVerificador(base);
  const d2 = digitoVerificador(base + d1);
  return `${base}${d1}${d2}`;
}
