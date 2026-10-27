import { describe, expect, it } from 'vitest';
import {
  classificarDocumentoPci,
  escolherPorHorario,
  lerIdentificacaoConcurso,
  lerMarcaPci,
  mesmoConcurso,
  parearPorHorario,
  type DocumentoPci,
} from '../src/importacao/pareamento.js';

const MARCA = 'pcimarkpci MDAwMDowMDAwOjAwMDA6MDAwMDowMDAwOmZmZmY6MmRlNDo3OGM4:';
const marca = (texto: string) =>
  `pcimarkpci MDAwMDowMDAwOjAwMDA6MDAwMDowMDAwOmZmZmY6MmRlNDo3OGM4:${Buffer.from(texto).toString('base64')}`;

const CADERNO = `${MARCA}U2F0LCAyNCBPY3QgMjAyNiAxNjoxNTo0MyAtMDMwMA==

                        PREFEITURA DO MUNICÍPIO DE QUARTO CENTENÁRIO
           CONCURSO PÚBLICO Nº 01/2025 - EDITAL DE ABERTURA Nº 001/2025

                                            DATA DA PROVA: 01/06/2025
                              CARGO: AGENTE ADMINISTRATIVO
     40 (quarenta) questões de múltipla escolha, com 5 alternativas`;

const GABARITO = `${MARCA}U2F0LCAyNCBPY3QgMjAyNiAxNjoxNTo0NCAtMDMwMA==

                                         GABARITO PRELIMINAR
                                   CONCURSO PÚBLICO N° 01/2025

       A Presidente da Comissão do Concurso Público da Prefeitura Municipal de Quarto
Centenário-PR, no uso de suas atribuições legais, TORNA PÚBLICO o GABARITO
PRELIMINAR do Concurso n° 01/2025, como segue:`;

const doc = (
  arquivo: string,
  tipo: 'caderno' | 'gabarito',
  hora: string,
  texto?: string,
): DocumentoPci => ({
  arquivo,
  tipo,
  baixadoEm: new Date(`2026-10-24T${hora}-03:00`),
  concurso: texto ? lerIdentificacaoConcurso(texto) : null,
});

describe('marca d’água do PCI', () => {
  it('decodifica a data com segundos e o fuso', () => {
    const d = lerMarcaPci(CADERNO)!;
    expect(d.toISOString()).toBe('2026-10-24T19:15:43.000Z');
    expect(lerMarcaPci(GABARITO)!.getTime() - d.getTime()).toBe(1000);
  });

  it('aceita a marca sem o separador e o base64 sem preenchimento', () => {
    const b64 = Buffer.from('Sat, 24 Oct 2026 12:28:58 -0300')
      .toString('base64')
      .replace(/=+$/, '');
    expect(lerMarcaPci(`pcimarkpci ${b64}`)!.toISOString()).toBe('2026-10-24T15:28:58.000Z');
  });

  it('devolve null sem marca ou com marca ilegível', () => {
    expect(lerMarcaPci('GABARITO DEFINITIVO')).toBeNull();
    expect(lerMarcaPci('pcimarkpci AAAA:BBBB')).toBeNull();
    expect(lerMarcaPci(marca('não é uma data'))).toBeNull();
  });
});

describe('identificação do documento', () => {
  it('separa caderno e gabarito', () => {
    expect(classificarDocumentoPci(CADERNO)).toBe('caderno');
    expect(classificarDocumentoPci(GABARITO)).toBe('gabarito');
    expect(classificarDocumentoPci('RETIFICAÇÃO GABARITO PRELIMINAR - NÍVEL MÉDIO\nCONCURSO')).toBe(
      'gabarito',
    );
    expect(classificarDocumentoPci('Edital qualquer')).toBeNull();
  });

  it('lê município, número e ano nos dois formatos', () => {
    expect(lerIdentificacaoConcurso(CADERNO)).toEqual({
      municipio: 'QUARTO CENTENARIO',
      numero: 1,
      ano: 2025,
    });
    expect(lerIdentificacaoConcurso(GABARITO)).toEqual({
      municipio: 'QUARTO CENTENARIO',
      numero: 1,
      ano: 2025,
    });
    expect(
      lerIdentificacaoConcurso(
        'GABARITO DEFINITIVO\nCONCURSO PÚBLICO N° 02/2026\nPrefeitura Municipal de Rio Azul/PR, no uso de suas atribuições',
      ),
    ).toEqual({ municipio: 'RIO AZUL', numero: 2, ano: 2026 });
    expect(
      lerIdentificacaoConcurso(
        'CÂMARA DO MUNICÍPIO DE MATELÂNDIA\nCONCURSO PÚBLICO Nº 001/2025 - EDITAL',
      ).municipio,
    ).toBe('MATELANDIA');
    expect(lerIdentificacaoConcurso('sem nada').municipio).toBeNull();
  });

  it('compara os concursos, tolerando o que falta', () => {
    const a = { municipio: 'RIO AZUL', numero: 1, ano: 2026 };
    expect(mesmoConcurso(a, { ...a })).toBe(true);
    expect(mesmoConcurso(a, { ...a, numero: 2 })).toBe(false);
    expect(mesmoConcurso(a, { municipio: 'TOLEDO', numero: 1, ano: 2026 })).toBe(false);
    expect(mesmoConcurso(a, { municipio: null, numero: 1, ano: 2026 })).toBe(true);
    expect(mesmoConcurso(a, { municipio: null, numero: null, ano: null })).toBeNull();
    expect(mesmoConcurso(a, null)).toBeNull();
  });
});

