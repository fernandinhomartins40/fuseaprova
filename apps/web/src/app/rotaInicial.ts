import { ehAdmin } from '@fuse/shared';

/**
 * Casa de cada papel: superadmin → /super, admin → /admin, aluno → app do aluno.
 * Os painéis de equipe e o app do aluno não se misturam; quem é da equipe só vê o app
 * do aluno entrando nele de propósito (link "Ver como aluno").
 */
export function rotaInicial(u: { papel: string; acesso: boolean }): string {
  if (u.papel === 'superadmin') return '/super';
  if (ehAdmin(u.papel)) return '/admin';
  return u.acesso ? '/aprender' : '/pagamento';
}
