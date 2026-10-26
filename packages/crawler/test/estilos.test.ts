import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseCaderno, semMarcas } from '../src/importacao/caderno.js';
import {
  acharPython,
  aplicarEstilos,
  extrairEstilosPdf,
  type RunEstilo,
} from '../src/importacao/estilos.js';
import { extrairCaderno } from '../src/importacao/importar.js';
import { ABRE_NEGRITO as AB, FECHA_NEGRITO as FB } from '../src/importacao/marcas.js';
import { temPdftotext } from './ajuda.js';

const run = (t: string, a = '', d = '', e: RunEstilo['e'] = 'u', L = false): RunEstilo => ({
  t,
  e,
  a,
  d,
  L,
});

describe('aplicarEstilos (puro)', () => {
  it('marca o destaque certo usando o contexto quando a palavra se repete', () => {
    const texto = 'Em seminário, aprendi.\nVivi em casa, em paz.\n';
    // O "em" sublinhado é o primeiro depois de "Vivi".
    const r = aplicarEstilos(texto, {
      paginas: [{ runs: [run('em', 'Vivi', 'casa,')] }],
    });
    expect(r.texto).toBe('Em seminário, aprendi.\nVivi **em** casa, em paz.\n');
    expect(r.aplicados).toBe(1);
  });

  it('mesma frase duas vezes na página: o sublinhado vai para a ocorrência certa (k)', () => {
    const texto =
      'Vivi um exemplo em seminário na França.\nB) Vivi um exemplo em seminário na França.\n';
    const r = aplicarEstilos(texto, {
      paginas: [{ runs: [{ ...run('seminário na França', 'umexemploem', '.'), k: 1 }] }],
    });
    expect(r.texto).toBe(
      'Vivi um exemplo em seminário na França.\nB) Vivi um exemplo em **seminário na França**.\n',
    );
  });

  it('trecho que atravessa a quebra de linha fecha e reabre a marca em cada linha', () => {
    const r = aplicarEstilos('Leia a expressão certezas\ninabaláveis no texto.\n', {
      paginas: [{ runs: [run('certezas inabaláveis', 'expressão', 'notexto.')] }],
    });
    expect(r.texto).toBe('Leia a expressão **certezas**\n**inabaláveis** no texto.\n');
  });

  it('sublinhado vira **; negrito vira marca provisória; itálico vira *; sobreposição é descartada', () => {
    const r = aplicarEstilos('Assinale a INCORRETA e o termo ex-libris em latim.\n', {
      paginas: [
        {
          runs: [
            run('INCORRETA', 'Assinalea', 'eotermo', 'b'),
            run('ex-libris', 'otermo', 'emlatim.', 'i'),
            run('RETA', 'INCOR', 'eotermo', 'i'),
            run('ex-libris', 'otermo', 'emlatim.', 'u'),
          ],
        },
      ],
    });
    expect(r.texto).toBe(`Assinale a ${AB}INCORRETA${FB} e o termo **ex-libris** em latim.\n`);
    expect(r.aplicados).toBe(2);
  });

  it('descarta ruído: link, comando em negrito (termina em ":") e trecho longo', () => {
    const texto =
      'Fonte: https://www.exemplo.com.br/a/b/c e depois\n' +
      'Assinale a alternativa correta: uma frase bem comprida que não é destaque nenhum no texto\n';
    const r = aplicarEstilos(texto, {
      paginas: [
        {
          runs: [
            run('https://www.exemplo.com.br/a/b/c', 'Fonte:', 'edepois'),
            run('correta:', 'alternativa', 'umafrase', 'b'),
            run('uma frase bem comprida que não é destaque nenhum', 'correta:', 'notexto', 'i'),
          ],
        },
      ],
    });
    expect(r.texto).toBe(texto);
    expect(r.aplicados).toBe(0);
  });

  it('ignora linha inteira estilizada (título, citação) e conta o que não acha', () => {
    const r = aplicarEstilos('TEXTO 1\nUma frase comum bem longa aqui.\n', {
      paginas: [
        {
          runs: [
            run('TEXTO 1', '', 'Umafrase', 'u', true),
            run('palavra inexistente', 'x', 'y'),
            run('Uma frase comum bem longa aqui.', 'TEXTO1', '', 'u', true),
          ],
        },
      ],
    });
    expect(r.texto).toBe('TEXTO 1\nUma frase comum bem longa aqui.\n');
    expect(r.descartados).toBe(1);
  });

  it('respeita as páginas (\\f) e as ligaduras do pdftotext', () => {
    const r = aplicarEstilos('primeira página\fo ﬁm sublinhado\n', {
      paginas: [{ runs: [] }, { runs: [run('fim', 'o', 'sublinhado')] }],
    });
    expect(r.texto).toBe('primeira página\fo **fim** sublinhado\n');
  });
});

