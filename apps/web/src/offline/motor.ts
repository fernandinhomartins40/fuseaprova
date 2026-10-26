/**
 * Motor da sessão de estudo (lição, desafio, revisão). Online, tudo passa pela API, que é a
 * fonte da verdade. Sem conexão, a sessão usa o pacote offline: a correção local decifra o
 * gabarito do pacote só para mostrar o feedback, a resposta vai para a fila do IndexedDB e o
 * servidor recalcula XP, vidas, ofensiva e revisão no sync. Offline não mostramos XP nem
 * mexemos em vidas/gemas: o cliente não é fonte da verdade.
 */
import { calcularCombo, comboVisivel, tituloAcerto, tituloErro, type Letra } from '@fuse/shared';
import type {
  ConcluirSessaoResposta,
  DicaLicao,
  IniciarSessaoResposta,
  QuestaoOffline,
  QuestaoParaAluno,
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
  pedirDica(questaoId: string): Promise<{ dica: string; gemas: number }>;
  concluir(): Promise<FimSessao>;
}

export type PedidoSessao =
  | { tipo: 'licao'; licaoId: string }
  | { tipo: 'revisao'; disciplina?: string; sessaoOrigemId?: string };

function sessaoOnline(r: IniciarSessaoResposta): Sessao {
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
      const x = await chamar('sessaoResponder', {
        params: { id: r.sessaoId },
        corpo: { questaoId, resposta, tempoMs, idCliente: novoId() },
      });
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
    },
    async pedirDica(questaoId) {
      return chamar('sessaoDica', { params: { id: r.sessaoId }, corpo: { questaoId } });
    },
    async concluir() {
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
    async pedirDica() {
      throw new ErroApi('A dica precisa de conexão (ela gasta gemas).', 0, 'sem_conexao');
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
        : await chamar('revisaoIniciar', {
            corpo: {
              ...(pedido.disciplina ? { disciplina: pedido.disciplina as 'portugues' } : {}),
              ...(pedido.sessaoOrigemId ? { sessaoOrigemId: pedido.sessaoOrigemId } : {}),
            },
          });
    return sessaoOnline(r);
  } catch (e) {
    if (!(e instanceof ErroApi) || !e.semConexao) throw e;
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
      });
    }
    if (pedido.sessaoOrigemId) throw new ErroApi(MENSAGEM_SEM_PACOTE, 0, 'sem_conexao');
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
    });
  }
}
