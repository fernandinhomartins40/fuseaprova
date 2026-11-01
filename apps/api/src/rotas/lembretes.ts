/**
 * D30: GET /me/lembretes — plano de notificações locais do app (guarda `acesso`).
 */
import type { Registrador } from '../http/registrar.js';
import { montarLembretes } from '../servicos/lembretes.js';

export function rotasLembretes(r: Registrador): void {
  r.rota('meLembretes', async ({ usuario, deps, agora }) => montarLembretes(deps, usuario, agora));
}
