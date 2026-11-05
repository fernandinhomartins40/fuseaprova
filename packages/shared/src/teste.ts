/**
 * D35: sem teste grátis. Só estuda quem pagou ou foi liberado à mão (`usuarios.acesso`). As colunas
 * `teste_ate` e `teste_pendente` ficam no banco (D32), mas não liberam mais nada; o parâmetro segue
 * na assinatura para os chamadores não mudarem.
 */
export function temAcessoAoEstudo(u: { acesso: boolean; testeAte?: Date | null }, _agora?: Date): boolean {
  return u.acesso;
}
