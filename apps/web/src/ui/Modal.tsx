import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Botao3D, type VarianteBotao } from './Botao3D';
import { IconeTraco } from './IconeTraco';
import s from './Modal.module.css';

export interface ModalProps {
  aberto: boolean;
  titulo: ReactNode;
  onFechar: () => void;
  children?: ReactNode;
  /** 'centro' = diálogo; 'folha' = sobe de baixo. */
  formato?: 'centro' | 'folha';
  /** Esconde o botão ✕ (decisão obrigatória). */
  semFechar?: boolean;
  /** Ilustração acima do título. */
  topo?: ReactNode;
  rodape?: ReactNode;
  descricao?: ReactNode;
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Diálogo acessível: role="dialog", aria-modal, foco preso, Esc fecha, volta o foco ao sair. */
export function Modal({
  aberto,
  titulo,
  onFechar,
  children,
  formato = 'centro',
  semFechar = false,
  topo,
  rodape,
  descricao,
}: ModalProps) {
  const id = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const el = caixa.current;
    const primeiro =
      el?.querySelector<HTMLElement>('[data-autofoco]') ?? el?.querySelector<HTMLElement>(FOCAVEIS);
    (primeiro ?? el)?.focus();
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape' && !semFechar) {
        e.preventDefault();
        fechar.current();
        return;
      }
      if (e.key !== 'Tab' || !el) return;
      const itens = Array.from(el.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (itens.length === 0) return;
      const ini = itens[0]!;
      const fim = itens[itens.length - 1]!;
      if (e.shiftKey && document.activeElement === ini) {
        e.preventDefault();
        fim.focus();
      } else if (!e.shiftKey && document.activeElement === fim) {
        e.preventDefault();
        ini.focus();
      }
    }
    document.addEventListener('keydown', aoTeclar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [aberto, semFechar]);

  if (!aberto) return null;
  return createPortal(
    <div
      className={[s.fundo, s[formato]].join(' ')}
      onMouseDown={(e) => e.target === e.currentTarget && !semFechar && onFechar()}
    >
      <div
        ref={caixa}
        className={s.caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={descricao ? `${id}-desc` : undefined}
        tabIndex={-1}
      >
        {!semFechar ? (
          <button type="button" className={s.fechar} onClick={onFechar} aria-label="Fechar">
            <IconeTraco nome="fechar" tamanho={22} />
          </button>
        ) : null}
        {topo ? <div className={s.topo}>{topo}</div> : null}
        <h2 id={`${id}-titulo`} className={s.titulo}>
          {titulo}
        </h2>
        {descricao ? (
          <div id={`${id}-desc`} className={s.descricao}>
            {descricao}
          </div>
        ) : null}
        {children}
        {rodape ? <div className={s.rodape}>{rodape}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Confirmação com duas ações (ex.: "Quer mesmo sair?" CONTINUAR ESTUDANDO / SAIR). */
export function Confirmacao({
  aberto,
  titulo,
  texto,
  textoConfirmar,
  textoCancelar,
  onConfirmar,
  onCancelar,
  varianteConfirmar = 'perigo',
  carregando = false,
  topo,
  children,
  confirmarPrincipal = false,
}: {
  aberto: boolean;
  titulo: ReactNode;
  texto?: ReactNode;
  textoConfirmar: string;
  textoCancelar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  varianteConfirmar?: VarianteBotao;
  carregando?: boolean;
  topo?: ReactNode;
  children?: ReactNode;
  /** Por padrão o botão de cima (principal) é CANCELAR (continuar estudando). */
  confirmarPrincipal?: boolean;
}) {
  const cancelar = (
    <Botao3D
      key="c"
      variante={confirmarPrincipal ? 'secundario' : 'primario'}
      onClick={onCancelar}
      data-autofoco={confirmarPrincipal ? undefined : true}
    >
      {textoCancelar}
    </Botao3D>
  );
  const confirmar = (
    <Botao3D
      key="ok"
      variante={confirmarPrincipal ? varianteConfirmar : 'secundario'}
      onClick={onConfirmar}
      carregando={carregando}
      data-autofoco={confirmarPrincipal ? true : undefined}
    >
      {textoConfirmar}
    </Botao3D>
  );
  return (
    <Modal
      aberto={aberto}
      titulo={titulo}
      onFechar={onCancelar}
      formato="folha"
      topo={topo}
      descricao={texto}
      rodape={confirmarPrincipal ? [confirmar, cancelar] : [cancelar, confirmar]}
    >
      {children}
    </Modal>
  );
}
