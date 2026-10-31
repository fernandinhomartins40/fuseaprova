import { useEffect, useId, useState } from 'react';
import { AnotacaoEntrada } from '@fuse/shared/api';
import { chamar, mensagemDeErro } from '../../api/cliente';
import { Botao3D, IconeTraco } from '../../ui';
import s from './Anotacoes.module.css';

const MAXIMO = 2000;

/**
 * D28: anotação pessoal da questão (aba "Anotar" da folha e detalhe em "Minhas anotações").
 * `antesDeSalvar` espera a resposta chegar ao servidor (a anotação exige a questão respondida).
 */
export function EditorAnotacao({
  questaoId,
  inicial,
  offline = false,
  antesDeSalvar,
  onMudou,
}: {
  questaoId: string;
  /** Texto já conhecido (o detalhe já carregou); sem ele, busca na API. */
  inicial?: string | null;
  offline?: boolean;
  antesDeSalvar?: () => Promise<void>;
  onMudou?: (texto: string | null) => void;
}) {
  const id = useId();
  const [carregando, setCarregando] = useState(inicial === undefined && !offline);
  const [texto, setTexto] = useState(inicial ?? '');
  const [salvo, setSalvo] = useState<string | null>(inicial ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (inicial !== undefined || offline) return;
    let vivo = true;
    chamar('anotacaoObter', { params: { id: questaoId } })
      .then((r) => {
        if (!vivo) return;
        setTexto(r.anotacao?.texto ?? '');
        setSalvo(r.anotacao?.texto ?? null);
      })
      .catch(() => undefined)
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [questaoId, inicial, offline]);

  if (offline) {
    return (
      <p className={s.editorAviso}>
        <IconeTraco nome="wifiOff" tamanho={16} /> As anotações precisam de conexão. Volte a esta
        questão em "Minhas anotações" quando estiver online.
      </p>
    );
  }

  async function salvar() {
    const r = AnotacaoEntrada.safeParse({ texto });
    if (!r.success) {
      setErro(r.error.issues[0]?.message ?? 'Confira o texto.');
      return;
    }
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      await antesDeSalvar?.();
      const x = await chamar('anotacaoSalvar', { params: { id: questaoId }, corpo: r.data });
      setSalvo(x.anotacao?.texto ?? r.data.texto);
      setTexto(x.anotacao?.texto ?? r.data.texto);
      setAviso('Anotação salva.');
      onMudou?.(r.data.texto);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      await chamar('anotacaoExcluir', { params: { id: questaoId } });
      setSalvo(null);
      setTexto('');
      setAviso('Anotação apagada.');
      onMudou?.(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const mudou = texto.trim() !== (salvo ?? '').trim();
  return (
    <div className={s.editor}>
      <label htmlFor={id} className={s.editorRotulo}>
        <IconeTraco nome="lapis" tamanho={18} /> Minha anotação
      </label>
      <p className={s.editorAjuda}>
        Escreva com suas palavras o que quer lembrar. Só você vê, e ela fica organizada pelo tema
        da questão em "Minhas anotações".
      </p>
      <textarea
        id={id}
        className={s.editorTexto}
        value={texto}
        disabled={carregando}
        placeholder={carregando ? 'Carregando…' : 'Ex.: crase antes de palavra feminina'}
        onChange={(e) => {
          setTexto(e.target.value);
          setAviso(null);
        }}
        maxLength={MAXIMO}
        rows={4}
      />
      <p className={s.editorContador} aria-live="polite">
        {aviso ?? `${texto.length}/${MAXIMO}`}
      </p>
      {erro ? (
        <p role="alert" className={s.editorErro}>
          {erro}
        </p>
      ) : null}
      <div className={s.editorAcoes}>
        <Botao3D
          variante="secundario"
          disabled={!mudou || carregando || !texto.trim()}
          carregando={salvando}
          onClick={() => void salvar()}
        >
          {salvo ? 'SALVAR ALTERAÇÃO' : 'SALVAR ANOTAÇÃO'}
        </Botao3D>
        {salvo ? (
          <button
            type="button"
            className={s.editorApagar}
            disabled={salvando}
            onClick={() => void apagar()}
          >
            <IconeTraco nome="lixeira" tamanho={16} /> Apagar
          </button>
        ) : null}
      </div>
    </div>
  );
}
