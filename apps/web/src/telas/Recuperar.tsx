import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  MENSAGEM_RECUPERAR,
  MENSAGENS_CADASTRO,
  RecuperarEntrada,
  RedefinirEntrada,
} from '@fuse/shared/api';
import { camposDoErro, chamar, mensagemDeErro } from '../api/cliente';
import { CHAVES } from '../api/consultas';
import { Botao3D, CabecalhoVoltar, Campo, CamposNovaSenha, Capi, Pagina } from '../ui';
import { errosPorCampo, rotaDoProximo } from './formulario';
import s from './Auth.module.css';

/** ✏️ Recuperar senha (`/recuperar`) e definir nova senha (`/recuperar/:token`). */
export default function Recuperar() {
  const { token } = useParams();
  return token ? <NovaSenha token={token} /> : <PedirLink />;
}

function PedirLink() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const r = RecuperarEntrada.safeParse({ email });
    if (!r.success) {
      setErro(errosPorCampo(r.error).email ?? 'Informe um e-mail válido.');
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const resp = await chamar('authRecuperar', { corpo: { email } });
      setEnviado(resp.mensagem || MENSAGEM_RECUPERAR);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pagina>
      <CabecalhoVoltar para="/entrar" />
      <h1 className={s.titulo}>Recuperar senha</h1>
      <p className={s.subtitulo}>
        Informe seu e-mail. Mandamos um link para você criar uma senha nova.
      </p>
      {enviado ? (
        <div className={s.form}>
          <Capi pose="incentivando" tamanho={140} fala={enviado} />
          <p className={s.sucesso} role="status">
            Confira também a caixa de spam.
          </p>
          <Link to="/entrar" className={s.rodape}>
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form className={s.form} onSubmit={enviar} noValidate>
          <Campo
            rotulo="E-mail"
            valor={email}
            onValor={setEmail}
            erro={erro}
            type="email"
            inputMode="email"
            autoComplete="email"
          />
          <Botao3D type="submit" carregando={enviando}>
            Enviar link
          </Botao3D>
        </form>
      )}
    </Pagina>
  );
}

function NovaSenha({ token }: { token: string }) {
  const navegar = useNavigate();
  const qc = useQueryClient();
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErroGeral(null);
    const r = RedefinirEntrada.safeParse({ token, senha });
    const novos = r.success ? {} : errosPorCampo(r.error);
    if (!novos.senha && senha !== confirma) {
      novos.confirma = confirma
        ? MENSAGENS_CADASTRO.senhasDiferentes
        : MENSAGENS_CADASTRO.confirmarSenha;
    }
    if (novos.token) setErroGeral('Este link é inválido ou expirou. Peça um novo.');
    if (Object.keys(novos).length) {
      setErros(novos);
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      const sessao = await chamar('authRedefinir', { corpo: { token, senha } });
      await qc.invalidateQueries({ queryKey: CHAVES.me });
      navegar(rotaDoProximo(sessao.proximo), { replace: true });
    } catch (err) {
      const c = camposDoErro(err);
      if (c.senha) setErros(c);
      else setErroGeral(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pagina>
      <CabecalhoVoltar para="/entrar" />
      <h1 className={s.titulo}>Criar nova senha</h1>
      <p className={s.subtitulo}>
        Ao salvar, as outras sessões abertas da sua conta são encerradas.
      </p>
      <form className={s.form} onSubmit={enviar} noValidate>
        <CamposNovaSenha
          rotuloSenha="Nova senha"
          rotuloConfirma="Repita a nova senha"
          senha={senha}
          confirma={confirma}
          onSenha={setSenha}
          onConfirma={setConfirma}
          erroSenha={erros.senha}
          erroConfirma={erros.confirma}
        />
        {erroGeral ? (
          <p className={s.erro} role="alert">
            {erroGeral} <Link to="/recuperar">Pedir novo link</Link>
          </p>
        ) : null}
        <Botao3D type="submit" carregando={enviando}>
          Salvar nova senha
        </Botao3D>
      </form>
    </Pagina>
  );
}
