/**
 * Lista reordenável por arrastar e soltar (HTML5 nativo) com alternativa por teclado
 * (botões Subir/Descer). Chama `aoReordenar` com a nova ordem dos ids.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { juntarClasses } from '../util';
import s from './ListaOrdenavel.module.css';

export function mover<T>(lista: readonly T[], de: number, para: number): T[] {
  const copia = [...lista];
  if (de < 0 || de >= copia.length || para < 0 || para >= copia.length || de === para) return copia;
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item as T);
  return copia;
}

const TIPO_ARRASTE = 'application/x-fuse-ordem';

export function ListaOrdenavel<T extends { id: string }>(props: {
  itens: readonly T[];
  /** Nome curto do item para os rótulos acessíveis ("Unidade Português"). */
  rotulo: (item: T) => string;
  render: (item: T) => ReactNode;
  aoReordenar: (ids: string[]) => void;
  /** Grupo de arraste: impede soltar itens de outra lista. */
  grupo: string;
  rotuloLista: string;
  desabilitada?: boolean;
}) {
  const { itens, rotulo, aoReordenar, grupo } = props;
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState('');
  const foco = useRef<{ id: string; dir: 'subir' | 'descer' } | null>(null);
  const botoes = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    const f = foco.current;
    if (!f) return;
    foco.current = null;
    const idx = itens.findIndex((i) => i.id === f.id);
    // Se chegou na ponta, o botão da direção some/desabilita: foca o outro.
    const alvo =
      botoes.current.get(`${f.id}:${f.dir}`) ??
      botoes.current.get(`${f.id}:${f.dir === 'subir' ? 'descer' : 'subir'}`);
    if (alvo && !alvo.disabled) alvo.focus();
    else botoes.current.get(`${f.id}:${idx === 0 ? 'descer' : 'subir'}`)?.focus();
  }, [itens]);

  function reordenar(de: number, para: number, dir?: 'subir' | 'descer') {
    if (para < 0 || para >= itens.length || de === para) return;
    const nova = mover(itens, de, para);
    const item = itens[de];
    if (item) {
      setAnuncio(`${rotulo(item)} movida para a posição ${para + 1} de ${itens.length}.`);
      if (dir) foco.current = { id: item.id, dir };
    }
    aoReordenar(nova.map((i) => i.id));
  }

  return (
    <>
      <ol className={s.lista} aria-label={props.rotuloLista}>
        {itens.map((item, i) => (
          <li
            key={item.id}
            className={juntarClasses(
              s.item,
              arrastando === item.id && s.arrastando,
              sobre === item.id && arrastando !== item.id && s.sobre,
            )}
            draggable={!props.desabilitada}
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData(TIPO_ARRASTE, `${grupo}:${item.id}`);
              setArrastando(item.id);
            }}
            onDragEnd={() => {
              setArrastando(null);
              setSobre(null);
            }}
            onDragOver={(e) => {
              if (!arrastando || !e.dataTransfer.types.includes(TIPO_ARRASTE)) return;
              e.preventDefault();
              e.stopPropagation();
              setSobre(item.id);
            }}
            onDrop={(e) => {
              const dado = e.dataTransfer.getData(TIPO_ARRASTE);
              if (!dado.startsWith(`${grupo}:`)) return;
              e.preventDefault();
              e.stopPropagation();
              const de = itens.findIndex((x) => x.id === dado.slice(grupo.length + 1));
              setArrastando(null);
              setSobre(null);
              if (de >= 0) reordenar(de, i);
            }}
          >
            <span className={s.alca} aria-hidden="true" title="Arraste para reordenar">
              ⋮⋮
            </span>
            <div className={s.conteudo}>{props.render(item)}</div>
            <span className={s.setas}>
              <button
                type="button"
                className={s.seta}
                ref={(el) => {
                  if (el) botoes.current.set(`${item.id}:subir`, el);
                  else botoes.current.delete(`${item.id}:subir`);
                }}
                aria-label={`Subir ${rotulo(item)}`}
                disabled={props.desabilitada || i === 0}
                onClick={() => reordenar(i, i - 1, 'subir')}
              >
                ▲
              </button>
              <button
                type="button"
                className={s.seta}
                ref={(el) => {
                  if (el) botoes.current.set(`${item.id}:descer`, el);
                  else botoes.current.delete(`${item.id}:descer`);
                }}
                aria-label={`Descer ${rotulo(item)}`}
                disabled={props.desabilitada || i === itens.length - 1}
                onClick={() => reordenar(i, i + 1, 'descer')}
              >
                ▼
              </button>
            </span>
          </li>
        ))}
      </ol>
      <div className={s.anuncio} role="status" aria-live="polite">
        {anuncio}
      </div>
    </>
  );
}
