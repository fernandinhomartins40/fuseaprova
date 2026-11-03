import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LoginEntrada, type SessaoResposta } from '@fuse/shared/api';
import { camposDoErro, chamar, mensagemDeErro } from '../api/cliente';
import { CHAVES } from '../api/consultas';
import { Botao3D, Campo, IconeTraco } from '../ui';
import { errosPorCampo } from './formulario';
import s from './Auth.module.css';

/** Formulário de login (e-mail e senha), usado em /entrar e na página das apostilas (D34). */
export function FormularioLogin({
  aoConcluir,
  rodape,
}: {
  aoConcluir: (sessao: SessaoResposta) => void | Promise<void>;
  rodape?: ReactNode;
}) {
  const qc = useQueryClient();
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
      await aoConcluir(sessao);
    } catch (err) {
      const c = camposDoErro(err);
      if (Object.keys(c).length) setErros(c);
      else setErroGeral(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
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
      {rodape}
    </form>
  );
}
