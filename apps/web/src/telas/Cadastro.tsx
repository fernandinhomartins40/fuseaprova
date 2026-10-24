import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AVISO_EDITAL } from '@fuse/shared';
import { CadastroEntrada, MENSAGENS_CADASTRO, VERSAO_TERMOS_ATUAL } from '@fuse/shared/api';
import { camposDoErro, chamar, ErroApi, mensagemDeErro } from '../api/cliente';
import { CHAVES } from '../api/consultas';
import { Botao3D, CabecalhoVoltar, Campo, Capi, IconeTraco, Pagina } from '../ui';
import { errosPorCampo, rotaDoProximo } from './formulario';
import s from './Auth.module.css';

/** 02 Cadastro (`/cadastro`), etapa 1 de 2. */
export default function Cadastro() {
  const navegar = useNavigate();
  const qc = useQueryClient();
  const [v, setV] = useState({ nome: '', email: '', celular: '', cpf: '', senha: '' });
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
    if (!r.success) {
      setErros(errosPorCampo(r.error));
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      const sessao = await chamar('authCadastro', { corpo });
      await qc.invalidateQueries({ queryKey: CHAVES.me });
      navegar(rotaDoProximo(sessao.proximo), { replace: true });
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
    <Pagina>
      <CabecalhoVoltar para="/" etapa={{ atual: 1, total: 2 }} />
      <h1 className={s.titulo}>Vamos começar?</h1>
      <Capi
        pose="incentivando"
        tamanho={86}
        className={s.capi}
        fala="Vamos criar sua conta. O CPF é usado só na cobrança Pix."
        carregamento="eager"
      />
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
        <Campo
          rotulo="Senha"
          valor={v.senha}
          onValor={campo('senha')}
          erro={erros.senha}
          senha
          autoComplete="new-password"
          ajuda="Pelo menos 8 caracteres."
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
            {MENSAGENS_CADASTRO.contaExistente} <Link to="/entrar">Entrar</Link>
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
          Criar conta e ir para o pagamento
        </Botao3D>
        <p className={s.aviso}>{AVISO_EDITAL}</p>
        <p className={s.rodape}>
          Já tem conta? <Link to="/entrar">Entrar</Link>
        </p>
      </form>
    </Pagina>
  );
}
