import { Fragment, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LicaoTrilha, TrilhaResposta, UnidadeTrilha } from '@fuse/shared/api';
import { chamar, mensagemDeErro } from '../api/cliente';
import { CHAVES, useConcurso, useMe, useTrilha } from '../api/consultas';
import {
  BannerUnidade,
  BarraProgresso,
  Botao3D,
  CabecalhoApp,
  CartaoEstatistica,
  Capi,
  Carregando,
  Contadores,
  ErroTela,
  IconeTraco,
  Imagem,
  NoTrilha,
  Pagina,
  useToast,
} from '../ui';
import { formatarNumero, NOME_CURTO_DISCIPLINA, plural, saudacao } from './comum';
import s from './Aprender.module.css';

/** Zigue-zague a partir do centro: 0, −56, −112, −56, 0, +56, +112, +56… */
const ZIGUE = [0, -56, -112, -56, 0, 56, 112, 56];

function localizarAtual(t: TrilhaResposta) {
  if (!t.atual) return null;
  const u = t.unidades.find((x) => x.id === t.atual!.unidadeId);
  const sec = u?.secoes.find((x) => x.id === t.atual!.secaoId);
  const l = sec?.licoes.find((x) => x.id === t.atual!.licaoId);
  return u && sec && l ? { unidade: u, secao: sec, licao: l } : null;
}

/** 04 Início/Trilha (`/aprender`): saudação, estatísticas, próximo treino, meta e a trilha. */
export default function Aprender() {
  const me = useMe();
  const trilha = useTrilha();
  const concurso = useConcurso();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const abrirBau = useMutation({
    mutationFn: (id: string) => chamar('licaoAbrirBau', { params: { id } }),
    onSuccess: (r) => {
      toast(`Baú aberto: +${r.gemasGanhas} gemas!`, 'sucesso');
      void qc.invalidateQueries({ queryKey: CHAVES.trilha });
      void qc.invalidateQueries({ queryKey: CHAVES.me });
    },
    onError: (e) => toast(mensagemDeErro(e), 'erro'),
  });

  const atual = useMemo(() => (trilha.data ? localizarAtual(trilha.data) : null), [trilha.data]);

  if (!me.data) return <Carregando />;
  const u = me.data;

  function abrir(l: LicaoTrilha) {
    if (!l.podeAbrir) return;
    if (l.tipo === 'bau') {
      if (l.estado !== 'concluida') abrirBau.mutate(l.id);
      return;
    }
    navegar(`/licao/${l.id}`);
  }

  return (
    <Pagina comNav rotulo="Início">
      <CabecalhoApp nome={u.nome} id={u.id} />
      <Contadores
        sigla={u.concurso?.sigla ?? 'PAL · FAU'}
        ofensiva={u.ofensiva}
        gemas={u.gemas}
        vidas={u.vidas}
        diasParaProva={concurso.data?.diasParaProva ?? null}
      />

      <p className={s.ola}>{saudacao(u.nome)}</p>
      <h1 className={s.titulo}>Vamos avançar hoje?</h1>

      <div className={s.estatisticas}>
        <CartaoEstatistica
          icone="icone-calendario"
          valor={plural(u.ofensiva, 'dia', 'dias')}
          legenda="de ofensiva"
        />
        <CartaoEstatistica
          icone="icone-progresso"
          valor={`${formatarNumero(u.xpTotal)} XP`}
          legenda="pontos totais"
        />
      </div>

      <section className={s.proximo} aria-labelledby="proximo-titulo">
        <div className={s.proximoTexto}>
          <p className={s.proximoRotulo}>Seu próximo treino</p>
          {atual ? (
            <>
              <h2 id="proximo-titulo" className={s.proximoTitulo}>
                {NOME_CURTO_DISCIPLINA[atual.unidade.disciplina.slug].split(' ')[0]} ·{' '}
                {atual.secao.titulo}
              </h2>
              <p className={s.proximoMeta}>
                <span>
                  <IconeTraco nome="relogio" tamanho={18} /> {atual.licao.tamanho} min
                </span>
                <span>
                  <IconeTraco nome="marcador" tamanho={18} /> {atual.licao.tamanho} questões
                </span>
              </p>
              <Botao3D
                variante="claro"
                bloco={false}
                className={s.proximoBotao}
                onClick={() => navegar(`/licao/${atual.licao.id}`)}
                iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
              >
                {atual.licao.vezes > 0 || atual.licao.ordem > 1
                  ? 'Continuar treino'
                  : 'Começar treino'}
              </Botao3D>
            </>
          ) : (
            <>
              <h2 id="proximo-titulo" className={s.proximoTitulo}>
                {trilha.isPending ? 'Carregando…' : 'Trilha em dia!'}
              </h2>
              {!trilha.isPending ? (
                <Botao3D
                  variante="claro"
                  bloco={false}
                  className={s.proximoBotao}
                  onClick={() => navegar('/revisar')}
                >
                  Revisar erros
                </Botao3D>
              ) : null}
            </>
          )}
        </div>
        <Imagem
          nome="mascote-estudando"
          tamanho={150}
          className={s.proximoCapi}
          carregamento="eager"
        />
      </section>

      <section className={s.meta} aria-label="Meta de hoje">
        <span className={s.metaIcone}>
          <Imagem nome="icone-alvo" tamanho={34} />
        </span>
        <div className={s.metaCorpo}>
          <div className={s.metaLinha}>
            <span className={s.metaTitulo}>
              {u.metaHoje.cumprida ? 'Meta de hoje concluída' : 'Sua meta de hoje'}
            </span>
            <span className={s.metaValor}>
              {Math.min(u.metaHoje.feitas, u.metaHoje.meta)} de{' '}
              {plural(u.metaHoje.meta, 'treino', 'treinos')}
            </span>
          </div>
          <BarraProgresso
            valor={u.metaHoje.meta ? u.metaHoje.feitas / u.metaHoje.meta : 0}
            rotulo="Progresso da meta de hoje"
            fina
          />
        </div>
      </section>

      <h2 className={s.secaoTitulo}>Sua trilha</h2>
      {trilha.isPending ? (
        <Carregando />
      ) : trilha.isError ? (
        <ErroTela mensagem={mensagemDeErro(trilha.error)} onTentar={() => trilha.refetch()} />
      ) : (
        <Trilha trilha={trilha.data} onAbrir={abrir} onGuia={(id) => navegar(`/guia/${id}`)} />
      )}
    </Pagina>
  );
}

