import { ASSETS, type NomeAsset } from '../assets/gerados';

export interface ImagemProps {
  nome: NomeAsset;
  /** Tamanho do maior lado, em CSS px. */
  tamanho: number;
  /** Texto alternativo; vazio = decorativa. */
  alt?: string;
  className?: string;
  carregamento?: 'lazy' | 'eager';
}

/** Asset 4K redimensionado (WebP 1×/2×), com proporção preservada (object-fit: contain). */
export function Imagem({ nome, tamanho, alt = '', className, carregamento = 'lazy' }: ImagemProps) {
  const a = ASSETS[nome];
  const retrato = a.altura >= a.largura;
  const largura = retrato ? Math.round((tamanho * a.largura) / a.altura) : tamanho;
  const altura = retrato ? tamanho : Math.round((tamanho * a.altura) / a.largura);
  return (
    <img
      src={a.x1}
      srcSet={`${a.x1} 1x, ${a.x2} 2x`}
      width={largura}
      height={altura}
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      loading={carregamento}
      decoding="async"
      draggable={false}
      className={className}
    />
  );
}
