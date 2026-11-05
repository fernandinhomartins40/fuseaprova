/**
 * D37: e-mail transacional pela API HTTP do Velomail (POST /emails/send, chave `re_...` no
 * header x-api-key). Usado pela API e pelo worker; o SMTP fica como alternativa.
 */
export const URL_VELOMAIL_PADRAO = 'https://www.velomail.com.br/api';

export interface ConfigVelomail {
  apiKey: string;
  url?: string;
  /** "Fuse Aprova <nao-responda@fuseaprova.com.br>": o domínio precisa estar verificado. */
  remetente: string;
  /** Prazo de cada envio. */
  prazoMs?: number;
  fetch?: typeof fetch;
}

export interface MensagemVelomail {
  para: string;
  assunto: string;
  html: string;
  texto: string;
}

/**
 * `temporaria`: falha do serviço ou da configuração (rede, prazo, chave, limite, domínio não
 * verificado), que vale tentar de novo. Falsa quando o Velomail recusa aquela mensagem (400).
 */
export class ErroVelomail extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly codigo: string | null,
    readonly temporaria: boolean,
  ) {
    super(message);
    this.name = 'ErroVelomail';
  }
}

/** "Fuse Aprova <n@f.br>" → { email, nome }: o Velomail recusa o formato com nome em `from`. */
export function separarRemetente(remetente: string): { email: string; nome: string | null } {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(remetente);
  if (!m) return { email: remetente.trim(), nome: null };
  return { email: m[2]!.trim(), nome: m[1]!.trim() || null };
}

export function criarEnviadorVelomail(c: ConfigVelomail): { enviar(m: MensagemVelomail): Promise<string | null> } {
  const url = `${(c.url || URL_VELOMAIL_PADRAO).replace(/\/+$/, '')}/emails/send`;
  const f = c.fetch ?? fetch;
  const de = separarRemetente(c.remetente);
  return {
    async enviar(m) {
      let r: Response;
      try {
        r = await f(url, {
          method: 'POST',
          headers: { 'x-api-key': c.apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: de.email,
            ...(de.nome ? { from_name: de.nome } : {}),
            to: m.para,
            subject: m.assunto,
            html: m.html,
            text: m.texto,
            // Transacional: sem pixel nem troca dos links (o link de senha vai intacto).
            tracking_enabled: false,
          }),
          signal: AbortSignal.timeout(c.prazoMs ?? 20_000),
        });
      } catch (e) {
        throw new ErroVelomail(`O Velomail não respondeu: ${(e as Error).message}`, null, null, true);
      }
      const corpo = ((await r.json().catch(() => null)) ?? {}) as { message_id?: string; error?: string; code?: string };
      if (r.ok) return corpo.message_id ?? null;
      const codigo = corpo.code ?? null;
      const msg = `Velomail ${r.status}${codigo ? ` ${codigo}` : ''}: ${corpo.error ?? 'erro sem detalhe'}`;
      throw new ErroVelomail(msg, r.status, codigo, r.status !== 400);
    },
  };
}
