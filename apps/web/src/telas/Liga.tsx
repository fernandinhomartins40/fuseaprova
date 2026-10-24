import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { TEXTO_LIGA_VAZIA } from '@fuse/shared';
import { chamar, mensagemDeErro } from '../api/cliente';
import { CHAVES, useLiga, useMe } from '../api/consultas';
import {
  Avatar,
  Botao3D,
  CabecalhoApp,
  Capi,
  Carregando,
  ErroTela,
  IconeTraco,
  Imagem,
  Modal,
  Pagina,
} from '../ui';
import { formatarNumero } from './comum';
import s from './Liga.module.css';

/** 12 Liga (`/liga`): divisão, regra, ranking com zonas, estado inicial e modal semanal. */
export default function Liga() {
  const me = useMe();
  const liga = useLiga();
  const qc = useQueryClient();
  const navegar = useNavigate();
  const [modalFechado, setModalFechado] = useState(false);

  if (liga.isPending)
    return (
      <Pagina comNav>
        <CabecalhoApp nome={me.data?.nome} id={me.data?.id} />
        <Carregando />
      </Pagina>
    );
  if (liga.isError)
    return (
      <Pagina comNav>
        <CabecalhoApp nome={me.data?.nome} id={me.data?.id} />
        <ErroTela mensagem={mensagemDeErro(liga.error)} onTentar={() => liga.refetch()} />
      </Pagina>
    );

  const l = liga.data;
  const minha = l.ranking.find((r) => r.eu);
  const acima = minha ? l.ranking.find((r) => r.posicao === minha.posicao - 1) : null;
  const faltam = minha && acima ? Math.max(1, acima.xpSemana - minha.xpSemana + 1) : null;
  const res = l.resultadoAnterior;

  function fecharModal() {
    setModalFechado(true);
    if (res) {
      void chamar('ligaResultadoVisto', { corpo: { semana: res.semana } })
        .then(() => {
          void qc.invalidateQueries({ queryKey: CHAVES.me });
          void qc.invalidateQueries({ queryKey: CHAVES.liga });
        })
        .catch(() => undefined);
    }
  }

  return (
    <Pagina comNav rotulo="Liga">
      <CabecalhoApp nome={me.data?.nome} id={me.data?.id} />
      <section className={s.cab}>
        <div className={s.cabTexto}>
          <h1 className={s.titulo}>Liga {l.nomeDivisao}</h1>
          <p className={s.sub}>Aprenda junto. Vá mais longe.</p>
          <p className={s.termina}>
            <IconeTraco nome="relogio" tamanho={18} /> {l.regra}
          </p>
        </div>
        <Imagem nome="ilustracao-liga" tamanho={118} className={s.escudo} carregamento="eager" />
      </section>

      {!l.participando ? (
        <section className={s.vazio}>
          <Capi pose="incentivando" tamanho={200} />
          <p className={s.vazioTexto}>{TEXTO_LIGA_VAZIA}</p>
          <Botao3D onClick={() => navegar('/aprender')}>FAZER UMA LIÇÃO</Botao3D>
        </section>
      ) : (
        <>
          <ol className={s.ranking} aria-label={`Ranking da Liga ${l.nomeDivisao}`}>
            {l.ranking.map((r) => (
              <Fragment key={r.posicao}>
                {l.grupo?.rebaixamentoDesde != null && r.posicao === l.grupo.rebaixamentoDesde ? (
                  <li className={[s.zona, s.zonaRebaixa].join(' ')} aria-hidden="true">
                    ZONA DE REBAIXAMENTO
                  </li>
                ) : null}
                <li
                  className={[s.linha, r.eu ? s.eu : '', r.posicao <= 3 ? s.topo : ''].join(' ')}
                  aria-current={r.eu ? 'true' : undefined}
                >
                  <span className={[s.pos, r.posicao <= 3 ? s[`p${r.posicao}`] : ''].join(' ')}>
                    {r.posicao}
                  </span>
                  <Avatar nome={r.nome} iniciaisProntas={r.iniciais} cor={r.cor} tamanho={40} />
                  <span className={s.nome}>
                    {r.nome}
                    {r.eu ? ' · Você' : ''}
                  </span>
                  <span className={s.xp}>{formatarNumero(r.xpSemana)} XP</span>
                </li>
                {l.grupo && l.grupo.promocaoAte > 0 && r.posicao === l.grupo.promocaoAte ? (
                  <li className={[s.zona, s.zonaPromo].join(' ')} aria-hidden="true">
                    ZONA DE PROMOÇÃO ·{' '}
                    {l.grupo.promocaoAte === 1
                      ? 'o 1º sobe'
                      : `os ${l.grupo.promocaoAte} primeiros sobem`}
                  </li>
                ) : null}
              </Fragment>
            ))}
          </ol>
          {faltam ? (
            <section className={s.faltam}>
              <Imagem nome="icone-progresso" tamanho={36} />
              <p>Faltam {formatarNumero(faltam)} XP para o próximo lugar.</p>
            </section>
          ) : minha?.posicao === 1 ? (
            <section className={s.faltam}>
              <Imagem nome="icone-medalha" tamanho={36} />
              <p>Você está em 1º lugar. Segura essa!</p>
            </section>
          ) : null}
        </>
      )}

      <Modal
        aberto={!!res && !modalFechado}
        titulo={res?.mensagem ?? ''}
        onFechar={fecharModal}
        topo={
          <Capi
            pose={res?.resultado === 'subiu' ? 'celebrando' : 'incentivando'}
            tamanho={150}
            pular={res?.resultado === 'subiu'}
          />
        }
        descricao={
          res
            ? `Você terminou a semana em ${res.posicao}º lugar.${res.gemasGanhas > 0 ? ` +${res.gemasGanhas} gemas!` : ''}`
            : undefined
        }
        rodape={<Botao3D onClick={fecharModal}>CONTINUAR</Botao3D>}
      />
    </Pagina>
  );
}
