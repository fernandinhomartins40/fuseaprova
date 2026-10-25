/**
 * Cliente HTTP do Asaas (único serviço externo, PRD 8.3), isolado e injetável.
 * Endpoints conferidos em https://docs.asaas.com (23/10/2026):
 *   POST /customers · POST /payments · GET /payments/{id}/pixQrCode · GET /payments/{id}
 *   POST /payments/{id}/refund — header `access_token` com a chave da API.
 * D13 (superadmin), conferidos em 24/10/2026:
 *   POST /payments/{id}/receiveInCash {paymentDate, value, notifyCustomer} · DELETE /payments/{id}
 *   GET /myAccount/commercialInfo · GET /finance/balance · GET /financialTransactions
 *   GET /webhooks · POST /webhooks · PUT /webhooks/{id}
 *   (o PUT não aceita `email` nem `apiVersion`; `authToken` tem de 32 a 255 caracteres).
 */

export interface AsaasCriarCliente {
  name: string;
  cpfCnpj: string;
  email: string;
  mobilePhone: string;
  externalReference: string;
}

export interface AsaasCriarCobranca {
  customer: string;
  billingType: 'PIX';
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
}

export interface AsaasCobranca {
  id: string;
  status: string;
  value?: number;
  /** D13: valor líquido (valor − taxas do Asaas). */
  netValue?: number;
  billingType?: string;
  paymentDate?: string | null;
  confirmedDate?: string | null;
  dateCreated?: string;
  externalReference?: string | null;
  deleted?: boolean;
}

/** D13: dados comerciais da conta (GET /myAccount/commercialInfo). */
export interface AsaasConta {
  name?: string | null;
  email?: string | null;
  cpfCnpj?: string | null;
  personType?: string | null;
  status?: string | null;
  city?: { name?: string | null; state?: string | null } | null;
}

export interface AsaasTransacao {
  id: string;
  value: number;
  balance?: number | null;
  type: string;
  date: string;
  description?: string | null;
  paymentId?: string | null;
}

export interface AsaasLista<T> {
  data: T[];
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
}

export interface AsaasWebhook {
  id: string;
  name?: string | null;
  url: string;
  email?: string | null;
  enabled: boolean;
  interrupted: boolean;
  apiVersion?: number | null;
  hasAuthToken?: boolean;
  sendType?: string | null;
  penalizedRequestsCount?: number | null;
  events?: string[];
}

export interface AsaasWebhookDados {
  name: string;
  url: string;
  email?: string;
  enabled: boolean;
  interrupted: boolean;
  apiVersion?: number;
  authToken: string;
  sendType: 'SEQUENTIALLY' | 'NON_SEQUENTIALLY';
  events: string[];
}

export type ConsultaAsaas = Record<string, string | number | boolean | undefined>;

export interface AsaasQrCode {
  encodedImage: string;
  payload: string;
  /** "2026-10-24 23:59:59" (horário de Brasília) ou ISO. */
  expirationDate: string;
}

export interface ClienteAsaas {
  criarCliente(dados: AsaasCriarCliente): Promise<{ id: string }>;
  criarCobranca(dados: AsaasCriarCobranca): Promise<AsaasCobranca>;
  qrCodePix(pagamentoId: string): Promise<AsaasQrCode>;
  obterCobranca(pagamentoId: string): Promise<AsaasCobranca>;
  estornar(pagamentoId: string, dados?: { description?: string }): Promise<AsaasCobranca>;
  /* D13: superadmin */
  receberEmDinheiro(
    pagamentoId: string,
    dados: { paymentDate: string; value: number; notifyCustomer: boolean },
  ): Promise<AsaasCobranca>;
  removerCobranca(pagamentoId: string): Promise<{ deleted: boolean; id: string }>;
  minhaConta(): Promise<AsaasConta>;
  saldo(): Promise<{ balance: number }>;
  extrato(q: { startDate: string; finishDate: string; offset: number; limit: number; order?: 'asc' | 'desc' }): Promise<AsaasLista<AsaasTransacao>>;
  listarWebhooks(): Promise<AsaasLista<AsaasWebhook>>;
  criarWebhook(dados: AsaasWebhookDados): Promise<AsaasWebhook>;
  atualizarWebhook(id: string, dados: Partial<Omit<AsaasWebhookDados, 'email' | 'apiVersion'>>): Promise<AsaasWebhook>;
}

export class ErroAsaas extends Error {
  constructor(
    mensagem: string,
    readonly status: number | null,
  ) {
    super(mensagem);
  }
}

