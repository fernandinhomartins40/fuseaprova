import { IconeTraco } from './IconeTraco';
import { Chip } from './Chip';
import s from './BannerUnidade.module.css';

/** Banner da unidade: "UNIDADE n · SEÇÃO n", título e o botão Guia (livro) à direita. */
export function BannerUnidade({
  unidade,
  secao,
  titulo,
  coroada = false,
  noEdital = null,
  onGuia,
}: {
  unidade: number;
  secao: number;
  titulo: string;
  coroada?: boolean;
  noEdital?: boolean | null;
  onGuia: () => void;
}) {
  return (
    <section className={s.banner} aria-label={`Unidade ${unidade}, seção ${secao}: ${titulo}`}>
      <div className={s.texto}>
        <p className={s.rotulo}>
          UNIDADE {unidade} · SEÇÃO {secao}
          {coroada ? <span className={s.coroa}> · COROADA</span> : null}
        </p>
        <h2 className={s.titulo}>{titulo}</h2>
        {noEdital !== null ? (
          <Chip variante="claro" className={s.selo}>
            {noEdital ? 'No edital' : 'Fora do edital'}
          </Chip>
        ) : null}
      </div>
      <button
        type="button"
        className={s.guia}
        onClick={onGuia}
        aria-label="Abrir o guia da unidade"
      >
        <IconeTraco nome="livro" tamanho={26} />
        <span className={s.guiaTexto}>Guia</span>
      </button>
    </section>
  );
}
