/**
 * API simulada em memória para `pnpm --filter @fuse/web dev:mock` e para as capturas de tela.
 * Implementa as rotas do aluno seguindo os contratos de `ROTAS` (@fuse/shared/api): valida o
 * corpo com o schema da rota e confere a RESPOSTA com o schema de resposta (um desvio de
 * contrato vira erro 500 no console). Não é usada em produção.
 *
 * Cenários: GET /api/__mock/cenario?nome=novo|semAcesso|onboarding|aluno|revisaoVazia|ligaInicial|ligaResultado|edital|semVidas
 * Pagamento: POST /api/__mock/pagar confirma o Pix pendente (simula o webhook do Asaas).
 */
import {
  AREAS_CARGO,
  AVISO_EDITAL,
  calcularCombo,
  cifrarTexto,
  comboVisivel,
  CONQUISTAS,
  corDoAvatar,
  diaSP,
  diasParaFimDaSemana,
  fimSemanaSP,
  fraseOfensiva,
  gerarChaveOffline,
  iniciais,
  NOMES_AREA,
  NOMES_DIVISAO,
  nomeComSobrenomeAbreviado,
  ocultarCpf,
  segundaDaSemana,
  somarDias,
  textoFaltamParaBau,
  textoRegraLiga,
  textoStatusEdital,
  tituloAcerto,
  tituloErro,
  xpDaSessao,
  type AreaCargo,
  type Divisao,
  type Letra,
  type SlugDisciplina,
} from '@fuse/shared';
import {
  erroApi,
  ROTAS,
  seloSimulado,
  type CodigoErro,
  type NomeRota,
  type QuestaoParaAluno,
} from '@fuse/shared/api';
import {
  DISCIPLINAS,
  NOMES_LIGA,
  QUESTOES,
  UNIDADES,
  questaoPorId,
  questoesDoAssunto,
  type LicaoMock,
  type QuestaoMock,
} from './dados';
import { pngQrFalso } from './png';

/* ------------------------------------------------------------- tipos mínimos */

interface Req extends AsyncIterable<Uint8Array> {
  url?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}
interface Res {
  statusCode: number;
  setHeader(nome: string, valor: string | string[]): void;
  end(corpo?: string): void;
}

class Falha extends Error {
  constructor(
    readonly status: number,
    readonly codigo: CodigoErro,
    mensagem?: string,
    readonly campos?: Record<string, string>,
  ) {
    super(mensagem);
  }
}

const ID_USUARIO = '00000000-0000-4000-8000-00000000a001';
const COOKIE = 'fuse_sessao';
const TOKEN = 'sessao-mock';

/* -------------------------------------------------------------------- estado */

interface SessaoEstudo {
  id: string;
  tipo: 'licao' | 'revisao' | 'desafio';
  licaoId: string | null;
  questoes: QuestaoMock[];
  respostas: { questaoId: string; acertou: boolean; tempoMs: number }[];
  iniciadaEm: Date;
  concluida: boolean;
}
interface SimuladoMock {
  id: string;
  cargo: { id: string; nome: string };
  iniciadoEm: Date;
  terminaEm: Date;
  itens: { numero: number; bloco: SlugDisciplina; q: QuestaoMock; id: string }[];
  respostas: Record<string, { letra: Letra | null; revisarDepois: boolean }>;
  entregue: null | { em: Date; automatica: boolean };
}

function novoEstado() {
  return {
    /** D21: concursos que o aluno acompanha ({ id, acesso }) e qual está ativo. */
    // (o id é o de CONCURSO_ID, declarado mais abaixo: novoEstado() roda antes dele existir)
    seguidos: [{ id: '00000000-0000-4000-8000-0000000c0001', acesso: false }] as {
      id: string;
      acesso: boolean;
    }[],
    ativoId: '00000000-0000-4000-8000-0000000c0001',
    logado: false,
    usuario: {
      nome: 'Marina Souza',
      email: 'marina@email.com',
      cpf: '52998224725',
      celular: '41987654321',
      papel: 'aluno' as 'aluno' | 'admin',
      acesso: false,
      cargoId: null as string | null,
      metaDiaria: 2 as 1 | 2 | 3,
      lembreteHora: '19:00' as string | null,
      notificacoes: false,
      apelidoLiga: null as string | null,
      sons: true,
      xpTotal: 0,
      gemas: 40,
      vidas: 5,
      proximaVidaEm: null as string | null,
      ofensiva: 0,
      ofensivaRecorde: 0,
      protetores: 0,
      divisao: 'bronze' as Divisao,
      onboardingConcluido: false,
      confirmarCargoEdital: false,
      criadoEm: new Date('2026-10-01T12:00:00-03:00'),
    },
    pedido: null as null | {
      id: string;
      concursoId: string;
      criadoEm: Date;
      expiraEm: Date;
      status: 'pendente' | 'pago' | 'vencido';
      cupom?: string | null;
    },
    progresso: new Map<string, number>(),
    bausAbertos: new Set<string>(),
    coroadas: new Set<string>(),
    revisoes: new Map<string, Date>(),
    sessoes: new Map<string, SessaoEstudo>(),
    simulados: new Map<string, SimuladoMock>(),
    historico: [] as {
      id: string;
      cargo: { id: string; nome: string };
      iniciadoEm: string;
      entregueEm: string;
      pontos: number;
      percentual: number;
      aprovado: boolean;
      acertos: number;
      totalQuestoes: number;
      tempoGastoMs: number;
    }[],
    ofensivaHoje: false,
    licoesHoje: 0,
    questoesFeitas: 0,
    acertosTotal: 0,
    xpSemana: 0,
    conquistas: new Set<string>(),
    participandoLiga: false,
    resultadoLiga: null as null | {
      resultado: 'subiu' | 'ficou' | 'desceu';
      posicao: number;
      de: Divisao;
      para: Divisao;
      gemas: number;
    },
    modoEdital: false,
    versaoConteudo: 1,
    tentativasSync: new Set<string>(),
  };
}
type Estado = ReturnType<typeof novoEstado>;
let estado: Estado = novoEstado();

/* ---------------------------------------------------------------- concurso */

const EXEMPLOS: Record<AreaCargo, string[]> = {
  administrativo: ['Agente Administrativo', 'Auxiliar Administrativo', 'Recepcionista'],
  saude_medio: ['Técnico de Enfermagem', 'Agente Comunitário de Saúde'],
  saude_superior: ['Enfermeiro', 'Farmacêutico', 'Psicólogo'],
  educacao: ['Professor', 'Educador Infantil'],
  operacional: ['Motorista', 'Operador de Máquinas'],
  servicos_gerais: ['Auxiliar de Serviços Gerais', 'Merendeira'],
  social_juridico: ['Assistente Social', 'Advogado', 'Contador'],
};
const DIST = { portugues: 5, matematica: 5, gerais: 5, especificos: 25 };
const CARGOS = AREAS_CARGO.map((area, i) => ({
  id: `00000000-0000-4000-8000-0000000c00${String(i + 10)}`,
  nome: EXEMPLOS[area][0]!,
  area,
  escolaridade: null,
  vagas: null,
  generico: true,
  distribuicao: DIST,
}));
const CARGOS_EDITAL = [
  {
    id: '00000000-0000-4000-8000-0000000e0001',
    nome: 'Agente Administrativo',
    area: 'administrativo' as const,
    escolaridade: 'medio' as const,
    vagas: 4,
    generico: false,
    distribuicao: DIST,
  },
  {
    id: '00000000-0000-4000-8000-0000000e0002',
    nome: 'Técnico de Enfermagem',
    area: 'saude_medio' as const,
    escolaridade: 'tecnico' as const,
    vagas: 3,
    generico: false,
    distribuicao: DIST,
  },
  {
    id: '00000000-0000-4000-8000-0000000e0003',
    nome: 'Motorista',
    area: 'operacional' as const,
    escolaridade: 'fundamental' as const,
    vagas: 2,
    generico: false,
    distribuicao: DIST,
  },
];
const CONCURSO_ID = '00000000-0000-4000-8000-0000000c0001';
/** 2º concurso do mock (D21): aparece em "outros concursos" com o preço de adicional. */
const CONCURSO2_ID = '00000000-0000-4000-8000-0000000c0002';
const PRECO_CHEIO = 39700;
const PRECO_ADICIONAL = 19700;
/** D23: cupons do mock (percentual de desconto). */
const CUPONS_MOCK: Record<string, number> = { PALMITAL10: 10 };

