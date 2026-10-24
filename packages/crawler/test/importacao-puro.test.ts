import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  detectarSecao,
  disciplinaPadraoFau,
  dividirAlternativasNaLinha,
  intervaloDoApoio,
  juntarLinhas,
  matchQuestao,
  parseCaderno,
  qualidadeDaExtracao,
} from '../src/importacao/caderno.js';
import { confrontar, notaDeAlteracao, observacaoDoItem } from '../src/importacao/confronto.js';
import {
  escolherGabarito,
  interpretarToken,
  lerLegenda,
  paresNaLinha,
  parseGabarito,
} from '../src/importacao/gabarito.js';
import { linhasLimpas, normalizarTextoPdf } from '../src/importacao/texto-pdf.js';

const fixture = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

describe('texto do pdftotext', () => {
  it('normaliza ligaduras, NBSP, hífen suave e CRLF', () => {
    expect(normalizarTextoPdf('ﬁm de­\r\nlinha‐x\t')).toBe('fim de\nlinha-x ');
  });

  it('remove cabeçalho repetido e números de página, mas não alternativas', () => {
    const paginas = [1, 2, 3, 4]
      .map((n) => `CABEÇALHO FIXO\nconteúdo ${n}\nA) Todas.\n${n}`)
      .join('\f');
    const linhas = linhasLimpas(paginas).filter(Boolean);
    expect(linhas).toEqual([
      'conteúdo 1',
      'A) Todas.',
      'conteúdo 2',
      'A) Todas.',
      'conteúdo 3',
      'A) Todas.',
      'conteúdo 4',
      'A) Todas.',
    ]);
  });

  it('com menos de 3 páginas não remove repetições', () => {
    expect(linhasLimpas('X\na\fX\nb').filter(Boolean)).toEqual(['X', 'a', 'X', 'b']);
  });
});

