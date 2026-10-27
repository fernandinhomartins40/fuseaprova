import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  acaoDoEventoAsaas,
  endpointPushValido,
  AsaasWebhookCorpo,
  CadastroEntrada,
  CODIGOS_ERRO,
  ConcursoEntrada,
  erroApi,
  erroDeValidacao,
  IniciarRevisaoEntrada,
  LicaoEntrada,
  MeAtualizarEntrada,
  mensagemResultadoLiga,
  montarCaminho,
  MENSAGENS_ERRO,
  PaginacaoQuery,
  ProvaOrigemEntrada,
  QuestaoEntrada,
  QuestoesQuery,
  referenciaExterna,
  referenciaEhDoFuseAprova,
  descricaoCobranca,
  EVENTOS_ASAAS_WEBHOOK,
  RetirarOrigemEntrada,
  ROTAS,
  rotasComGuarda,
  seloSimulado,
  SimuladoDetalheResposta,
  SyncEntrada,
  usuarioDaReferencia,
  OPCOES_META_DIARIA,
  type QuestaoParaAluno,
  ExcluirContaEntrada,
} from './index.js';
import * as raiz from '../index.js';

const uuid = '3f0c7a8e-2b1d-4c5e-9f00-0123456789ab';
const alternativas = (['A', 'B', 'C', 'D', 'E'] as const).map((letra) => ({
  letra,
  texto: `Opção ${letra}`,
}));

describe('formato de erro', () => {
  it('erroApi usa a mensagem padrão', () => {
    expect(erroApi('sem_acesso')).toEqual({
      erro: MENSAGENS_ERRO.sem_acesso,
      codigo: 'sem_acesso',
    });
    expect(erroApi('validacao', 'x', { cpf: 'y' })).toEqual({
      erro: 'x',
      codigo: 'validacao',
      campos: { cpf: 'y' },
    });
    expect(CODIGOS_ERRO.sem_acesso).toBe(402);
  });

  it('erroDeValidacao gera erros por campo', () => {
    const r = CadastroEntrada.safeParse({
      nome: 'Marina',
      email: 'x',
      cpf: '111.111.111-11',
      celular: '123',
      senha: '123',
      aceiteTermos: false,
    });
    expect(r.success).toBe(false);
    if (r.success) return;
    const e = erroDeValidacao(r.error);
    expect(e.codigo).toBe('validacao');
    expect(e.erro).toBe(MENSAGENS_ERRO.validacao);
    expect(e.campos?.cpf).toBe('Esse CPF não é válido.');
    expect(Object.keys(e.campos ?? {})).toEqual(
      expect.arrayContaining(['nome', 'email', 'cpf', 'celular', 'senha', 'aceiteTermos']),
    );
    const um = z.object({ a: z.string({ required_error: 'Falta a.' }) }).safeParse({});
    if (!um.success) expect(erroDeValidacao(um.error).erro).toBe('Falta a.');
    const raizErro = z.string().safeParse(1);
    if (!raizErro.success)
      expect(Object.keys(erroDeValidacao(raizErro.error).campos!)).toEqual(['_']);
  });
});

describe('cadastro', () => {
  it('normaliza CPF, celular, e-mail e nome', () => {
    const r = CadastroEntrada.parse({
      nome: '  Marina   Souza ',
      email: ' Marina@Exemplo.com ',
      cpf: '529.982.247-25',
      celular: '(42) 99876-5432',
      senha: 'segredo123',
      aceiteTermos: true,
    });
    expect(r).toMatchObject({
      nome: 'Marina Souza',
      email: 'marina@exemplo.com',
      cpf: '52998224725',
      celular: '42998765432',
    });
    expect(r.versaoTermos).toBeTruthy();
  });
});

