import s from './Painel.module.css';

/** Marca "Fuse Aprova" com o selo da área (Superadmin ou Conteúdo). */
export function MarcaPainel({ selo }: { selo: string }) {
  return (
    <div className={s.marca}>
      <span className={s.marcaIcone} aria-hidden="true">
        F
      </span>
      <span>
        Fuse Aprova <span className={s.selo}>{selo}</span>
      </span>
    </div>
  );
}
