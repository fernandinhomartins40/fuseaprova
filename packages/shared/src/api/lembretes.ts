/**
 * GET /me/lembretes — plano de notificações dos próximos 7 dias (D30), calculado no servidor.
 * O app nativo agenda cada item como notificação LOCAL; tocar abre `rota`.
 */
import { z } from 'zod';
import { rotaNotificacaoValida, TIPOS_LEMBRETE } from '../lembretes.js';
import { DataHora } from './comum.js';

export const RotaNotificacao = z
  .string()
  .refine(rotaNotificacaoValida, 'Rota de notificação fora da lista de telas do app.');

export const ItemLembrete = z.object({
  tipo: z.enum(TIPOS_LEMBRETE),
  quando: DataHora,
  titulo: z.string().min(1).max(80),
  corpo: z.string().min(1).max(160),
  rota: RotaNotificacao,
});
export type ItemLembrete = z.infer<typeof ItemLembrete>;

export const LembretesResposta = z.object({
  /** Notificações ligadas e com horário (opt-in). Falso = cancelar tudo no aparelho. */
  ativo: z.boolean(),
  itens: z.array(ItemLembrete),
  geradoEm: DataHora,
});
export type LembretesResposta = z.infer<typeof LembretesResposta>;
