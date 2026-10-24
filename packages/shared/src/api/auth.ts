/**
 * /auth/* (PRD 5.2, 5.4, 5.5 e 8.2).
 */
import { z } from 'zod';
import { limparCelular, validarCelular } from '../celular.js';
import { limparCpf, validarCpf } from '../cpf.js';
import { normalizarEmail, SENHA_MINIMA, validarEmail, validarNomeCompleto } from '../validacao.js';
import { Uuid } from './comum.js';

export const VERSAO_TERMOS_ATUAL = '2026-10-23';

export const MENSAGENS_CADASTRO = {
  nome: 'Informe seu nome completo (nome e sobrenome).',
  email: 'Informe um e-mail válido.',
  cpf: 'Esse CPF não é válido.',
  celular: 'Informe um celular com DDD (11 dígitos).',
  senha: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`,
  aceite: 'Você precisa aceitar os Termos de uso e a Política de privacidade.',
  contaExistente: 'Já existe uma conta com este e-mail ou CPF. Entre com sua senha.',
} as const;

export const CampoEmail = z
  .string({ required_error: MENSAGENS_CADASTRO.email })
  .trim()
  .max(254, MENSAGENS_CADASTRO.email)
  .refine(validarEmail, MENSAGENS_CADASTRO.email)
  .transform(normalizarEmail);

export const CampoSenha = z
  .string({ required_error: MENSAGENS_CADASTRO.senha })
  .min(SENHA_MINIMA, MENSAGENS_CADASTRO.senha)
  .max(200, 'A senha pode ter no máximo 200 caracteres.');

/** CPF: aceita com ou sem máscara; sai só com os 11 dígitos. */
export const CampoCpf = z
  .string({ required_error: MENSAGENS_CADASTRO.cpf })
  .refine(validarCpf, MENSAGENS_CADASTRO.cpf)
  .transform(limparCpf);

/** Celular: aceita com ou sem máscara; sai só com os 11 dígitos. */
export const CampoCelular = z
  .string({ required_error: MENSAGENS_CADASTRO.celular })
  .refine(validarCelular, MENSAGENS_CADASTRO.celular)
  .transform(limparCelular);

export const CampoNome = z
  .string({ required_error: MENSAGENS_CADASTRO.nome })
  .trim()
  .max(120, 'O nome pode ter no máximo 120 caracteres.')
  .refine(validarNomeCompleto, MENSAGENS_CADASTRO.nome)
  .transform((n) => n.replace(/\s+/g, ' '));

/** POST /auth/cadastro */
export const CadastroEntrada = z.object({
  nome: CampoNome,
  email: CampoEmail,
  cpf: CampoCpf,
  celular: CampoCelular,
  senha: CampoSenha,
  aceiteTermos: z.literal(true, {
    errorMap: () => ({ message: MENSAGENS_CADASTRO.aceite }),
  }),
  versaoTermos: z.string().min(1).default(VERSAO_TERMOS_ATUAL),
});
export type CadastroEntrada = z.input<typeof CadastroEntrada>;
export type CadastroDados = z.output<typeof CadastroEntrada>;

/** POST /auth/login */
export const LoginEntrada = z.object({
  email: CampoEmail,
  senha: z.string().min(1, 'Informe sua senha.'),
});
export type LoginEntrada = z.input<typeof LoginEntrada>;

/** POST /auth/recuperar — a resposta é sempre a mesma (não revela se o e-mail existe). */
export const RecuperarEntrada = z.object({ email: CampoEmail });
export type RecuperarEntrada = z.input<typeof RecuperarEntrada>;

export const MENSAGEM_RECUPERAR =
  'Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora.';

export const RecuperarResposta = z.object({ ok: z.literal(true), mensagem: z.string() });
export type RecuperarResposta = z.infer<typeof RecuperarResposta>;

/** POST /auth/redefinir — encerra todas as outras sessões. */
export const RedefinirEntrada = z.object({
  token: z.string().min(20, 'Link inválido.'),
  senha: CampoSenha,
});
export type RedefinirEntrada = z.input<typeof RedefinirEntrada>;

/** Para onde a PWA deve ir depois de entrar. */
export const ProximoPasso = z.enum(['pagamento', 'onboarding', 'trilha', 'admin']);
export type ProximoPasso = z.infer<typeof ProximoPasso>;

/** Resposta de cadastro, login e redefinição (a sessão vai no cookie httpOnly). */
export const SessaoResposta = z.object({
  usuario: z.object({
    id: Uuid,
    nome: z.string(),
    email: z.string(),
    papel: z.enum(['aluno', 'admin']),
    acesso: z.boolean(),
  }),
  proximo: ProximoPasso,
});
export type SessaoResposta = z.infer<typeof SessaoResposta>;

export const NOME_COOKIE_SESSAO = 'fuse_sessao';
export const DIAS_SESSAO = 60;
export const VALIDADE_LINK_SENHA_MS = 60 * 60 * 1000;
