/**
 * D24: páginas de login da equipe (S-03).
 * - `/admin/entrar`: equipe de conteúdo (POST /auth/login/conteudo) → /super/conteudo;
 * - `/super/entrar`: superadmin (POST /auth/login/super) → /super/2fa.
 * Sem "Criar conta". Conta de outro papel recebe a mesma mensagem genérica de credenciais.
 * `?voltar=` (sessão que caiu no painel) leva a pessoa de volta para onde estava.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LoginEntrada } from '@fuse/shared/api';
import { camposDoErro, chamar, mensagemDeErro } from '../api/cliente';
import { CHAVES, useMe } from '../api/consultas';
import { lembrarArea, voltarSeguro } from '../app/areaPainel';
import { rotaInicial } from '../app/rotaInicial';
import { Botao3D, Campo, IconeTraco, Pagina } from '../ui';
import { errosPorCampo, rotaDoProximo } from '../telas/formulario';
import type { EstadoLogin } from '../telas/redefinicao';
import s from '../telas/Auth.module.css';
import { MarcaPainel } from './MarcaPainel';

type AreaEquipe = 'conteudo' | 'super';

const TEXTOS: Record<AreaEquipe, { selo: string; titulo: string; subtitulo: string; documento: string }> = {
  conteudo: {
    selo: 'Conteúdo',
    titulo: 'Equipe de conteúdo',
    subtitulo: 'Entre para cuidar das questões, das trilhas e dos editais.',
    documento: 'Entrar · Equipe de conteúdo · Fuse Aprova',
  },
  super: {
    selo: 'Superadmin',
    titulo: 'Painel do superadmin',
    subtitulo: 'Entre com o seu e-mail e a sua senha. Em seguida, digite o código do app autenticador.',
    documento: 'Entrar · Superadmin · Fuse Aprova',
  },
};

export default function EntrarPainel({ area }: { area: AreaEquipe }) {
  const navegar = useNavigate();
  const qc = useQueryClient();
  const estado = (useLocation().state ?? {}) as EstadoLogin;
  const [params] = useSearchParams();
  const voltar = voltarSeguro(params.get('voltar'), area === 'conteudo' ? '/super/conteudo' : '/super');
  const me = useMe({ semRedirecionar: true });
  const t = TEXTOS[area];
  // Quem já está logado vai direto para a casa do seu papel.
  useEffect(() => {
    if (me.data) navegar(rotaInicial(me.data), { replace: true });
  }, [me.data, navegar]);
  useEffect(() => {
    document.title = t.documento;
  }, [t.documento]);

  const [email, setEmail] = useState(estado.email ?? '');
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
      const sessao = await chamar(area === 'super' ? 'authLoginSuper' : 'authLoginConteudo', { corpo });
      lembrarArea(sessao.area);
      qc.removeQueries();
      await qc.invalidateQueries({ queryKey: CHAVES.me });
      const destino =
        sessao.proximo === 'dois_fatores'
          ? `/super/2fa${voltar ? `?voltar=${encodeURIComponent(voltar)}` : ''}`
          : (voltar ?? rotaDoProximo(sessao.proximo));
      navegar(destino, { replace: true });
    } catch (err) {
      const c = camposDoErro(err);
      if (Object.keys(c).length) setErros(c);
      else setErroGeral(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pagina rotulo={t.titulo}>
      <MarcaPainel selo={t.selo} />
      <h1 className={s.titulo}>{t.titulo}</h1>
      <p className={s.subtitulo}>{t.subtitulo}</p>
      {estado.mensagem ? (
        <p className={s.sucesso} role="status">
          {estado.mensagem}
        </p>
      ) : null}
      {voltar && !estado.mensagem ? (
        <p className={s.aviso} role="status">
          Sua sessão terminou. Entre de novo para continuar de onde parou.
        </p>
      ) : null}
      <form className={s.form} onSubmit={enviar} noValidate>
        <Campo rotulo="E-mail" valor={email} onValor={setEmail} erro={erros.email} type="email" inputMode="email" autoComplete="email" />
        <Campo rotulo="Senha" valor={senha} onValor={setSenha} erro={erros.senha} senha autoComplete="current-password" />
        <Link to={`/recuperar?area=${area}`} className={s.link}>
          Esqueci minha senha
        </Link>
        {erroGeral ? (
          <p className={s.erro} role="alert">
            {erroGeral}
          </p>
        ) : null}
        <Botao3D type="submit" carregando={enviando} iconeDireita={<IconeTraco nome="seta" tamanho={20} />}>
          Entrar
        </Botao3D>
      </form>
    </Pagina>
  );
}
