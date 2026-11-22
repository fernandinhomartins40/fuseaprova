/**
 * D45: os 49 cargos do edital de Palmital como cargos do app (tabela `cargos`), usados pelo comando
 * `edital:palmital` da API. As questões são ligadas a assuntos e ÁREAS, não a cargos: a área de cada
 * cargo decide quais questões específicas entram na trilha e no simulado, então nenhuma questão é
 * criada, movida ou apagada. A distribuição e os pesos do simulado seguem a prova do nível (Tabelas
 * 9.1 a 9.4), derivados de MATERIAS_POR_NIVEL, que o teste do "Descubra seu cargo" confere.
 */
import type {
  AreaCargo,
  Escolaridade as EscolaridadeCargo,
  SlugDisciplina,
} from '../../dominio.js';
import { profissaoDoNomeDeCargo, type Profissao } from '../../profissoes.js';
import {
  CARGOS_PALMITAL,
  CONHECIMENTOS_COMUNS,
  MATERIAS_POR_NIVEL,
  TEXTOS_CARGOS,
  type CargoPalmital,
  type NivelCargo,
} from './cargos.js';

/**
 * Área de cada cargo, escolhida pelo conteúdo que já existe em cada área (assuntos e questões).
 * Os 12 cargos com o mesmo nome de um cargo genérico ficam na mesma área dele, para quem já
 * escolheu esse cargo não mudar de trilha.
 */
export const AREA_DO_CARGO_PALMITAL: Readonly<Record<number, AreaCargo>> = {
  101: 'saude_superior', // Agente Sanitário
  102: 'social_juridico', // Assistente Social
  103: 'administrativo', // Arquiteto Urbanista (arquitetura, urbanismo, Estatuto da Cidade)
  104: 'saude_superior', // Enfermeiro
  105: 'saude_superior', // Enfermeiro 12/36
  106: 'administrativo', // Engenheiro Agrônomo (agronomia está no administrativo)
  107: 'saude_superior', // Farmacêutico
  108: 'administrativo', // Fiscal de Tributos (direito tributário, posturas, LRF)
  109: 'saude_superior', // Fisioterapeuta
  110: 'saude_superior', // Fonoaudiólogo
  111: 'administrativo', // Jornalista (jornalismo e comunicação organizacional)
  112: 'saude_superior', // Médico Veterinário
  113: 'saude_superior', // Médico Clínico Geral 40h
  114: 'saude_superior', // Médico Clínico Geral 20h
  115: 'saude_superior', // Médico Ginecologista
  116: 'saude_superior', // Médico Neuropediatra
  117: 'saude_superior', // Médico Pediatra
  118: 'saude_superior', // Nutricionista
  119: 'saude_superior', // Odontólogo
  120: 'administrativo', // Profissional em TI
  121: 'saude_superior', // Psicólogo
  122: 'administrativo', // Técnico Controle Administração
  123: 'administrativo', // Técnico Controle Agricultura
  124: 'administrativo', // Técnico Controle Central Controles
  125: 'administrativo', // Técnico Controle Educação
  126: 'administrativo', // Técnico Controle Finanças
  127: 'administrativo', // Técnico Controle Licitação
  128: 'administrativo', // Técnico Controle Saúde
  129: 'administrativo', // Técnico Controle Procuradoria
  201: 'educacao', // Professor Licenciatura Plena
  301: 'saude_medio', // Agente Comunitário de Saúde
  302: 'saude_medio', // Atendente de Farmácia
  303: 'social_juridico', // Educador Social (atuação do educador social, ECA, SUAS)
  304: 'operacional', // Eletricista
  305: 'administrativo', // Fiscal de Obras (código de obras, construção e engenharia civil)
  306: 'operacional', // Mecânico de Máquinas Pesadas
  307: 'administrativo', // Técnico Ambiental (legislação e gestão ambiental)
  308: 'saude_medio', // Técnico de Enfermagem
  309: 'saude_medio', // Técnico em Radiologia
  401: 'saude_medio', // Agente de Combate a Endemias
  402: 'saude_medio', // Auxiliar de Consultório Dentário
  403: 'administrativo', // Auxiliar Administrativo
  404: 'servicos_gerais', // Agente Coletor de Resíduos
  405: 'servicos_gerais', // Lavador de Veículos
  406: 'operacional', // Motorista
  407: 'operacional', // Operador de Máquinas
  408: 'operacional', // Pedreiro (construção civil, ferramentas e manutenção)
  409: 'servicos_gerais', // Vigia
  410: 'servicos_gerais', // Vigia 12X36
};

const MEDICINA: readonly Profissao[] = ['medicina'];
const ENFERMAGEM: readonly Profissao[] = ['enfermagem'];
/** Os Técnicos de Controle têm o mesmo conteúdo específico: administração geral e pública. */
const CONTROLE: readonly Profissao[] = [
  'administracao',
  'controle_interno',
  'contabilidade',
  'licitacao',
  'administrativo',
];
const VIGIA: readonly Profissao[] = ['vigia', 'servicos_gerais'];

/**
 * D46: profissões de cada cargo, pelo conteúdo específico do Anexo II. A trilha e o simulado do
 * cargo usam as questões das provas dessas profissões. A segunda em diante cobre cargos com poucas
 * questões próprias no banco (Agente Sanitário, Lavador de Veículos, Coletor, Vigia).
 */
