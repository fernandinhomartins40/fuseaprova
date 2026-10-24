import { describe, expect, it } from 'vitest';
import {
  AVISO_EDITAL,
  fraseOfensiva,
  primeiroNome,
  RODAPE_LEGAL,
  textoChipOrigem,
  textoFaltamParaBau,
  textoLembrete,
  textoQuestoesParaHoje,
  textoRegraLiga,
  textoSemVidas,
  textoStatusEdital,
  textoTerminaEmDias,
  tituloAcerto,
  tituloErro,
  TITULOS_ACERTO,
} from './copy.js';
import {
  centavosParaReais,
  corDoAvatar,
  CORES_AVATAR,
  formatarCronometro,
  formatarDuracao,
  formatarReais,
  formatarTempoLicao,
  iniciais,
  nomeComSobrenomeAbreviado,
  slugificar,
} from './formatacao.js';
import { criarRng, embaralhar, escolher, inteiroAleatorio } from './aleatorio.js';
import { MS_HORA, MS_MINUTO } from './datas.js';

describe('copy (PRD 11)', () => {
  it('textos fixos', () => {
    expect(AVISO_EDITAL).toContain('sem custo extra');
    expect(RODAPE_LEGAL).toBe(
      'Fuse Aprova não tem vínculo com a FAU-Unicentro nem com a Prefeitura de Palmital.',
    );
  });

  it('título de acerto varia e usa o primeiro nome', () => {
    const vistos = new Set<string>();
    const rng = criarRng(7);
    for (let i = 0; i < 200; i++) vistos.add(tituloAcerto('Marina Souza', rng));
    expect(vistos).toEqual(
      new Set(['Mandou bem!', 'Isso aí!', 'Certinho!', 'Boa, Marina!', 'Tá voando!']),
    );
    for (let i = 0; i < 50; i++) expect(tituloAcerto(null, rng)).not.toContain('{nome}');
    expect(TITULOS_ACERTO).toHaveLength(5);
    expect(typeof tituloAcerto('Ana Lima')).toBe('string');
    expect(primeiroNome('  Carlos  Alberto ')).toBe('Carlos');
  });

  it('título de erro sem culpa', () => {
    expect(tituloErro('C')).toBe('Resposta correta: C');
  });

  it('sem vidas', () => {
    expect(textoSemVidas(3 * MS_HORA + 20 * MS_MINUTO)).toBe(
      'Suas vidas acabaram. Pratique seus erros para recuperar, ou volte em 3 h 20 min.',
    );
  });

  it('lembretes e textos de contagem', () => {
    expect(textoLembrete(8)).toBe('Sua ofensiva de 8 dias está em risco.');
    expect(textoLembrete(0)).toContain('A Capi está te esperando');
    expect(textoTerminaEmDias(1)).toBe('termina hoje');
    expect(textoTerminaEmDias(4)).toBe('termina em 4 dias');
    expect(textoRegraLiga(3)).toBe('Os 3 primeiros sobem de liga · termina em 3 dias');
    expect(textoQuestoesParaHoje(1)).toBe('1 questão para hoje');
    expect(textoQuestoesParaHoje(12)).toBe('12 questões para hoje');
    expect(textoFaltamParaBau(1)).toBe('Falta 1 lição para o baú!');
    expect(textoFaltamParaBau(2)).toBe('Faltam 2 lições para o baú!');
  });

  it('frase da ofensiva por faixa', () => {
    expect(new Set([1, 3, 10, 40].map(fraseOfensiva)).size).toBe(4);
  });

  it('chip de origem', () => {
    expect(textoChipOrigem({ origem: 'fau_real', orgao: 'Prefeitura de Realeza', ano: 2026 })).toBe(
      'FAU-Unicentro · Prefeitura de Realeza · 2026',
    );
    expect(textoChipOrigem({ origem: 'fau_real', orgao: 'Câmara de Irati', ano: null })).toBe(
      'FAU-Unicentro · Câmara de Irati',
    );
    expect(textoChipOrigem({ origem: 'autoral' })).toBe('Questão Fuse Aprova · estilo FAU');
  });

  it('status do edital', () => {
    expect(textoStatusEdital('aguardando_edital')).toBe('em elaboração pela FAU');
    expect(textoStatusEdital('edital_publicado')).toBe('publicado: veja seus cargos');
    expect(textoStatusEdital('edital_publicado', '14/03')).toBe('prova em 14/03');
    expect(textoStatusEdital('prova_realizada', '14/03')).toBe('prova realizada');
    expect(textoStatusEdital('homologado')).toBe('concurso homologado');
  });
});

describe('formatação', () => {
  it('reais', () => {
    expect(formatarReais(39700)).toBe('R$ 397,00');
    expect(formatarReais(123456789)).toBe('R$ 1.234.567,89');
    expect(formatarReais(-505)).toBe('-R$ 5,05');
    expect(centavosParaReais(39700)).toBe(397);
  });

  it('durações e cronômetros', () => {
    expect(formatarDuracao(0)).toBe('menos de 1 min');
    expect(formatarDuracao(45 * MS_MINUTO)).toBe('45 min');
    expect(formatarDuracao(4 * MS_HORA)).toBe('4 h');
    expect(formatarDuracao(MS_HORA + 1)).toBe('1 h 1 min');
    expect(formatarCronometro(4 * MS_HORA)).toBe('4:00:00');
    expect(formatarCronometro(3 * MS_MINUTO + 7000)).toBe('03:07');
    expect(formatarTempoLicao(155_000)).toBe('2:35');
    expect(formatarTempoLicao(MS_HORA + 5 * MS_MINUTO)).toBe('1 h 05 min');
  });

  it('nomes e avatar', () => {
    expect(iniciais('Marina Souza Lima')).toBe('ML');
    expect(iniciais('marina')).toBe('M');
    expect(iniciais(' ')).toBe('?');
    expect(nomeComSobrenomeAbreviado('Marina Souza da Lima')).toBe('Marina S. L.');
    expect(nomeComSobrenomeAbreviado('Marina')).toBe('Marina');
    expect(nomeComSobrenomeAbreviado('')).toBe('');
    const cor = corDoAvatar('3f2a');
    expect(CORES_AVATAR).toContain(cor);
    expect(corDoAvatar('3f2a')).toBe(cor);
    expect(slugificar('Crase e Regência!')).toBe('crase-e-regencia');
  });
});

describe('aleatório', () => {
  it('é reproduzível com semente', () => {
    const a = criarRng('fuse');
    const b = criarRng('fuse');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const r = criarRng(42);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('embaralha sem perder itens e escolhe', () => {
    const l = [1, 2, 3, 4, 5, 6];
    const e = embaralhar(l, criarRng(3));
    expect([...e].sort()).toEqual(l);
    expect(l).toEqual([1, 2, 3, 4, 5, 6]);
    expect(escolher([], criarRng(1))).toBeUndefined();
    expect(l).toContain(escolher(l, criarRng(1)));
    expect(inteiroAleatorio(10, () => 0.999)).toBe(9);
  });
});
