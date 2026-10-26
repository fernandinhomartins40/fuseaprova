import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { Letra } from '@fuse/shared';
import { IconeTraco } from './IconeTraco';
import { MarkdownEmLinha, semMarcasMarkdown } from './Markdown';
import s from './Alternativa.module.css';

export type EstadoAlternativa =
  | 'neutra'
  | 'selecionada'
  | 'correta'
  | 'errada'
  | 'reveladaCorreta'
  | 'apagada';

export interface AlternativaProps {
  letra: Letra;
  texto: string;
  estado: EstadoAlternativa;
  /** Foco móvel do radiogroup (roving tabindex). */
  focavel: boolean;
  desabilitada?: boolean;
  onSelecionar: (letra: Letra) => void;
  onTecla?: (e: KeyboardEvent<HTMLDivElement>) => void;
}

/** Cartão de resposta: tecla A–E, role="radio", estados de seleção e correção. */
export function Alternativa({
  letra,
  texto,
  estado,
  focavel,
  desabilitada,
  onSelecionar,
  onTecla,
}: AlternativaProps) {
  const marcada = estado === 'selecionada' || estado === 'correta' || estado === 'errada';
  const rotuloEstado =
    estado === 'correta'
      ? ', resposta correta'
      : estado === 'errada'
        ? ', sua resposta, errada'
        : estado === 'reveladaCorreta'
          ? ', esta era a correta'
          : '';
  return (
    <div
      role="radio"
      aria-checked={marcada}
      aria-disabled={desabilitada || undefined}
      aria-label={`${letra}) ${semMarcasMarkdown(texto)}${rotuloEstado}`}
      tabIndex={focavel ? 0 : -1}
      data-letra={letra}
      className={[s.alternativa, s[estado]].join(' ')}
      onClick={() => !desabilitada && onSelecionar(letra)}
      onKeyDown={onTecla}
    >
      <span className={s.tecla} aria-hidden="true">
        {estado === 'correta' ? (
          <IconeTraco nome="check" tamanho={18} espessura={3.2} />
        ) : estado === 'errada' ? (
          <IconeTraco nome="x" tamanho={18} espessura={3.2} />
        ) : (
          letra
        )}
      </span>
      <span className={s.texto} aria-hidden="true">
        <MarkdownEmLinha texto={texto} />
      </span>
      {estado === 'correta' || estado === 'reveladaCorreta' ? (
        <span className={[s.selo, s.seloOk].join(' ')} aria-hidden="true">
          <IconeTraco nome="check" tamanho={16} espessura={3.2} />
        </span>
      ) : estado === 'errada' ? (
        <span className={[s.selo, s.seloErro].join(' ')} aria-hidden="true">
          <IconeTraco nome="x" tamanho={16} espessura={3.2} />
        </span>
      ) : null}
    </div>
  );
}

const LETRAS: Letra[] = ['A', 'B', 'C', 'D', 'E'];

export interface GrupoAlternativasProps {
  alternativas: { letra: Letra; texto: string }[];
  selecionada: Letra | null;
  /** Depois de responder: a letra correta e a marcada. */
  correcao?: { gabarito: Letra; marcada: Letra } | null;
  onSelecionar: (letra: Letra) => void;
  /** Enter: verificar / continuar. */
  onConfirmar?: () => void;
  /** Escuta 1–5, A–E e Enter no documento inteiro (tela de lição). */
  atalhosGlobais?: boolean;
  rotulo?: string;
}

function estadoDe(
  letra: Letra,
  selecionada: Letra | null,
  correcao: GrupoAlternativasProps['correcao'],
): EstadoAlternativa {
  if (correcao) {
    if (letra === correcao.gabarito)
      return letra === correcao.marcada ? 'correta' : 'reveladaCorreta';
    if (letra === correcao.marcada) return 'errada';
    return 'apagada';
  }
  return letra === selecionada ? 'selecionada' : 'neutra';
}

/** Letra a partir da tecla: 1–5 ou A–E. */
export function letraDaTecla(tecla: string): Letra | null {
  const t = tecla.toUpperCase();
  if (/^[1-5]$/.test(t)) return LETRAS[Number(t) - 1] ?? null;
  if ((LETRAS as string[]).includes(t)) return t as Letra;
  return null;
}

/** radiogroup das 5 alternativas, com navegação por setas e atalhos 1–5/A–E e Enter. */
export function GrupoAlternativas({
  alternativas,
  selecionada,
  correcao = null,
  onSelecionar,
  onConfirmar,
  atalhosGlobais = false,
  rotulo = 'Alternativas',
}: GrupoAlternativasProps) {
  const grupo = useRef<HTMLDivElement>(null);
  const travado = !!correcao;
  const focavel = selecionada ?? alternativas[0]?.letra ?? 'A';

  // Atalhos no documento (a lição inteira é navegável por teclado).
  const ultimo = useRef({ onSelecionar, onConfirmar, travado });
  ultimo.current = { onSelecionar, onConfirmar, travado };
  useEffect(() => {
    if (!atalhosGlobais) return;
    function aoTeclar(e: globalThis.KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      if (alvo?.closest('[role="dialog"]')) return;
      const l = letraDaTecla(e.key);
      if (l && !ultimo.current.travado) {
        e.preventDefault();
        ultimo.current.onSelecionar(l);
        grupo.current?.querySelector<HTMLElement>(`[data-letra="${l}"]`)?.focus();
        return;
      }
      if (e.key === 'Enter' && ultimo.current.onConfirmar) {
        if (alvo && alvo.tagName === 'BUTTON') return; // o próprio botão trata
        e.preventDefault();
        ultimo.current.onConfirmar();
      }
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [atalhosGlobais]);

  function aoTeclarItem(e: KeyboardEvent<HTMLDivElement>) {
    const atual = (e.currentTarget.dataset.letra ?? 'A') as Letra;
    const i = LETRAS.indexOf(atual);
    let proxima: Letra | null = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') proxima = LETRAS[(i + 1) % 5] ?? null;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') proxima = LETRAS[(i + 4) % 5] ?? null;
    if (proxima) {
      e.preventDefault();
      if (!travado) onSelecionar(proxima);
      grupo.current?.querySelector<HTMLElement>(`[data-letra="${proxima}"]`)?.focus();
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      if (!travado) onSelecionar(atual);
      return;
    }
    if (!atalhosGlobais) {
      const l = letraDaTecla(e.key);
      if (l && !travado) {
        e.preventDefault();
        onSelecionar(l);
      } else if (e.key === 'Enter' && onConfirmar) {
        e.preventDefault();
        onConfirmar();
      }
    }
  }

  return (
    <div ref={grupo} role="radiogroup" aria-label={rotulo} className={s.grupo}>
      {alternativas.map((a) => (
        <Alternativa
          key={a.letra}
          letra={a.letra}
          texto={a.texto}
          estado={estadoDe(a.letra, selecionada, correcao)}
          focavel={a.letra === focavel}
          desabilitada={travado}
          onSelecionar={onSelecionar}
          onTecla={aoTeclarItem}
        />
      ))}
    </div>
  );
}
