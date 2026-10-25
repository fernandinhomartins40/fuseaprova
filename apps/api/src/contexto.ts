/**
 * Dependências injetáveis da API (banco, Asaas, e-mail, relógio…), para produção e testes.
 */
import type { FastifyBaseLogger } from 'fastify';
import type { BancoDados } from '@fuse/db';
import type { schema } from '@fuse/db';
import type { Rng } from '@fuse/shared';
import type { Config } from './config.js';
import type { ClienteAsaas } from './integracoes/asaas.js';
import type { Mailer, MensagemEmail } from './integracoes/email.js';

export interface Relogio {
  agora(): Date;
}

export const relogioSistema: Relogio = { agora: () => new Date() };

/** Relógio controlável nos testes. */
export interface RelogioTeste extends Relogio {
  definir(d: Date | string): void;
  avancar(ms: number): void;
}

export function criarRelogioTeste(inicio: Date | string = '2026-10-20T12:00:00-03:00'): RelogioTeste {
  let atual = new Date(inicio);
  return {
    agora: () => new Date(atual),
    definir: (d) => {
      atual = new Date(d);
    },
    avancar: (ms) => {
      atual = new Date(atual.getTime() + ms);
    },
  };
}

export interface Deps {
  db: BancoDados;
  asaas: ClienteAsaas;
  mailer: Mailer;
  relogio: Relogio;
  config: Config;
  rng: Rng;
  log: FastifyBaseLogger;
  /** Envia um e-mail sem bloquear a resposta (falhas vão para o log). */
  enviarEmail(m: MensagemEmail): void;
  /** Espera as tarefas em segundo plano (e-mails). Útil em testes. */
  aguardarTarefas(): Promise<void>;
}

export type Usuario = typeof schema.usuarios.$inferSelect;

export interface UsuarioSessao extends Usuario {
  sessaoId: string;
  /** D13: quando a sessão foi confirmada com o 2FA (null = ainda não). */
  sessaoDoisFatoresEm: Date | null;
}
