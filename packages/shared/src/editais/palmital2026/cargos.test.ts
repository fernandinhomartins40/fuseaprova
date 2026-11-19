import { describe, expect, it } from 'vitest';
import {
  AREAS_ACS,
  CARGOS_PALMITAL,
  DATAS_PALMITAL,
  MATERIAS_POR_NIVEL,
  TEXTOS_CARGOS,
  avaliarCargo,
  buscarBairroAcs,
  cargoPalmital,
  respostasDoPerfil,
  sugerirCargos,
  valorEmCentavos,
  type CargoPalmital,
  type RespostaRequisito,
} from './cargos.js';

const semEspaco = (s: string) => s.replace(/\s+/g, '');
const todas = (c: CargoPalmital, r: RespostaRequisito) =>
  Object.fromEntries(c.perguntas.map((p) => [p.id, r]));
const cargo = (codigo: number) => {
  const c = cargoPalmital(codigo);
  if (!c) throw new Error(`sem cargo ${codigo}`);
  return c;
};

describe('quadros do edital', () => {
  it('tem os 49 cargos do edital, com código único', () => {
    expect(CARGOS_PALMITAL).toHaveLength(49);
    expect(new Set(CARGOS_PALMITAL.map((c) => c.codigo)).size).toBe(49);
    const porTabela = (t: string) => CARGOS_PALMITAL.filter((c) => c.tabela === t).length;
    expect([porTabela('3.1'), porTabela('3.2'), porTabela('3.3'), porTabela('3.4')]).toEqual([
      29, 1, 9, 10,
    ]);
  });

  it('soma as vagas dos quadros 3.1 a 3.4 (ampla, PcD e afro)', () => {
    const soma = (f: (c: CargoPalmital) => number) => CARGOS_PALMITAL.reduce((s, c) => s + f(c), 0);
    expect(soma((c) => c.vagasAmpla)).toBe(111);
    expect(soma((c) => c.pcd)).toBe(7);
    expect(soma((c) => c.afro)).toBe(8);
    expect(cargo(122).vagas).toBe('CR');
    expect(cargo(122).vagasAmpla).toBe(0);
  });

  it('a taxa segue o nível do cargo', () => {
    const taxa = { superior: 'R$ 200,00', medio: 'R$ 150,00', fundamental: 'R$ 100,00' };
    for (const c of CARGOS_PALMITAL) expect(c.taxa, c.nome).toBe(taxa[c.nivel]);
  });

  it('separa os dois Médicos Clínicos Gerais pela carga horária', () => {
    expect(cargo(113).nome).toBe('Médico Clínico Geral 40h');
    expect(cargo(113).remuneracao).toBe('R$ 22.836,51');
    expect(cargo(114).nome).toBe('Médico Clínico Geral 20h');
    expect(TEXTOS_CARGOS['113'].nomeAnexo).toContain('40H');
  });

  it('só o Pedreiro fica sem texto nos anexos', () => {
    for (const c of CARGOS_PALMITAL) {
      const t = TEXTOS_CARGOS[String(c.codigo) as keyof typeof TEXTOS_CARGOS];
      expect(Boolean(t.requisitos && t.especificos), c.nome).toBe(c.codigo !== 408);
    }
    expect(cargo(408).semRequisitosNoEdital).toBe(true);
  });

  it('as áreas do ACS são as do edital, sem a ESF II', () => {
    expect(AREAS_ACS.map((a) => a.area)).toEqual(['ESF I', 'ESF III', 'ESF IV', 'ESF V', 'ESF VI']);
    expect(AREAS_ACS.reduce((s, a) => s + a.bairros.length, 0)).toBe(88);
  });

  it('as datas estão em ordem', () => {
    const d = DATAS_PALMITAL.map((x) => x.inicio);
    expect([...d].sort()).toEqual(d);
  });
});

describe('citações', () => {
  it('toda citação do Anexo I existe, ao pé da letra, nos requisitos do cargo', () => {
    let conferidas = 0;
    for (const c of CARGOS_PALMITAL) {
      const req = TEXTOS_CARGOS[String(c.codigo) as keyof typeof TEXTOS_CARGOS].requisitos ?? '';
      for (const p of c.perguntas.filter((x) => x.fonte === 'Anexo I, requisitos')) {
        expect(semEspaco(req), `${c.codigo} ${p.id}`).toContain(semEspaco(p.citacao));
        conferidas++;
      }
    }
    expect(conferidas).toBeGreaterThan(70);
  });

  it('todo cargo pergunta a escolaridade ou o curso, e os requisitos gerais', () => {
    for (const c of CARGOS_PALMITAL) {
      const ids = c.perguntas.map((p) => p.id);
      expect(
        ids.some((i) => i === 'curso' || i === 'escolaridade'),
        c.nome,
      ).toBe(true);
      expect(ids.slice(-2)).toEqual(['brasileiro', 'idade']);
      expect(new Set(ids).size, c.nome).toBe(ids.length);
    }
  });
});

