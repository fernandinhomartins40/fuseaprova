import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatarDiaMes, diaSP } from '@fuse/shared';
import type { RedacaoPainel, TemaRedacao } from '@fuse/shared/api';
import { mensagemDeErro } from '../../api/cliente';
import { useMe, useRedacaoPainel } from '../../api/consultas';
import {
  CabecalhoVoltar,
  Capi,
  Carregando,
  Chip,
  ErroTela,
  Imagem,
  LinhaLista,
  NoTrilha,
  Pagina,
  TituloSecao,
} from '../../ui';
import { TEMAS, iconeDaLicao, variaveisDoTema } from '../temaTrilha';
import ap from '../Aprender.module.css';
import s from './Redacao.module.css';

const ZIGUE = [0, -56, -112, -56, 0, 56, 112, 56];

const ABAS = [
  { id: 'aulas', nome: 'Aprender' },
  { id: 'temas', nome: 'Simulado' },
  { id: 'minhas', nome: 'Minhas' },
] as const;
type Aba = (typeof ABAS)[number]['id'];

/** D49: preparatório de redação — mini-curso, banco de temas e minhas redações. */
export default function Redacao() {
  const me = useMe();
  const painel = useRedacaoPainel();
  const navegar = useNavigate();
  const [busca, setBusca] = useSearchParams();
  const aba: Aba = ABAS.some((a) => a.id === busca.get('aba')) ? (busca.get('aba') as Aba) : 'aulas';
  const professor = /professor licenciatura/i.test(me.data?.cargo?.nome ?? '');

  const linhaTema = (t: TemaRedacao) => (
    <li key={t.id}>
      <LinhaLista
        icone={<Imagem nome={t.origem === 'fau' ? 'icone-simulados' : 'icone-portugues'} tamanho={30} />}
        titulo={t.titulo}
        subtitulo={t.origem === 'fau' ? t.prova : t.eixo}
        onClick={() => navegar(`/redacao/tema/${t.id}`)}
      />
    </li>
  );

  return (
    <Pagina rotulo="Preparatório de redação">
      <CabecalhoVoltar para="/simulado" titulo="Redação" />

      <section className={s.heroi} aria-labelledby="red-hero">
        <p className={s.heroiRotulo}>PREPARATÓRIO DE REDAÇÃO</p>
        <h1 id="red-hero" className={s.heroiTitulo}>
          Dissertativo-argumentativo · 20 a 30 linhas · 100 pontos
        </h1>
        <p className={s.heroiTexto}>
          {professor
            ? 'No seu cargo, a redação vale o mesmo que a prova objetiva inteira na nota final.'
            : 'Em Palmital, só o Professor Licenciatura Plena faz redação. Treinar ajuda também na interpretação de texto.'}
        </p>
        {painel.data ? (
          <p className={s.cota}>
            Correções desta semana: <strong>{painel.data.cota.restantes}</strong> de {painel.data.cota.limite}
            {painel.data.cota.restantes === 0
              ? ` · voltam em ${formatarDiaMes(diaSP(new Date(painel.data.cota.renovaEm)))}`
              : ''}
          </p>
        ) : null}
      </section>

      <div className={s.abas} role="tablist" aria-label="Seções">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            className={[s.aba, aba === a.id ? s.abaAtiva : ''].join(' ')}
            onClick={() => setBusca({ aba: a.id }, { replace: true })}
          >
            {a.nome}
          </button>
        ))}
      </div>

      {painel.isPending ? (
        <Carregando />
      ) : painel.isError ? (
        <ErroTela mensagem={mensagemDeErro(painel.error)} onTentar={() => painel.refetch()} />
      ) : aba === 'aulas' ? (
        <TrilhaAulas
          aulas={painel.data.aulas}
          concluidas={painel.data.aulasConcluidas}
          onAbrir={(id) => navegar(`/redacao/aula/${id}`)}
          onResumo={(id) => navegar(`/redacao/aula/${id}/resumo`)}
        />
      ) : aba === 'temas' ? (
        <>
          <p className={s.nota}>
            Escolha um tema, escreva na folha de 20 a 30 linhas (com cronômetro, se quiser) e mande para a
            correção no padrão da banca.
          </p>
          <TituloSecao>Já cobrados pela FAU</TituloSecao>
          <ul className={s.lista}>{painel.data.temas.filter((t) => t.origem === 'fau').map(linhaTema)}</ul>
          <TituloSecao>Temas novos no estilo da FAU</TituloSecao>
          <p className={s.nota}>
            Temas do Fuse Aprova, no formato das provas de 2026 e com o conteúdo do Anexo II do professor.
            Não são temas da banca.
          </p>
          <ul className={s.lista}>{painel.data.temas.filter((t) => t.origem === 'fuse').map(linhaTema)}</ul>
        </>
      ) : painel.data.redacoes.length === 0 ? (
        <Capi pose="estudando" tamanho={110} fala="Escolha um tema na aba Simulado e escreva a sua primeira redação!" />
      ) : (
        <ul className={s.lista}>
          {painel.data.redacoes.map((r) => (
            <li key={r.id}>
              <LinhaLista
                icone={<Imagem nome="icone-portugues" tamanho={30} />}
                titulo={r.temaTitulo}
                subtitulo={`${formatarDiaMes(diaSP(new Date(r.atualizadoEm)))} · cerca de ${r.linhas} linhas`}
                direita={
                  r.status === 'corrigida' ? (
                    <Chip variante={(r.nota ?? 0) >= 50 ? 'acerto' : 'erro'}>{r.nota}/100</Chip>
                  ) : (
                    <Chip>{r.status === 'corrigindo' ? 'Corrigindo' : 'Rascunho'}</Chip>
                  )
                }
                onClick={() => navegar(`/redacao/${r.id}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </Pagina>
  );
}

/** A trilha das aulas interativas: concluídas, a atual (COMEÇAR) e as próximas bloqueadas. */
function TrilhaAulas({
  aulas,
  concluidas,
  onAbrir,
  onResumo,
}: {
  aulas: RedacaoPainel['aulas'];
  concluidas: string[];
  onAbrir: (id: string) => void;
  onResumo: (id: string) => void;
}) {
  const feitas = new Set(concluidas);
  const atual = aulas.find((a) => !feitas.has(a.id))?.id ?? null;
  const tema = TEMAS.portugues;
  return (
    <section style={variaveisDoTema(tema)} aria-label="Trilha das aulas de redação">
      <p className={s.nota}>
        {feitas.size} de {aulas.length} aulas concluídas. Cada aula tem explicação e exercícios, como as
        lições do app.
      </p>
      <div className={ap.secao}>
        <ol className={ap.nos}>
          {aulas.map((a, k) => {
            const estado = feitas.has(a.id) ? 'concluida' : a.id === atual ? 'atual' : 'bloqueada';
            const desloc = ZIGUE[k % ZIGUE.length]!;
            return (
              <li key={a.id} className={ap.noLinha}>
                <NoTrilha
                  tipo="normal"
                  estado={estado}
                  titulo={a.titulo}
                  deslocamento={desloc}
                  podeAbrir={estado !== 'bloqueada'}
                  imagem={iconeDaLicao(tema.nome, k)}
                  balao={estado === 'atual' ? 'COMEÇAR' : null}
                  onAbrir={() => onAbrir(a.id)}
                />
                <p className={s.noTitulo} style={{ transform: `translateX(${desloc}px)` }}>
                  {a.titulo.replace(/^\d+\.\s*/, '')}
                  {estado === 'concluida' ? (
                    <button type="button" className={s.resumoLink} onClick={() => onResumo(a.id)}>
                      ver resumo
                    </button>
                  ) : null}
                </p>
                {estado === 'atual' ? (
                  <div className={[ap.capiLado, desloc <= 0 ? ap.capiDireita : ap.capiEsquerda].join(' ')}>
                    <Capi pose="explicando" tamanho={96} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
