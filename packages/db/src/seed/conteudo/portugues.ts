import type { UnidadeSeed } from './tipos.js';

/** Unidade completa de Português (comum). Questões autorais, estilo FAU. */
export const unidadePortugues: UnidadeSeed = {
  chave: 'unidade:portugues-essencial',
  titulo: 'Português essencial',
  disciplina: 'portugues',
  area: null,
  ordem: 1,
  secoes: [
    {
      chave: 'secao:crase',
      titulo: 'Crase',
      assunto: {
        slug: 'crase',
        nome: 'Crase',
        dicaTitulo: 'Crase = a + a',
        dicaTexto:
          'A crase é a junção da preposição "a" (pedida por um verbo ou nome) com o artigo "a" (que acompanha uma palavra feminina). Sem as duas coisas, não há acento grave. Teste: troque a palavra feminina por uma masculina. Se aparecer "ao", tem crase.',
        dicaExemplo: 'Fui à farmácia. → Fui ao mercado. (apareceu "ao": tem crase)',
      },
      questoes: [
        {
          chave: 'q:crase:01',
          enunciado:
            'Assinale a alternativa em que o acento indicativo de crase está empregado corretamente.',
          alternativas: [
            'Ela começou à estudar cedo.',
            'Entregamos o documento à diretora da escola.',
            'Ficamos frente à frente com o problema.',
            'Ele foi à pé para o trabalho.',
            'Refiro-me à esta proposta.',
          ],
          gabarito: 'B',
          explicacao:
            'Em B, "entregar algo a alguém" pede a preposição "a", e "diretora" aceita o artigo "a": a + a = à. Nas outras não há crase: antes de verbo (estudar), em palavras repetidas (frente a frente), antes de palavra masculina (pé) e antes do pronome "esta".',
          dicaBolso: 'Antes de verbo, de palavra masculina e de "esta/essa" nunca há crase.',
          dica: 'Procure a frase em que o "a" vem antes de uma palavra feminina que aceita artigo.',
          dificuldade: 1,
        },
        {
          chave: 'q:crase:02',
          enunciado: 'Em qual das frases abaixo FALTA o acento indicativo de crase?',
          alternativas: [
            'Vou a Curitiba amanhã.',
            'Chegamos a uma conclusão.',
            'O prefeito falou a todos os presentes.',
            'Entreguei o relatório a secretária.',
            'Ele voltou a trabalhar ontem.',
          ],
          gabarito: 'D',
          explicacao:
            '"Entregar a" + "a secretária" = "à secretária". Nas demais o "a" está certo sem acento: cidade sem artigo (volto de Curitiba), antes de artigo indefinido (uma), de pronome indefinido (todos) e de verbo (trabalhar).',
          dicaBolso: 'Troque por masculino: "entreguei ao secretário" → então é "à secretária".',
          dica: 'Faça o teste do masculino em cada frase.',
          dificuldade: 1,
        },
        {
          chave: 'q:crase:03',
          enunciado: 'Complete corretamente: "O atendimento ao público será das 8h ___ 12h."',
          alternativas: ['a', 'as', 'às', 'à', 'há'],
          gabarito: 'C',
          explicacao:
            'Com horas exatas há crase: "das 8h às 12h" (de + as / a + as). O paralelismo com "das" confirma o "às".',
          dicaBolso: 'Se começou com "das", termina com "às".',
          dica: 'Observe a palavra que abre o intervalo de horário.',
          dificuldade: 1,
        },
        {
          chave: 'q:crase:04',
          enunciado: 'Em qual frase o "a" NÃO deve receber o acento grave?',
          alternativas: [
            'Obedeça __ normas do edital.',
            'Ele saiu __ pressas.',
            'O servidor dirigiu-se __ recepção.',
            'Começou __ chover forte.',
            'Fizemos referência __ Lei Orgânica.',
          ],
          gabarito: 'D',
          explicacao:
            'Antes de verbo não há crase: "começou a chover". Nas outras há: "às normas", "às pressas" (locução feminina), "à recepção" e "à Lei Orgânica".',
          dicaBolso: 'Verbo depois do "a"? Sem acento, sempre.',
          dica: 'Veja qual lacuna vem antes de um verbo.',
          dificuldade: 1,
        },
        {
          chave: 'q:crase:05',
          enunciado:
            'Assinale a alternativa correta quanto ao uso da crase antes de nomes de lugar.',
          alternativas: [
            'Vou à Bahia nas férias.',
            'Vou à Roma no ano que vem.',
            'Viajei à Palmital no domingo.',
            'Cheguei à Portugal de manhã.',
            'Fui à Brasília a trabalho.',
          ],
          gabarito: 'A',
          explicacao:
            'Diz-se "volto da Bahia" (lugar com artigo), então "vou à Bahia". Com Roma, Palmital, Portugal e Brasília diz-se "volto de", sem artigo: logo, "vou a".',
          dicaBolso: 'Volto da, crase há. Volto de, crase pra quê?',
          dica: 'Use o teste do "volto da / volto de".',
          dificuldade: 2,
        },
        {
          chave: 'q:crase:06',
          enunciado: 'Indique a frase escrita de acordo com a norma-padrão.',
          alternativas: [
            'Ele andou à cavalo pela fazenda.',
            'Comprou o sapato à prazo.',
            'Pagou a conta à vista.',
            'Ficaram cara à cara na reunião.',
            'Escreveu o bilhete à lápis.',
          ],
          gabarito: 'C',
          explicacao:
            '"À vista" é locução adverbial com palavra feminina e leva crase. Antes de palavras masculinas (cavalo, prazo, lápis) e em palavras repetidas (cara a cara) não há crase.',
          dicaBolso: 'Locução com palavra feminina (à vista, às vezes, à noite) leva crase.',
          dica: 'Elimine as frases em que o "à" está antes de palavra masculina.',
          dificuldade: 2,
        },
        {
          chave: 'q:crase:07',
          enunciado: 'Em qual alternativa a crase está empregada corretamente?',
          alternativas: [
            'Entreguei o prêmio à ela.',
            'Dirigiu-se à Vossa Senhoria.',
            'Pedi informação à senhora da recepção.',
            'Disse à você que viria.',
            'Mostrou o documento à alguém.',
          ],
          gabarito: 'C',
          explicacao:
            '"Senhora" aceita artigo ("a senhora"), então "pedir a" + "a senhora" = "à senhora". Pronomes pessoais (ela, você), de tratamento (Vossa Senhoria) e indefinidos (alguém) não aceitam artigo.',
          dicaBolso: '"Senhora", "senhorita" e "dona" aceitam crase; "ela", "você" e "Vossa" não.',
          dica: 'Qual dessas palavras aceita o artigo "a" antes dela?',
          dificuldade: 2,
        },
        {
          chave: 'q:crase:08',
          enunciado: 'Complete corretamente: "Fiz referência ___ projeto aprovado ontem."',
          alternativas: ['aquele', 'àquele', 'há aquele', 'á aquele', 'à aquele'],
          gabarito: 'B',
          explicacao:
            '"Fazer referência a" + "aquele" = "àquele". A preposição "a" se funde com o "a" inicial de aquele(s), aquela(s) e aquilo.',
          dicaBolso: 'Troque por "a este": se couber, é "àquele".',
          dica: 'Quem faz referência, faz referência "a" alguma coisa.',
          dificuldade: 2,
        },
        {
          chave: 'q:crase:09',
          enunciado: 'Assinale a alternativa em que o uso do acento grave é FACULTATIVO.',
          alternativas: [
            'Entreguei o livro à minha irmã.',
            'Vamos à praia no feriado.',
            'O ônibus chegou às 10h.',
            'Todos obedeceram às regras.',
            'Fez alusão à crise econômica.',
          ],
          gabarito: 'A',
          explicacao:
            'Antes de pronome possessivo feminino no singular (minha, sua, nossa) o artigo é opcional, então a crase também é: "à minha irmã" ou "a minha irmã". Nas outras a crase é obrigatória.',
          dicaBolso: 'Possessivo feminino singular: crase opcional.',
          dica: 'Procure o caso em que o artigo antes da palavra pode ou não aparecer.',
          dificuldade: 3,
        },
        {
          chave: 'q:crase:10',
          enunciado: 'Assinale a frase escrita corretamente.',
          alternativas: [
            'Não dou atenção à fofocas.',
            'Assisti às reuniões da Câmara.',
            'Ele se dedicou à estudos.',
            'Fui à uma reunião importante.',
            'Ela entregou o ofício à cada servidor.',
          ],
          gabarito: 'B',
          explicacao:
            '"Assistir a" (ver) + "as reuniões" = "às reuniões". "A" no singular antes de palavra no plural (a fofocas) é só preposição. Antes de "estudos" (masculino), "uma" (indefinido) e "cada" não há crase.',
          dicaBolso: '"a" + plural = sem crase; "às" + plural = com crase.',
          dica: 'Compare o número (singular/plural) do "a" com o da palavra seguinte.',
          dificuldade: 2,
        },
      ],
    },
    {
      chave: 'secao:concordancia-verbal',
      titulo: 'Concordância verbal',
      assunto: {
        slug: 'concordancia-verbal',
        nome: 'Concordância verbal',
        dicaTitulo: 'O verbo segue o sujeito',
        dicaTexto:
          'O verbo concorda com o sujeito em número e pessoa. Ache o sujeito perguntando "quem?" ou "o quê?" ao verbo. Cuidado quando o sujeito vem depois do verbo. "Haver" (no sentido de existir) e "fazer" (tempo) ficam no singular.',
        dicaExemplo: 'Faltam dois documentos. (O que falta? Dois documentos → plural)',
      },
      questoes: [
        {
          chave: 'q:concordancia:01',
          enunciado: 'Assinale a alternativa correta quanto à concordância verbal.',
          alternativas: [
            'Faltou dois servidores na reunião.',
            'Chegaram as encomendas da secretaria.',
            'Existe muitas dúvidas sobre o edital.',
            'Sobrou vagas no estacionamento.',
            'Aconteceu vários problemas ontem.',
          ],
          gabarito: 'B',
          explicacao:
            'O sujeito "as encomendas" está no plural, então "chegaram". Nas outras o sujeito também é plural e vem depois do verbo: faltaram dois servidores, existem muitas dúvidas, sobraram vagas, aconteceram vários problemas.',
          dicaBolso: 'Sujeito depois do verbo continua mandando no verbo.',
          dica: 'Pergunte "o que chegou/faltou/existe?" e veja se a resposta está no plural.',
          dificuldade: 1,
        },
        {
          chave: 'q:concordancia:02',
          enunciado: 'Assinale a frase de acordo com a norma-padrão.',
          alternativas: [
            'Haviam muitas pessoas na fila.',
            'Houveram problemas na votação.',
            'Havia muitas pessoas na fila.',
            'Devem haver soluções para o caso.',
            'Podem haver atrasos na entrega.',
          ],
          gabarito: 'C',
          explicacao:
            '"Haver" no sentido de existir é impessoal: fica no singular e passa essa impessoalidade ao verbo auxiliar. Correto: havia, houve, deve haver, pode haver.',
          dicaBolso: 'Haver = existir? Singular sempre, até no auxiliar.',
          dica: 'Troque "haver" por "existir" e veja qual verbo não precisa ir ao plural.',
          dificuldade: 2,
        },
        {
          chave: 'q:concordancia:03',
          enunciado: 'Indique a alternativa correta.',
          alternativas: [
            'Fazem dois anos que moro nesta cidade.',
            'Faz dois anos que moro nesta cidade.',
            'Vão fazer três meses que ele saiu.',
            'Devem fazer cinco anos que não chove assim.',
            'Fizeram dez dias que o processo parou.',
          ],
          gabarito: 'B',
          explicacao:
            '"Fazer" indicando tempo decorrido é impessoal e fica no singular: faz dois anos, vai fazer três meses, deve fazer cinco anos, fez dez dias.',
          dicaBolso: 'Fazer + tempo = singular.',
          dica: 'Quando o verbo indica tempo passado, ele tem sujeito?',
          dificuldade: 2,
        },
        {
          chave: 'q:concordancia:04',
          enunciado: 'Complete corretamente: "O prefeito e o vice-prefeito ___ da cerimônia."',
          alternativas: ['participou', 'participaram', 'participa', 'participará', 'participava'],
          gabarito: 'B',
          explicacao:
            'Sujeito composto antes do verbo leva o verbo ao plural: "O prefeito e o vice-prefeito participaram".',
          dicaBolso: 'Dois sujeitos antes do verbo = plural.',
          dica: 'Quantos núcleos tem o sujeito?',
          dificuldade: 1,
        },
        {
          chave: 'q:concordancia:05',
          enunciado: 'Complete corretamente: "Fui eu que ___ o ofício."',
          alternativas: ['fez', 'fiz', 'fizeram', 'fazia', 'faz'],
          gabarito: 'B',
          explicacao:
            'Com o pronome relativo "que", o verbo concorda com o antecedente "eu": "fui eu que fiz". (Com "quem", o verbo pode ficar na 3ª pessoa: "fui eu quem fez".)',
          dicaBolso: '"Eu que fiz", "nós que fizemos".',
          dica: 'A quem o "que" se refere na frase?',
          dificuldade: 2,
        },
        {
          chave: 'q:concordancia:06',
          enunciado: 'Complete corretamente: "___ duas horas da tarde quando a sessão começou."',
          alternativas: ['Era', 'Eram', 'Foi', 'Seria', 'É'],
          gabarito: 'B',
          explicacao:
            'Na indicação de horas, o verbo "ser" concorda com o número de horas: "eram duas horas", "era uma hora".',
          dicaBolso: 'Ser + horas: concorda com o número.',
          dica: 'O número de horas está no singular ou no plural?',
          dificuldade: 1,
        },
        {
          chave: 'q:concordancia:07',
          enunciado: 'Assinale a alternativa correta.',
          alternativas: [
            'Vende-se casas no centro.',
            'Alugam-se salas comerciais.',
            'Precisam-se de funcionários.',
            'Conserta-se bicicletas.',
            'Aluga-se apartamentos.',
          ],
          gabarito: 'B',
          explicacao:
            'Na voz passiva sintética (verbo + se), o verbo concorda com o sujeito: "salas são alugadas" → "alugam-se salas". Também: vendem-se casas, consertam-se bicicletas, alugam-se apartamentos. Com verbo que pede preposição (precisar de), o verbo fica no singular: "precisa-se de funcionários".',
          dicaBolso: 'Dá para virar "são + particípio"? Então o verbo concorda.',
          dica: 'Transforme em "... são vendidas/alugadas" e veja o número.',
          dificuldade: 3,
        },
        {
          chave: 'q:concordancia:08',
          enunciado:
            'Complete corretamente: "Na próxima semana, ___ as inscrições para o concurso."',
          alternativas: ['termina', 'terminam', 'terminou', 'terminará', 'termine'],
          gabarito: 'B',
          explicacao:
            'O sujeito "as inscrições" está no plural, mesmo depois do verbo: "terminam as inscrições".',
          dicaBolso: 'Coloque o sujeito na frente: "as inscrições terminam".',
          dica: 'O que termina? Essa resposta está no singular ou no plural?',
          dificuldade: 1,
        },
        {
          chave: 'q:concordancia:09',
          enunciado: 'Complete corretamente: "Cada um dos candidatos ___ seu documento."',
          alternativas: [
            'apresentaram',
            'apresentou',
            'apresentarão',
            'apresentam',
            'apresentassem',
          ],
          gabarito: 'B',
          explicacao:
            'Com "cada um (dos...)", o verbo fica no singular, concordando com "cada um": "cada um dos candidatos apresentou".',
          dicaBolso: '"Cada um" é um só: verbo no singular.',
          dica: 'O núcleo do sujeito é "candidatos" ou "cada um"?',
          dificuldade: 2,
        },
        {
          chave: 'q:concordancia:10',
          enunciado: 'Complete corretamente: "A gente ___ cedo para pegar o ônibus."',
          alternativas: ['saímos', 'sai', 'saem', 'saíram', 'saiamos'],
          gabarito: 'B',
          explicacao:
            '"A gente" leva o verbo para a 3ª pessoa do singular: "a gente sai". "A gente saímos" é desvio da norma-padrão.',
          dicaBolso: '"A gente" = "ele": a gente vai, a gente sai.',
          dica: 'Com que pessoa gramatical "a gente" combina?',
          dificuldade: 1,
        },
      ],
    },
    {
      chave: 'secao:acentuacao',
      titulo: 'Acentuação gráfica',
      assunto: {
        slug: 'acentuacao-grafica',
        nome: 'Acentuação gráfica',
        dicaTitulo: 'Três regras resolvem quase tudo',
        dicaTexto:
          'Proparoxítonas: todas têm acento (lâmpada, público). Oxítonas terminadas em a, e, o, em, ens: acento (sofá, café, avó, também, parabéns). Paroxítonas terminadas em l, n, r, x, i, us, um, ão, ã, ps e ditongo: acento (fácil, hífen, caráter, tórax, júri, vírus, álbum, órgão, órfã, bíceps, história). Pelo Novo Acordo, "ideia", "heroico" e "voo" perderam o acento.',
        dicaExemplo: 'público (proparoxítona) · café (oxítona em e) · fácil (paroxítona em l)',
      },
      questoes: [
        {
          chave: 'q:acentuacao:01',
          enunciado:
            'Assinale a alternativa em que todas as palavras estão acentuadas corretamente.',
          alternativas: [
            'público, fácil, café',
            'ítem, juíz, côco',
            'idéia, herói, chapéu',
            'rúbrica, gratuíto, ruím',
            'bambú, tatú, caju',
          ],
          gabarito: 'A',
          explicacao:
            '"Público" é proparoxítona, "fácil" é paroxítona terminada em l e "café" é oxítona terminada em e. Corretas sem acento: item, juiz, coco, ideia, rubrica, gratuito, ruim, bambu, tatu.',
          dicaBolso: 'Oxítona em i ou u (caju, tatu) não tem acento.',
          dica: 'Elimine as alternativas que têm pelo menos uma palavra errada.',
          dificuldade: 2,
        },
        {
          chave: 'q:acentuacao:02',
          enunciado:
            'De acordo com o Novo Acordo Ortográfico, qual palavra perdeu o acento gráfico?',
          alternativas: ['herói', 'ideia', 'chapéu', 'troféu', 'papéis'],
          gabarito: 'B',
          explicacao:
            'O acento dos ditongos abertos "éi" e "ói" caiu nas paroxítonas (ideia, assembleia, heroico, jiboia). Nas oxítonas e nos monossílabos ele continua: herói, chapéu, troféu, papéis.',
          dicaBolso: 'Ditongo aberto: paroxítona perdeu, oxítona manteve.',
          dica: 'Veja onde está a sílaba mais forte de cada palavra.',
          dificuldade: 2,
        },
        {
          chave: 'q:acentuacao:03',
          enunciado: 'Assinale a palavra acentuada pela mesma regra de "lâmpada".',
          alternativas: ['público', 'fácil', 'café', 'também', 'saúde'],
          gabarito: 'A',
          explicacao:
            '"Lâmpada" e "público" são proparoxítonas (sílaba tônica na antepenúltima) e todas as proparoxítonas são acentuadas.',
          dicaBolso: 'Antepenúltima forte? Acento sempre.',
          dica: 'Conte as sílabas de trás para a frente até a mais forte.',
          dificuldade: 1,
        },
        {
          chave: 'q:acentuacao:04',
          enunciado: 'Assinale a alternativa grafada de acordo com a ortografia vigente.',
          alternativas: ['vôo', 'enjôo', 'voo', 'abençôo', 'perdôo'],
          gabarito: 'C',
          explicacao:
            'O Novo Acordo eliminou o acento circunflexo do hiato "oo": voo, enjoo, abençoo, perdoo.',
          dicaBolso: 'Dois "o" seguidos: sem chapéu.',
          dica: 'O Novo Acordo mexeu nas palavras com "oo".',
          dificuldade: 1,
        },
        {
          chave: 'q:acentuacao:05',
          enunciado: 'Complete corretamente: "Ontem ele não ___ comparecer; hoje ele ___."',
          alternativas: ['pode / pôde', 'pôde / pode', 'pôde / pôde', 'pode / pode', 'póde / pode'],
          gabarito: 'B',
          explicacao:
            '"Pôde" (passado) leva acento diferencial para se distinguir de "pode" (presente). Ontem: pôde; hoje: pode.',
          dicaBolso: 'Pôde = passado; pode = agora.',
          dica: 'Qual forma indica o passado?',
          dificuldade: 1,
        },
        {
          chave: 'q:acentuacao:06',
          enunciado:
            'Complete corretamente: "Os servidores ___ direito a férias; o servidor ___ direito a férias."',
          alternativas: ['tem / têm', 'têm / tem', 'têm / têm', 'tem / tem', 'teem / tem'],
          gabarito: 'B',
          explicacao:
            'O plural de "ter" na 3ª pessoa leva circunflexo: "eles têm". O singular não: "ele tem".',
          dicaBolso: 'Eles têm (com chapéu), ele tem (sem).',
          dica: 'O acento marca o plural.',
          dificuldade: 1,
        },
        {
          chave: 'q:acentuacao:07',
          enunciado:
            'Em qual alternativa todas as palavras são acentuadas por terem "i" ou "u" tônicos formando hiato?',
          alternativas: [
            'saúde, país, baú',
            'rainha, juiz, ruim',
            'caju, tatu, urubu',
            'amável, útil, fácil',
            'café, sofá, avô',
          ],
          gabarito: 'A',
          explicacao:
            'Em saú-de, pa-ís e ba-ú o "i" e o "u" tônicos estão sozinhos na sílaba (ou com s) e formam hiato, por isso levam acento. Em rainha, juiz e ruim não há acento porque vêm seguidos de nh ou de l, m, n, r, z na mesma sílaba.',
          dicaBolso: 'i/u tônico sozinho na sílaba = acento (saída, baú).',
          dica: 'Separe as sílabas de cada palavra.',
          dificuldade: 3,
        },
        {
          chave: 'q:acentuacao:08',
          enunciado: 'Assinale a palavra acentuada corretamente.',
          alternativas: ['caráter', 'hífens', 'ítens', 'juíz', 'raíz'],
          gabarito: 'A',
          explicacao:
            '"Caráter" é paroxítona terminada em r e leva acento. Corretas sem acento: hifens e itens (paroxítonas em -ens não levam acento), juiz e raiz (i seguido de z na mesma sílaba).',
          dicaBolso: 'Paroxítona em -ens não tem acento: itens, hifens, jovens.',
          dica: 'Lembre-se da regra das paroxítonas terminadas em r.',
          dificuldade: 3,
        },
        {
          chave: 'q:acentuacao:09',
          enunciado: 'Complete corretamente: "Vou ___ o documento na mesa ___ precaução."',
          alternativas: ['por / pôr', 'pôr / por', 'pôr / pôr', 'por / por', 'pôr / pór'],
          gabarito: 'B',
          explicacao:
            '"Pôr" (verbo) mantém o acento diferencial; "por" (preposição) não tem acento. "Vou pôr o documento... por precaução."',
          dicaBolso: 'Pôr de colocar tem chapéu.',
          dica: 'Qual das duas lacunas é um verbo?',
          dificuldade: 1,
        },
        {
          chave: 'q:acentuacao:10',
          enunciado:
            'Qual das palavras abaixo, escritas sem acento, DEVERIA receber acento gráfico?',
          alternativas: ['caju', 'urubu', 'parabens', 'ruim', 'item'],
          gabarito: 'C',
          explicacao:
            '"Parabéns" é oxítona terminada em -ens e leva acento. Caju e urubu são oxítonas em u (sem acento), ruim tem i seguido de m e item é paroxítona em -em: todas sem acento.',
          dicaBolso: 'Oxítona em -em/-ens: também, parabéns, armazéns.',
          dica: 'Descubra qual delas é oxítona terminada em -ens.',
          dificuldade: 2,
        },
      ],
    },
  ],
};
