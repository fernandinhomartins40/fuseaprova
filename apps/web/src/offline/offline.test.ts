import { beforeEach, describe, expect, it } from 'vitest';
import { ligarApiSimulada } from '../test/apiSimulada';
import { abrirDb } from './db';
import { contarPendentes, limparTudo, pendentes, sincronizar } from './fila';
import { iniciarSessao } from './motor';
import {
  baixarPacote,
  conferirVersao,
  decifrarGabarito,
  obterPacote,
  proximaLicaoOffline,
} from './pacote';

const USUARIO = '00000000-0000-4000-8000-00000000a001';
const CTX = { usuarioId: USUARIO, nome: 'Marina Souza', vidas: 5, gemas: 100 };

describe('pacote offline e fila de sync', () => {
  beforeEach(async () => {
    await abrirDb();
    await limparTudo();
  });

  it('baixa o pacote (3 lições + revisão) e decifra o gabarito com as funções compartilhadas', async () => {
    const api = ligarApiSimulada();
    await api.cenario('aluno');
    const p = await baixarPacote(USUARIO);
    expect(p.licoes.length).toBeLessThanOrEqual(3);
    expect(p.licoes.length).toBeGreaterThan(0);
    expect(p.revisao.length).toBeGreaterThan(0);
    const q = p.licoes[0]!.questoes[0]!;
    expect(JSON.stringify(q)).not.toContain('"gabarito"');
    const g = await decifrarGabarito(p.chave, q);
    expect(['A', 'B', 'C', 'D', 'E']).toContain(g.gabarito);
    expect(g.explicacao.length).toBeGreaterThan(0);
    expect(await obterPacote('outro-usuario')).toBeNull();
  });

  it('invalida o pacote quando a versão do conteúdo muda', async () => {
    const api = ligarApiSimulada();
    await api.cenario('aluno');
    await baixarPacote(USUARIO);
    expect(await conferirVersao(USUARIO, 1)).toBe(false);
    expect(await conferirVersao(USUARIO, 2)).toBe(true);
    expect(await obterPacote(USUARIO)).toBeNull();
  });

  it('em modo avião faz a próxima lição pelo pacote, enfileira e sincroniza sem duplicar', async () => {
    const api = ligarApiSimulada();
    await api.cenario('aluno');
    await baixarPacote(USUARIO);
    const proxima = await proximaLicaoOffline(USUARIO);
    expect(proxima).not.toBeNull();

    // Sem conexão: fetch falha.
    const online = api.fn.getMockImplementation()!;
    api.fn.mockImplementation(async () => {
      throw new TypeError('Failed to fetch');
    });
    const s = await iniciarSessao({ tipo: 'licao', licaoId: proxima!.licao.id }, CTX);
    expect(s.modo).toBe('offline');
    for (const q of s.questoes) {
      const r = await s.responder(q.id, 'A', 1000);
      expect(r.xpGanho).toBeNull();
      expect(r.titulo.length).toBeGreaterThan(0);
    }
    const fim = await s.concluir();
    expect(fim.offline).toBe(true);
    expect(await contarPendentes(USUARIO)).toBe(s.questoes.length);
    expect(await proximaLicaoOffline(USUARIO)).not.toEqual(proxima);

    // Revisão vencida também funciona offline.
    const rev = await iniciarSessao({ tipo: 'revisao' }, CTX);
    expect(rev.modo).toBe('offline');
    expect(rev.gastaVidas).toBe(false);

    // A conexão volta: envia o lote e limpa a fila.
    api.fn.mockImplementation(online);
    const tentativas = (await pendentes(USUARIO)).tentativas;
    const r = await sincronizar(USUARIO);
    expect(r?.aceitas.length).toBe(tentativas.length);
    expect(await contarPendentes(USUARIO)).toBe(0);

    // Reenviar o mesmo lote não duplica (idempotente por idCliente).
    const db = await abrirDb();
    for (const t of tentativas) await db.put('tentativas', t);
    const r2 = await sincronizar(USUARIO);
    expect(r2?.aceitas).toEqual([]);
    expect(r2?.duplicadas.length).toBe(tentativas.length);
    expect(r2?.xpGanho).toBe(0);
  });

  it('sem pacote e sem conexão, avisa que a lição não está offline', async () => {
    const api = ligarApiSimulada();
    api.fn.mockImplementation(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(
      iniciarSessao({ tipo: 'licao', licaoId: '00000000-0000-4000-8000-000000000999' }, CTX),
    ).rejects.toMatchObject({
      codigo: 'sem_conexao',
    });
  });
});
