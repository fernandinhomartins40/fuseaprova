import { Campo } from './Campo';
import { feedbackConfirmacao, ForcaSenha } from './ForcaSenha';
import s from './NovaSenha.module.css';

export interface PropsCamposNovaSenha {
  senha: string;
  confirma: string;
  onSenha: (v: string) => void;
  onConfirma: (v: string) => void;
  erroSenha?: string | null;
  erroConfirma?: string | null;
  rotuloSenha?: string;
  rotuloConfirma?: string;
  /** E-mail e nome já digitados, para avisar de senha parecida com eles. */
  pessoal?: readonly string[];
}

/**
 * Par "senha + repita a senha" com indicador de força e feedback de coincidência ao digitar.
 * Cadastro, nova senha (recuperação) e alterar senha (Configurações) usam o mesmo bloco.
 */
export function CamposNovaSenha({
  senha,
  confirma,
  onSenha,
  onConfirma,
  erroSenha,
  erroConfirma,
  rotuloSenha = 'Senha',
  rotuloConfirma = 'Confirmar senha',
  pessoal,
}: PropsCamposNovaSenha) {
  return (
    <div className={s.bloco}>
      <div className={s.grupo}>
        <Campo
          rotulo={rotuloSenha}
          valor={senha}
          onValor={onSenha}
          erro={erroSenha}
          senha
          autoComplete="new-password"
        />
        <ForcaSenha senha={senha} pessoal={pessoal} />
      </div>
      <Campo
        rotulo={rotuloConfirma}
        valor={confirma}
        onValor={onConfirma}
        erro={erroConfirma}
        feedback={feedbackConfirmacao(senha, confirma)}
        senha
        autoComplete="new-password"
      />
    </div>
  );
}
