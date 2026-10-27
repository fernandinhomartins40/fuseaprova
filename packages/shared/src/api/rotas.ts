/**
 * Registro de TODAS as rotas da API (PRD 10), com guarda e schemas de entrada e resposta.
 * É a interface entre a API (Fastify) e a PWA: a API valida com `params`/`query`/`corpo`
 * e o front tipa as chamadas com `z.infer<typeof ROTAS.x.resposta>`.
 *
 * Caminhos sem o prefixo /api. `resposta: null` = 204 sem corpo.
 */
import type { z } from 'zod';
import { IdParams, OkResposta } from './comum.js';
import * as auth from './auth.js';
import * as me from './me.js';
import * as mc from './meus-concursos.js';
import * as pag from './pagamento.js';
import * as cont from './conteudo.js';
import * as est from './estudo.js';
import * as off from './offline.js';
import * as sim from './simulados.js';
import * as soc from './social.js';
import * as ac from './admin-conteudo.js';
import * as ag from './admin-gestao.js';
import * as sa from './superadmin.js';

export const PREFIXO_API = '/api';

export type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
/**
 * nenhuma · login (401) · acesso (402) · admin (403) · webhook (token do Asaas, 401)
 * superadmin (403; exige 2FA ativo e verificado na sessão) · superadmin_2fa (403; só o papel,
 * para configurar ou verificar o 2FA). D13.
 */
export type Guarda =
  | 'nenhuma'
  | 'login'
  | 'acesso'
  | 'admin'
  | 'webhook'
  | 'superadmin'
  | 'superadmin_2fa';

export interface DefinicaoRota {
  metodo: Metodo;
  caminho: string;
  guarda: Guarda;
  descricao: string;
  params?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  corpo?: z.ZodTypeAny;
  resposta: z.ZodTypeAny | null;
  /** Limite de requisições (PRD 8.2). */
  limite?: { max: number; janelaMs: number; por: 'ip' | 'usuario' };
}

const rota = <const T extends DefinicaoRota>(r: T): T => r;

const MIN = 60_000;
const HORA = 60 * MIN;
/** D13: limite padrão das rotas /super e o das ações sensíveis. */
const LIMITE_SUPER = { max: 120, janelaMs: MIN, por: 'usuario' } as const;
const LIMITE_SENSIVEL = { max: 20, janelaMs: 15 * MIN, por: 'usuario' } as const;

