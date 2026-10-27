import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LoginEntrada } from '@fuse/shared/api';
import { camposDoErro, chamar, mensagemDeErro } from '../api/cliente';
import { rotaInicial } from '../app/rotaInicial';
import { CHAVES, useMe } from '../api/consultas';
import { Botao3D, CabecalhoVoltar, Campo, IconeTraco, Pagina } from '../ui';
import { EH_APP } from '../nativo/plataforma';
import { errosPorCampo, rotaDoProximo } from './formulario';
import s from './Auth.module.css';

/** ✏️ Login (`/entrar`): mesmo cabeçalho do Cadastro, sem barra de progresso. */
export default function Entrar() {
  const navegar = useNavigate();
  const qc = useQueryClient();
  const me = useMe({ semRedirecionar: true });
  // Quem já está logado vai direto para a casa do seu papel (aluno, admin ou superadmin).
  useEffect(() => {
    if (me.data) navegar(rotaInicial(me.data), { replace: true });
  }, [me.data, navegar]);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErroGeral(null);
    const corpo = { email, senha };
    const r = LoginEntrada.safeParse(corpo);
    if (!r.success) {
      setErros(errosPorCampo(r.error));
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      const sessao = await chamar('authLogin', { corpo });
      qc.removeQueries();
      await qc.invalidateQueries({ queryKey: CHAVES.me });
      navegar(rotaDoProximo(sessao.proximo), { replace: true });
    } catch (err) {
      const c = camposDoErro(err);
      if (Object.keys(c).length) setErros(c);
      else setErroGeral(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pagina>
      <CabecalhoVoltar para="/" />
      <h1 className={s.titulo}>Que bom te ver de novo!</h1>
      <p className={s.subtitulo}>Entre para continuar sua preparação.</p>
      <form className={s.form} onSubmit={enviar} noValidate>
        <Campo
          rotulo="E-mail"
          valor={email}
          onValor={setEmail}
          erro={erros.email}
          type="email"
          inputMode="email"
          autoComplete="email"
        />
        <Campo
          rotulo="Senha"
          valor={senha}
          onValor={setSenha}
          erro={erros.senha}
          senha
          autoComplete="current-password"
        />
        <Link to="/recuperar" className={s.link}>
          Esqueci minha senha
        </Link>
        {erroGeral ? (
          <p className={s.erro} role="alert">
            {erroGeral}
          </p>
        ) : null}
        <Botao3D
          type="submit"
          carregando={enviando}
          iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
        >
          Entrar
        </Botao3D>
        {EH_APP ? (
          <p className={s.rodape}>Use o e-mail e a senha da sua conta Fuse Aprova.</p>
        ) : (
          <p className={s.rodape}>
            Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
          </p>
        )}
      </form>
    </Pagina>
  );
}