describe('parser do caderno', () => {
  const r = parseCaderno(fixture('caderno_fau.txt'));
  const q = (n: number) => r.questoes.find((x) => x.numero === n)!;

  it('extrai as 8 questões em ordem, ignorando a lista numerada da capa', () => {
    expect(r.questoes.map((x) => x.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(r.avisos).toEqual([]);
  });

  it('separa enunciado e alternativas A–E', () => {
    expect(q(1).enunciado).toBe('De acordo com o texto, o banco mais disputado ficava');
    expect(q(1).alternativas.map((a) => a.letra)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(q(1).alternativas[0]!.texto).toBe('perto da fonte.');
    expect(q(2).alternativas[3]!.texto).toBe('recém-pintado.');
  });

  it('liga o texto de apoio às questões citadas ("questões 01 e 02") e junta palavras hifenizadas', () => {
    expect(q(1).textoApoio).toBe(q(2).textoApoio);
    expect(q(1).textoApoio).toContain('moradores que caminhavam antes do trabalho');
    expect(q(1).textoApoio).not.toMatch(/^Leia/);
    expect(q(3).textoApoio).toBeNull();
  });

  it('usa as seções do caderno como disciplina', () => {
    expect(r.questoes.map((x) => x.disciplina)).toEqual([
      'portugues',
      'portugues',
      'matematica',
      'matematica',
      'gerais',
      'gerais',
      'especificos',
      'especificos',
    ]);
    expect(r.secoes.map((s) => [s.disciplina, s.primeiraQuestao])).toEqual([
      ['portugues', 1],
      ['matematica', 3],
      ['gerais', 5],
      ['especificos', 7],
    ]);
  });

  it('divide alternativas na mesma linha e mantém itens enumerados do enunciado', () => {
    expect(q(4).alternativas.map((a) => a.texto)).toEqual(['10', '14', '20', '24', '9']);
    expect(q(7).enunciado).toContain(
      '\n1. A cordialidade é dispensável.\n2. A informação deve ser clara.',
    );
    expect(q(7).alternativas).toHaveLength(5);
  });

  it('avisa alternativas faltando e questão que cita figura', () => {
    expect(q(6).avisos).toContain('4 alternativas extraídas (esperado 5)');
    expect(q(8).avisos.join()).toMatch(/figura/);
    expect(qualidadeDaExtracao(r)).toBeCloseTo(7.25);
  });

  it('sem títulos de seção, usa a distribuição FAU 5/5/5/25 em provas de 40', () => {
    const linhas: string[] = [];
    for (let n = 1; n <= 40; n++) {
      linhas.push(
        `${String(n).padStart(2, '0')}. Enunciado ${n}`,
        'A) a',
        'B) b',
        'C) c',
        'D) d',
        'E) e',
        '',
      );
    }
    const p = parseCaderno(linhas.join('\n'));
    expect(p.questoes).toHaveLength(40);
    expect(p.questoes[0]!.disciplina).toBe('portugues');
    expect(p.questoes[9]!.disciplina).toBe('matematica');
    expect(p.questoes[14]!.disciplina).toBe('gerais');
    expect(p.questoes[39]!.disciplina).toBe('especificos');
    expect(p.avisos[0]).toMatch(/5\/5\/5\/25/);
    const curta = parseCaderno('01. Só uma\nA) a\nB) b\nC) c\nD) d\nE) e\n\n03. Pulou\nA) x');
    expect(curta.questoes.map((x) => x.numero)).toEqual([1]);
    expect(curta.questoes[0]!.avisos).toContain('disciplina não identificada');
    expect(parseCaderno('Sem questões aqui.').avisos[0]).toMatch(/Nenhuma questão/);
  });

  it('reconhece o formato "QUESTÃO 01" e o quadro de faixas da capa', () => {
    const p = parseCaderno(
      [
        'MATEMÁTICA 01 a 01',
        'QUESTÃO 01',
        'Quanto é 1 + 1?',
        'A) 1',
        'B) 2',
        'C) 3',
        'D) 4',
        'E) 5',
      ].join('\n'),
    );
    expect(p.questoes[0]).toMatchObject({
      numero: 1,
      enunciado: 'Quanto é 1 + 1?',
      disciplina: 'matematica',
    });
  });

  it('funções auxiliares', () => {
    expect(matchQuestao('01. Texto')).toMatchObject({ numero: 1, bruto: '01', sep: '.' });
    expect(matchQuestao('1.000 pessoas')).toBeNull();
    expect(matchQuestao('Questão 12 - Texto')).toMatchObject({ numero: 12, sep: 'QUESTAO' });
    expect(detectarSecao('LÍNGUA PORTUGUESA')).toBe('portugues');
    expect(detectarSecao('Conhecimentos Gerais')).toBe('gerais');
    expect(
      detectarSecao('A língua portuguesa é rica e cheia de nuances, disse o autor do texto.'),
    ).toBeNull();
    expect(detectarSecao('A) LÍNGUA PORTUGUESA')).toBeNull();
    expect(detectarSecao('ABC')).toBeNull();
    expect(intervaloDoApoio('Leia o texto para responder às questões 03 a 05.')).toEqual([3, 5]);
    expect(intervaloDoApoio('para a questão 7')).toEqual([7, 7]);
    expect(intervaloDoApoio('questões 09 e 08')).toEqual([8, 9]);
    expect(intervaloDoApoio('sem referência')).toBeNull();
    expect(dividirAlternativasNaLinha('A', '1 B) 2 C) 3')).toEqual([
      { letra: 'A', texto: '1' },
      { letra: 'B', texto: '2' },
      { letra: 'C', texto: '3' },
    ]);
    expect(juntarLinhas(['guarda-', 'chuva', '', 'novo'])).toBe('guardachuva\n\nnovo');
    expect(disciplinaPadraoFau(3, 30)).toBeNull();
  });
});

describe('parser do gabarito definitivo', () => {
  it('lê a grade por cargo, com anulada (*X) e alterada (**B)', () => {
    const g = parseGabarito(fixture('gabarito_definitivo.txt'));
    expect(g.definitivo).toBe(true);
    expect(g.avisos).toEqual([]);
    expect(g.gabaritos.map((x) => x.cargo)).toEqual([
      'AGENTE ADMINISTRATIVO',
      'AUXILIAR DE SERVIÇOS GERAIS',
    ]);
    const agente = g.gabaritos[0]!.respostas;
    expect([...agente.values()].map((r) => r.letra ?? '-').join('')).toBe('ABCB-DBA');
    expect(agente.get(5)).toEqual({ letra: null, anulada: true, alterada: false, bruto: '*X' });
    expect(agente.get(7)).toEqual({ letra: 'B', anulada: false, alterada: true, bruto: '**B' });
  });

  it('lê pares numa linha ("01-A") e o cargo citado em "CARGO:"', () => {
    const g = parseGabarito(fixture('gabarito_pares.txt'));
    expect(g.gabaritos).toHaveLength(1);
    expect(g.gabaritos[0]!.cargo).toBe('TÉCNICO EM ENFERMAGEM');
    expect(g.gabaritos[0]!.respostas.get(6)?.anulada).toBe(true);
    expect(g.gabaritos[0]!.respostas.get(7)).toMatchObject({ letra: 'C', alterada: true });
    expect(g.gabaritos[0]!.respostas.size).toBe(8);
  });

  it('acusa gabarito preliminar ou não identificado', () => {
    expect(parseGabarito(fixture('gabarito_preliminar.txt'))).toMatchObject({
      definitivo: false,
      preliminar: true,
    });
    const sem = parseGabarito('01 02\nA B');
    expect(sem.definitivo).toBe(false);
    expect(sem.avisos[0]).toMatch(/não se identifica/);
    expect(parseGabarito('GABARITO DEFINITIVO\nnada').avisos).toContain(
      'Nenhuma resposta encontrada no gabarito.',
    );
  });

  it('casa por coluna quando faltam respostas na linha', () => {
    const g = parseGabarito('GABARITO DEFINITIVO\n01  02  03\nA       C');
    const r = g.gabaritos[0]!.respostas;
    expect(r.get(1)?.letra).toBe('A');
    expect(r.get(3)?.letra).toBe('C');
    expect(r.has(2)).toBe(false);
    expect(g.avisos.join()).toMatch(/sem resposta para as questões 02/);
  });

  it('respeita a legenda e interpreta tokens', () => {
    const invertida = lerLegenda('* QUESTÃO ALTERADA\n** QUESTÃO ANULADA');
    expect(interpretarToken('*C', invertida)).toMatchObject({ letra: 'C', alterada: true });
    expect(interpretarToken('**C', invertida)).toMatchObject({ anulada: true });
    expect(interpretarToken('ANULADA')).toMatchObject({ letra: null, anulada: true });
    expect(interpretarToken('F')).toBeNull();
    expect(paresNaLinha('Edital nº 01/2026 de 10 de março', lerLegenda(''))).toBeNull();
    const repetida = parseGabarito('GABARITO DEFINITIVO\n01-A 01-B');
    expect(repetida.avisos.join()).toMatch(/repetida/);
  });

  it('escolhe o bloco do cargo', () => {
    const g = parseGabarito(fixture('gabarito_definitivo.txt'));
    expect(escolherGabarito(g, 'Auxiliar de Serviços Gerais').cargo).toBe(
      'AUXILIAR DE SERVIÇOS GERAIS',
    );
    expect(escolherGabarito(g, 'agente administrativo I').cargo).toBe('AGENTE ADMINISTRATIVO');
    expect(() => escolherGabarito(g)).toThrow(/Informe --cargo/);
    expect(() => escolherGabarito(g, 'Médico Veterinário')).toThrow(/Nenhum cargo/);
    expect(() =>
      escolherGabarito({ gabaritos: [], definitivo: true, preliminar: false, avisos: [] }),
    ).toThrow();
    const unico = parseGabarito(fixture('gabarito_pares.txt'));
    expect(escolherGabarito(unico, 'qualquer').cargo).toBe('TÉCNICO EM ENFERMAGEM');
  });
});

describe('confronto caderno × gabarito', () => {
  const caderno = parseCaderno(fixture('caderno_fau.txt'));
  const definitivo = escolherGabarito(
    parseGabarito(fixture('gabarito_definitivo.txt')),
    'AGENTE ADMINISTRATIVO',
  );
  const preliminar = escolherGabarito(parseGabarito(fixture('gabarito_preliminar.txt')));
  const c = confrontar(caderno.questoes, definitivo, preliminar);
  const item = (n: number) => c.itens.find((i) => i.numero === n)!;

  it('resume anuladas, alteradas e divergências', () => {
    expect(c.anuladas).toBe(1);
    expect(c.alteradas).toBe(1);
    expect(c.divergencias).toBe(1); // a 06 tem só 4 alternativas
    expect(c.gravaveis).toBe(8);
  });

  it('anulada vira status anulada; alterada cita a letra antiga', () => {
    expect(item(5)).toMatchObject({
      status: 'anulada',
      gabaritoDefinitivo: 'ANULADA',
      letraPreliminar: 'A',
    });
    expect(item(7)).toMatchObject({
      status: 'rascunho',
      gabaritoDefinitivo: 'B',
      letraPreliminar: 'C',
    });
    expect(notaDeAlteracao(item(7))).toBe(
      'Gabarito alterado pela banca após os recursos: a resposta preliminar era C e o gabarito definitivo é B.',
    );
    expect(notaDeAlteracao(item(1))).toBeNull();
    expect(observacaoDoItem(item(1))).toBeNull();
    expect(observacaoDoItem(item(6))).toMatch(/4 alternativas/);
  });

  it('acusa questão sem gabarito, gabarito sem questão e letra fora das alternativas', () => {
    const incompleto = { cargo: null, respostas: new Map(definitivo.respostas) };
    incompleto.respostas.delete(2);
    incompleto.respostas.set(9, { letra: 'A', anulada: false, alterada: false, bruto: 'A' });
    incompleto.respostas.set(6, { letra: 'E', anulada: false, alterada: false, bruto: 'E' });
    const r = confrontar(caderno.questoes, incompleto);
    expect(r.itens.find((i) => i.numero === 2)).toMatchObject({
      status: null,
      problemas: ['questão sem resposta no gabarito definitivo'],
    });
    expect(r.itens.find((i) => i.numero === 9)).toMatchObject({
      status: null,
      problemas: ['questão não encontrada no caderno'],
    });
    expect(r.itens.find((i) => i.numero === 6)!.problemas.join()).toMatch(
      /não está entre as alternativas/,
    );
  });

  it('avisa definitivo diferente do preliminar sem marca de alteração e alteração sem mudança', () => {
    const pre = { cargo: null, respostas: new Map(preliminar.respostas) };
    pre.respostas.set(1, { letra: 'B', anulada: false, alterada: false, bruto: 'B' });
    pre.respostas.set(7, { letra: 'B', anulada: false, alterada: false, bruto: 'B' });
    const r = confrontar(caderno.questoes, definitivo, pre);
    expect(r.itens.find((i) => i.numero === 1)!.avisos.join()).toMatch(/difere do preliminar/);
    expect(r.itens.find((i) => i.numero === 7)!.avisos.join()).toMatch(/igual ao preliminar/);
    const semPre = confrontar(caderno.questoes, definitivo);
    expect(notaDeAlteracao(semPre.itens.find((i) => i.numero === 7)!)).toBe(
      'Gabarito alterado pela banca após os recursos: o gabarito definitivo é B.',
    );
  });
});
