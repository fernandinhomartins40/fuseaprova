import { podeGerirConteudo } from '@fuse/shared';
import { EH_APP } from '../nativo/plataforma';

/**
 * Casa de cada papel: superadmin → /super, admin → /super/conteudo (D24: painel único),
 * aluno → app do aluno. A equipe não estuda (a API recusa com 403).
 */
export function rotaInicial(u: { papel: string; acesso: boolean }): string {
  // App nativo: só o painel do aluno, para qualquer papel; sem acesso, a tela neutra (D20).
  if (EH_APP) return u.acesso ? '/aprender' : '/acesso';
  if (u.papel === 'superadmin') return '/super';
  if (podeGerirConteudo(u.papel)) return '/super/conteudo';
  return u.acesso ? '/aprender' : '/pagamento';
}
