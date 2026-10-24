import { formatarTempoLicao, type TipoSessaoEstudo } from '@fuse/shared';
import type { FimSessao } from '../../offline/motor';
import {
  Botao3D,
  CartaoEstatistica,
  Capi,
  Chip,
  Confete,
  IconeTraco,
  Imagem,
  Pagina,
} from '../../ui';
import s from './Licao.module.css';

/** 08 Fim da lição: confete, Capi comemorando, XP TOTAL · PRECISÃO · TEMPO, CONTINUAR e REVISAR ERROS (n). */
export function FimLicao({
  fim,
  tipo,
  onContinuar,
  onRevisarErros,
}: {
  fim: FimSessao;
  tipo: TipoSessaoEstudo;
  onContinuar: () => void;
  onRevisarErros?: () => void;
}) {
  const titulo =
    tipo === 'revisao'
      ? 'Revisão concluída!'
      : tipo === 'desafio'
        ? 'Desafio concluído!'
        : 'Lição concluída!';
  const nome = fim.tituloLicao ?? (tipo === 'revisao' ? 'Seus erros, revisados' : '');
  const xp = fim.offline ? '—' : `${fim.xpGanho} XP`;
  return (
    <Pagina className={s.fim}>
      <Confete />
      <header className={s.fimLogo}>
        <Imagem nome="logo-completa" tamanho={120} carregamento="eager" />
      </header>
      <Capi pose="celebrando" tamanho={250} pular className={s.fimCapi} carregamento="eager" />
      <h1 className={s.fimTitulo} role="status">
        {titulo}
      </h1>
      {nome ? <p className={s.fimSub}>{nome}</p> : null}

      {!fim.offline && fim.coroa ? (
        <p className={s.fimCoroa}>
          <Imagem nome="icone-coroa" tamanho={28} /> Você ganhou a coroa da unidade!
        </p>
      ) : null}

      <div className={s.fimCartoes}>
        <CartaoEstatistica vertical icone="icone-xp" valor={xp} legenda="XP TOTAL" />
        <CartaoEstatistica
          vertical
          icone="icone-alvo"
          valor={`${fim.precisao}%`}
          legenda="PRECISÃO"
        />
        <CartaoEstatistica
          vertical
          icone="icone-relogio"
          valor={formatarTempoLicao(fim.tempoMs)}
          legenda="TEMPO"
        />
      </div>

      {fim.offline ? (
        <p className={s.avisoOffline} role="status">
          <IconeTraco nome="wifiOff" tamanho={16} /> Lição salva offline. O XP, a ofensiva e a
          revisão são atualizados quando a conexão voltar.
        </p>
      ) : null}

      {!fim.offline && fim.conquistasNovas.length > 0 ? (
        <section className={s.conquistas} aria-label="Conquistas novas">
          {fim.conquistasNovas.map((c) => (
            <Chip
              key={c.codigo}
              variante="ouro"
              icone={<Imagem nome="icone-medalha" tamanho={18} />}
            >
              {c.titulo}
            </Chip>
          ))}
        </section>
      ) : null}
      {!fim.offline && fim.gemasGanhas > 0 ? (
        <p className={s.fimGemas}>+{fim.gemasGanhas} gemas</p>
      ) : null}

      <div className={s.fimAcoes}>
        <Botao3D
          autoFocus
          onClick={onContinuar}
          iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
        >
          CONTINUAR
        </Botao3D>
        {onRevisarErros ? (
          <Botao3D
            variante="secundario"
            onClick={onRevisarErros}
            iconeEsquerda={<Imagem nome="icone-revisao" tamanho={24} />}
          >
            REVISAR ERROS ({fim.erros.length})
          </Botao3D>
        ) : null}
      </div>
    </Pagina>
  );
}
