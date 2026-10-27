import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { GEMAS, LINHA_REVISAO_AMANHA, TEXTO_SAIR_LICAO, type Letra } from '@fuse/shared';
import { ErroApi, mensagemDeErro } from '../../api/cliente';
import { CHAVES, useMe } from '../../api/consultas';
import { baixarPacote } from '../../offline/pacote';
import {
  iniciarSessao,
  type FimSessao,
  type RespostaExibida,
  type Sessao,
} from '../../offline/motor';
import {
  BarraProgresso,
  Botao3D,
  Capi,
  Carregando,
  Confirmacao,
  ErroTela,
  FolhaFeedback,
  GrupoAlternativas,
  IconeCheio,
  IconeTraco,
  Imagem,
  Markdown,
  Pagina,
  useToast,
} from '../../ui';
import { ICONE_DISCIPLINA, NOME_CURTO_DISCIPLINA } from '../comum';
import { FimLicao } from './FimLicao';
import { TelaOfensiva } from './Ofensiva';
import { ReportarProblema } from './Reportar';
import { somAcerto, somErro } from './sons';
import s from './Licao.module.css';

type Fase = 'carregando' | 'erro' | 'dica' | 'questao' | 'fim' | 'ofensiva';

/**
 * 05–08 Lição (`/licao/:id`), Desafio e Revisão (`/revisar/praticar`).
 * Dica da lição → questões (seleção, DICA, VERIFICAR, folha de acerto/erro) → Fim → Ofensiva.
 */
