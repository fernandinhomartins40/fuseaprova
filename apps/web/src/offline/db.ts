/**
 * IndexedDB da PWA (lib `idb`): pacote offline e fila de respostas para o sync.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PacoteOfflineResposta, SessaoOffline, TentativaOffline } from '@fuse/shared/api';

export interface PacoteGuardado extends PacoteOfflineResposta {
  /** Dono do pacote (trocar de conta descarta). */
  usuarioId: string;
  salvoEm: string;
  /** Lições já feitas offline com este pacote (não repetir). */
  licoesFeitas: string[];
  /** Questões de revisão já respondidas offline com este pacote. */
  revisaoFeita: string[];
}

export interface SessaoPendente extends SessaoOffline {
  usuarioId: string;
}

export interface TentativaPendente extends TentativaOffline {
  usuarioId: string;
}

interface FuseDB extends DBSchema {
  pacote: { key: string; value: PacoteGuardado };
  sessoes: { key: string; value: SessaoPendente };
  tentativas: { key: string; value: TentativaPendente; indexes: { porSessao: string } };
}

const NOME = 'fuse-aprova';
const VERSAO = 1;
let conexao: Promise<IDBPDatabase<FuseDB>> | null = null;

export function abrirDb(): Promise<IDBPDatabase<FuseDB>> {
  if (!conexao) {
    conexao = openDB<FuseDB>(NOME, VERSAO, {
      upgrade(db) {
        db.createObjectStore('pacote');
        db.createObjectStore('sessoes', { keyPath: 'idCliente' });
        const t = db.createObjectStore('tentativas', { keyPath: 'idCliente' });
        t.createIndex('porSessao', 'sessaoIdCliente');
      },
    });
  }
  return conexao;
}

/** Só para testes: fecha e esquece a conexão. */
export async function fecharDb() {
  if (conexao) (await conexao).close();
  conexao = null;
}

export const CHAVE_PACOTE = 'atual';