function cupomMock(codigo: string | undefined): string | null {
  if (!codigo) return null;
  const c = codigo.replace(/\s+/g, '').toUpperCase();
  if (!(c in CUPONS_MOCK)) {
    throw new Falha(400, 'validacao', 'Cupom não encontrado ou desativado.', { cupom: 'Cupom não encontrado ou desativado.' });
  }
  return c;
}
function cargosAtivos() {
  return estado.modoEdital ? [...CARGOS, ...CARGOS_EDITAL] : CARGOS;
}
function cargoAtual() {
  return cargosAtivos().find((c) => c.id === estado.usuario.cargoId) ?? null;
}
const DATA_PROVA = '2027-03-14';

/* ----------------------------------------------------------------- helpers */

const agora = () => new Date();
const hoje = () => diaSP(agora());
const uuid = () => crypto.randomUUID();

function paraAluno(q: QuestaoMock, revisao = false, id = q.id): QuestaoParaAluno {
  const d = DISCIPLINAS[q.disciplina];
  return {
    id,
    origem: 'autoral',
    chipOrigem: 'Questão Fuse Aprova · estilo FAU',
    provaOrigem: null,
    disciplina: d,
    assunto: { id: q.assuntoId, nome: q.assunto },
    dificuldade: 2,
    textoApoio: q.textoApoio,
    enunciado: q.enunciado,
    alternativas: q.alternativas.map((texto, i) => ({ letra: 'ABCDE'[i] as Letra, texto })),
    temDica: true,
    revisao,
  };
}

function todasLicoes() {
  const lista: {
    u: (typeof UNIDADES)[number];
    s: (typeof UNIDADES)[number]['secoes'][number];
    l: LicaoMock;
  }[] = [];
  for (const u of UNIDADES)
    for (const s of u.secoes) for (const l of s.licoes) lista.push({ u, s, l });
  return lista;
}

function concluida(l: LicaoMock): boolean {
  return l.tipo === 'bau' ? estado.bausAbertos.has(l.id) : (estado.progresso.get(l.id) ?? 0) > 0;
}

/** Índice da lição atual (primeira não concluída que não seja baú já liberado). */
function indiceAtual(): number {
  const todas = todasLicoes();
  return todas.findIndex((x) => !concluida(x.l));
}

function pendentesRevisao(): string[] {
  const t = agora().getTime();
  return [...estado.revisoes.entries()].filter(([, v]) => v.getTime() <= t).map(([k]) => k);
}

function metaHoje() {
  const u = estado.usuario;
  return {
    feitas: estado.licoesHoje,
    meta: u.metaDiaria,
    cumprida: estado.licoesHoje >= u.metaDiaria,
  };
}

function semanaOfensiva() {
  const seg = segundaDaSemana(hoje());
  const h = hoje();
  return Array.from({ length: 7 }, (_, i) => {
    const dia = somarDias(seg, i);
    const passado = dia < h;
    const cumprido =
      dia === h
        ? estado.ofensivaHoje
        : passado &&
          estado.usuario.ofensiva > 0 &&
          i >= 0 &&
          dia >= somarDias(h, -(estado.usuario.ofensiva - (estado.ofensivaHoje ? 1 : 0)));
    return { dia, cumprido, hoje: dia === h };
  });
}

function me() {
  const u = estado.usuario;
  const cg = cargoAtual();
  return {
    xpTotal: u.xpTotal,
    gemas: u.gemas,
    vidas: u.vidas,
    proximaVidaEm:
      u.vidas < 5
        ? (u.proximaVidaEm ??
          new Date(agora().getTime() + 3 * 3600_000 + 20 * 60_000).toISOString())
        : null,
    ofensiva: u.ofensiva,
    protetores: u.protetores,
    revisoesPendentes: pendentesRevisao().length,
    id: ID_USUARIO,
    nome: u.nome,
    nomeExibicao: nomeComSobrenomeAbreviado(u.nome),
    email: u.email,
    cpfOculto: ocultarCpf(u.cpf),
    celular: u.celular,
    papel: u.papel,
    acesso: u.acesso,
    avatar: { iniciais: iniciais(u.nome), cor: corDoAvatar(ID_USUARIO) },
    concurso: {
      id: CONCURSO_ID,
      nome: 'Prefeitura Municipal de Palmital-PR 2026/27',
      sigla: 'PAL · FAU',
      status: estado.modoEdital ? ('edital_publicado' as const) : ('aguardando_edital' as const),
      dataProva: estado.modoEdital ? DATA_PROVA : null,
    },
    cargo: cg ? { id: cg.id, nome: cg.nome, area: cg.area, generico: cg.generico } : null,
    area: cg?.area ?? null,
    metaDiaria: u.metaDiaria,
    lembreteHora: u.lembreteHora,
    notificacoes: u.notificacoes,
    apelidoLiga: u.apelidoLiga,
    sons: u.sons,
    vidasMax: 5,
    ofensivaRecorde: Math.max(u.ofensivaRecorde, u.ofensiva),
    ofensivaHojeContou: estado.ofensivaHoje,
    divisao: u.divisao,
    metaHoje: metaHoje(),
    onboardingConcluido: u.onboardingConcluido,
    confirmarCargoEdital: u.confirmarCargoEdital,
    resultadoLigaPendente: !!estado.resultadoLiga,
    versaoConteudo: estado.versaoConteudo,
    criadoEm: u.criadoEm.toISOString(),
  };
}

function sessaoResposta() {
  const u = estado.usuario;
  return {
    usuario: { id: ID_USUARIO, nome: u.nome, email: u.email, papel: u.papel, acesso: u.acesso },
    area: u.papel === 'admin' ? ('conteudo' as const) : ('aluno' as const),
    proximo:
      u.papel === 'admin'
        ? ('conteudo' as const)
        : !u.acesso
          ? ('pagamento' as const)
          : !u.onboardingConcluido
            ? ('onboarding' as const)
            : ('trilha' as const),
  };
}

/* ---------------------------------------------------------------- cenários */

function concluirAte(n: number) {
  const todas = todasLicoes();
  for (let i = 0; i < n && i < todas.length; i++) {
    const { l } = todas[i]!;
    if (l.tipo === 'bau') estado.bausAbertos.add(l.id);
    else estado.progresso.set(l.id, 1);
  }
}

