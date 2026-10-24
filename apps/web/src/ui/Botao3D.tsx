import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import s from './Botao3D.module.css';

export type VarianteBotao =
  | 'primario'
  | 'secundario'
  | 'perigo'
  | 'roxo'
  | 'azul'
  | 'laranja'
  | 'claro'
  | 'acerto';

export interface Botao3DProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  compacto?: boolean;
  /** Largura toda (padrão true). */
  bloco?: boolean;
  carregando?: boolean;
  iconeDireita?: ReactNode;
  iconeEsquerda?: ReactNode;
}

/**
 * Botão 3D: fundo na cor do papel com sombra sólida embaixo; ao pressionar desce 4 px (80 ms).
 * Desabilitado: fundo bloqueado, texto apagado. 54 px (compacto 44 px).
 */
export const Botao3D = forwardRef<HTMLButtonElement, Botao3DProps>(function Botao3D(
  {
    variante = 'primario',
    compacto = false,
    bloco = true,
    carregando = false,
    iconeDireita,
    iconeEsquerda,
    className,
    children,
    disabled,
    type = 'button',
    ...resto
  },
  ref,
) {
  const classes = [
    s.botao,
    s[variante],
    compacto ? s.compacto : '',
    bloco ? s.bloco : '',
    carregando ? s.carregando : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {iconeEsquerda ? <span className={s.icone}>{iconeEsquerda}</span> : null}
      <span className={s.texto}>{children}</span>
      {iconeDireita ? <span className={s.icone}>{iconeDireita}</span> : null}
    </button>
  );
});
