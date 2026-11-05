/**
 * /me (perfil, preferências e LGPD) e loja de gemas.
 */
import { z } from 'zod';
import { AREAS_CARGO, METAS_DIARIAS } from '../dominio.js';
import {
  Avatar,
  ContadoresUsuario,
  DataHora,
  Dia,
  Hora,
  Uuid,
  ZAreaCargo,
  ZDivisao,
  ZPapel,
  ZStatusConcurso,
} from './comum.js';
import { CampoSenha } from './auth.js';

/** Meta diária: 1, 2 ou 3 lições (METAS_DIARIAS). */
export const ZMetaDiaria = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const OPCOES_META_DIARIA = METAS_DIARIAS.map((m) => ({
  valor: m,
  texto: `${m} ${m === 1 ? 'lição' : 'lições'} (${m * 5} min)`,
}));

/** GET /me — perfil e contadores do cabeçalho. Funciona sem acesso pago (só `exigirLogin`). */
export const MeResposta = ContadoresUsuario.extend({
  id: Uuid,
  nome: z.string(),
  /** "Marina S. L." */
  nomeExibicao: z.string(),
  email: z.string(),
  /** "***.456.789-**" */
  cpfOculto: z.string(),
  celular: z.string(),
  papel: ZPapel,
  /** Pode estudar agora: pagou ou foi liberado à mão. É o que o app nativo lê. */
  acesso: z.boolean(),
  /** D32: igual a `acesso` desde o fim do teste grátis (D35); fica para o app publicado. */
  acessoPago: z.boolean(),
  /** D39: fim do teste de 24 h liberado pelo superadmin; null para quem pagou ou nunca teve. */
  testeAte: z.string().nullable(),
  avatar: Avatar,
  concurso: z
    .object({
      id: Uuid,
      nome: z.string(),
      /** "PAL · FAU" */
      sigla: z.string(),
      status: ZStatusConcurso,
      dataProva: Dia.nullable(),
    })
    .nullable(),
  cargo: z
    .object({ id: Uuid, nome: z.string(), area: ZAreaCargo, generico: z.boolean() })
    .nullable(),
  area: ZAreaCargo.nullable(),
  /** D36: outras áreas estudadas junto com a do cargo, até o edital sair (vazio com o edital). */
  areasExtras: z.array(ZAreaCargo).default([]),
  metaDiaria: ZMetaDiaria,
  lembreteHora: Hora.nullable(),
  notificacoes: z.boolean(),
  /** D13: aceita receber e-mail e push de novidades (opt-in, padrão desligado). */
  marketing: z.boolean().default(false),
  apelidoLiga: z.string().nullable(),
  sons: z.boolean(),
  vidasMax: z.number().int(),
  ofensivaRecorde: z.number().int(),
  /** O dia de hoje já contou para a ofensiva. */
  ofensivaHojeContou: z.boolean(),
  divisao: ZDivisao,
  metaHoje: z.object({
    feitas: z.number().int(),
    meta: z.number().int(),
    cumprida: z.boolean(),
  }),
  onboardingConcluido: z.boolean(),
  /** Mostrar o modal "O edital saiu! Confirme seu cargo". */
  confirmarCargoEdital: z.boolean(),
  /** Há resultado de liga ainda não visto (abre o modal semanal). */
  resultadoLigaPendente: z.boolean(),
  /** Versão do conteúdo; quando muda, a PWA invalida o cache e o pacote offline. */
  versaoConteudo: z.number().int(),
  /** D13: superadmin sem 2FA configurado ou sem o código nesta sessão (vai para /super/2fa). */
  doisFatoresPendente: z.boolean().default(false),
  criadoEm: DataHora,
});
export type MeResposta = z.infer<typeof MeResposta>;

/** PATCH /me — preferências. Todos os campos são opcionais. */
export const MeAtualizarEntrada = z
  .object({
    cargoId: Uuid,
    /** D36: substitui a lista de áreas extras (a área do cargo é ignorada se vier junto). */
    areasExtras: z.array(ZAreaCargo).max(AREAS_CARGO.length),
    metaDiaria: ZMetaDiaria,
    lembreteHora: Hora.nullable(),
    notificacoes: z.boolean(),
    marketing: z.boolean(),
    apelidoLiga: z
      .string()
      .trim()
      .min(2, 'O apelido precisa ter pelo menos 2 caracteres.')
      .max(20, 'O apelido pode ter no máximo 20 caracteres.')
      .nullable(),
    sons: z.boolean(),
    /** Marca o fim do onboarding (passo 3). */
    onboardingConcluido: z.literal(true),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Nada para atualizar.');
export type MeAtualizarEntrada = z.input<typeof MeAtualizarEntrada>;

/** POST /me/senha — alterar senha (Configurações). Encerra as outras sessões. */
export const AlterarSenhaEntrada = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual.'),
  novaSenha: CampoSenha,
});
export type AlterarSenhaEntrada = z.input<typeof AlterarSenhaEntrada>;

/** DELETE /me — anonimiza o perfil e mantém o pedido (obrigação fiscal). */
export const ExcluirContaEntrada = z.object({
  senha: z.string().min(1, 'Informe sua senha para confirmar.'),
  confirmacao: z.literal('EXCLUIR', {
    errorMap: () => ({ message: 'Digite EXCLUIR para confirmar.' }),
  }),
});
export type ExcluirContaEntrada = z.input<typeof ExcluirContaEntrada>;

/** GET /me/exportar — JSON com perfil, pedidos e tentativas (LGPD). */
export const ExportarResposta = z.object({
  geradoEm: DataHora,
  perfil: z.record(z.unknown()),
  pedidos: z.array(z.record(z.unknown())),
  tentativas: z.array(z.record(z.unknown())),
  sessoesEstudo: z.array(z.record(z.unknown())),
  simulados: z.array(z.record(z.unknown())),
  conquistas: z.array(z.record(z.unknown())),
  revisoes: z.array(z.record(z.unknown())),
  /** D26: data, hora, IP e porta dos acessos dos últimos 6 meses (Marco Civil, art. 15). */
  registrosAcesso: z.array(z.record(z.unknown())).default([]),
  /** D28: anotações pessoais nas questões. */
  anotacoes: z.array(z.record(z.unknown())).default([]),
  /** D34: data, volume e IP de cada download das apostilas. */
  downloadsApostilas: z.array(z.record(z.unknown())).default([]),
});
export type ExportarResposta = z.infer<typeof ExportarResposta>;

/** POST /me/protetores — compra 1 protetor de ofensiva (−200 gemas, máx. 2). */
export const ComprarProtetorResposta = z.object({
  gemas: z.number().int(),
  protetores: z.number().int(),
});
export type ComprarProtetorResposta = z.infer<typeof ComprarProtetorResposta>;
