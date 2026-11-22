/**
 * D46: foco no cargo. As questões de uma área vêm de provas de muitos cargos (a Saúde superior
 * junta médico, veterinário, psicólogo, dentista...). A profissão de cada prova sai do nome do
 * cargo da prova, e a trilha e o simulado do aluno usam as questões das provas da profissão do
 * cargo dele. Nome sem regra fica sem profissão: a questão não entra no foco de ninguém.
 */

export const PROFISSOES = [
  // Saúde, nível superior
  'medicina',
  'veterinaria',
  'enfermagem',
  'psicologia',
  'odontologia',
  'farmacia',
  'fisioterapia',
  'fonoaudiologia',
  'nutricao',
  // Saúde, nível médio e técnico
  'tecnico_enfermagem',
  'acs',
  'endemias',
  'saneamento',
  'vigilancia_saude',
  'radiologia',
  'farmacia_tecnico',
  'saude_bucal',
  // Social e educação
  'servico_social',
  'educador_social',
  'professor',
  // Administrativo
  'administrativo',
  'administracao',
  'contabilidade',
  'controle_interno',
  'licitacao',
  'fiscal_tributos',
  'fiscal_obras',
  'ti',
  'jornalismo',
  'arquitetura',
  'agronomia',
  'tecnico_agricola',
  'meio_ambiente',
  // Operacional e serviços gerais
  'motorista',
  'operador_maquinas',
  'mecanico',
  'eletricista',
  'pedreiro',
  'vigia',
  'coletor',
  'servicos_gerais',
] as const;
export type Profissao = (typeof PROFISSOES)[number];

/** Minúsculas, sem acento e com espaços simples ("Médico  Veterinário" → "medico veterinario"). */
export function normalizarNomeDeCargo(nome: string): string {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * A primeira regra que casar decide. As exceções vêm antes das regras gerais: "Médico Veterinário"
 * não é medicina, "Psicopedagogo" não é psicologia nem professor, "Auxiliar de Dentista" é saúde
 * bucal, e professor de educação física, arte ou Libras não é o professor do edital.
 */
const REGRAS: readonly (readonly [RegExp, Profissao | null])[] = [
  [/veterinari/, 'veterinaria'],
  [/psicopedagog/, null],
  [/engenheir[oa] (agronom|agricola)/, 'agronomia'],
  [/engenheir[oa] ambiental/, 'meio_ambiente'],
  [/engenheir/, null],
  [/professor.*\b(artes?|libras)\b|educacao fisica|desportiv|esporte/, null],
  [/\bmedic[oa]\b/, 'medicina'],
  [/(tecnic[oa]|auxiliar) (de|em) enfermagem/, 'tecnico_enfermagem'],
  [/enfermeir/, 'enfermagem'],
  [/psicolog/, 'psicologia'],
  [
    /saude bucal|consultorio (dentario|odontologico)|higiene dental|auxiliar de dentista/,
    'saude_bucal',
  ],
  [/odontolog|dentista/, 'odontologia'],
  [/(atendente|tecnic[oa]|auxiliar|assistente) (de|em) farmacia/, 'farmacia_tecnico'],
  [/farmaceutic|bioquimic/, 'farmacia'],
  [/fisioterapeut/, 'fisioterapia'],
  [/fonoaudiolog/, 'fonoaudiologia'],
  [/nutricionist/, 'nutricao'],
  [/agente comunitari[oa] de saude/, 'acs'],
  [/endemias/, 'endemias'],
  [/saneamento/, 'saneamento'],
  [/vigilancia (em saude|sanitaria)/, 'vigilancia_saude'],
  [/radiolog|raio[ -]?x/, 'radiologia'],
  [/assistente social/, 'servico_social'],
  [/educador(a)? social|cuidador|mae social|orientador(a)? social/, 'educador_social'],
  [/^professor|pedagog|educador(a)? infantil/, 'professor'],
  [/controle interno|controlador interno/, 'controle_interno'],
  [/contador|contabil/, 'contabilidade'],
  [/licitac/, 'licitacao'],
  [/fiscal de obras/, 'fiscal_obras'],
  [/tribut|auditor fiscal/, 'fiscal_tributos'],
  [/informatica|tecnologia da informacao|analista de sistemas/, 'ti'],
  [/jornalist/, 'jornalismo'],
  [/arquitet/, 'arquitetura'],
  [/tecnico agricola|agropecuaria/, 'tecnico_agricola'],
  [/ambiental|meio ambiente|florestal/, 'meio_ambiente'],
  [/^administrador|recursos humanos/, 'administracao'],
  [/(auxiliar|agente|assistente|oficial|tecnico) admini?strativ/, 'administrativo'],
  [/eletricista/, 'eletricista'],
  [/mecanic/, 'mecanico'],
  [/motorista/, 'motorista'],
  [
    /operador de (maquina|rolo|escavadeira|retroescavadeira|motoniveladora|equipamento)/,
    'operador_maquinas',
  ],
  [/pedreiro/, 'pedreiro'],
  [/^vigia|vigilante/, 'vigia'],
  [/\bgari\b|coletor/, 'coletor'],
  [
    /servicos gerais|ajudante geral|auxiliar operacional|agente operacional|agente de operacao|zelador|servente escolar|limpeza/,
    'servicos_gerais',
  ],
];

/** Profissão de um cargo pelo nome (o da prova de origem ou o de um cargo genérico do app). */
export function profissaoDoNomeDeCargo(nome: string | null | undefined): Profissao | null {
  if (!nome) return null;
  const n = normalizarNomeDeCargo(nome);
  for (const [regra, profissao] of REGRAS) if (regra.test(n)) return profissao;
  return null;
}
