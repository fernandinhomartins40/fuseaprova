/**
 * Limitador de requisições por host (PRD 7.5: 1 requisição a cada 2 s por host).
 *
 * As chamadas ao mesmo host são enfileiradas; hosts diferentes não esperam uns pelos outros.
 * O relógio e o `dormir` são injetáveis para os testes.
 */
export interface RelogioLimitador {
  agora: () => number;
  dormir: (ms: number) => Promise<void>;
}

export const relogioReal: RelogioLimitador = {
  agora: () => Date.now(),
  dormir: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export class LimitadorPorHost {
  private readonly ultimaSaida = new Map<string, number>();
  private readonly filas = new Map<string, Promise<void>>();
  private readonly intervaloExtra = new Map<string, number>();

  constructor(
    private readonly intervaloMs = 2000,
    private readonly relogio: RelogioLimitador = relogioReal,
  ) {
    if (!(intervaloMs >= 0)) throw new Error('O intervalo do limitador precisa ser >= 0.');
  }

  /** Intervalo efetivo do host (o maior entre o padrão e o Crawl-delay do robots.txt). */
  intervaloDe(host: string): number {
    return Math.max(this.intervaloMs, this.intervaloExtra.get(host.toLowerCase()) ?? 0);
  }

  /** Aplica um Crawl-delay (em ms) informado pelo robots.txt do host. */
  definirIntervaloMinimo(host: string, ms: number): void {
    if (ms > 0) this.intervaloExtra.set(host.toLowerCase(), ms);
  }

  /**
   * Espera a vez do host. Resolve quando a requisição pode sair; a próxima do mesmo host
   * só sai `intervalo` ms depois desta.
   */
  aguardar(host: string): Promise<void> {
    const chave = host.toLowerCase();
    const anterior = this.filas.get(chave) ?? Promise.resolve();
    const vez = anterior.then(async () => {
      const agora = this.relogio.agora();
      const ultima = this.ultimaSaida.get(chave);
      // O intervalo é lido na hora (um Crawl-delay recém-lido já vale para a próxima).
      const liberacao = ultima === undefined ? agora : ultima + this.intervaloDe(chave);
      if (liberacao > agora) await this.relogio.dormir(liberacao - agora);
      this.ultimaSaida.set(chave, this.relogio.agora());
    });
    this.filas.set(chave, vez);
    return vez;
  }

  /** Atalho: espera a vez do host da URL e executa `tarefa`. */
  async executar<T>(url: string | URL, tarefa: () => Promise<T>): Promise<T> {
    await this.aguardar(new URL(url).host);
    return tarefa();
  }
}