export interface OpcoesAsaasHttp {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export function criarClienteAsaasHttp(o: OpcoesAsaasHttp): ClienteAsaas {
  const f = o.fetch ?? fetch;
  async function chamar<T>(metodo: 'GET' | 'POST' | 'PUT' | 'DELETE', caminho: string, corpo?: unknown): Promise<T> {
    if (!o.apiKey) throw new ErroAsaas('ASAAS_API_KEY não configurada.', null);
    let resp: Response;
    try {
      resp = await f(`${o.baseUrl}${caminho}`, {
        method: metodo,
        headers: {
          access_token: o.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'FuseAprova/1.0',
        },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(o.timeoutMs ?? 15_000),
      });
    } catch (e) {
      throw new ErroAsaas(`Falha de rede no Asaas: ${(e as Error).message}`, null);
    }
    if (!resp.ok) {
      // Não propaga o corpo (pode conter dados pessoais); só o status e a descrição do erro.
      let descricao = '';
      try {
        const j = (await resp.json()) as { errors?: { description?: string }[] };
        descricao = j.errors?.map((x) => x.description).join('; ') ?? '';
      } catch {
        /* sem corpo */
      }
      throw new ErroAsaas(`Asaas respondeu ${resp.status} em ${caminho}. ${descricao}`, resp.status);
    }
    return (await resp.json()) as T;
  }
  return {
    criarCliente: (d) => chamar('POST', '/customers', d),
    criarCobranca: (d) => chamar('POST', '/payments', d),
    qrCodePix: (id) => chamar('GET', `/payments/${encodeURIComponent(id)}/pixQrCode`),
    obterCobranca: (id) => chamar('GET', `/payments/${encodeURIComponent(id)}`),
    estornar: (id, d) => chamar('POST', `/payments/${encodeURIComponent(id)}/refund`, d ?? {}),
    receberEmDinheiro: (id, d) => chamar('POST', `/payments/${encodeURIComponent(id)}/receiveInCash`, d),
    removerCobranca: (id) => chamar('DELETE', `/payments/${encodeURIComponent(id)}`),
    minhaConta: () => chamar('GET', '/myAccount/commercialInfo/'),
    saldo: () => chamar('GET', '/finance/balance'),
    extrato: (q) => chamar('GET', `/financialTransactions${consulta(q)}`),
    listarWebhooks: () => chamar('GET', '/webhooks?limit=100'),
    criarWebhook: (d) => chamar('POST', '/webhooks', d),
    atualizarWebhook: (id, d) => chamar('PUT', `/webhooks/${encodeURIComponent(id)}`, d),
  };
}

/** Query string para o Asaas (ignora indefinidos; colchetes como `dateCreated[ge]` ficam legíveis). */
export function consulta(q: ConsultaAsaas): string {
  const partes = Object.entries(q)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k).replace(/%5B/g, '[').replace(/%5D/g, ']')}=${encodeURIComponent(String(v))}`);
  return partes.length ? `?${partes.join('&')}` : '';
}

/** Converte o `expirationDate` do Asaas ("AAAA-MM-DD HH:MM:SS", horário de Brasília) em Date. */
export function lerDataAsaas(texto: string | null | undefined): Date | null {
  if (!texto) return null;
  const t = texto.trim();
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(t)) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(t);
  if (!m) return null;
  // Brasília não tem horário de verão desde 2019: UTC−03:00.
  const d = new Date(`${m[1]}T${m[2] ?? '23'}:${m[3] ?? '59'}:${m[4] ?? '59'}-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ------------------------------------------------------- falso (testes/E2E) */

export interface AsaasFalso extends ClienteAsaas {
  clientes: AsaasCriarCliente[];
  cobrancas: Map<string, AsaasCobranca & { dados: AsaasCriarCobranca }>;
  estornos: string[];
  /** D13 */
  recebidasEmDinheiro: { id: string; paymentDate: string; value: number }[];
  removidas: string[];
  webhooks: AsaasWebhook[];
  saldoAtual: number;
  transacoes: AsaasTransacao[];
  /** Muda o status de uma cobrança (simula o pagamento sem webhook). */
  definirStatus(pagamentoId: string, status: string): void;
  /** Faz a próxima chamada falhar. */
  falharProxima(): void;
  chamadas: { obterCobranca: number };
}

