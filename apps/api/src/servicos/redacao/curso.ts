/**
 * D49: mini-curso de redação. Conteúdo pesquisado (edital de Palmital, provas de professor da FAU
 * de 2023 a 2026 e as fontes de cada aula) e servido só pela API, atrás da guarda de acesso.
 * Os exemplos de parágrafo são nossos (autorais), nunca atribuídos à banca.
 */
import type { AulaRedacao } from '@fuse/shared/api';

const EDITAL = {
  titulo: 'Edital de Abertura nº 01/2026 — Prefeitura de Palmital/PR (FAU), itens 10.28 a 10.41 e 14.3',
  url: 'https://www.concursosfau.com.br',
};

export const AULAS_REDACAO: AulaRedacao[] = [
  {
    id: 'como-a-fau-corrige',
    titulo: '1. Como a FAU corrige a sua redação',
    resumo: 'Quem faz, quanto vale, os três aspectos da nota e o que zera.',
    minutos: 6,
    secoes: [
      {
        titulo: 'Quem faz a redação em Palmital',
        texto:
          'No concurso da Prefeitura de Palmital, a redação é **só para o cargo de Professor Licenciatura Plena** (item 10.29). Ela é feita **no mesmo dia e horário da prova objetiva** (item 10.29.1), à mão, com caneta esferográfica transparente de tinta azul ou preta.\n\nMesmo que você seja de outro cargo, treinar redação ajuda na interpretação de texto e na Língua Portuguesa da prova objetiva.',
      },
      {
        titulo: 'Quanto ela pesa',
        texto:
          'A redação vale **100 pontos** e é **eliminatória e classificatória** (item 10.31). A nota final do professor é a soma da objetiva com a redação, dividida por dois, mais os títulos (item 14.3).\n\n**Na prática, a redação pesa o mesmo que a prova objetiva inteira.**',
      },
      {
        titulo: 'Quem tem a redação corrigida',
        texto:
          'Só é corrigida a redação de quem fez pelo menos **50% da objetiva** (item 10.27) e ficou classificado até o **100º lugar** na ampla concorrência, o **5º** entre pessoas com deficiência ou o **10º** entre afrodescendentes, além dos empatados com o último (itens 10.30 e 10.30.1). Por isso, a objetiva continua sendo a porta de entrada.',
      },
      {
        titulo: 'Os três aspectos da nota (Tabela 10.1)',
        texto:
          '- **Conteúdo, até 50 pontos:** a perspectiva adotada no tratamento do tema, a capacidade de análise e o senso crítico, e a consistência, clareza e coerência dos argumentos. A nota cai se a abordagem for tangencial, parcial, diluída em divagações ou feita com colagem dos textos da prova.\n- **Estrutura, até 40 pontos:** respeito ao gênero pedido (dissertativo-argumentativo), progressão do texto e encadeamento das ideias, e coesão entre frases e parágrafos.\n- **Expressão, até 10 pontos:** norma-padrão (estrutura das frases, concordância, regência, pontuação, pronomes, tempos verbais, grafia e acentuação) e linguagem adequada ao cargo.\n\nRepare: **90 dos 100 pontos são de ideias e organização.** Gramática importa, mas o que decide a nota é ter o que dizer e dizer em ordem.',
      },
      {
        titulo: 'O que zera a redação (item 10.39)',
        texto:
          '- não atender ao tema proposto e ao conteúdo avaliado;\n- letra ilegível ou texto feito por outro meio que não o do edital;\n- acentuada desestruturação do texto ou ofensa ao pudor;\n- texto a lápis ou com tinta que não seja azul ou preta;\n- folha definitiva em branco ou redação fora dela;\n- qualquer marca que identifique você fora do lugar próprio: nome, rubrica, números, sinais, desenhos.\n\nO rascunho é opcional e **não vale nota**: só conta a folha definitiva (item 10.37).',
      },
      {
        titulo: 'Depois da prova',
        texto:
          'Você pode pedir o **espelho** da correção no site da FAU, no dia marcado em edital, das 8h às 17h (item 10.40), e cabe **recurso** da nota (item 10.41).',
      },
    ],
    fontes: [EDITAL],
  },
  {
    id: 'como-a-fau-monta-o-tema',
    titulo: '2. Como a FAU monta o tema',
    resumo: 'O que as últimas provas de professor da FAU pediram e como ler o comando.',
    minutos: 6,
    secoes: [
      {
        titulo: 'O que o edital de Palmital diz',
        texto:
          'O item 10.29.2 diz que o conteúdo da redação será **"estritamente relacionado aos conhecimentos específicos e à área de atuação do cargo"**. O item 10.31 fala em "assunto de interesse geral". Juntando os dois e olhando as provas recentes da FAU, o mais provável é um **tema educacional de interesse geral**: algo que todo professor precisa saber discutir.',
      },
      {
        titulo: 'Os temas que a FAU cobrou de professores',
        texto:
          '- **2026, Rio Azul (Professor):** a superação da educação "bancária", a partir de um trecho de *Pedagogia da autonomia*, de Paulo Freire.\n- **2026, Borrazópolis (Professor):** "Ética e cidadania na atuação da escola na era digital".\n- **2026, Borrazópolis (Professor de Educação Física):** o uso ético da tecnologia no setor público, com proposta de intervenção.\n- **2026, Rio Azul (Professor de Educação Física):** modelos tradicionais e contemporâneos no ensino dos esportes.\n- **2025, Toledo (Educação Infantil):** a importância dos eixos estruturantes da BNCC para o desenvolvimento integral.\n- **2025, Toledo (Educação Física):** a Educação Física na formação integral, segundo a BNCC.\n- **2023, Imbituva:** "A sombra do negacionismo". **2023, Cruzeiro do Iguaçu:** "Um problema real: Nomofobia".\n\nTodos estão no banco de temas do app, para você treinar com eles.',
      },
      {
        titulo: 'O formato da proposta',
        texto:
          'Nas provas de 2026, a proposta vem assim: um **enunciado** de um ou dois parágrafos (às vezes com a citação de um autor ou documento) e depois um **comando**, por exemplo: *"redija um texto dissertativo-argumentativo sobre o tema X, abordando A, B e C"*. Em algumas, o comando termina com *"proponha uma intervenção viável"*.\n\nEm 2025, o formato era uma **pergunta**: *"Construa um texto dissertativo-argumentativo em que seja defendido seu ponto de vista sobre o questionamento: ..."*, seguida de um trecho curto de apoio.',
      },
      {
        titulo: 'Como ler o comando (o passo que mais salva nota)',
        texto:
          '1. **Sublinhe o tema** (o que está entre aspas ou depois de "sobre").\n2. **Liste cada item do "abordando"**: cada um vira uma parte do seu texto. Se o comando pede A, B e C e você só fala de A, a abordagem é **parcial** e o Conteúdo cai.\n3. **Veja se pede proposta de intervenção.** Se pedir, ela é obrigatória na conclusão.\n4. **Use o texto de apoio como ponto de partida, nunca como cópia.** Copiar frases do enunciado é "colagem de textos", que a Tabela 10.1 penaliza.\n5. **Responda à pergunta, se houver uma.** Quando o tema é um questionamento, a sua tese precisa ser a resposta.',
      },
      {
        titulo: 'Tangenciar não é fugir, mas custa caro',
        texto:
          '**Fuga ao tema** é escrever sobre outra coisa: zera. **Tangenciar** é falar do assunto geral sem enfrentar o recorte pedido: por exemplo, o tema é "ética e cidadania da escola na era digital" e o texto fala só de "tecnologia na sociedade". Não zera, mas derruba o Conteúdo, que vale metade da nota.',
      },
    ],
    fontes: [
      EDITAL,
      {
        titulo: 'Cadernos de prova de professor da FAU (Rio Azul, Borrazópolis, Toledo, Imbituva, Cruzeiro do Iguaçu), 2023 a 2026',
        url: 'https://www.concursosfau.com.br',
      },
    ],
  },
  {
    id: 'dissertativo-argumentativo',
    titulo: '3. O texto dissertativo-argumentativo',
    resumo: 'Tese, impessoalidade e a planta de 4 parágrafos que cabe em 20 a 30 linhas.',
    minutos: 5,
    secoes: [
      {
        titulo: 'O que é',
        texto:
          'É o texto que **defende um ponto de vista** sobre um tema com **argumentos consistentes**, para convencer o leitor. Não é narração (contar uma história) nem só exposição (listar informações): você precisa **tomar posição** e sustentá-la.',
      },
      {
        titulo: 'A tese',
        texto:
          'A tese é a sua resposta ao tema, em uma frase. Uma boa tese **toma posição clara** e já aponta os motivos.\n\n- Fraca: *"A tecnologia na escola tem pontos positivos e negativos."* (não diz nada)\n- Forte: *"A tecnologia só melhora a escola quando vem acompanhada de formação docente e de regras claras de proteção de dados."*',
      },
      {
        titulo: 'Impessoalidade',
        texto:
          'Em concurso, prefira a **3ª pessoa** e evite "eu acho", "na minha opinião". A opinião aparece pela força dos argumentos, não pelo "eu". A 1ª pessoa do plural ("precisamos", "nossa sociedade") é aceita com moderação.',
      },
      {
        titulo: 'A planta de 4 parágrafos',
        texto:
          'Para 20 a 30 linhas, a planta mais segura é:\n\n- **Introdução (5 a 6 linhas):** contexto + tema + tese.\n- **Desenvolvimento 1 (7 a 8 linhas):** primeiro argumento.\n- **Desenvolvimento 2 (7 a 8 linhas):** segundo argumento.\n- **Conclusão (5 a 6 linhas):** retomada da tese e encaminhamento (ou a proposta de intervenção, se pedida).\n\nIsso dá cerca de 26 linhas, com folga para não passar de 30. **Texto acima de 30 linhas** é risco: em outras provas, a FAU avisou que o que passa da 30ª linha é desconsiderado. **Abaixo de 20**, você descumpre o item 10.31.',
      },
    ],
    fontes: [
      EDITAL,
      {
        titulo: 'Direção Concursos — Redação para concursos públicos: como estruturar seu texto',
        url: 'https://www.direcaoconcursos.com.br/artigos/redacao-para-concursos-publicos-como-estruturar-seu-texto',
      },
      {
        titulo: 'Universidade de Brasília — Aprenda a escrever redação (livro digital)',
        url: 'https://www.repositorio.unb.br/bitstream/10482/54047/1/LIVRO_aprendaescreverredacao.pdf',
      },
    ],
  },
  {
    id: 'introducao',
    titulo: '4. Introdução que já pontua',
    resumo: 'Contexto, tema e tese em 2 a 4 frases, com três jeitos de começar.',
    minutos: 5,
    secoes: [
      {
        titulo: 'Os três elementos',
        texto:
          '1. **Contextualização:** situa o leitor (uma lei, um dado, um conceito, um autor).\n2. **Apresentação do tema:** com as palavras-chave do comando.\n3. **Tese:** a sua posição, de preferência já anunciando os dois argumentos que virão.\n\nIntrodução de **uma frase só** é um dos erros que mais custam pontos: fica sem contexto ou sem tese.',
      },
      {
        titulo: 'Três jeitos de começar',
        texto:
          '- **Pela lei ou documento:** *"A Lei de Diretrizes e Bases da Educação (Lei nº 9.394/1996) prevê a gestão democrática do ensino público..."*\n- **Pelo conceito:** *"Letramento é o uso da leitura e da escrita nas práticas sociais..."*\n- **Pelo autor:** *"Para Paulo Freire, ensinar não é transferir conhecimento..."*\n\nEvite começos vazios como "Hoje em dia..." ou "Desde os primórdios...": eles gastam linha e não dizem nada.',
      },
      {
        titulo: 'Exemplo (autoral)',
        texto:
          'Tema: *"O Projeto Político-Pedagógico como instrumento de gestão democrática"*.\n\n*A Lei de Diretrizes e Bases da Educação estabelece a gestão democrática do ensino público e garante a participação dos profissionais da educação na elaboração do projeto pedagógico da escola. Nesse contexto, o Projeto Político-Pedagógico deixa de ser um documento burocrático e se torna um instrumento de decisão coletiva. Para que cumpra esse papel, porém, é preciso que a comunidade escolar participe de fato da sua construção e que o projeto seja revisto a partir da realidade da escola.*\n\nRepare: contexto (a lei), tema (PPP e gestão democrática) e tese com dois caminhos (participação real e revisão a partir da realidade), que serão os dois parágrafos de desenvolvimento.',
      },
    ],
    fontes: [
      {
        titulo: 'Folha Qconcursos — Redação para concurso: como fazer uma boa introdução',
        url: 'https://folha.qconcursos.com/n/redacao-para-concurso-como-fazer-introducao',
      },
      {
        titulo: 'Lei nº 9.394/1996 (LDB), art. 14 — Planalto',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l9394.htm',
      },
    ],
  },
  {
    id: 'desenvolvimento',
    titulo: '5. Desenvolvimento: tópico frasal, fundamento e exemplo',
    resumo: 'A receita de um parágrafo argumentativo e os tipos de argumento.',
    minutos: 6,
    secoes: [
      {
        titulo: 'A receita do parágrafo',
        texto:
          '1. **Tópico frasal:** a ideia central do parágrafo, ligada à tese.\n2. **Explicação:** por quê? como?\n3. **Fundamentação:** uma lei, um autor, um dado ou um conceito (o "repertório").\n4. **Exemplo:** uma situação concreta da escola.\n5. **Fechamento:** amarra o parágrafo de volta à tese.\n\nRepertório solto não vale: **cite, explique e ligue ao tema.**',
      },
      {
        titulo: 'Tipos de argumento',
        texto:
          '- **Autoridade:** um autor ou documento reconhecido (Freire, Vygotsky, BNCC, LDB).\n- **Causa e consequência:** mostra o que gera o problema e o que ele provoca.\n- **Exemplificação:** uma situação real e plausível da sala de aula.\n- **Comparação:** o modelo tradicional × o modelo atual, por exemplo.\n- **Dados:** números de fontes oficiais. Só use números de que você tem certeza.',
      },
      {
        titulo: 'Exemplo (autoral)',
        texto:
          '*Em primeiro lugar, a participação da comunidade é o que dá legitimidade ao projeto da escola. Quando professores, famílias e estudantes discutem juntos as metas e as prioridades, o documento passa a expressar a realidade daquela comunidade, e não um modelo copiado. É o que prevê a própria LDB, ao garantir a participação das comunidades escolar e local em conselhos escolares. Uma escola que ouve as famílias sobre a evasão no período da colheita, por exemplo, consegue ajustar o calendário e as estratégias de busca ativa. Assim, a participação transforma o PPP em ferramenta de gestão, e não em papel arquivado.*',
      },
    ],
    fontes: [
      {
        titulo: 'Direção Concursos — Redação para concursos públicos: como estruturar seu texto',
        url: 'https://www.direcaoconcursos.com.br/artigos/redacao-para-concursos-publicos-como-estruturar-seu-texto',
      },
      {
        titulo: 'Lei nº 9.394/1996 (LDB), art. 14 — Planalto',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l9394.htm',
      },
    ],
  },
  {
    id: 'conclusao-intervencao',
    titulo: '6. Conclusão e proposta de intervenção',
    resumo: 'Retomar a tese e propor uma solução com agente, ação, meio, finalidade e detalhe.',
    minutos: 5,
    secoes: [
      {
        titulo: 'O que a conclusão faz',
        texto:
          'A conclusão **retoma a tese** (com outras palavras), **sintetiza** os argumentos e **encaminha** uma saída. Ela não traz argumento novo. Evite fechos vazios como "Portanto, conclui-se que é um tema muito importante".',
      },
      {
        titulo: 'Quando o comando pede intervenção',
        texto:
          'Algumas provas da FAU de 2026 pediram: *"ao final, proponha uma intervenção viável"*. Nesse caso, a proposta é obrigatória. Uma proposta completa tem cinco elementos:\n\n- **Agente:** quem faz (Secretaria Municipal de Educação, equipe gestora, professores, conselho escolar).\n- **Ação:** o que será feito.\n- **Meio:** como (por meio de quê, de modo concreto).\n- **Finalidade:** para quê.\n- **Detalhamento:** um detalhe a mais sobre um dos elementos.\n\nModelo: *"Diante disso, cabe à [agente] [ação], por meio de [meio], a fim de [finalidade]."*',
      },
      {
        titulo: 'Exemplo (autoral)',
        texto:
          '*Diante disso, o Projeto Político-Pedagógico só cumpre seu papel democrático quando é construído e revisto coletivamente. Para isso, cabe à equipe gestora de cada escola promover, no início do ano letivo, assembleias com professores, famílias e estudantes, por meio do conselho escolar, a fim de atualizar as metas do projeto com base nos resultados do ano anterior. Desse modo, o documento deixa de ser formalidade e passa a orientar, de fato, o trabalho da escola.*',
      },
      {
        titulo: 'Erros comuns',
        texto:
          '- **Agente vago:** "alguém deve fazer algo". Diga quem.\n- **Meio vago:** "por meio de ações". Diga quais.\n- **Proposta impossível** ou que fere direitos: a banca pede intervenção **viável**.',
      },
    ],
    fontes: [
      {
        titulo: 'Toda Matéria — Proposta de intervenção: o que é e como fazer',
        url: 'https://www.todamateria.com.br/proposta-de-intervencao-na-redacao-do-enem-o-que-e-e-como-fazer/',
      },
      {
        titulo: 'Descomplica — Proposta de intervenção em 5 passos',
        url: 'https://descomplica.com.br/blog/proposta-de-intervencao-para-a-redacao-em-5-passos-2/',
      },
    ],
  },
  {
    id: 'coesao',
    titulo: '7. Coesão: os conectivos certos',
    resumo: 'Conectivos por função e como retomar ideias sem repetir palavras.',
    minutos: 5,
    secoes: [
      {
        titulo: 'Conectivos por função',
        texto:
          '- **Adição:** além disso, ademais, também, não só... mas também.\n- **Oposição:** no entanto, entretanto, contudo, todavia, embora (+ subjuntivo).\n- **Causa:** porque, visto que, uma vez que, já que.\n- **Consequência:** por isso, assim, de modo que, por conseguinte.\n- **Finalidade:** a fim de, para que, com o objetivo de.\n- **Exemplo:** por exemplo, como, a exemplo de.\n- **Conclusão:** portanto, logo, dessa forma, diante disso.\n- **Ordem:** em primeiro lugar, além disso, por fim.',
      },
      {
        titulo: 'Os erros com conectivos',
        texto:
          '- **Relação errada:** "Os alunos leem pouco. *Portanto*, a escola tem biblioteca." (não é conclusão).\n- **Empilhar conectivos:** "Portanto, assim, desse modo, conclui-se..." Use um só.\n- **Usar no automático:** antes de escrever o conectivo, pergunte qual é a relação entre as ideias.',
      },
      {
        titulo: 'Retomar sem repetir',
        texto:
          'Para não repetir "a escola" cinco vezes, use **pronomes** (ela, essa instituição), **sinônimos** (a instituição de ensino, o ambiente escolar) e **expressões resumidoras** (esse cenário, tal desafio). Isso também é coesão, e conta na Estrutura.',
      },
    ],
    fontes: [
      {
        titulo: 'Gran Cursos — Coesão e coerência: diferenças, exemplos e exercícios',
        url: 'https://blog.grancursosonline.com.br/coesao-e-coerencia-diferencas-exemplos-e-exercicios/',
      },
      {
        titulo: 'Concursos no Brasil — Conectivos para redação',
        url: 'https://concursosnobrasil.com/escola/portugues/conectivos-para-redacao.html',
      },
    ],
  },
  {
    id: 'expressao',
    titulo: '8. Expressão: os erros que tiram ponto',
    resumo: 'Concordância, regência, crase, vírgula e linguagem formal.',
    minutos: 7,
    secoes: [
      {
        titulo: 'Concordância',
        texto:
          '- **Haver** no sentido de existir não vai ao plural: *houve* problemas (não "houveram").\n- **Fazer** indicando tempo também não: *faz* dois anos (não "fazem").\n- Sujeito depois do verbo continua mandando: *faltam* recursos às escolas.\n- *É necessário* paciência / *é necessária* a paciência (com artigo, concorda).',
      },
      {
        titulo: 'Regência e crase',
        texto:
          '- *Assistir a* (ver): assistir **ao** filme. *Visar a* (ter como objetivo): visa **ao** desenvolvimento.\n- *Implicar* (acarretar) não pede "em": a decisão implica mudanças.\n- **Crase** é a preposição *a* + o artigo *a*: vou **à** escola; refiro-me **à** gestão.\n- **Não há crase** antes de palavra masculina (a pé), antes de verbo (começou a estudar) e antes de pronomes como esta, essa, ela (a esta escola).',
      },
      {
        titulo: 'Vírgula',
        texto:
          '- **Nunca separe o sujeito do verbo:** "Os professores da rede, precisam..." está errado.\n- Use vírgula depois de expressões deslocadas no início: *Na Educação Infantil, as interações...*\n- Use vírgula antes de *mas*, *porém* e *contudo* no meio da frase.',
      },
      {
        titulo: 'Palavras que confundem',
        texto:
          '- *Mal* (oposto de bem) × *mau* (oposto de bom).\n- *Há* (tempo passado ou existir) × *a* (futuro ou distância): há dois anos; daqui a dois anos.\n- *Onde* (lugar físico) — não use "onde" para tempo ou situação: prefira *em que*, *no qual*.\n- *Por que* (pergunta), *porque* (explicação), *por quê* (fim de frase), *porquê* (substantivo).',
      },
      {
        titulo: 'Linguagem adequada',
        texto:
          'Sem gíria, abreviação ("vc", "tb"), "etc." no lugar de argumentos, frases feitas ("nos dias de hoje", "a educação é a base de tudo") e períodos enormes. Frases claras de 2 a 3 linhas são mais seguras.',
      },
    ],
    fontes: [
      EDITAL,
      {
        titulo: 'Direção Concursos — Dicas para evitar erros comuns na redação',
        url: 'https://www.direcaoconcursos.com.br/artigos/dicas-para-evitar-erros-em-redacao-heitor-ferreira',
      },
    ],
  },
  {
    id: 'repertorio-pedagogico',
    titulo: '9. Repertório pedagógico (Anexo II do professor)',
    resumo: 'Leis, documentos e autores do conteúdo do cargo, prontos para argumentar.',
    minutos: 9,
    secoes: [
      {
        titulo: 'Leis e documentos',
        texto:
          '- **LDB (Lei nº 9.394/1996):** o art. 14 trata da **gestão democrática**: participação dos profissionais na elaboração do projeto pedagógico e das comunidades escolar e local em conselhos escolares.\n- **Lei nº 12.796/2013:** alterou a LDB e tornou a educação básica **obrigatória e gratuita dos 4 aos 17 anos**.\n- **ECA (Lei nº 8.069/1990):** proteção integral; é direito dos pais ou responsáveis ter ciência do processo pedagógico e participar da definição das propostas educacionais (art. 53, parágrafo único).\n- **ECA Digital (Lei nº 15.211/2025):** protege crianças e adolescentes no ambiente digital (redes sociais, jogos, vídeos); exige verificação de idade e ferramentas de supervisão parental; está em vigor desde março de 2026.\n- **Novo PNE (Lei nº 15.388/2026, para 2026–2036):** tem a **equidade** como princípio e metas para reduzir as desigualdades de aprendizagem; prevê, por exemplo, ampliar a educação em tempo integral e universalizar a pré-escola de 4 e 5 anos.',
      },
      {
        titulo: 'BNCC e Referencial do Paraná',
        texto:
          '- **BNCC:** define as aprendizagens essenciais da educação básica, com **10 competências gerais**.\n- **Educação Infantil na BNCC:** os **eixos estruturantes** são as **interações e a brincadeira**; são **6 direitos de aprendizagem** (conviver, brincar, participar, explorar, expressar e conhecer-se) e **5 campos de experiência** (O eu, o outro e o nós; Corpo, gestos e movimentos; Traços, sons, cores e formas; Escuta, fala, pensamento e imaginação; Espaços, tempos, quantidades, relações e transformações).\n- **Referencial Curricular do Paraná (2018):** traz para o contexto paranaense os princípios, direitos e objetivos de aprendizagem da BNCC, preservando a autonomia das redes e escolas.',
      },
      {
        titulo: 'Autores',
        texto:
          '- **Paulo Freire:** critica a **educação "bancária"**, em que o professor "deposita" conteúdos num aluno passivo (*Pedagogia do Oprimido*); defende a educação **problematizadora e dialógica**. Em *Pedagogia da autonomia* (1996): ensinar não é transferir conhecimento, mas criar as possibilidades para a sua construção.\n- **Vygotsky:** a aprendizagem é social e mediada; a **zona de desenvolvimento proximal** é a distância entre o que a criança faz sozinha e o que faz com ajuda.\n- **Piaget:** o conhecimento é construído pela criança na interação com o meio, em estágios de desenvolvimento.\n- **Wallon:** a **afetividade** é parte do desenvolvimento, junto com a cognição e o movimento.\n- **Magda Soares:** alfabetização (aprender o sistema de escrita) e letramento (usar a escrita nas práticas sociais) são diferentes, mas inseparáveis: o ideal é **alfabetizar letrando**.',
      },
      {
        titulo: 'Como usar o repertório',
        texto:
          'Repertório **pertinente** (ligado ao tema), **explicado** (o que ele diz) e **aplicado** (o que isso prova no seu argumento). Uma lei ou autor bem usado vale mais que três citados de passagem. E só cite o que você tem certeza: número de lei ou ano errado tira a confiança do corretor.',
      },
    ],
    fontes: [
      { titulo: 'Lei nº 9.394/1996 (LDB) — Planalto', url: 'https://www.planalto.gov.br/ccivil_03/leis/l9394.htm' },
      {
        titulo: 'Lei nº 12.796/2013 — Câmara dos Deputados',
        url: 'https://www2.camara.leg.br/legin/fed/lei/2013/lei-12796-4-abril-2013-775628-publicacaooriginal-139375-pl.html',
      },
      { titulo: 'Lei nº 15.211/2025 (ECA Digital) — Planalto', url: 'https://www.planalto.gov.br/ccivil_03/_Ato2023-2026/2025/Lei/L15211.htm' },
      { titulo: 'Lei nº 15.388/2026 (PNE) — Planalto', url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/l15388.htm' },
      {
        titulo: 'MEC — Governo sanciona novo Plano Nacional de Educação',
        url: 'https://www.gov.br/mec/pt-br/assuntos/noticias/2026/abril/governo-do-brasil-sanciona-novo-plano-nacional-da-educacao',
      },
      {
        titulo: 'Nova Escola — Os 6 direitos de aprendizagem da BNCC',
        url: 'https://novaescola.org.br/bncc/conteudo/56/entenda-os-6-direitos-de-aprendizagem-propostos-pela-bncc',
      },
      {
        titulo: 'Nova Escola — Os campos de experiência da Educação Infantil',
        url: 'https://novaescola.org.br/bncc/conteudo/58/o-que-sao-os-campos-de-experiencia-da-educacao-infantil',
      },
      {
        titulo: 'UNESP (RPGE) — Educação bancária e educação problematizadora em Paulo Freire',
        url: 'https://periodicos.fclar.unesp.br/rpge/article/download/15397/14399?inline=1',
      },
      {
        titulo: 'UFMG (FaE) — Alfabetização e letramento',
        url: 'https://livrosabertos.fae.ufmg.br/wp-content/uploads/2022/04/Col_Alf.Let_.01_Alfabetizacao_Letramento.pdf',
      },
    ],
  },
  {
    id: 'dia-da-prova',
    titulo: '10. No dia da prova e no seu treino',
    resumo: 'Tempo, rascunho, folha definitiva e uma rotina semanal até 21/02.',
    minutos: 5,
    secoes: [
      {
        titulo: 'Tempo',
        texto:
          'A redação é no **mesmo horário** da objetiva (item 10.29.1), e a objetiva tem **4 horas** (item 10.21). O edital não separa o tempo de cada uma, então você divide. Uma sugestão: **reserve 1h10 para a redação** — 10 minutos para planejar, 35 para o rascunho, 20 para passar a limpo e 5 para revisar. Muita gente faz a redação primeiro, com a cabeça descansada.',
      },
      {
        titulo: 'Rascunho e folha definitiva',
        texto:
          '- Planeje antes: tese e o tópico frasal de cada parágrafo, em tópicos.\n- Só a **folha definitiva** vale (item 10.37). Não deixe para passar a limpo nos últimos minutos.\n- **Caneta azul ou preta**, transparente; **letra legível**; nada de lápis.\n- **Não se identifique** em lugar nenhum do texto: nem nome, nem assinatura, nem desenho.\n- O edital não pede título. Se a proposta não pedir, não ponha: ele gasta linha.\n- Respeite **20 a 30 linhas**.',
      },
      {
        titulo: 'Rotina de treino aqui no app',
        texto:
          'Você tem **3 correções por semana**. Uma rotina que funciona:\n\n1. **Uma redação nova por semana**, com cronômetro de 1h10.\n2. **Leia a correção** com calma: comece pelo aspecto com a menor nota.\n3. **Reescreva** a mesma redação corrigindo os pontos apontados e peça nova correção.\n4. Use a terceira correção para um **tema diferente** ou uma segunda reescrita.\n\nAté 21/02/2027 dá para fazer mais de 30 redações corrigidas.',
      },
      {
        titulo: 'Sobre a correção do app',
        texto:
          'A correção é feita por **inteligência artificial** com os critérios da Tabela 10.1 do edital. É uma **estimativa para treino**: mostra onde melhorar, mas não é a nota da banca nem garante resultado.',
      },
    ],
    fontes: [EDITAL],
  },
];
