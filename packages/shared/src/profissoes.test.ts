import { describe, expect, it } from 'vitest';
import { PROFISSOES_DO_CARGO_PALMITAL } from './editais/palmital2026/cargosApp.js';
import {
  normalizarNomeDeCargo,
  PROFISSOES,
  profissaoDoNomeDeCargo,
  type Profissao,
} from './profissoes.js';

// Nomes de cargo como estão nas provas do banco (provas_origem.cargo, 22/11/2026).
const CASOS: readonly (readonly [string, Profissao | null])[] = [
  // Medicina, com as especialidades, mas nunca a veterinária
  ['Médico', 'medicina'],
  ['Médico Clínico Geral', 'medicina'],
  ['Médico 40 horas', 'medicina'],
  ['Médico Pediatra', 'medicina'],
  ['Médico Ginecologista/Obstetra', 'medicina'],
  ['Médico T4 I - Cirurgião Geral', 'medicina'],
  ['Médico da Família e Comunidade', 'medicina'],
  ['Médico em Segurança do Trabalho I', 'medicina'],
  ['Médico Veterinário', 'veterinaria'],
  ['Médico Veterinário I', 'veterinaria'],
  // Enfermagem: o técnico e o auxiliar são outra profissão
  ['Enfermeiro', 'enfermagem'],
  ['Enfermeiro T8 - ESF I', 'enfermagem'],
  ['Técnico em Enfermagem', 'tecnico_enfermagem'],
  ['Técnico de Enfermagem', 'tecnico_enfermagem'],
  ['Auxiliar de Enfermagem do Trabalho', 'tecnico_enfermagem'],
  // Psicologia, mas não a psicopedagogia
  ['Psicólogo', 'psicologia'],
  ['Psicólogo - I', 'psicologia'],
  ['Psicopedagogo', null],
  // Odontologia x saúde bucal (nível médio)
  ['Odontólogo', 'odontologia'],
  ['Cirurgião Dentista 20H', 'odontologia'],
  ['Dentista III', 'odontologia'],
  ['Auxiliar de Dentista', 'saude_bucal'],
  ['Técnico em Saúde Bucal', 'saude_bucal'],
  ['Auxiliar de Consultório Dentário', 'saude_bucal'],
  ['Auxiliar de Consultório Odontológico', 'saude_bucal'],
  ['Técnico de Higiene Dental', 'saude_bucal'],
  // Farmácia x atendente de farmácia
  ['Farmacêutico', 'farmacia'],
  ['Farmacêutico Bioquímico', 'farmacia'],
  ['Bioquímico ou Biomédico', 'farmacia'],
  ['Atendente de Farmácia', 'farmacia_tecnico'],
  ['Técnico em Farmácia', 'farmacia_tecnico'],
  ['Auxiliar de Farmácia Plantonista', 'farmacia_tecnico'],
  ['Fisioterapeuta I', 'fisioterapia'],
  ['Fonoaudiólogo', 'fonoaudiologia'],
  ['Nutricionista 20h', 'nutricao'],
  // Saúde (médio)
  ['Agente Comunitário de Saúde', 'acs'],
  ['Agente de Combate às Endemias', 'endemias'],
  ['Agente de Endemias', 'endemias'],
  ['Agente de saneamento', 'saneamento'],
  ['Técnico de Vigilância em Saúde', 'vigilancia_saude'],
  ['Técnico em Radiologia', 'radiologia'],
  ['Técnico em Raio X', 'radiologia'],
  // Social e educação
  ['Assistente Social', 'servico_social'],
  ['Assistente em Desenvolvimento Social I', null],
  ['Educador Social Feminino', 'educador_social'],
  ['Cuidador Social I', 'educador_social'],
  ['Mãe Social', 'educador_social'],
  ['Professor', 'professor'],
  ['Professor (Educação Infantil/Fundamental)', 'professor'],
  ['Pedagogo', 'professor'],
  ['Educador Infantil', 'professor'],
  ['Professor de Educação Física', null],
  ['Professor de Artes', null],
  ['Professor de Arte 20h', null],
  ['Professor de Libras', null],
  ['Bacharel em Educação Física', null],
  ['Técnico Desportivo I', null],
  ['Instrutor de Esportes', null],
  // Administrativo
  ['Agente Administrativo', 'administrativo'],
  ['Agente Adminstrativo III', 'administrativo'],
  ['Oficial Administrativo', 'administrativo'],
  ['Administrador', 'administracao'],
  ['Gestor de Recursos Humanos', 'administracao'],
  ['Contador', 'contabilidade'],
  ['Analista Contábil', 'contabilidade'],
  ['Controlador Interno', 'controle_interno'],
  ['Auditor de Controle Interno', 'controle_interno'],
  ['Técnico de Licitações e Contratos', 'licitacao'],
  ['Fiscal de Tributos', 'fiscal_tributos'],
  ['Auditor Fiscal', 'fiscal_tributos'],
  ['Fiscal de Tributos Obras e Posturas', 'fiscal_tributos'],
  ['Fiscal de Obras e Posturas', 'fiscal_obras'],
  ['Fiscal Auxiliar', null],
  ['Técnico em Informática', 'ti'],
  ['Analista em Tecnologia da Informação I', 'ti'],
  ['Jornalista I', 'jornalismo'],
  ['Arquiteto e Urbanista', 'arquitetura'],
  ['Engenheiro Agrônomo', 'agronomia'],
  ['Engenheiro Agrícola', 'agronomia'],
  ['Engenheiro Ambiental', 'meio_ambiente'],
  ['Engenheiro Civil', null],
  ['Engenheiro Eletricista', null],
  ['Técnico Agrícola', 'tecnico_agricola'],
  ['Técnico em Agropecuária', 'tecnico_agricola'],
  ['Técnico Ambiental', 'meio_ambiente'],
  ['Fiscal em Meio Ambiente I', 'meio_ambiente'],
  ['Técnico Florestal', 'meio_ambiente'],
  // Operacional e serviços gerais
  ['Motorista de Ônibus', 'motorista'],
  ['Operador de Máquinas/Patrola', 'operador_maquinas'],
  ['Operador de Retroescavadeira', 'operador_maquinas'],
  ['Mecânico de Autos/Máquinas Pesadas', 'mecanico'],
  ['Eletricista de Autos/Máquinas Pesadas', 'eletricista'],
  ['Servente de Pedreiro', 'pedreiro'],
  ['Vigia', 'vigia'],
  ['Gari', 'coletor'],
  ['Auxiliar de Serviços Gerais - Categoria Masculina', 'servicos_gerais'],
  ['Agente de Operação Masculino', 'servicos_gerais'],
  ['Zeladora', 'servicos_gerais'],
  ['Auxiliar de Limpeza e Copa', 'servicos_gerais'],
  // Sem cargo no edital de Palmital
  ['Advogado', null],
  ['Agente de Inspeção Municipal I', null],
  ['Guarda Civil Municipal', null],
  ['Técnico em Segurança do Trabalho', null],
  ['Terapeuta Ocupacional', null],
];

describe('profissaoDoNomeDeCargo (D46)', () => {
  it.each(CASOS)('%s → %s', (nome, esperado) => {
    expect(profissaoDoNomeDeCargo(nome)).toBe(esperado);
  });

  it('sem nome, sem profissão', () => {
    expect(profissaoDoNomeDeCargo(null)).toBeNull();
    expect(profissaoDoNomeDeCargo(undefined)).toBeNull();
    expect(profissaoDoNomeDeCargo('')).toBeNull();
  });

  it('ignora acento, maiúscula e espaço sobrando', () => {
    expect(normalizarNomeDeCargo('  Médico   VETERINÁRIO ')).toBe('medico veterinario');
    expect(profissaoDoNomeDeCargo('MEDICO  VETERINARIO')).toBe('veterinaria');
  });

  it('toda profissão usada por um cargo do edital sai de algum nome de prova', () => {
    const produzidas = new Set(CASOS.map(([, p]) => p));
    const usadas = new Set(Object.values(PROFISSOES_DO_CARGO_PALMITAL).flat());
    for (const p of usadas) expect(produzidas, p).toContain(p);
    for (const p of usadas) expect(PROFISSOES).toContain(p);
  });
});