function aplicarCenario(nome: string) {
  estado = novoEstado();
  const u = estado.usuario;
  if (nome === 'novo') return;
  estado.logado = true;
  if (nome === 'semAcesso') return;
  u.acesso = true;
  estado.seguidos[0]!.acesso = true;
  if (nome === 'onboarding') return;
  u.onboardingConcluido = true;
  u.cargoId = CARGOS[0]!.id;
  u.xpTotal = 1240;
  u.gemas = 340;
  u.vidas = nome === 'semVidas' ? 0 : 5;
  u.ofensiva = 8;
  u.ofensivaRecorde = 12;
  u.protetores = 1;
  estado.licoesHoje = 1;
  estado.ofensivaHoje = false;
  estado.questoesFeitas = 186;
  estado.acertosTotal = 138;
  estado.xpSemana = 1040;
  estado.participandoLiga = nome !== 'ligaInicial';
  estado.conquistas = new Set([
    'primeira_licao',
    'ofensiva_7',
    'questoes_100',
    'primeiro_simulado',
    'simulado_aprovado',
  ]);
  concluirAte(2);
  estado.progresso.set(todasLicoes()[2]!.l.id, 0);
  if (nome !== 'revisaoVazia') {
    const ontem = new Date(agora().getTime() - 3600_000);
    for (const q of QUESTOES.slice(0, 12)) estado.revisoes.set(q.id, ontem);
  }
  if (nome === 'ligaResultado')
    estado.resultadoLiga = {
      resultado: 'subiu',
      posicao: 2,
      de: 'bronze',
      para: 'prata',
      gemas: 50,
    };
  if (nome === 'ligaResultado') u.divisao = 'prata';
  if (nome === 'edital') {
    estado.modoEdital = true;
    u.confirmarCargoEdital = true;
    estado.versaoConteudo = 2;
  }
  const base = new Date('2026-10-20T19:00:00-03:00');
  estado.historico = [
    {
      id: '00000000-0000-4000-8000-00000005e003',
      cargo: { id: CARGOS[0]!.id, nome: CARGOS[0]!.nome },
      iniciadoEm: base.toISOString(),
      entregueEm: new Date(base.getTime() + 3 * 3600_000 + 12 * 60_000).toISOString(),
      pontos: 72.4,
      percentual: 72,
      aprovado: true,
      acertos: 29,
      totalQuestoes: 40,
      tempoGastoMs: (3 * 60 + 12) * 60_000,
    },
    {
      id: '00000000-0000-4000-8000-00000005e002',
      cargo: { id: CARGOS[0]!.id, nome: CARGOS[0]!.nome },
      iniciadoEm: new Date(base.getTime() - 7 * 86400_000).toISOString(),
      entregueEm: new Date(
        base.getTime() - 7 * 86400_000 + 3 * 3600_000 + 40 * 60_000,
      ).toISOString(),
      pontos: 61.2,
      percentual: 61,
      aprovado: true,
      acertos: 25,
      totalQuestoes: 40,
      tempoGastoMs: (3 * 60 + 40) * 60_000,
    },
    {
      id: '00000000-0000-4000-8000-00000005e001',
      cargo: { id: CARGOS[0]!.id, nome: CARGOS[0]!.nome },
      iniciadoEm: new Date(base.getTime() - 14 * 86400_000).toISOString(),
      entregueEm: new Date(
        base.getTime() - 14 * 86400_000 + 3 * 3600_000 + 58 * 60_000,
      ).toISOString(),
      pontos: 44.4,
      percentual: 44,
      aprovado: false,
      acertos: 18,
      totalQuestoes: 40,
      tempoGastoMs: (3 * 60 + 58) * 60_000,
    },
  ];
}

/* ------------------------------------------------------------------ rotas */

type Ctx = { params: Record<string, string>; corpo: unknown; query: URLSearchParams };
type Handler = (c: Ctx) => unknown | Promise<unknown>;

function iniciarSessaoEstudo(
  tipo: SessaoEstudo['tipo'],
  licaoId: string | null,
  questoes: QuestaoMock[],
  dica: { titulo: string; texto: string; exemplo: string } | null,
  titulo: string | null,
  tamanho: number,
) {
  const s: SessaoEstudo = {
    id: uuid(),
    tipo,
    licaoId,
    questoes,
    respostas: [],
    iniciadaEm: agora(),
    concluida: false,
  };
  estado.sessoes.set(s.id, s);
  const pend = new Set(pendentesRevisao());
  return {
    sessaoId: s.id,
    tipo,
    licao: licaoId
      ? {
          id: licaoId,
          titulo: titulo ?? '',
          tipo: tipo === 'desafio' ? ('desafio' as const) : ('normal' as const),
          tamanho,
        }
      : null,
    dica,
    questoes: questoes.map((q) => paraAluno(q, tipo !== 'revisao' && pend.has(q.id))),
    gastaVidas: tipo === 'licao',
    vidas: estado.usuario.vidas,
    proximaVidaEm: me().proximaVidaEm,
    gemas: estado.usuario.gemas,
    iniciadaEm: s.iniciadaEm.toISOString(),
  };
}

function questoesDaLicao(assuntoId: string, n: number, offset: number): QuestaoMock[] {
  const pool = questoesDoAssunto(assuntoId);
  const extra = QUESTOES.filter(
    (q) => q.assuntoId !== assuntoId && q.disciplina === pool[0]?.disciplina,
  );
  const base = [...pool, ...extra, ...QUESTOES];
  const vistos = new Set<string>();
  const out: QuestaoMock[] = [];
  for (let i = 0; out.length < n && i < base.length * 2; i++) {
    const q = base[(i + offset) % base.length]!;
    if (!vistos.has(q.id)) {
      vistos.add(q.id);
      out.push(q);
    }
  }
  return out;
}