describe('pareamento por horário', () => {
  const rio1 = 'PREFEITURA DO MUNICÍPIO DE RIO AZUL\nCONCURSO PÚBLICO Nº 01/2026';
  const rio2 =
    'GABARITO DEFINITIVO\nCONCURSO PÚBLICO N° 02/2026\nda Prefeitura Municipal de Rio Azul/PR, no uso';
  const terra =
    'GABARITO PRELIMINAR\nCONCURSO PÚBLICO N° 01/2026\nda Prefeitura Municipal de Terra Roxa-PR, no uso';

  it('liga cada gabarito ao caderno mais próximo, antes ou depois', () => {
    const docs = [
      doc('caderno-a.pdf', 'caderno', '16:15:43', CADERNO),
      doc('gabarito-a.pdf', 'gabarito', '16:15:44', GABARITO),
      // Fila seguinte: o gabarito sai 1 s ANTES do caderno.
      doc('gabarito-b.pdf', 'gabarito', '16:15:49', GABARITO),
      doc('caderno-b.pdf', 'caderno', '16:15:50', CADERNO),
    ];
    const r = parearPorHorario(docs);
    expect(r.gabaritosSemCaderno).toEqual([]);
    expect(r.pares.map((p) => [p.caderno, p.gabaritos.map((g) => g.arquivo)])).toEqual([
      ['caderno-a.pdf', ['gabarito-a.pdf']],
      ['caderno-b.pdf', ['gabarito-b.pdf']],
    ]);
    expect(r.pares[0]!.gabaritos[0]).toMatchObject({ diferencaSegundos: 1, concursoConfere: true });
    expect(r.pares[1]!.gabaritos[0]!.diferencaSegundos).toBe(-1);
  });

  it('descarta o gabarito de outro concurso mesmo bem perto no tempo', () => {
    const docs = [
      doc('fono.pdf', 'caderno', '16:16:39', rio1),
      doc('terra-roxa.pdf', 'gabarito', '16:16:35', terra),
      doc('rio-azul-02.pdf', 'gabarito', '16:16:40', rio2),
    ];
    const r = parearPorHorario(docs);
    expect(r.pares[0]!.gabaritos).toEqual([]);
    expect(r.gabaritosSemCaderno).toEqual(['terra-roxa.pdf', 'rio-azul-02.pdf']);
  });

  it('aceita vários gabaritos para o mesmo caderno e ordena pelo mais próximo', () => {
    const docs = [
      doc('c.pdf', 'caderno', '10:00:10', CADERNO),
      doc('g-def.pdf', 'gabarito', '10:00:14', GABARITO),
      doc('g-pre.pdf', 'gabarito', '10:00:11', GABARITO),
    ];
    const r = parearPorHorario(docs, { janelaSegundos: 5 });
    expect(r.pares[0]!.gabaritos.map((g) => g.arquivo)).toEqual(['g-pre.pdf', 'g-def.pdf']);
  });

  it('respeita a janela e empata a favor do caderno baixado antes', () => {
    const docs = [
      doc('c1.pdf', 'caderno', '10:00:00'),
      doc('c2.pdf', 'caderno', '10:00:04'),
      doc('g.pdf', 'gabarito', '10:00:02'),
      doc('longe.pdf', 'gabarito', '10:01:00'),
    ];
    const r = parearPorHorario(docs);
    expect(r.pares[0]!.gabaritos.map((g) => g.arquivo)).toEqual(['g.pdf']);
    expect(r.pares[1]!.gabaritos).toEqual([]);
    expect(r.pares[0]!.gabaritos[0]!.concursoConfere).toBeNull();
    expect(r.gabaritosSemCaderno).toEqual(['longe.pdf']);
  });

  it('desempata candidatos pelo horário', () => {
    const caderno = new Date('2026-10-24T16:17:30-03:00');
    const em = (s: string) => new Date(`2026-10-24T${s}-03:00`);
    expect(escolherPorHorario(caderno, [em('16:17:32'), em('16:55:49'), em('16:17:20')])).toBe(0);
    expect(escolherPorHorario(caderno, [em('16:17:29'), em('16:17:31')])).toBeNull();
    expect(escolherPorHorario(caderno, [em('17:00:00')])).toBeNull();
    expect(escolherPorHorario(caderno, [])).toBeNull();
  });
});