describe('parser com marcas de estilo', () => {
  it('mantém as marcas no enunciado e nas alternativas sem quebrar a estrutura', () => {
    const r = parseCaderno(
      'LÍNGUA PORTUGUESA\n\n' +
        '01) Assinale a alternativa em que a palavra **sublinhada**\n' +
        '**exerce** função de sujeito. Marque a **INCORRETA**:\n' +
        'A) O **menino** correu.\n' +
        'B) *Chovia* muito.\n' +
        'C) Ele **viu**\n**o filme**.\n' +
        'D) d.\nE) e.\n\n' +
        '02) Outra:\nA) a.\nB) b.\nC) c.\nD) d.\nE) e.\n',
    );
    const q = r.questoes[0]!;
    expect(r.questoes.map((x) => x.numero)).toEqual([1, 2]);
    expect(q.disciplina).toBe('portugues');
    expect(q.enunciado).toBe(
      'Assinale a alternativa em que a palavra **sublinhada exerce** função de sujeito. Marque a **INCORRETA**:',
    );
    expect(q.alternativas.map((a) => a.texto)).toEqual([
      'O **menino** correu.',
      '*Chovia* muito.',
      'Ele **viu o filme**.',
      'd.',
      'e.',
    ]);
    expect(semMarcas(q.enunciado)).not.toContain('*');
  });

  it('o negrito só vira ** na questão que pede destaque; nas outras some', () => {
    const r = parseCaderno(
      'LÍNGUA PORTUGUESA\n\n' +
        `01) Analise o termo em destaque: o menino ${AB}comeu${FB} e ${AB}bebeu${FB}.\n` +
        `A) ${AB}comeu${FB}.\nB) b.\nC) c.\nD) d.\nE) e.\n\n` +
        `02) Marque a ${AB}INCORRETA${FB}:\nA) a.\nB) b.\nC) c.\nD) d.\nE) e.\n`,
    );
    expect(r.questoes[0]!.enunciado).toBe(
      'Analise o termo em destaque: o menino **comeu** e **bebeu**.',
    );
    expect(r.questoes[0]!.alternativas[0]!.texto).toBe('**comeu**.');
    expect(r.questoes[1]!.enunciado).toBe('Marque a INCORRETA:');
  });

  it('o hífen de fim de linha junta a palavra mesmo com marca de estilo no meio', () => {
    const r = parseCaderno(
      'LÍNGUA PORTUGUESA\n\n' +
        '01) Observe a palavra **força-**\n**tarefa** e também guarda-\nchuva no texto, em destaque:\n' +
        'A) a.\nB) b.\nC) c.\nD) d.\nE) e.\n',
    );
    expect(r.questoes[0]!.enunciado).toBe(
      'Observe a palavra **forçatarefa** e também guardachuva no texto, em destaque:',
    );
  });

  it('linha que começa com marca ainda é reconhecida como continuação da E e como apoio', () => {
    const r = parseCaderno(
      'LÍNGUA PORTUGUESA\n\n**Leia o texto** e responda às questões 01 e 02.\n' +
        'O vento soprava.\n\n' +
        '01) Sobre o texto, assinale a correta:\nA) a.\nB) b.\nC) c.\nD) d.\nE) Acabou em\n' +
        '\f**vento** forte.\n\n' +
        '02) Outra:\nA) a.\nB) b.\nC) c.\nD) d.\nE) e.\n',
    );
    expect(r.questoes[0]!.alternativas[4]!.texto).toBe('Acabou em **vento** forte.');
    expect(r.questoes[0]!.textoApoio).toContain('O vento soprava.');
  });
});

