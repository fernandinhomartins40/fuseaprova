/**
 * /apostilas/* (D34). O download do PDF é uma rota binária, registrada em app.ts.
 */
import type { Registrador } from '../http/registrar.js';
import { gerarPixApostilas, statusApostilas } from '../servicos/apostilas.js';

export function rotasApostilas(r: Registrador): void {
  r.rota('apostilasPix', async ({ usuario, deps, agora }) => gerarPixApostilas(deps, usuario, agora));

  r.rota('apostilasStatus', async ({ usuario, deps, agora }) => statusApostilas(deps, usuario, agora));
}
