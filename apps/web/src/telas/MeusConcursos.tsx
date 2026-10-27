import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatarReais } from '@fuse/shared';
import type { ConcursoResumo, ConcursoSeguido, MeusConcursosResposta } from '@fuse/shared/api';
import { chamar, mensagemDeErro } from '../api/cliente';
import { CHAVES, useMe, useMeusConcursos } from '../api/consultas';
import { EH_APP } from '../nativo/plataforma';
import { contarPendentes, sincronizar } from '../offline/fila';
import { apagarPacote, limparCachesApi } from '../offline/pacote';
import {
  Botao3D,
  CabecalhoVoltar,
  Carregando,
  Chip,
  ErroTela,
  Modal,
  Pagina,
  useToast,
} from '../ui';
import s from './MeusConcursos.module.css';

/** Tudo que depende do concurso ativo precisa ser buscado de novo quando ele muda. */
const CHAVES_DO_CONCURSO = [
  CHAVES.me,
  CHAVES.concurso,
  CHAVES.trilha,
  CHAVES.revisao,
  CHAVES.liga,
  CHAVES.estatisticas,
  CHAVES.simulados,
];

function quando(c: Pick<ConcursoResumo, 'dataProva' | 'diasParaProva'>): string | null {
  if (!c.dataProva) return null;
  const [a, m, d] = c.dataProva.split('-');
  const dia = `${d}/${m}/${a}`;
  return c.diasParaProva != null ? `Prova em ${dia} (${c.diasParaProva} dias)` : `Prova em ${dia}`;
}

/**
 * Meus concursos (D21): os concursos que o aluno acompanha (um acesso por concurso), o ativo e os
 * outros que ele pode adicionar. No app nativo não há venda: só trocar entre os já liberados.
 */
