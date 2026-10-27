import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  acharCaderno,
  campoDaFigura,
  gerarConferenciaHtml,
  lerQuestoes,
  linhaMarkdown,
  recortarFiguras,
  recortarPdfAvulso,
  resumir,
  slugOrgao,
  textoAlternativo,
  type ItemManifesto,
  type QuestaoFigura,
} from '../src/figuras/figuras.js';
import { acharPython } from '../src/importacao/estilos.js';

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';
const ID_C = '33333333-3333-4333-8333-333333333333';
const ID_D = '44444444-4444-4444-8444-444444444444';

describe('figuras: partes puras', () => {
  it('acha o caderno pelo cargo, órgão e ano (com "Pref." e sufixo repetido)', () => {
    const nomes = [
      'agente-administrativo-prefeitura-prudentopolis-pr-fau-unicentro-2024.pdf',
      'assistente-social-prefeitura-nossa-senhora-das-gracas-pr-fau-unicentro-fau-unicentro-2023.pdf',
      'advogado-camara-de-matelandia-pr-fau-unicentro-2025.pdf',
    ];
    expect(slugOrgao('Pref.Prudentópolis')).toBe('prefeitura-prudentopolis');
    const q = (orgao: string, cargo: string, ano: number) => ({ orgao, cargo, ano });
    expect(acharCaderno(nomes, q('Pref.Prudentópolis', 'Agente Administrativo', 2024))).toBe(
      nomes[0],
    );
    expect(
      acharCaderno(nomes, q('Pref. Nossa Senhora das Graças', 'Assistente Social', 2023)),
    ).toBe(nomes[1]);
    expect(acharCaderno(nomes, q('Câmara de Matelândia', 'Advogado', 2025))).toBe(nomes[2]);
    expect(acharCaderno(nomes, q('Câmara de Matelândia', 'Advogado', 2024))).toBeNull();
  });

  it('a linha Markdown casa com o que o Markdown.tsx do app renderiza', () => {
    const alt = textoAlternativo(
      {
        numero: 29,
        enunciado:
          'Analisando a viga [mostrada] na figura (abaixo) e os esforços indicados, é INCORRETO',
      },
      'figura',
    );
    expect(alt).not.toMatch(/[[\]\n]/);
    const md = linhaMarkdown(alt, ID_A);
    // mesma expressão de apps/web/src/ui/Markdown.tsx
    const m = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(md);
    expect(m?.[2]).toBe(`/api/arquivos/uploads/${ID_A}.png`);
    expect(m?.[1]).toBe(alt);
    // a rota da API só serve <uuid>.png
    expect(`${ID_A}.png`).toMatch(/^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/);
  });

  it('texto alternativo escolhe o tipo e nunca fica vazio', () => {
    expect(
      textoAlternativo({ numero: 3, enunciado: 'Observe a tabela a seguir' }, 'figura'),
    ).toMatch(/^Tabela da questão 3/);
    expect(textoAlternativo({ numero: 4, enunciado: '' }, 'figura')).toBe('Figura da questão 4');
    expect(textoAlternativo({ numero: 5, enunciado: 'palavra em destaque' }, 'destaque')).toMatch(
      /questão 5/,
    );
  });

  it('campo: texto_apoio só quando o enunciado não cita a figura', () => {
    expect(campoDaFigura({ enunciado: 'Qual o valor?', texto_apoio: 'Leia o texto' })).toBe(
      'texto_apoio',
    );
    expect(campoDaFigura({ enunciado: 'Observe a figura abaixo', texto_apoio: 'Leia' })).toBe(
      'enunciado',
    );
    expect(campoDaFigura({ enunciado: 'Qual?', texto_apoio: null })).toBe('enunciado');
  });

  it('conferência HTML escapa o texto e traz o resumo', () => {
    const q: QuestaoFigura = {
      id: ID_A,
      orgao: 'Pref. <X>',
      ano: 2024,
      cargo: 'A&B',
      numero: 1,
      enunciado: '<b>negrito</b>',
    };
    const item: ItemManifesto = {
      id: ID_A,
      ok: false,
      caderno: null,
      numero: 1,
      arquivo: null,
      url: null,
      markdown: null,
      alt: null,
      campo: 'enunciado',
      pagina: null,
      caixas: [],
      largura: null,
      altura: null,
      bytes: null,
      confianca: 'baixa',
      estrategia: 'nenhuma',
      motivo: 'caderno não encontrado',
    };
    const html = gerarConferenciaHtml(
      { geradoEm: '', urlBase: '/x', resumo: resumir([item]), itens: { [ID_A]: item } },
      [q],
    );
    expect(html).toContain('&lt;b&gt;negrito&lt;/b&gt;');
    expect(html).not.toContain('<b>negrito</b>');
    expect(html).toContain('falhas 1');
  });
});

