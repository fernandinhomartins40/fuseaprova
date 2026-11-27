/**
 * D49: as aulas de redação em formato de lição (a Capi explica em pílulas e o aluno responde).
 * Tudo sai do conteúdo pesquisado em `curso.ts` (edital, cadernos da FAU e as fontes de cada aula).
 * Os parágrafos e temas de exemplo são nossos (autorais), nunca atribuídos à banca.
 */
import type { PassoAulaRedacao } from '@fuse/shared/api';

const explica = (titulo: string, texto: string, exemplo: string | null = null): PassoAulaRedacao => ({
  tipo: 'explica',
  titulo,
  texto,
  exemplo,
});
const escolha = (
  pergunta: string,
  alternativas: string[],
  correta: number,
  explicacao: string,
  apoio: string | null = null,
): PassoAulaRedacao => ({ tipo: 'escolha', pergunta, apoio, alternativas, correta, explicacao });
const lacuna = (frase: string, opcoes: string[], correta: number, explicacao: string): PassoAulaRedacao => ({
  tipo: 'lacuna',
  frase,
  opcoes,
  correta,
  explicacao,
});
const ordenar = (pergunta: string, itens: string[], explicacao: string): PassoAulaRedacao => ({
  tipo: 'ordenar',
  pergunta,
  itens,
  explicacao,
});

const PARAGRAFO_PPP =
  '"Em primeiro lugar, a participação da comunidade é o que dá legitimidade ao projeto da escola. Quando professores, famílias e estudantes discutem juntos as metas, o documento passa a expressar a realidade daquela comunidade. É o que prevê a própria LDB, ao garantir a participação das comunidades escolar e local em conselhos escolares. Uma escola que ouve as famílias sobre a evasão no período da colheita, por exemplo, consegue ajustar o calendário. Assim, a participação transforma o PPP em ferramenta de gestão." (parágrafo de exemplo, autoral)';

