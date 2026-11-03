/**
 * D32: teste grátis de 3 dias. `usuarios.acesso` continua significando "pagou ou foi liberado à
 * mão"; o teste é só o prazo em `usuarios.teste_ate`, conferido a cada requisição. Assim o bloqueio
 * vem sozinho, sem job, e vale também para o app nativo já publicado, que só lê o `acesso` da API.
 */
export const DIAS_TESTE = 3;
export const DURACAO_TESTE_MS = DIAS_TESTE * 24 * 3600_000;
/** Depois disso o e-mail "seu teste terminou" não sai mais (fila parada, por exemplo). */
export const JANELA_AVISO_FIM_TESTE_MS = 7 * 24 * 3600_000;

export function fimDoTeste(inicio: Date): Date {
  return new Date(inicio.getTime() + DURACAO_TESTE_MS);
}

/** O aluno pode estudar: pagou ou está dentro do prazo do teste. */
export function temAcessoAoEstudo(
  u: { acesso: boolean; testeAte: Date | null },
  agora: Date,
): boolean {
  return u.acesso || (u.testeAte !== null && u.testeAte > agora);
}

/**
 * D33: a mesma caixa de entrada escrita de outro jeito não dá outro teste. O Gmail ignora pontos, e
 * o "+etiqueta" chega na mesma caixa na maioria dos provedores.
 */
export function emailCanonico(email: string): string {
  const [local = '', dominio = ''] = email.trim().toLowerCase().split('@');
  const nome = local.split('+')[0]!;
  const gmail = dominio === 'gmail.com' || dominio === 'googlemail.com';
  return gmail ? `${nome.replaceAll('.', '')}@gmail.com` : `${nome}@${dominio}`;
}

/** "Faltam 3 dias" / "Faltam 2 dias" / "Último dia" do teste, para a faixa do site. */
export function textoTesteRestante(testeAte: Date, agora: Date): string {
  const dias = Math.ceil((testeAte.getTime() - agora.getTime()) / (24 * 3600_000));
  return dias <= 1 ? 'Último dia' : `Faltam ${dias} dias`;
}