describe('provas', () => {
  it('cada nível soma 100 pontos, com o número de questões da tabela', () => {
    const q = { superior: 40, medio: 35, fundamental: 25 };
    for (const [nivel, materias] of Object.entries(MATERIAS_POR_NIVEL)) {
      expect(
        materias.reduce((s, m) => s + m.total, 0),
        nivel,
      ).toBe(100);
      expect(
        materias.reduce((s, m) => s + m.questoes, 0),
        nivel,
      ).toBe(q[nivel as keyof typeof q]);
      for (const m of materias)
        if (m.valor !== null) expect(m.valor * m.questoes, m.nome).toBe(m.total);
    }
    expect(MATERIAS_POR_NIVEL.medio[0]!.nota).toContain('3,50');
  });

  it('fases e nota final seguem as tabelas 9 e o item 14', () => {
    const fases = (n: number) => cargo(n).fases.map((f) => f.tipo);
    expect(fases(101)).toEqual(['objetiva', 'titulos']);
    expect(fases(104)).toEqual(['objetiva', 'titulos', 'pratica']);
    expect(fases(201)).toEqual(['objetiva', 'titulos', 'redacao']);
    expect(fases(305)).toEqual(['objetiva']);
    expect(fases(308)).toEqual(['objetiva', 'pratica']);
    expect(fases(406)).toEqual(['objetiva', 'titulos', 'pratica']);
    expect(fases(407)).toEqual(['objetiva', 'pratica']);
    expect(fases(401)).toEqual(['objetiva']);
    expect(cargo(401).fases[0]!.detalhe).toContain('25 questões');
    expect(cargo(304).fases[0]!.detalhe).toContain('35 questões');
    const nota = (n: number) => cargo(n).notaFinal.fonte;
    expect([101, 105, 201, 301, 308, 401, 406, 407].map(nota)).toEqual([
      'Item 14.2',
      'Item 14.2.1',
      'Item 14.3',
      'Item 14.4',
      'Item 14.4.1',
      'Item 14.5',
      'Item 14.5.1',
      'Item 14.5.2',
    ]);
  });
});

describe('avaliarCargo', () => {
  it('tudo "sim" atende', () => {
    const c = cargo(104);
    expect(avaliarCargo(c, todas(c, 'sim')).situacao).toBe('atende');
  });

  it('"terei até a posse" deixa pendente, com o prazo certo', () => {
    const c = cargo(406);
    const a = avaliarCargo(c, { ...todas(c, 'sim'), cnh: 'ate_prazo' });
    expect(a.situacao).toBe('pendente');
    expect(a.itens.find((i) => i.pergunta.id === 'cnh')!.explicacao).toContain('prova prática');
    const b = avaliarCargo(c, { ...todas(c, 'sim'), experiencia: 'ate_prazo' });
    expect(b.itens.find((i) => i.pergunta.id === 'experiencia')!.explicacao).toContain('posse');
  });

  it('residência do ACS e requisitos sem prazo não aceitam "depois"', () => {
    const c = cargo(301);
    expect(avaliarCargo(c, { ...todas(c, 'sim'), residencia: 'ate_prazo' }).situacao).toBe(
      'nao_atende',
    );
    const n = avaliarCargo(c, { ...todas(c, 'sim'), residencia: 'nao' });
    expect(n.situacao).toBe('nao_atende');
    expect(n.itens.find((i) => i.pergunta.id === 'residencia')!.explicacao).toContain(
      'não dá para cumprir depois',
    );
  });

  it('"não sei" e pergunta sem resposta pedem confirmação, nunca "atende"', () => {
    const c = cargo(120);
    expect(avaliarCargo(c, { ...todas(c, 'sim'), curso: 'nao_sei' }).situacao).toBe('confirmar');
    expect(avaliarCargo(c, { brasileiro: 'sim' }).situacao).toBe('confirmar');
  });

  it('"não" vence tudo e explica o prazo', () => {
    const c = cargo(303);
    const a = avaliarCargo(c, { ...todas(c, 'nao_sei'), sexo: 'nao' });
    expect(a.situacao).toBe('nao_atende');
    const e = avaliarCargo(c, { ...todas(c, 'sim'), escolaridade: 'nao' });
    expect(e.itens.find((i) => i.pergunta.id === 'escolaridade')!.explicacao).toContain(
      'até a posse',
    );
  });

  it('o Pedreiro nunca sai como "atende" nem "pendente"', () => {
    const c = cargo(408);
    expect(avaliarCargo(c, todas(c, 'sim')).situacao).toBe('confirmar');
    expect(avaliarCargo(c, { ...todas(c, 'sim'), escolaridade: 'ate_prazo' }).situacao).toBe(
      'confirmar',
    );
    expect(avaliarCargo(c, todas(c, 'sim')).resumo).toContain('não traz os requisitos');
    expect(avaliarCargo(c, { ...todas(c, 'sim'), idade: 'nao' }).situacao).toBe('nao_atende');
  });
});