export default function Licao({ revisao = false }: { revisao?: boolean }) {
  const { id = '' } = useParams();
  const [busca] = useSearchParams();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const me = useMe();

  const [fase, setFase] = useState<Fase>('carregando');
  const [erro, setErro] = useState<string | null>(null);
  /** O erro veio do "concluir": tentar de novo conclui a mesma sessão (não sorteia outra). */
  const [falhouAoConcluir, setFalhouAoConcluir] = useState(false);
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [indice, setIndice] = useState(0);
  const [selecionada, setSelecionada] = useState<Letra | null>(null);
  const [resposta, setResposta] = useState<RespostaExibida | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [gemas, setGemas] = useState(0);
  const [dicas, setDicas] = useState<Record<string, string>>({});
  const [confirmarDica, setConfirmarDica] = useState(false);
  const [pedindoDica, setPedindoDica] = useState(false);
  const [sairAberto, setSairAberto] = useState(false);
  const [reportAberto, setReportAberto] = useState(false);
  const [fim, setFim] = useState<FimSessao | null>(null);
  const inicioQuestao = useRef(Date.now());
  const iniciado = useRef(false);

  const disciplina = busca.get('disciplina') ?? undefined;
  const origem = busca.get('origem') ?? undefined;

  const comecar = useCallback(async () => {
    if (!me.data) return;
    setFase('carregando');
    setErro(null);
    try {
      const sx = await iniciarSessao(
        revisao
          ? { tipo: 'revisao', disciplina, sessaoOrigemId: origem }
          : { tipo: 'licao', licaoId: id },
        { usuarioId: me.data.id, nome: me.data.nome, vidas: me.data.vidas, gemas: me.data.gemas },
      );
      setSessao(sx);
      setGemas(sx.gemas);
      setIndice(0);
      setSelecionada(null);
      setResposta(null);
      setFase(sx.dica ? 'dica' : 'questao');
      inicioQuestao.current = Date.now();
    } catch (e) {
      setErro(mensagemDeErro(e));
      setFase('erro');
    }
  }, [me.data, revisao, disciplina, origem, id]);

  useEffect(() => {
    if (iniciado.current || !me.data) return;
    iniciado.current = true;
    void comecar();
  }, [me.data, comecar]);

  // Esc abre a confirmação de saída.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (
        e.key === 'Escape' &&
        (fase === 'questao' || fase === 'dica') &&
        !document.querySelector('[role="dialog"]')
      ) {
        e.preventDefault();
        setSairAberto(true);
      }
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [fase]);

  const questao = sessao?.questoes[indice] ?? null;
  const total = sessao?.questoes.length ?? 0;
  const ehDesafio = sessao?.tipo === 'desafio';
  const sons = me.data?.sons ?? true;

  async function verificar() {
    if (!sessao || !questao || !selecionada || resposta || verificando) return;
    setVerificando(true);
    try {
      const r = await sessao.responder(
        questao.id,
        selecionada,
        Math.min(3_600_000, Date.now() - inicioQuestao.current),
      );
      setResposta(r);
      if (r.acertou) somAcerto(sons);
      else somErro(sons);
    } catch (e) {
      toast(mensagemDeErro(e), 'erro');
    } finally {
      setVerificando(false);
    }
  }

  function atualizarDepoisDeConcluir() {
    return Promise.all([
      qc.invalidateQueries({ queryKey: CHAVES.me }),
      qc.invalidateQueries({ queryKey: CHAVES.trilha }),
      qc.invalidateQueries({ queryKey: CHAVES.revisao }),
      qc.invalidateQueries({ queryKey: CHAVES.estatisticas }),
      qc.invalidateQueries({ queryKey: CHAVES.liga }),
    ]);
  }

  async function concluir() {
    if (!sessao) return;
    setFase('carregando');
    setFalhouAoConcluir(false);
    try {
      const f = await sessao.concluir();
      setFim(f);
      setFase('fim');
      void atualizarDepoisDeConcluir();
      if (!f.offline && me.data) void baixarPacote(me.data.id).catch(() => undefined);
    } catch (e) {
      // A resposta se perdeu, mas o servidor já tinha concluído: o progresso está salvo.
      if (e instanceof ErroApi && e.codigo === 'sessao_encerrada') {
        void atualizarDepoisDeConcluir();
        toast('Lição concluída. Seu progresso foi salvo.', 'sucesso');
        navegar(revisao ? '/revisar' : '/aprender', { replace: true });
        return;
      }
      setErro(mensagemDeErro(e));
      setFalhouAoConcluir(true);
      setFase('erro');
    }
  }

  function continuar() {
    if (indice + 1 >= total) {
      void concluir();
      return;
    }
    setIndice((i) => i + 1);
    setSelecionada(null);
    setResposta(null);
    inicioQuestao.current = Date.now();
    window.scrollTo(0, 0);
  }

  async function usarDica() {
    if (!sessao || !questao) return;
    setPedindoDica(true);
    try {
      const r = await sessao.pedirDica(questao.id);
      setDicas((d) => ({ ...d, [questao.id]: r.dica }));
      setGemas(r.gemas);
      void qc.invalidateQueries({ queryKey: CHAVES.me });
    } catch (e) {
      toast(mensagemDeErro(e), 'erro');
    } finally {
      setPedindoDica(false);
      setConfirmarDica(false);
    }
  }

  function sairDaLicao() {
    setSairAberto(false);
    navegar(revisao ? '/revisar' : '/aprender', { replace: true });
  }

  /* ------------------------------------------------------------ fases */

  if (fase === 'carregando' || (!sessao && fase !== 'erro')) {
    return (
      <Pagina>
        <Carregando texto="Preparando suas questões…" />
      </Pagina>
    );
  }
  if (fase === 'erro') {
    return (
      <Pagina>
        <ErroTela
          mensagem={erro ?? 'Algo deu errado.'}
          onTentar={() => void (falhouAoConcluir ? concluir() : comecar())}
        />
        <Botao3D variante="secundario" onClick={() => navegar(revisao ? '/revisar' : '/aprender')}>
          Voltar
        </Botao3D>
      </Pagina>
    );
  }
  if (fase === 'fim' && fim) {
    return (
      <FimLicao
        fim={fim}
        tipo={sessao!.tipo}
        onContinuar={() => {
          if (!fim.offline && fim.ofensiva.mostrarTela) setFase('ofensiva');
          else navegar(revisao ? '/revisar' : '/aprender', { replace: true });
        }}
        onRevisarErros={
          !fim.offline && fim.erros.length > 0 && sessao!.modo === 'online'
            ? () => navegar(`/revisar/praticar?origem=${sessao!.id}`, { replace: true })
            : undefined
        }
      />
    );
  }
  if (fase === 'ofensiva' && fim && !fim.offline) {
    return (
      <TelaOfensiva
        ofensiva={fim.ofensiva}
        nome={me.data?.nome ?? ''}
        onContinuar={() => navegar('/aprender', { replace: true })}
      />
    );
  }

  const sx = sessao!;
  const topo = (
    <header className={s.topo}>
      <button
        type="button"
        className={s.fechar}
        aria-label="Sair da lição"
        onClick={() => setSairAberto(true)}
      >
        <IconeTraco nome="fechar" tamanho={26} espessura={2.6} />
      </button>
      <div className={s.progresso}>
        <span className={s.progressoTexto}>
          {fase === 'dica' ? 'Dica da lição' : `Questão ${indice + 1} de ${total}`}
        </span>
        <BarraProgresso
          valor={fase === 'dica' ? 0 : (indice + (resposta ? 1 : 0)) / Math.max(1, total)}
          rotulo="Progresso da lição"
          fina
        />
      </div>
      <span className={s.espacoDireita} />
    </header>
  );

  const confirmacaoSair = (
    <Confirmacao
      aberto={sairAberto}
      titulo="Quer mesmo sair?"
      texto={TEXTO_SAIR_LICAO.replace('Quer mesmo sair? ', '')}
      textoCancelar="CONTINUAR ESTUDANDO"
      textoConfirmar="SAIR"
      onCancelar={() => setSairAberto(false)}
      onConfirmar={sairDaLicao}
      topo={<Capi pose="incentivando" tamanho={110} />}
    />
  );

  if (fase === 'dica' && sx.dica) {
    return (
      <Pagina comRodapeFixo className={s.pagina}>
        {topo}
        <section className={s.dicaLicao} aria-labelledby="dica-titulo">
          <Capi pose="explicando" tamanho={150} carregamento="eager" className={s.dicaCapi} />
          <p className={s.dicaRotulo}>
            <Imagem nome="icone-dica" tamanho={22} /> Dica da lição
          </p>
          <h1 id="dica-titulo" className={s.dicaTitulo}>
            {sx.dica.titulo}
          </h1>
          <p className={s.dicaTexto}>{sx.dica.texto}</p>
          {sx.dica.exemplo ? (
            <p className={s.dicaExemplo}>
              <strong>Exemplo: </strong>
              {sx.dica.exemplo}
            </p>
          ) : null}
        </section>
        <div className={s.rodape}>
          <Botao3D
            autoFocus
            onClick={() => {
              setFase('questao');
              inicioQuestao.current = Date.now();
            }}
          >
            ENTENDI, VAMOS LÁ
          </Botao3D>
        </div>
        {confirmacaoSair}
      </Pagina>
    );
  }

  if (!questao) return <Carregando />;
  const dicaDaQuestao = dicas[questao.id];
  const podeDica = !ehDesafio && questao.temDica;
  const semGemas = gemas < GEMAS.CUSTO_DICA;

  return (
    <Pagina comRodapeFixo className={s.pagina}>
      {topo}
      {sx.modo === 'offline' ? (
        <p className={s.offline} role="status">
          <IconeTraco nome="wifiOff" tamanho={16} /> Modo offline: suas respostas serão enviadas
          quando a conexão voltar.
        </p>
      ) : null}

      <div className={s.cabQuestao}>
        <span className={s.discIcone}>
          <Imagem nome={ICONE_DISCIPLINA[questao.disciplina.slug]} tamanho={30} />
        </span>
        <div>
          <p className={s.discNome}>
            {NOME_CURTO_DISCIPLINA[questao.disciplina.slug].split(' ')[0]} · {questao.assunto.nome}
          </p>
          <p className={s.origem}>{questao.chipOrigem}</p>
        </div>
        {questao.revisao ? <span className={s.seloRevisao}>REVISÃO</span> : null}
      </div>

      <h1 className={s.tituloQuestao}>Selecione a alternativa correta</h1>

      {questao.textoApoio ? (
        <div className={s.apoio} tabIndex={0} role="region" aria-label="Texto de apoio">
          <Markdown texto={questao.textoApoio} />
        </div>
      ) : null}

      <div className={s.enunciado}>
        <Imagem
          nome="mascote-explicando"
          tamanho={84}
          className={s.enunciadoCapi}
          carregamento="eager"
        />
        <div className={s.balao} id="enunciado">
          <Markdown texto={questao.enunciado} />
        </div>
      </div>

      {dicaDaQuestao ? (
        <div className={s.dicaQuestao} role="status">
          <Imagem nome="icone-dica" tamanho={26} />
          <p>
            <strong>Dica: </strong>
            {dicaDaQuestao}
          </p>
        </div>
      ) : null}

      <GrupoAlternativas
        alternativas={questao.alternativas}
        selecionada={selecionada}
        correcao={resposta ? { gabarito: resposta.gabarito, marcada: selecionada! } : null}
        onSelecionar={(l) => !resposta && setSelecionada(l)}
        onConfirmar={resposta ? continuar : verificar}
        atalhosGlobais={!sairAberto && !reportAberto && !confirmarDica}
        rotulo="Alternativas da questão"
      />

      {!resposta ? (
        <div className={s.rodape}>
          {podeDica ? (
            <Botao3D
              variante="secundario"
              disabled={!!dicaDaQuestao || semGemas || sx.modo === 'offline'}
              onClick={() => setConfirmarDica(true)}
              iconeEsquerda={<Imagem nome="icone-dica" tamanho={24} />}
            >
              {semGemas && !dicaDaQuestao
                ? 'Sem gemas'
                : dicaDaQuestao
                  ? 'Dica usada'
                  : `Ver dica · ${GEMAS.CUSTO_DICA} gemas`}
            </Botao3D>
          ) : null}
          <Botao3D
            disabled={!selecionada}
            carregando={verificando}
            onClick={() => void verificar()}
            iconeDireita={<IconeTraco nome="seta" tamanho={20} />}
          >
            VERIFICAR
          </Botao3D>
        </div>
      ) : (
        <FolhaFeedback
          tipo={resposta.acertou ? 'acerto' : 'erro'}
          titulo={resposta.titulo}
          xp={resposta.acertou ? resposta.xpGanho : null}
          combo={resposta.acertou && resposta.comboVisivel ? resposta.combo : null}
          explicacao={resposta.explicacao}
          dicaBolso={resposta.acertou ? null : resposta.dicaBolso}
          linhaRevisao={!resposta.acertou && resposta.voltaNaRevisao ? LINHA_REVISAO_AMANHA : null}
          textoBotao={resposta.acertou ? 'CONTINUAR' : 'ENTENDI'}
          onContinuar={continuar}
          aviso={
            sx.modo === 'offline' ? (
              <p className={s.avisoOffline}>O XP desta resposta entra quando a conexão voltar.</p>
            ) : null
          }
          rodape={
            sx.modo === 'online' ? (
              <button type="button" className={s.reportar} onClick={() => setReportAberto(true)}>
                <IconeTraco nome="bandeira" tamanho={16} /> Reportar problema
              </button>
            ) : null
          }
        />
      )}

      <Confirmacao
        aberto={confirmarDica}
        titulo="Usar uma dica?"
        texto={`A dica custa ${GEMAS.CUSTO_DICA} gemas e não elimina alternativas. Você tem ${gemas} gemas.`}
        textoConfirmar={`USAR DICA (−${GEMAS.CUSTO_DICA})`}
        textoCancelar="AGORA NÃO"
        varianteConfirmar="azul"
        confirmarPrincipal
        carregando={pedindoDica}
        onConfirmar={() => void usarDica()}
        onCancelar={() => setConfirmarDica(false)}
        topo={<IconeCheio nome="gema" tamanho={48} />}
      />
      <ReportarProblema
        aberto={reportAberto}
        questaoId={questao.id}
        onFechar={() => setReportAberto(false)}
      />
      {confirmacaoSair}
    </Pagina>
  );
}