const H: Partial<Record<NomeRota, Handler>> = {
  authCadastro: ({ corpo }) => {
    const c = corpo as { nome: string; email: string; cpf: string; celular: string };
    if (c.email === 'existe@email.com') throw new Falha(409, 'conta_existente');
    estado = novoEstado();
    estado.logado = true;
    Object.assign(estado.usuario, { nome: c.nome, email: c.email, cpf: c.cpf, celular: c.celular });
    return sessaoResposta();
  },
  authLogin: ({ corpo }) => {
    const c = corpo as { email: string; senha: string };
    if (c.senha === 'errada123') throw new Falha(401, 'credenciais_invalidas');
    if (!estado.usuario.acesso && !estado.logado) aplicarCenario('aluno');
    estado.logado = true;
    return sessaoResposta();
  },
  // D24: o portal do conteúdo (mock): entra como admin. O mock não simula o superadmin.
  authLoginConteudo: ({ corpo }) => {
    const c = corpo as { email: string; senha: string };
    if (c.senha === 'errada123') throw new Falha(401, 'credenciais_invalidas');
    estado.logado = true;
    estado.usuario.papel = 'admin';
    return sessaoResposta();
  },
  authSair: () => {
    estado.logado = false;
    return { ok: true };
  },
  authRecuperar: () => ({
    ok: true,
    mensagem:
      'Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora.',
  }),
  authRedefinir: ({ corpo }) => {
    if ((corpo as { token: string }).token.startsWith('expirado'))
      throw new Falha(400, 'token_invalido');
    estado.logado = true;
    return sessaoResposta();
  },
  meObter: () => me(),
  meAtualizar: ({ corpo }) => {
    const c = corpo as Partial<{
      cargoId: string;
      metaDiaria: 1 | 2 | 3;
      lembreteHora: string | null;
      notificacoes: boolean;
      apelidoLiga: string | null;
      sons: boolean;
      onboardingConcluido: true;
    }>;
    const u = estado.usuario;
    if (c.cargoId) {
      if (!cargosAtivos().some((x) => x.id === c.cargoId))
        throw new Falha(404, 'nao_encontrado', 'Cargo não encontrado.');
      u.cargoId = c.cargoId;
      if (estado.modoEdital && CARGOS_EDITAL.some((x) => x.id === c.cargoId))
        u.confirmarCargoEdital = false;
    }
    if (c.metaDiaria) u.metaDiaria = c.metaDiaria;
    if (c.lembreteHora !== undefined) u.lembreteHora = c.lembreteHora;
    if (c.notificacoes !== undefined) u.notificacoes = c.notificacoes;
    if (c.apelidoLiga !== undefined) u.apelidoLiga = c.apelidoLiga;
    if (c.sons !== undefined) u.sons = c.sons;
    if (c.onboardingConcluido) u.onboardingConcluido = true;
    return me();
  },
  meSenha: ({ corpo }) => {
    if ((corpo as { senhaAtual: string }).senhaAtual === 'errada123')
      throw new Falha(400, 'validacao', 'A senha atual não confere.', {
        senhaAtual: 'A senha atual não confere.',
      });
    return { ok: true };
  },
  meExportar: () => ({
    geradoEm: agora().toISOString(),
    perfil: {
      nome: estado.usuario.nome,
      email: estado.usuario.email,
      cpf: ocultarCpf(estado.usuario.cpf),
    },
    pedidos: estado.pedido ? [{ id: estado.pedido.id, status: estado.pedido.status }] : [],
    tentativas: [],
    sessoesEstudo: [],
    simulados: estado.historico,
    conquistas: [...estado.conquistas].map((codigo) => ({ codigo })),
    revisoes: [...estado.revisoes.keys()].map((questaoId) => ({ questaoId })),
  }),
  meExcluir: () => {
    estado = novoEstado();
    return { ok: true };
  },
  meComprarProtetor: () => {
    const u = estado.usuario;
    if (u.protetores >= 2) throw new Falha(409, 'limite_protetores');
    if (u.gemas < 200) throw new Falha(409, 'gemas_insuficientes');
    u.gemas -= 200;
    u.protetores += 1;
    return { gemas: u.gemas, protetores: u.protetores };
  },

  meusConcursos: () => meusConcursos(),
  meuConcursoSeguir: ({ corpo }) => {
    const c = corpo as { concursoId: string };
    if (!CONCURSOS_MOCK.some((x) => x.id === c.concursoId)) throw new Falha(404, 'nao_encontrado');
    if (!estado.seguidos.some((x) => x.id === c.concursoId)) {
      estado.seguidos.push({ id: c.concursoId, acesso: false });
    }
    const linha = estado.seguidos.find((x) => x.id === c.concursoId)!;
    if (!estado.usuario.acesso || linha.acesso) estado.ativoId = c.concursoId;
    return meusConcursos();
  },
  meuConcursoAtivar: ({ params }) => {
    const linha = estado.seguidos.find((x) => x.id === params.id);
    if (!linha) throw new Falha(404, 'nao_encontrado');
    if (!linha.acesso) throw new Falha(402, 'sem_acesso');
    estado.ativoId = linha.id;
    return meusConcursos();
  },
  meuConcursoDeixar: ({ params }) => {
    const linha = estado.seguidos.find((x) => x.id === params.id);
    if (!linha) throw new Falha(404, 'nao_encontrado');
    if (linha.acesso) throw new Falha(409, 'conflito');
    estado.seguidos = estado.seguidos.filter((x) => x.id !== params.id);
    if (estado.ativoId === params.id)
      estado.ativoId = estado.seguidos.find((x) => x.acesso)?.id ?? CONCURSO_ID;
    return meusConcursos();
  },
  concursoPorId: ({ params }) => {
    const c = CONCURSOS_MOCK.find((x) => x.id === params.id);
    if (!c) throw new Falha(404, 'nao_encontrado');
    return {
      ...(H.concurso!({ params: {}, corpo: undefined, query: new URLSearchParams() }) as object),
      ...c,
      id: c.id,
    };
  },

  pagamentoPix: ({ corpo }) => {
    const c = corpo as { concursoId?: string; cupom?: string } | undefined;
    const alvo = c?.concursoId ?? estado.ativoId;
    const cupom = cupomMock(c?.cupom);
    const p = estado.pedido;
    if (p && p.status === 'pendente' && p.expiraEm.getTime() > Date.now() && p.concursoId === alvo && (p.cupom ?? null) === cupom)
      return pix();
    estado.pedido = {
      id: uuid(),
      concursoId: alvo,
      criadoEm: agora(),
      expiraEm: new Date(Date.now() + 30 * 60_000),
      status: 'pendente',
      cupom,
    };
    return pix();
  },
  pagamentoCupom: ({ corpo }) => {
    const c = corpo as { codigo: string };
    const codigo = cupomMock(c.codigo)!;
    const original = PRECO_CHEIO;
    const valor = Math.round((original * (100 - CUPONS_MOCK[codigo]!)) / 100);
    return { codigo, descricao: `${CUPONS_MOCK[codigo]}% de desconto`, valorCentavos: valor, valorOriginalCentavos: original, descontoCentavos: original - valor };
  },
  configPublica: () => ({
    suporte: { whatsapp: '5542999999999', email: 'suporte@fuseaprova.com.br' },
    manutencao: { ativa: false, mensagem: '' },
    aviso: null,
    avisoEdital: AVISO_EDITAL,
    precoCentavos: PRECO_CHEIO,
    precoAdicionalCentavos: PRECO_ADICIONAL,
    precoDeCentavos: null,
  }),
  pagamentoStatus: () => {
    const p = estado.pedido;
    return {
      status: p ? p.status : ('nenhum' as const),
      acesso: estado.usuario.acesso,
      concursoId: p?.concursoId ?? estado.ativoId,
      pedidoId: p?.id ?? null,
      expiraEm: p?.expiraEm.toISOString() ?? null,
      pagoEm: p?.status === 'pago' ? agora().toISOString() : null,
      expirado: !!p && p.status === 'pendente' && p.expiraEm.getTime() <= Date.now(),
    };
  },

  concurso: () => {
    const c = cargosAtivos();
    return {
      id: CONCURSO_ID,
      nome: 'Prefeitura Municipal de Palmital-PR 2026/27',
      sigla: 'PAL · FAU',
      banca: 'FAU-Unicentro',
      orgao: 'Prefeitura Municipal de Palmital',
      municipio: 'Palmital',
      uf: 'PR',
      ano: 2026,
      status: estado.modoEdital ? 'edital_publicado' : 'aguardando_edital',
      statusTexto: estado.modoEdital ? 'Edital publicado' : 'Edital em elaboração pela FAU',
      dataProva: estado.modoEdital ? DATA_PROVA : null,
      diasParaProva: estado.modoEdital ? 142 : null,
      links: [
        {
          titulo: 'Portal de concursos da Prefeitura de Palmital',
          url: 'https://palmital.pr.gov.br/portal/portal-concursos.php?pesquisar=1',
        },
        { titulo: 'FAU-Unicentro: concursos', url: 'https://www.concursosfau.com.br/novo/' },
      ],
      modoEdital: estado.modoEdital,
      cargos: c,
      areas: AREAS_CARGO.map((area) => ({
        area,
        nome: NOMES_AREA[area],
        exemplos: EXEMPLOS[area],
      })),
      avisoEdital: AVISO_EDITAL,
    };
  },
  trilha: () => {
    const todas = todasLicoes();
    const iAtual = indiceAtual();
    let numeroUnidade = 0;
    const unidades = UNIDADES.map((u) => {
      numeroUnidade += 1;
      return {
        id: u.id,
        numero: numeroUnidade,
        ordem: numeroUnidade,
        titulo: u.titulo,
        area: (u.area as AreaCargo | null) ?? null,
        disciplina: DISCIPLINAS[u.disciplina],
        coroada: estado.coroadas.has(u.id),
        secoes: u.secoes.map((s) => ({
          id: s.id,
          ordem: s.ordem,
          titulo: s.titulo,
          assuntoId: s.assunto.id,
          noEdital: estado.modoEdital ? true : null,
          licoes: s.licoes.map((l) => {
            const i = todas.findIndex((x) => x.l.id === l.id);
            const feito = concluida(l);
            const estadoNo = feito
              ? ('concluida' as const)
              : i === iAtual
                ? ('atual' as const)
                : ('bloqueada' as const);
            const vezes = estado.progresso.get(l.id) ?? 0;
            return {
              id: l.id,
              ordem: l.ordem,
              tipo: l.tipo,
              tamanho: l.tamanho,
              titulo: l.titulo,
              estado: estadoNo,
              vezes,
              anel: Math.min(3, vezes) / 3,
              podeAbrir: estadoNo !== 'bloqueada',
              melhorPrecisao: feito && l.tipo !== 'bau' ? 80 : null,
            };
          }),
        })),
      };
    });
    const atual = iAtual >= 0 ? todas[iAtual]! : null;
    const ateBau = atual
      ? (() => {
          const lic = atual.s.licoes;
          const bau = lic.find((l) => l.tipo === 'bau' && !concluida(l));
          return bau ? lic.filter((l) => l.tipo === 'normal' && !concluida(l)).length : null;
        })()
      : null;
    const pend = pendentesRevisao().length;
    return {
      area: cargoAtual()?.area ?? null,
      unidades,
      atual: atual ? { unidadeId: atual.u.id, secaoId: atual.s.id, licaoId: atual.l.id } : null,
      fraseCapi: ateBau
        ? textoFaltamParaBau(ateBau)
        : pend > 0
          ? `Você tem ${pend} questões para revisar. Bora?`
          : 'Bora para a próxima?',
      licoesAteBau: ateBau,
      versaoConteudo: estado.versaoConteudo,
    };
  },
  guia: ({ params }) => {
    const u = UNIDADES.find((x) => x.id === params.unidadeId);
    if (!u) throw new Falha(404, 'nao_encontrado');
    return {
      unidade: { id: u.id, titulo: u.titulo, disciplina: DISCIPLINAS[u.disciplina] },
      secoes: u.secoes.map((s) => ({
        id: s.id,
        titulo: s.titulo,
        noEdital: estado.modoEdital ? true : null,
        naTrilha: true,
        dicas: [{ ...s.assunto.dica, licaoId: s.licoes[0]!.id }],
      })),
    };
  },
  licaoIniciar: ({ params }) => {
    const achado = todasLicoes().find((x) => x.l.id === params.id);
    if (!achado) throw new Falha(404, 'nao_encontrado');
    const iAtual = indiceAtual();
    const idx = todasLicoes().findIndex((x) => x.l.id === achado.l.id);
    if (!concluida(achado.l) && idx !== iAtual) throw new Falha(409, 'licao_bloqueada');
    if (achado.l.tipo === 'bau') throw new Falha(409, 'conflito', 'Use abrir-bau.');
    const tipo = achado.l.tipo === 'desafio' ? 'desafio' : 'licao';
    const qs = questoesDaLicao(achado.s.assunto.id, achado.l.tamanho, achado.l.ordem);
    return iniciarSessaoEstudo(
      tipo,
      achado.l.id,
      qs,
      tipo === 'desafio' ? null : achado.s.assunto.dica,
      achado.l.titulo,
      achado.l.tamanho,
    );
  },
  licaoAbrirBau: ({ params }) => {
    const achado = todasLicoes().find((x) => x.l.id === params.id && x.l.tipo === 'bau');
    if (!achado || concluida(achado.l)) throw new Falha(409, 'conflito');
    estado.bausAbertos.add(achado.l.id);
    estado.usuario.gemas += 20;
    return { gemasGanhas: 20, gemas: estado.usuario.gemas };
  },
  revisaoIniciar: ({ corpo }) => {
    const c = (corpo ?? {}) as { disciplina?: SlugDisciplina; sessaoOrigemId?: string };
    let qs: QuestaoMock[];
    if (c.sessaoOrigemId) {
      const orig = estado.sessoes.get(c.sessaoOrigemId);
      if (!orig) throw new Falha(404, 'nao_encontrado');
      qs = orig.respostas
        .filter((r) => !r.acertou)
        .map((r) => questaoPorId(r.questaoId)!)
        .filter(Boolean);
    } else {
      qs = pendentesRevisao()
        .map((id) => questaoPorId(id)!)
        .filter(Boolean);
      if (c.disciplina) qs = qs.filter((q) => q.disciplina === c.disciplina);
      qs = qs.slice(0, 10);
    }
    if (qs.length === 0) throw new Falha(409, 'questoes_insuficientes', 'Nada para revisar agora.');
    return iniciarSessaoEstudo('revisao', null, qs, null, null, qs.length);
  },
  sessaoResponder: ({ params, corpo }) => {
    const s = estado.sessoes.get(params.id!);
    if (!s) throw new Falha(404, 'nao_encontrado');
    if (s.concluida) throw new Falha(409, 'sessao_encerrada');
    const c = corpo as { questaoId: string; resposta: Letra; tempoMs: number };
    const q = s.questoes.find((x) => x.id === c.questaoId);
    if (!q) throw new Falha(404, 'nao_encontrado');
    const u = estado.usuario;
    const acertou = q.gabarito === c.resposta;
    s.respostas.push({ questaoId: q.id, acertou, tempoMs: c.tempoMs });
    estado.questoesFeitas += 1;
    if (acertou) estado.acertosTotal += 1;
    if (!acertou && s.tipo === 'licao') {
      u.vidas = Math.max(0, u.vidas - 1);
      u.proximaVidaEm = new Date(Date.now() + 4 * 3600_000).toISOString();
    }
    if (acertou && s.tipo === 'revisao') u.vidas = Math.min(5, u.vidas + 1);
    if (!acertou) estado.revisoes.set(q.id, new Date(Date.now() + 86400_000));
    else if (s.tipo === 'revisao') estado.revisoes.delete(q.id);
    const xp = acertou ? 10 : 0;
    const combo = calcularCombo(s.respostas.map((r) => r.acertou));
    return {
      gabarito: q.gabarito,
      explicacao: q.explicacao,
      dicaBolso: q.dicaBolso,
      acertou,
      titulo: acertou ? tituloAcerto(u.nome) : tituloErro(q.gabarito),
      xpGanho: xp,
      xpSessao: s.respostas.filter((r) => r.acertou).length * 10,
      combo,
      comboVisivel: comboVisivel(combo),
      vidas: u.vidas,
      proximaVidaEm: u.vidas < 5 ? u.proximaVidaEm : null,
      voltaNaRevisao: !acertou,
      respondidas: s.respostas.length,
      total: s.questoes.length,
    };
  },
  sessaoDica: ({ params, corpo }) => {
    const s = estado.sessoes.get(params.id!);
    const q = s?.questoes.find((x) => x.id === (corpo as { questaoId: string }).questaoId);
    if (!s || !q) throw new Falha(404, 'nao_encontrado');
    if (estado.usuario.gemas < 5) throw new Falha(409, 'gemas_insuficientes');
    estado.usuario.gemas -= 5;
    return { dica: q.dica, gemas: estado.usuario.gemas };
  },
  sessaoConcluir: ({ params }) => {
    const s = estado.sessoes.get(params.id!);
    if (!s) throw new Falha(404, 'nao_encontrado');
    if (s.concluida) throw new Falha(409, 'sessao_encerrada');
    s.concluida = true;
    const u = estado.usuario;
    const acertos = s.respostas.filter((r) => r.acertou).length;
    const total = s.respostas.length || s.questoes.length;
    const r = xpDaSessao(s.tipo, acertos, total);
    u.xpTotal += r.total;
    estado.xpSemana += r.total;
    estado.participandoLiga = true;
    let gemasGanhas = 0;
    let coroa = false;
    if (s.licaoId) {
      estado.progresso.set(s.licaoId, (estado.progresso.get(s.licaoId) ?? 0) + 1);
      gemasGanhas += 5;
      estado.licoesHoje += 1;
      const achado = todasLicoes().find((x) => x.l.id === s.licaoId);
      if (s.tipo === 'desafio' && acertos / total >= 0.7 && achado) {
        estado.coroadas.add(achado.u.id);
        coroa = true;
      }
    }
    u.gemas += gemasGanhas;
    const primeiraDoDia = !estado.ofensivaHoje && (s.tipo !== 'revisao' || total >= 10);
    if (primeiraDoDia) {
      estado.ofensivaHoje = true;
      u.ofensiva += 1;
    }
    const novas = [] as {
      codigo: (typeof CONQUISTAS)[number]['codigo'];
      titulo: string;
      descricao: string;
    }[];
    if (s.licaoId && !estado.conquistas.has('primeira_licao')) {
      estado.conquistas.add('primeira_licao');
      novas.push({ ...CONQUISTAS[0] });
    }
    const tempoMs = s.respostas.reduce((a, x) => a + x.tempoMs, 0);
    return {
      tipo: s.tipo,
      tituloLicao: s.licaoId
        ? (todasLicoes().find((x) => x.l.id === s.licaoId)?.s.titulo ?? null)
        : null,
      xpGanho: r.total,
      itensXp: r.itens,
      acertos,
      total,
      precisao: Math.round((acertos / Math.max(1, total)) * 100),
      tempoMs,
      erros: s.respostas.filter((x) => !x.acertou).map((x) => x.questaoId),
      gemasGanhas,
      gemas: u.gemas,
      xpTotal: u.xpTotal,
      vidas: u.vidas,
      ofensiva: {
        valor: u.ofensiva,
        recorde: Math.max(u.ofensiva, u.ofensivaRecorde),
        mostrarTela: primeiraDoDia,
        marco:
          u.ofensiva === 7 || u.ofensiva === 30 || u.ofensiva === 100
            ? (u.ofensiva as 7 | 30 | 100)
            : null,
        protetorUsado: false,
        zerou: false,
        frase: fraseOfensiva(u.ofensiva),
        semana: semanaOfensiva(),
        metaHoje: metaHoje(),
      },
      conquistasNovas: novas,
      coroa,
      liga: { entrou: true, xpSemana: estado.xpSemana },
    };
  },
  revisao: () => {
    const pend = pendentesRevisao()
      .map((id) => questaoPorId(id)!)
      .filter(Boolean);
    const dominios: Record<SlugDisciplina, number | null> = {
      portugues: 0.62,
      matematica: 0.48,
      gerais: 0.71,
      especificos: 0.8,
    };
    return {
      pendentes: pend.length,
      porDisciplina: (Object.keys(DISCIPLINAS) as SlugDisciplina[]).map((slug) => ({
        slug,
        nome: DISCIPLINAS[slug].nome,
        cor: DISCIPLINAS[slug].cor,
        pendentes: pend.filter((q) => q.disciplina === slug).length,
        dominio: dominios[slug],
      })),
      regra:
        'Cada erro volta em 1, 3, 7 e 15 dias. Acertou 4 vezes seguidas, a questão sai da fila.',
    };
  },
  questaoReport: () => ({ ok: true, id: uuid() }),
  offlinePacote: async () => {
    const chave = gerarChaveOffline();
    const cifrar = async (q: QuestaoMock, revisao: boolean) => ({
      ...paraAluno(q, revisao),
      cifrado: await cifrarTexto(
        chave,
        q.id,
        JSON.stringify({
          gabarito: q.gabarito,
          explicacao: q.explicacao,
          dicaBolso: q.dicaBolso,
          dica: q.dica,
        }),
      ),
    });
    const todas = todasLicoes();
    const i = Math.max(0, indiceAtual());
    const proximas = todas
      .slice(i)
      .filter((x) => x.l.tipo === 'normal')
      .slice(0, 3);
    return {
      pacoteId: uuid(),
      geradoEm: agora().toISOString(),
      expiraEm: new Date(Date.now() + 7 * 86400_000).toISOString(),
      versaoConteudo: estado.versaoConteudo,
      chave,
      licoes: await Promise.all(
        proximas.map(async (x) => ({
          licao: { id: x.l.id, titulo: x.l.titulo, tipo: x.l.tipo, tamanho: x.l.tamanho },
          dica: x.s.assunto.dica,
          questoes: await Promise.all(
            questoesDaLicao(x.s.assunto.id, 5, x.l.ordem).map((q) => cifrar(q, false)),
          ),
        })),
      ),
      revisao: await Promise.all(
        pendentesRevisao()
          .map((id) => questaoPorId(id)!)
          .filter(Boolean)
          .map((q) => cifrar(q, true)),
      ),
    };
  },
  syncTentativas: ({ corpo }) => {
    const c = corpo as {
      tentativas: { idCliente: string; questaoId: string; resposta: Letra }[];
      sessoes: { idCliente: string; licaoId: string | null; concluidaEm: string | null }[];
    };
    const aceitas: string[] = [];
    const duplicadas: string[] = [];
    let xp = 0;
    for (const t of c.tentativas) {
      if (estado.tentativasSync.has(t.idCliente)) {
        duplicadas.push(t.idCliente);
        continue;
      }
      estado.tentativasSync.add(t.idCliente);
      aceitas.push(t.idCliente);
      if (questaoPorId(t.questaoId)?.gabarito === t.resposta) xp += 10;
    }
    for (const s of c.sessoes)
      if (s.concluidaEm && s.licaoId)
        estado.progresso.set(s.licaoId, (estado.progresso.get(s.licaoId) ?? 0) + 1);
    estado.usuario.xpTotal += xp;
    const u = estado.usuario;
    return {
      aceitas,
      duplicadas,
      rejeitadas: [],
      xpGanho: xp,
      me: {
        xpTotal: u.xpTotal,
        gemas: u.gemas,
        vidas: u.vidas,
        ofensiva: u.ofensiva,
        revisoesPendentes: pendentesRevisao().length,
      },
    };
  },

  simuladoCriar: ({ corpo }) => {
    const cargo = cargosAtivos().find((c) => c.id === (corpo as { cargoId: string }).cargoId);
    if (!cargo) throw new Falha(404, 'nao_encontrado');
    const blocos: SlugDisciplina[] = [
      ...Array(5).fill('portugues'),
      ...Array(5).fill('matematica'),
      ...Array(5).fill('gerais'),
      ...Array(25).fill('especificos'),
    ];
    const porDisc = (d: SlugDisciplina) => QUESTOES.filter((q) => q.disciplina === d);
    const ini = agora();
    const sim: SimuladoMock = {
      id: uuid(),
      cargo: { id: cargo.id, nome: cargo.nome },
      iniciadoEm: ini,
      terminaEm: new Date(ini.getTime() + 4 * 3600_000),
      itens: blocos.map((b, i) => {
        const pool = porDisc(b);
        return { numero: i + 1, bloco: b, q: pool[i % pool.length]!, id: uuid() };
      }),
      respostas: {},
      entregue: null,
    };
    estado.simulados.set(sim.id, sim);
    return simAndamento(sim);
  },
  simuladosListar: () => {
    const andamento = [...estado.simulados.values()].find(
      (s) => !s.entregue && s.terminaEm.getTime() > Date.now(),
    );
    return {
      emAndamento: andamento
        ? { id: andamento.id, terminaEm: andamento.terminaEm.toISOString(), cargo: andamento.cargo }
        : null,
      itens: estado.historico,
    };
  },
  simuladoObter: ({ params }) => {
    const sim = estado.simulados.get(params.id!);
    if (!sim) {
      const h = estado.historico.find((x) => x.id === params.id);
      if (!h) throw new Falha(404, 'nao_encontrado');
      return resultadoFicticio(h);
    }
    if (!sim.entregue && sim.terminaEm.getTime() <= Date.now())
      sim.entregue = { em: sim.terminaEm, automatica: true };
    return sim.entregue ? simResultado(sim) : simAndamento(sim);
  },
  simuladoResposta: ({ params, corpo }) => {
    const sim = estado.simulados.get(params.id!);
    if (!sim) throw new Falha(404, 'nao_encontrado');
    if (sim.entregue || sim.terminaEm.getTime() <= Date.now())
      throw new Falha(409, 'simulado_encerrado');
    const c = corpo as { questaoId: string; letra: Letra | null; revisarDepois?: boolean };
    const anterior = sim.respostas[c.questaoId];
    sim.respostas[c.questaoId] = {
      letra: c.letra,
      revisarDepois: c.revisarDepois ?? anterior?.revisarDepois ?? false,
    };
    return {
      ok: true,
      msRestantes: sim.terminaEm.getTime() - Date.now(),
      emBranco: sim.itens.filter((i) => !sim.respostas[i.id]?.letra).length,
    };
  },
  simuladoEntregar: ({ params }) => {
    const sim = estado.simulados.get(params.id!);
    if (!sim) throw new Falha(404, 'nao_encontrado');
    if (sim.entregue) throw new Falha(409, 'simulado_encerrado');
    sim.entregue = { em: agora(), automatica: false };
    const r = simResultado(sim);
    estado.historico.unshift({
      id: sim.id,
      cargo: sim.cargo,
      iniciadoEm: r.iniciadoEm,
      entregueEm: r.entregueEm,
      pontos: r.pontos,
      percentual: r.percentual,
      aprovado: r.aprovado,
      acertos: r.acertos,
      totalQuestoes: r.totalQuestoes,
      tempoGastoMs: r.tempoGastoMs,
    });
    estado.usuario.xpTotal += r.xpGanho;
    return r;
  },

  liga: () => {
    const u = estado.usuario;
    const fim = fimSemanaSP(agora());
    const dias = diasParaFimDaSemana(agora());
    const nomeEu =
      u.apelidoLiga ?? nomeComSobrenomeAbreviado(u.nome).split(' ').slice(0, 2).join(' ');
    const xps = [1380, 1215, 1102, 980, 905, 842, 790, 655, 512, 420, 300, 120];
    const lista = NOMES_LIGA.map((nome, i) => ({ nome, xp: xps[i]!, eu: false }));
    if (estado.participandoLiga) lista.push({ nome: nomeEu, xp: estado.xpSemana, eu: true });
    lista.sort((a, b) => b.xp - a.xp);
    const tam = lista.length;
    return {
      semana: segundaDaSemana(hoje()),
      divisao: u.divisao,
      nomeDivisao: NOMES_DIVISAO[u.divisao],
      terminaEm: fim.toISOString(),
      diasRestantes: dias,
      regra: textoRegraLiga(dias),
      participando: estado.participandoLiga,
      grupo: estado.participandoLiga
        ? {
            id: '00000000-0000-4000-8000-0000000a1a01',
            tamanho: tam,
            promocaoAte: 3,
            rebaixamentoDesde:
              tam > 10 && u.divisao !== 'bronze' ? tam - 2 : tam > 10 ? null : null,
          }
        : null,
      ranking: estado.participandoLiga
        ? lista.map((x, i) => ({
            posicao: i + 1,
            nome: x.nome,
            iniciais: iniciais(x.nome.replace('.', '')),
            cor: corDoAvatar(x.nome),
            xpSemana: x.xp,
            eu: x.eu,
          }))
        : [],
      minhaPosicao: estado.participandoLiga ? lista.findIndex((x) => x.eu) + 1 : null,
      resultadoAnterior: estado.resultadoLiga
        ? {
            semana: somarDias(segundaDaSemana(hoje()), -7),
            resultado: estado.resultadoLiga.resultado,
            posicao: estado.resultadoLiga.posicao,
            divisaoAnterior: estado.resultadoLiga.de,
            divisaoNova: estado.resultadoLiga.para,
            mensagem:
              estado.resultadoLiga.resultado === 'subiu'
                ? `Você subiu para a Liga ${NOMES_DIVISAO[estado.resultadoLiga.para]}!`
                : `Você ficou na ${NOMES_DIVISAO[estado.resultadoLiga.para]}`,
            gemasGanhas: estado.resultadoLiga.gemas,
          }
        : null,
    };
  },
  ligaResultadoVisto: () => {
    estado.resultadoLiga = null;
    return { ok: true };
  },
  perfilEstatisticas: () => {
    const u = estado.usuario;
    const cg = cargoAtual();
    const dom: [SlugDisciplina, number | null][] = [
      ['portugues', 0.62],
      ['matematica', 0.48],
      ['gerais', 0.71],
      ['especificos', estado.questoesFeitas > 0 ? 0.8 : null],
    ];
    return {
      ofensiva: u.ofensiva,
      ofensivaRecorde: Math.max(u.ofensiva, u.ofensivaRecorde),
      xpTotal: u.xpTotal,
      questoesFeitas: estado.questoesFeitas,
      precisao: estado.questoesFeitas
        ? Math.round((estado.acertosTotal / estado.questoesFeitas) * 100)
        : null,
      dominio: dom.map(([slug, v]) => ({
        slug,
        nome: DISCIPLINAS[slug].nome,
        cor: DISCIPLINAS[slug].cor,
        valor: estado.questoesFeitas ? v : null,
        texto: estado.questoesFeitas && v != null ? `${Math.round(v * 100)}%` : '—',
      })),
      conquistas: CONQUISTAS.map((c) => ({
        ...c,
        obtida: estado.conquistas.has(c.codigo),
        obtidaEm: estado.conquistas.has(c.codigo) ? u.criadoEm.toISOString() : null,
      })),
      cargo: cg ? { nome: cg.nome, area: cg.area } : null,
      orgao: 'Prefeitura de Palmital',
      seloAcesso: 'Acesso completo · pago via Pix',
      edital: {
        status: estado.modoEdital ? 'edital_publicado' : 'aguardando_edital',
        texto: textoStatusEdital(
          estado.modoEdital ? 'edital_publicado' : 'aguardando_edital',
          estado.modoEdital ? '14/03' : null,
        ),
        dataProva: estado.modoEdital ? DATA_PROVA : null,
        diasParaProva: estado.modoEdital ? 142 : null,
      },
      avisoEdital: AVISO_EDITAL,
    };
  },
  pushChave: () => ({
    chavePublica:
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  }),
  pushInscrever: () => ({ ok: true }),
  pushRemover: () => ({ ok: true }),
};

