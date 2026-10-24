import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { formatarCronometro, type Letra } from '@fuse/shared';
import type { RespostaSimulado, SimuladoAndamento, SimuladoResultado } from '@fuse/shared/api';
import { chamar, ErroApi, mensagemDeErro } from '../../api/cliente';
import { CHAVES, useSimulado } from '../../api/consultas';
import {
  BarraProgresso,
  Botao3D,
  CabecalhoVoltar,
  Capi,
  Carregando,
  Chip,
  Confirmacao,
  ErroTela,
  GrupoAlternativas,
  IconeTraco,
  Imagem,
  Pagina,
  useToast,
} from '../../ui';
import { NOME_CURTO_DISCIPLINA } from '../comum';
import s from './SimuladoProva.module.css';

/** ✏️ Simulado em andamento e ✏️ Resultado do simulado (`/simulado/:id`). */
export default function SimuladoProva() {
  const { id = '' } = useParams();
  const q = useSimulado(id);
  if (q.isPending) return <Carregando texto="Abrindo o simulado…" />;
  if (q.isError)
    return (
      <Pagina>
        <CabecalhoVoltar para="/simulado" titulo="Simulado" />
        <ErroTela mensagem={mensagemDeErro(q.error)} onTentar={() => q.refetch()} />
      </Pagina>
    );
  return q.data.estado === 'andamento' ? <Prova sim={q.data} /> : <Resultado r={q.data} />;
}

/* ===================================================================== prova */

