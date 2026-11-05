import { Link, useNavigate } from 'react-router-dom';
import { AVISO_EDITAL } from '@fuse/shared';
import { CabecalhoVoltar, Capi, Pagina } from '../ui';
import { FormularioCadastro } from './FormularioCadastro';
import { rotaDoProximo } from './formulario';
import s from './Auth.module.css';

/** 02 Cadastro (`/cadastro`). D35: sem teste grátis, a conta nova vai direto para o Pix. */
export default function Cadastro() {
  const navegar = useNavigate();

  return (
    <Pagina>
      <CabecalhoVoltar para="/" />
      <h1 className={s.titulo}>Vamos começar?</h1>
      <Capi
        pose="incentivando"
        tamanho={86}
        className={s.capi}
        fala="Crie sua conta, pague no Pix e comece a estudar na hora."
        carregamento="eager"
      />
      <FormularioCadastro
        textoBotao="Criar conta e gerar o Pix"
        aoConcluir={(sessao) => navegar(rotaDoProximo(sessao.proximo), { replace: true })}
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