const CONCURSOS_MOCK = [
  {
    id: CONCURSO_ID,
    nome: 'Prefeitura Municipal de Palmital-PR 2026/27',
    sigla: 'PAL · FAU',
    orgao: 'Prefeitura Municipal de Palmital',
    municipio: 'Palmital',
    uf: 'PR',
    ano: 2026,
    dataProva: null as string | null,
  },
  {
    id: CONCURSO2_ID,
    nome: 'Prefeitura Municipal de Siqueira Campos-PR 2026',
    sigla: 'SIQ · FAU',
    orgao: 'Prefeitura Municipal de Siqueira Campos',
    municipio: 'Siqueira Campos',
    uf: 'PR',
    ano: 2026,
    dataProva: '2026-11-29',
  },
];

function meusConcursos() {
  const jaPagou = estado.seguidos.some((x) => x.acesso);
  const resumo = (c: (typeof CONCURSOS_MOCK)[number], preco: number, comDesconto: boolean) => ({
    ...c,
    banca: 'FAU-Unicentro',
    status: 'aguardando_edital' as const,
    statusTexto: 'Edital em elaboração pela FAU',
    diasParaProva: c.dataProva ? 33 : null,
    precoCentavos: preco,
    comDesconto,
  });
  return {
    ativoId: estado.ativoId,
    seguidos: estado.seguidos.map((x) => {
      const c = CONCURSOS_MOCK.find((y) => y.id === x.id)!;
      return {
        ...resumo(c, x.acesso ? 0 : jaPagou ? PRECO_ADICIONAL : PRECO_CHEIO, !x.acesso && jaPagou),
        cargo: null,
        acesso: x.acesso,
        ativo: x.id === estado.ativoId,
      };
    }),
    disponiveis: CONCURSOS_MOCK.filter((c) => !estado.seguidos.some((x) => x.id === c.id)).map(
      (c) => resumo(c, jaPagou ? PRECO_ADICIONAL : PRECO_CHEIO, jaPagou),
    ),
    precoCheioCentavos: PRECO_CHEIO,
    precoAdicionalCentavos: PRECO_ADICIONAL,
  };
}

