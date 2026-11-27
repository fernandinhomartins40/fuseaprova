import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ASPECTOS_REDACAO,
  LINHAS_MAX_REDACAO,
  LINHAS_MIN_PARA_CORRIGIR,
  LINHAS_MIN_REDACAO,
  CARACTERES_MAX_REDACAO,
  contarLinhas,
  formatarCronometro,
  situacaoLinhas,
} from '@fuse/shared';
import type { Redacao } from '@fuse/shared/api';
import { chamar, mensagemDeErro } from '../../api/cliente';
import { CHAVES, useRedacao, useRedacaoPainel } from '../../api/consultas';
import {
  BarraProgresso,
  Botao3D,
  CabecalhoVoltar,
  Capi,
  Carregando,
  Confirmacao,
  ErroTela,
  Pagina,
} from '../../ui';
import { Proposta } from './Proposta';
import s from './Redacao.module.css';

/** Tempo sugerido para a redação no dia da prova (aula 10). */
const TEMPO_SUGERIDO_MS = 70 * 60_000;

/** D49: a folha (rascunho com contador de linhas e cronômetro) ou a correção da banca (IA). */
export default function RedacaoFolha() {
  const { id = '' } = useParams();
  const item = useRedacao(id);
  const painel = useRedacaoPainel();
  const tema = painel.data?.temas.find((t) => t.id === item.data?.temaId);

  return (
    <Pagina rotulo="Redação" comRodapeFixo={item.data?.status === 'rascunho'}>
      <CabecalhoVoltar para="/redacao?aba=minhas" titulo="Redação" />
      {item.isPending || painel.isPending ? (
        <Carregando />
      ) : item.isError ? (
        <ErroTela mensagem={mensagemDeErro(item.error)} onTentar={() => item.refetch()} />
      ) : painel.isError ? (
        <ErroTela mensagem={mensagemDeErro(painel.error)} onTentar={() => painel.refetch()} />
      ) : (
        <>
          {tema ? <Proposta tema={tema} compacta={item.data.status === 'corrigida'} /> : null}
          {item.data.status === 'corrigida' ? (
            <Correcao redacao={item.data} />
          ) : item.data.status === 'corrigindo' ? (
            <Capi pose="explicando" tamanho={110} fala="A banca está corrigindo a sua redação. Isso leva até 1 minuto…" />
          ) : (
            <Folha redacao={item.data} restantes={painel.data.cota.restantes} />
          )}
        </>
      )}
    </Pagina>
  );
}

