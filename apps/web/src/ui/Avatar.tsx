import { corDoAvatar, iniciais } from '@fuse/shared';
import s from './Avatar.module.css';

/** Avatar com as iniciais e a cor derivada do id (sem foto: não há perfil público). */
export function Avatar({
  nome,
  id,
  iniciaisProntas,
  cor,
  tamanho = 44,
  suave = false,
  className,
}: {
  nome: string;
  id?: string;
  iniciaisProntas?: string;
  cor?: string;
  tamanho?: number;
  /** Fundo claro com texto escuro (cabeçalho, como nas telas de referência). */
  suave?: boolean;
  className?: string;
}) {
  const fundo = cor ?? (id ? corDoAvatar(id) : '#00545D');
  return (
    <span
      className={[s.avatar, suave ? s.suave : '', className ?? ''].join(' ')}
      style={{
        width: tamanho,
        height: tamanho,
        fontSize: Math.round(tamanho * 0.38),
        ...(suave ? {} : { background: fundo }),
      }}
      role="img"
      aria-label={`Avatar de ${nome}`}
    >
      {iniciaisProntas ?? iniciais(nome)}
    </span>
  );
}
