/**
 * Fila de respostas offline (IndexedDB) e sync por POST /sync/tentativas.
 * O envio é em lote e idempotente por `idCliente`: reenviar não duplica. O servidor
 * recalcula XP, vidas, ofensiva e revisão; o cliente só mostra o que volta.
 */
import type { SyncResposta } from '@fuse/shared/api';
import { chamar } from '../api/cliente';
import { abrirDb, type SessaoPendente, type TentativaPendente } from './db';
import { obterPacote } from './pacote';

export function novoId(): string {
  return crypto.randomUUID();
}

export async function registrarSessao(s: SessaoPendente) {
  const db = await abrirDb();
  await db.put('sessoes', s);
}

export async function concluirSessaoOffline(
  idCliente: string,
  concluidaEm = new Date().toISOString(),
) {
  const db = await abrirDb();
  const s = await db.get('sessoes', idCliente);
  if (s) await db.put('sessoes', { ...s, concluidaEm });
}

export async function registrarTentativa(t: TentativaPendente) {
  const db = await abrirDb();
  await db.put('tentativas', t);
}

export async function pendentes(
  usuarioId: string,
): Promise<{ sessoes: SessaoPendente[]; tentativas: TentativaPendente[] }> {
  const db = await abrirDb();
  const [sessoes, tentativas] = await Promise.all([db.getAll('sessoes'), db.getAll('tentativas')]);
  return {
    sessoes: sessoes.filter((s) => s.usuarioId === usuarioId),
    tentativas: tentativas.filter((t) => t.usuarioId === usuarioId),
  };
}

export async function contarPendentes(usuarioId: string): Promise<number> {
  return (await pendentes(usuarioId)).tentativas.length;
}

let emAndamento: Promise<SyncResposta | null> | null = null;

/**
 * Envia a fila. Devolve null se não havia nada (ou sem conexão). Tentativas aceitas,
 * duplicadas ou rejeitadas saem da fila; sessões sem tentativas pendentes também.
 * Sessões em aberto (sem `concluidaEm`) há mais de 6 h são enviadas como abandonadas.
 */
export function sincronizar(usuarioId: string): Promise<SyncResposta | null> {
  if (!emAndamento) {
    emAndamento = (async () => {
      const { sessoes, tentativas } = await pendentes(usuarioId);
      if (tentativas.length === 0 && sessoes.length === 0) return null;
      const pacote = await obterPacote(usuarioId);
      const lote = tentativas.slice(0, 500);
      const idsSessao = new Set(lote.map((t) => t.sessaoIdCliente));
      const sessoesLote = sessoes
        .filter((s) => idsSessao.has(s.idCliente) || s.concluidaEm)
        .slice(0, 50);
      const resp = await chamar('syncTentativas', {
        semRedirecionar: true,
        corpo: {
          pacoteId: pacote?.pacoteId ?? null,
          sessoes: sessoesLote.map(({ usuarioId: _u, ...s }) => s),
          tentativas: lote.map(({ usuarioId: _u, ...t }) => t),
        },
      });
      const db = await abrirDb();
      const tx = db.transaction(['tentativas', 'sessoes'], 'readwrite');
      const resolvidas = new Set([
        ...resp.aceitas,
        ...resp.duplicadas,
        ...resp.rejeitadas.map((r) => r.idCliente),
      ]);
      for (const id of resolvidas) await tx.objectStore('tentativas').delete(id);
      const restantes = (await tx.objectStore('tentativas').getAll()).filter(
        (t) => t.usuarioId === usuarioId,
      );
      const comPendencia = new Set(restantes.map((t) => t.sessaoIdCliente));
      const seisHoras = Date.now() - 6 * 3600_000;
      for (const s of sessoesLote) {
        const enviada = s.concluidaEm || new Date(s.iniciadaEm).getTime() < seisHoras;
        if (!comPendencia.has(s.idCliente) && enviada)
          await tx.objectStore('sessoes').delete(s.idCliente);
      }
      await tx.done;
      return resp;
    })().finally(() => {
      emAndamento = null;
    });
  }
  return emAndamento;
}

/** Apaga tudo do IndexedDB (logout / exclusão de conta). */
export async function limparTudo() {
  const db = await abrirDb();
  await Promise.all([db.clear('pacote'), db.clear('sessoes'), db.clear('tentativas')]);
}
