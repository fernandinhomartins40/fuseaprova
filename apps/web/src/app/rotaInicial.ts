import { podeGerirConteudo } from '@fuse/shared';
import { EH_APP } from '../nativo/plataforma';

/**
 * Casa de cada papel: superadmin → /super, admin → /admin, aluno → app do aluno.
 * Os painéis de equipe e o app do aluno não se misturam; quem é da equipe só vê o app
 * do aluno entrando nele de propósito (link "Ver como aluno").
 */
export function rotaInicial(u: { papel: string; acesso: boolean }): string {
  // App nativo: só o painel do aluno, para qualquer papel; sem acesso, a tela neutra (D20).
  if (EH_APP) return u.acesso ? '/aprender' : '/acesso';
  if (u.papel === 'superadmin') return '/super';
  if (podeGerirConteudo(u.papel)) return '/admin';
  return u.acesso ? '/aprender' : '/pagamento';
}