const python = await acharPython();

describe.skipIf(!python)('figuras: caderno sintético (PyMuPDF)', () => {
  let dir: string;
  let cadernos: string;
  const base = { orgao: 'Pref. Teste', ano: 2024, cargo: 'Analista' };
  const questoes: QuestaoFigura[] = [
    { ...base, id: ID_A, numero: 2, enunciado: 'Observe a figura abaixo:' },
    { ...base, id: ID_B, numero: 4, enunciado: 'Considere o gráfico:' },
    { ...base, id: ID_C, numero: 3, enunciado: 'Assinale a correta' },
    { ...base, orgao: 'Pref. Outra', id: ID_D, numero: 1, enunciado: 'sem caderno' },
  ];

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'figuras-'));
    cadernos = join(dir, 'cadernos');
    await mkdir(cadernos);
    execFileSync(python!, [
      '-I',
      fileURLToPath(new URL('./fixtures/gerar_caderno_figuras.py', import.meta.url)),
      join(cadernos, 'analista-prefeitura-teste-pr-fau-unicentro-2024.pdf'),
    ]);
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('recorta só a figura vetorial (coluna esquerda) e a imagem (coluna direita)', async () => {
    const saida = join(dir, 'saida');
    const m = await recortarFiguras({ questoes, cadernos, saida, dpi: 100 });
    const a = m.itens[ID_A]!;
    const b = m.itens[ID_B]!;
    expect(a.ok).toBe(true);
    expect(a.estrategia).toBe('figura');
    expect(a.confianca).toBe('alta');
    expect(a.markdown).toBe(`![${a.alt}](/api/arquivos/uploads/${ID_A}.png)`);
    // a figura mede ~140x90 pt: a 100 dpi fica bem menor que a questão inteira (~300x250 px)
    expect(a.largura!).toBeLessThan(260);
    expect(a.altura!).toBeLessThan(180);
    const png = await readFile(join(saida, `${ID_A}.png`));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(b.ok).toBe(true);
    expect(b.estrategia).toBe('figura');
    expect(b.pagina).toBe(1);
    expect(b.caixas[0]![1]!).toBeGreaterThan(300); // coluna da direita
    expect(b.largura!).toBeLessThan(260);
  });

  it('questão só de texto vira o recorte da questão inteira com confiança baixa', async () => {
    const m = await recortarFiguras({ questoes, cadernos, saida: join(dir, 's2'), dpi: 100 });
    const c = m.itens[ID_C]!;
    expect(c.ok).toBe(true);
    expect(c.estrategia).toBe('questao');
    expect(c.confianca).toBe('baixa');
  });

  it('caderno inexistente falha com motivo, sem derrubar as outras', async () => {
    const m = await recortarFiguras({ questoes, cadernos, saida: join(dir, 's3'), dpi: 100 });
    expect(m.itens[ID_D]).toMatchObject({ ok: false, caderno: null });
    expect(m.resumo).toMatchObject({ total: 4, ok: 3, falhas: 1, alta: 2, baixa: 1 });
  });

  it('modo avulso (--pdf) usa chaves qNN e grava o manifesto', async () => {
    const saida = join(dir, 's4');
    const m = await recortarPdfAvulso(
      join(cadernos, 'analista-prefeitura-teste-pr-fau-unicentro-2024.pdf'),
      [2, 99],
      saida,
      100,
    );
    expect(m.itens['q02']).toMatchObject({ ok: true, estrategia: 'figura' });
    expect(m.itens['q99']).toMatchObject({ ok: false });
    const salvo = JSON.parse(await readFile(join(saida, 'manifesto.json'), 'utf8')) as typeof m;
    expect(salvo.resumo.total).toBe(2);
  });

  it('lê ids e contexto', async () => {
    await writeFile(join(dir, 'ids.json'), JSON.stringify([ID_B]));
    await writeFile(join(dir, 'ctx.json'), JSON.stringify(questoes));
    expect((await lerQuestoes(join(dir, 'ids.json'), join(dir, 'ctx.json')))[0]!.id).toBe(ID_B);
    await writeFile(join(dir, 'ids2.json'), JSON.stringify(['x']));
    await expect(lerQuestoes(join(dir, 'ids2.json'), join(dir, 'ctx.json'))).rejects.toThrow(
      /sem contexto/,
    );
  });
});
