/**
 * D24: `/convite/:token` — o convite da equipe (S-03, R2-12). A pessoa define a senha e segue
 * para a página de login da área dela (conteúdo ou superadmin), avisada do próximo passo.
 * O token é o mesmo da redefinição (POST /auth/redefinir), que devolve a área da conta.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MENSAGENS_CADASTRO, RedefinirEntrada } from '@fuse/shared/api';
import { camposDoErro, chamar, mensagemDeErro } from '../api/cliente';
import { Botao3D, CamposNovaSenha, Pagina } from '../ui';
import { errosPorCampo } from '../telas/formulario';
import { concluirRedefinicao } from '../telas/redefinicao';
import s from '../telas/Auth.module.css';
import { MarcaPainel } from './MarcaPainel';

export default function Convite() {
  const { token = '' } = useParams();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    document.title = 'Convite da equipe · Fuse Aprova';
  }, []);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErroGeral(null);
    const r = RedefinirEntrada.safeParse({ token, senha });
    const novos = r.success ? {} : errosPorCampo(r.error);
    if (!novos.senha && senha !== confirma) {
      novos.confirma = confirma ? MENSAGENS_CADASTRO.senhasDiferentes : MENSAGENS_CADASTRO.confirmarSenha;
    }
    if (novos.token) setErroGeral('Este convite é inválido ou expirou.');
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
    <Pagina rotulo="Convite da equipe">
      <MarcaPainel selo="Equipe" />
      <h1 className={s.titulo}>Bem-vindo à equipe do Fuse Aprova</h1>
      <p className={s.subtitulo}>
        Defina a sua senha. Depois, você entra pela página de login da equipe com o seu e-mail e essa senha.
      </p>
      <p className={s.aviso}>Se você foi convidado como superadmin, no primeiro acesso vai configurar o app autenticador do celular.</p>
      <form className={s.form} onSubmit={enviar} noValidate>
        <CamposNovaSenha
          rotuloSenha="Sua senha"
          rotuloConfirma="Repita a senha"
          senha={senha}
          confirma={confirma}
          onSenha={setSenha}
          onConfirma={setConfirma}
          erroSenha={erros.senha}
          erroConfirma={erros.confirma}
        />
        {erroGeral ? (
          <p className={s.erro} role="alert">
            {erroGeral} Peça um novo convite a quem convidou você.
          </p>
        ) : null}
        <Botao3D type="submit" carregando={enviando}>
          Salvar senha
        </Botao3D>
        <p className={s.rodape}>
          Já definiu a senha? <Link to="/admin/entrar">Equipe de conteúdo</Link> · <Link to="/super/entrar">Superadmin</Link>
        </p>
      </form>
    </Pagina>
  );
}
