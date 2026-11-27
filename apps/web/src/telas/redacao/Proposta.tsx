import type { TemaRedacao } from '@fuse/shared/api';
import { Chip } from '../../ui';
import s from './Redacao.module.css';

/** A proposta como no caderno: origem, tema, texto de apoio e o comando. */
export function Proposta({ tema, compacta = false }: { tema: TemaRedacao; compacta?: boolean }) {
  return (
    <section className={s.proposta} aria-label="Proposta de redação">
      <Chip variante={tema.origem === 'fau' ? 'laranja' : 'azul'}>
        {tema.origem === 'fau' ? `Prova da FAU · ${tema.prova}` : 'Tema Fuse Aprova · no estilo da FAU'}
      </Chip>
      <h2 className={s.propostaTitulo}>{tema.titulo}</h2>
      {!compacta && tema.apoio.length > 0 ? (
        <div className={s.apoio}>
          {tema.apoio.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : null}
      {!compacta && tema.fonteApoio ? <p className={s.fonteApoio}>{tema.fonteApoio}</p> : null}
      <p className={s.comando}>{tema.comando}</p>
    </section>
  );
}