/* ------------------------------------------------ PDF real (PyMuPDF opcional) */

const GERAR = `
import sys, pymupdf
doc = pymupdf.open()
pg = doc.new_page()
y = 80
def linha(partes):
    global y
    x = 60
    for txt, fonte, sub in partes:
        pg.insert_text((x, y), txt, fontname=fonte, fontsize=11)
        w = pymupdf.get_text_length(txt, fontname=fonte, fontsize=11)
        if sub:
            pg.draw_rect(pymupdf.Rect(x, y + 1.5, x + w, y + 2.3), color=None, fill=(0, 0, 0))
        x += w
    y += 18
linha([("01. Na frase, a palavra ", "helv", False), ("sublinhada", "helv", True), (" e verbo?", "helv", False)])
linha([("Assinale a alternativa ", "helv", False), ("INCORRETA", "hebo", False), (" sobre o termo ", "helv", False), ("in loco", "heit", False), (".", "helv", False)])
for l, t in zip("ABCDE", ["um.", "dois.", "tres.", "quatro.", "cinco."]):
    linha([(l + ") " + t, "helv", False)])
doc.save(sys.argv[1])
`;

let python: string | null = null;
let dir: string;
let pdf: string;

beforeAll(async () => {
  python = await acharPython();
  dir = await mkdtemp(join(tmpdir(), 'estilos-'));
  pdf = join(dir, 'prova.pdf');
  if (python) execFileSync(python, ['-I', '-c', GERAR, pdf]);
});
afterAll(() => rm(dir, { recursive: true, force: true }));

describe('PDF real com PyMuPDF (opcional)', () => {
  it('o helper devolve sublinhado, negrito e itálico', async (ctx) => {
    if (!python) return ctx.skip();
    const e = await extrairEstilosPdf(pdf);
    const runs = e!.paginas[0]!.runs;
    const achar = (t: string) => runs.find((r) => r.t === t);
    expect(achar('sublinhada')?.e).toBe('u');
    expect(achar('INCORRETA')?.e).toBe('b');
    expect(achar('in loco')?.e).toBe('i');
    expect(runs.some((r) => r.t.includes('um'))).toBe(false);
  });

  it('extrairCaderno devolve **sublinhada**, *in loco* e o negrito (a questão fala em sublinhado)', async (ctx) => {
    if (!python || !temPdftotext) return ctx.skip();
    const r = await extrairCaderno(pdf);
    const q = r.questoes[0]!;
    expect(q.enunciado).toBe(
      'Na frase, a palavra **sublinhada** e verbo? Assinale a alternativa **INCORRETA** sobre o termo *in loco*.',
    );
    expect(q.alternativas.map((a) => a.texto)).toEqual([
      'um.',
      'dois.',
      'tres.',
      'quatro.',
      'cinco.',
    ]);
    expect(r.avisos.join()).not.toMatch(/PyMuPDF/);
  });

  it('com estilos desligados o texto sai sem marcas', async (ctx) => {
    if (!python || !temPdftotext) return ctx.skip();
    const r = await extrairCaderno(pdf, {}, { estilos: false });
    expect(r.questoes[0]!.enunciado).not.toContain('*');
  });

  it('PDF que não abre devolve null sem quebrar', async () => {
    await writeFile(join(dir, 'ruim.pdf'), 'isto não é um pdf');
    expect(await extrairEstilosPdf(join(dir, 'ruim.pdf'))).toBeNull();
  });
});