function pix() {
  const p = estado.pedido!;
  const c = CONCURSOS_MOCK.find((x) => x.id === p.concursoId) ?? CONCURSOS_MOCK[0]!;
  const jaPagou = estado.seguidos.some((x) => x.acesso && x.id !== c.id);
  return {
    pedidoId: p.id,
    concursoId: c.id,
    concursoNome: c.nome,
    ...(() => {
      const base = jaPagou ? PRECO_ADICIONAL : PRECO_CHEIO;
      const desconto = p.cupom ? CUPONS_MOCK[p.cupom]! : 0;
      const valor = Math.round((base * (100 - desconto)) / 100);
      return { valorCentavos: valor, valorOriginalCentavos: desconto ? base : null, cupom: p.cupom ?? null };
    })(),
    imagem: pngQrFalso(),
    payload: `00020126580014br.gov.bcb.pix0136mock-${p.id}5204000053039865406397.005802BR5911FUSE APROVA6008PALMITAL62070503***6304ABCD`,
    expiraEm: p.expiraEm.toISOString(),
    status: p.status,
  };
}

function simAndamento(sim: SimuladoMock) {
  return {
    estado: 'andamento' as const,
    id: sim.id,
    cargo: sim.cargo,
    iniciadoEm: sim.iniciadoEm.toISOString(),
    terminaEm: sim.terminaEm.toISOString(),
    agora: agora().toISOString(),
    msRestantes: Math.max(0, sim.terminaEm.getTime() - Date.now()),
    distribuicao: DIST,
    questoes: sim.itens.map((i) => ({
      numero: i.numero,
      bloco: i.bloco,
      questao: paraAluno(i.q, false, i.id),
    })),
    respostas: sim.respostas,
  };
}

