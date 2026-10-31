import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { SlugDisciplina } from '@fuse/shared';
import type { AnotacoesResposta } from '@fuse/shared/api';
import { chamar, mensagemDeErro } from '../../api/cliente';
import { CHAVES } from '../../api/consultas';
import {
  CabecalhoVoltar,
  Capi,
  Carregando,
  Chip,
  ErroTela,
  IconeTraco,
  Imagem,
  Pagina,
} from '../../ui';
import { ICONE_DISCIPLINA, NOME_CURTO_DISCIPLINA, plural } from '../comum';
import s from './Anotacoes.module.css';

type Item = AnotacoesResposta['anotacoes'][number];

interface Grupo {
  slug: SlugDisciplina;
  nome: string;
  assuntos: { id: string; nome: string; itens: Item[] }[];
  total: number;
}

/** Agrupa por disciplina e, dentro dela, por assunto (o tema da questão), em ordem alfabética. */
export function agruparPorTema(itens: readonly Item[]): Grupo[] {
  const porDisc = new Map<SlugDisciplina, Grupo>();
  for (const a of itens) {
    let g = porDisc.get(a.disciplina.slug);
    if (!g) {
      g = { slug: a.disciplina.slug, nome: a.disciplina.nome, assuntos: [], total: 0 };
      porDisc.set(a.disciplina.slug, g);
    }
    let t = g.assuntos.find((x) => x.id === a.assunto.id);
    if (!t) {
      t = { id: a.assunto.id, nome: a.assunto.nome, itens: [] };
      g.assuntos.push(t);
    }
    t.itens.push(a);
    g.total++;
  }
  const ordem: SlugDisciplina[] = ['portugues', 'matematica', 'gerais', 'especificos'];
  return [...porDisc.values()]
    .sort((a, b) => ordem.indexOf(a.slug) - ordem.indexOf(b.slug))
    .map((g) => ({ ...g, assuntos: g.assuntos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) }));
}

function normalizar(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** D28: Minhas anotações (`/anotacoes`), do concurso ativo, organizadas por disciplina e tema. */
export default function Anotacoes() {
  const navegar = useNavigate();
  const q = useQuery({
    queryKey: CHAVES.anotacoes,
    queryFn: ({ signal }) => chamar('anotacoes', { signal }),
  });
  const [busca, setBusca] = useState('');
  const [disciplina, setDisciplina] = useState<SlugDisciplina | null>(null);

  const grupos = useMemo(() => {
    const termo = normalizar(busca.trim());
    const itens = (q.data?.anotacoes ?? []).filter(
      (a) =>
        (!disciplina || a.disciplina.slug === disciplina) &&
        (!termo ||
          normalizar(`${a.texto} ${a.assunto.nome} ${a.resumo}`).includes(termo)),
    );
    return agruparPorTema(itens);
  }, [q.data, busca, disciplina]);
  const todas = useMemo(() => agruparPorTema(q.data?.anotacoes ?? []), [q.data]);

  return (
    <Pagina>
      <CabecalhoVoltar para="/perfil" titulo="Minhas anotações" />
      {q.isPending ? (
        <Carregando />
      ) : q.isError ? (
        <ErroTela mensagem={mensagemDeErro(q.error)} onTentar={() => q.refetch()} />
      ) : q.data.anotacoes.length === 0 ? (
        <section className={s.vazio}>
          <Capi pose="explicando" tamanho={180} descrever />
          <p className={s.vazioTitulo}>Você ainda não tem anotações</p>
          <p className={s.vazioTexto}>
            Depois de responder uma questão, toque em <strong>Anotar</strong> na folha da correção
            e escreva o que quer lembrar. Elas aparecem aqui, separadas por tema.
          </p>
        </section>
      ) : (
        <>
          <label className={s.busca}>
            <IconeTraco nome="busca" tamanho={20} />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nas anotações"
              aria-label="Buscar nas anotações"
            />
          </label>
          {todas.length > 1 ? (
            <div className={s.filtros} role="group" aria-label="Filtrar por disciplina">
              <button
                type="button"
                className={!disciplina ? s.filtroAtivo : s.filtro}
                aria-pressed={!disciplina}
                onClick={() => setDisciplina(null)}
              >
                Todas ({q.data.anotacoes.length})
              </button>
              {todas.map((g) => (
                <button
                  key={g.slug}
                  type="button"
                  className={disciplina === g.slug ? s.filtroAtivo : s.filtro}
                  aria-pressed={disciplina === g.slug}
                  onClick={() => setDisciplina(g.slug)}
                >
                  {NOME_CURTO_DISCIPLINA[g.slug]} ({g.total})
                </button>
              ))}
            </div>
          ) : null}

          {grupos.length === 0 ? (
            <p className={s.semResultado}>Nenhuma anotação encontrada.</p>
          ) : (
            grupos.map((g) => (
              <section key={g.slug} className={s.grupo} aria-labelledby={`disc-${g.slug}`}>
                <h2 id={`disc-${g.slug}`} className={s.grupoTitulo}>
                  <span className={s.grupoIcone} data-fundo={g.slug}>
                    <Imagem nome={ICONE_DISCIPLINA[g.slug]} tamanho={28} />
                  </span>
                  {NOME_CURTO_DISCIPLINA[g.slug]}
                  <span className={s.grupoTotal}>{plural(g.total, 'anotação', 'anotações')}</span>
                </h2>
                {g.assuntos.map((t) => (
                  <div key={t.id} className={s.tema}>
                    <Chip variante="marca">{t.nome}</Chip>
                    <ul className={s.lista}>
                      {t.itens.map((a) => (
                        <li key={a.questaoId}>
                          <button
                            type="button"
                            className={s.item}
                            onClick={() => navegar(`/anotacoes/${a.questaoId}`)}
                          >
                            <span className={s.itemTexto}>{a.texto}</span>
                            <span className={s.itemResumo}>Questão: {a.resumo}</span>
                            <span className={s.itemData}>
                              {new Date(a.atualizadoEm).toLocaleDateString('pt-BR', {
                                timeZone: 'America/Sao_Paulo',
                              })}
                            </span>
                            <IconeTraco nome="chevron" tamanho={18} className={s.itemSeta} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            ))
          )}
        </>
      )}
    </Pagina>
  );
}