export default function MeusConcursos() {
  const navegar = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const me = useMe();
  const lista = useMeusConcursos();
  const [adicionando, setAdicionando] = useState<ConcursoResumo | null>(null);

  const atualizar = (nova: MeusConcursosResposta) => qc.setQueryData(CHAVES.meusConcursos, nova);

  /** Antes de trocar: manda as respostas feitas sem internet (elas valem para o concurso de agora). */
  async function prepararTroca(): Promise<boolean> {
    const uid = me.data?.id;
    if (!uid) return true;
    if (navigator.onLine) {
      await Promise.race([
        sincronizar(uid).catch(() => null),
        new Promise((ok) => window.setTimeout(ok, 8000)),
      ]);
    }
    const pendentes = await contarPendentes(uid).catch(() => 0);
    if (pendentes > 0) {
      toast(
        'Você tem respostas feitas sem internet que ainda não foram enviadas. Conecte-se e espere a sincronização antes de trocar de concurso.',
        'erro',
      );
      return false;
    }
    return true;
  }

  const ativar = useMutation({
    mutationFn: async (id: string) => {
      if (!(await prepararTroca())) return null;
      return chamar('meuConcursoAtivar', { params: { id } });
    },
    onSuccess: async (nova) => {
      if (!nova) return;
      atualizar(nova);
      // O pacote offline e os caches são do concurso anterior.
      await Promise.allSettled([apagarPacote(), limparCachesApi()]);
      await Promise.all(CHAVES_DO_CONCURSO.map((k) => qc.invalidateQueries({ queryKey: k })));
      toast('Concurso trocado. Sua trilha foi atualizada.', 'sucesso');
      navegar('/aprender');
    },
    onError: (e) => toast(mensagemDeErro(e), 'erro'),
  });

  const deixar = useMutation({
    mutationFn: (id: string) => chamar('meuConcursoDeixar', { params: { id } }),
    onSuccess: (nova) => {
      atualizar(nova);
      void qc.invalidateQueries({ queryKey: CHAVES.me });
      toast('Concurso removido da sua lista.', 'info');
    },
    onError: (e) => toast(mensagemDeErro(e), 'erro'),
  });

  if (lista.isPending || me.isPending) {
    return (
      <Pagina>
        <CabecalhoVoltar para="/perfil" titulo="Meus concursos" />
        <Carregando />
      </Pagina>
    );
  }
  if (lista.isError || !lista.data) {
    return (
      <Pagina>
        <CabecalhoVoltar para="/perfil" titulo="Meus concursos" />
        <ErroTela mensagem={mensagemDeErro(lista.error)} onTentar={() => lista.refetch()} />
      </Pagina>
    );
  }
  const { seguidos, disponiveis } = lista.data;
  const temAcesso = me.data?.acesso ?? false;

  return (
    <Pagina comNav={temAcesso} rotulo="Perfil">
      <CabecalhoVoltar para={temAcesso ? '/perfil' : '/pagamento'} titulo="Meus concursos" />
      <p className={s.intro}>
        Cada concurso tem o seu acesso. Seu progresso, XP e ofensiva ficam com você em todos eles.
      </p>

      <h2 className={s.secao}>Em estudo</h2>
      <ul className={s.lista}>
        {seguidos.map((c) => (
          <li key={c.id}>
            <CartaoConcurso
              c={c}
              ocupado={ativar.isPending || deixar.isPending}
              onAtivar={() => ativar.mutate(c.id)}
              onDeixar={() => deixar.mutate(c.id)}
            />
          </li>
        ))}
      </ul>

      {!EH_APP && disponiveis.length > 0 ? (
        <>
          <h2 className={s.secao}>Outros concursos</h2>
          <ul className={s.lista}>
            {disponiveis.map((c) => (
              <li key={c.id}>
                <article className={s.cartao}>
                  <div className={s.topo}>
                    <Chip variante="claro">{c.sigla}</Chip>
                    <span className={s.status}>{c.statusTexto}</span>
                  </div>
                  <h3 className={s.nome}>{c.orgao}</h3>
                  <p className={s.meta}>
                    {c.municipio} · {c.uf}
                    {quando(c) ? ` · ${quando(c)}` : ''}
                  </p>
                  <p className={s.preco}>
                    <strong>{formatarReais(c.precoCentavos)}</strong>
                    {c.comDesconto ? (
                      <span className={s.desconto}>
                        desconto por já ser aluno (o primeiro concurso custa{' '}
                        {formatarReais(lista.data.precoCheioCentavos)})
                      </span>
                    ) : (
                      <span className={s.desconto}>acesso único a este concurso</span>
                    )}
                  </p>
                  <Botao3D variante="secundario" bloco={false} onClick={() => setAdicionando(c)}>
                    Quero este concurso
                  </Botao3D>
                </article>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className={s.rodape}>
        <Link to="/concurso">Ver detalhes do concurso ativo</Link>
      </p>

      <EscolherCargo
        concurso={adicionando}
        onFechar={() => setAdicionando(null)}
        onSeguido={(nova, id) => {
          atualizar(nova);
          setAdicionando(null);
          navegar(`/pagamento?concurso=${id}`);
        }}
      />
    </Pagina>
  );
}

function CartaoConcurso({
  c,
  ocupado,
  onAtivar,
  onDeixar,
}: {
  c: ConcursoSeguido;
  ocupado: boolean;
  onAtivar: () => void;
  onDeixar: () => void;
}) {
  return (
    <article
      className={[s.cartao, c.ativo ? s.ativo : ''].join(' ')}
      aria-current={c.ativo ? 'true' : undefined}
    >
      <div className={s.topo}>
        <Chip variante="claro">{c.sigla}</Chip>
        {c.ativo ? (
          <span className={s.selo}>Ativo</span>
        ) : (
          <span className={s.status}>{c.statusTexto}</span>
        )}
      </div>
      <h3 className={s.nome}>{c.orgao}</h3>
      <p className={s.meta}>
        {c.municipio} · {c.uf}
        {c.cargo ? ` · ${c.cargo.nome}` : ' · cargo a escolher'}
      </p>
      {quando(c) ? <p className={s.meta}>{quando(c)}</p> : null}
      <div className={s.acoes}>
        {c.acesso && !c.ativo ? (
          <Botao3D bloco={false} carregando={ocupado} onClick={onAtivar}>
            Estudar este concurso
          </Botao3D>
        ) : null}
        {!c.acesso ? (
          EH_APP ? (
            <p className={s.aviso}>O acesso a este concurso ainda não está ativo.</p>
          ) : (
            <>
              <Link className={s.pagar} to={`/pagamento?concurso=${c.id}`}>
                Liberar por {formatarReais(c.precoCentavos)}
              </Link>
              <Botao3D variante="secundario" bloco={false} carregando={ocupado} onClick={onDeixar}>
                Remover
              </Botao3D>
            </>
          )
        ) : null}
      </div>
    </article>
  );
}

/** Escolha do cargo antes de acompanhar (e pagar) um concurso novo. */
function EscolherCargo({
  concurso,
  onFechar,
  onSeguido,
}: {
  concurso: ConcursoResumo | null;
  onFechar: () => void;
  onSeguido: (nova: MeusConcursosResposta, concursoId: string) => void;
}) {
  const toast = useToast();
  const [cargoId, setCargoId] = useState('');
  const detalhe = useQuery({
    queryKey: CHAVES.concursoPorId(concurso?.id ?? ''),
    queryFn: ({ signal }) => chamar('concursoPorId', { params: { id: concurso!.id }, signal }),
    enabled: concurso !== null,
  });
  const seguir = useMutation({
    mutationFn: () =>
      chamar('meuConcursoSeguir', {
        corpo: { concursoId: concurso!.id, cargoId: cargoId || null },
      }),
    onSuccess: (nova) => onSeguido(nova, concurso!.id),
    onError: (e) => toast(mensagemDeErro(e), 'erro'),
  });
  return (
    <Modal
      aberto={concurso !== null}
      titulo="Qual é o seu cargo?"
      onFechar={onFechar}
      formato="folha"
      descricao={
        concurso ? `${concurso.orgao}. A trilha é montada para a área do cargo.` : undefined
      }
      rodape={
        <>
          <Botao3D
            carregando={seguir.isPending}
            disabled={!cargoId}
            onClick={() => seguir.mutate()}
          >
            CONTINUAR PARA O PAGAMENTO
          </Botao3D>
          <Botao3D variante="secundario" onClick={onFechar}>
            CANCELAR
          </Botao3D>
        </>
      }
    >
      {detalhe.isPending ? (
        <Carregando />
      ) : detalhe.isError ? (
        <ErroTela mensagem={mensagemDeErro(detalhe.error)} onTentar={() => detalhe.refetch()} />
      ) : (
        <label className={s.campoCargo}>
          <span>Cargo</span>
          <select className={s.select} value={cargoId} onChange={(e) => setCargoId(e.target.value)}>
            <option value="">Escolha um cargo</option>
            {detalhe.data.cargos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      )}
    </Modal>
  );
}
