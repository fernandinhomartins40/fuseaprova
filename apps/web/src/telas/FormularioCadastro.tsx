import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  CadastroEntrada,
  MENSAGENS_CADASTRO,
  VERSAO_TERMOS_ATUAL,
  type SessaoResposta,
} from '@fuse/shared/api';
import { camposDoErro, chamar, ErroApi, mensagemDeErro } from '../api/cliente';
import { CHAVES } from '../api/consultas';
import { Botao3D, Campo, CamposNovaSenha, IconeTraco } from '../ui';
import { errosPorCampo } from './formulario';
import s from './Auth.module.css';

/**
 * Formulário de cadastro (o mesmo schema da API), usado em /cadastro e na página das apostilas
 * (D34). Quem usa decide o que fazer com a sessão nova (`aoConcluir`).
 */
export function FormularioCadastro({
  textoBotao,
  aoConcluir,
  aoPedirLogin,
  rodape,
}: {
  textoBotao: string;
  aoConcluir: (sessao: SessaoResposta) => void | Promise<void>;
  /** Sem ele, "conta já existe" leva a /entrar. */
  aoPedirLogin?: () => void;
  rodape?: ReactNode;
}) {
  const qc = useQueryClient();
  const [v, setV] = useState({ nome: '', email: '', celular: '', cpf: '', senha: '' });
  const [confirma, setConfirma] = useState('');
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [contaExiste, setContaExiste] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const campo = (k: keyof typeof v) => (valor: string) => {
    setV((a) => ({ ...a, [k]: valor }));
    if (erros[k]) setErros(({ [k]: _x, ...resto }) => resto);
  };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErroGeral(null);
    setContaExiste(false);
    const corpo = { ...v, aceiteTermos: aceite as true, versaoTermos: VERSAO_TERMOS_ATUAL };
    const r = CadastroEntrada.safeParse(corpo);
    const novos = r.success ? {} : errosPorCampo(r.error);
    // A confirmação é só do formulário (a API recebe uma senha): confere antes de enviar.
    if (!novos.senha && confirma !== v.senha) {
      novos.confirma = confirma
        ? MENSAGENS_CADASTRO.senhasDiferentes
        : MENSAGENS_CADASTRO.confirmarSenha;
    }
    if (Object.keys(novos).length) {
      setErros(novos);
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      const sessao = await chamar('authCadastro', { corpo });
      await qc.invalidateQueries({ queryKey: CHAVES.me });
      await aoConcluir(sessao);
    } catch (err) {
      if (err instanceof ErroApi && err.codigo === 'conta_existente') {
        setContaExiste(true);
      } else {
        const c = camposDoErro(err);
        if (Object.keys(c).length) setErros(c);
        else setErroGeral(mensagemDeErro(err));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={s.form} onSubmit={enviar} noValidate>
      <Campo
        rotulo="Nome completo"
        valor={v.nome}
        onValor={campo('nome')}
        erro={erros.nome}
        autoComplete="name"
      />
      <Campo
        rotulo="E-mail"
        valor={v.email}
        onValor={campo('email')}
        erro={erros.email}
        type="email"
        autoComplete="email"
        inputMode="email"
      />
      <Campo
        rotulo="Celular"
        valor={v.celular}
        onValor={campo('celular')}
        erro={erros.celular}
        mascara="celular"
        autoComplete="tel-national"
        placeholder="(42) 99999-9999"
      />
      <Campo
        rotulo="CPF"
        valor={v.cpf}
        onValor={campo('cpf')}
        erro={erros.cpf}
        mascara="cpf"
        ajuda="Usado só para identificar seu pagamento Pix."
        placeholder="000.000.000-00"
      />
      <CamposNovaSenha
        senha={v.senha}
        confirma={confirma}
        onSenha={campo('senha')}
        onConfirma={(x) => {
          setConfirma(x);
          if (erros.confirma) setErros(({ confirma: _c, ...resto }) => resto);
        }}
        erroSenha={erros.senha}
        erroConfirma={erros.confirma}
        pessoal={[v.email, v.nome]}
      />

      <div className={s.aceite}>
        <input
          id="aceite"
          type="checkbox"
          checked={aceite}
          onChange={(e) => {
            setAceite(e.target.checked);
            if (erros.aceiteTermos) setErros(({ aceiteTermos: _a, ...r }) => r);
          }}
          aria-invalid={erros.aceiteTermos ? true : undefined}
          aria-describedby={erros.aceiteTermos ? 'aceite-erro' : undefined}
        />
        <label htmlFor="aceite">
          Li e aceito os <Link to="/termos">Termos de uso</Link> e a{' '}
          <Link to="/privacidade">Política de privacidade</Link>.
        </label>
      </div>
      {erros.aceiteTermos ? (
        <p id="aceite-erro" className={s.erro} role="alert">
          {MENSAGENS_CADASTRO.aceite}
        </p>
      ) : null}

      {contaExiste ? (
        <p className={s.erro} role="alert">
          {MENSAGENS_CADASTRO.contaExistente}{' '}
          {aoPedirLogin ? (
            <button type="button" className={s.linkBotao} onClick={aoPedirLogin}>
              Entrar
            </button>
          ) : (
            <Link to="/entrar">Entrar</Link>
          )}
        </p>
      ) : null}
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
        {textoBotao}
      </Botao3D>
      {rodape}
    </form>
  );
}