describe('caminho "Me ajude a descobrir"', () => {
  it('quem tem fundamental incompleto não atende a nenhum cargo', () => {
    expect(sugerirCargos({ escolaridade: 'fundamental_incompleto', cursos: [], cnh: [] })).toEqual(
      [],
    );
  });

  it('ensino médio: mostra médio e fundamental, nunca superior', () => {
    const s = sugerirCargos({ escolaridade: 'medio', cursos: [], cnh: [] });
    const niveis = new Set(s.map((x) => x.cargo.nivel));
    expect(niveis).toEqual(new Set(['medio', 'fundamental']));
    expect(s.map((x) => x.cargo.codigo)).toContain(305);
    // Ordena do maior salário para o menor.
    const v = s.map((x) => valorEmCentavos(x.cargo.remuneracao));
    expect([...v].sort((a, b) => b - a)).toEqual(v);
  });

  it('curso superior: só os cargos do curso e os de "qualquer área"', () => {
    const s = sugerirCargos({ escolaridade: 'superior', cursos: ['enfermagem'], cnh: ['B'] });
    const cod = s.map((x) => x.cargo.codigo);
    expect(cod).toEqual(expect.arrayContaining([101, 104, 105, 108, 123, 128, 406, 407, 303]));
    expect(cod).not.toContain(113);
    expect(cod).not.toContain(201);
  });

  it('deduz escolaridade, curso e CNH; o resto fica para o wizard', () => {
    const r = respostasDoPerfil(cargo(406), {
      escolaridade: 'fundamental',
      cursos: [],
      cnh: ['C'],
    });
    expect(r).toEqual({ escolaridade: 'sim', cnh: 'sim' });
    const sem = respostasDoPerfil(cargo(406), {
      escolaridade: 'fundamental',
      cursos: [],
      cnh: ['B'],
    });
    expect(sem.cnh).toBeUndefined();
    expect(
      respostasDoPerfil(cargo(113), { escolaridade: 'superior', cursos: ['direito'], cnh: [] })
        .curso,
    ).toBe('nao');
    // Sem curso marcado ("não está na lista"), o wizard pergunta.
    expect(
      respostasDoPerfil(cargo(113), { escolaridade: 'superior', cursos: [], cnh: [] }).curso,
    ).toBeUndefined();
    // Técnico Ambiental: ensino médio comum não basta para dizer "sim".
    expect(
      respostasDoPerfil(cargo(307), { escolaridade: 'medio', cursos: [], cnh: [] }).escolaridade,
    ).toBeUndefined();
    expect(
      respostasDoPerfil(cargo(307), { escolaridade: 'fundamental', cursos: [], cnh: [] })
        .escolaridade,
    ).toBe('nao');
  });
});

describe('utilidades', () => {
  it('valorEmCentavos', () => {
    expect(valorEmCentavos('R$ 22.836,51')).toBe(2283651);
    expect(valorEmCentavos('')).toBe(0);
  });

  it('busca o bairro do ACS sem acento', () => {
    expect(buscarBairroAcs('amalia')).toEqual([{ area: 'ESF V', bairro: 'Jardim Santa Amália' }]);
    expect(buscarBairroAcs('joaquim')).toEqual([
      { area: 'ESF IV', bairro: 'Rua Joaquim Ferreira de Souza' },
    ]);
    expect(buscarBairroAcs('a')).toEqual([]);
  });

  it('cargo inexistente', () => {
    expect(cargoPalmital(999)).toBeUndefined();
  });
});
