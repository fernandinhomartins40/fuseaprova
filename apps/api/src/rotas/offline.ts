import type { Registrador } from '../http/registrar.js';
import { montarPacote, sincronizar } from '../servicos/offline.js';

export function rotasOffline(r: Registrador): void {
  r.rota('offlinePacote', async ({ usuario, deps, agora }) => montarPacote(deps, usuario, agora));
  r.rota('syncTentativas', async ({ usuario, corpo, deps, agora }) => sincronizar(deps, usuario, corpo, agora));
}
