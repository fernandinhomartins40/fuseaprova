import type { Registrador } from '../http/registrar.js';
import { criarSimulado, entregar, historico, obterSimulado, resultado, salvarResposta } from '../servicos/simulado.js';

export function rotasSimulados(r: Registrador): void {
  r.rota('simuladoCriar', async ({ usuario, corpo, deps, agora }) => criarSimulado(deps, usuario, corpo.cargoId, agora));
  r.rota('simuladosListar', async ({ usuario, deps, agora }) => historico(deps, usuario, agora));
  r.rota('simuladoObter', async ({ usuario, params, deps, agora }) => obterSimulado(deps, usuario, params.id, agora));
  r.rota('simuladoResposta', async ({ usuario, params, corpo, deps, agora }) =>
    salvarResposta(deps, usuario, params.id, corpo, agora),
  );
  r.rota('simuladoEntregar', async ({ usuario, params, deps, agora }) => {
    const s = await entregar(deps, usuario.id, params.id, agora, false);
    return resultado(deps.db, s);
  });
}
