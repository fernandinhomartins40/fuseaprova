/**
 * Motor da sessão de estudo (lição, desafio, revisão). Online, a API é a fonte da verdade.
 * D28: a sessão já chega com o gabarito cifrado (`correcaoLocal`), então o feedback aparece na
 * hora, sem esperar a rede; a resposta segue para a API em seguida (com novas tentativas se a
 * conexão falhar) e a conclusão só acontece depois de todas chegarem. Se a API discordar da
 * correção local, a tela troca pelo resultado dela.
 *
 * Sem conexão, a sessão usa o pacote offline: a correção local decifra o gabarito do pacote só
 * para mostrar o feedback, a resposta vai para a fila do IndexedDB e o servidor recalcula XP,
 * vidas, ofensiva e revisão no sync. Offline não mostramos XP nem mexemos em vidas/gemas.
 */
import {
  calcularCombo,
  comboVisivel,
  decifrarTexto,
  tituloAcerto,
  tituloErro,
  xpDaResposta,
  type Letra,
} from '@fuse/shared';
import {
  GabaritoOfflineClaro,
  type ConcluirSessaoResposta,
  type DicaLicao,
  type IniciarSessaoResposta,
  type QuestaoOffline,
  type QuestaoParaAluno,
  type ResponderResposta,
} from '@fuse/shared/api';
import { chamar, ErroApi } from '../api/cliente';
import { concluirSessaoOffline, novoId, registrarSessao, registrarTentativa } from './fila';
import { decifrarGabarito, licaoDoPacote, marcarFeito, revisaoDoPacote } from './pacote';

export interface RespostaExibida {
  acertou: boolean;
  gabarito: Letra;
  explicacao: string;
  dicaBolso: string | null;
  titulo: string;
  /** null offline (o XP é recalculado no servidor). */
  xpGanho: number | null;
  combo: number;
  comboVisivel: boolean;
  vidas: number | null;
  proximaVidaEm: string | null;
  voltaNaRevisao: boolean;
  /** Correção local: o resultado da API, quando chegar (rejeita se a API recusar a resposta). */
  confirmacao?: Promise<RespostaExibida>;
}

export interface FimOffline {
  offline: true;
  tituloLicao: string | null;
  acertos: number;
  total: number;
  precisao: number;
  tempoMs: number;
  erros: string[];
}

export type FimSessao = (ConcluirSessaoResposta & { offline?: false }) | FimOffline;

export interface Sessao {
  modo: 'online' | 'offline';
  id: string;
  tipo: IniciarSessaoResposta['tipo'];
  licao: IniciarSessaoResposta['licao'];
  dica: DicaLicao | null;
  questoes: QuestaoParaAluno[];
  gastaVidas: boolean;
  vidas: number;
  proximaVidaEm: string | null;
  gemas: number;
  responder(questaoId: string, resposta: Letra, tempoMs: number): Promise<RespostaExibida>;
  /** Espera a resposta desta questão chegar à API (a anotação exige a questão respondida). */
  confirmar(questaoId: string): Promise<void>;
  concluir(): Promise<FimSessao>;
}

export type PedidoSessao =
  | { tipo: 'licao'; licaoId: string }
  | { tipo: 'revisao'; disciplina?: string; sessaoOrigemId?: string; antecipar?: boolean }
  /** D29: treino inteligente (sem assunto) ou reforço de um tema. Só online. */
  | { tipo: 'reforco'; assuntoId?: string };

/** Tentativas de reenviar a resposta quando a conexão cai (1 s, 2 s, 4 s). */
const REENVIOS = 3;

function esperar(ms: number) {
  return new Promise((ok) => setTimeout(ok, ms));
}

function exibir(x: ResponderResposta): RespostaExibida {
  return {
    acertou: x.acertou,
    gabarito: x.gabarito,
    explicacao: x.explicacao,
    dicaBolso: x.dicaBolso,
    titulo: x.titulo,
    xpGanho: x.xpGanho,
    combo: x.combo,
    comboVisivel: x.comboVisivel,
    vidas: x.vidas,
    proximaVidaEm: x.proximaVidaEm,
    voltaNaRevisao: x.voltaNaRevisao,
  };
}

