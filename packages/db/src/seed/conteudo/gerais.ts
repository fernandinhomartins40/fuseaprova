import type { UnidadeSeed } from './tipos.js';

/*
 * TODO(conteúdo): obter na Câmara Municipal de Palmital-PR (ou na Prefeitura) o texto
 * VIGENTE da Lei Orgânica do Município e do Estatuto dos Servidores, conferir e escrever
 * as questões específicas (PRD 7.1 e risco "Lei Orgânica ou Estatuto desatualizados").
 *
 * Até lá, as questões abaixo tratam só de regras da Constituição Federal que valem para
 * qualquer município (arts. 29, 30, 31, 37, 39 e 41). Nenhuma delas descreve conteúdo
 * próprio das leis de Palmital.
 */
const TODO_LEIS_PALMITAL =
  'Obter na Câmara Municipal de Palmital-PR o texto vigente da Lei Orgânica e do Estatuto dos Servidores e escrever questões específicas. As atuais cobrem só a Constituição Federal.';

export const unidadeLeiOrganica: UnidadeSeed = {
  chave: 'unidade:lei-organica-palmital',
  titulo: 'Lei Orgânica de Palmital',
  disciplina: 'gerais',
  area: null,
  ordem: 3,
  todo: TODO_LEIS_PALMITAL,
  secoes: [
    {
      chave: 'secao:lei-organica-base',
      titulo: 'O que é a Lei Orgânica',
      assunto: {
        slug: 'lei-organica-municipal',
        nome: 'Lei Orgânica Municipal',
        dicaTitulo: 'A "constituição" do município',
        dicaTexto:
          'Pelo art. 29 da Constituição Federal, o Município se rege por lei orgânica, votada em dois turnos, com intervalo mínimo de dez dias, aprovada por dois terços dos membros da Câmara Municipal, que a promulga. Ela deve respeitar a Constituição Federal e a do Estado.',
        dicaExemplo: 'Dois turnos · 10 dias de intervalo · 2/3 da Câmara · promulgada pela Câmara',
      },
      questoes: [
        {
          chave: 'q:lei-organica:01',
          enunciado: 'Segundo a Constituição Federal (art. 29), o Município é regido por:',
          alternativas: [
            'lei orgânica.',
            'constituição municipal aprovada por plebiscito.',
            'decreto do prefeito.',
            'regimento interno da Câmara.',
            'estatuto aprovado pela Assembleia Legislativa.',
          ],
          gabarito: 'A',
          explicacao:
            'O caput do art. 29 da Constituição diz que "o Município reger-se-á por lei orgânica", que funciona como a lei maior do município.',
          dicaBolso: 'Município: lei orgânica. Estado: constituição estadual.',
          dica: 'O nome da lei está no título desta unidade.',
          dificuldade: 1,
        },
        {
          chave: 'q:lei-organica:02',
          enunciado:
            'A lei orgânica municipal é votada em dois turnos, com intervalo mínimo de dez dias, e aprovada por:',
          alternativas: [
            'maioria simples dos vereadores presentes.',
            'dois terços dos membros da Câmara Municipal.',
            'três quintos dos membros da Câmara Municipal.',
            'unanimidade dos vereadores.',
            'metade mais um dos eleitores do município.',
          ],
          gabarito: 'B',
          explicacao:
            'O art. 29 da Constituição exige aprovação por dois terços dos membros da Câmara Municipal.',
          dicaBolso: 'Lei orgânica: 2 turnos, 10 dias, 2/3.',
          dica: 'É um quórum maior que a maioria absoluta.',
          dificuldade: 2,
        },
        {
          chave: 'q:lei-organica:03',
          enunciado: 'Segundo a Constituição Federal, a lei orgânica do município é promulgada:',
          alternativas: [
            'pelo Prefeito.',
            'pela Câmara Municipal.',
            'pelo Governador do Estado.',
            'pela Assembleia Legislativa.',
            'pelo Tribunal de Contas.',
          ],
          gabarito: 'B',
          explicacao:
            'O art. 29 diz que a lei orgânica é aprovada por dois terços dos membros da Câmara Municipal, "que a promulgará".',
          dicaBolso: 'Quem aprova a lei orgânica também a promulga: a Câmara.',
          dica: 'Não depende de sanção do Executivo.',
          dificuldade: 2,
        },
        {
          chave: 'q:lei-organica:04',
          enunciado: 'Segundo o art. 30 da Constituição Federal, compete aos Municípios:',
          alternativas: [
            'legislar sobre assuntos de interesse local.',
            'emitir moeda.',
            'legislar sobre direito penal.',
            'declarar guerra.',
            'manter as Forças Armadas.',
          ],
          gabarito: 'A',
          explicacao:
            'O art. 30, I, dá aos Municípios a competência de legislar sobre assuntos de interesse local. Moeda, direito penal, guerra e Forças Armadas são da União.',
          dicaBolso: 'Município cuida do interesse local.',
          dica: 'Qual delas tem a ver com o dia a dia da cidade?',
          dificuldade: 1,
        },
        {
          chave: 'q:lei-organica:05',
          enunciado: 'A lei orgânica de um município deve respeitar:',
          alternativas: [
            'apenas as leis municipais anteriores.',
            'os princípios da Constituição Federal e da Constituição do respectivo Estado.',
            'apenas os decretos do prefeito.',
            'nenhuma norma superior, pois o município é soberano.',
            'apenas o regimento interno da Câmara.',
          ],
          gabarito: 'B',
          explicacao:
            'O art. 29 manda a lei orgânica atender aos princípios da Constituição Federal e da Constituição do Estado. O município é autônomo, não soberano.',
          dicaBolso: 'Autonomia não é soberania: a lei orgânica obedece às Constituições.',
          dica: 'Quais leis estão acima da lei orgânica?',
          dificuldade: 1,
        },
      ],
    },
    {
      chave: 'secao:poderes-municipio',
      titulo: 'Poderes do Município',
      assunto: {
        slug: 'poderes-do-municipio',
        nome: 'Poderes do Município',
        dicaTitulo: 'Prefeitura executa, Câmara legisla e fiscaliza',
        dicaTexto:
          'No município, o Executivo é exercido pelo Prefeito e o Legislativo pela Câmara Municipal. Prefeito, Vice-Prefeito e Vereadores têm mandato de quatro anos. A fiscalização é feita pela Câmara (controle externo, com auxílio do Tribunal de Contas) e pelo controle interno do Executivo.',
        dicaExemplo:
          'Prefeito → Executivo · Câmara → Legislativo · Tribunal de Contas → auxilia a Câmara',
      },
      questoes: [
        {
          chave: 'q:poderes:01',
          enunciado: 'No Município, o Poder Executivo é exercido pelo(a):',
          alternativas: [
            'Câmara Municipal.',
            'Prefeito.',
            'Juiz de Direito da comarca.',
            'Governador do Estado.',
            'vereador mais votado.',
          ],
          gabarito: 'B',
          explicacao: 'O Prefeito chefia o Poder Executivo municipal, auxiliado pelos secretários.',
          dicaBolso: 'Prefeito executa; Câmara legisla.',
          dica: 'Quem administra a Prefeitura?',
          dificuldade: 1,
        },
        {
          chave: 'q:poderes:02',
          enunciado: 'O Poder Legislativo municipal é exercido pela:',
          alternativas: [
            'Câmara Municipal.',
            'Prefeitura.',
            'Assembleia Legislativa.',
            'Secretaria de Administração.',
            'Procuradoria do Município.',
          ],
          gabarito: 'A',
          explicacao:
            'A Câmara Municipal, formada pelos vereadores, exerce o Legislativo no município.',
          dicaBolso: 'Vereadores = Câmara = Legislativo municipal.',
          dica: 'Onde os vereadores trabalham?',
          dificuldade: 1,
        },
        {
          chave: 'q:poderes:03',
          enunciado:
            'Segundo o art. 31 da Constituição, o controle externo da fiscalização do Município é exercido:',
          alternativas: [
            'pelo Prefeito, sozinho.',
            'pela Câmara Municipal, com o auxílio do Tribunal de Contas.',
            'pelo Ministério Público, exclusivamente.',
            'pela Polícia Militar.',
            'pelos servidores municipais, em assembleia.',
          ],
          gabarito: 'B',
          explicacao:
            'A fiscalização do Município é exercida pelo Legislativo municipal, mediante controle externo (com auxílio do Tribunal de Contas), e pelo controle interno do Executivo.',
          dicaBolso: 'Controle externo: Câmara + Tribunal de Contas.',
          dica: 'Quem fiscaliza o Prefeito é o outro Poder.',
          dificuldade: 2,
        },
        {
          chave: 'q:poderes:04',
          enunciado:
            'Pela Constituição Federal, o mandato do Prefeito, do Vice-Prefeito e dos Vereadores é de:',
          alternativas: ['dois anos.', 'três anos.', 'quatro anos.', 'cinco anos.', 'seis anos.'],
          gabarito: 'C',
          explicacao:
            'O art. 29, I, prevê eleição do Prefeito, do Vice-Prefeito e dos Vereadores para mandato de quatro anos.',
          dicaBolso: 'Eleição municipal: de 4 em 4 anos.',
          dica: 'É o mesmo prazo do mandato do Presidente.',
          dificuldade: 1,
        },
        {
          chave: 'q:poderes:05',
          enunciado: 'Segundo a Constituição Federal, os Vereadores são invioláveis:',
          alternativas: [
            'por qualquer ato, em qualquer lugar do país.',
            'por suas opiniões, palavras e votos no exercício do mandato e na circunscrição do Município.',
            'apenas durante as sessões secretas.',
            'somente depois do fim do mandato.',
            'em nenhuma hipótese.',
          ],
          gabarito: 'B',
          explicacao:
            'O art. 29, VIII, garante a inviolabilidade dos Vereadores por suas opiniões, palavras e votos no exercício do mandato e na circunscrição do Município.',
          dicaBolso: 'Imunidade do vereador: opinião, palavra e voto, dentro do município.',
          dica: 'A proteção tem limite de lugar.',
          dificuldade: 3,
        },
      ],
    },
  ],
};