function Prova({ sim }: { sim: SimuladoAndamento }) {
  const navegar = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [atual, setAtual] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, RespostaSimulado>>(sim.respostas);
  const [gradeAberta, setGradeAberta] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [entregando, setEntregando] = useState(false);
  // Diferença entre o relógio do servidor e o do aparelho: o tempo é do servidor.
  const desvio = useMemo(() => new Date(sim.agora).getTime() - Date.now(), [sim.agora]);
  const fim = new Date(sim.terminaEm).getTime();
  const [restante, setRestante] = useState(() => fim - (Date.now() + desvio));
  const entregue = useRef(false);

  const entregar = useCallback(
    async (automatica: boolean) => {
      if (entregue.current) return;
      entregue.current = true;
      setEntregando(true);
      try {
        const r = await chamar('simuladoEntregar', { params: { id: sim.id } });
        qc.setQueryData(CHAVES.simulado(sim.id), r);
      } catch (e) {
        if (e instanceof ErroApi && e.codigo === 'simulado_encerrado') {
          await qc.invalidateQueries({ queryKey: CHAVES.simulado(sim.id) });
        } else {
          entregue.current = false;
          toast(mensagemDeErro(e), 'erro');
        }
      } finally {
        setEntregando(false);
        setConfirmar(false);
        void qc.invalidateQueries({ queryKey: CHAVES.simulados });
        void qc.invalidateQueries({ queryKey: CHAVES.me });
        void qc.invalidateQueries({ queryKey: CHAVES.revisao });
        if (automatica) toast('O tempo acabou e a prova foi entregue.', 'info');
      }
    },
    [qc, sim.id, toast],
  );

  useEffect(() => {
    const tic = () => {
      const ms = fim - (Date.now() + desvio);
      setRestante(ms);
      if (ms <= 0) void entregar(true);
    };
    tic();
    const t = window.setInterval(tic, 1000);
    return () => window.clearInterval(t);
  }, [fim, desvio, entregar]);

  const item = sim.questoes[atual]!;
  const resp = respostas[item.questao.id] ?? { letra: null, revisarDepois: false };
  const emBranco = sim.questoes.filter((x) => !respostas[x.questao.id]?.letra).length;

  async function salvar(novo: RespostaSimulado) {
    const anterior = respostas[item.questao.id];
    setRespostas((r) => ({ ...r, [item.questao.id]: novo }));
    try {
      await chamar('simuladoResposta', {
        params: { id: sim.id },
        corpo: { questaoId: item.questao.id, letra: novo.letra, revisarDepois: novo.revisarDepois },
      });
    } catch (e) {
      setRespostas((r) => {
        const c = { ...r };
        if (anterior) c[item.questao.id] = anterior;
        else delete c[item.questao.id];
        return c;
      });
      if (e instanceof ErroApi && e.codigo === 'simulado_encerrado') void entregar(true);
      else toast(mensagemDeErro(e), 'erro');
    }
  }

  const poucoTempo = restante < 10 * 60_000;

  return (
    <Pagina comRodapeFixo className={s.pagina}>
      <header className={s.topo}>
        <button
          type="button"
          className={s.voltar}
          aria-label="Sair do simulado (o tempo continua)"
          onClick={() => navegar('/simulado')}
        >
          <IconeTraco nome="voltar" tamanho={26} espessura={2.6} />
        </button>
        <p
          className={[s.relogio, poucoTempo ? s.relogioAlerta : ''].join(' ')}
          role="timer"
          aria-label="Tempo restante"
        >
          <IconeTraco nome="relogio" tamanho={20} />
          {formatarCronometro(restante)}
        </p>
        <button
          type="button"
          className={s.gradeBotao}
          aria-expanded={gradeAberta}
          onClick={() => setGradeAberta((v) => !v)}
        >
          {atual + 1}/{sim.questoes.length}
        </button>
      </header>

      {gradeAberta ? (
        <nav className={s.grade} aria-label="Ir para a questão">
          <ol>
            {sim.questoes.map((x, i) => {
              const r = respostas[x.questao.id];
              return (
                <li key={x.questao.id}>
                  <button
                    type="button"
                    className={[
                      s.num,
                      r?.letra ? s.numRespondida : '',
                      r?.revisarDepois ? s.numRevisar : '',
                      i === atual ? s.numAtual : '',
                    ].join(' ')}
                    aria-label={`Questão ${x.numero}${r?.letra ? ', respondida' : ', em branco'}${r?.revisarDepois ? ', para revisar depois' : ''}`}
                    aria-current={i === atual ? 'true' : undefined}
                    onClick={() => {
                      setAtual(i);
                      setGradeAberta(false);
                    }}
                  >
                    {x.numero}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className={s.legenda}>
            <span className={[s.mini, s.numRespondida].join(' ')} /> respondida
            <span className={[s.mini, s.numRevisar].join(' ')} /> revisar depois
            <span className={s.mini} /> em branco
          </p>
        </nav>
      ) : null}

      <div className={s.cab}>
        <Chip variante="roxo">
          {item.numero}. {NOME_CURTO_DISCIPLINA[item.bloco]}
        </Chip>
        <span className={s.origem}>{item.questao.chipOrigem}</span>
      </div>
      {item.questao.textoApoio ? (
        <div className={s.apoio} tabIndex={0} role="region" aria-label="Texto de apoio">
          {item.questao.textoApoio}
        </div>
      ) : null}
      <p className={s.enunciado}>{item.questao.enunciado}</p>

      <GrupoAlternativas
        alternativas={item.questao.alternativas}
        selecionada={resp.letra}
        onSelecionar={(l: Letra) => void salvar({ ...resp, letra: l })}
        atalhosGlobais={!confirmar}
        rotulo={`Alternativas da questão ${item.numero}`}
      />

      <button
        type="button"
        className={[s.marcar, resp.revisarDepois ? s.marcado : ''].join(' ')}
        aria-pressed={resp.revisarDepois}
        onClick={() => void salvar({ ...resp, revisarDepois: !resp.revisarDepois })}
      >
        <IconeTraco nome="marcador" tamanho={18} />{' '}
        {resp.revisarDepois ? 'Marcada para revisar' : 'Marcar para revisar depois'}
      </button>

      <div className={s.rodape}>
        <div className={s.navegacao}>
          <Botao3D
            variante="secundario"
            compacto
            disabled={atual === 0}
            onClick={() => setAtual((a) => a - 1)}
          >
            ANTERIOR
          </Botao3D>
          <Botao3D
            variante="secundario"
            compacto
            disabled={atual === sim.questoes.length - 1}
            onClick={() => setAtual((a) => a + 1)}
          >
            PRÓXIMA
          </Botao3D>
        </div>
        <Botao3D variante="roxo" onClick={() => setConfirmar(true)}>
          ENTREGAR PROVA
        </Botao3D>
      </div>

      <Confirmacao
        aberto={confirmar}
        titulo="Entregar a prova?"
        texto={
          emBranco > 0
            ? `Você deixou ${emBranco} ${emBranco === 1 ? 'questão' : 'questões'} em branco. Depois de entregar não dá para mudar.`
            : 'Todas as questões estão respondidas. Depois de entregar não dá para mudar.'
        }
        textoConfirmar="ENTREGAR"
        textoCancelar="VOLTAR PARA A PROVA"
        varianteConfirmar="roxo"
        confirmarPrincipal
        carregando={entregando}
        onConfirmar={() => void entregar(false)}
        onCancelar={() => setConfirmar(false)}
      />
    </Pagina>
  );
}

/* ================================================================= resultado */

function formatarPontos(p: number): string {
  return p.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function Resultado({ r }: { r: SimuladoResultado }) {
  const navegar = useNavigate();
  const [soErradas, setSoErradas] = useState(false);
  const lista = soErradas ? r.questoes.filter((q) => !q.acertou) : r.questoes;
  return (
    <Pagina>
      <CabecalhoVoltar para="/simulado" titulo="Resultado do simulado" />
      <section className={s.res}>
        <Capi
          pose={r.aprovado ? 'celebrando' : 'incentivando'}
          tamanho={170}
          pular={r.aprovado}
          carregamento="eager"
        />
        <p className={s.resPontos}>
          {formatarPontos(r.pontos)} <span>de {formatarPontos(r.pontosMaximos)} pontos</span>
        </p>
        <p className={s.resPct}>{Math.round(r.percentual)}%</p>
        <Chip variante={r.aprovado ? 'acerto' : 'erro'} grande>
          {r.selo}
        </Chip>
        <p className={s.resInfo}>
          {r.acertos} de {r.totalQuestoes} acertos · tempo {formatarCronometro(r.tempoGastoMs)}
          {r.xpGanho > 0 ? ` · +${r.xpGanho} XP` : ''}
        </p>
        {r.entregaAutomatica ? (
          <p className={s.resInfo}>Entregue automaticamente quando o tempo acabou.</p>
        ) : null}
      </section>

      <h2 className={s.subtitulo}>Desempenho por bloco</h2>
      <ul className={s.blocos}>
        {r.porBloco.map((b) => (
          <li key={b.bloco} className={s.bloco}>
            <div className={s.blocoLinha}>
              <span className={s.blocoNome}>{b.nome}</span>
              <span className={s.blocoValor}>
                {b.acertos}/{b.questoes} · {formatarPontos(b.pontos)} pts
              </span>
            </div>
            <BarraProgresso
              valor={b.questoes ? b.acertos / b.questoes : 0}
              rotulo={`Acertos em ${b.nome}`}
              cor="roxo"
              fina
            />
          </li>
        ))}
      </ul>

      <div className={s.filtro}>
        <h2 className={s.subtitulo}>Questões</h2>
        <div role="group" aria-label="Filtro" className={s.filtroBotoes}>
          <button type="button" aria-pressed={!soErradas} onClick={() => setSoErradas(false)}>
            Todas
          </button>
          <button type="button" aria-pressed={soErradas} onClick={() => setSoErradas(true)}>
            Erradas ({r.questoes.filter((q) => !q.acertou).length})
          </button>
        </div>
      </div>
      <p className={s.nota}>
        <Imagem nome="icone-revisao" tamanho={22} /> Os erros entraram na sua fila de revisão.
      </p>
      <ol className={s.questoes}>
        {lista.map((q) => (
          <li key={q.questao.id}>
            <details className={[s.questao, q.acertou ? s.qOk : s.qErro].join(' ')}>
              <summary>
                <span className={s.qNum}>{q.numero}</span>
                <span className={s.qResumo}>
                  {q.anulada
                    ? 'Anulada (conta como acerto)'
                    : q.acertou
                      ? 'Acertou'
                      : q.resposta
                        ? `Marcou ${q.resposta} · correta ${q.gabarito}`
                        : `Em branco · correta ${q.gabarito}`}
                </span>
                <IconeTraco nome="chevronBaixo" tamanho={20} />
              </summary>
              <div className={s.qCorpo}>
                <p className={s.qOrigem}>{q.questao.chipOrigem}</p>
                <p className={s.qEnunciado}>{q.questao.enunciado}</p>
                <ul className={s.qAlts}>
                  {q.questao.alternativas.map((a) => (
                    <li
                      key={a.letra}
                      className={
                        a.letra === q.gabarito
                          ? s.altCerta
                          : a.letra === q.resposta
                            ? s.altErrada
                            : ''
                      }
                    >
                      <strong>{a.letra})</strong> {a.texto}
                      {a.letra === q.gabarito ? ' ✓' : a.letra === q.resposta ? ' ✕' : ''}
                    </li>
                  ))}
                </ul>
                <p className={s.qExplicacao}>{q.explicacao}</p>
                {q.dicaBolso ? <p className={s.qDica}>Dica de bolso: {q.dicaBolso}</p> : null}
              </div>
            </details>
          </li>
        ))}
      </ol>
      <Botao3D variante="roxo" onClick={() => navegar('/simulado')}>
        VOLTAR AOS SIMULADOS
      </Botao3D>
    </Pagina>
  );
}