function Trilha({
  trilha,
  onAbrir,
  onGuia,
}: {
  trilha: TrilhaResposta;
  onAbrir: (l: LicaoTrilha) => void;
  onGuia: (unidadeId: string) => void;
}) {
  const unidades = trilha.unidades.filter((u) => u.secoes.some((sec) => sec.licoes.length > 0));
  if (unidades.length === 0) {
    return (
      <Capi
        pose="explicando"
        tamanho={140}
        fala="Sua trilha está sendo montada. Volte daqui a pouco!"
      />
    );
  }
  return (
    <div className={s.trilha}>
      {unidades.map((u, i) => (
        <Fragment key={u.id}>
          {i > 0 ? (
            <div className={s.divisor} role="separator">
              <span>
                Unidade {u.numero} · {u.titulo}
              </span>
            </div>
          ) : null}
          <Unidade unidade={u} trilha={trilha} onAbrir={onAbrir} onGuia={onGuia} />
        </Fragment>
      ))}
    </div>
  );
}

function Unidade({
  unidade,
  trilha,
  onAbrir,
  onGuia,
}: {
  unidade: UnidadeTrilha;
  trilha: TrilhaResposta;
  onAbrir: (l: LicaoTrilha) => void;
  onGuia: (unidadeId: string) => void;
}) {
  const secoes = unidade.secoes.filter((sec) => sec.licoes.length > 0);
  const idxAtual = secoes.findIndex((sec) => sec.id === trilha.atual?.secaoId);
  const secaoBanner =
    idxAtual >= 0
      ? idxAtual
      : Math.max(
          0,
          secoes.findIndex((sec) => sec.licoes.some((l) => l.estado !== 'concluida')),
        );
  const sb = secoes[secaoBanner] ?? secoes[0]!;
  let passo = 0;
  return (
    <section className={s.unidade} aria-label={`Unidade ${unidade.numero}: ${unidade.titulo}`}>
      <BannerUnidade
        unidade={unidade.numero}
        secao={sb.ordem}
        titulo={unidade.titulo}
        coroada={unidade.coroada}
        noEdital={sb.noEdital}
        onGuia={() => onGuia(unidade.id)}
      />
      {secoes.map((sec, si) => (
        <div key={sec.id} className={s.secao}>
          {si > 0 || secoes.length > 1 ? (
            <p className={s.secaoRotulo}>
              Seção {sec.ordem} · {sec.titulo}
              {sec.noEdital === false ? <span className={s.fora}> · Fora do edital</span> : null}
            </p>
          ) : null}
          <ol className={s.nos}>
            {sec.licoes.map((l) => {
              const desloc = ZIGUE[passo++ % ZIGUE.length]!;
              const ehAtual = trilha.atual?.licaoId === l.id;
              return (
                <li key={l.id} className={s.noLinha}>
                  <NoTrilha
                    tipo={l.tipo}
                    estado={l.estado}
                    titulo={l.titulo}
                    anel={l.anel}
                    deslocamento={desloc}
                    podeAbrir={l.podeAbrir && !(l.tipo === 'bau' && l.estado === 'concluida')}
                    balao={
                      ehAtual
                        ? 'COMEÇAR'
                        : l.tipo === 'bau' && l.estado === 'atual'
                          ? 'ABRIR'
                          : null
                    }
                    onAbrir={() => onAbrir(l)}
                  />
                  {ehAtual ? (
                    <div
                      className={[s.capiLado, desloc <= 0 ? s.capiDireita : s.capiEsquerda].join(
                        ' ',
                      )}
                    >
                      <Capi pose="explicando" tamanho={104} lado="cima" fala={trilha.fraseCapi} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}
