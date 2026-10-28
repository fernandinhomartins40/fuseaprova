/**
 * Rotas do painel superadmin (D13). Guarda `exigirSuperadmin` (registrar.ts).
 */
import type { Registrador } from '../../http/registrar.js';
import { rotasSuperAsaas } from './asaas.js';
import { rotasSuperComunicacao } from './comunicacao.js';
import { rotasSuperFinanceiro } from './financeiro.js';
import { rotasSuperPagamentos } from './pagamentos.js';
import { rotasSuperPrecos } from './precos.js';
import { rotasSuperSeguranca } from './seguranca.js';
import { rotasSuperSistema } from './sistema.js';
import { rotasSuperUsuarios } from './usuarios.js';

export function rotasSuper(r: Registrador): void {
  rotasSuperSeguranca(r);
  rotasSuperFinanceiro(r);
  rotasSuperPagamentos(r);
  rotasSuperAsaas(r);
  rotasSuperUsuarios(r);
  rotasSuperComunicacao(r);
  rotasSuperSistema(r);
  rotasSuperPrecos(r);
}
