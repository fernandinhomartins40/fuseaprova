import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rotaInicial } from '../app/rotaInicial';
import { useMe } from '../api/consultas';
import { CabecalhoVoltar, Pagina } from '../ui';
import { EH_APP } from '../nativo/plataforma';
import { FormularioLogin } from './FormularioLogin';
import { rotaDoProximo } from './formulario';
import s from './Auth.module.css';

/** ✏️ Login (`/entrar`): mesmo cabeçalho do Cadastro, sem barra de progresso. */
export default function Entrar() {
  const navegar = useNavigate();
  const me = useMe({ semRedirecionar: true });
  // Quem já está logado vai direto para a casa do seu papel (aluno, admin ou superadmin).
  useEffect(() => {
    if (me.data) navegar(rotaInicial(me.data), { replace: true });
  }, [me.data, navegar]);

  return (
    <Pagina>
      <CabecalhoVoltar para="/" />
      <h1 className={s.titulo}>Que bom te ver de novo!</h1>
      <p className={s.subtitulo}>Entre para continuar sua preparação.</p>
      <FormularioLogin
        aoConcluir={(sessao) => navegar(rotaDoProximo(sessao.proximo), { replace: true })}
        rodape={
          EH_APP ? (
            <p className={s.rodape}>Use o e-mail e a senha da sua conta Fuse Aprova.</p>
          ) : (
            <p className={s.rodape}>
              Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
            </p>
          )
        }
      />
    </Pagina>
  );
}
