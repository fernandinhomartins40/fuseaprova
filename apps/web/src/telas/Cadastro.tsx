import { Link, useNavigate } from 'react-router-dom';
import { AVISO_EDITAL } from '@fuse/shared';
import { CabecalhoVoltar, Capi, Pagina, useToast } from '../ui';
import { FormularioCadastro } from './FormularioCadastro';
import { rotaDoProximo } from './formulario';
import s from './Auth.module.css';

/** 02 Cadastro (`/cadastro`). D32: a conta nova começa com o teste grátis, sem Pix. */
export default function Cadastro() {
  const navegar = useNavigate();
  const toast = useToast();

  return (
    <Pagina>
      <CabecalhoVoltar para="/" />
      <h1 className={s.titulo}>Vamos começar?</h1>
      <Capi
        pose="incentivando"
        tamanho={86}
        className={s.capi}
        fala="Crie sua conta e teste grátis por 3 dias, sem pagar nada agora."
        carregamento="eager"
      />
      <FormularioCadastro
        textoBotao="Criar conta e começar o teste grátis"
        aoConcluir={(sessao) => {
          if (sessao.proximo === 'pagamento')
            toast('O teste grátis já foi usado com estes dados ou neste aparelho.', 'erro');
          navegar(rotaDoProximo(sessao.proximo), { replace: true });
        }}
        rodape={
          <>
            <p className={s.aviso}>{AVISO_EDITAL}</p>
            <p className={s.rodape}>
              Já tem conta? <Link to="/entrar">Entrar</Link>
            </p>
          </>
        }
      />
    </Pagina>
  );
}