const NOMES_BLOCO: Record<SlugDisciplina, string> = {
  portugues: 'Língua Portuguesa',
  matematica: 'Matemática / RL',
  gerais: 'Conhecimentos Gerais',
  especificos: 'Conhecimentos Específicos',
};

function simResultado(sim: SimuladoMock) {
  const blocos = (['portugues', 'matematica', 'gerais', 'especificos'] as SlugDisciplina[]).map(
    (b) => {
      const itens = sim.itens.filter((i) => i.bloco === b);
      const acertos = itens.filter((i) => sim.respostas[i.id]?.letra === i.q.gabarito).length;
      const peso = b === 'especificos' ? 2.8 : 2;
      return {
        bloco: b,
        nome: NOMES_BLOCO[b],
        questoes: itens.length,
        acertos,
        pontos: Math.round(acertos * peso * 10) / 10,
        pontosMaximos: itens.length * peso,
      };
    },
  );
  const pontos = Math.round(blocos.reduce((a, b) => a + b.pontos, 0) * 10) / 10;
  const acertos = blocos.reduce((a, b) => a + b.acertos, 0);
  const aprovado = pontos >= 50;
  const em = sim.entregue!.em;
  return {
    estado: 'entregue' as const,
    id: sim.id,
    cargo: sim.cargo,
    iniciadoEm: sim.iniciadoEm.toISOString(),
    entregueEm: em.toISOString(),
    entregaAutomatica: sim.entregue!.automatica,
    tempoGastoMs: em.getTime() - sim.iniciadoEm.getTime(),
    pontos,
    pontosMaximos: 100,
    percentual: pontos,
    aprovado,
    selo: seloSimulado(aprovado),
    acertos,
    totalQuestoes: sim.itens.length,
    porBloco: blocos,
    xpGanho: acertos + (aprovado ? 20 : 0),
    questoes: sim.itens.map((i) => {
      const resp = sim.respostas[i.id]?.letra ?? null;
      return {
        numero: i.numero,
        bloco: i.bloco,
        questao: paraAluno(i.q, false, i.id),
        resposta: resp,
        acertou: resp === i.q.gabarito,
        anulada: false,
        gabarito: i.q.gabarito,
        explicacao: i.q.explicacao,
        dicaBolso: i.q.dicaBolso,
      };
    }),
  };
}

