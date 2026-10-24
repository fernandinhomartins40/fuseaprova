import type { ReactNode } from 'react';
import s from './Chip.module.css';

export type VarianteChip =
  | 'neutro'
  | 'marca'
  | 'laranja'
  | 'acerto'
  | 'erro'
  | 'ouro'
  | 'roxo'
  | 'azul'
  | 'claro';

/** Chip: raio 8, texto 12 px peso 900. Origem da questão, COMBO, ACESSO COMPLETO… */
export function Chip({
  children,
  variante = 'neutro',
  icone,
  className,
  grande = false,
}: {
  children: ReactNode;
  variante?: VarianteChip;
  icone?: ReactNode;
  className?: string;
  grande?: boolean;
}) {
  return (
    <span className={[s.chip, s[variante], grande ? s.grande : '', className ?? ''].join(' ')}>
      {icone ? <span className={s.icone}>{icone}</span> : null}
      {children}
    </span>
  );
}
