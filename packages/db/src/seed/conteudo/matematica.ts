import type { UnidadeSeed } from './tipos.js';

/** Unidade de Matemática e Raciocínio Lógico (comum), com poucas questões autorais. */
export const unidadeMatematica: UnidadeSeed = {
  chave: 'unidade:matematica-basica',
  titulo: 'Matemática básica e raciocínio lógico',
  disciplina: 'matematica',
  area: null,
  ordem: 2,
  secoes: [
    {
      chave: 'secao:porcentagem',
      titulo: 'Porcentagem',
      assunto: {
        slug: 'porcentagem',
        nome: 'Porcentagem',
        dicaTitulo: 'Porcentagem é fração de 100',
        dicaTexto:
          'x% = x/100. Para achar x% de um valor, multiplique o valor por x e divida por 100. Desconto de 15% = pagar 85%; aumento de 10% = multiplicar por 1,10.',
        dicaExemplo: '20% de 150 = 150 × 0,20 = 30',
      },
      questoes: [
        {
          chave: 'q:porcentagem:01',
          enunciado: 'Quanto é 20% de 350?',
          alternativas: ['35', '70', '7', '175', '50'],
          gabarito: 'B',
          explicacao: '20% = 0,20. Então 350 × 0,20 = 70.',
          dicaBolso: '10% é só tirar um zero; 20% é o dobro disso.',
          dica: 'Comece achando 10% de 350.',
          dificuldade: 1,
        },
        {
          chave: 'q:porcentagem:02',
          enunciado: 'Um produto custa R$ 80,00 e tem desconto de 15%. O preço com desconto é:',
          alternativas: ['R$ 65,00', 'R$ 68,00', 'R$ 72,00', 'R$ 12,00', 'R$ 70,00'],
          gabarito: 'B',
          explicacao: '15% de 80 = 12. Preço final = 80 − 12 = 68. Ou direto: 80 × 0,85 = 68.',
          dicaBolso: 'Desconto de 15%: pague 85% (× 0,85).',
          dica: 'Calcule 15% de 80 e subtraia.',
          dificuldade: 1,
        },
        {
          chave: 'q:porcentagem:03',
          enunciado: 'Um salário de R$ 2.000,00 recebeu aumento de 10%. O novo salário é:',
          alternativas: ['R$ 2.010,00', 'R$ 2.100,00', 'R$ 2.200,00', 'R$ 2.020,00', 'R$ 2.400,00'],
          gabarito: 'C',
          explicacao: '10% de 2.000 = 200. Novo salário = 2.000 + 200 = 2.200.',
          dicaBolso: 'Aumento de 10%: multiplique por 1,10.',
          dica: 'Quanto é 10% de 2.000?',
          dificuldade: 1,
        },
        {
          chave: 'q:porcentagem:04',
          enunciado: 'Numa turma de 40 alunos, 12 são homens. A porcentagem de homens na turma é:',
          alternativas: ['12%', '28%', '30%', '40%', '33%'],
          gabarito: 'C',
          explicacao: '12 ÷ 40 = 0,30 = 30%.',
          dicaBolso: 'Parte ÷ todo × 100 = porcentagem.',
          dica: 'Divida a parte pelo total.',
          dificuldade: 1,
        },
        {
          chave: 'q:porcentagem:05',
          enunciado:
            'Um preço sobe 10% e, depois, sobe mais 10%. O aumento total sobre o preço inicial foi de:',
          alternativas: ['20%', '21%', '11%', '19%', '22%'],
          gabarito: 'B',
          explicacao:
            'Aumentos sucessivos se multiplicam: 1,10 × 1,10 = 1,21, ou seja, 21% sobre o preço inicial. O segundo aumento incide sobre o valor já aumentado.',
          dicaBolso: 'Aumentos seguidos: multiplique os fatores, não some as taxas.',
          dica: 'Teste com um preço de R$ 100,00.',
          dificuldade: 2,
        },
      ],
    },
    {
      chave: 'secao:regra-de-tres',
      titulo: 'Regra de três',
      assunto: {
        slug: 'regra-de-tres',
        nome: 'Regra de três simples',
        dicaTitulo: 'Direta ou inversa?',
        dicaTexto:
          'Se as grandezas crescem juntas, são diretamente proporcionais: multiplique em cruz. Se uma cresce e a outra diminui, são inversamente proporcionais: inverta uma das razões antes de multiplicar.',
        dicaExemplo: '3 kg custam R$ 12; 5 kg custam x → 3x = 5 × 12 → x = 20',
      },
      questoes: [
        {
          chave: 'q:regra3:01',
          enunciado: 'Se 4 canetas custam R$ 10,00, quanto custam 6 canetas iguais?',
          alternativas: ['R$ 12,00', 'R$ 14,00', 'R$ 15,00', 'R$ 16,00', 'R$ 24,00'],
          gabarito: 'C',
          explicacao: 'Cada caneta custa 10 ÷ 4 = R$ 2,50. Seis canetas: 6 × 2,50 = R$ 15,00.',
          dicaBolso: 'Ache o valor de 1 e multiplique.',
          dica: 'Quanto custa uma caneta?',
          dificuldade: 1,
        },
        {
          chave: 'q:regra3:02',
          enunciado:
            'Seis operários fazem um muro em 10 dias. Em quantos dias 12 operários, no mesmo ritmo, fazem o mesmo muro?',
          alternativas: ['20', '15', '10', '5', '3'],
          gabarito: 'D',
          explicacao:
            'Mais operários, menos dias: grandezas inversamente proporcionais. O dobro de operários faz em metade do tempo: 10 ÷ 2 = 5 dias.',
          dicaBolso: 'Mais gente trabalhando, menos tempo: inversa.',
          dica: 'Se dobra o número de operários, o que acontece com os dias?',
          dificuldade: 2,
        },
        {
          chave: 'q:regra3:03',
          enunciado:
            'Um carro percorre 180 km com 15 litros de combustível. Com 25 litros, ele percorre:',
          alternativas: ['250 km', '270 km', '300 km', '320 km', '360 km'],
          gabarito: 'C',
          explicacao: 'O carro faz 180 ÷ 15 = 12 km por litro. Com 25 litros: 25 × 12 = 300 km.',
          dicaBolso: 'Consumo = km ÷ litros.',
          dica: 'Quantos km o carro faz com 1 litro?',
          dificuldade: 1,
        },
        {
          chave: 'q:regra3:04',
          enunciado:
            'A 60 km/h, uma viagem leva 3 horas. Na mesma estrada, a 90 km/h, a viagem leva:',
          alternativas: ['4 h 30 min', '3 h 30 min', '2 h', '1 h 30 min', '2 h 30 min'],
          gabarito: 'C',
          explicacao:
            'A distância é 60 × 3 = 180 km. A 90 km/h: 180 ÷ 90 = 2 horas. Mais velocidade, menos tempo (inversa).',
          dicaBolso: 'Distância = velocidade × tempo.',
          dica: 'Descubra primeiro o tamanho da viagem.',
          dificuldade: 2,
        },
        {
          chave: 'q:regra3:05',
          enunciado:
            'Uma receita usa 2 xícaras de farinha para fazer 8 pães. Para fazer 20 pães, são necessárias:',
          alternativas: ['4 xícaras', '5 xícaras', '6 xícaras', '8 xícaras', '10 xícaras'],
          gabarito: 'B',
          explicacao:
            '2 xícaras para 8 pães = 1 xícara para 4 pães. Para 20 pães: 20 ÷ 4 = 5 xícaras.',
          dicaBolso: 'Simplifique a razão antes de calcular.',
          dica: 'Quantos pães saem com 1 xícara?',
          dificuldade: 1,
        },
      ],
    },
    {
      chave: 'secao:logica-proposicional',
      titulo: 'Raciocínio lógico',
      assunto: {
        slug: 'logica-proposicional',
        nome: 'Lógica proposicional',
        dicaTitulo: 'Negação e conectivos',
        dicaTexto:
          'Negação de "todo" é "algum não". Negação de "p e q" é "não p ou não q". "p e q" só é verdadeira se as duas forem verdadeiras; "p ou q" é verdadeira se pelo menos uma for. Em "se p, então q", se q é falsa, p também é.',
        dicaExemplo: 'Negação de "Ana estuda e trabalha": "Ana não estuda ou não trabalha".',
      },
      questoes: [
        {
          chave: 'q:logica:01',
          enunciado: 'A negação de "Todos os servidores chegaram cedo" é:',
          alternativas: [
            'Nenhum servidor chegou cedo.',
            'Todos os servidores chegaram tarde.',
            'Algum servidor não chegou cedo.',
            'Algum servidor chegou cedo.',
            'Nenhum servidor chegou tarde.',
          ],
          gabarito: 'C',
          explicacao:
            'Para negar "todos chegaram cedo" basta um que não tenha chegado: "algum servidor não chegou cedo". "Nenhum chegou cedo" é forte demais.',
          dicaBolso: 'Negação de "todo": "algum não".',
          dica: 'O que basta para mostrar que a frase é falsa?',
          dificuldade: 2,
        },
        {
          chave: 'q:logica:02',
          enunciado: 'A negação de "Pedro estuda e trabalha" é:',
          alternativas: [
            'Pedro não estuda e não trabalha.',
            'Pedro não estuda ou não trabalha.',
            'Pedro estuda ou trabalha.',
            'Pedro estuda e não trabalha.',
            'Pedro não estuda, então trabalha.',
          ],
          gabarito: 'B',
          explicacao:
            'Negação de "p e q" é "não p ou não q" (lei de De Morgan): basta Pedro deixar de fazer uma das duas coisas.',
          dicaBolso: 'Negou o "e"? Vira "ou" e nega as duas partes.',
          dica: 'Troque o conectivo e negue cada parte.',
          dificuldade: 2,
        },
        {
          chave: 'q:logica:03',
          enunciado:
            'Se a proposição p é verdadeira e a proposição q é falsa, qual das proposições abaixo é verdadeira?',
          alternativas: ['p e q', 'p ou q', 'se p, então q', 'não p', 'p se, e somente se, q'],
          gabarito: 'B',
          explicacao:
            '"p ou q" é verdadeira quando ao menos uma é verdadeira: p é. "p e q" é falsa (q é falsa); "se p, então q" é falsa (V → F); "não p" é falsa; "p se e somente se q" é falsa (valores diferentes).',
          dicaBolso: '"Ou" precisa de uma verdade; "e" precisa de duas.',
          dica: 'Qual conectivo aceita uma parte falsa?',
          dificuldade: 2,
        },
        {
          chave: 'q:logica:04',
          enunciado: 'Qual é o próximo número da sequência 2, 5, 8, 11, ...?',
          alternativas: ['12', '13', '14', '15', '16'],
          gabarito: 'C',
          explicacao: 'A sequência aumenta de 3 em 3: 11 + 3 = 14.',
          dicaBolso: 'Sequência: olhe a diferença entre os termos.',
          dica: 'Quanto aumenta de um número para o seguinte?',
          dificuldade: 1,
        },
        {
          chave: 'q:logica:05',
          enunciado: '"Se chove, a rua fica molhada." Sabe-se que a rua não está molhada. Logo:',
          alternativas: [
            'choveu.',
            'não choveu.',
            'pode ter chovido.',
            'choveu e a rua secou.',
            'nada se pode concluir.',
          ],
          gabarito: 'B',
          explicacao:
            'Em "se p, então q", se q é falsa, p também é falsa. A rua não está molhada, então não choveu.',
          dicaBolso: 'Negou o "então"? Negue o "se".',
          dica: 'Se tivesse chovido, como estaria a rua?',
          dificuldade: 2,
        },
      ],
    },
  ],
};
