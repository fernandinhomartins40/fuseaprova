/**
 * Pacote offline (GET /offline/pacote): próximas 3 lições + toda a revisão vencida,
 * guardado no IndexedDB. O gabarito vem cifrado (AES-GCM) e só é decifrado na hora da
 * correção local, com as funções de @fuse/shared. Invalidação pela versao_conteudo.
 */
import { decifrarTexto } from '@fuse/shared';
import { GabaritoOfflineClaro, type LicaoOffline, type QuestaoOffline } from '@fuse/shared/api';
import { chamar } from '../api/cliente';
import { abrirDb, CHAVE_PACOTE, type PacoteGuardado } from './db';

/** Caches do service worker com respostas da API (limpar ao trocar versão ou sair). */
export const CACHES_API = ['fuse-conteudo', 'fuse-estado'];

export async function obterPacote(usuarioId?: string): Promise<PacoteGuardado | null> {
  const db = await abrirDb();
  const p = (await db.get('pacote', CHAVE_PACOTE)) ?? null;
  if (p && usuarioId && p.usuarioId !== usuarioId) return null;
  if (p && new Date(p.expiraEm).getTime() < Date.now()) return null;
  return p;
}

export async function salvarPacote(p: PacoteGuardado) {
  const db = await abrirDb();
  await db.put('pacote', p, CHAVE_PACOTE);
}

export async function apagarPacote() {
  const db = await abrirDb();
  await db.delete('pacote', CHAVE_PACOTE);
}

/** Baixa um pacote novo e guarda (substitui o anterior). */
export async function baixarPacote(usuarioId: string): Promise<PacoteGuardado> {
  const r = await chamar('offlinePacote', { semRedirecionar: true });
  const p: PacoteGuardado = {
    ...r,
    usuarioId,
    salvoEm: new Date().toISOString(),
    licoesFeitas: [],
    revisaoFeita: [],
  };
  await salvarPacote(p);
  return p;
}

/** Limpa os caches de API do service worker (nova versão de conteúdo ou logout). */
export async function limparCachesApi() {
  if (typeof caches === 'undefined') return;
  await Promise.all(CACHES_API.map((c) => caches.delete(c).catch(() => false)));
}

/**
 * Confere a versão do conteúdo informada por GET /me. Se mudou (ex.: questão retirada no
 * admin), descarta o pacote e os caches de conteúdo e baixa de novo.
 */
export async function conferirVersao(usuarioId: string, versaoConteudo: number): Promise<boolean> {
  const atual = await obterPacote(usuarioId);
  if (atual && atual.versaoConteudo === versaoConteudo) return false;
  if (atual) {
    await apagarPacote();
    await limparCachesApi();
  }
  return true;
}

export async function decifrarGabarito(
  chave: string,
  q: QuestaoOffline,
): Promise<GabaritoOfflineClaro> {
  const claro = await decifrarTexto(chave, q.id, q.cifrado);
  return GabaritoOfflineClaro.parse(JSON.parse(claro));
}

export async function licaoDoPacote(
  usuarioId: string,
  licaoId: string,
): Promise<{ licao: LicaoOffline; pacote: PacoteGuardado } | null> {
  const p = await obterPacote(usuarioId);
  if (!p) return null;
  const l = p.licoes.find((x) => x.licao.id === licaoId);
  return l ? { licao: l, pacote: p } : null;
}

/** Próxima lição do pacote ainda não feita offline. */
export async function proximaLicaoOffline(usuarioId: string): Promise<LicaoOffline | null> {
  const p = await obterPacote(usuarioId);
  if (!p) return null;
  return p.licoes.find((l) => !p.licoesFeitas.includes(l.licao.id)) ?? null;
}

/** Revisão vencida do pacote que ainda não foi respondida offline (até 10). */
export async function revisaoDoPacote(
  usuarioId: string,
  limite = 10,
): Promise<{ questoes: QuestaoOffline[]; pacote: PacoteGuardado } | null> {
  const p = await obterPacote(usuarioId);
  if (!p) return null;
  const questoes = p.revisao.filter((q) => !p.revisaoFeita.includes(q.id)).slice(0, limite);
  return { questoes, pacote: p };
}

export async function marcarFeito(
  usuarioId: string,
  o: { licaoId?: string | null; questoesRevisao?: string[] },
) {
  const p = await obterPacote(usuarioId);
  if (!p) return;
  if (o.licaoId && !p.licoesFeitas.includes(o.licaoId)) p.licoesFeitas.push(o.licaoId);
  for (const q of o.questoesRevisao ?? []) if (!p.revisaoFeita.includes(q)) p.revisaoFeita.push(q);
  await salvarPacote(p);
}
