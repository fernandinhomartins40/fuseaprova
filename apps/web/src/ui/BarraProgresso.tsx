import s from './BarraProgresso.module.css';

export type CorBarra =
  | 'acao'
  | 'acerto'
  | 'laranja'
  | 'azul'
  | 'roxo'
  | 'ouro'
  | 'portugues'
  | 'matematica'
  | 'gerais'
  | 'especificos';

/** Barra de progresso: trilho claro, preenchimento com brilho interno; role=progressbar. */
export function BarraProgresso({
  valor,
  rotulo,
  cor = 'acao',
  fina = false,
  className,
}: {
  /** 0 a 1 */
  valor: number;
  rotulo: string;
  cor?: CorBarra;
  fina?: boolean;
  className?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, valor)) * 100);
  return (
    <div
      className={[s.trilho, fina ? s.fina : '', className ?? ''].join(' ')}
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className={[s.preenchimento, s[cor]].join(' ')} style={{ width: `${pct}%` }} />
    </div>
  );
}
