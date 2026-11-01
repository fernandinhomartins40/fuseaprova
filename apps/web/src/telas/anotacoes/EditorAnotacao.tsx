import { useEffect, useId, useRef, useState } from 'react';
import { AnotacaoEntrada } from '@fuse/shared/api';
import { chamar, mensagemDeErro } from '../../api/cliente';
import { IconeTraco } from '../../ui';
import s from './Anotacoes.module.css';

const MAXIMO = 2000;
/** Espera depois da última tecla antes de gravar sozinho. */
export const ESPERA_SALVAR_MS = 1000;

type Status = 'ocioso' | 'salvando' | 'salvo' | 'apagada' | 'erro';

/**
 * D28: anotação pessoal da questão (aba "Anotar" da folha e detalhe em "Minhas anotações").
 * Grava sozinha: 1 s depois de parar de digitar e, se sobrar texto não gravado, ao sair (ex.: o
 * aluno toca em CONTINUAR). `antesDeSalvar` espera a resposta chegar ao servidor, porque a
 * anotação exige a questão respondida.
 */
export function EditorAnotacao({
  questaoId,
  inicial,
  offline = false,
  antesDeSalvar,
  onMudou,
  dicaOndeVer = true,
}: {
  questaoId: string;
  /** Texto já conhecido (o detalhe já carregou); sem ele, busca na API. */
  inicial?: string | null;
  offline?: boolean;
  antesDeSalvar?: () => Promise<void>;
  onMudou?: (texto: string | null) => void;
  /** Mostra "fica em Minhas anotações" depois de salvar (na lição). */
  dicaOndeVer?: boolean;
}) {
  const id = useId();
  const [carregando, setCarregando] = useState(inicial === undefined && !offline);
  const [texto, setTexto] = useState(inicial ?? '');
  const [salvo, setSalvo] = useState<string | null>(inicial ?? null);
  const [status, setStatus] = useState<Status>('ocioso');
  const [erro, setErro] = useState<string | null>(null);
  const vivo = useRef(true);
  // Refs para o salvamento ao sair (o efeito de limpeza não vê o estado mais novo).
  const atual = useRef({ texto, salvo, carregando });
  atual.current = { texto, salvo, carregando };
  const gravando = useRef<Promise<void> | null>(null);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  useEffect(() => {
    if (inicial !== undefined || offline) return;
    let ok = true;
    chamar('anotacaoObter', { params: { id: questaoId } })
      .then((r) => {
        if (!ok) return;
        setTexto(r.anotacao?.texto ?? '');
        setSalvo(r.anotacao?.texto ?? null);
      })
      .catch(() => undefined)
      .finally(() => ok && setCarregando(false));
    return () => {
      ok = false;
    };
  }, [questaoId, inicial, offline]);

  async function gravar(valor: string): Promise<void> {
    const r = AnotacaoEntrada.safeParse({ texto: valor });
    if (!r.success) return;
    if (vivo.current) {
      setStatus('salvando');
      setErro(null);
    }
    try {
      await antesDeSalvar?.();
      await chamar('anotacaoSalvar', { params: { id: questaoId }, corpo: r.data });
      atual.current.salvo = r.data.texto;
      if (vivo.current) {
        setSalvo(r.data.texto);
        setStatus('salvo');
      }
      onMudou?.(r.data.texto);
    } catch (e) {
      if (vivo.current) {
        setStatus('erro');
        setErro(mensagemDeErro(e));
      }
    }
  }

  const pendente = !carregando && texto.trim() !== '' && texto.trim() !== (salvo ?? '').trim();

  // Grava sozinha um instante depois da última tecla.
  useEffect(() => {
    if (offline || !pendente) return;
    const t = setTimeout(() => {
      gravando.current = gravar(texto);
    }, ESPERA_SALVAR_MS);
    return () => clearTimeout(t);
  }, [texto, pendente, offline]);

  // Ao sair (ex.: CONTINUAR), grava o que ainda não foi gravado.
  useEffect(() => {
    return () => {
      const { texto: t, salvo: sv, carregando: c } = atual.current;
      if (!offline && !c && t.trim() && t.trim() !== (sv ?? '').trim()) void gravar(t);
    };
  }, []);

  if (offline) {
    return (
      <p className={s.editorAviso}>
        <IconeTraco nome="wifiOff" tamanho={16} /> As anotações precisam de conexão. Volte a esta
        questão em "Minhas anotações" quando estiver online.
      </p>
    );
  }

  async function apagar() {
    setErro(null);
    setStatus('salvando');
    try {
      await chamar('anotacaoExcluir', { params: { id: questaoId } });
      setSalvo(null);
      setTexto('');
      setStatus('apagada');
      onMudou?.(null);
    } catch (e) {
      setStatus('erro');
      setErro(mensagemDeErro(e));
    }
  }

  const aviso =
    status === 'salvando'
      ? 'Salvando…'
      : pendente
        ? 'Digitando…'
        : status === 'salvo'
          ? dicaOndeVer
            ? 'Salvo. Fica em "Minhas anotações", no topo das telas.'
            : 'Salvo.'
          : status === 'apagada'
            ? 'Anotação apagada.'
            : salvo
              ? 'Salvo.'
              : `${texto.length}/${MAXIMO}`;

  return (
    <div className={s.editor}>
      <label htmlFor={id} className={s.editorRotulo}>
        <IconeTraco nome="lapis" tamanho={18} /> Minha anotação
      </label>
      <p className={s.editorAjuda}>
        Escreva com suas palavras o que quer lembrar. Só você vê. Ela é salva sozinha e fica
        organizada pelo tema da questão em "Minhas anotações".
      </p>
      <textarea
        id={id}
        className={s.editorTexto}
        value={texto}
        disabled={carregando}
        placeholder={carregando ? 'Carregando…' : 'Ex.: crase antes de palavra feminina'}
        onChange={(e) => {
          setTexto(e.target.value);
          if (status !== 'salvando') setStatus('ocioso');
        }}
        onBlur={() => {
          if (pendente) gravando.current = gravar(texto);
        }}
        maxLength={MAXIMO}
        rows={4}
      />
      <div className={s.editorRodape}>
        <p
          className={status === 'salvo' ? s.editorSalvo : s.editorContador}
          role="status"
          aria-live="polite"
        >
          {status === 'salvo' ? <IconeTraco nome="check" tamanho={14} espessura={3} /> : null}
          {aviso}
        </p>
        {salvo ? (
          <button type="button" className={s.editorApagar} onClick={() => void apagar()}>
            <IconeTraco nome="lixeira" tamanho={16} /> Apagar
          </button>
        ) : null}
      </div>
      {erro ? (
        <p role="alert" className={s.editorErro}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}
