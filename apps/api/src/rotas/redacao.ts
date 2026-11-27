/**
 * /redacao (D49): preparatório de redação. Guarda: exigirAcesso. A correção por IA tem cota de 3
 * por semana por aluno (no serviço) e um teto diário global, para segurar o custo.
 */
import type { Registrador } from '../http/registrar.js';
import {
  corrigirRedacao,
  criarRedacao,
  excluirRedacao,
  obterRedacao,
  painelRedacao,
  salvarRedacao,
} from '../servicos/redacao/index.js';

const DIA = 24 * 60 * 60_000;
const TETO_DIARIO = 500;

export function rotasRedacao(r: Registrador): void {
  r.rota('redacaoPainel', async ({ usuario, deps, agora }) => painelRedacao(deps.db, usuario, agora));
  r.rota('redacaoCriar', async ({ usuario, corpo, deps }) => criarRedacao(deps.db, usuario, corpo.temaId, corpo.texto));
  r.rota('redacaoObter', async ({ usuario, params, deps }) => obterRedacao(deps.db, usuario, params.id));
  r.rota('redacaoSalvar', async ({ usuario, params, corpo, deps, agora }) =>
    salvarRedacao(deps.db, usuario, params.id, corpo.texto, agora),
  );
  r.rota('redacaoCorrigir', async ({ usuario, params, deps, agora, limitar }) => {
    await limitar('redacao-ia:global', TETO_DIARIO, DIA);
    return corrigirRedacao(deps, usuario, params.id, agora);
  });
  r.rota('redacaoExcluir', async ({ usuario, params, deps }) => {
    await excluirRedacao(deps.db, usuario, params.id);
  });
}