describe('outros contratos', () => {
  it('preferências e paginação', () => {
    expect(MeAtualizarEntrada.safeParse({}).success).toBe(false);
    expect(MeAtualizarEntrada.parse({ metaDiaria: 2, lembreteHora: '19:30' })).toEqual({
      metaDiaria: 2,
      lembreteHora: '19:30',
    });
    expect(MeAtualizarEntrada.safeParse({ metaDiaria: 4 }).success).toBe(false);
    expect(PaginacaoQuery.parse({})).toEqual({ pagina: 1, porPagina: 20 });
    expect(PaginacaoQuery.parse({ pagina: '3', porPagina: '50' })).toEqual({
      pagina: 3,
      porPagina: 50,
    });
    expect(OPCOES_META_DIARIA[0]).toEqual({ valor: 1, texto: '1 lição (5 min)' });
    expect(OPCOES_META_DIARIA[2]!.texto).toBe('3 lições (15 min)');
    const exc = ExcluirContaEntrada.safeParse({ senha: 'x', confirmacao: 'sim' });
    expect(exc.success).toBe(false);
    if (!exc.success) expect(exc.error.issues[0]!.message).toBe('Digite EXCLUIR para confirmar.');
  });

  it('questão do admin: regras de origem e anulação', () => {
    const base = {
      origem: 'autoral',
      disciplinaId: uuid,
      assuntoId: uuid,
      enunciado: 'Enunciado',
      alternativas,
      gabarito: 'B',
    };
    const ok = QuestaoEntrada.parse(base);
    expect(ok).toMatchObject({
      status: 'rascunho',
      dificuldade: 2,
      provaOrigemId: null,
      dica: null,
    });
    expect(QuestaoEntrada.safeParse({ ...base, provaOrigemId: uuid }).success).toBe(false);
    expect(QuestaoEntrada.safeParse({ ...base, origem: 'fau_real' }).success).toBe(false);
    expect(QuestaoEntrada.safeParse({ ...base, status: 'anulada' }).success).toBe(false);
    expect(
      QuestaoEntrada.safeParse({ ...base, alternativas: [...alternativas].reverse() }).success,
    ).toBe(false);
    expect(QuestoesQuery.parse({ comReports: 'true', disciplina: 'portugues' })).toMatchObject({
      comReports: true,
      ordenar: 'recentes',
    });
  });

  it('provas, concursos, lições e retirada', () => {
    const p = ProvaOrigemEntrada.parse({
      orgao: 'Prefeitura de Realeza',
      urlCaderno: '',
      uf: 'pr',
    });
    expect(p).toMatchObject({
      banca: 'FAU-Unicentro',
      urlCaderno: null,
      uf: 'PR',
      status: 'ativa',
    });
    expect(
      ConcursoEntrada.parse({
        nome: 'Palmital',
        slug: 'palmital-pr-2026',
        banca: 'FAU-Unicentro',
        orgao: 'Prefeitura',
        municipio: 'Palmital',
        uf: 'pr',
        ano: 2026,
        status: 'aguardando_edital',
      }),
    ).toMatchObject({ uf: 'PR', links: [], ativo: true, dataProva: null });
    expect(LicaoEntrada.safeParse({ secaoId: uuid, ordem: 1, tipo: 'desafio' }).success).toBe(
      false,
    );
    expect(
      LicaoEntrada.parse({ secaoId: uuid, ordem: 1, tipo: 'desafio', tamanho: 10 }).tamanho,
    ).toBe(10);
    expect(RetirarOrigemEntrada.safeParse({ motivo: 'Pedido do titular' }).success).toBe(false);
    expect(
      RetirarOrigemEntrada.safeParse({ banca: 'FAU-Unicentro', motivo: 'Pedido' }).success,
    ).toBe(true);
  });

  it('revisão, sync e simulado', () => {
    expect(IniciarRevisaoEntrada.parse(undefined)).toEqual({});
    expect(SyncEntrada.parse({ pacoteId: null, tentativas: [] })).toEqual({
      pacoteId: null,
      sessoes: [],
      tentativas: [],
    });
    const questao: z.input<typeof QuestaoParaAluno> = {
      id: uuid,
      origem: 'autoral',
      chipOrigem: 'Questão Fuse Aprova · estilo FAU',
      provaOrigem: null,
      disciplina: { id: uuid, slug: 'portugues', nome: 'Língua Portuguesa', cor: '#000' },
      assunto: { id: uuid, nome: 'Crase' },
      dificuldade: 1,
      textoApoio: null,
      enunciado: 'x',
      alternativas,
      temDica: true,
      revisao: false,
    };
    const andamento = SimuladoDetalheResposta.parse({
      estado: 'andamento',
      id: uuid,
      cargo: { id: uuid, nome: 'Agente Administrativo' },
      iniciadoEm: '2026-10-23T12:00:00.000Z',
      terminaEm: '2026-10-23T16:00:00.000Z',
      agora: '2026-10-23T12:00:01.000-03:00',
      msRestantes: 1,
      distribuicao: { portugues: 5, matematica: 5, gerais: 5, especificos: 25 },
      questoes: [{ numero: 1, bloco: 'portugues', questao }],
      respostas: { [uuid]: { letra: null, revisarDepois: true } },
    });
    expect(andamento.estado).toBe('andamento');
    expect(seloSimulado(true)).toBe('APROVADO');
    expect(seloSimulado(false)).toBe('ABAIXO DO MÍNIMO');
  });

  it('Asaas', () => {
    expect(acaoDoEventoAsaas('PAYMENT_RECEIVED')).toBe('pagar');
    expect(acaoDoEventoAsaas('PAYMENT_CONFIRMED')).toBe('pagar');
    expect(acaoDoEventoAsaas('PAYMENT_REFUNDED')).toBe('estornar');
    expect(acaoDoEventoAsaas('PAYMENT_CHARGEBACK_REQUESTED')).toBe('estornar');
    expect(acaoDoEventoAsaas('PAYMENT_OVERDUE')).toBe('vencer');
    expect(acaoDoEventoAsaas('PAYMENT_DELETED')).toBe('vencer');
    expect(acaoDoEventoAsaas('PAYMENT_CREATED')).toBe('ignorar');
    expect(acaoDoEventoAsaas('PAYMENT_PARTIALLY_REFUNDED')).toBe('ignorar');
    expect(EVENTOS_ASAAS_WEBHOOK.every((e) => acaoDoEventoAsaas(e) !== 'ignorar')).toBe(true);
    expect(referenciaExterna(uuid)).toBe(`fuseaprova:usuario:${uuid}`);
    expect(usuarioDaReferencia(referenciaExterna(uuid))).toBe(uuid);
    expect(usuarioDaReferencia(`usuario:${uuid.toUpperCase()}`)).toBe(uuid);
    expect(usuarioDaReferencia(`FUSEAPROVA:usuario:${uuid}`)).toBe(uuid);
    expect(usuarioDaReferencia(`outroapp:usuario:${uuid}`)).toBeNull();
    expect(usuarioDaReferencia('outra')).toBeNull();
    expect(usuarioDaReferencia(null)).toBeNull();
    expect(referenciaEhDoFuseAprova(referenciaExterna(uuid))).toBe(true);
    expect(referenciaEhDoFuseAprova(`usuario:${uuid}`)).toBe(false);
    expect(referenciaEhDoFuseAprova('pedido-123')).toBe(false);
    expect(referenciaEhDoFuseAprova(null)).toBe(false);
    expect(referenciaEhDoFuseAprova(undefined)).toBe(false);
    expect(descricaoCobranca('concurso da Prefeitura de Palmital-PR')).toBe(
      'Fuse Aprova: acesso ao preparatório do concurso da Prefeitura de Palmital-PR',
    );
    expect(descricaoCobranca('x'.repeat(900)).length).toBeLessThanOrEqual(200);
    const corpo = AsaasWebhookCorpo.parse({
      id: 'evt_1',
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'pay_1', value: 397, extra: 1 },
      outro: true,
    });
    expect(corpo.payment?.id).toBe('pay_1');
  });

  it('liga', () => {
    expect(mensagemResultadoLiga('subiu', 'Prata')).toBe('Você subiu para a Liga Prata!');
    expect(mensagemResultadoLiga('ficou', 'Bronze')).toBe('Você ficou na Bronze');
    expect(mensagemResultadoLiga('desceu', 'Bronze')).toBe('Você desceu para a Liga Bronze');
  });
});