export const PASSOS_REDACAO: Record<string, PassoAulaRedacao[]> = {
  'como-a-fau-corrige': [
    explica(
      'A redação vale metade da nota',
      'Em Palmital, a redação é **só para o Professor Licenciatura Plena** (item 10.29), no mesmo dia e horário da objetiva.\n\nEla vale **100 pontos**, é **eliminatória e classificatória**, e a nota final é **(objetiva + redação) ÷ 2**, mais os títulos (item 14.3).',
    ),
    escolha(
      'Em Palmital, quem faz a prova de redação?',
      [
        'Todos os cargos de nível superior',
        'Só o Professor Licenciatura Plena',
        'Todos os cargos de professor e de saúde',
        'Só quem passar para uma segunda fase, em outro dia',
      ],
      1,
      'O item 10.29 do edital prevê a redação só para o Professor Licenciatura Plena, no mesmo dia e horário da objetiva.',
    ),
    escolha(
      'Quanto a redação pesa na nota final do professor?',
      ['Só serve para desempate', 'Um décimo da nota', 'O mesmo que a prova objetiva inteira', 'Um quarto da nota'],
      2,
      'A nota final é a soma da objetiva com a redação, dividida por dois (item 14.3). Na prática, a redação pesa o mesmo que a objetiva inteira.',
    ),
    explica(
      'Os três aspectos da nota',
      'A Tabela 10.1 do edital divide os 100 pontos assim:\n\n- **Conteúdo, até 50:** tema, análise, senso crítico e argumentos.\n- **Estrutura, até 40:** gênero, progressão e coesão.\n- **Expressão, até 10:** norma-padrão e linguagem.',
      '90 dos 100 pontos são de ideias e organização.',
    ),
    lacuna(
      'O aspecto que vale mais pontos é o ___, até 50.',
      ['Conteúdo', 'Expressão', 'Estrutura'],
      0,
      'Conteúdo vale até 50 pontos, Estrutura até 40 e Expressão até 10 (Tabela 10.1).',
    ),
    escolha(
      'Concordância, crase e acentuação são avaliadas em qual aspecto?',
      ['Conteúdo', 'Estrutura', 'Expressão'],
      2,
      'Expressão (até 10 pontos) avalia a norma-padrão: frases, concordância, regência, pontuação, grafia e acentuação.',
    ),
    escolha(
      'Copiar frases dos textos da prova derruba principalmente qual aspecto?',
      ['Expressão', 'Conteúdo', 'Nenhum: copiar é permitido'],
      1,
      'A Tabela 10.1 penaliza no Conteúdo a abordagem com "colagem de textos" da prova.',
    ),
    explica(
      'O que zera (item 10.39)',
      '- fugir do tema;\n- letra ilegível;\n- texto a lápis ou com tinta que não seja azul ou preta;\n- folha definitiva em branco ou redação fora dela;\n- **qualquer marca que identifique você**: nome, rubrica, sinais, desenhos.',
      'O rascunho é opcional e não vale nota (item 10.37).',
    ),
    escolha(
      'Qual destas atitudes ZERA a redação?',
      [
        'Escrever 26 linhas',
        'Assinar o nome no fim do texto',
        'Usar "Além disso" no segundo parágrafo',
        'Fazer um rascunho antes',
      ],
      1,
      'Qualquer marca que identifique o candidato fora do lugar próprio zera a redação (item 10.39). Nada de nome, rubrica ou desenho.',
    ),
    escolha(
      'O rascunho vale nota?',
      ['Sim, metade da nota', 'Só se a folha definitiva ficar incompleta', 'Não: só a folha definitiva conta'],
      2,
      'O rascunho é opcional e não é corrigido. Só vale o que está na folha definitiva (item 10.37).',
    ),
  ],

  'como-a-fau-monta-o-tema': [
    explica(
      'O tema sai da área do cargo',
      'O edital diz que o conteúdo da redação é **"estritamente relacionado aos conhecimentos específicos e à área de atuação do cargo"** (item 10.29.2), sobre **assunto de interesse geral** (item 10.31).',
      'Tradução: espere um tema educacional que todo professor precisa saber discutir.',
    ),
    escolha(
      'Pelo edital e pelas últimas provas da FAU, qual tema é o mais provável para o professor?',
      ['Futebol brasileiro', 'Economia internacional', 'Um tema educacional de interesse geral', 'Tema livre, à escolha do candidato'],
      2,
      'O item 10.29.2 liga o tema à área de atuação do cargo, e todas as provas recentes de professor da FAU trouxeram temas de educação.',
    ),
    explica(
      'O que a FAU já cobrou de professores',
      '- **2026:** educação "bancária" em Paulo Freire (Rio Azul); ética e cidadania da escola na era digital (Borrazópolis).\n- **2025:** os eixos estruturantes da BNCC na Educação Infantil (Toledo).\n- **2023:** negacionismo (Imbituva) e nomofobia (Cruzeiro do Iguaçu).',
      'Todos estão no simulado de redação do app.',
    ),
    escolha(
      'Qual destes foi tema real de redação da FAU para professor em 2026?',
      [
        'Ética e cidadania na atuação da escola na era digital',
        'A reforma tributária e os municípios',
        'O turismo rural no Paraná',
        'Mobilidade urbana nas capitais',
      ],
      0,
      'Foi o tema da prova de Professor de Borrazópolis em 2026. As outras opções não vieram de provas da FAU.',
    ),
    explica(
      'O formato da proposta',
      'Em 2026, a proposta trouxe um **enunciado** curto e um **comando**: *"redija um texto dissertativo-argumentativo sobre X, abordando A, B e C"*. Algumas terminam com *"proponha uma intervenção viável"*.',
      'Cada item do "abordando" vira uma parte do seu texto.',
    ),
    ordenar(
      'Ponha em ordem os passos para ler o comando:',
      [
        'Sublinhar o tema',
        'Listar cada item do "abordando"',
        'Ver se pede proposta de intervenção',
        'Usar o texto de apoio como ponto de partida, sem copiar',
      ],
      'Primeiro o tema, depois o que precisa ser abordado, depois o que o fecho exige. O apoio inspira, mas não se copia.',
    ),
    escolha(
      'O texto explicou só o conceito de avaliação formativa. Como foi a abordagem?',
      ['Completa', 'Parcial: o Conteúdo cai', 'Fuga ao tema: zera'],
      1,
      'O comando pedia três itens e o texto tratou só de um. Isso é abordagem parcial, que a Tabela 10.1 penaliza no Conteúdo.',
      'Comando (tema de exemplo, do Fuse Aprova): "Redija um texto dissertativo-argumentativo sobre o papel da avaliação formativa, abordando o conceito, os instrumentos e o uso dos resultados no planejamento."',
    ),
    escolha(
      'O tema é "ética e cidadania da escola na era digital", mas o texto fala só de "tecnologia na sociedade". Isso é:',
      ['Fuga ao tema: zera', 'Tangenciamento: não zera, mas derruba o Conteúdo', 'Uma abordagem perfeita'],
      1,
      'Tangenciar é falar do assunto geral sem enfrentar o recorte pedido. Não zera, mas custa caro no Conteúdo, que vale metade da nota.',
    ),
    lacuna(
      'Quando o tema é uma pergunta, a sua ___ precisa ser a resposta a ela.',
      ['conclusão', 'tese', 'introdução'],
      1,
      'Em 2025 a FAU usou temas em forma de pergunta. A tese é a sua posição, então ela responde ao questionamento.',
    ),
  ],

  'dissertativo-argumentativo': [
    explica(
      'Defender, não contar',
      'O dissertativo-argumentativo **defende um ponto de vista** com argumentos. Não é narração (contar uma história) nem só exposição (listar informações): você **toma posição** e sustenta.',
    ),
    escolha(
      'Qual trecho é dissertativo-argumentativo?',
      [
        'Naquela manhã, a professora entrou na sala e percebeu que faltavam alunos.',
        'A escola tem 300 alunos, 12 salas e uma biblioteca.',
        'A participação das famílias é decisiva para reduzir a evasão, porque aproxima a escola da realidade do aluno.',
      ],
      2,
      'O primeiro narra, o segundo só informa. O terceiro toma posição ("é decisiva") e dá o motivo ("porque...").',
    ),
    explica(
      'A tese',
      'A tese é a sua resposta ao tema, em uma frase. Uma boa tese **toma posição clara** e já aponta os motivos.',
      'Forte: "A tecnologia só melhora a escola quando vem acompanhada de formação docente e de regras claras de proteção de dados."',
    ),
    escolha(
      'Qual é a tese mais forte?',
      [
        'A tecnologia na escola tem pontos positivos e negativos.',
        'A tecnologia só melhora a escola quando vem com formação docente e regras de proteção de dados.',
        'A tecnologia é um assunto muito importante nos dias de hoje.',
      ],
      1,
      'A segunda toma posição e anuncia dois motivos. As outras ficam em cima do muro ou não dizem nada.',
    ),
    explica(
      'Sem "eu acho"',
      'Prefira a **3ª pessoa**. A opinião aparece pela força dos argumentos, não pelo "eu". A 1ª pessoa do plural ("precisamos") é aceita com moderação.',
    ),
    escolha(
      'Qual frase respeita a impessoalidade?',
      [
        'Eu acho que a BNCC é boa para as escolas.',
        'Na minha opinião, falta formação aos professores.',
        'A formação continuada é condição para que a BNCC chegue à sala de aula.',
      ],
      2,
      'A terceira defende uma ideia sem "eu acho" nem "na minha opinião".',
    ),
    explica(
      'A planta de 4 parágrafos',
      '- **Introdução (5 a 6 linhas):** contexto, tema e tese.\n- **Desenvolvimento 1 (7 a 8):** primeiro argumento.\n- **Desenvolvimento 2 (7 a 8):** segundo argumento.\n- **Conclusão (5 a 6):** retomada da tese e encaminhamento.',
      'Dá cerca de 26 linhas, com folga para não passar de 30.',
    ),
    ordenar(
      'Monte a planta da redação:',
      [
        'Introdução: contexto, tema e tese',
        'Desenvolvimento 1: primeiro argumento',
        'Desenvolvimento 2: segundo argumento',
        'Conclusão: retomada da tese e encaminhamento',
      ],
      'Essa ordem cabe em 20 a 30 linhas e deixa a progressão clara para o corretor.',
    ),
    escolha(
      'Quantas linhas o edital de Palmital exige na redação?',
      ['10 a 20', '20 a 30', '25 a 40', 'Não há limite'],
      1,
      'O item 10.31 pede de 20 a 30 linhas. Abaixo de 20 você descumpre o edital; acima de 30 é risco de o excesso não ser lido.',
    ),
  ],

  introducao: [
    explica(
      'Três peças da introdução',
      '1. **Contexto:** situa o leitor (lei, dado, conceito, autor).\n2. **Tema:** com as palavras-chave do comando.\n3. **Tese:** a sua posição, já anunciando os dois argumentos.',
      'Introdução de uma frase só fica sem contexto ou sem tese.',
    ),
    ordenar(
      'Ponha as peças da introdução na ordem:',
      ['Contextualização', 'Apresentação do tema', 'Tese com os dois argumentos'],
      'Primeiro situa o leitor, depois mostra o tema e por fim diz o que vai defender.',
    ),
    explica(
      'Três jeitos de começar',
      '- **Pela lei:** "A LDB prevê a gestão democrática do ensino público..."\n- **Pelo conceito:** "Letramento é o uso da leitura e da escrita nas práticas sociais..."\n- **Pelo autor:** "Para Paulo Freire, ensinar não é transferir conhecimento..."',
      'Fuja de "Hoje em dia..." e "Desde os primórdios...": gastam linha e não dizem nada.',
    ),
    escolha(
      'Qual começo gasta linha e não diz nada?',
      [
        'Desde os primórdios da humanidade, a educação é muito importante.',
        'A LDB prevê a gestão democrática do ensino público.',
        'Para Paulo Freire, ensinar não é transferir conhecimento.',
      ],
      0,
      '"Desde os primórdios" é um começo vazio. Os outros já entram no assunto com lei ou autor.',
    ),
    escolha(
      '"Para Paulo Freire, ensinar não é transferir conhecimento..." começa por qual caminho?',
      ['Pela lei', 'Pelo conceito', 'Pelo autor'],
      2,
      'Começa pela voz de um autor reconhecido, que já serve de repertório.',
    ),
    escolha(
      'Nesta introdução, qual frase é a tese?',
      [
        'A primeira, que cita a LDB',
        'A segunda, que apresenta o PPP',
        'A terceira, que diz o que é preciso para o PPP cumprir o papel',
      ],
      2,
      'A primeira contextualiza (lei), a segunda apresenta o tema e a terceira toma posição, já com dois caminhos: participação real e revisão a partir da realidade.',
      '"A LDB estabelece a gestão democrática do ensino público e garante a participação dos profissionais na elaboração do projeto pedagógico. Nesse contexto, o Projeto Político-Pedagógico deixa de ser um documento burocrático e se torna um instrumento de decisão coletiva. Para que cumpra esse papel, porém, é preciso que a comunidade participe de fato da sua construção e que o projeto seja revisto a partir da realidade da escola." (exemplo autoral)',
    ),
    lacuna(
      'A tese, de preferência, já ___ os dois argumentos do desenvolvimento.',
      ['esconde', 'anuncia', 'repete'],
      1,
      'Anunciar os dois argumentos na tese mostra o plano do texto e facilita a progressão.',
    ),
  ],

  desenvolvimento: [
    explica(
      'A receita do parágrafo',
      '1. **Tópico frasal:** a ideia central.\n2. **Explicação:** por quê? como?\n3. **Fundamentação:** lei, autor, dado ou conceito.\n4. **Exemplo:** situação concreta da escola.\n5. **Fechamento:** amarra de volta à tese.',
    ),
    ordenar(
      'Monte o parágrafo argumentativo:',
      ['Tópico frasal', 'Explicação', 'Fundamentação (repertório)', 'Exemplo', 'Fechamento ligado à tese'],
      'Ideia, porquê, prova, exemplo e amarração: essa é a receita de um parágrafo que pontua.',
    ),
    escolha(
      'Neste parágrafo, qual frase é o tópico frasal?',
      [
        '"Em primeiro lugar, a participação da comunidade é o que dá legitimidade ao projeto da escola."',
        '"É o que prevê a própria LDB, ao garantir a participação das comunidades..."',
        '"Uma escola que ouve as famílias sobre a evasão no período da colheita..."',
      ],
      0,
      'O tópico frasal abre o parágrafo com a ideia central. A frase da LDB é a fundamentação, e a da colheita é o exemplo.',
      PARAGRAFO_PPP,
    ),
    explica(
      'Tipos de argumento',
      '- **Autoridade:** autor ou documento (Freire, BNCC, LDB).\n- **Causa e consequência:** o que gera e o que provoca.\n- **Exemplificação:** situação real da sala de aula.\n- **Comparação:** tradicional × atual.\n- **Dados:** números oficiais, só se tiver certeza.',
    ),
    escolha(
      'Citar a BNCC para sustentar uma ideia é argumento de:',
      ['Autoridade', 'Comparação', 'Causa e consequência'],
      0,
      'Apoiar-se num documento reconhecido é argumento de autoridade.',
    ),
    escolha(
      '"O modelo tradicional de ensino dos esportes valoriza a técnica; o contemporâneo, a participação de todos." Que argumento é esse?',
      ['Dados', 'Comparação', 'Autoridade'],
      1,
      'Coloca dois modelos lado a lado: é argumento por comparação.',
    ),
    escolha(
      'Qual uso de repertório é melhor?',
      [
        'Como dizia Vygotsky, a educação é muito importante.',
        'Segundo Vygotsky, a criança aprende com a mediação do outro; por isso, o trabalho em grupo amplia o que ela faz sozinha.',
        'Vygotsky, Piaget e Wallon falam sobre educação.',
      ],
      1,
      'Repertório bom é citado, explicado e ligado ao argumento. Os outros são citações soltas.',
    ),
    lacuna(
      'Só use ___ de que você tem certeza: erro tira a confiança do corretor.',
      ['conectivos', 'números e datas', 'parágrafos'],
      1,
      'Dado inventado ou ano errado de lei prejudica a consistência dos argumentos.',
    ),
  ],

  'conclusao-intervencao': [
    explica(
      'O que a conclusão faz',
      'Ela **retoma a tese** com outras palavras, **sintetiza** os argumentos e **encaminha** uma saída. **Não traz argumento novo.**',
      'Evite: "Portanto, conclui-se que é um tema muito importante."',
    ),
    escolha(
      'O que NÃO deve aparecer na conclusão?',
      ['A retomada da tese', 'Um argumento novo', 'A síntese dos argumentos'],
      1,
      'Argumento novo no fim fica sem desenvolvimento. A conclusão fecha o que já foi defendido.',
    ),
    explica(
      'Proposta de intervenção completa',
      'Quando o comando pede *"proponha uma intervenção viável"*, ela é obrigatória e tem cinco elementos: **agente, ação, meio, finalidade e detalhamento**.',
      'Modelo: "Diante disso, cabe à [agente] [ação], por meio de [meio], a fim de [finalidade]."',
    ),
    ordenar(
      'Monte a proposta na ordem do modelo:',
      [
        'Cabe à Secretaria Municipal de Educação',
        'oferecer formação continuada aos professores',
        'por meio de encontros mensais nas escolas',
        'a fim de levar a BNCC para o planejamento das aulas',
      ],
      'Agente, ação, meio e finalidade: quem faz, o que faz, como faz e para quê.',
    ),
    escolha(
      'Qual é a finalidade nesta proposta?',
      ['A equipe gestora', 'Promover assembleias', 'Por meio do conselho escolar', 'Atualizar as metas do projeto'],
      3,
      'A finalidade responde "para quê?" e vem depois de "a fim de".',
      '"Cabe à equipe gestora promover assembleias com a comunidade, por meio do conselho escolar, a fim de atualizar as metas do projeto." (exemplo autoral)',
    ),
    escolha(
      'Qual proposta tem o agente vago?',
      [
        'Alguém deve fazer algo para melhorar a escola.',
        'Cabe à Secretaria Municipal de Educação ampliar a busca ativa.',
        'Cabe ao conselho escolar revisar o PPP a cada ano.',
      ],
      0,
      '"Alguém" não diz quem faz. Nomeie o agente: secretaria, equipe gestora, professores, conselho escolar.',
    ),
    escolha(
      '"Proibir o uso de celular por todos os brasileiros" é uma boa proposta?',
      ['Sim, resolve de vez', 'Não: é inviável e fere direitos', 'Sim, se vier no último parágrafo'],
      1,
      'A banca pede intervenção viável. Proposta impossível ou que fere direitos perde pontos.',
    ),
    lacuna(
      'Diante disso, cabe à escola criar um grêmio, por meio de eleições anuais, ___ ampliar a participação dos estudantes.',
      ['porém', 'a fim de', 'embora'],
      1,
      '"A fim de" introduz a finalidade, o "para quê" da proposta.',
    ),
  ],

  coesao: [
    explica(
      'Conectivos por função',
      '- **Adição:** além disso, ademais.\n- **Oposição:** no entanto, contudo, embora.\n- **Causa:** porque, visto que, já que.\n- **Consequência:** por isso, de modo que.\n- **Finalidade:** a fim de, para que.\n- **Conclusão:** portanto, diante disso.',
      'Antes de escrever o conectivo, pergunte: qual é a relação entre as ideias?',
    ),
    lacuna(
      'A escola tem uma boa biblioteca. ___, os alunos leem pouco.',
      ['No entanto', 'Portanto', 'Por exemplo'],
      0,
      'A segunda ideia contraria a expectativa da primeira: é oposição.',
    ),
    lacuna(
      'Muitos alunos trabalham na colheita; ___, a frequência cai no fim do ano.',
      ['embora', 'por isso', 'a fim de'],
      1,
      'O trabalho na colheita é a causa; a queda da frequência é a consequência.',
    ),
    lacuna(
      '___ o projeto seja bom, ele precisa sair do papel.',
      ['Portanto', 'Além disso', 'Embora'],
      2,
      '"Embora" marca oposição e pede o verbo no subjuntivo ("seja").',
    ),
    lacuna(
      'A participação das famílias importa, ___ aproxima a escola da realidade do aluno.',
      ['visto que', 'contudo', 'por exemplo'],
      0,
      'A segunda parte explica o motivo: é causa ("visto que", "porque", "já que").',
    ),
    explica(
      'Os erros com conectivos',
      '- **Relação errada:** "Os alunos leem pouco. Portanto, a escola tem biblioteca."\n- **Empilhar:** "Portanto, assim, desse modo, conclui-se..." Use um só.',
    ),
    escolha(
      'Qual frase empilha conectivos?',
      [
        'Portanto, assim, desse modo, conclui-se que a leitura é essencial.',
        'Portanto, a leitura precisa estar no planejamento de todas as áreas.',
        'Além disso, a biblioteca pode abrir nos fins de semana.',
      ],
      0,
      'Três conectivos de conclusão seguidos dizem a mesma coisa. Basta um.',
    ),
    explica(
      'Retomar sem repetir',
      'Para não repetir "a escola" cinco vezes, use **pronomes** (ela), **sinônimos** (a instituição de ensino) e **expressões resumidoras** (esse cenário, tal desafio).',
    ),
    escolha(
      '"A escola criou o grêmio. ___ passou a ouvir mais os estudantes." Qual retomada é melhor?',
      ['A escola', 'Essa instituição', 'A escola, a escola'],
      1,
      'Retomar com outra expressão evita a repetição e conta na coesão (Estrutura).',
    ),
    ordenar(
      'Ponha os conectivos de ordem como apareceriam no texto:',
      ['Em primeiro lugar', 'Além disso', 'Por fim'],
      'Eles marcam a progressão: o primeiro argumento, o seguinte e o fechamento.',
    ),
  ],

  expressao: [
    explica(
      'Haver e fazer não vão ao plural',
      '- **Haver** (existir): *houve* problemas, não "houveram".\n- **Fazer** (tempo): *faz* dois anos, não "fazem".',
    ),
    lacuna(
      '___ muitos problemas na implantação do projeto.',
      ['Houveram', 'Houve', 'Haviam'],
      1,
      'Haver no sentido de existir é impessoal: fica no singular.',
    ),
    lacuna(
      '___ dois anos que a escola revisou o PPP.',
      ['Faz', 'Fazem', 'Fizeram'],
      0,
      'Fazer indicando tempo decorrido é impessoal: fica no singular.',
    ),
    explica(
      'Crase e regência',
      '- Crase = preposição *a* + artigo *a*: vou **à** escola; refiro-me **à** gestão.\n- **Sem crase** antes de palavra masculina, de verbo e de "esta/essa/ela".\n- *Visar* (ter como objetivo) pede *a*: visa **ao** desenvolvimento.',
    ),
    escolha(
      'Em qual frase a crase está correta?',
      ['Começou à estudar cedo.', 'Fomos à pé até a escola.', 'Refiro-me à gestão democrática.', 'Entregou o projeto à esta escola.'],
      2,
      '"Referir-se a" + "a gestão" = "à gestão". Antes de verbo (estudar), de palavra masculina (pé) e de "esta" não há crase.',
    ),
    lacuna(
      'O projeto visa ___ desenvolvimento integral da criança.',
      ['o', 'à', 'ao'],
      2,
      'Visar, no sentido de ter como objetivo, pede a preposição "a": a + o = "ao".',
    ),
    explica(
      'Vírgula',
      '- **Nunca separe o sujeito do verbo.**\n- Use vírgula depois de expressão deslocada no início: *Na Educação Infantil, as interações...*\n- Use antes de *mas*, *porém*, *contudo* no meio da frase.',
    ),
    escolha(
      'Qual frase tem erro de vírgula?',
      [
        'Na Educação Infantil, as interações são eixo do trabalho.',
        'Os professores da rede municipal, precisam de formação.',
        'O projeto é bom, mas precisa sair do papel.',
      ],
      1,
      'A vírgula separou o sujeito ("Os professores da rede municipal") do verbo ("precisam"). Isso é erro.',
    ),
    explica(
      'Palavras que confundem',
      '- *Mal* (oposto de bem) × *mau* (oposto de bom).\n- *Há* (tempo passado) × *a* (futuro): há dois anos; daqui a dois anos.\n- *Onde* é só para lugar físico.',
    ),
    lacuna(
      'A escola foi inaugurada ___ dez anos.',
      ['a', 'há', 'à'],
      1,
      'Tempo passado se indica com "há" (verbo haver).',
    ),
    lacuna(
      'Faltar às aulas é um ___ exemplo para a turma.',
      ['mal', 'mau'],
      1,
      '"Mau" é o oposto de "bom" e acompanha substantivo (exemplo). "Mal" é o oposto de "bem".',
    ),
    escolha(
      'Qual uso de "onde" está correto?',
      [
        'Vivemos uma época onde tudo é digital.',
        'Foi uma reunião onde decidimos o calendário.',
        'A escola onde estudei fica no centro.',
      ],
      2,
      '"Onde" indica lugar físico. Para tempo ou situação, use "em que" ou "na qual".',
    ),
  ],

  'repertorio-pedagogico': [
    explica(
      'Leis que valem argumento',
      '- **LDB (Lei 9.394/1996), art. 14:** gestão democrática.\n- **Lei 12.796/2013:** educação básica obrigatória dos **4 aos 17 anos**.\n- **ECA (Lei 8.069/1990):** proteção integral.\n- **ECA Digital (Lei 15.211/2025):** proteção no ambiente digital.\n- **Novo PNE (Lei 15.388/2026):** equidade como princípio.',
    ),
    escolha(
      'Qual lei tornou a educação básica obrigatória dos 4 aos 17 anos?',
      ['O ECA Digital (Lei 15.211/2025)', 'A Lei 12.796/2013, que alterou a LDB', 'O Novo PNE (Lei 15.388/2026)'],
      1,
      'A Lei 12.796/2013 alterou a LDB e fixou a educação básica obrigatória e gratuita dos 4 aos 17 anos.',
    ),
    escolha(
      'Para um tema sobre crianças nas redes sociais, qual repertório é o mais pertinente?',
      ['O ECA Digital (Lei 15.211/2025)', 'Os estágios de Piaget', 'A Lei 12.796/2013'],
      0,
      'O ECA Digital protege crianças e adolescentes no ambiente digital (redes, jogos, vídeos). Repertório bom é o ligado ao tema.',
    ),
    lacuna(
      'A gestão democrática do ensino público está no art. 14 da ___.',
      ['BNCC', 'LDB', 'Lei do ECA Digital'],
      1,
      'O art. 14 da LDB trata da gestão democrática: projeto pedagógico com os profissionais e conselhos escolares com a comunidade.',
    ),
    explica(
      'BNCC na Educação Infantil',
      '- **Eixos estruturantes:** interações e brincadeira.\n- **6 direitos de aprendizagem:** conviver, brincar, participar, explorar, expressar e conhecer-se.\n- **5 campos de experiência.**',
    ),
    escolha(
      'Na BNCC, quais são os eixos estruturantes da Educação Infantil?',
      ['Leitura e escrita', 'Disciplina e avaliação', 'Interações e brincadeira'],
      2,
      'As práticas da Educação Infantil se estruturam nas interações e na brincadeira.',
    ),
    lacuna(
      'A BNCC traz ___ direitos de aprendizagem para a Educação Infantil.',
      ['5', '6', '10'],
      1,
      'São 6 direitos: conviver, brincar, participar, explorar, expressar e conhecer-se. Os campos de experiência é que são 5, e as competências gerais, 10.',
    ),
    explica(
      'Autores que a banca conhece',
      '- **Freire:** crítica à educação "bancária"; educação dialógica.\n- **Vygotsky:** zona de desenvolvimento proximal.\n- **Piaget:** construção do conhecimento em estágios.\n- **Wallon:** afetividade no desenvolvimento.\n- **Magda Soares:** alfabetizar letrando.',
    ),
    escolha(
      'Quem criticou a "educação bancária", em que o professor "deposita" conteúdos no aluno?',
      ['Piaget', 'Paulo Freire', 'Wallon', 'Magda Soares'],
      1,
      'Paulo Freire, em Pedagogia do Oprimido, opõe a educação bancária à educação problematizadora e dialógica.',
    ),
    escolha(
      '"Zona de desenvolvimento proximal" é um conceito de:',
      ['Vygotsky', 'Paulo Freire', 'Wallon'],
      0,
      'Para Vygotsky, é a distância entre o que a criança faz sozinha e o que faz com ajuda.',
    ),
    escolha(
      '"Alfabetizar letrando" é uma ideia associada a:',
      ['Wallon', 'Piaget', 'Magda Soares'],
      2,
      'Magda Soares mostra que alfabetização e letramento são diferentes, mas inseparáveis.',
    ),
  ],

  'dia-da-prova': [
    explica(
      'Divida o seu tempo',
      'A redação é no mesmo horário da objetiva, que tem **4 horas** no total (itens 10.21 e 10.29.1). Sugestão: **reserve 1h10** para a redação.',
      '10 min para planejar, 35 para o rascunho, 20 para passar a limpo e 5 para revisar.',
    ),
    ordenar(
      'Ponha em ordem a divisão do tempo da redação:',
      ['Planejar (10 min)', 'Rascunho (35 min)', 'Passar a limpo (20 min)', 'Revisar (5 min)'],
      'Não deixe para passar a limpo nos últimos minutos: só a folha definitiva vale.',
    ),
    escolha(
      'Quanto tempo você tem para a objetiva e a redação, juntas?',
      ['2 horas', '4 horas', '6 horas'],
      1,
      'São 4 horas para tudo (item 10.21). O edital não separa o tempo de cada parte: você divide.',
    ),
    explica(
      'Checklist da folha definitiva',
      '- Caneta **azul ou preta**, transparente.\n- **Letra legível.**\n- **Nada que identifique você.**\n- Sem título, se a proposta não pedir.\n- **20 a 30 linhas.**',
    ),
    escolha(
      'Qual destas atitudes pode ZERAR a redação?',
      ['Escrever a lápis', 'Fazer um rascunho', 'Usar 28 linhas'],
      0,
      'Texto a lápis ou com tinta que não seja azul ou preta zera (item 10.39).',
    ),
    escolha(
      'É preciso dar título à redação?',
      ['Sim, sempre', 'Não, se a proposta não pedir: ele só gasta linha', 'Sim, e ele vale ponto extra'],
      1,
      'O edital não pede título. Se a proposta não pedir, deixe de fora.',
    ),
    explica(
      'Sua rotina aqui no app',
      'Você tem **3 correções por semana**. Faça uma redação nova com cronômetro, leia a correção começando pelo aspecto mais fraco e **reescreva**.',
      'A nota do app é uma estimativa para treino, não a nota da banca.',
    ),
    ordenar(
      'Monte a rotina semanal de treino:',
      [
        'Escrever uma redação nova com o cronômetro',
        'Ler a correção, começando pelo aspecto com menor nota',
        'Reescrever e pedir nova correção',
      ],
      'Escrever, entender o erro e reescrever: é a reescrita que fixa a melhora.',
    ),
  ],
};
