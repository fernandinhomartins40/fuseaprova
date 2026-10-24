/**
 * Cliente HTTP do Asaas (único serviço externo, PRD 8.3), isolado e injetável.
 * Endpoints conferidos em https://docs.asaas.com (23/10/2026):
 *   POST /customers · POST /payments · GET /payments/{id}/pixQrCode · GET /payments/{id}
 *   POST /payments/{id}/refund — header `access_token` com a chave da API.
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
}

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
  async function chamar<T>(metodo: 'GET' | 'POST', caminho: string, corpo?: unknown): Promise<T> {
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
  };
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
      const c = { id, status: 'PENDING', value: d.value, dados: d };
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
      return { id, status: c.status, value: c.value };
    },
    async estornar(id) {
      checar();
      const c = f.cobrancas.get(id);
      if (!c) throw new ErroAsaas('Cobrança não encontrada.', 404);
      f.estornos.push(id);
      return { id, status: c.status, value: c.value };
    },
  };
  return f;
}
