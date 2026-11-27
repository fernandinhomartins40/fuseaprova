import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatarDiaMes, diaSP } from '@fuse/shared';
import type { TemaRedacao } from '@fuse/shared/api';
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
  Pagina,
  TituloSecao,
} from '../../ui';
import s from './Redacao.module.css';

const ABAS = [
  { id: 'aulas', nome: 'Aulas' },
  { id: 'temas', nome: 'Temas' },
  { id: 'minhas', nome: 'Minhas redações' },
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
        <ul className={s.lista}>
          {painel.data.aulas.map((a) => (
            <li key={a.id}>
              <LinhaLista
                icone={<Imagem nome="icone-dica" tamanho={30} />}
                titulo={a.titulo}
                subtitulo={`${a.resumo} · ${a.minutos} min`}
                onClick={() => navegar(`/redacao/aula/${a.id}`)}
              />
            </li>
          ))}
        </ul>
      ) : aba === 'temas' ? (
        <>
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
        <Capi pose="estudando" tamanho={110} fala="Escolha um tema na aba Temas e escreva a sua primeira redação!" />
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
