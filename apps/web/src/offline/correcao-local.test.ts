import { beforeEach, describe, expect, it } from 'vitest';
import { decifrarTexto } from '@fuse/shared';
import { ligarApiSimulada } from '../test/apiSimulada';
import { abrirDb } from './db';
import { limparTudo } from './fila';
import { iniciarSessao } from './motor';

const USUARIO = '00000000-0000-4000-8000-00000000a002';
const CTX = { usuarioId: USUARIO, nome: 'Marina Souza', vidas: 5, gemas: 100 };

/** D28: correção instantânea. O feedback não espera a rede; a API confirma em seguida. */
describe('correção local na sessão online', () => {
  beforeEach(async () => {
    await abrirDb();
    await limparTudo();
  });

  async function iniciar() {
    const api = ligarApiSimulada();
    await api.cenario('aluno');
    const trilha = await (await fetch('/api/trilha')).json();
    const licaoId = trilha.atual.licaoId as string;
    const ini = await (await fetch(`/api/licoes/${licaoId}/iniciar`, { method: 'POST' })).json();
    return { api, licaoId, ini };
  }

  it('mostra o resultado antes da resposta da API e conclui só depois de todas chegarem', async () => {
    const { api, licaoId } = await iniciar();
    const s = await iniciarSessao({ tipo: 'licao', licaoId }, CTX);
    expect(s.modo).toBe('online');

    // A rede "trava" o responder até liberarmos.
    const original = api.fn.getMockImplementation()!;
    let liberar: () => void = () => undefined;
    const portao = new Promise<void>((ok) => (liberar = ok));
    let enviados = 0;
    api.fn.mockImplementation(async (entrada, init) => {
      if (String(entrada).includes('/responder')) {
        enviados++;
        await portao;
      }
      return original(entrada, init);
    });

    for (const q of s.questoes) {
      const r = await s.responder(q.id, 'A', 1000);
      expect(['A', 'B', 'C', 'D', 'E']).toContain(r.gabarito);
      expect(r.explicacao.length).toBeGreaterThan(0);
      expect(r.xpGanho).toBe(r.acertou ? 10 : 0);
      expect(r.confirmacao).toBeInstanceOf(Promise);
    }
    expect(enviados).toBe(s.questoes.length);

    let concluiu = false;
    const fim = s.concluir().then((f) => {
      concluiu = true;
      return f;
    });
    await new Promise((ok) => setTimeout(ok, 30));
    expect(concluiu).toBe(false);
    liberar();
    const f = await fim;
    expect(f.offline).toBeFalsy();
    expect(f.total).toBe(s.questoes.length);
  });

  it('a API é a fonte da verdade: a confirmação traz o resultado dela', async () => {
    const { licaoId } = await iniciar();
    const s = await iniciarSessao({ tipo: 'licao', licaoId }, CTX);
    const q = s.questoes[0]!;
    const r = await s.responder(q.id, 'B', 1000);
    const srv = await r.confirmacao!;
    expect(srv.acertou).toBe(r.acertou);
    expect(srv.gabarito).toBe(r.gabarito);
  });

  it('o gabarito vem cifrado (não legível no JSON da sessão)', async () => {
    const { ini } = await iniciar();
    expect(JSON.stringify(ini.questoes)).not.toContain('"gabarito"');
    const id = ini.questoes[0].id as string;
    const claro = JSON.parse(await decifrarTexto(ini.correcaoLocal.chave, id, ini.correcaoLocal.cifrados[id]));
    expect(['A', 'B', 'C', 'D', 'E']).toContain(claro.gabarito);
  });
});