/** Asaas em memória, para testes e para o E2E (sandbox simulado). */
export function criarAsaasFalso(opcoes: { validadeQrMs?: number; relogio?: () => Date } = {}): AsaasFalso {
  let n = 0;
  let falhar = false;
  const agora = opcoes.relogio ?? (() => new Date());
  const checar = () => {
    if (falhar) {
      falhar = false;
      throw new ErroAsaas('Falha simulada do Asaas.', 500);
    }
  };
  const f: AsaasFalso = {
    clientes: [],
    cobrancas: new Map(),
    estornos: [],
    recebidasEmDinheiro: [],
    removidas: [],
    webhooks: [],
    saldoAtual: 1234.56,
    transacoes: [],
    chamadas: { obterCobranca: 0 },
    definirStatus(id, status) {
      const c = f.cobrancas.get(id);
      if (c) c.status = status;
    },
    falharProxima() {
      falhar = true;
    },
    async criarCliente(d) {
      checar();
      f.clientes.push(d);
      return { id: `cus_${String(++n).padStart(6, '0')}` };
    },
    async criarCobranca(d) {
      checar();
      const id = `pay_${String(++n).padStart(6, '0')}`;
      const c = { id, status: 'PENDING', value: d.value, netValue: Math.round((d.value - 1.99) * 100) / 100, billingType: 'PIX', dados: d };
      f.cobrancas.set(id, c);
      return { id, status: c.status, value: d.value };
    },
    async qrCodePix(id) {
      checar();
      const exp = new Date(agora().getTime() + (opcoes.validadeQrMs ?? 30 * 60_000));
      return {
        encodedImage: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        payload: `00020126580014br.gov.bcb.pix0136${id}5204000053039865406397.005802BR`,
        expirationDate: exp.toISOString(),
      };
    },
    async obterCobranca(id) {
      checar();
      f.chamadas.obterCobranca++;
      const c = f.cobrancas.get(id);
      if (!c) throw new ErroAsaas('Cobrança não encontrada.', 404);
      const r: AsaasCobranca = { id, status: c.status, value: c.value!, billingType: c.billingType ?? 'PIX', deleted: c.deleted ?? false };
      if (c.netValue !== undefined) r.netValue = c.netValue;
      return r;
    },
    async estornar(id) {
      checar();
      const c = f.cobrancas.get(id);
      if (!c) throw new ErroAsaas('Cobrança não encontrada.', 404);
      f.estornos.push(id);
      return { id, status: c.status, value: c.value! };
    },
    async receberEmDinheiro(id, d) {
      checar();
      const c = f.cobrancas.get(id);
      if (!c || c.deleted) throw new ErroAsaas('Cobrança não encontrada.', 404);
      if (c.status !== 'PENDING' && c.status !== 'OVERDUE') throw new ErroAsaas('Asaas respondeu 400: cobrança não pode ser confirmada.', 400);
      c.status = 'RECEIVED_IN_CASH';
      c.billingType = 'RECEIVED_IN_CASH';
      f.recebidasEmDinheiro.push({ id, paymentDate: d.paymentDate, value: d.value });
      return { id, status: c.status, value: c.value! };
    },
    async removerCobranca(id) {
      checar();
      const c = f.cobrancas.get(id);
      if (!c || c.deleted) throw new ErroAsaas('Cobrança não encontrada.', 404);
      if (c.status !== 'PENDING' && c.status !== 'OVERDUE') throw new ErroAsaas('Asaas respondeu 400: só cobranças pendentes podem ser removidas.', 400);
      c.deleted = true;
      f.removidas.push(id);
      return { deleted: true, id };
    },
    async minhaConta() {
      checar();
      return { name: 'Conta Sandbox Fuse', email: 'financeiro@exemplo.com.br', cpfCnpj: '12345678000199', personType: 'JURIDICA', status: 'APPROVED', city: { name: 'Palmital', state: 'PR' } };
    },
    async saldo() {
      checar();
      return { balance: f.saldoAtual };
    },
    async extrato(q) {
      checar();
      const dentro = f.transacoes.filter((t) => t.date >= q.startDate && t.date <= q.finishDate);
      const data = dentro.slice(q.offset, q.offset + q.limit);
      return { data, hasMore: q.offset + q.limit < dentro.length, totalCount: dentro.length, limit: q.limit, offset: q.offset };
    },
    async listarWebhooks() {
      checar();
      return { data: f.webhooks.map((w) => ({ ...w })), hasMore: false, totalCount: f.webhooks.length, limit: 100, offset: 0 };
    },
    async criarWebhook(d) {
      checar();
      const w: AsaasWebhook = {
        id: `wh_${String(++n).padStart(6, '0')}`,
        name: d.name,
        url: d.url,
        email: d.email ?? null,
        enabled: d.enabled,
        interrupted: d.interrupted,
        apiVersion: d.apiVersion ?? 3,
        hasAuthToken: !!d.authToken,
        sendType: d.sendType,
        penalizedRequestsCount: 0,
        events: [...d.events],
      };
      f.webhooks.push(w);
      return { ...w };
    },
    async atualizarWebhook(id, d) {
      checar();
      const w = f.webhooks.find((x) => x.id === id);
      if (!w) throw new ErroAsaas('Webhook não encontrado.', 404);
      if (d.name !== undefined) w.name = d.name;
      if (d.url !== undefined) w.url = d.url;
      if (d.enabled !== undefined) w.enabled = d.enabled;
      if (d.interrupted !== undefined) w.interrupted = d.interrupted;
      if (d.sendType !== undefined) w.sendType = d.sendType;
      if (d.events !== undefined) w.events = [...d.events];
      if (d.authToken !== undefined) w.hasAuthToken = true;
      return { ...w };
    },
  };
  return f;
}