function sessaoOnline(r: IniciarSessaoResposta, nome: string): Sessao {
  interface Envio {
    corpo: { questaoId: string; resposta: Letra; tempoMs: number; idCliente: string };
    promessa: Promise<ResponderResposta>;
  }
  const envios = new Map<string, Envio>();
  const historico: boolean[] = [];

  async function enviar(corpo: Envio['corpo']): Promise<ResponderResposta> {
    for (let i = 0; ; i++) {
      try {
        return await chamar('sessaoResponder', { params: { id: r.sessaoId }, corpo });
      } catch (e) {
        if (!(e instanceof ErroApi) || !e.semConexao || i >= REENVIOS) throw e;
        await esperar(1000 * 2 ** i);
      }
    }
  }
  function despachar(corpo: Envio['corpo']): Envio {
    const envio: Envio = { corpo, promessa: enviar(corpo) };
    envio.promessa.catch(() => undefined); // tratado em confirmar/concluir e na tela
    envios.set(corpo.questaoId, envio);
    return envio;
  }
  /** Espera o envio; se falhou por conexão, tenta de novo (mesmo id_cliente, idempotente). */
  async function garantir(questaoId: string): Promise<void> {
    const envio = envios.get(questaoId);
    if (!envio) return;
    try {
      await envio.promessa;
    } catch (e) {
      if (!(e instanceof ErroApi) || !e.semConexao) throw e;
      await despachar(envio.corpo).promessa;
    }
  }
  async function correcaoLocal(questaoId: string): Promise<GabaritoOfflineClaro | null> {
    const cifrado = r.correcaoLocal?.cifrados[questaoId];
    if (!r.correcaoLocal || !cifrado) return null;
    try {
      const claro = await decifrarTexto(r.correcaoLocal.chave, questaoId, cifrado);
      return GabaritoOfflineClaro.parse(JSON.parse(claro));
    } catch {
      return null; // sem Web Crypto ou dado estranho: corrige pela API, como antes
    }
  }

  return {
    modo: 'online',
    id: r.sessaoId,
    tipo: r.tipo,
    licao: r.licao,
    dica: r.dica,
    questoes: r.questoes,
    gastaVidas: r.gastaVidas,
    vidas: r.vidas,
    proximaVidaEm: r.proximaVidaEm,
    gemas: r.gemas,
    async responder(questaoId, resposta, tempoMs) {
      const corpo = { questaoId, resposta, tempoMs, idCliente: novoId() };
      const g = envios.has(questaoId) ? null : await correcaoLocal(questaoId);
      if (!g) {
        const x = exibir(await despachar(corpo).promessa);
        historico.push(x.acertou);
        return x;
      }
      despachar(corpo);
      const acertou = g.gabarito === resposta;
      historico.push(acertou);
      const combo = calcularCombo(historico);
      const confirmacao = (async () => {
        await garantir(questaoId);
        return exibir(await envios.get(questaoId)!.promessa);
      })();
      confirmacao.catch(() => undefined); // a tela trata
      return {
        acertou,
        gabarito: g.gabarito,
        explicacao: g.explicacao,
        dicaBolso: g.dicaBolso,
        titulo: acertou ? tituloAcerto(nome) : tituloErro(g.gabarito),
        xpGanho: xpDaResposta(r.tipo, acertou),
        combo,
        comboVisivel: comboVisivel(combo),
        vidas: null,
        proximaVidaEm: null,
        voltaNaRevisao: !acertou,
        confirmacao,
      };
    },
    confirmar: garantir,
    async concluir() {
      for (const id of envios.keys()) await garantir(id);
      return chamar('sessaoConcluir', { params: { id: r.sessaoId } });
    },
  };
}