describe('registro de rotas (PRD 10)', () => {
  it('todas as rotas têm caminho único por método', () => {
    const chaves = Object.values(ROTAS).map((r) => `${r.metodo} ${r.caminho}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it('cobre as rotas da seção 10', () => {
    const chaves = new Set(Object.values(ROTAS).map((r) => `${r.metodo} ${r.caminho}`));
    for (const c of [
      'POST /auth/cadastro',
      'POST /auth/login',
      'POST /auth/sair',
      'POST /auth/recuperar',
      'POST /auth/redefinir',
      'GET /me',
      'PATCH /me',
      'GET /me/exportar',
      'DELETE /me',
      'POST /pagamento/pix',
      'GET /pagamento/status',
      'POST /webhooks/asaas',
      'GET /concurso',
      'GET /trilha',
      'GET /guia/:unidadeId',
      'POST /licoes/:id/iniciar',
      'POST /sessoes/:id/responder',
      'POST /sessoes/:id/dica',
      'POST /sessoes/:id/concluir',
      'POST /sync/tentativas',
      'GET /offline/pacote',
      'GET /revisao',
      'POST /revisao/iniciar',
      'POST /simulados',
      'GET /simulados',
      'GET /simulados/:id',
      'PUT /simulados/:id/resposta',
      'POST /simulados/:id/entregar',
      'GET /liga',
      'GET /perfil/estatisticas',
      'POST /questoes/:id/report',
      'POST /push/inscrever',
      'DELETE /push',
    ]) {
      expect(chaves.has(c), c).toBe(true);
    }
  });

  it('conteúdo usa a guarda de acesso e admin usa a de admin', () => {
    expect(ROTAS.trilha.guarda).toBe('acesso');
    expect(rotasComGuarda('admin').every((n) => ROTAS[n].caminho.startsWith('/admin'))).toBe(true);
    expect(rotasComGuarda('webhook')).toEqual(['webhookAsaas']);
  });

  it('monta caminhos', () => {
    expect(montarCaminho('/simulados/:id/entregar', { id: 'a b' })).toBe(
      '/simulados/a%20b/entregar',
    );
    expect(montarCaminho('/me')).toBe('/me');
    expect(() => montarCaminho('/guia/:unidadeId')).toThrow('unidadeId');
  });

  it('a raiz reexporta os contratos como api', () => {
    expect(raiz.api.ROTAS).toBe(ROTAS);
  });
});

describe('endpoint de push (auditoria PIE R1-06)', () => {
  it('aceita só https nos serviços de push dos navegadores', () => {
    expect(endpointPushValido('https://fcm.googleapis.com/fcm/send/x')).toBe(true);
    expect(endpointPushValido('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true);
    expect(endpointPushValido('https://web.push.apple.com/x')).toBe(true);
    expect(endpointPushValido('http://fcm.googleapis.com/x')).toBe(false);
    expect(endpointPushValido('https://fcm.googleapis.com.mal.com/x')).toBe(false);
    expect(endpointPushValido('https://127.0.0.1:5432/x')).toBe(false);
    expect(endpointPushValido('não é url')).toBe(false);
  });
});
