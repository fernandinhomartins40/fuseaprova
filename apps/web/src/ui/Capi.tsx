import type { ReactNode } from 'react';
import { Imagem } from './Imagem';
import type { NomeAsset } from '../assets/gerados';
import s from './Capi.module.css';

/** Poses do mascote 4K (Fuse_Aprova_Assets_4K/mascote). */
export type PoseCapi =
  | 'boas-vindas'
  | 'estudando'
  | 'celebrando'
  | 'explicando'
  | 'constancia'
  | 'incentivando';

const ASSET_POSE: Record<PoseCapi, NomeAsset> = {
  'boas-vindas': 'mascote-boas-vindas',
  estudando: 'mascote-estudando',
  celebrando: 'mascote-celebrando',
  explicando: 'mascote-explicando',
  constancia: 'mascote-constancia',
  incentivando: 'mascote-incentivando',
};

const ALT_POSE: Record<PoseCapi, string> = {
  'boas-vindas': 'Capi, a capivara do Fuse Aprova, acenando',
  estudando: 'Capi lendo um livro',
  celebrando: 'Capi comemorando',
  explicando: 'Capi explicando',
  constancia: 'Capi segurando um calendário',
  incentivando: 'Capi fazendo sinal de positivo',
};

/**
 * Capi, a capivara com lenço turquesa. Fala por balões de borda clara com rabicho.
 * Decorativa por padrão (o texto do balão é lido normalmente).
 */
export function Capi({
  pose,
  tamanho = 160,
  fala,
  lado = 'direita',
  pular = false,
  descrever = false,
  className,
  carregamento = 'lazy',
}: {
  pose: PoseCapi;
  /** Altura em CSS px. */
  tamanho?: number;
  fala?: ReactNode;
  /** Lado do balão em relação à Capi. */
  lado?: 'direita' | 'esquerda' | 'cima';
  /** Pula uma vez (celebração); sem pulo com prefers-reduced-motion. */
  pular?: boolean;
  /** Dá texto alternativo à imagem (quando ela é o conteúdo principal). */
  descrever?: boolean;
  className?: string;
  carregamento?: 'lazy' | 'eager';
}) {
  return (
    <div className={[s.capi, s[lado], className ?? ''].join(' ')}>
      <Imagem
        nome={ASSET_POSE[pose]}
        tamanho={tamanho}
        alt={descrever ? ALT_POSE[pose] : ''}
        className={pular ? s.pular : undefined}
        carregamento={carregamento}
      />
      {fala ? <div className={s.balao}>{fala}</div> : null}
    </div>
  );
}