function sessaoOffline(o: {
  usuarioId: string;
  nome: string;
  tipo: 'licao' | 'revisao';
  licao: IniciarSessaoResposta['licao'];
  dica: DicaLicao | null;
  questoes: QuestaoOffline[];
  chave: string;
  pacoteId: string;
  vidas: number;
  gemas: number;
}): Sessao {
  const idCliente = novoId();
  const iniciadaEm = new Date().toISOString();
  const historico: boolean[] = [];
  const erros: string[] = [];
  let tempoTotal = 0;
  let registrada = false;
  async function garantirSessao() {
    if (registrada) return;
    registrada = true;
    await registrarSessao({
      usuarioId: o.usuarioId,
      idCliente,
      pacoteId: o.pacoteId,
      tipo: o.tipo,
      licaoId: o.licao?.id ?? null,
      iniciadaEm,
      concluidaEm: null,
    });
  }
  return {
    modo: 'offline',
    id: idCliente,
    tipo: o.tipo,
    licao: o.licao,
    dica: o.dica,
    questoes: o.questoes.map(({ cifrado: _c, ...q }) => q),
    gastaVidas: o.tipo === 'licao',
    vidas: o.vidas,
    proximaVidaEm: null,
    gemas: o.gemas,
    async responder(questaoId, resposta, tempoMs) {
      const q = o.questoes.find((x) => x.id === questaoId);
      if (!q) throw new ErroApi('Questão não encontrada no pacote offline.', 404, 'nao_encontrado');
      await garantirSessao();
      const g = await decifrarGabarito(o.chave, q);
      const acertou = g.gabarito === resposta;
      await registrarTentativa({
        usuarioId: o.usuarioId,
        idCliente: novoId(),
        sessaoIdCliente: idCliente,
        questaoId,
        resposta,
        tempoMs,
        respondidaEm: new Date().toISOString(),
      });
      historico.push(acertou);
      tempoTotal += tempoMs;
      if (!acertou) erros.push(questaoId);
      // Combo é só visual (PRD 5.9); XP e vidas ficam com o servidor no sync.
      const combo = calcularCombo(historico);
      return {
        acertou,
        gabarito: g.gabarito,
        explicacao: g.explicacao,
        dicaBolso: g.dicaBolso,
        titulo: acertou ? tituloAcerto(o.nome) : tituloErro(g.gabarito),
        xpGanho: null,
        combo,
        comboVisivel: comboVisivel(combo),
        vidas: null,
        proximaVidaEm: null,
        voltaNaRevisao: !acertou,
      };
    },
    async confirmar() {
      throw new ErroApi('As anotações precisam de conexão.', 0, 'sem_conexao');
    },
    async concluir() {
      await garantirSessao();
      await concluirSessaoOffline(idCliente);
      await marcarFeito(o.usuarioId, {
        licaoId: o.tipo === 'licao' ? o.licao?.id : null,
        questoesRevisao: o.tipo === 'revisao' ? o.questoes.map((q) => q.id) : [],
      });
      const total = historico.length;
      const acertos = historico.filter(Boolean).length;
      return {
        offline: true,
        tituloLicao: o.licao?.titulo ?? null,
        acertos,
        total,
        precisao: total ? Math.round((acertos / total) * 100) : 0,
        tempoMs: tempoTotal,
        erros,
      };
    },
  };
}

export const MENSAGEM_SEM_PACOTE =
  'Você está sem internet e esta atividade não está no seu pacote offline. Conecte-se para continuar.';

/**
 * Inicia a sessão. Online primeiro; se não houver conexão, tenta o pacote offline.
 * Erros da API (sem vidas, lição bloqueada, 402…) sobem para a tela tratar.
 */
export async function iniciarSessao(
  pedido: PedidoSessao,
  contexto: { usuarioId: string; nome: string; vidas: number; gemas: number },
): Promise<Sessao> {
  try {
    const r =
      pedido.tipo === 'licao'
        ? await chamar('licaoIniciar', { params: { id: pedido.licaoId } })
        : pedido.tipo === 'reforco'
          ? await chamar('reforcoIniciar', {
              corpo: pedido.assuntoId ? { assuntoId: pedido.assuntoId } : {},
            })
          : await chamar('revisaoIniciar', {
              corpo: {
                ...(pedido.disciplina ? { disciplina: pedido.disciplina as 'portugues' } : {}),
                ...(pedido.sessaoOrigemId ? { sessaoOrigemId: pedido.sessaoOrigemId } : {}),
                ...(pedido.antecipar ? { antecipar: true } : {}),
              },
            });
    return sessaoOnline(r, contexto.nome);
  } catch (e) {
    if (!(e instanceof ErroApi) || !e.semConexao) throw e;
    if (pedido.tipo === 'reforco')
      throw new ErroApi(
        'O treino precisa de conexão. Conecte-se e tente de novo.',
        0,
        'sem_conexao',
      );
    if (pedido.tipo === 'licao') {
      const achado = await licaoDoPacote(contexto.usuarioId, pedido.licaoId);
      if (!achado || achado.pacote.licoesFeitas.includes(pedido.licaoId)) {
        throw new ErroApi(MENSAGEM_SEM_PACOTE, 0, 'sem_conexao');
      }
      return sessaoOffline({
        ...contexto,
        tipo: 'licao',
        licao: achado.licao.licao,
        dica: achado.licao.dica,
        questoes: achado.licao.questoes,
        chave: achado.pacote.chave,
        pacoteId: achado.pacote.pacoteId,
      });
    }
    if (pedido.sessaoOrigemId || pedido.antecipar)
      throw new ErroApi(MENSAGEM_SEM_PACOTE, 0, 'sem_conexao');
    const rev = await revisaoDoPacote(contexto.usuarioId);
    let questoes = rev?.questoes ?? [];
    if (pedido.disciplina)
      questoes = questoes.filter((q) => q.disciplina.slug === pedido.disciplina);
    if (!rev || questoes.length === 0) throw new ErroApi(MENSAGEM_SEM_PACOTE, 0, 'sem_conexao');
    return sessaoOffline({
      ...contexto,
      tipo: 'revisao',
      licao: null,
      dica: null,
      questoes,
      chave: rev.pacote.chave,
      pacoteId: rev.pacote.pacoteId,
    });
  }
}
