/**
 * D24: depois de criar a senha (recuperação ou convite), cada área segue o seu caminho.
 * - Aluno: já entra (a API abriu a sessão) e segue o `proximo`.
 * - Equipe (conteúdo ou super): a sessão aberta é descartada e a pessoa vai à página de login
 *   do papel, que é onde começa a jornada do painel (o superadmin segue dali para o 2FA).
 */
import type { QueryClient } from '@tanstack/react-query';
import type { SessaoResposta } from '@fuse/shared/api';
import { LOGIN_DA_AREA, lembrarArea } from '../app/areaPainel';
import { sair } from '../app/sair';
import { CHAVES } from '../api/consultas';
import { EH_APP } from '../nativo/plataforma';
import { rotaDoProximo } from './formulario';

export const MENSAGEM_SENHA_CRIADA = 'Senha salva. Entre com o seu e-mail e a nova senha.';

export interface EstadoLogin {
  mensagem?: string;
  email?: string;
}

/** Para onde ir depois de salvar a senha, e o estado que a página de login mostra. */
export async function concluirRedefinicao(
  sessao: SessaoResposta,
  qc: QueryClient,
): Promise<{ para: string; estado?: EstadoLogin }> {
  if (sessao.area === 'aluno') {
    await qc.invalidateQueries({ queryKey: CHAVES.me });
    return { para: rotaDoProximo(sessao.proximo) };
  }
  await sair(qc);
  lembrarArea(sessao.area);
  // No app nativo só existe o login de aluno (D20/D24).
  const para = EH_APP ? LOGIN_DA_AREA.aluno : LOGIN_DA_AREA[sessao.area];
  return { para, estado: { mensagem: MENSAGEM_SENHA_CRIADA, email: sessao.usuario.email } };
}
