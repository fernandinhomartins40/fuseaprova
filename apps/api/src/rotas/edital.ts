/**
 * /publico/edital/* (D44): IA da ferramenta pública "Descubra seu cargo". Rotas abertas, com
 * limite por IP (registro) e um teto diário global para segurar o custo.
 */
import type { Registrador } from '../http/registrar.js';
import { comCache, interpretarCurso, responderPergunta } from '../servicos/edital/ia.js';

const DIA = 24 * 60 * 60_000;
const TETO_DIARIO = 300;

export function rotasEdital(r: Registrador): void {
  r.rota('editalCurso', async ({ corpo, deps, limitar }) => {
    await limitar('edital-ia:global', TETO_DIARIO, DIA);
    return comCache(`curso:${corpo.cargo}:${corpo.curso}`, () =>
      interpretarCurso(deps.config.fusai, corpo.cargo, corpo.curso),
    );
  });

  r.rota('editalPergunta', async ({ corpo, deps, limitar }) => {
    await limitar('edital-ia:global', TETO_DIARIO, DIA);
    const resposta = await comCache(`pergunta:${corpo.cargo ?? ''}:${corpo.pergunta}`, () =>
      responderPergunta(deps.config.fusai, corpo.pergunta, corpo.cargo),
    );
    return { resposta };
  });
}