function resultadoFicticio(h: (typeof estado.historico)[number]) {
  const ini = new Date(h.iniciadoEm);
  const sim: SimuladoMock = {
    id: h.id,
    cargo: h.cargo,
    iniciadoEm: ini,
    terminaEm: new Date(ini.getTime() + 4 * 3600_000),
    itens: [],
    respostas: {},
    entregue: { em: new Date(h.entregueEm), automatica: false },
  };
  const blocos: SlugDisciplina[] = [
    ...Array(5).fill('portugues'),
    ...Array(5).fill('matematica'),
    ...Array(5).fill('gerais'),
    ...Array(25).fill('especificos'),
  ];
  sim.itens = blocos.map((b, i) => {
    const pool = QUESTOES.filter((q) => q.disciplina === b);
    const q = pool[i % pool.length]!;
    const id = `${h.id.slice(0, 24)}${String(i + 1).padStart(12, '0')}`;
    return { numero: i + 1, bloco: b, q, id };
  });
  sim.itens.forEach((i, k) => {
    sim.respostas[i.id] = {
      letra: k < h.acertos + 3 && k % 4 !== 3 ? i.q.gabarito : 'A',
      revisarDepois: false,
    };
  });
  return simResultado(sim);
}

/* --------------------------------------------------------------- despacho */

const ROTAS_ALUNO = (Object.keys(ROTAS) as NomeRota[]).filter((n) => !n.startsWith('admin'));

function casar(
  metodo: string,
  caminho: string,
): { nome: NomeRota; params: Record<string, string> } | null {
  for (const nome of ROTAS_ALUNO) {
    const def = ROTAS[nome];
    if (def.metodo !== metodo) continue;
    const nomes: string[] = [];
    const re = new RegExp(
      '^' +
        def.caminho.replace(/:([A-Za-z]+)/g, (_, n: string) => (nomes.push(n), '([^/]+)')) +
        '$',
    );
    const m = re.exec(caminho);
    if (m)
      return {
        nome,
        params: Object.fromEntries(nomes.map((n, i) => [n, decodeURIComponent(m[i + 1]!)])),
      };
  }
  return null;
}

function cookies(req: Req): Record<string, string> {
  const raw = req.headers.cookie;
  const s = Array.isArray(raw) ? raw.join(';') : (raw ?? '');
  return Object.fromEntries(
    s
      .split(';')
      .map((p) => p.trim().split('='))
      .filter((p) => p.length === 2) as [string, string][],
  );
}

async function lerCorpo(req: Req): Promise<unknown> {
  const partes: Uint8Array[] = [];
  for await (const p of req) partes.push(p);
  const total = partes.reduce((a, p) => a + p.length, 0);
  if (!total) return undefined;
  const junto = new Uint8Array(total);
  let o = 0;
  for (const p of partes) {
    junto.set(p, o);
    o += p.length;
  }
  return JSON.parse(new TextDecoder().decode(junto));
}

function responder(res: Res, status: number, corpo?: unknown, cookie?: string) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  if (cookie) res.setHeader('set-cookie', cookie);
  res.end(corpo === undefined ? '' : JSON.stringify(corpo));
}

const atraso = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function tratar(req: Req, res: Res): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://mock');
  const caminho = url.pathname.replace(/^\/api/, '');
  const metodo = (req.method ?? 'GET').toUpperCase();

  // Controles do mock
  if (caminho === '/__mock/cenario') {
    const nome = url.searchParams.get('nome') ?? 'aluno';
    aplicarCenario(nome);
    const cookie = estado.logado
      ? `${COOKIE}=${TOKEN}; Path=/; HttpOnly; SameSite=Lax`
      : `${COOKIE}=; Path=/; Max-Age=0`;
    return responder(res, 200, { ok: true, cenario: nome }, cookie);
  }
  if (caminho === '/__mock/pagar') {
    const alvo = estado.pedido?.concursoId ?? estado.ativoId;
    if (estado.pedido) estado.pedido.status = 'pago';
    estado.usuario.acesso = true;
    const linha = estado.seguidos.find((x) => x.id === alvo);
    if (linha) linha.acesso = true;
    else estado.seguidos.push({ id: alvo, acesso: true });
    return responder(res, 200, { ok: true });
  }

  const achado = casar(metodo, caminho);
  if (!achado) return responder(res, 404, erroApi('nao_encontrado'));
  const def = ROTAS[achado.nome];
  await atraso(120);

  try {
    const logado = estado.logado && cookies(req)[COOKIE] === TOKEN;
    if (def.guarda === 'login' || def.guarda === 'aluno' || def.guarda === 'acesso' || def.guarda === 'conteudo') {
      if (!logado) throw new Falha(401, 'nao_autenticado');
      // D24: estudo e pagamento só para o aluno; conteúdo para a equipe.
      if ((def.guarda === 'aluno' || def.guarda === 'acesso') && estado.usuario.papel !== 'aluno')
        throw new Falha(403, 'proibido');
      if (def.guarda === 'acesso' && !estado.usuario.acesso) throw new Falha(402, 'sem_acesso');
      if (def.guarda === 'conteudo' && estado.usuario.papel !== 'admin')
        throw new Falha(403, 'proibido');
    }
    let corpo: unknown = undefined;
    if ('corpo' in def && def.corpo) {
      const bruto = await lerCorpo(req);
      const r = def.corpo.safeParse(bruto);
      if (!r.success) {
        const campos: Record<string, string> = {};
        for (const i of r.error.issues) campos[i.path.join('.') || '_'] ??= i.message;
        throw new Falha(
          400,
          'validacao',
          r.error.issues.length === 1 ? r.error.issues[0]!.message : undefined,
          campos,
        );
      }
      corpo = r.data;
    }
    const h = H[achado.nome];
    if (!h) throw new Falha(404, 'nao_encontrado', 'Rota não simulada no mock.');
    const saida = await h({ params: achado.params, corpo, query: url.searchParams });
    if (def.resposta) {
      const v = def.resposta.safeParse(saida);
      if (!v.success) {
        console.error(
          `[mock] resposta de ${achado.nome} fora do contrato:`,
          JSON.stringify(v.error.issues.slice(0, 5), null, 2),
        );
        throw new Falha(500, 'interno', `Resposta de ${achado.nome} fora do contrato.`);
      }
    }
    const novoCookie =
      achado.nome === 'authCadastro' ||
      achado.nome === 'authLogin' ||
      achado.nome === 'authRedefinir'
        ? `${COOKIE}=${TOKEN}; Path=/; HttpOnly; SameSite=Lax`
        : achado.nome === 'authSair' || achado.nome === 'meExcluir'
          ? `${COOKIE}=; Path=/; Max-Age=0`
          : undefined;
    responder(res, 200, saida, novoCookie);
  } catch (e) {
    if (e instanceof Falha)
      return responder(res, e.status, erroApi(e.codigo, e.message || undefined, e.campos));
    console.error('[mock]', e);
    responder(res, 500, erroApi('interno'));
  }
}
