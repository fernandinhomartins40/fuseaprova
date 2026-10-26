import { describe, expect, it } from 'vitest';
import { parseCaderno } from '../src/importacao/caderno.js';

const CAB = 'CONHECIMENTOS ESPECÍFICOS\n\n';
const alts = (e: string) => `A) a.\nB) b.\nC) c.\nD) d.\nE) ${e}\n`;

describe('alternativa E que continua na página seguinte', () => {
  it('continuação em maiúscula depois de conectivo ("exclusivos da" + "União, …")', () => {
    const r = parseCaderno(
      CAB +
        `01) Assinale a correta:\n${alts('Recursos financeiros exclusivos da')}\f` +
        'União, na prestação de serviços à população.\n\n' +
        `02) Próxima:\n${alts('e.')}`,
    );
    expect(r.questoes[0]!.alternativas[4]!.texto).toBe(
      'Recursos financeiros exclusivos da União, na prestação de serviços à população.',
    );
    expect(r.questoes[1]!.textoApoio).toBeNull();
    expect(r.questoes[1]!.enunciado).toBe('Próxima:');
  });

  it('E que acaba em vírgula continua na página seguinte', () => {
    const r = parseCaderno(
      CAB +
        `01) Assinale a correta:\n${alts('O acúmulo de placa, a progressão da doença e,')}\f` +
        'Segundo a OMS, os sinais pioram.\n\n' +
        `02) Próxima:\n${alts('e.')}`,
    );
    expect(r.questoes[0]!.alternativas[4]!.texto).toBe(
      'O acúmulo de placa, a progressão da doença e, Segundo a OMS, os sinais pioram.',
    );
  });

  it('E curta e completa seguida de texto de apoio na página seguinte continua separada', () => {
    const r = parseCaderno(
      CAB +
        `01) Assinale a correta:\n${alts('Honda')}\f` +
        'O Brasil produziu muito no ano passado.\n\n' +
        `02) Segundo o texto, é correto afirmar:\n${alts('e.')}`,
    );
    expect(r.questoes[0]!.alternativas[4]!.texto).toBe('Honda');
    expect(r.questoes[1]!.textoApoio).toBe('O Brasil produziu muito no ano passado.');
  });

  it('o título de seção "CONHECIMENTOS DE INFORMÁTICA" não gruda na E', () => {
    const r = parseCaderno(
      'CONHECIMENTOS GERAIS\n\n' +
        `01) Qual é a correta?\n${alts('Apenas I e III.')}CONHECIMENTOS DE INFORMÁTICA\n` +
        `02) Firewall é:\n${alts('Outlook.')}`,
    );
    expect(r.questoes[0]!.alternativas[4]!.texto).toBe('Apenas I e III.');
    expect(r.secoes.map((s) => s.titulo)).toEqual([
      'CONHECIMENTOS GERAIS',
      'CONHECIMENTOS DE INFORMÁTICA',
    ]);
  });
});

describe('afirmações soltas depois da E da questão seguinte', () => {
  it('itens "( )" voltam para o enunciado da questão que os pede', () => {
    const r = parseCaderno(
      CAB +
        '01) Referindo-se às teclas, assinale V para Verdadeiro e F para Falso:\n' +
        'Após a análise, pode-se afirmar:\n' +
        'A) V, F, V.\nB) F, V, V.\nC) V, V, F.\nD) F, F, V.\nE) V, F, F.\n' +
        '02) Referindo-se aos arquivos, analise as sentenças:\n' +
        'I - Arquivo é a acumulação ordenada.\nII - Arquivo deve ser organizado.\n' +
        'A) Somente I.\nB) Somente II.\nC) I e II.\nD) Nenhuma.\nE) Todas estão corretas.\n' +
        '( ) A tecla Enter inicia parágrafo\ne confirma.\n' +
        '( ) A tecla Tab tabula.\n' +
        '03) Próxima:\n' +
        alts('e.'),
    );
    expect(r.questoes.map((q) => q.numero)).toEqual([1, 2, 3]);
    expect(r.questoes[0]!.enunciado).toBe(
      'Referindo-se às teclas, assinale V para Verdadeiro e F para Falso: Após a análise, pode-se afirmar:\n\n' +
        '( ) A tecla Enter inicia parágrafo e confirma.\n( ) A tecla Tab tabula.',
    );
    expect(r.questoes[1]!.alternativas[4]!.texto).toBe('Todas estão corretas.');
    expect(r.questoes[2]!.enunciado).toBe('Próxima:');
    expect(r.avisos.some((a) => /questão 1/.test(a))).toBe(true);
  });

  it('lista romana recomeçando depois da E volta para a questão de informática anterior', () => {
    const r = parseCaderno(
      CAB +
        '01) Considere as afirmações a seguir e assinale a correta:\n' +
        'A) Só I.\nB) Só II.\nC) I e II.\nD) II e III.\nE) I, II e III.\n' +
        '02) Qual é a definição de firewall?\n' +
        'A) Navegador.\nB) Barreira de rede.\nC) Link.\nD) Plugin.\nE) Outlook.\n' +
        'I - A internet é uma rede global.\nII - Os dispositivos têm o mesmo fabricante.\n' +
        '03) Próxima:\n' +
        alts('e.'),
    );
    expect(r.questoes[0]!.enunciado).toContain('I - A internet é uma rede global.');
    expect(r.questoes[0]!.enunciado).toContain('II - Os dispositivos têm o mesmo fabricante.');
    expect(r.questoes[1]!.alternativas[4]!.texto).toBe('Outlook.');
  });

  it('E que é ela mesma uma lista romana não é mexida', () => {
    const r = parseCaderno(
      CAB +
        '01) Considere as afirmações e assinale a ordem correta:\nA) a.\nB) b.\nC) c.\nD) d.\n' +
        'E) I - Superfície\nII - Aspersão\nIII - Localizada.\n' +
        '02) Próxima:\n' +
        alts('e.'),
    );
    expect(r.questoes[0]!.alternativas[4]!.texto).toContain('II - Aspersão');
    expect(r.avisos.some((a) => /soltos/.test(a))).toBe(false);
  });
});
