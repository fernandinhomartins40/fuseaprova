import type { ReactNode } from 'react';
import { Imagem } from './Imagem';
import type { NomeAsset } from '../assets/gerados';
import s from './CartaoEstatistica.module.css';

/** Cartão de estatística: ícone 3D, valor em Baloo 2 e legenda. */
export function CartaoEstatistica({
  icone,
  valor,
  legenda,
  vertical = false,
  className,
}: {
  icone: NomeAsset;
  valor: ReactNode;
  legenda: string;
  /** Ícone em cima e texto centralizado (cartões do Fim da lição). */
  vertical?: boolean;
  className?: string;
}) {
  return (
    <div className={[s.cartao, vertical ? s.vertical : '', className ?? ''].join(' ')}>
      <Imagem nome={icone} tamanho={vertical ? 36 : 34} className={s.icone} />
      <div className={s.textos}>
        <span className={s.valor}>{valor}</span>
        <span className={s.legenda}>{legenda}</span>
      </div>
    </div>
  );
}
