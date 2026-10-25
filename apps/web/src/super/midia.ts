/**
 * Faixas do layout do /super (D13): celular < 768 px, tablet 768–1023 px, desktop ≥ 1024 px.
 */
import { useEffect, useState } from 'react';

export type Faixa = 'mobile' | 'tablet' | 'desktop';

export const CONSULTA_DESKTOP = '(min-width: 1024px)';
export const CONSULTA_TABLET = '(min-width: 768px)';

function mm(q: string): MediaQueryList | null {
  try {
    return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null;
  } catch {
    return null;
  }
}

export function faixaAtual(): Faixa {
  if (mm(CONSULTA_DESKTOP)?.matches) return 'desktop';
  if (mm(CONSULTA_TABLET)?.matches) return 'tablet';
  return 'mobile';
}

export function useFaixa(): Faixa {
  const [faixa, setFaixa] = useState<Faixa>(faixaAtual);
  useEffect(() => {
    const listas = [mm(CONSULTA_DESKTOP), mm(CONSULTA_TABLET)].filter((x): x is MediaQueryList => !!x);
    const mudar = () => setFaixa(faixaAtual());
    for (const l of listas) l.addEventListener?.('change', mudar);
    return () => {
      for (const l of listas) l.removeEventListener?.('change', mudar);
    };
  }, []);
  return faixa;
}

/** localStorage com try/catch (aba privada, armazenamento bloqueado). */
export const preferencia = {
  ler(chave: string): string | null {
    try {
      return window.localStorage.getItem(chave);
    } catch {
      return null;
    }
  },
  gravar(chave: string, valor: string): void {
    try {
      window.localStorage.setItem(chave, valor);
    } catch {
      /* sem armazenamento: a preferência vale só nesta visita */
    }
  },
};
