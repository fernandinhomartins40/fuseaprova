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

/* ----------------------------------------------------------- força da senha */

export type NivelSenha = 0 | 1 | 2 | 3 | 4;

export interface CriterioSenha {
  id: 'tamanho' | 'maiusculas' | 'numero' | 'simbolo';
  texto: string;
  ok: boolean;
  /** O servidor exige (tamanho mínimo); os demais só deixam a senha mais forte. */
  obrigatorio: boolean;
}

export interface AvaliacaoSenha {
  /** 0 muito fraca · 1 fraca · 2 razoável · 3 boa · 4 forte. */
  nivel: NivelSenha;
  rotulo: string;
  /** Atende ao mínimo que a API exige (SENHA_MINIMA). */
  aceita: boolean;
  criterios: CriterioSenha[];
  /** Frase curta com o que melhorar mais rápido; null quando já está forte. */
  dica: string | null;
}

export const ROTULOS_SENHA = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'] as const;

/** Senhas que aparecem em todas as listas de vazamento (e variações brasileiras comuns). */
const SENHAS_COMUNS = new Set([
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234',
  'password', 'password1', 'senha123', 'senha1234', 'senha12345', 'minhasenha', 'mudar123',
  'qwertyui', 'qwerty123', 'abcd1234', 'abc12345', 'abcdefgh', 'iloveyou', 'admin123',
  'brasil123', 'brasil2026', 'futebol1', 'flamengo', 'corinthians', 'palmeiras', 'concurso',
  'concurso123', 'palmital', 'palmital123', 'fuseaprova', 'fuseaprova1',
]);

/** Só um caractere repetido ("aaaaaaaa") ou uma sequência óbvia ("abcdefgh", "12345678"). */
function ehPadraoObvio(senha: string): boolean {
  if (new Set(senha).size === 1) return true;
  const passos = [...senha].slice(1).map((c, i) => c.charCodeAt(0) - senha.charCodeAt(i));
  return passos.every((p) => p === 1) || passos.every((p) => p === -1);
}

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Avalia a senha só para orientar quem digita (a API só exige SENHA_MINIMA caracteres).
 * `pessoal`: e-mail e nome já digitados; senha que os contém perde força.
 */
export function avaliarSenha(senha: string, pessoal: readonly string[] = []): AvaliacaoSenha {
  const maiusculasEMinusculas = /\p{Lu}/u.test(senha) && /\p{Ll}/u.test(senha);
  const numero = /\d/.test(senha);
  const simbolo = /[^\p{L}\d]/u.test(senha);
  const criterios: CriterioSenha[] = [
    { id: 'tamanho', texto: `Pelo menos ${SENHA_MINIMA} caracteres`, ok: senha.length >= SENHA_MINIMA, obrigatorio: true },
    { id: 'maiusculas', texto: 'Letras maiúsculas e minúsculas', ok: maiusculasEMinusculas, obrigatorio: false },
    { id: 'numero', texto: 'Um número', ok: numero, obrigatorio: false },
    { id: 'simbolo', texto: 'Um símbolo (! ? # @)', ok: simbolo, obrigatorio: false },
  ];
  const aceita = criterios[0]!.ok;
  const minuscula = semAcento(senha);
  const comum = SENHAS_COMUNS.has(minuscula);
  const previsivel = senha.length > 0 && ehPadraoObvio(senha);
  // Cada palavra do nome e do começo do e-mail (marina.souza@x.com → marina, souza), com 4+ letras.
  const termosPessoais = pessoal
    .flatMap((t) => semAcento(t.split('@')[0] ?? '').split(/[^a-z0-9]+/))
    .filter((t) => t.length >= 4);
  const usaDadoPessoal = termosPessoais.some((t) => minuscula.includes(t));

  let nivel: NivelSenha;
  let dica: string | null = null;
  if (!aceita) {
    nivel = 0;
    dica = senha.length === 0 ? null : `Faltam ${SENHA_MINIMA - senha.length} caracteres.`;
  } else if (comum || previsivel) {
    nivel = 0;
    dica = 'Essa senha é muito comum. Misture palavras, números e símbolos.';
  } else {
    const classes = [/\p{Ll}/u.test(senha), /\p{Lu}/u.test(senha), numero, simbolo].filter(Boolean).length;
    const pontos =
      1 + (senha.length >= 12 ? 1 : 0) + (senha.length >= 16 ? 1 : 0) + Math.min(3, classes - 1);
    nivel = pontos >= 5 ? 4 : pontos === 4 ? 3 : pontos === 3 ? 2 : 1;
    if (usaDadoPessoal) {
      nivel = Math.min(nivel, 1) as NivelSenha;
      dica = 'Evite usar seu nome ou e-mail na senha.';
    } else if (nivel < 4) {
      const falta = criterios.find((c) => !c.obrigatorio && !c.ok);
      dica = senha.length < 12 ? 'Senhas com 12 ou mais caracteres são bem mais fortes.' : (falta?.texto ?? null);
    }
  }
  return { nivel, rotulo: ROTULOS_SENHA[nivel], aceita, criterios, dica };
}

export type SituacaoConfirmacao = 'vazia' | 'digitando' | 'coincide' | 'diferente';

/**
 * Compara a senha com a confirmação enquanto a pessoa digita: enquanto o que foi digitado
 * ainda é o começo da senha, é só "digitando" (sem gritar erro); divergiu, "diferente".
 */
export function compararSenhas(senha: string, confirmacao: string): SituacaoConfirmacao {
  if (confirmacao.length === 0) return 'vazia';
  if (confirmacao === senha) return 'coincide';
  return senha.startsWith(confirmacao) ? 'digitando' : 'diferente';
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