export const PROFISSOES_DO_CARGO_PALMITAL: Readonly<Record<number, readonly Profissao[]>> = {
  101: ['saneamento', 'endemias', 'vigilancia_saude'], // água, esgoto, lixo, vetores
  102: ['servico_social'],
  103: ['arquitetura'],
  104: ENFERMAGEM,
  105: ENFERMAGEM,
  106: ['agronomia', 'tecnico_agricola'],
  107: ['farmacia'],
  108: ['fiscal_tributos'],
  109: ['fisioterapia'],
  110: ['fonoaudiologia'],
  111: ['jornalismo'],
  112: ['veterinaria'],
  113: MEDICINA,
  114: MEDICINA,
  115: MEDICINA,
  116: MEDICINA,
  117: MEDICINA,
  118: ['nutricao'],
  119: ['odontologia'],
  120: ['ti'],
  121: ['psicologia'],
  122: CONTROLE,
  123: CONTROLE,
  124: CONTROLE,
  125: CONTROLE,
  126: CONTROLE,
  127: CONTROLE,
  128: CONTROLE,
  129: CONTROLE,
  201: ['professor'],
  // O Anexo II trouxe para o ACS o conteúdo do Atendente de Farmácia (D44): as duas, até a FAU corrigir.
  301: ['acs', 'farmacia_tecnico'],
  302: ['farmacia_tecnico'],
  303: ['educador_social'],
  304: ['eletricista'],
  305: ['fiscal_obras'],
  306: ['mecanico'],
  307: ['meio_ambiente'],
  308: ['tecnico_enfermagem'],
  309: ['radiologia'],
  401: ['endemias'],
  402: ['saude_bucal'],
  403: ['administrativo'],
  404: ['coletor', 'servicos_gerais'],
  405: ['servicos_gerais'],
  406: ['motorista'],
  407: ['operador_maquinas'],
  408: ['pedreiro'],
  409: VIGIA,
  410: VIGIA,
};

/**
 * Profissões de um cargo do app pelo nome: as do edital de Palmital ou, num cargo genérico (antes
 * do edital, como "Médico" ou "Professor"), a do próprio nome. Sem profissão, o cargo fica com a
 * área inteira, como antes da D46.
 */
export function profissoesDoCargo(nome: string): readonly Profissao[] {
  const doEdital = CARGOS_PALMITAL.find((c) => c.nome === nome);
  if (doEdital) return PROFISSOES_DO_CARGO_PALMITAL[doEdital.codigo] ?? [];
  const pelaRegra = profissaoDoNomeDeCargo(nome);
  return pelaRegra ? [pelaRegra] : [];
}

/** Cargos de nível médio que exigem curso técnico (Anexo I). */
const COM_CURSO_TECNICO = new Set([302, 307, 308, 309]);

const ESCOLARIDADE_DO_NIVEL: Record<NivelCargo, EscolaridadeCargo> = {
  superior: 'superior',
  medio: 'medio',
  fundamental: 'fundamental',
};

const BLOCOS: readonly SlugDisciplina[] = ['portugues', 'matematica', 'gerais', 'especificos'];

export interface DistribuicaoEdital {
  portugues: number;
  matematica: number;
  gerais: number;
  especificos: number;
  pesos: { portugues: number; matematica: number; gerais: number; especificos: number };
}

/** Questões e pesos por bloco da prova objetiva de cada nível (o peso é o total ÷ questões). */
export function distribuicaoDoNivel(nivel: NivelCargo): DistribuicaoEdital {
  const materias = MATERIAS_POR_NIVEL[nivel];
  const d = { pesos: {} } as DistribuicaoEdital;
  BLOCOS.forEach((b, i) => {
    const m = materias[i]!;
    d[b] = m.questoes;
    // Médio, Português: o edital imprime 3,00 por questão, mas o total de 17,50 dá 3,50 (D44).
    d.pesos[b] = Math.round((m.total / m.questoes) * 100) / 100;
  });
  return d;
}

/** Conteúdo programático do cargo (Anexo II): específicos do cargo e comuns do nível. */
export function conteudoProgramaticoDe(cargo: CargoPalmital): string {
  const t = TEXTOS_CARGOS[String(cargo.codigo) as keyof typeof TEXTOS_CARGOS];
  const comuns = CONHECIMENTOS_COMUNS[cargo.nivel].materias;
  const partes = [
    `Conhecimentos Específicos: ${t.especificos ?? 'o Anexo II não traz conteúdo específico para este cargo.'}`,
    ...Object.entries(comuns).map(([nome, texto]) => `${nome}: ${texto}`),
  ];
  return partes.join('\n\n');
}

export interface CargoAppPalmital {
  codigo: number;
  nome: string;
  area: AreaCargo;
  escolaridade: EscolaridadeCargo;
  /** Vagas da ampla concorrência no quadro; null quando o cargo é só cadastro reserva. */
  vagas: number | null;
  distribuicao: DistribuicaoEdital;
  conteudoProgramatico: string;
}

/** Os 49 cargos na ordem dos quadros 3.1 a 3.4. */
export function cargosAppPalmital(): CargoAppPalmital[] {
  return CARGOS_PALMITAL.map((c) => {
    const area = AREA_DO_CARGO_PALMITAL[c.codigo];
    if (!area) throw new Error(`Cargo ${c.codigo} sem área.`);
    return {
      codigo: c.codigo,
      nome: c.nome,
      area,
      escolaridade: COM_CURSO_TECNICO.has(c.codigo) ? 'tecnico' : ESCOLARIDADE_DO_NIVEL[c.nivel],
      vagas: c.vagasAmpla > 0 ? c.vagasAmpla : null,
      distribuicao: distribuicaoDoNivel(c.nivel),
      conteudoProgramatico: conteudoProgramaticoDe(c),
    };
  });
}
