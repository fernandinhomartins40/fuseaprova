import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  MENSAGEM_RECUPERAR,
  MENSAGENS_CADASTRO,
  RecuperarEntrada,
  RedefinirEntrada,
} from '@fuse/shared/api';
import { camposDoErro, chamar, mensagemDeErro } from '../api/cliente';
import { LOGIN_DA_AREA } from '../app/areaPainel';
import { EH_APP } from '../nativo/plataforma';
import { Botao3D, CabecalhoVoltar, Campo, CamposNovaSenha, Capi, Pagina } from '../ui';
import { errosPorCampo } from './formulario';
import { concluirRedefinicao } from './redefinicao';
import s from './Auth.module.css';

/**
 * ✏️ Recuperar senha (`/recuperar`) e definir nova senha (`/recuperar/:token`). D24: a
 * recuperação é uma só para todos; `?area=conteudo|super` só muda para qual login voltar, e a
 * redefinição leva ao login da área devolvida pela API.
 */
export default function Recuperar() {
  const { token } = useParams();
  return token ? <NovaSenha token={token} /> : <PedirLink />;
}

function useLoginDeVolta(): string {
  const area = useSearchParams()[0].get('area');
  if (EH_APP) return LOGIN_DA_AREA.aluno;
  return area === 'conteudo' || area === 'super' ? LOGIN_DA_AREA[area] : LOGIN_DA_AREA.aluno;
}

function PedirLink() {
  const login = useLoginDeVolta();
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
      <CabecalhoVoltar para={login} />
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
          <Link to={login} className={s.rodape}>
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
      const { para, estado } = await concluirRedefinicao(sessao, qc);
      navegar(para, { replace: true, state: estado });
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