export const unidadeEstatuto: UnidadeSeed = {
  chave: 'unidade:estatuto-servidores-palmital',
  titulo: 'Estatuto dos Servidores de Palmital',
  disciplina: 'gerais',
  area: null,
  ordem: 4,
  todo: TODO_LEIS_PALMITAL,
  secoes: [
    {
      chave: 'secao:estabilidade',
      titulo: 'Ingresso e estabilidade',
      assunto: {
        slug: 'estabilidade-servidor',
        nome: 'Ingresso e estabilidade do servidor',
        dicaTitulo: '3 anos e avaliação especial',
        dicaTexto:
          'Pelo art. 41 da Constituição, o servidor nomeado por concurso para cargo efetivo fica estável após três anos de efetivo exercício, com aprovação em avaliação especial de desempenho. O estatuto do município detalha essas regras para os servidores locais.',
        dicaExemplo:
          'Concurso → nomeação → 3 anos de exercício + avaliação especial → estabilidade',
      },
      questoes: [
        {
          chave: 'q:estatuto:01',
          enunciado:
            'Segundo a Constituição Federal, os servidores nomeados para cargo efetivo em virtude de concurso público tornam-se estáveis após:',
          alternativas: [
            'um ano de efetivo exercício.',
            'dois anos de efetivo exercício.',
            'três anos de efetivo exercício.',
            'cinco anos de efetivo exercício.',
            'a posse.',
          ],
          gabarito: 'C',
          explicacao:
            'O art. 41 da Constituição (redação da EC 19/1998) fixa a estabilidade após três anos de efetivo exercício.',
          dicaBolso: 'Estabilidade: 3 anos.',
          dica: 'O prazo mudou com a Reforma Administrativa de 1998.',
          dificuldade: 1,
        },
        {
          chave: 'q:estatuto:02',
          enunciado: 'Como condição para adquirir a estabilidade, a Constituição exige:',
          alternativas: [
            'avaliação especial de desempenho por comissão instituída para essa finalidade.',
            'indicação do Prefeito.',
            'filiação a sindicato.',
            'nova aprovação em concurso.',
            'pedido escrito do servidor.',
          ],
          gabarito: 'A',
          explicacao:
            'O art. 41, § 4º, torna obrigatória a avaliação especial de desempenho por comissão instituída para essa finalidade.',
          dicaBolso: 'Sem avaliação especial, não há estabilidade.',
          dica: 'O desempenho do servidor é avaliado.',
          dificuldade: 2,
        },
        {
          chave: 'q:estatuto:03',
          enunciado:
            'O servidor público estável pode perder o cargo, entre outras hipóteses, em virtude de:',
          alternativas: [
            'sentença judicial transitada em julgado.',
            'simples decisão do chefe imediato.',
            'mudança de prefeito.',
            'reclamação verbal de um cidadão.',
            'um único atraso.',
          ],
          gabarito: 'A',
          explicacao:
            'O art. 41, § 1º, prevê a perda do cargo por sentença judicial transitada em julgado, por processo administrativo com ampla defesa ou por avaliação periódica de desempenho, na forma de lei complementar, com ampla defesa.',
          dicaBolso: 'Estável só sai por sentença, processo administrativo ou avaliação periódica.',
          dica: 'A estabilidade protege contra decisões sem processo.',
          dificuldade: 2,
        },
        {
          chave: 'q:estatuto:04',
          enunciado: 'O estatuto dos servidores de um município é a lei que:',
          alternativas: [
            'define os direitos, os deveres e o regime jurídico dos servidores municipais.',
            'aprova o orçamento anual.',
            'cria os impostos municipais.',
            'organiza as eleições municipais.',
            'regula o trânsito da cidade.',
          ],
          gabarito: 'A',
          explicacao:
            'O estatuto reúne as regras da relação entre o município e seus servidores: ingresso, direitos, deveres, licenças, regime disciplinar e outras.',
          dicaBolso: 'Estatuto = o "manual" de direitos e deveres do servidor.',
          dica: 'Pense no nome: estatuto "dos servidores".',
          dificuldade: 1,
        },
        {
          chave: 'q:estatuto:05',
          enunciado:
            'Um servidor aprovado em concurso e nomeado para cargo efetivo há um ano e meio, segundo a Constituição Federal:',
          alternativas: [
            'ainda não é estável.',
            'já é estável desde a posse.',
            'nunca será avaliado.',
            'não pode ser exonerado em hipótese alguma.',
            'é ocupante de cargo em comissão.',
          ],
          gabarito: 'A',
          explicacao:
            'A estabilidade só vem após três anos de efetivo exercício e aprovação na avaliação especial de desempenho. Com um ano e meio, ainda não houve esse prazo.',
          dicaBolso: 'Antes de 3 anos: ainda sem estabilidade.',
          dica: 'Compare o tempo de serviço com o prazo da Constituição.',
          dificuldade: 1,
        },
      ],
    },
    {
      chave: 'secao:direitos-cargos',
      titulo: 'Direitos e cargos',
      assunto: {
        slug: 'direitos-e-cargos-servidor',
        nome: 'Direitos do servidor e tipos de cargo',
        dicaTitulo: 'O que a Constituição garante',
        dicaTexto:
          'O art. 39, § 3º, estende aos servidores direitos como 13º salário e férias com 1/3 a mais. Cargos em comissão são de livre nomeação e exoneração e servem só para direção, chefia e assessoramento. Acumular cargos é proibido, salvo exceções como dois cargos de professor, com horários compatíveis.',
        dicaExemplo: 'Férias + 1/3 · 13º salário · comissão = direção, chefia e assessoramento',
      },
      questoes: [
        {
          chave: 'q:estatuto:06',
          enunciado:
            'Em regra, a Constituição proíbe a acumulação remunerada de cargos públicos. Uma das exceções, havendo compatibilidade de horários, é a de:',
          alternativas: [
            'dois cargos de professor.',
            'dois cargos de motorista.',
            'dois cargos administrativos quaisquer.',
            'qualquer acumulação autorizada pelo prefeito.',
            'dois cargos em comissão.',
          ],
          gabarito: 'A',
          explicacao:
            'O art. 37, XVI, permite, com horários compatíveis: dois cargos de professor; um de professor com outro técnico ou científico; e dois cargos ou empregos privativos de profissionais de saúde com profissões regulamentadas.',
          dicaBolso:
            'Acumulação permitida: professor + professor, professor + técnico, saúde + saúde.',
          dica: 'Uma das exceções envolve a educação.',
          dificuldade: 2,
        },
        {
          chave: 'q:estatuto:07',
          enunciado:
            'A Constituição garante ao servidor público férias anuais remuneradas com acréscimo de, pelo menos:',
          alternativas: [
            'um quarto do salário.',
            'um terço do salário.',
            'metade do salário.',
            'um salário inteiro.',
            'dez por cento do salário.',
          ],
          gabarito: 'B',
          explicacao:
            'O art. 7º, XVII, estendido aos servidores pelo art. 39, § 3º, garante férias anuais remuneradas com, pelo menos, um terço a mais do que o salário normal.',
          dicaBolso: 'Férias: + 1/3.',
          dica: 'É o famoso "terço de férias".',
          dificuldade: 1,
        },
        {
          chave: 'q:estatuto:08',
          enunciado:
            'Entre os direitos que a Constituição estende aos servidores ocupantes de cargo público está o:',
          alternativas: [
            'décimo terceiro salário.',
            'Fundo de Garantia do Tempo de Serviço (FGTS).',
            'seguro-desemprego.',
            'aviso prévio proporcional.',
            'participação nos lucros.',
          ],
          gabarito: 'A',
          explicacao:
            'O art. 39, § 3º, manda aplicar aos servidores alguns incisos do art. 7º, como o 13º salário (inciso VIII). FGTS, seguro-desemprego, aviso prévio e participação nos lucros não estão nessa lista.',
          dicaBolso: 'Servidor de cargo tem 13º, mas não tem FGTS.',
          dica: 'Qual desses direitos todo trabalhador recebe no fim do ano?',
          dificuldade: 2,
        },
        {
          chave: 'q:estatuto:09',
          enunciado:
            'Segundo a Constituição, os cargos em comissão destinam-se apenas às atribuições de:',
          alternativas: [
            'direção, chefia e assessoramento.',
            'limpeza e conservação.',
            'atendimento ao público.',
            'fiscalização de tributos.',
            'magistério.',
          ],
          gabarito: 'A',
          explicacao:
            'O art. 37, V, limita funções de confiança e cargos em comissão às atribuições de direção, chefia e assessoramento.',
          dicaBolso: 'Comissão: direção, chefia e assessoramento (DCA).',
          dica: 'São cargos de confiança.',
          dificuldade: 1,
        },
        {
          chave: 'q:estatuto:10',
          enunciado: 'Os cargos em comissão, declarados em lei, são de:',
          alternativas: [
            'livre nomeação e exoneração.',
            'provimento exclusivo por concurso.',
            'estabilidade imediata.',
            'nomeação vitalícia.',
            'eleição pelos servidores.',
          ],
          gabarito: 'A',
          explicacao:
            'O art. 37, II, ressalva do concurso as nomeações para cargo em comissão declarado em lei de livre nomeação e exoneração.',
          dicaBolso: 'Comissionado entra e sai por decisão da autoridade.',
          dica: 'Esses cargos não exigem concurso.',
          dificuldade: 1,
        },
      ],
    },
  ],
};
