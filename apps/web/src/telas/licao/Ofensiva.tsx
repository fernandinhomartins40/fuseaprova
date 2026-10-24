import { diaDaSemana, TEXTO_OFENSIVA_ZEROU, TEXTO_PROTETOR_SALVOU } from '@fuse/shared';
import type { OfensivaResumo } from '@fuse/shared/api';
import {
  BarraProgresso,
  Botao3D,
  Capi,
  CabecalhoApp,
  IconeCheio,
  IconeTraco,
  Imagem,
  Pagina,
} from '../../ui';
import s from './Licao.module.css';

const SIGLAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** 09 Ofensiva (Constância): chama com o número, frase, semana e meta diária. Variantes zerou/protetor. */
export function TelaOfensiva({
  ofensiva,
  nome,
  onContinuar,
}: {
  ofensiva: OfensivaResumo;
  nome: string;
  onContinuar: () => void;
}) {
  const o = ofensiva;
  return (
    <Pagina className={s.ofensiva}>
      <CabecalhoApp nome={nome} />
      <div className={s.ofHeroi}>
        <Capi pose="constancia" tamanho={230} pular carregamento="eager" />
        <span className={s.ofChama} aria-hidden="true">
          <IconeCheio nome="chama" tamanho={44} />
        </span>
      </div>

      {o.zerou ? (
        <p className={s.ofAlerta} role="status">
          {TEXTO_OFENSIVA_ZEROU}. Hoje começa uma nova!
        </p>
      ) : null}
      {o.protetorUsado ? (
        <p className={s.ofProtetor} role="status">
          <IconeCheio nome="escudo" tamanho={20} /> {TEXTO_PROTETOR_SALVOU}
        </p>
      ) : null}

      <h1 className={s.ofTitulo}>
        <span className={s.ofNumero}>{o.valor}</span> {o.valor === 1 ? 'dia' : 'dias'} de{' '}
        <span className={s.ofDestaque}>ofensiva!</span>
      </h1>
      <p className={s.ofFrase}>{o.frase}</p>
      {o.marco ? <p className={s.ofMarco}>Marco de {o.marco} dias! Você ganhou gemas.</p> : null}

      <ol className={s.semana} aria-label="Dias da semana">
        {o.semana.map((d) => (
          <li key={d.dia} className={s.dia}>
            <span className={s.diaNome}>{SIGLAS[diaDaSemana(d.dia)]}</span>
            <span
              className={[s.diaBola, d.cumprido ? s.diaFeito : '', d.hoje ? s.diaHoje : ''].join(
                ' ',
              )}
              role="img"
              aria-label={d.cumprido ? 'cumprido' : 'não cumprido'}
            >
              {d.cumprido ? <IconeTraco nome="check" tamanho={16} espessura={3.4} /> : null}
            </span>
          </li>
        ))}
      </ol>

      <section className={s.ofMeta} aria-label="Meta de hoje">
        <span className={s.ofMetaIcone}>
          <Imagem nome="icone-alvo" tamanho={34} />
        </span>
        <div className={s.ofMetaCorpo}>
          <p className={s.ofMetaTitulo}>
            {o.metaHoje.cumprida ? 'Meta de hoje concluída' : 'Meta de hoje'}
          </p>
          <p className={s.ofMetaSub}>
            {Math.min(o.metaHoje.feitas, o.metaHoje.meta)} de {o.metaHoje.meta}{' '}
            {o.metaHoje.meta === 1 ? 'treino' : 'treinos'}
          </p>
          <BarraProgresso
            valor={o.metaHoje.feitas / Math.max(1, o.metaHoje.meta)}
            rotulo="Meta de hoje"
            fina
          />
        </div>
      </section>

      <div className={s.ofCapiLinha}>
        <Imagem nome="simbolo-capivara" tamanho={52} />
        <p>
          {o.metaHoje.cumprida
            ? 'Amanhã tem mais uma conquista.'
            : 'Mais um treino e a meta de hoje fecha!'}
        </p>
      </div>

      <Botao3D
        autoFocus
        onClick={onContinuar}
        iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
      >
        CONTINUAR
      </Botao3D>
    </Pagina>
  );
}
