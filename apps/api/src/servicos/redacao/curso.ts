/**
 * D49: o curso de redação em formato de lição. A primeira aula explica como a banca dá a nota
 * (informativo); as outras ensinam uma TÉCNICA de escrita cada, com exemplo bom × ruim, e pedem
 * que o aluno ESCREVA aquela parte (tese, introdução, parágrafo, conclusão...), avaliada pela IA.
 * Ao longo do curso, o aluno monta uma redação inteira sobre o mesmo tema de treino.
 *
 * Fontes: edital de Palmital (itens 10.28 a 10.41 e 14.3), cadernos de professor da FAU de 2023 a
 * 2026 e as fontes listadas em cada aula. Tema de treino, parágrafos e modelos são autorais
 * (Fuse Aprova), nunca atribuídos à banca. As `secoes` (o resumo) saem das explicações.
 */
import type { AulaRedacao, PassoAulaRedacao } from '@fuse/shared/api';

const EDITAL = {
  titulo: 'Edital de Abertura nº 01/2026 — Prefeitura de Palmital/PR (FAU), itens 10.28 a 10.41 e 14.3',
  url: 'https://www.concursosfau.com.br',
};
const DIRECAO = {
  titulo: 'Direção Concursos — Redação para concursos públicos: como estruturar seu texto',
  url: 'https://www.direcaoconcursos.com.br/artigos/redacao-para-concursos-publicos-como-estruturar-seu-texto',
};
const UNB = {
  titulo: 'Universidade de Brasília — Aprenda a escrever redação (livro digital)',
  url: 'https://www.repositorio.unb.br/bitstream/10482/54047/1/LIVRO_aprendaescreverredacao.pdf',
};
const LDB = { titulo: 'Lei nº 9.394/1996 (LDB) — Planalto', url: 'https://www.planalto.gov.br/ccivil_03/leis/l9394.htm' };
const ECA = { titulo: 'Lei nº 8.069/1990 (ECA) — Planalto', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8069.htm' };

/** O tema de treino do curso (autoral, no formato das provas da FAU de 2026). */
export const TEMA_TREINO =
  '**Tema de treino (Fuse Aprova):** "Redija um texto dissertativo-argumentativo sobre a participação da família na vida escolar, abordando a sua importância para a aprendizagem, os obstáculos que a dificultam e o papel da escola em promovê-la."';

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
const escrever = (p: {
  titulo: string;
  tarefa: string;
  apoio?: string | null;
  criterios: string[];
  modelo: string;
  minimo: number;
  maximo: number;
}): PassoAulaRedacao => ({ tipo: 'escrever', apoio: TEMA_TREINO, ...p });

type Aula = Omit<AulaRedacao, 'secoes'>;

const AULAS: Aula[] = [
  {
    id: 'como-a-banca-corrige',
    titulo: '1. Como a banca dá a nota',
    resumo: 'Quanto vale, os três aspectos da nota e o que zera.',
    minutos: 4,
    fontes: [EDITAL],
    passos: [
      explica(
        'A redação vale metade da nota',
        'Em Palmital, a redação é **só para o Professor Licenciatura Plena** (item 10.29), no mesmo dia e horário da objetiva. Vale **100 pontos** e é **eliminatória e classificatória**.\n\nA nota final é **(objetiva + redação) ÷ 2**, mais os títulos (item 14.3).',
        'Na prática, a redação pesa o mesmo que a prova objetiva inteira.',
      ),
      explica(
        'Onde estão os pontos',
        'A Tabela 10.1 divide os 100 pontos assim:\n\n- **Conteúdo, até 50:** tratar o tema pedido, com análise, senso crítico e argumentos consistentes.\n- **Estrutura, até 40:** respeitar o gênero dissertativo-argumentativo, fazer o texto progredir e ligar bem frases e parágrafos.\n- **Expressão, até 10:** norma-padrão e linguagem adequada.',
        '90 dos 100 pontos são de ideias e organização. Por isso as próximas aulas são de técnica: tese, parágrafo, conclusão e coesão.',
      ),
      escolha(
        'Onde está a maior parte da nota?',
        ['Na gramática perfeita', 'Nas ideias e na organização do texto', 'Na letra bonita'],
        1,
        'Conteúdo (50) e Estrutura (40) somam 90 pontos. Gramática (Expressão) vale 10.',
      ),
      explica(
        'O que zera (item 10.39)',
        '- fugir do tema;\n- letra ilegível;\n- lápis ou tinta que não seja azul ou preta;\n- folha definitiva em branco;\n- **qualquer marca que identifique você** (nome, rubrica, desenho).',
        'O rascunho não vale nota: só conta a folha definitiva (item 10.37).',
      ),
      escolha(
        'Qual destas atitudes ZERA a redação?',
        ['Escrever 26 linhas', 'Assinar o nome no fim do texto', 'Fazer um rascunho antes'],
        1,
        'Qualquer marca que identifique o candidato zera (item 10.39).',
      ),
    ],
  },
  {
    id: 'ler-o-tema',
    titulo: '2. Técnica: ler o comando e achar o recorte',
    resumo: 'O passo que mais salva nota: entender exatamente o que a banca pediu.',
    minutos: 6,
    fontes: [
      EDITAL,
      {
        titulo: 'Cadernos de prova de professor da FAU (Rio Azul, Borrazópolis, Toledo), 2025 e 2026',
        url: 'https://www.concursosfau.com.br',
      },
    ],
    passos: [
      explica(
        'Como a FAU monta a proposta',
        'Nas provas de professor de 2026, a FAU deu um **enunciado** curto e um **comando**: *"redija um texto dissertativo-argumentativo sobre X, abordando A, B e C"*. Às vezes ainda pede: *"proponha uma intervenção viável"*.',
        'Cada item do "abordando" vira uma parte obrigatória do seu texto.',
      ),
      explica(
        'A técnica em 3 passos',
        '1. **Sublinhe o recorte:** não é "família", é "a participação da família **na vida escolar**".\n2. **Numere cada item do "abordando".** Esqueceu um? Abordagem **parcial**: o Conteúdo cai.\n3. **Veja se pede intervenção.** Se pedir, ela é obrigatória na conclusão.',
        'Escreva a lista na margem do rascunho e risque cada item quando ele entrar no texto.',
      ),
      explica(
        'Tangenciar custa caro',
        'Tangenciar é falar do **assunto geral** sem enfrentar o **recorte**.\n\n- Recorte: participação da família **na vida escolar**.\n- Tangenciou: um texto sobre "a importância da família na sociedade".\n\nNão zera, mas derruba o Conteúdo, que vale metade da nota.',
      ),
      escolha(
        'Um texto sobre o tema de treino fala só da importância da família e não cita obstáculos nem o papel da escola. A abordagem é:',
        ['Completa', 'Parcial: o Conteúdo cai', 'Fuga ao tema: zera'],
        1,
        'O comando pede três itens; o texto tratou de um. Isso é abordagem parcial.',
        TEMA_TREINO,
      ),
      escrever({
        titulo: 'Sua vez: decifre o comando',
        tarefa:
          'Este é o tema que você vai usar em todo o curso. Escreva **o recorte do tema em uma frase** e, depois, **a lista numerada do que o comando manda abordar**.',
        criterios: [
          'O recorte fala da participação da família NA VIDA ESCOLAR (não da família em geral)',
          'A lista traz os três itens: importância para a aprendizagem, obstáculos e papel da escola',
          'Não inventa itens que o comando não pediu',
        ],
        modelo:
          'Recorte: a participação da família na vida escolar e o efeito dela na aprendizagem.\n\n1. Por que essa participação é importante para a aprendizagem.\n2. Quais obstáculos dificultam essa participação.\n3. O que a escola pode fazer para promovê-la.',
        minimo: 40,
        maximo: 600,
      }),
    ],
  },
  {
    id: 'tese',
    titulo: '3. Técnica: a tese que dá nota',
    resumo: 'A fórmula da tese: posição clara + os dois motivos que você vai desenvolver.',
    minutos: 6,
    fontes: [DIRECAO, UNB],
    passos: [
      explica(
        'O que é a tese',
        'A tese é **a sua resposta ao tema, numa frase**. É ela que o corretor procura para saber se você tem um ponto de vista. Sem tese clara, o texto vira só exposição, e o Conteúdo cai.',
      ),
      explica(
        'A fórmula',
        '**Posição + porque/quando + motivo A + motivo B.**\n\nOs dois motivos viram os dois parágrafos de desenvolvimento. Assim, a tese já é o mapa da sua redação.',
        'Modelo: "A participação da família é decisiva para a aprendizagem, mas só acontece de fato quando a escola reconhece os obstáculos dos responsáveis e cria canais reais de diálogo."',
      ),
      explica(
        'Os três erros de tese',
        '- **Em cima do muro:** "A participação da família tem pontos positivos e negativos."\n- **Genérica:** "A família é muito importante nos dias de hoje."\n- **Em forma de pergunta:** "Será que a família participa da escola?"\n\nNenhuma delas diz o que você defende nem por quê.',
      ),
      escolha(
        'Qual é a tese que mais pontua?',
        [
          'A família é a base de tudo na educação.',
          'A participação da família tem vantagens e desvantagens para a escola.',
          'A presença da família melhora a aprendizagem, mas depende de a escola adaptar horários e mudar a forma de se comunicar com os responsáveis.',
        ],
        2,
        'A terceira toma posição e anuncia dois motivos, que viram os dois parágrafos. As outras são genérica e em cima do muro.',
      ),
      escrever({
        titulo: 'Sua vez: escreva a sua tese',
        tarefa:
          'Escreva **uma frase** com a sua tese sobre o tema de treino, usando a fórmula: **posição + dois motivos**. Não copie o modelo: use as suas ideias.',
        criterios: [
          'Toma posição clara (não fica em cima do muro)',
          'Anuncia dois motivos ou caminhos que podem virar parágrafos',
          'Trata do recorte: a família na vida escolar',
          'É uma frase só, impessoal (sem "eu acho")',
        ],
        modelo:
          'A participação da família é decisiva para a aprendizagem, mas só acontece de fato quando a escola reconhece os obstáculos dos responsáveis e cria canais reais de diálogo com eles.',
        minimo: 60,
        maximo: 400,
      }),
    ],
  },
  {
    id: 'introducao',
    titulo: '4. Técnica: introdução em três frases',
    resumo: 'Contexto, tema e tese: a introdução que já mostra ao corretor que você sabe o que faz.',
    minutos: 6,
    fontes: [
      {
        titulo: 'Folha Qconcursos — Redação para concurso: como fazer uma boa introdução',
        url: 'https://folha.qconcursos.com/n/redacao-para-concurso-como-fazer-introducao',
      },
      ECA,
    ],
    passos: [
      explica(
        'A receita: 3 frases',
        '1. **Contexto:** situa o leitor com uma lei, um conceito ou um autor.\n2. **Tema:** apresenta o assunto com as palavras do comando.\n3. **Tese:** a sua posição com os dois motivos.\n\nDá umas 5 ou 6 linhas na folha.',
      ),
      explica(
        'Comece forte, sem clichê',
        'Três aberturas seguras:\n\n- **Pela lei:** "O ECA assegura aos pais o direito de conhecer o processo pedagógico..."\n- **Pelo conceito:** "Gestão democrática é..."\n- **Pelo autor:** "Para Paulo Freire, educar é um ato de diálogo..."',
        'Corte: "Hoje em dia...", "Desde os primórdios...", "É notório que...". Gastam linha e não dizem nada.',
      ),
      ordenar(
        'Monte esta introdução na ordem certa:',
        [
          'O ECA assegura aos pais o direito de conhecer o processo pedagógico e de participar das propostas educacionais.',
          'Em muitas escolas, porém, a presença da família ainda se resume à entrega de boletins.',
          'Essa participação é decisiva para a aprendizagem e só se concretiza quando a escola enfrenta os obstáculos dos responsáveis e abre canais de diálogo.',
        ],
        'Contexto (a lei), apresentação do problema no tema e, por último, a tese com os dois caminhos.',
      ),
      escrever({
        titulo: 'Sua vez: escreva a introdução',
        tarefa:
          'Escreva a introdução da sua redação em **3 frases**: contexto (lei, conceito ou autor), apresentação do tema e a **sua tese** da aula anterior.',
        criterios: [
          'Começa com contexto (lei, conceito ou autor), sem clichê',
          'Apresenta o tema: a participação da família na vida escolar',
          'Termina com a tese, que anuncia dois caminhos',
          'Tem de 2 a 4 frases, em linguagem formal e impessoal',
        ],
        modelo:
          'O Estatuto da Criança e do Adolescente assegura aos pais o direito de conhecer o processo pedagógico e de participar da definição das propostas educacionais. Em muitas escolas, porém, a presença da família ainda se resume à entrega de boletins. Essa participação é decisiva para a aprendizagem e só se concretiza quando a escola reconhece os obstáculos enfrentados pelos responsáveis e cria canais reais de diálogo com eles.',
        minimo: 200,
        maximo: 900,
      }),
    ],
  },
  {
    id: 'paragrafo',
    titulo: '5. Técnica: o parágrafo argumentativo',
    resumo: 'Tópico frasal, explicação, prova, exemplo e fechamento: o parágrafo que pontua.',
    minutos: 8,
    fontes: [DIRECAO, UNB],
    passos: [
      explica(
        'A receita do parágrafo',
        '1. **Tópico frasal:** a ideia central, ligada à tese.\n2. **Explicação:** por quê? como?\n3. **Prova:** lei, autor, conceito ou dado.\n4. **Exemplo:** uma cena concreta da escola.\n5. **Fechamento:** amarra de volta à tese.',
        'São umas 7 ou 8 linhas. Dois parágrafos assim são o coração da sua nota.',
      ),
      explica(
        'Tópico frasal: bom × ruim',
        '- **Ruim:** "A família é importante." (vago, não diz por quê)\n- **Bom:** "Em primeiro lugar, o acompanhamento da família fortalece a aprendizagem porque dá continuidade, em casa, ao que a criança vive na escola."\n\nO bom já traz o argumento e o motivo, e liga com a tese.',
      ),
      ordenar(
        'Ponha as partes do parágrafo na ordem da receita:',
        ['Tópico frasal', 'Explicação', 'Prova (lei, autor ou conceito)', 'Exemplo concreto', 'Fechamento ligado à tese'],
        'Ideia, porquê, prova, exemplo e amarração.',
      ),
      escrever({
        titulo: 'Sua vez: o tópico frasal',
        tarefa:
          'Escreva o **tópico frasal** do seu primeiro argumento (o primeiro motivo da sua tese). Uma frase, começando com um conectivo de ordem, como "Em primeiro lugar".',
        criterios: [
          'É uma frase só, com a ideia central do argumento',
          'Diz o motivo (não fica só em "a família é importante")',
          'Está ligado à tese e ao tema',
        ],
        modelo:
          'Em primeiro lugar, o acompanhamento da família fortalece a aprendizagem porque dá continuidade, em casa, ao que a criança vive na escola.',
        minimo: 50,
        maximo: 350,
      }),
      escrever({
        titulo: 'Agora o parágrafo completo',
        tarefa:
          'Desenvolva o parágrafo inteiro a partir do seu tópico frasal: **explicação, uma prova (lei, autor ou conceito), um exemplo da escola e o fechamento**. De 5 a 8 linhas.',
        criterios: [
          'Abre com o tópico frasal',
          'Explica o porquê da ideia',
          'Usa uma prova (lei, autor ou conceito) e a liga ao argumento',
          'Traz um exemplo concreto do dia a dia escolar',
          'Fecha voltando à tese',
        ],
        modelo:
          'Em primeiro lugar, o acompanhamento da família fortalece a aprendizagem porque dá continuidade, em casa, ao que a criança vive na escola. Quando os responsáveis perguntam sobre as atividades e valorizam o estudo, a criança percebe que aprender tem importância fora da sala de aula. Para Vygotsky, o desenvolvimento acontece na interação com o outro, e a família é a primeira dessas mediações. Um aluno que lê em voz alta para os pais, por exemplo, ganha fluência e confiança mais rápido. Assim, a participação familiar não substitui o professor, mas amplia o alcance do seu trabalho.',
        minimo: 300,
        maximo: 1500,
      }),
    ],
  },
  {
    id: 'repertorio',
    titulo: '6. Técnica: repertório que pontua',
    resumo: 'Citar, explicar e ligar: como usar lei e autor sem virar "citação solta".',
    minutos: 7,
    fontes: [
      LDB,
      ECA,
      {
        titulo: 'UNESP (RPGE) — Educação bancária e educação problematizadora em Paulo Freire',
        url: 'https://periodicos.fclar.unesp.br/rpge/article/download/15397/14399?inline=1',
      },
    ],
    passos: [
      explica(
        'A técnica: citar, explicar, ligar',
        '1. **Cite** a fonte com precisão (lei e artigo, ou autor).\n2. **Explique** o que ela diz, com as suas palavras.\n3. **Ligue** ao seu argumento: o que isso prova?',
        'Solto: "Como dizia Paulo Freire, a educação é importante." Produtivo: cita, explica e tira uma conclusão para o tema.',
      ),
      explica(
        'Repertório para temas de escola e família',
        '- **ECA, art. 53, parágrafo único:** os pais têm direito a ter ciência do processo pedagógico e a participar da definição das propostas educacionais.\n- **LDB, art. 12, VI:** a escola deve articular-se com as famílias e a comunidade.\n- **LDB, art. 14:** gestão democrática, com conselhos escolares.',
      ),
      explica(
        'Autores que a banca conhece',
        '- **Paulo Freire:** educação dialógica, contra a educação "bancária".\n- **Vygotsky:** aprendizagem pela mediação do outro.\n- **Wallon:** a afetividade faz parte do desenvolvimento.',
        'Só cite o que você tem certeza. Lei ou ano errado tira a confiança do corretor.',
      ),
      escolha(
        'Para o tema de treino (família na escola), qual repertório é o mais pertinente?',
        [
          'O ECA, que garante aos pais participar das propostas educacionais',
          'A teoria dos estágios de Piaget',
          'Um dado sobre o PIB do Brasil',
        ],
        0,
        'O ECA trata exatamente do direito dos pais de participar do processo pedagógico: é pertinente ao recorte.',
      ),
      escrever({
        titulo: 'Sua vez: use um repertório',
        tarefa:
          'Escreva **uma ou duas frases** que usem o **ECA (art. 53)** ou a **LDB (art. 12)** para defender a participação da família, aplicando a técnica: cite, explique e ligue ao argumento.',
        criterios: [
          'Cita a lei com precisão (nome e artigo)',
          'Explica o que a lei diz com palavras próprias',
          'Liga a lei ao argumento com uma conclusão (logo, por isso, assim)',
        ],
        modelo:
          'O ECA, em seu art. 53, garante aos pais o direito de conhecer o processo pedagógico e de participar da definição das propostas educacionais. Logo, uma escola que só chama a família para cobrar não cumpre o que a lei prevê.',
        minimo: 80,
        maximo: 600,
      }),
    ],
  },
  {
    id: 'conclusao',
    titulo: '7. Técnica: conclusão com proposta completa',
    resumo: 'Retomar a tese e propor uma solução com agente, ação, meio, finalidade e detalhe.',
    minutos: 7,
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
    passos: [
      explica(
        'O que a conclusão faz',
        '1. **Retoma a tese** com outras palavras.\n2. **Sintetiza** os dois argumentos.\n3. **Propõe** uma saída.\n\n**Nada de argumento novo** e nada de "Portanto, conclui-se que o tema é muito importante".',
      ),
      explica(
        'A proposta de intervenção completa',
        'Cinco elementos:\n\n- **Agente:** quem faz (Secretaria de Educação, equipe gestora, professores, conselho escolar).\n- **Ação:** o que faz.\n- **Meio:** como, de modo concreto.\n- **Finalidade:** para quê.\n- **Detalhamento:** um detalhe a mais.',
        'Fórmula: "Cabe à [agente] [ação], por meio de [meio], a fim de [finalidade]."',
      ),
      ordenar(
        'Monte a proposta na ordem da fórmula:',
        [
          'Cabe à equipe gestora de cada escola',
          'organizar encontros pedagógicos com as famílias',
          'por meio de reuniões em horários alternativos, como aos sábados',
          'a fim de aproximar os responsáveis do que os filhos aprendem',
        ],
        'Agente, ação, meio e finalidade.',
      ),
      escrever({
        titulo: 'Sua vez: escreva a conclusão',
        tarefa:
          'Escreva a conclusão da sua redação: **retome a tese** e faça uma **proposta de intervenção** com agente, ação, meio e finalidade (e um detalhe, se couber). De 4 a 6 linhas.',
        criterios: [
          'Retoma a tese com outras palavras',
          'Tem agente concreto (quem faz)',
          'Tem ação e meio concretos (o que e como)',
          'Tem finalidade (a fim de, para que)',
          'Não traz argumento novo',
        ],
        modelo:
          'Diante disso, a participação da família é condição para uma aprendizagem plena, e não um favor à escola. Para que ela aconteça, cabe à equipe gestora de cada escola, com o apoio da Secretaria Municipal de Educação, organizar encontros pedagógicos em horários alternativos, como no início da noite ou aos sábados, por meio de convites personalizados e rodas de conversa sobre o que os alunos estão aprendendo, a fim de aproximar os responsáveis do cotidiano escolar.',
        minimo: 250,
        maximo: 1200,
      }),
    ],
  },
  {
    id: 'coesao',
    titulo: '8. Técnica: conectivos e retomadas',
    resumo: 'Ligar as ideias com o conectivo certo e retomar sem repetir palavras.',
    minutos: 6,
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
    passos: [
      explica(
        'Conectivo é relação, não enfeite',
        '- **Adição:** além disso, ademais.\n- **Oposição:** no entanto, contudo, embora.\n- **Causa:** porque, visto que, já que.\n- **Consequência:** por isso, de modo que.\n- **Finalidade:** a fim de, para que.\n- **Conclusão:** portanto, diante disso.',
        'Antes de escrever o conectivo, pergunte: qual é a relação entre as duas ideias?',
      ),
      lacuna(
        'Os pais querem acompanhar os filhos. ___, as reuniões acontecem no horário de trabalho deles.',
        ['No entanto', 'Por isso', 'Além disso'],
        0,
        'A segunda ideia contraria a expectativa da primeira: é oposição.',
      ),
      lacuna(
        'Muitos responsáveis trabalham no comércio aos sábados; ___, a reunião de sábado não resolve para todos.',
        ['embora', 'por isso', 'a fim de'],
        1,
        'Trabalhar aos sábados é a causa; a reunião não resolver é a consequência.',
      ),
      escrever({
        titulo: 'Sua vez: ligue as ideias',
        tarefa:
          'Junte as duas frases **numa frase só**, com um conectivo de **oposição**:\n\n*"A família quer participar da escola. A escola só chama os pais para falar de notas baixas."*',
        apoio: null,
        criterios: [
          'Forma uma frase só',
          'Usa um conectivo de oposição (embora, no entanto, contudo, mas...)',
          'Mantém o sentido das duas ideias, com a concordância e a pontuação certas',
        ],
        modelo: 'Embora a família queira participar da escola, ela só é chamada para falar de notas baixas.',
        minimo: 30,
        maximo: 300,
      }),
      explica(
        'Retomar sem repetir',
        'Repetir "a escola" cinco vezes deixa o texto pobre. Troque por:\n\n- **pronome:** ela;\n- **sinônimo:** a instituição, o ambiente escolar;\n- **expressão resumidora:** esse cenário, tal desafio.',
      ),
      escrever({
        titulo: 'Sua vez: tire a repetição',
        tarefa:
          'Reescreva o trecho **sem repetir "a escola"**, usando pronome, sinônimo ou expressão resumidora:\n\n*"A escola precisa ouvir as famílias. A escola deve mudar o horário das reuniões. Assim, a escola fica mais próxima da comunidade."*',
        apoio: null,
        criterios: [
          'Usa "a escola" no máximo uma vez',
          'Troca as outras por pronome, sinônimo ou expressão resumidora',
          'Mantém o sentido do trecho original',
        ],
        modelo:
          'A escola precisa ouvir as famílias. Essa instituição deve, por exemplo, mudar o horário das reuniões. Assim, ela fica mais próxima da comunidade.',
        minimo: 60,
        maximo: 500,
      }),
    ],
  },
  {
    id: 'expressao',
    titulo: '9. Técnica: os erros que mais tiram ponto',
    resumo: 'Haver, crase, vírgula entre sujeito e verbo e o "onde" errado.',
    minutos: 6,
    fontes: [
      EDITAL,
      {
        titulo: 'Direção Concursos — Dicas para evitar erros comuns na redação',
        url: 'https://www.direcaoconcursos.com.br/artigos/dicas-para-evitar-erros-em-redacao-heitor-ferreira',
      },
    ],
    passos: [
      explica(
        'Os quatro campeões de erro',
        '- **Haver** (existir) fica no singular: *houve* problemas, não "houveram".\n- **Crase** só antes de palavra feminina que aceita artigo: refiro-me **à** escola; começou **a** estudar.\n- **Nunca** ponha vírgula entre sujeito e verbo: "Os pais, precisam" está errado.\n- **Onde** é só para lugar físico. Para situação, use *em que*, *na qual*.',
      ),
      lacuna(
        '___ muitas faltas nas reuniões de pais neste ano.',
        ['Houveram', 'Houve', 'Haviam'],
        1,
        'Haver no sentido de existir é impessoal: fica no singular.',
      ),
      lacuna(
        'A escola enviou o convite ___ famílias dos alunos.',
        ['as', 'às', 'à'],
        1,
        'Enviar algo a alguém: a (preposição) + as (artigo) = "às".',
      ),
      escrever({
        titulo: 'Sua vez: corrija a frase',
        tarefa:
          'Reescreva a frase **corrigindo todos os erros**:\n\n*"Houveram muitas reuniões, onde os pais da turma, não puderam ir devido á falta de tempo."*',
        apoio: null,
        criterios: [
          'Troca "Houveram" por "Houve"',
          'Troca o "onde" por uma forma adequada (às quais, a que...)',
          'Tira a vírgula entre o sujeito ("os pais da turma") e o verbo',
          'Corrige a crase em "devido à" (ou troca a expressão)',
        ],
        modelo: 'Houve muitas reuniões às quais os pais da turma não puderam ir devido à falta de tempo.',
        minimo: 30,
        maximo: 300,
      }),
    ],
  },
  {
    id: 'planejar-e-revisar',
    titulo: '10. Técnica: planejar em 10 minutos e revisar',
    resumo: 'O esqueleto antes de escrever, o tempo da prova e o checklist final.',
    minutos: 7,
    fontes: [EDITAL],
    passos: [
      explica(
        'Divida o tempo',
        'A objetiva e a redação dividem **4 horas** (itens 10.21 e 10.29.1). Reserve **1h10** para a redação:\n\n- 10 min para planejar;\n- 35 min de rascunho;\n- 20 min para passar a limpo;\n- 5 min para revisar.',
      ),
      explica(
        'O esqueleto antes de escrever',
        'Em tópicos, no rascunho:\n\n1. **Recorte** e itens do "abordando".\n2. **Tese** (posição + 2 motivos).\n3. **Argumento 1:** tópico frasal + prova + exemplo.\n4. **Argumento 2:** tópico frasal + prova + exemplo.\n5. **Proposta:** agente, ação, meio, finalidade.',
        'Com o esqueleto pronto, a redação sai sem travar e sem fugir do tema.',
      ),
      escrever({
        titulo: 'Sua vez: monte o esqueleto',
        tarefa:
          'Monte o esqueleto, **em tópicos**, para um tema novo: tese, argumento 1, argumento 2 (cada um com uma prova) e a proposta.',
        apoio:
          '**Tema novo (Fuse Aprova):** "Redija um texto dissertativo-argumentativo sobre o brincar na Educação Infantil, abordando o seu papel no desenvolvimento da criança e a função do professor nas brincadeiras."',
        criterios: [
          'Tem tese com posição clara',
          'Tem dois argumentos diferentes, que cobrem os dois itens do comando',
          'Cada argumento tem uma prova (lei, documento, autor ou conceito)',
          'Termina com uma proposta com agente e ação',
        ],
        modelo:
          'Tese: o brincar é eixo do desenvolvimento infantil, desde que o professor o planeje com intenção pedagógica.\nArgumento 1: brincar desenvolve linguagem, corpo e convivência; prova: a BNCC tem as interações e a brincadeira como eixos estruturantes da Educação Infantil.\nArgumento 2: o professor observa, organiza o espaço e media; prova: Vygotsky e a mediação.\nProposta: a Secretaria de Educação oferece formação sobre o brincar, por meio de oficinas nas escolas, a fim de qualificar o planejamento das atividades.',
        minimo: 150,
        maximo: 1200,
      }),
      explica(
        'Checklist antes de entregar',
        '- Atendi **todos** os itens do "abordando"?\n- A tese está clara na introdução?\n- Cada parágrafo tem tópico frasal e prova?\n- A proposta tem agente, ação, meio e finalidade?\n- Entre **20 e 30 linhas**, caneta azul ou preta, **sem identificação**?',
        'Agora junte tudo: vá ao Simulado e escreva a redação inteira com o cronômetro.',
      ),
      escolha(
        'Na folha definitiva, é preciso dar título à redação?',
        ['Sim, sempre', 'Não, se a proposta não pedir: ele só gasta linha', 'Sim, e vale ponto extra'],
        1,
        'O edital não pede título. Se a proposta não pedir, deixe de fora.',
      ),
    ],
  },
];

/** As aulas, com o resumo (`secoes`) montado das explicações de cada uma. */
export const AULAS_REDACAO: AulaRedacao[] = AULAS.map((a) => ({
  ...a,
  secoes: a.passos.flatMap((p) =>
    p.tipo === 'explica'
      ? [{ titulo: p.titulo, texto: p.exemplo ? `${p.texto}\n\n**Macete:** ${p.exemplo}` : p.texto }]
      : p.tipo === 'escrever'
        ? [{ titulo: `Exemplo de resposta: ${p.titulo.replace(/^Sua vez: /, '')}`, texto: p.modelo }]
        : [],
  ),
}));