export const ROTAS = {
  /* --------------------------------------------------------------- auth */
  authCadastro: rota({
    metodo: 'POST',
    caminho: '/auth/cadastro',
    guarda: 'nenhuma',
    descricao: 'Cria a conta, registra o aceite dos termos e abre a sessão.',
    corpo: auth.CadastroEntrada,
    resposta: auth.SessaoResposta,
    limite: { max: 10, janelaMs: HORA, por: 'ip' },
  }),
  authLogin: rota({
    metodo: 'POST',
    caminho: '/auth/login',
    guarda: 'nenhuma',
    descricao: 'Login com e-mail e senha.',
    corpo: auth.LoginEntrada,
    resposta: auth.SessaoResposta,
    limite: { max: 20, janelaMs: 15 * MIN, por: 'ip' },
  }),
  authSair: rota({
    metodo: 'POST',
    caminho: '/auth/sair',
    guarda: 'login',
    descricao: 'Encerra a sessão atual.',
    resposta: OkResposta,
  }),
  authRecuperar: rota({
    metodo: 'POST',
    caminho: '/auth/recuperar',
    guarda: 'nenhuma',
    descricao: 'Envia o e-mail de redefinição (link de 1 h). Resposta sempre igual.',
    corpo: auth.RecuperarEntrada,
    resposta: auth.RecuperarResposta,
    limite: { max: 5, janelaMs: 15 * MIN, por: 'ip' },
  }),
  authRedefinir: rota({
    metodo: 'POST',
    caminho: '/auth/redefinir',
    guarda: 'nenhuma',
    descricao: 'Define a nova senha com o token e encerra as outras sessões.',
    corpo: auth.RedefinirEntrada,
    resposta: auth.SessaoResposta,
  }),

  /* ----------------------------------------------------------------- me */
  meObter: rota({
    metodo: 'GET',
    caminho: '/me',
    guarda: 'login',
    descricao: 'Perfil e contadores (vidas, gemas, ofensiva, revisões pendentes, meta).',
    resposta: me.MeResposta,
  }),
  meAtualizar: rota({
    metodo: 'PATCH',
    caminho: '/me',
    guarda: 'login',
    descricao: 'Preferências: cargo, meta, lembrete, notificações, apelido, sons, onboarding.',
    corpo: me.MeAtualizarEntrada,
    resposta: me.MeResposta,
  }),
  meSenha: rota({
    metodo: 'POST',
    caminho: '/me/senha',
    guarda: 'login',
    descricao: 'Altera a senha e encerra as outras sessões.',
    corpo: me.AlterarSenhaEntrada,
    resposta: OkResposta,
  }),
  meExportar: rota({
    metodo: 'GET',
    caminho: '/me/exportar',
    guarda: 'login',
    descricao: 'LGPD: JSON com perfil, pedidos e tentativas.',
    resposta: me.ExportarResposta,
  }),
  meExcluir: rota({
    metodo: 'DELETE',
    caminho: '/me',
    guarda: 'login',
    descricao: 'LGPD: anonimiza o perfil (mantém o pedido) e encerra as sessões.',
    corpo: me.ExcluirContaEntrada,
    resposta: OkResposta,
  }),
  meusConcursos: rota({
    metodo: 'GET',
    caminho: '/me/concursos',
    guarda: 'login',
    descricao: 'Concursos que o aluno acompanha, o ativo e os abertos que ainda não acompanha (D21).',
    resposta: mc.MeusConcursosResposta,
  }),
  meuConcursoSeguir: rota({
    metodo: 'POST',
    caminho: '/me/concursos',
    guarda: 'login',
    descricao: 'Passa a acompanhar um concurso; se já está liberado, ele vira o ativo (a trilha muda).',
    corpo: mc.SeguirConcursoEntrada,
    resposta: mc.MeusConcursosResposta,
  }),
  meuConcursoAtivar: rota({
    metodo: 'POST',
    caminho: '/me/concursos/:id/ativar',
    guarda: 'login',
    descricao: 'Troca o concurso ativo por outro já liberado para o aluno (402 se ainda não pagou).',
    params: IdParams,
    resposta: mc.MeusConcursosResposta,
  }),
  meuConcursoDeixar: rota({
    metodo: 'DELETE',
    caminho: '/me/concursos/:id',
    guarda: 'login',
    descricao: 'Deixa de acompanhar um concurso ainda não pago. Concurso liberado não sai da lista.',
    params: IdParams,
    resposta: mc.MeusConcursosResposta,
  }),
  meComprarProtetor: rota({
    metodo: 'POST',
    caminho: '/me/protetores',
    guarda: 'acesso',
    descricao: 'Compra 1 protetor de ofensiva por 200 gemas (máximo 2).',
    resposta: me.ComprarProtetorResposta,
  }),

  /* ---------------------------------------------------------- pagamento */
  pagamentoPix: rota({
    metodo: 'POST',
    caminho: '/pagamento/pix',
    guarda: 'login',
    descricao: 'Gera ou reaproveita o Pix pendente não expirado de um concurso (padrão: o ativo).',
    corpo: pag.PixEntrada,
    resposta: pag.PixResposta,
    limite: { max: 10, janelaMs: HORA, por: 'usuario' },
  }),
  pagamentoStatus: rota({
    metodo: 'GET',
    caminho: '/pagamento/status',
    guarda: 'login',
    descricao: 'Status do pagamento de um concurso; após 60 s pendente consulta o Asaas.',
    query: pag.StatusPagamentoQuery,
    resposta: pag.StatusPagamentoResposta,
  }),
  webhookAsaas: rota({
    metodo: 'POST',
    caminho: '/webhooks/asaas',
    guarda: 'webhook',
    descricao: 'Webhook do Asaas (header asaas-access-token), idempotente pelo id do evento.',
    corpo: pag.AsaasWebhookCorpo,
    resposta: OkResposta,
  }),

  /* ----------------------------------------------------------- conteúdo */
  concursoPorId: rota({
    metodo: 'GET',
    caminho: '/concursos/:id',
    guarda: 'login',
    descricao: 'Dados de um concurso aberto (edital, cargos e áreas), para escolher o cargo antes de seguir.',
    params: IdParams,
    resposta: cont.ConcursoResposta,
  }),
  concurso: rota({
    metodo: 'GET',
    caminho: '/concurso',
    guarda: 'acesso',
    descricao: 'Dados do concurso, status do edital e cargos.',
    resposta: cont.ConcursoResposta,
  }),
  trilha: rota({
    metodo: 'GET',
    caminho: '/trilha',
    guarda: 'acesso',
    descricao: 'Unidades, seções e lições com o estado do aluno.',
    resposta: cont.TrilhaResposta,
  }),
  guia: rota({
    metodo: 'GET',
    caminho: '/guia/:unidadeId',
    guarda: 'acesso',
    descricao: 'Dicas de todas as lições da unidade.',
    params: cont.GuiaUnidadeParams,
    resposta: cont.GuiaResposta,
  }),

  /* ------------------------------------------------------------- estudo */
  licaoIniciar: rota({
    metodo: 'POST',
    caminho: '/licoes/:id/iniciar',
    guarda: 'acesso',
    descricao: 'Sorteia as questões (5 ou 10 no desafio) e cria a sessão de estudo.',
    params: IdParams,
    resposta: est.IniciarSessaoResposta,
  }),
  licaoAbrirBau: rota({
    metodo: 'POST',
    caminho: '/licoes/:id/abrir-bau',
    guarda: 'acesso',
    descricao: 'Abre o baú (+20 gemas) quando as lições anteriores estão concluídas.',
    params: IdParams,
    resposta: est.AbrirBauResposta,
  }),
  sessaoResponder: rota({
    metodo: 'POST',
    caminho: '/sessoes/:id/responder',
    guarda: 'acesso',
    descricao: 'Responde uma questão: gabarito, explicação, XP, vidas e combo.',
    params: est.SessaoParams,
    corpo: est.ResponderEntrada,
    resposta: est.ResponderResposta,
  }),
  sessaoDica: rota({
    metodo: 'POST',
    caminho: '/sessoes/:id/dica',
    guarda: 'acesso',
    descricao: 'Gasta 5 gemas e devolve a dica da questão.',
    params: est.SessaoParams,
    corpo: est.DicaEntrada,
    resposta: est.DicaResposta,
  }),
  sessaoConcluir: rota({
    metodo: 'POST',
    caminho: '/sessoes/:id/concluir',
    guarda: 'acesso',
    descricao: 'Fecha a sessão: resumo, ofensiva e conquistas.',
    params: est.SessaoParams,
    resposta: est.ConcluirSessaoResposta,
  }),
  syncTentativas: rota({
    metodo: 'POST',
    caminho: '/sync/tentativas',
    guarda: 'acesso',
    descricao: 'Lote offline idempotente por id_cliente; o servidor recalcula tudo.',
    corpo: off.SyncEntrada,
    resposta: off.SyncResposta,
  }),
  offlinePacote: rota({
    metodo: 'GET',
    caminho: '/offline/pacote',
    guarda: 'acesso',
    descricao: 'Próximas 3 lições e revisão vencida, com gabarito cifrado.',
    resposta: off.PacoteOfflineResposta,
  }),
  revisao: rota({
    metodo: 'GET',
    caminho: '/revisao',
    guarda: 'acesso',
    descricao: 'Pendentes por disciplina.',
    resposta: est.RevisaoResposta,
  }),
  revisaoIniciar: rota({
    metodo: 'POST',
    caminho: '/revisao/iniciar',
    guarda: 'acesso',
    descricao:
      'Sessão de revisão (até 10), com filtro opcional por disciplina ou sessão de origem.',
    corpo: est.IniciarRevisaoEntrada,
    resposta: est.IniciarSessaoResposta,
  }),
  questaoReport: rota({
    metodo: 'POST',
    caminho: '/questoes/:id/report',
    guarda: 'acesso',
    descricao: 'Reportar problema; 3 reports abertos retiram a questão do ar.',
    params: IdParams,
    corpo: est.ReportEntrada,
    resposta: est.ReportResposta,
  }),

  /* ----------------------------------------------------------- simulado */
  simuladoCriar: rota({
    metodo: 'POST',
    caminho: '/simulados',
    guarda: 'acesso',
    descricao: 'Cria um simulado do cargo (5/5/5/25 ou distribuição do edital).',
    corpo: sim.CriarSimuladoEntrada,
    resposta: sim.SimuladoAndamento,
  }),
  simuladosListar: rota({
    metodo: 'GET',
    caminho: '/simulados',
    guarda: 'acesso',
    descricao: 'Histórico de simulados e o em andamento.',
    resposta: sim.SimuladosHistoricoResposta,
  }),
  simuladoObter: rota({
    metodo: 'GET',
    caminho: '/simulados/:id',
    guarda: 'acesso',
    descricao: 'Detalhe: em andamento (sem gabarito) ou resultado.',
    params: IdParams,
    resposta: sim.SimuladoDetalheResposta,
  }),
  simuladoResposta: rota({
    metodo: 'PUT',
    caminho: '/simulados/:id/resposta',
    guarda: 'acesso',
    descricao: 'Salva uma resposta, sem feedback.',
    params: IdParams,
    corpo: sim.SalvarRespostaSimuladoEntrada,
    resposta: sim.SalvarRespostaSimuladoResposta,
  }),
  simuladoEntregar: rota({
    metodo: 'POST',
    caminho: '/simulados/:id/entregar',
    guarda: 'acesso',
    descricao: 'Corrige e devolve o resultado; erros entram na revisão.',
    params: IdParams,
    resposta: sim.EntregarSimuladoResposta,
  }),

  /* ------------------------------------------------- liga, perfil, push */
  liga: rota({
    metodo: 'GET',
    caminho: '/liga',
    guarda: 'acesso',
    descricao: 'Grupo da semana, posição e resultado anterior não visto.',
    resposta: soc.LigaResposta,
  }),
  ligaResultadoVisto: rota({
    metodo: 'POST',
    caminho: '/liga/resultado/visto',
    guarda: 'acesso',
    descricao: 'Marca o modal de resultado semanal como visto.',
    corpo: soc.LigaResultadoVistoEntrada,
    resposta: OkResposta,
  }),
  perfilEstatisticas: rota({
    metodo: 'GET',
    caminho: '/perfil/estatisticas',
    guarda: 'acesso',
    descricao: 'Estatísticas, domínio e conquistas.',
    resposta: soc.EstatisticasResposta,
  }),
  pushChave: rota({
    metodo: 'GET',
    caminho: '/push/chave',
    guarda: 'acesso',
    descricao: 'Chave pública VAPID.',
    resposta: soc.PushChaveResposta,
  }),
  pushInscrever: rota({
    metodo: 'POST',
    caminho: '/push/inscrever',
    guarda: 'acesso',
    descricao: 'Registra a inscrição Web Push.',
    corpo: soc.PushInscreverEntrada,
    resposta: OkResposta,
  }),
  pushRemover: rota({
    metodo: 'DELETE',
    caminho: '/push',
    guarda: 'acesso',
    descricao: 'Remove a inscrição (ou todas, sem endpoint).',
    corpo: soc.PushRemoverEntrada,
    resposta: OkResposta,
  }),

  /* ============================================================== admin */
  adminPainel: rota({
    metodo: 'GET',
    caminho: '/admin/painel',
    guarda: 'admin',
    descricao: 'Vendas, ativos, reports, rascunhos e métricas.',
    resposta: ag.PainelResposta,
  }),

  adminConcursosListar: rota({
    metodo: 'GET',
    caminho: '/admin/concursos',
    guarda: 'admin',
    descricao: 'Lista os concursos.',
    resposta: ac.ConcursosListaResposta,
  }),
  adminConcursoCriar: rota({
    metodo: 'POST',
    caminho: '/admin/concursos',
    guarda: 'admin',
    descricao: 'Cria um concurso.',
    corpo: ac.ConcursoEntrada,
    resposta: ac.ConcursoAdmin,
  }),
  adminConcursoClonar: rota({
    metodo: 'POST',
    caminho: '/admin/concursos/:id/clonar',
    guarda: 'admin',
    descricao: 'Cria um concurso novo com a trilha e os cargos genéricos de um concurso modelo.',
    params: IdParams,
    corpo: ac.ConcursoClonarEntrada,
    resposta: ac.ConcursoClonarResposta,
    limite: LIMITE_SENSIVEL,
  }),
  adminConcursoObter: rota({
    metodo: 'GET',
    caminho: '/admin/concursos/:id',
    guarda: 'admin',
    descricao: 'Detalhe do concurso.',
    params: IdParams,
    resposta: ac.ConcursoAdmin,
  }),
  adminConcursoAtualizar: rota({
    metodo: 'PATCH',
    caminho: '/admin/concursos/:id',
    guarda: 'admin',
    descricao: 'Edita o concurso (status, data da prova, links).',
    params: IdParams,
    corpo: ac.ConcursoAtualizarEntrada,
    resposta: ac.ConcursoAdmin,
  }),

  adminCargosListar: rota({
    metodo: 'GET',
    caminho: '/admin/cargos',
    guarda: 'admin',
    descricao: 'Lista os cargos (filtro por concurso).',
    query: ac.CargosQuery,
    resposta: ac.CargosListaResposta,
  }),
  adminCargoCriar: rota({
    metodo: 'POST',
    caminho: '/admin/cargos',
    guarda: 'admin',
    descricao: 'Cria um cargo.',
    corpo: ac.CargoEntrada,
    resposta: ac.CargoAdmin,
  }),
  adminCargoAtualizar: rota({
    metodo: 'PATCH',
    caminho: '/admin/cargos/:id',
    guarda: 'admin',
    descricao: 'Edita um cargo.',
    params: IdParams,
    corpo: ac.CargoAtualizarEntrada,
    resposta: ac.CargoAdmin,
  }),

  adminProvasListar: rota({
    metodo: 'GET',
    caminho: '/admin/provas',
    guarda: 'admin',
    descricao: 'Provas de origem com filtros.',
    query: ac.ProvasQuery,
    resposta: ac.ProvasListaResposta,
  }),
  adminProvaCriar: rota({
    metodo: 'POST',
    caminho: '/admin/provas',
    guarda: 'admin',
    descricao: 'Cadastra uma prova de origem e seus links.',
    corpo: ac.ProvaOrigemEntrada,
    resposta: ac.ProvaOrigemAdmin,
  }),
  adminProvaObter: rota({
    metodo: 'GET',
    caminho: '/admin/provas/:id',
    guarda: 'admin',
    descricao: 'Detalhe da prova de origem.',
    params: IdParams,
    resposta: ac.ProvaOrigemAdmin,
  }),
  adminProvaAtualizar: rota({
    metodo: 'PATCH',
    caminho: '/admin/provas/:id',
    guarda: 'admin',
    descricao: 'Edita a prova (links, status ativa/retirada).',
    params: IdParams,
    corpo: ac.ProvaOrigemAtualizarEntrada,
    resposta: ac.ProvaOrigemAdmin,
  }),

  adminQuestoesListar: rota({
    metodo: 'GET',
    caminho: '/admin/questoes',
    guarda: 'admin',
    descricao: 'Questões com filtros (disciplina, assunto, status, origem, área…).',
    query: ac.QuestoesQuery,
    resposta: ac.QuestoesListaResposta,
  }),
  adminQuestaoCriar: rota({
    metodo: 'POST',
    caminho: '/admin/questoes',
    guarda: 'admin',
    descricao: 'Cria uma questão.',
    corpo: ac.QuestaoEntrada,
    resposta: ac.QuestaoAdmin,
  }),
  adminQuestaoObter: rota({
    metodo: 'GET',
    caminho: '/admin/questoes/:id',
    guarda: 'admin',
    descricao: 'Questão completa, com pendências para publicar.',
    params: IdParams,
    resposta: ac.QuestaoAdmin,
  }),
  adminQuestaoAtualizar: rota({
    metodo: 'PUT',
    caminho: '/admin/questoes/:id',
    guarda: 'admin',
    descricao: 'Salva a questão (incrementa a versão).',
    params: IdParams,
    corpo: ac.QuestaoEntrada,
    resposta: ac.QuestaoAdmin,
  }),
  adminQuestaoPrevia: rota({
    metodo: 'GET',
    caminho: '/admin/questoes/:id/previa',
    guarda: 'admin',
    descricao: 'Pré-visualização no formato da tela de Pergunta.',
    params: IdParams,
    resposta: ac.QuestaoPreviaResposta,
  }),
  adminQuestoesLote: rota({
    metodo: 'POST',
    caminho: '/admin/questoes/lote',
    guarda: 'admin',
    descricao: 'Ações em lote: publicar, retirar, revisão, rascunho, anular.',
    corpo: ac.QuestoesLoteEntrada,
    resposta: ac.QuestoesLoteResposta,
  }),
  adminQuestoesRetirarOrigem: rota({
    metodo: 'POST',
    caminho: '/admin/questoes/retirar-origem',
    guarda: 'admin',
    descricao: 'Retira todas as questões de uma prova ou de uma banca (fau_real).',
    corpo: ac.RetirarOrigemEntrada,
    resposta: ac.RetirarOrigemResposta,
  }),
  adminUpload: rota({
    metodo: 'POST',
    caminho: '/admin/uploads',
    guarda: 'admin',
    descricao: 'Upload de imagem (multipart, campo "arquivo").',
    resposta: ac.UploadResposta,
  }),

  adminDisciplinas: rota({
    metodo: 'GET',
    caminho: '/admin/disciplinas',
    guarda: 'admin',
    descricao: 'Lista as disciplinas.',
    resposta: ac.DisciplinasListaResposta,
  }),
  adminAssuntosListar: rota({
    metodo: 'GET',
    caminho: '/admin/assuntos',
    guarda: 'admin',
    descricao: 'Assuntos com dicas e contagem de questões.',
    query: ac.AssuntosQuery,
    resposta: ac.AssuntosListaResposta,
  }),
  adminAssuntoCriar: rota({
    metodo: 'POST',
    caminho: '/admin/assuntos',
    guarda: 'admin',
    descricao: 'Cria um assunto.',
    corpo: ac.AssuntoEntrada,
    resposta: ac.AssuntoAdmin,
  }),
  adminAssuntoAtualizar: rota({
    metodo: 'PATCH',
    caminho: '/admin/assuntos/:id',
    guarda: 'admin',
    descricao: 'Edita um assunto e sua dica.',
    params: IdParams,
    corpo: ac.AssuntoAtualizarEntrada,
    resposta: ac.AssuntoAdmin,
  }),

  adminTrilhas: rota({
    metodo: 'GET',
    caminho: '/admin/trilhas',
    guarda: 'admin',
    descricao: 'Árvore de unidades, seções e lições.',
    query: ac.TrilhasQuery,
    resposta: ac.TrilhasResposta,
  }),
  adminTrilhasOrdem: rota({
    metodo: 'PUT',
    caminho: '/admin/trilhas/ordem',
    guarda: 'admin',
    descricao: 'Reordena unidades, seções ou lições.',
    corpo: ac.ReordenarEntrada,
    resposta: OkResposta,
  }),
  adminUnidadeCriar: rota({
    metodo: 'POST',
    caminho: '/admin/unidades',
    guarda: 'admin',
    descricao: 'Cria uma unidade.',
    corpo: ac.UnidadeEntrada,
    resposta: ac.UnidadeAdmin,
  }),
  adminUnidadeAtualizar: rota({
    metodo: 'PATCH',
    caminho: '/admin/unidades/:id',
    guarda: 'admin',
    descricao: 'Edita uma unidade.',
    params: IdParams,
    corpo: ac.UnidadeAtualizarEntrada,
    resposta: ac.UnidadeAdmin,
  }),
  adminUnidadeExcluir: rota({
    metodo: 'DELETE',
    caminho: '/admin/unidades/:id',
    guarda: 'admin',
    descricao: 'Exclui uma unidade vazia.',
    params: IdParams,
    resposta: OkResposta,
  }),
  adminSecaoCriar: rota({
    metodo: 'POST',
    caminho: '/admin/secoes',
    guarda: 'admin',
    descricao: 'Cria uma seção (arrastando um assunto).',
    corpo: ac.SecaoEntrada,
    resposta: ac.SecaoAdmin,
  }),
  adminSecaoAtualizar: rota({
    metodo: 'PATCH',
    caminho: '/admin/secoes/:id',
    guarda: 'admin',
    descricao: 'Edita uma seção.',
    params: IdParams,
    corpo: ac.SecaoAtualizarEntrada,
    resposta: ac.SecaoAdmin,
  }),
  adminSecaoExcluir: rota({
    metodo: 'DELETE',
    caminho: '/admin/secoes/:id',
    guarda: 'admin',
    descricao: 'Exclui uma seção.',
    params: IdParams,
    resposta: OkResposta,
  }),
  adminLicaoCriar: rota({
    metodo: 'POST',
    caminho: '/admin/licoes',
    guarda: 'admin',
    descricao: 'Cria uma lição, baú ou desafio.',
    corpo: ac.LicaoEntrada,
    resposta: ac.LicaoAdmin,
  }),
  adminLicaoAtualizar: rota({
    metodo: 'PATCH',
    caminho: '/admin/licoes/:id',
    guarda: 'admin',
    descricao: 'Edita a lição (ordem, tipo, dica).',
    params: IdParams,
    corpo: ac.LicaoAtualizarEntrada,
    resposta: ac.LicaoAdmin,
  }),
  adminLicaoExcluir: rota({
    metodo: 'DELETE',
    caminho: '/admin/licoes/:id',
    guarda: 'admin',
    descricao: 'Exclui uma lição.',
    params: IdParams,
    resposta: OkResposta,
  }),

  adminEditalObter: rota({
    metodo: 'GET',
    caminho: '/admin/edital',
    guarda: 'admin',
    descricao: 'Edital do concurso: cargos, conteúdo, seções no edital.',
    query: ac.EditalQuery,
    resposta: ac.EditalResposta,
  }),
  adminEditalSalvar: rota({
    metodo: 'PUT',
    caminho: '/admin/edital',
    guarda: 'admin',
    descricao: 'Salva o edital (cargos, vagas, conteúdo, data da prova).',
    corpo: ac.EditalEntrada,
    resposta: ac.EditalResposta,
  }),
  adminEditalPublicar: rota({
    metodo: 'POST',
    caminho: '/admin/edital/publicar',
    guarda: 'admin',
    descricao: 'Publica o edital e liga o modo edital.',
    corpo: ac.PublicarEditalEntrada,
    resposta: ac.PublicarEditalResposta,
  }),

  adminImportacoesListar: rota({
    metodo: 'GET',
    caminho: '/admin/importacoes',
    guarda: 'admin',
    descricao: 'Fila do coletor (PDFs, questões extraídas, confronto).',
    query: ac.ImportacoesQuery,
    resposta: ac.ImportacoesListaResposta,
  }),
  adminImportacaoObter: rota({
    metodo: 'GET',
    caminho: '/admin/importacoes/:id',
    guarda: 'admin',
    descricao: 'Detalhe da importação com o confronto do gabarito.',
    params: IdParams,
    resposta: ac.ImportacaoDetalhe,
  }),
  adminImportacaoAtualizar: rota({
    metodo: 'PATCH',
    caminho: '/admin/importacoes/:id',
    guarda: 'admin',
    descricao: 'Muda o status da importação.',
    params: IdParams,
    corpo: ac.ImportacaoAtualizarEntrada,
    resposta: ac.ImportacaoDetalhe,
  }),

  adminPedidosListar: rota({
    metodo: 'GET',
    caminho: '/admin/pedidos',
    guarda: 'admin',
    descricao: 'Pagamentos com filtros.',
    query: ag.PedidosQuery,
    resposta: ag.PedidosListaResposta,
  }),
  adminPedidoReembolso: rota({
    metodo: 'POST',
    caminho: '/admin/pedidos/:id/reembolso',
    guarda: 'admin',
    descricao: 'Estorno no Asaas; o webhook revoga o acesso.',
    params: IdParams,
    corpo: ag.ReembolsoEntrada,
    resposta: ag.ReembolsoResposta,
  }),

  adminReportsListar: rota({
    metodo: 'GET',
    caminho: '/admin/reports',
    guarda: 'admin',
    descricao: 'Fila de reports.',
    query: ag.ReportsQuery,
    resposta: ag.ReportsListaResposta,
  }),
  adminReportAtualizar: rota({
    metodo: 'PATCH',
    caminho: '/admin/reports/:id',
    guarda: 'admin',
    descricao: 'Resolve ou descarta um report.',
    params: IdParams,
    corpo: ag.ReportAtualizarEntrada,
    resposta: ag.ReportAdmin,
  }),

  adminUsuariosListar: rota({
    metodo: 'GET',
    caminho: '/admin/usuarios',
    guarda: 'admin',
    descricao: 'Busca de usuários.',
    query: ag.UsuariosQuery,
    resposta: ag.UsuariosListaResposta,
  }),
  adminUsuarioObter: rota({
    metodo: 'GET',
    caminho: '/admin/usuarios/:id',
    guarda: 'admin',
    descricao: 'Progresso, pedidos e sessões do usuário.',
    params: IdParams,
    resposta: ag.UsuarioAdminDetalhe,
  }),
  adminUsuarioRevogarSessoes: rota({
    metodo: 'POST',
    caminho: '/admin/usuarios/:id/revogar-sessoes',
    guarda: 'admin',
    descricao: 'Encerra todas as sessões do usuário.',
    params: IdParams,
    resposta: ag.RevogarSessoesResposta,
  }),
  adminUsuarioLiberarAcesso: rota({
    metodo: 'POST',
    caminho: '/admin/usuarios/:id/liberar-acesso',
    guarda: 'admin',
    descricao: 'Liberação manual de acesso (motivo obrigatório, auditoria).',
    params: IdParams,
    corpo: ag.LiberarAcessoEntrada,
    resposta: OkResposta,
  }),
  adminUsuarioRevogarAcesso: rota({
    metodo: 'POST',
    caminho: '/admin/usuarios/:id/revogar-acesso',
    guarda: 'admin',
    descricao: 'Revoga o acesso manualmente (motivo obrigatório, auditoria).',
    params: IdParams,
    corpo: ag.RevogarAcessoEntrada,
    resposta: OkResposta,
  }),
  adminAuditoria: rota({
    metodo: 'GET',
    caminho: '/admin/auditoria',
    guarda: 'admin',
    descricao: 'Log de ações administrativas.',
    query: ag.AuditoriaQuery,
    resposta: ag.AuditoriaListaResposta,
  }),

  /* ========================================================= superadmin (D13) */
  configPublica: rota({
    metodo: 'GET',
    caminho: '/config/publica',
    guarda: 'nenhuma',
    descricao: 'Contato de suporte, modo manutenção, aviso global e aviso do edital.',
    resposta: sa.ConfigPublicaResposta,
  }),

  super2faStatus: rota({
    metodo: 'GET',
    caminho: '/super/2fa',
    guarda: 'superadmin_2fa',
    descricao: 'Estado do 2FA da conta e da sessão.',
    resposta: sa.DoisFatoresStatusResposta,
  }),
  super2faIniciar: rota({
    metodo: 'POST',
    caminho: '/super/2fa/iniciar',
    guarda: 'superadmin_2fa',
    descricao: 'Gera o segredo TOTP pendente e o QR (SVG gerado no servidor).',
    resposta: sa.DoisFatoresIniciarResposta,
    limite: { max: 10, janelaMs: 15 * MIN, por: 'usuario' },
  }),
  super2faAtivar: rota({
    metodo: 'POST',
    caminho: '/super/2fa/ativar',
    guarda: 'superadmin_2fa',
    descricao: 'Ativa o 2FA com o primeiro código e devolve os códigos de recuperação.',
    corpo: sa.DoisFatoresAtivarEntrada,
    resposta: sa.CodigosRecuperacaoResposta,
    limite: { max: 10, janelaMs: 15 * MIN, por: 'usuario' },
  }),
  super2faVerificar: rota({
    metodo: 'POST',
    caminho: '/super/2fa/verificar',
    guarda: 'superadmin_2fa',
    descricao: 'Confirma a sessão com o código TOTP ou um código de recuperação.',
    corpo: sa.DoisFatoresVerificarEntrada,
    resposta: sa.DoisFatoresStatusResposta,
    limite: { max: 10, janelaMs: 15 * MIN, por: 'usuario' },
  }),
  super2faCodigos: rota({
    metodo: 'POST',
    caminho: '/super/2fa/codigos',
    guarda: 'superadmin',
    descricao: 'Gera novos códigos de recuperação (reconfirmação).',
    corpo: sa.NovosCodigosEntrada,
    resposta: sa.CodigosRecuperacaoResposta,
    limite: LIMITE_SENSIVEL,
  }),

  superFinanceiro: rota({
    metodo: 'GET',
    caminho: '/super/financeiro',
    guarda: 'superadmin',
    descricao: 'Receita bruta e líquida, pedidos, Pix, conversão e alunos ativos.',
    query: sa.FinanceiroQuery,
    resposta: sa.FinanceiroResposta,
    limite: LIMITE_SUPER,
  }),
  superFinanceiroCsv: rota({
    metodo: 'GET',
    caminho: '/super/financeiro/csv',
    guarda: 'superadmin',
    descricao: 'Exporta a série do financeiro em CSV.',
    query: sa.FinanceiroQuery,
    resposta: sa.ArquivoCsvResposta,
    limite: LIMITE_SUPER,
  }),

  superPagamentosListar: rota({
    metodo: 'GET',
    caminho: '/super/pagamentos',
    guarda: 'superadmin',
    descricao: 'Pagamentos com busca (nome, e-mail, CPF, id Asaas) e filtros.',
    query: sa.PagamentosQuery,
    resposta: sa.PagamentosListaResposta,
    limite: LIMITE_SUPER,
  }),
  superPagamentosCsv: rota({
    metodo: 'GET',
    caminho: '/super/pagamentos/csv',
    guarda: 'superadmin',
    descricao: 'Exporta os pagamentos filtrados em CSV.',
    query: sa.PagamentosQuery,
    resposta: sa.ArquivoCsvResposta,
    limite: LIMITE_SUPER,
  }),
  superConciliarLote: rota({
    metodo: 'POST',
    caminho: '/super/pagamentos/conciliar-lote',
    guarda: 'superadmin',
    descricao: 'Concilia os pedidos Asaas do período e devolve as divergências.',
    corpo: sa.ConciliarLoteEntrada,
    resposta: sa.ConciliarLoteResposta,
    limite: { max: 10, janelaMs: 15 * MIN, por: 'usuario' },
  }),
  superPagamentoObter: rota({
    metodo: 'GET',
    caminho: '/super/pagamentos/:id',
    guarda: 'superadmin',
    descricao: 'Detalhe com a linha do tempo e os webhooks recebidos.',
    params: IdParams,
    resposta: sa.PagamentoDetalheResposta,
    limite: LIMITE_SUPER,
  }),
  superPagamentoConciliar: rota({
    metodo: 'POST',
    caminho: '/super/pagamentos/:id/conciliar',
    guarda: 'superadmin',
    descricao: 'Consulta a cobrança no Asaas e corrige o pedido.',
    params: IdParams,
    corpo: sa.ConciliarEntrada,
    resposta: sa.ConciliarResposta,
    limite: LIMITE_SUPER,
  }),
  superPagamentoReembolso: rota({
    metodo: 'POST',
    caminho: '/super/pagamentos/:id/reembolso',
    guarda: 'superadmin',
    descricao: 'Estorno total no Asaas (reconfirmação); o webhook revoga o acesso.',
    params: IdParams,
    corpo: sa.SuperReembolsoEntrada,
    resposta: ag.ReembolsoResposta,
    limite: LIMITE_SENSIVEL,
  }),
  superPagamentoCancelarPix: rota({
    metodo: 'POST',
    caminho: '/super/pagamentos/:id/cancelar',
    guarda: 'superadmin',
    descricao: 'Cancela (remove) a cobrança Pix pendente no Asaas.',
    params: IdParams,
    corpo: sa.CancelarPixEntrada,
    resposta: sa.PagamentoSuper,
    limite: LIMITE_SUPER,
  }),
  superPagamentoReenviarEmail: rota({
    metodo: 'POST',
    caminho: '/super/pagamentos/:id/reenviar-email',
    guarda: 'superadmin',
    descricao: 'Reenvia o e-mail de confirmação com o recibo.',
    params: IdParams,
    resposta: sa.ReenviarEmailResposta,
    limite: { max: 10, janelaMs: HORA, por: 'usuario' },
  }),
  superPagamentoDesfazerManual: rota({
    metodo: 'POST',
    caminho: '/super/pagamentos/:id/desfazer-manual',
    guarda: 'superadmin',
    descricao: 'Desfaz a aprovação manual (estorno manual) e revoga o acesso.',
    params: IdParams,
    corpo: sa.DesfazerManualEntrada,
    resposta: sa.PagamentoSuper,
    limite: LIMITE_SENSIVEL,
  }),
  superAprovarManual: rota({
    metodo: 'POST',
    caminho: '/super/usuarios/:id/aprovar-pagamento',
    guarda: 'superadmin',
    descricao: 'Registra um pagamento recebido por fora (R$ 397) e libera o acesso.',
    params: IdParams,
    corpo: sa.AprovarManualEntrada,
    resposta: sa.AprovarManualResposta,
    limite: LIMITE_SENSIVEL,
  }),
  superComprovanteEnviar: rota({
    metodo: 'POST',
    caminho: '/super/comprovantes',
    guarda: 'superadmin',
    descricao: 'Upload do comprovante (imagem ou PDF, multipart, campo "arquivo").',
    resposta: sa.ComprovanteResposta,
    limite: LIMITE_SENSIVEL,
  }),

  superWebhooksListar: rota({
    metodo: 'GET',
    caminho: '/super/webhooks',
    guarda: 'superadmin',
    descricao: 'Eventos de webhook recebidos, com erros.',
    query: sa.WebhooksQuery,
    resposta: sa.WebhooksListaResposta,
    limite: LIMITE_SUPER,
  }),
  superWebhooksReprocessarLote: rota({
    metodo: 'POST',
    caminho: '/super/webhooks/reprocessar-lote',
    guarda: 'superadmin',
    descricao: 'Reprocessa em massa os eventos com erro (reconfirmação).',
    corpo: sa.ReprocessarLoteEntrada,
    resposta: sa.ReprocessarLoteResposta,
    limite: LIMITE_SENSIVEL,
  }),
  superWebhookReprocessar: rota({
    metodo: 'POST',
    caminho: '/super/webhooks/:id/reprocessar',
    guarda: 'superadmin',
    descricao: 'Reprocessa um evento (idempotente).',
    params: sa.EventoParams,
    resposta: sa.ReprocessarResposta,
    limite: LIMITE_SUPER,
  }),

  superAsaasStatus: rota({
    metodo: 'GET',
    caminho: '/super/asaas',
    guarda: 'superadmin',
    descricao: 'Ambiente, chave configurada (nunca exibida) e dados da conta.',
    resposta: sa.AsaasStatusResposta,
    limite: LIMITE_SUPER,
  }),
  superAsaasTestar: rota({
    metodo: 'POST',
    caminho: '/super/asaas/testar',
    guarda: 'superadmin',
    descricao: 'Testa a conexão com o Asaas.',
    resposta: sa.AsaasTesteResposta,
    limite: { max: 20, janelaMs: 15 * MIN, por: 'usuario' },
  }),
  superAsaasSaldo: rota({
    metodo: 'GET',
    caminho: '/super/asaas/saldo',
    guarda: 'superadmin',
    descricao: 'Saldo da conta (GET /finance/balance).',
    resposta: sa.AsaasSaldoResposta,
    limite: LIMITE_SUPER,
  }),
  superAsaasExtrato: rota({
    metodo: 'GET',
    caminho: '/super/asaas/extrato',
    guarda: 'superadmin',
    descricao: 'Extrato do período, só os lançamentos das cobranças do Fuse Aprova.',
    query: sa.ExtratoQuery,
    resposta: sa.AsaasExtratoResposta,
    limite: LIMITE_SUPER,
  }),
  superAsaasEstatisticas: rota({
    metodo: 'GET',
    caminho: '/super/asaas/estatisticas',
    guarda: 'superadmin',
    descricao: 'Cobranças Pix do Fuse Aprova por status (pelos pedidos; a conta é compartilhada).',
    query: sa.PeriodoQuery,
    resposta: sa.AsaasEstatisticasResposta,
    limite: LIMITE_SUPER,
  }),
  superAsaasWebhook: rota({
    metodo: 'GET',
    caminho: '/super/asaas/webhook',
    guarda: 'superadmin',
    descricao: 'Configuração do webhook no Asaas.',
    resposta: sa.AsaasWebhookResposta,
    limite: LIMITE_SUPER,
  }),
  superAsaasWebhookSalvar: rota({
    metodo: 'PUT',
    caminho: '/super/asaas/webhook',
    guarda: 'superadmin',
    descricao: 'Cria ou atualiza o webhook do app no Asaas (URL e token do .env).',
    corpo: sa.AsaasWebhookSalvarEntrada,
    resposta: sa.AsaasWebhookResposta,
    limite: LIMITE_SENSIVEL,
  }),
  superAsaasWebhookReativar: rota({
    metodo: 'POST',
    caminho: '/super/asaas/webhook/reativar',
    guarda: 'superadmin',
    descricao: 'Reativa a fila de webhooks interrompida.',
    corpo: sa.AsaasWebhookReativarEntrada,
    resposta: sa.AsaasWebhookResposta,
    limite: LIMITE_SENSIVEL,
  }),

  superUsuariosListar: rota({
    metodo: 'GET',
    caminho: '/super/usuarios',
    guarda: 'superadmin',
    descricao: 'Usuários com busca e filtros (papel, acesso, pago, ativo, data).',
    query: sa.SuperUsuariosQuery,
    resposta: sa.SuperUsuariosListaResposta,
    limite: LIMITE_SUPER,
  }),
  superUsuariosCsv: rota({
    metodo: 'GET',
    caminho: '/super/usuarios/csv',
    guarda: 'superadmin',
    descricao: 'Exporta os usuários filtrados em CSV.',
    query: sa.SuperUsuariosQuery,
    resposta: sa.ArquivoCsvResposta,
    limite: LIMITE_SUPER,
  }),
  superUsuarioObter: rota({
    metodo: 'GET',
    caminho: '/super/usuarios/:id',
    guarda: 'superadmin',
    descricao: 'Ficha completa: dados, pedidos, progresso, sessões, push e auditoria.',
    params: IdParams,
    resposta: sa.FichaUsuarioResposta,
    limite: LIMITE_SUPER,
  }),
  superUsuarioEditar: rota({
    metodo: 'PATCH',
    caminho: '/super/usuarios/:id',
    guarda: 'superadmin',
    descricao: 'Edita nome, e-mail e celular.',
    params: IdParams,
    corpo: sa.EditarUsuarioEntrada,
    resposta: sa.FichaUsuarioResposta,
    limite: LIMITE_SUPER,
  }),
  superUsuarioForcarSenha: rota({
    metodo: 'POST',
    caminho: '/super/usuarios/:id/forcar-senha',
    guarda: 'superadmin',
    descricao: 'Envia o link de redefinição de senha.',
    params: IdParams,
    corpo: sa.ForcarSenhaEntrada,
    resposta: OkResposta,
    limite: LIMITE_SUPER,
  }),
  superUsuarioBloquear: rota({
    metodo: 'POST',
    caminho: '/super/usuarios/:id/bloquear',
    guarda: 'superadmin',
    descricao: 'Bloqueia a conta e encerra as sessões.',
    params: IdParams,
    corpo: sa.BloqueioEntrada,
    resposta: OkResposta,
    limite: LIMITE_SUPER,
  }),
  superUsuarioDesbloquear: rota({
    metodo: 'POST',
    caminho: '/super/usuarios/:id/desbloquear',
    guarda: 'superadmin',
    descricao: 'Desbloqueia a conta.',
    params: IdParams,
    corpo: sa.BloqueioEntrada,
    resposta: OkResposta,
    limite: LIMITE_SUPER,
  }),
  superUsuarioPapel: rota({
    metodo: 'POST',
    caminho: '/super/usuarios/:id/papel',
    guarda: 'superadmin',
    descricao: 'Muda o papel (sem rebaixar o último superadmin).',
    params: IdParams,
    corpo: sa.MudarPapelEntrada,
    resposta: OkResposta,
    limite: LIMITE_SENSIVEL,
  }),
  superUsuarioExportar: rota({
    metodo: 'GET',
    caminho: '/super/usuarios/:id/exportar',
    guarda: 'superadmin',
    descricao: 'LGPD: exporta os dados do usuário (JSON).',
    params: IdParams,
    resposta: sa.ExportarUsuarioResposta,
    limite: LIMITE_SUPER,
  }),
  superUsuarioAnonimizar: rota({
    metodo: 'POST',
    caminho: '/super/usuarios/:id/anonimizar',
    guarda: 'superadmin',
    descricao: 'LGPD: exclui a conta anonimizando o perfil (mantém os pedidos).',
    params: IdParams,
    corpo: sa.AnonimizarEntrada,
    resposta: OkResposta,
    limite: LIMITE_SENSIVEL,
  }),
  superUsuarioRevogarSessao: rota({
    metodo: 'DELETE',
    caminho: '/super/usuarios/:id/sessoes/:sessaoId',
    guarda: 'superadmin',
    descricao: 'Encerra uma sessão (dispositivo) do usuário.',
    params: sa.SessaoUsuarioParams,
    resposta: OkResposta,
    limite: LIMITE_SUPER,
  }),

  superEquipe: rota({
    metodo: 'GET',
    caminho: '/super/equipe',
    guarda: 'superadmin',
    descricao: 'Admins e superadmins, com o status do 2FA.',
    resposta: sa.EquipeResposta,
    limite: LIMITE_SUPER,
  }),
  superEquipeConvidar: rota({
    metodo: 'POST',
    caminho: '/super/equipe/convites',
    guarda: 'superadmin',
    descricao: 'Convida por e-mail com link para definir a senha (72 h).',
    corpo: sa.ConvidarEntrada,
    resposta: sa.ConvidarResposta,
    limite: LIMITE_SENSIVEL,
  }),

  superComunicacaoPrevia: rota({
    metodo: 'POST',
    caminho: '/super/comunicacoes/previa',
    guarda: 'superadmin',
    descricao: 'Prévia: destinatários com opt-in e o e-mail renderizado.',
    corpo: sa.ComunicacaoPreviaEntrada,
    resposta: sa.ComunicacaoPreviaResposta,
    limite: LIMITE_SUPER,
  }),
  superComunicacaoCriar: rota({
    metodo: 'POST',
    caminho: '/super/comunicacoes',
    guarda: 'superadmin',
    descricao: 'Põe a comunicação na fila do worker.',
    corpo: sa.ComunicacaoCriarEntrada,
    resposta: sa.ComunicacaoSuper,
    limite: { max: 10, janelaMs: HORA, por: 'usuario' },
  }),
  superComunicacoesListar: rota({
    metodo: 'GET',
    caminho: '/super/comunicacoes',
    guarda: 'superadmin',
    descricao: 'Histórico de comunicações.',
    query: sa.ComunicacoesQuery,
    resposta: sa.ComunicacoesListaResposta,
    limite: LIMITE_SUPER,
  }),
  superComunicacaoCancelar: rota({
    metodo: 'POST',
    caminho: '/super/comunicacoes/:id/cancelar',
    guarda: 'superadmin',
    descricao: 'Cancela os envios que ainda estão na fila.',
    params: IdParams,
    resposta: sa.ComunicacaoSuper,
    limite: LIMITE_SUPER,
  }),

  superSistema: rota({
    metodo: 'GET',
    caminho: '/super/sistema',
    guarda: 'superadmin',
    descricao: 'Saúde da API, do banco, do worker, backup, versão e SMTP.',
    resposta: sa.SistemaResposta,
    limite: LIMITE_SUPER,
  }),
  superConfiguracoes: rota({
    metodo: 'GET',
    caminho: '/super/configuracoes',
    guarda: 'superadmin',
    descricao: 'Configurações do produto (não são segredo).',
    resposta: sa.ConfiguracoesResposta,
    limite: LIMITE_SUPER,
  }),
  superConfiguracoesSalvar: rota({
    metodo: 'PUT',
    caminho: '/super/configuracoes',
    guarda: 'superadmin',
    descricao: 'Salva suporte, manutenção, aviso global e aviso do edital (reconfirmação).',
    corpo: sa.ConfiguracoesSalvarEntrada,
    resposta: sa.ConfiguracoesResposta,
    limite: LIMITE_SENSIVEL,
  }),
  superAuditoria: rota({
    metodo: 'GET',
    caminho: '/super/auditoria',
    guarda: 'superadmin',
    descricao: 'Auditoria completa (quem, o quê, antes, depois, IP e motivo).',
    query: sa.SuperAuditoriaQuery,
    resposta: sa.SuperAuditoriaListaResposta,
    limite: LIMITE_SUPER,
  }),
} as const satisfies Record<string, DefinicaoRota>;

