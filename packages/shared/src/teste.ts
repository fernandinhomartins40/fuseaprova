/**
 * Acesso ao estudo. D35: o cadastro não ganha teste grátis. D39: o superadmin pode liberar um
 * teste de 24 horas para um aluno, pela lista de usuários; o prazo fica em `usuarios.teste_ate`
 * e é conferido a cada requisição, então o bloqueio volta sozinho, sem job.
 */
export const DURACAO_TESTE_LIBERADO_MS = 24 * 3600_000;

/** O aluno pode estudar: pagou (ou foi liberado à mão) ou está no teste liberado pelo superadmin. */
export function temAcessoAoEstudo(u: { acesso: boolean; testeAte?: Date | null }, agora: Date): boolean {
  return u.acesso || (!!u.testeAte && u.testeAte > agora);
}
