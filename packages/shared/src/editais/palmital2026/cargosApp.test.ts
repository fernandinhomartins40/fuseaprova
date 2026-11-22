import { describe, expect, it } from 'vitest';
import { AREAS_CARGO } from '../../dominio.js';
import { pontuacaoMaxima, totalDeQuestoes } from '../../simulado.js';
import {
  AREA_DO_CARGO_PALMITAL,
  cargosAppPalmital,
  distribuicaoDoNivel,
  PROFISSOES_DO_CARGO_PALMITAL,
  profissoesDoCargo,
} from './cargosApp.js';
import { CARGOS_PALMITAL } from './cargos.js';

const cargos = cargosAppPalmital();
const por = (codigo: number) => cargos.find((c) => c.codigo === codigo)!;

describe('cargos do edital no app (D45)', () => {
  it('os 49 cargos, cada um numa área que existe, e todas as áreas com cargo', () => {
    expect(cargos).toHaveLength(49);
    expect(Object.keys(AREA_DO_CARGO_PALMITAL)).toHaveLength(49);
    for (const c of cargos) expect(AREAS_CARGO, c.nome).toContain(c.area);
    expect(new Set(cargos.map((c) => c.area))).toEqual(new Set(AREAS_CARGO));
    expect(new Set(cargos.map((c) => c.nome)).size).toBe(49);
  });

  it('o simulado de cada nível tem as questões do edital e vale 100 pontos', () => {
    const esperado = { superior: 40, medio: 35, fundamental: 25 } as const;
    for (const nivel of ['superior', 'medio', 'fundamental'] as const) {
      const d = distribuicaoDoNivel(nivel);
      expect(totalDeQuestoes(d), nivel).toBe(esperado[nivel]);
      expect(pontuacaoMaxima(d, d.pesos), nivel).toBe(100);
    }
    expect(distribuicaoDoNivel('superior')).toEqual({
      portugues: 7,
      matematica: 7,
      gerais: 6,
      especificos: 20,
      pesos: { portugues: 2, matematica: 2, gerais: 2, especificos: 3 },
    });
    // Português do médio: 17,50 em 5 questões (o 3,00 impresso é erro do edital).
    expect(distribuicaoDoNivel('medio').pesos).toEqual({
      portugues: 3.5,
      matematica: 2.5,
      gerais: 2,
      especificos: 3,
    });
    expect(distribuicaoDoNivel('fundamental')).toMatchObject({
      especificos: 10,
      pesos: { portugues: 4, especificos: 6 },
    });
  });

  it('segue o nível do quadro, não o bloco do Anexo II', () => {
    expect(por(401).distribuicao.especificos).toBe(10); // Agente de Endemias: fundamental (quadro 3.4)
    expect(por(304).distribuicao.especificos).toBe(20); // Eletricista: médio (quadro 3.3)
    expect(por(306).escolaridade).toBe('medio');
  });

  it('escolaridade, vagas e conteúdo', () => {
    expect([302, 307, 308, 309].map((c) => por(c).escolaridade)).toEqual([
      'tecnico',
      'tecnico',
      'tecnico',
      'tecnico',
    ]);
    expect(por(403).escolaridade).toBe('fundamental');
    expect(por(201)).toMatchObject({
      nome: 'Professor Licenciatura Plena',
      escolaridade: 'superior',
      vagas: 25,
    });
    for (let c = 122; c <= 129; c++) expect(por(c).vagas, String(c)).toBeNull();
    expect(por(113).nome).toBe('Médico Clínico Geral 40h');
    expect(por(104).conteudoProgramatico).toMatch(
      /^Conhecimentos Específicos: Modelo de Atenção à Saúde/,
    );
    expect(por(104).conteudoProgramatico).toContain('Língua Portuguesa: ');
    expect(por(408).conteudoProgramatico).toContain('não traz conteúdo específico');
  });

  it('os 12 nomes iguais aos dos cargos genéricos ficam na área do genérico (ninguém muda de trilha)', () => {
    const genericos: Record<string, string> = {
      'Assistente Social': 'social_juridico',
      Enfermeiro: 'saude_superior',
      Farmacêutico: 'saude_superior',
      Fisioterapeuta: 'saude_superior',
      Nutricionista: 'saude_superior',
      Odontólogo: 'saude_superior',
      Psicólogo: 'saude_superior',
      'Agente Comunitário de Saúde': 'saude_medio',
      'Técnico de Enfermagem': 'saude_medio',
      'Auxiliar Administrativo': 'administrativo',
      Motorista: 'operacional',
      'Operador de Máquinas': 'operacional',
    };
    const iguais = cargos.filter((c) => c.nome in genericos);
    expect(iguais).toHaveLength(12);
    for (const c of iguais) expect(c.area, c.nome).toBe(genericos[c.nome]);
  });

  it('a ordem é a dos quadros do edital', () => {
    expect(cargos.map((c) => c.codigo)).toEqual(CARGOS_PALMITAL.map((c) => c.codigo));
  });
});

describe('profissões de cada cargo (D46)', () => {
  it('os 49 cargos do edital têm pelo menos uma profissão, sem repetir', () => {
    for (const c of CARGOS_PALMITAL) {
      const p = PROFISSOES_DO_CARGO_PALMITAL[c.codigo];
      expect(p?.length, c.nome).toBeGreaterThan(0);
      expect(new Set(p).size, c.nome).toBe(p!.length);
    }
    expect(Object.keys(PROFISSOES_DO_CARGO_PALMITAL)).toHaveLength(49);
  });

  it('pelo nome do cargo do edital: o médico não leva a veterinária, e vice-versa', () => {
    expect(profissoesDoCargo('Médico Clínico Geral 40h')).toEqual(['medicina']);
    expect(profissoesDoCargo('Médico Pediatra')).toEqual(['medicina']);
    expect(profissoesDoCargo('Médico Veterinário')).toEqual(['veterinaria']);
    expect(profissoesDoCargo('Psicólogo')).toEqual(['psicologia']);
    expect(profissoesDoCargo('Vigia 12X36')).toEqual(['vigia', 'servicos_gerais']);
  });

  it('cargo genérico (antes do edital) usa a profissão do próprio nome; sem regra, nenhuma', () => {
    expect(profissoesDoCargo('Professor')).toEqual(['professor']);
    expect(profissoesDoCargo('Agente de Endemias')).toEqual(['endemias']);
    expect(profissoesDoCargo('Médico')).toEqual(['medicina']);
    expect(profissoesDoCargo('Fiscal')).toEqual([]);
    expect(profissoesDoCargo('Recepcionista')).toEqual([]);
  });
});