export type NomeRota = keyof typeof ROTAS;

/** Tipo da resposta de uma rota. */
export type RespostaDe<N extends NomeRota> = (typeof ROTAS)[N]['resposta'] extends z.ZodTypeAny
  ? z.infer<(typeof ROTAS)[N]['resposta']>
  : void;

/** Tipo do corpo (entrada, antes das transformações) de uma rota. */
export type CorpoDe<N extends NomeRota> = (typeof ROTAS)[N] extends { corpo: z.ZodTypeAny }
  ? z.input<(typeof ROTAS)[N]['corpo']>
  : never;

/** Tipo da query (entrada) de uma rota. */
export type QueryDe<N extends NomeRota> = (typeof ROTAS)[N] extends { query: z.ZodTypeAny }
  ? z.input<(typeof ROTAS)[N]['query']>
  : never;

/** Substitui os parâmetros do caminho: ('/simulados/:id', {id}) → '/simulados/abc'. */
export function montarCaminho(caminho: string, params: Record<string, string> = {}): string {
  return caminho.replace(/:([A-Za-z]+)/g, (_, nome: string) => {
    const v = params[nome];
    if (v === undefined) throw new Error(`Parâmetro ausente: ${nome}`);
    return encodeURIComponent(v);
  });
}

/** Rotas que exigem pagamento confirmado (`exigirAcesso`). */
export function rotasComGuarda(guarda: Guarda): NomeRota[] {
  return (Object.keys(ROTAS) as NomeRota[]).filter((n) => ROTAS[n].guarda === guarda);
}
