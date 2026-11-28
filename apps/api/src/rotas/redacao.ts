/**
 * /redacao (D49): preparatório de redação. Guarda: exigirAcesso. A correção por IA tem cota de 3
 * por semana por aluno (no serviço) e um teto diário global, para segurar o custo.
 */
import type { Registrador } from '../http/registrar.js';
import {
  avaliarTrecho,
  concluirAulaRedacao,
  corrigirRedacao,
  criarRedacao,
  excluirRedacao,
  obterRedacao,
  painelRedacao,
  salvarRedacao,
} from '../servicos/redacao/index.js';

const DIA = 24 * 60 * 60_000;
const TETO_DIARIO = 500;
/** Trechos das aulas são curtos e baratos, mas também têm teto (por aluno e global). */
const TRECHOS_POR_DIA = 120;
const TETO_TRECHOS = 5000;

export function rotasRedacao(r: Registrador): void {
  r.rota('redacaoPainel', async ({ usuario, deps, agora }) => painelRedacao(deps.db, usuario, agora));
  r.rota('redacaoAulaConcluir', async ({ usuario, params, corpo, deps, agora }) =>
    concluirAulaRedacao(deps.db, usuario, params.id, corpo.perfeita, agora),
  );
  r.rota('redacaoTrechoAvaliar', async ({ usuario, params, corpo, deps, limitar }) => {
    await limitar(`redacao-trecho:${usuario.id}`, TRECHOS_POR_DIA, DIA);
    await limitar('redacao-trecho:global', TETO_TRECHOS, DIA);
    return avaliarTrecho(deps, params.id, params.passo, corpo.texto);
  });
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
