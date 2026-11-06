import { useEffect, useState } from 'react';
import { EH_APP } from '../nativo/plataforma';
import s from './VideoAula.module.css';

/**
 * D41: player da videoaula do tema. No site, o <video> toca direto de `/api/videoaulas/:slug`
 * (mesma origem, com o cookie da sessão e Range). No app nativo, o cookie não vai num <video> de
 * outra origem: o arquivo vem pelo HTTP nativo uma vez e toca do cache do aparelho.
 */
export function VideoAula({ slug }: { slug: string }) {
  const caminho = `/api/videoaulas/${slug}`;
  const [src, setSrc] = useState<string | null>(EH_APP ? null : caminho);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (!EH_APP) return;
    let vivo = true;
    import('../nativo/nativo')
      .then((n) => n.carregarVideo(caminho))
      .then((u) => vivo && setSrc(u))
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
  }, [caminho]);

  if (falhou) {
    return (
      <p className={s.aviso}>
        Não deu para carregar a videoaula. Confira a conexão e tente de novo.
      </p>
    );
  }
  return (
    <div className={s.moldura}>
      {src ? (
        <video
          className={s.video}
          src={src}
          controls
          autoPlay
          playsInline
          preload="metadata"
          controlsList="nodownload"
          onError={() => setFalhou(true)}
          aria-label="Videoaula do tema"
        />
      ) : (
        <div className={s.carregando} role="status" aria-busy="true">
          Carregando a videoaula…
        </div>
      )}
    </div>
  );
}
