/**
 * D49: banco de temas de redação. `fau`: tema real de prova de professor da FAU (texto copiado do
 * caderno, com a prova de origem). `fuse`: tema nosso, no formato das provas da FAU de 2026
 * (enunciado + comando "abordando..."), tirado do conteúdo do Anexo II do Professor de Palmital.
 * Tema nosso nunca é apresentado como da FAU.
 */
import type { TemaRedacao } from '@fuse/shared/api';

const fau = (t: Omit<TemaRedacao, 'origem'>): TemaRedacao => ({ ...t, origem: 'fau' });
const nosso = (t: Omit<TemaRedacao, 'origem' | 'prova'>): TemaRedacao => ({ ...t, origem: 'fuse', prova: null });

export const TEMAS_REDACAO: TemaRedacao[] = [
  /* ------------------------------------------------------------ provas da FAU */
  fau({
    id: 'fau-rio-azul-2026-freire',
    titulo: 'A superação da educação "bancária"',
    eixo: 'Pensamento pedagógico brasileiro',
    apoio: [
      'Paulo Freire em sua Obra Pedagogia da autonomia (1996, p. 14-15) indica que o educador democrático não pode negar-se o dever de, na sua prática docente, reforçar a capacidade crítica do educando, sua curiosidade, sua insubmissão. Uma de suas tarefas primordiais é trabalhar com os educandos a rigorosidade metódica com que devem se “aproximar” dos objetos cognoscíveis. E esta rigorosidade metódica não tem nada que ver com o discurso “bancário” meramente transferidor do perfil do objeto ou do conteúdo.',
      'É exatamente neste sentido que ensinar não se esgota no “tratamento” do objeto ou do conteúdo, superficialmente feito, mas se alonga à produção das condições em que aprender criticamente é possível. E essas condições implicam ou exigem a presença de educadores e de educandos criadores, instigadores, inquietos, rigorosamente curiosos, humildes e persistentes.',
    ],
    fonteApoio: 'Enunciado da prova, a partir de FREIRE, Paulo. Pedagogia da autonomia (1996).',
    comando:
      'A partir do excerto acima e da sua compreensão sobre a necessária autonomia e intervenção docente em sua prática, escreva um texto dissertativo-argumentativo sobre a superação da educação “bancária”, premissa defendida pelo autor em sua obra e perspectiva de educação almejada na educação contemporânea.',
    prova: 'Prefeitura de Rio Azul/PR · Professor · 2026',
  }),
  fau({
    id: 'fau-borrazopolis-2026-etica-digital',
    titulo: 'Ética e cidadania na atuação da escola na era digital',
    eixo: 'Escola e cidadania',
    apoio: [
      'A transformação digital tem impactado significativamente na administração pública e no ambiente escolar, exigindo das instituições maior eficiência, transparência e responsabilidade no atendimento à comunidade. Nesse contexto, a escola desempenha papel fundamental na organização de dados, na comunicação entre escola e sociedade e na garantia de processos acessíveis e seguros. Ao mesmo tempo, o avanço tecnológico traz desafios relacionados à ética no uso das informações, à proteção de dados pessoais, à inclusão digital e ao exercício da cidadania no espaço educacional.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Ética e cidadania na atuação da escola na era digital”, abordando a importância da tecnologia para a melhoria da gestão educacional, os desafios enfrentados pelos profissionais da escola e a necessidade de práticas éticas, inclusivas e acessíveis no atendimento à comunidade.',
    prova: 'Prefeitura de Borrazópolis/PR · Professor · 2026',
  }),
  fau({
    id: 'fau-borrazopolis-2026-tecnologia-setor-publico',
    titulo: 'O uso ético da tecnologia no setor público',
    eixo: 'Interesse geral',
    apoio: [
      'A transformação digital no setor público trouxe avanços significativos para a prestação de serviços à população, permitindo maior agilidade, transparência e eficiência administrativa. Ferramentas como inteligência artificial, bancos de dados integrados, reconhecimento facial e automação de processos passaram a fazer parte da rotina de diversos órgãos públicos.',
      'Entretanto, o uso crescente dessas tecnologias também levanta importantes debates éticos relacionados à privacidade de dados, à segurança das informações, à exclusão digital e à responsabilidade no uso de sistemas automatizados. Além disso, a dependência tecnológica no serviço público exige equilíbrio entre inovação, direitos fundamentais e compromisso com o interesse coletivo.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo, em norma-padrão, apresente argumentos consistentes e, ao final, proponha uma intervenção viável que contribua para o uso responsável e ético da tecnologia no setor público.',
    prova: 'Prefeitura de Borrazópolis/PR · Professor de Educação Física · 2026',
  }),
  fau({
    id: 'fau-rio-azul-2026-esportes',
    titulo: 'Modelos tradicionais e contemporâneos no ensino dos esportes',
    eixo: 'Didática e prática de ensino',
    apoio: [
      'Historicamente, o ensino dos esportes na Educação Física foi dominado pelo modelo tradicional (analítico-sintético). Pautado na repetição exaustiva de fundamentos técnicos descontextualizados, esse modelo parte da premissa de que o aluno deve primeiro dominar a técnica para, posteriormente, ser capaz de jogar. Em contrapartida, a partir do final do século XX, emergiram os modelos contemporâneos (sintético-analíticos e situacionais), essas abordagens invertem a lógica tradicional. A transição ou coexistência entre esses modelos suscita debates na Educação Física escolar e não escolar: até que ponto o domínio da técnica ainda é pré-requisito? Como equilibrar a eficiência gestual com a inteligência tática no contexto atual?',
    ],
    fonteApoio: null,
    comando:
      'Com base no enunciado acima, escreva um texto dissertativo-argumentativo abordando os modelos tradicionais vs contemporâneos no ensino dos esportes e os desafios, limites e possibilidades na prática pedagógica contemporânea.',
    prova: 'Prefeitura de Rio Azul/PR · Professor de Educação Física · 2026',
  }),
  fau({
    id: 'fau-toledo-2025-eixos-bncc',
    titulo: 'Os eixos estruturantes da BNCC na Educação Infantil',
    eixo: 'BNCC e Educação Infantil',
    apoio: [
      'Tendo em vista os eixos estruturantes das práticas pedagógicas e as competências gerais da Educação Básica propostas pela BNCC, a aprendizagem e desenvolvimento estão assegurados, na Educação Infantil. Parte do trabalho do educador é refletir, selecionar, organizar, planejar, mediar e monitorar o conjunto das práticas e interações, garantindo a pluralidade de situações que promovam o desenvolvimento pleno das crianças.',
    ],
    fonteApoio: 'Ministério da Educação (MEC). Base Nacional Comum Curricular (BNCC), conforme a prova.',
    comando:
      'Construa um texto dissertativo-argumentativo em que seja defendido seu ponto de vista sobre o questionamento: "A Importância dos Eixos Estruturantes da BNCC para o Desenvolvimento Integral na Educação Infantil".',
    prova: 'Prefeitura de Toledo/PR · Professor de Educação Infantil · 2025',
  }),
  fau({
    id: 'fau-toledo-2025-educacao-fisica-bncc',
    titulo: 'A Educação Física na formação integral do aluno',
    eixo: 'BNCC',
    apoio: [
      'Segundo a Base Nacional Comum Curricular (BNCC), a Educação Física possibilita aos alunos experiências relacionadas às práticas corporais, promovendo aspectos sociais, estéticos, emotivos e lúdicos, além de integrar a área das Linguagens ao lado de disciplinas como Língua Portuguesa, Língua Inglesa e Artes.',
    ],
    fonteApoio: 'Ministério da Educação (MEC). Base Nacional Comum Curricular (BNCC), conforme a prova.',
    comando:
      'Construa um texto dissertativo-argumentativo em que seja defendido seu ponto de vista sobre o questionamento: De acordo com a Base Nacional Comum Curricular (BNCC), qual é a importância da Educação Física na Formação Integral do aluno e como ela se relaciona com a área das Linguagens?',
    prova: 'Prefeitura de Toledo/PR · Professor de Educação Física · 2025',
  }),
  fau({
    id: 'fau-imbituva-2023-negacionismo',
    titulo: 'A sombra do negacionismo',
    eixo: 'Interesse geral',
    apoio: [
      '“Movimentos antivacina existem desde que elas foram inventadas no século XVIII. E se hoje os imunizantes estão ultrapassando as fronteiras da tecnologia, o discurso antivacina segue à sombra destes avanços, utilizando multimídias e as redes sociais para espalhar desinformação, medo e rejeição aos tratamentos”.',
    ],
    fonteApoio:
      'Texto da prova. No caderno, o comando falava em "texto narrativo", mas os critérios de correção pediam texto dissertativo-argumentativo; aqui você treina no formato dissertativo-argumentativo, que é o do edital de Palmital.',
    comando:
      'Considere o texto acima e redija um texto dissertativo-argumentativo sobre o tema “A sombra do negacionismo”, discutindo o negacionismo das vacinas e da ciência.',
    prova: 'Prefeitura de Imbituva/PR · Professor de Educação Infantil · 2023',
  }),
  fau({
    id: 'fau-cruzeiro-2023-nomofobia',
    titulo: 'Um problema real: Nomofobia',
    eixo: 'Interesse geral',
    apoio: [
      'Um estudo publicado pela City University de Hong Kong no periódico Cyberpsychology, Behavior and Social Networking entrevistou 301 estudantes universitários entre 18 e 37 anos na Coreia do Sul e concluiu que eles enxergam smartphones, tablets e notebooks como parte de sua identidade, uma extensão de seus corpos. Quando incapacitados de se comunicarem utilizando tais aparelhos, os entrevistados acabaram manifestando desconforto, angústia e ansiedade – alguns dos sintomas da nomofobia. Esses sinais também são cada vez mais comuns entre os brasileiros, que, segundo dados de uma pesquisa feita pela Millward Brown Brasil em parceria com a NetQuest, passam em média 3h14 por dia conectados ao smartphone. Entre os jovens da geração millennial, o tempo médio apegado ao gadget é ainda maior: 4h diariamente. Apesar de o tempo excessivo que o indivíduo gasta usando o aparelho despertar curiosidade, são os prejuízos que esse uso ocasiona na vida que realmente preocupam.',
    ],
    fonteApoio: 'Canaltech, citado na prova (acesso em 23/03/2023).',
    comando:
      'A partir da temática enfocada, escreva um texto dissertativo-argumentativo que aborde o problema da nomofobia, levando em consideração que a tecnologia pode contribuir positivamente, desde que seja usada de maneira certa.',
    prova: 'Prefeitura de Cruzeiro do Iguaçu/PR · Professor · 2023',
  }),

  /* ------------------------------------------------- temas nossos (estilo FAU 2026) */
  nosso({
    id: 'fuse-alfabetizar-letrando',
    titulo: 'Alfabetizar letrando: o desafio dos anos iniciais',
    eixo: 'Alfabetização e letramento',
    apoio: [
      'Alfabetizar é ensinar o sistema de escrita: a relação entre letras e sons, a leitura e a escrita de palavras e frases. Letrar é levar a criança a usar a leitura e a escrita nas práticas sociais, como ler um bilhete, uma receita ou uma notícia. Para a pesquisadora Magda Soares, são processos diferentes, mas inseparáveis, e o ideal é alfabetizar letrando.',
      'Na prática, muitas escolas ainda alternam entre extremos: o treino mecânico de sílabas, sem sentido para a criança, ou o contato com textos sem o ensino sistemático do sistema de escrita.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Alfabetizar letrando: o desafio dos anos iniciais”, abordando a diferença entre alfabetização e letramento, os riscos de separar os dois processos e o papel do professor na articulação entre eles.',
  }),
  nosso({
    id: 'fuse-bncc-sala-de-aula',
    titulo: 'Da BNCC à sala de aula: o currículo que garante aprendizagens',
    eixo: 'BNCC e Referencial Curricular do Paraná',
    apoio: [
      'A Base Nacional Comum Curricular define as aprendizagens essenciais que todos os estudantes da educação básica têm o direito de desenvolver. No Paraná, o Referencial Curricular, de 2018, traz esses princípios e objetivos para a realidade do estado, preservando a autonomia das redes e das escolas.',
      'Entre o documento e a sala de aula, porém, há um caminho: o planejamento do professor, a proposta pedagógica da escola e as condições reais de cada turma.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Da BNCC à sala de aula: o currículo que garante aprendizagens”, abordando a função de um currículo comum, a importância de adaptá-lo à realidade local e o papel do planejamento docente.',
  }),
  nosso({
    id: 'fuse-ppp-gestao-democratica',
    titulo: 'O Projeto Político-Pedagógico como instrumento de gestão democrática',
    eixo: 'Gestão educacional e PPP',
    apoio: [
      'A Lei de Diretrizes e Bases da Educação (Lei nº 9.394/1996) estabelece a gestão democrática do ensino público, com a participação dos profissionais da educação na elaboração do projeto pedagógico da escola e a participação das comunidades escolar e local em conselhos escolares ou equivalentes.',
      'Ainda assim, em muitas escolas o Projeto Político-Pedagógico é visto como um documento burocrático, escrito para cumprir exigências e pouco consultado no dia a dia.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “O Projeto Político-Pedagógico como instrumento de gestão democrática”, abordando a participação da comunidade escolar, a relação entre o projeto e a realidade da escola e, ao final, proponha uma intervenção viável.',
  }),
  nosso({
    id: 'fuse-eca-digital',
    titulo: 'A escola e a proteção de crianças e adolescentes no ambiente digital',
    eixo: 'ECA e ECA Digital',
    apoio: [
      'Em vigor desde março de 2026, o Estatuto Digital da Criança e do Adolescente (Lei nº 15.211/2025), conhecido como ECA Digital, obriga plataformas como redes sociais, jogos e serviços de vídeo a proteger crianças e adolescentes de conteúdos nocivos, a verificar a idade dos usuários e a oferecer ferramentas de supervisão parental.',
      'A lei mira as empresas, mas a vida digital dos estudantes atravessa os muros da escola: cyberbullying, exposição indevida, desinformação e o uso excessivo de telas aparecem todos os dias na sala de aula.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “A escola e a proteção de crianças e adolescentes no ambiente digital”, abordando os riscos do ambiente digital para os estudantes, o papel da escola na educação digital e a parceria com as famílias.',
  }),
  nosso({
    id: 'fuse-equidade-pne',
    titulo: 'Equidade na educação: reduzir as desigualdades de aprendizagem',
    eixo: 'Plano Nacional de Educação',
    apoio: [
      'O novo Plano Nacional de Educação (Lei nº 15.388/2026), que vale de 2026 a 2036, tem a equidade como princípio que atravessa todos os objetivos. Pela primeira vez, as diferenças de aprendizagem entre grupos definidos por raça/cor, sexo, nível socioeconômico, região e localização fazem parte das próprias metas do plano.',
      'Garantir que todos estejam na escola é diferente de garantir que todos aprendam: estudantes em situação de vulnerabilidade costumam chegar com menos apoio e sair com menos aprendizagem.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Equidade na educação: reduzir as desigualdades de aprendizagem”, abordando a diferença entre igualdade e equidade, as causas das desigualdades na escola e ações possíveis do professor e da gestão escolar.',
  }),
  nosso({
    id: 'fuse-tempo-integral',
    titulo: 'Educação em tempo integral: mais tempo com mais sentido',
    eixo: 'Plano Nacional de Educação',
    apoio: [
      'Segundo o Ministério da Educação, o novo PNE prevê que metade das escolas públicas funcione em tempo integral e que 35% das matrículas estejam nessa modalidade até o quinto ano de vigência do plano.',
      'Ampliar a jornada, porém, não garante sozinho uma educação integral: sem proposta pedagógica, espaço adequado e profissionais preparados, o tempo a mais pode virar apenas repetição do turno regular.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Educação em tempo integral: mais tempo com mais sentido”, abordando a diferença entre tempo integral e formação integral, os desafios de implantação e o que torna esse tempo significativo para o estudante.',
  }),
  nosso({
    id: 'fuse-avaliacao-formativa',
    titulo: 'Avaliação da aprendizagem: classificar ou acompanhar?',
    eixo: 'Didática e planejamento',
    apoio: [
      'A avaliação escolar já foi vista principalmente como instrumento de classificação: a nota separa quem passa de quem reprova. As diretrizes curriculares nacionais, no entanto, tratam a avaliação como processo contínuo, com finalidades diagnósticas e formativas, que mostra tanto o progresso dos estudantes quanto as falhas das próprias estratégias de ensino.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Avaliação da aprendizagem: classificar ou acompanhar?”, abordando os limites da avaliação apenas classificatória, as características da avaliação formativa e o uso dos resultados no replanejamento do ensino.',
  }),
  nosso({
    id: 'fuse-inclusao',
    titulo: 'Inclusão escolar: do direito à matrícula ao direito de aprender',
    eixo: 'Escola e cidadania',
    apoio: [
      'A Lei Brasileira de Inclusão (Lei nº 13.146/2015) assegura à pessoa com deficiência um sistema educacional inclusivo em todos os níveis. O número de estudantes com deficiência matriculados em classes comuns cresceu nas últimas décadas.',
      'Estar matriculado, contudo, não é o mesmo que participar e aprender: barreiras de acessibilidade, falta de apoio especializado e práticas pedagógicas pouco flexíveis ainda limitam a inclusão de fato.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Inclusão escolar: do direito à matrícula ao direito de aprender”, abordando as barreiras que ainda existem, o papel do professor da sala comum e, ao final, proponha uma intervenção viável.',
  }),
  nosso({
    id: 'fuse-familia-escola',
    titulo: 'A parceria entre família e escola',
    eixo: 'ECA e gestão democrática',
    apoio: [
      'O Estatuto da Criança e do Adolescente (Lei nº 8.069/1990) estabelece que é direito dos pais ou responsáveis ter ciência do processo pedagógico, bem como participar da definição das propostas educacionais.',
      'Na rotina, porém, a relação entre família e escola muitas vezes se resume a reuniões de entrega de notas e a chamados quando há problemas de comportamento.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “A parceria entre família e escola no desenvolvimento do estudante”, abordando a importância dessa parceria, os obstáculos que a dificultam e caminhos para fortalecê-la.',
  }),
  nosso({
    id: 'fuse-afetividade',
    titulo: 'Afetividade e aprendizagem: o vínculo entre professor e aluno',
    eixo: 'Psicologia da educação',
    apoio: [
      'Para o psicólogo francês Henri Wallon, a afetividade é parte do desenvolvimento humano, ao lado da cognição e do movimento. Na escola, isso significa que a forma como o estudante se sente na sala de aula interfere no modo como ele aprende.',
      'Valorizar a afetividade, porém, não significa abrir mão de limites, de exigência ou do conteúdo.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Afetividade e aprendizagem: o vínculo entre professor e aluno”, abordando a relação entre emoção e aprendizagem, o equilíbrio entre acolhimento e exigência e o papel do professor na construção desse vínculo.',
  }),
  nosso({
    id: 'fuse-mediacao',
    titulo: 'O professor como mediador da aprendizagem',
    eixo: 'Psicologia da educação',
    apoio: [
      'Para Lev Vygotsky, a aprendizagem acontece nas interações sociais e é mediada. A zona de desenvolvimento proximal é a distância entre o que a criança consegue fazer sozinha e o que consegue fazer com a ajuda de alguém mais experiente.',
      'Ser mediador não é dar a resposta pronta nem deixar o aluno sozinho com a tarefa: é propor desafios que ele ainda não resolve sozinho, mas que consegue resolver com apoio.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “O professor como mediador da aprendizagem”, abordando o conceito de mediação, a importância das interações entre os estudantes e exemplos de práticas mediadoras em sala de aula.',
  }),
  nosso({
    id: 'fuse-brincar',
    titulo: 'O brincar como eixo da aprendizagem na Educação Infantil',
    eixo: 'BNCC e Educação Infantil',
    apoio: [
      'Na Base Nacional Comum Curricular, as interações e a brincadeira são os eixos estruturantes das práticas pedagógicas da Educação Infantil. Brincar também é um dos seis direitos de aprendizagem e desenvolvimento, ao lado de conviver, participar, explorar, expressar e conhecer-se.',
      'Mesmo assim, há pressões para antecipar conteúdos do Ensino Fundamental e tratar a brincadeira como recreio, e não como tempo de aprender.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “O brincar como eixo da aprendizagem na Educação Infantil”, abordando o que a BNCC diz sobre o brincar, os riscos da escolarização precoce e o papel do professor na organização das brincadeiras.',
  }),
  nosso({
    id: 'fuse-inteligencia-artificial',
    titulo: 'Inteligência artificial na escola: aliada ou ameaça?',
    eixo: 'Escola e cidadania',
    apoio: [
      'Ferramentas de inteligência artificial capazes de escrever textos, resolver exercícios e responder perguntas em segundos chegaram às mãos dos estudantes. Elas podem personalizar o estudo e apoiar o professor, mas também facilitar a cópia, espalhar informações erradas e expor dados pessoais.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Inteligência artificial na escola: aliada ou ameaça à aprendizagem?”, abordando as oportunidades, os riscos éticos e pedagógicos e, ao final, proponha uma intervenção viável para o uso responsável dessas ferramentas.',
  }),
  nosso({
    id: 'fuse-formacao-leitores',
    titulo: 'Formação de leitores em tempos de telas',
    eixo: 'Alfabetização e letramento',
    apoio: [
      'Crianças e adolescentes passam cada vez mais tempo diante de telas, consumindo vídeos curtos e mensagens rápidas. Ao mesmo tempo, a leitura de textos mais longos, que exige atenção e interpretação, perde espaço no dia a dia de muitos estudantes.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Formação de leitores em tempos de telas: o papel da escola”, abordando a importância da leitura para a aprendizagem, os obstáculos atuais e estratégias da escola para formar leitores.',
  }),
  nosso({
    id: 'fuse-permanencia',
    titulo: 'Permanência escolar: por que a matrícula não basta',
    eixo: 'LDB e Plano Nacional de Educação',
    apoio: [
      'Desde a Lei nº 12.796/2013, que alterou a LDB, a educação básica é obrigatória e gratuita dos 4 aos 17 anos. O acesso à escola cresceu, mas o abandono e a reprovação ainda interrompem a trajetória de muitos estudantes, sobretudo nos anos finais e no Ensino Médio.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Permanência escolar: por que a matrícula não basta”, abordando as causas do abandono, o papel da escola em identificar os estudantes em risco e ações de busca ativa e acolhimento.',
  }),
  nosso({
    id: 'fuse-valorizacao-docente',
    titulo: 'Valorização dos profissionais da educação e qualidade do ensino',
    eixo: 'Plano Nacional de Educação',
    apoio: [
      'Os planos nacionais de educação trazem a valorização dos profissionais da educação entre as suas diretrizes. Remuneração, condições de trabalho, formação continuada e carreira aparecem como condições para a qualidade do ensino.',
      'Na rotina das escolas, porém, muitos professores relatam salas lotadas, pouco tempo para planejar e falta de formação ligada à prática.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Valorização dos profissionais da educação e qualidade do ensino”, abordando a relação entre condições de trabalho e aprendizagem, a importância da formação continuada e o papel do poder público.',
  }),
  nosso({
    id: 'fuse-saude-mental',
    titulo: 'Saúde mental de crianças e adolescentes: um desafio também da escola',
    eixo: 'Interesse geral',
    apoio: [
      'Ansiedade, isolamento, autolesão e sofrimento emocional entre crianças e adolescentes passaram a fazer parte das preocupações de famílias e escolas. A escola não substitui o atendimento de saúde, mas é muitas vezes o primeiro lugar onde os sinais aparecem.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Saúde mental de crianças e adolescentes: um desafio também da escola”, abordando os fatores que afetam o bem-estar dos estudantes, os limites e as possibilidades da atuação da escola e, ao final, proponha uma intervenção viável.',
  }),
  nosso({
    id: 'fuse-desinformacao',
    titulo: 'Desinformação e o papel da educação',
    eixo: 'Interesse geral',
    apoio: [
      'Notícias falsas, montagens e informações sem fonte circulam em grande velocidade pelas redes sociais e por aplicativos de mensagens. Elas afetam decisões sobre saúde, política e convivência, e atingem pessoas de todas as idades.',
    ],
    fonteApoio: null,
    comando:
      'Considerando essa realidade, redija um texto dissertativo-argumentativo sobre o tema “Desinformação e o papel da educação”, abordando os impactos da desinformação na sociedade, a importância do pensamento crítico e o papel da escola na formação de leitores críticos das informações.',
  }),
];

export const temaRedacao = (id: string): TemaRedacao | undefined => TEMAS_REDACAO.find((t) => t.id === id);