function Folha({ redacao, restantes }: { redacao: Redacao; restantes: number }) {
  const qc = useQueryClient();
  const navegar = useNavigate();
  const [texto, setTexto] = useState(redacao.texto);
  const [salvoTexto, setSalvoTexto] = useState(redacao.texto);
  const [confirmar, setConfirmar] = useState(false);
  const [apagar, setApagar] = useState(false);
  const [inicio, setInicio] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  const linhas = contarLinhas(texto);
  const situacao = situacaoLinhas(linhas);
  const sujo = texto !== salvoTexto;

  const salvar = useMutation({
    mutationFn: (t: string) => chamar('redacaoSalvar', { params: { id: redacao.id }, corpo: { texto: t } }),
    onSuccess: (_r, t) => setSalvoTexto(t),
  });

  // Salva sozinho 1,5 s depois da última tecla.
  useEffect(() => {
    if (!sujo) return;
    const t = setTimeout(() => salvar.mutate(texto), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, sujo]);

  useEffect(() => {
    if (inicio === null) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inicio]);

  const corrigir = useMutation({
    mutationFn: async () => {
      if (sujo) await chamar('redacaoSalvar', { params: { id: redacao.id }, corpo: { texto } });
      return chamar('redacaoCorrigir', { params: { id: redacao.id } });
    },
    onSuccess: (r) => {
      qc.setQueryData(CHAVES.redacaoItem(redacao.id), r.redacao);
      void qc.invalidateQueries({ queryKey: CHAVES.redacao, exact: true });
      window.scrollTo({ top: 0 });
    },
    onError: () => {
      setConfirmar(false);
      // a correção pode ter terminado mesmo com a conexão caindo no meio
      void qc.invalidateQueries({ queryKey: CHAVES.redacaoItem(redacao.id) });
      void qc.invalidateQueries({ queryKey: CHAVES.redacao, exact: true });
    },
  });

  const excluir = useMutation({
    mutationFn: () => chamar('redacaoExcluir', { params: { id: redacao.id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CHAVES.redacao, exact: true });
      navegar('/redacao?aba=minhas', { replace: true });
    },
  });

  const restanteMs = inicio === null ? TEMPO_SUGERIDO_MS : Math.max(0, TEMPO_SUGERIDO_MS - (agora - inicio));
  const podeCorrigir = linhas >= LINHAS_MIN_PARA_CORRIGIR && restantes > 0;

  return (
    <>
      <div className={s.barraFolha}>
        <span
          className={[s.contador, situacao === 'ok' ? s.contadorOk : s.contadorFora].join(' ')}
          aria-live="polite"
        >
          cerca de {linhas} linhas · {LINHAS_MIN_REDACAO} a {LINHAS_MAX_REDACAO}
        </span>
        <button
          type="button"
          className={s.cronometro}
          onClick={() => setInicio(inicio === null ? Date.now() : null)}
          aria-label={inicio === null ? 'Iniciar cronômetro de 1h10' : 'Parar cronômetro'}
        >
          {inicio === null ? '⏱ 1:10:00' : restanteMs === 0 ? 'Tempo sugerido acabou' : `⏱ ${formatarCronometro(restanteMs)}`}
        </button>
      </div>

      <label className={s.folhaRotulo} htmlFor="folha">
        Sua redação (sem título e sem se identificar)
      </label>
      <textarea
        id="folha"
        className={s.folha}
        value={texto}
        maxLength={CARACTERES_MAX_REDACAO}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Comece pela introdução: contexto, tema e a sua tese. Separe os parágrafos com Enter."
        spellCheck={false}
      />
      <p className={s.nota}>
        {salvar.isError
          ? `Não salvou: ${mensagemDeErro(salvar.error)}`
          : salvar.isPending || sujo
            ? 'Salvando…'
            : 'Salvo'}
        {situacao === 'curta' ? ` · Faltam ${LINHAS_MIN_REDACAO - linhas} linhas para o mínimo do edital.` : ''}
        {situacao === 'longa' ? ' · Passou de 30 linhas: na prova, o excedente seria desconsiderado.' : ''}
        {' '}A contagem é uma estimativa da folha manuscrita.
      </p>

      {corrigir.isError ? (
        <p className={s.erro} role="alert">
          {mensagemDeErro(corrigir.error)}
        </p>
      ) : null}

      <div className={s.rodape}>
        <Botao3D disabled={!podeCorrigir} onClick={() => setConfirmar(true)}>
          ENVIAR PARA CORREÇÃO
        </Botao3D>
        <p className={s.nota}>
          {restantes === 0
            ? 'Você já usou as 3 correções desta semana. Pode continuar escrevendo e salvar.'
            : linhas < LINHAS_MIN_PARA_CORRIGIR
              ? `Escreva pelo menos ${LINHAS_MIN_PARA_CORRIGIR} linhas para pedir a correção.`
              : `Restam ${restantes} de 3 correções nesta semana.`}{' '}
          <button type="button" className={s.linkBotao} onClick={() => setApagar(true)}>
            Apagar rascunho
          </button>
        </p>
      </div>

      <Confirmacao
        aberto={confirmar}
        titulo="Enviar para a correção?"
        texto={`A correção usa 1 das suas ${restantes} correções desta semana e leva até 1 minuto. Depois de corrigida, a redação não pode mais ser editada (dá para reescrever numa nova versão).`}
        textoConfirmar="CORRIGIR"
        textoCancelar="VOLTAR"
        varianteConfirmar="primario"
        confirmarPrincipal
        carregando={corrigir.isPending}
        onConfirmar={() => corrigir.mutate()}
        onCancelar={() => setConfirmar(false)}
      />
      <Confirmacao
        aberto={apagar}
        titulo="Apagar este rascunho?"
        texto="O texto será apagado e não dá para desfazer."
        textoConfirmar="APAGAR"
        textoCancelar="CANCELAR"
        carregando={excluir.isPending}
        onConfirmar={() => excluir.mutate()}
        onCancelar={() => setApagar(false)}
      />
    </>
  );
}

function Correcao({ redacao }: { redacao: Redacao }) {
  const navegar = useNavigate();
  const qc = useQueryClient();
  const c = redacao.correcao;
  const reescrever = useMutation({
    mutationFn: () => chamar('redacaoCriar', { corpo: { temaId: redacao.temaId, texto: redacao.texto } }),
    onSuccess: (r) => {
      qc.setQueryData(CHAVES.redacaoItem(r.id), r);
      void qc.invalidateQueries({ queryKey: CHAVES.redacao, exact: true });
      navegar(`/redacao/${r.id}`);
    },
  });
  if (!c) return <ErroTela mensagem="A correção não está disponível." />;

  return (
    <section className={s.correcao} aria-label="Correção">
      <div className={[s.nota100, c.nota >= 50 ? s.notaBoa : s.notaBaixa].join(' ')}>
        <strong>{c.nota}</strong>
        <span>de 100</span>
      </div>
      {c.zerada ? (
        <p className={s.zerada} role="alert">
          Nota zero: {c.motivoZero}
        </p>
      ) : null}
      <p className={s.resumo}>{c.resumo}</p>

      {ASPECTOS_REDACAO.map((a) => (
        <div key={a.chave} className={s.aspecto}>
          <div className={s.aspectoTopo}>
            <span>{a.nome}</span>
            <strong>
              {c.notas[a.chave]} / {a.max}
            </strong>
          </div>
          <BarraProgresso valor={c.notas[a.chave] / a.max} rotulo={`${a.nome}: ${c.notas[a.chave]} de ${a.max}`} fina />
          <p>{c.comentarios[a.chave]}</p>
        </div>
      ))}

      {c.pontosFortes.length ? (
        <div className={s.bloco}>
          <h2>O que está bom</h2>
          <ul>
            {c.pontosFortes.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {c.melhorar.length ? (
        <div className={s.bloco}>
          <h2>O que melhorar primeiro</h2>
          <ol>
            {c.melhorar.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </div>
      ) : null}
      {c.trechos.length ? (
        <div className={s.bloco}>
          <h2>Trechos para revisar</h2>
          {c.trechos.map((t) => (
            <div key={t.trecho} className={s.trecho}>
              <q>{t.trecho}</q>
              <p>
                <strong>Problema:</strong> {t.problema}
              </p>
              <p>
                <strong>Sugestão:</strong> {t.sugestao}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className={s.bloco}>
        <h2>Seu texto</h2>
        <div className={s.textoFinal}>
          {redacao.texto
            .split(/\n+/)
            .filter((p) => p.trim())
            .map((p, i) => (
              <p key={i}>{p}</p>
            ))}
        </div>
      </div>

      <p className={s.nota}>
        Correção feita por inteligência artificial com os critérios da Tabela 10.1 do edital. É uma estimativa
        para treino, não a nota da banca.
      </p>
      {reescrever.isError ? (
        <p className={s.erro} role="alert">
          {mensagemDeErro(reescrever.error)}
        </p>
      ) : null}
      <Botao3D carregando={reescrever.isPending} onClick={() => reescrever.mutate()}>
        REESCREVER COM AS MELHORIAS
      </Botao3D>
    </section>
  );
}
