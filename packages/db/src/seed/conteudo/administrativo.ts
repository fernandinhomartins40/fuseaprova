import type { UnidadeSeed } from './tipos.js';

/** Unidade completa de específico da área administrativa. Questões autorais, estilo FAU. */
export const unidadeAdministrativo: UnidadeSeed = {
  chave: 'unidade:administrativo-essencial',
  titulo: 'Administração pública e rotina de escritório',
  disciplina: 'especificos',
  area: 'administrativo',
  ordem: 1,
  secoes: [
    {
      chave: 'secao:principios-administracao',
      titulo: 'Princípios da Administração Pública',
      assunto: {
        slug: 'principios-administracao-publica',
        nome: 'Princípios da Administração Pública',
        dicaTitulo: 'LIMPE',
        dicaTexto:
          'O art. 37 da Constituição Federal lista os princípios expressos da Administração Pública: Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência. Eles valem para a União, os Estados, o Distrito Federal e os Municípios, em todos os Poderes, inclusive na Prefeitura e na Câmara.',
        dicaExemplo:
          'Publicar o resultado de uma licitação no diário oficial atende ao princípio da publicidade.',
      },
      questoes: [
        {
          chave: 'q:principios:01',
          enunciado:
            'Segundo o art. 37 da Constituição Federal, são princípios expressos da Administração Pública:',
          alternativas: [
            'legalidade, impessoalidade, moralidade, publicidade e eficiência.',
            'legalidade, pessoalidade, moralidade, sigilo e eficiência.',
            'legitimidade, imparcialidade, moralidade, publicidade e economia.',
            'legalidade, impessoalidade, modicidade, publicidade e eficácia.',
            'liberdade, igualdade, moralidade, publicidade e eficiência.',
          ],
          gabarito: 'A',
          explicacao:
            'O caput do art. 37 traz cinco princípios expressos, lembrados pela sigla LIMPE: Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência.',
          dicaBolso: 'LIMPE: Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência.',
          dica: 'Pense na sigla de cinco letras.',
          dificuldade: 1,
        },
        {
          chave: 'q:principios:02',
          enunciado: 'Para o administrador público, o princípio da legalidade significa que ele:',
          alternativas: [
            'pode fazer tudo o que a lei não proíbe.',
            'só pode fazer o que a lei permite ou determina.',
            'pode deixar de cumprir a lei quando for mais eficiente.',
            'deve seguir apenas as ordens do chefe imediato.',
            'pode criar obrigações aos cidadãos por simples decreto.',
          ],
          gabarito: 'B',
          explicacao:
            'O particular pode fazer tudo o que a lei não proíbe; a Administração só pode agir quando a lei permite ou determina. Essa é a legalidade administrativa.',
          dicaBolso:
            'Particular: o que não é proibido. Administração: só o que a lei manda ou permite.',
          dica: 'A regra para o cidadão comum é diferente da regra para o gestor público.',
          dificuldade: 1,
        },
        {
          chave: 'q:principios:03',
          enunciado:
            'Um servidor dá prioridade no atendimento a um parente, passando-o na frente da fila sem motivo legal. Qual princípio foi violado de forma mais direta?',
          alternativas: [
            'Publicidade.',
            'Eficiência.',
            'Impessoalidade.',
            'Legalidade tributária.',
            'Continuidade.',
          ],
          gabarito: 'C',
          explicacao:
            'A impessoalidade exige tratamento igual a todos, sem favorecimentos ou perseguições. Privilegiar um parente quebra essa regra.',
          dicaBolso: 'Favoreceu ou perseguiu alguém? Impessoalidade.',
          dica: 'Qual princípio proíbe tratar as pessoas de forma diferente sem motivo?',
          dificuldade: 1,
        },
        {
          chave: 'q:principios:04',
          enunciado:
            'A divulgação oficial dos atos administrativos, para que a sociedade os conheça e para que produzam efeitos, relaciona-se ao princípio da:',
          alternativas: [
            'moralidade.',
            'publicidade.',
            'eficiência.',
            'impessoalidade.',
            'legalidade.',
          ],
          gabarito: 'B',
          explicacao:
            'A publicidade garante a transparência: os atos devem ser divulgados oficialmente, o que também permite o controle pelos cidadãos.',
          dicaBolso: 'Publicar e dar transparência = publicidade.',
          dica: 'O nome do princípio está quase no enunciado.',
          dificuldade: 1,
        },
        {
          chave: 'q:principios:05',
          enunciado:
            'O princípio da eficiência foi incluído no art. 37 da Constituição Federal pela:',
          alternativas: [
            'Emenda Constitucional nº 19/1998.',
            'Emenda Constitucional nº 45/2004.',
            'redação original da Constituição de 1988.',
            'Lei nº 8.112/1990.',
            'Lei nº 14.133/2021.',
          ],
          gabarito: 'A',
          explicacao:
            'A eficiência não estava no texto original de 1988. Ela foi acrescentada pela Emenda Constitucional nº 19, de 1998, conhecida como Reforma Administrativa.',
          dicaBolso: 'Eficiência chegou com a EC 19/1998 (Reforma Administrativa).',
          dica: 'Foi uma emenda da década de 1990.',
          dificuldade: 2,
        },
        {
          chave: 'q:principios:06',
          enunciado:
            'Uma placa de obra pública traz a foto e o nome do prefeito em destaque, apresentando a obra como realização pessoal dele. Segundo a Constituição, essa publicidade é:',
          alternativas: [
            'permitida, se paga com recursos próprios do Município.',
            'proibida, pois caracteriza promoção pessoal de autoridade.',
            'obrigatória em ano eleitoral.',
            'permitida, desde que aprovada pela Câmara Municipal.',
            'permitida, porque atende ao princípio da publicidade.',
          ],
          gabarito: 'B',
          explicacao:
            'O art. 37, § 1º, determina que a publicidade oficial tenha caráter educativo, informativo ou de orientação social, sem nomes, símbolos ou imagens que caracterizem promoção pessoal de autoridades ou servidores.',
          dicaBolso: 'Publicidade oficial informa; não faz propaganda de pessoa.',
          dica: 'O § 1º do art. 37 trata justamente disso.',
          dificuldade: 2,
        },
        {
          chave: 'q:principios:07',
          enunciado: 'O princípio da moralidade exige do agente público:',
          alternativas: [
            'apenas o cumprimento literal da lei.',
            'conduta ética, honesta e de boa-fé.',
            'sigilo sobre todos os seus atos.',
            'rapidez acima de qualquer outro valor.',
            'obediência a uma religião oficial.',
          ],
          gabarito: 'B',
          explicacao:
            'Moralidade vai além de cumprir a letra da lei: exige honestidade, lealdade e boa-fé na atuação administrativa.',
          dicaBolso: 'Nem tudo que é legal é moral: moralidade = ética e boa-fé.',
          dica: 'Pense em honestidade.',
          dificuldade: 1,
        },
        {
          chave: 'q:principios:08',
          enunciado: 'Os princípios do caput do art. 37 da Constituição Federal aplicam-se:',
          alternativas: [
            'somente à União.',
            'somente ao Poder Executivo.',
            'à administração direta e indireta de qualquer dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios.',
            'somente às empresas privadas que prestam serviços.',
            'somente aos servidores ocupantes de cargo efetivo.',
          ],
          gabarito: 'C',
          explicacao:
            'O próprio caput do art. 37 diz que os princípios valem para a administração direta e indireta de qualquer dos Poderes de todos os entes da Federação, inclusive os Municípios.',
          dicaBolso: 'Art. 37 vale para todos: União, Estados, DF e Municípios.',
          dica: 'A Prefeitura e a Câmara de um município estão incluídas?',
          dificuldade: 1,
        },
        {
          chave: 'q:principios:09',
          enunciado:
            'Segundo a Constituição Federal, a investidura em cargo público efetivo depende de:',
          alternativas: [
            'indicação do chefe do Poder Executivo.',
            'aprovação prévia em concurso público de provas ou de provas e títulos.',
            'entrevista com a chefia do setor.',
            'sorteio público entre os inscritos.',
            'eleição pelos demais servidores.',
          ],
          gabarito: 'B',
          explicacao:
            'O art. 37, II, exige concurso público de provas ou de provas e títulos para cargo ou emprego público, ressalvados os cargos em comissão de livre nomeação e exoneração.',
          dicaBolso: 'Cargo efetivo = concurso público. Sem exceção.',
          dica: 'É exatamente o que você está estudando para fazer.',
          dificuldade: 1,
        },
        {
          chave: 'q:principios:10',
          enunciado:
            'De acordo com a Constituição Federal, o prazo de validade do concurso público é de:',
          alternativas: [
            'até um ano, improrrogável.',
            'até dois anos, prorrogável uma vez, por igual período.',
            'cinco anos, sem prorrogação.',
            'até dois anos, prorrogável quantas vezes for preciso.',
            'quatro anos, prorrogável por mais um.',
          ],
          gabarito: 'B',
          explicacao:
            'O art. 37, III, fixa a validade do concurso em até dois anos, prorrogável uma vez, por igual período.',
          dicaBolso: 'Até 2 + 2 (uma prorrogação, igual período).',
          dica: 'A prorrogação acontece uma única vez.',
          dificuldade: 1,
        },
      ],
    },
    {
      chave: 'secao:redacao-oficial',
      titulo: 'Redação oficial',
      assunto: {
        slug: 'redacao-oficial',
        nome: 'Redação oficial',
        dicaTitulo: 'Clara, concisa e impessoal',
        dicaTexto:
          'A redação oficial segue o Manual de Redação da Presidência da República (3ª edição, 2018): texto claro, conciso, impessoal, formal e na norma-padrão. Os pronomes de tratamento levam o verbo para a 3ª pessoa. O fecho é "Respeitosamente" para autoridade superior e "Atenciosamente" para a mesma hierarquia ou inferior.',
        dicaExemplo: 'Vossa Excelência conhece o projeto. (3ª pessoa) … Respeitosamente,',
      },
      questoes: [
        {
          chave: 'q:redacao:01',
          enunciado:
            'São atributos da redação oficial, segundo o Manual de Redação da Presidência da República:',
          alternativas: [
            'clareza, concisão, impessoalidade e formalidade.',
            'linguagem rebuscada e uso de gírias.',
            'opinião pessoal e humor.',
            'abreviações informais e emojis.',
            'textos longos e repetitivos.',
          ],
          gabarito: 'A',
          explicacao:
            'O Manual pede clareza e precisão, objetividade, concisão, coesão e coerência, impessoalidade, formalidade e padronização, e o uso da norma-padrão.',
          dicaBolso: 'Redação oficial: clara, curta, impessoal e formal.',
          dica: 'Pense em como um órgão público deveria escrever.',
          dificuldade: 1,
        },
        {
          chave: 'q:redacao:02',
          enunciado:
            'Num ofício dirigido a uma autoridade de hierarquia superior, o fecho adequado é:',
          alternativas: [
            'Atenciosamente,',
            'Respeitosamente,',
            'Abraços,',
            'Cordialmente,',
            'Sem mais,',
          ],
          gabarito: 'B',
          explicacao:
            'O Manual prevê dois fechos: "Respeitosamente" para autoridades de hierarquia superior e "Atenciosamente" para a mesma hierarquia ou inferior.',
          dicaBolso: 'Para cima: Respeitosamente. Para o lado ou para baixo: Atenciosamente.',
          dica: 'Respeito a quem está acima.',
          dificuldade: 1,
        },
        {
          chave: 'q:redacao:03',
          enunciado:
            'Para autoridades da mesma hierarquia ou de hierarquia inferior, o Manual de Redação da Presidência indica o fecho:',
          alternativas: [
            'Respeitosamente,',
            'Atenciosamente,',
            'Saudações cordiais,',
            'Beijos,',
            'Grato,',
          ],
          gabarito: 'B',
          explicacao: '"Atenciosamente" é o fecho para a mesma hierarquia ou hierarquia inferior.',
          dicaBolso: 'Só existem dois fechos: Respeitosamente e Atenciosamente.',
          dica: 'É o par do "Respeitosamente".',
          dificuldade: 1,
        },
        {
          chave: 'q:redacao:04',
          enunciado:
            'Com os pronomes de tratamento, como "Vossa Excelência", o verbo e os pronomes que se referem a eles concordam com:',
          alternativas: [
            'a 2ª pessoa do plural (vós).',
            'a 3ª pessoa.',
            'a 1ª pessoa.',
            'o gênero masculino, sempre.',
            'o plural, sempre.',
          ],
          gabarito: 'B',
          explicacao:
            'Apesar do "Vossa", a concordância é feita na 3ª pessoa: "Vossa Excelência conhece o seu projeto", e não "conheceis o vosso".',
          dicaBolso: 'Vossa Excelência "sabe", nunca "sabeis".',
          dica: 'Pense em "você": a concordância é parecida.',
          dificuldade: 2,
        },
        {
          chave: 'q:redacao:05',
          enunciado: 'Usa-se "Sua Excelência" (e não "Vossa Excelência") quando:',
          alternativas: [
            'se fala diretamente com a autoridade.',
            'se faz referência à autoridade, falando sobre ela.',
            'a autoridade é municipal.',
            'o texto é enviado por e-mail.',
            'o documento é um requerimento.',
          ],
          gabarito: 'B',
          explicacao:
            '"Vossa" é usado para falar com a pessoa; "Sua" é usado para falar sobre ela. Ex.: "Sua Excelência, o Governador, visitou a obra."',
          dicaBolso: 'Vossa: falo com você. Sua: falo dele.',
          dica: 'Com quem se fala x de quem se fala.',
          dificuldade: 2,
        },
        {
          chave: 'q:redacao:06',
          enunciado:
            'Segundo o Manual de Redação da Presidência da República, o tratamento "Digníssimo" (DD.):',
          alternativas: [
            'é obrigatório para prefeitos.',
            'não deve ser usado nas comunicações oficiais.',
            'é usado apenas para juízes.',
            'substitui o vocativo.',
            'deve ser usado no fecho.',
          ],
          gabarito: 'B',
          explicacao:
            'O Manual aboliu o uso de "Digníssimo": a dignidade é pressuposto de qualquer cargo público e não precisa ser mencionada.',
          dicaBolso: 'Digníssimo e Ilustríssimo: fora da redação oficial.',
          dica: 'A tendência do Manual é simplificar os tratamentos.',
          dificuldade: 2,
        },
        {
          chave: 'q:redacao:07',
          enunciado:
            'Segundo o Manual de Redação da Presidência da República, o vocativo adequado para o Presidente da República é:',
          alternativas: [
            'Excelentíssimo Senhor Presidente da República,',
            'Digníssimo Senhor Presidente,',
            'Ilustríssimo Presidente,',
            'Caro Presidente,',
            'Meritíssimo Presidente,',
          ],
          gabarito: 'A',
          explicacao:
            'O vocativo "Excelentíssimo Senhor", seguido do cargo, é reservado aos Chefes de Poder, como o Presidente da República.',
          dicaBolso: 'Excelentíssimo Senhor: só para Chefe de Poder.',
          dica: '"Digníssimo" e "Ilustríssimo" não são mais usados.',
          dificuldade: 2,
        },
        {
          chave: 'q:redacao:08',
          enunciado: 'Sobre a impessoalidade na redação oficial, é correto afirmar:',
          alternativas: [
            'o texto deve expressar as opiniões pessoais de quem o escreve.',
            'a comunicação é feita em nome do órgão público, sem marcas de opinião pessoal.',
            'devem ser usadas gírias para aproximar o leitor.',
            'o servidor deve assinar com apelido.',
            'é proibido identificar o órgão que envia o documento.',
          ],
          gabarito: 'B',
          explicacao:
            'Quem comunica é sempre o serviço público. Por isso o texto evita impressões pessoais e trata o assunto de forma objetiva.',
          dicaBolso: 'Quem fala é o órgão, não a pessoa.',
          dica: 'Impessoal = sem a marca da pessoa.',
          dificuldade: 1,
        },
        {
          chave: 'q:redacao:09',
          enunciado: 'Um texto oficial conciso é aquele que:',
          alternativas: [
            'transmite o máximo de informações com o mínimo de palavras.',
            'usa o maior número possível de palavras difíceis.',
            'repete a mesma ideia várias vezes para reforçá-la.',
            'é sempre curto, mesmo que omita informações essenciais.',
            'dispensa a revisão antes do envio.',
          ],
          gabarito: 'A',
          explicacao:
            'Concisão é economia de palavras sem perder conteúdo: cortar repetições e excessos, mas manter tudo o que é essencial.',
          dicaBolso: 'Conciso não é incompleto: é sem enrolação.',
          dica: 'Concisão tem a ver com eficiência na escrita.',
          dificuldade: 1,
        },
        {
          chave: 'q:redacao:10',
          enunciado: 'No padrão ofício, o campo "Assunto" serve para:',
          alternativas: [
            'resumir o tema principal do documento.',
            'indicar a data do expediente.',
            'trazer a assinatura do responsável.',
            'fazer a saudação final.',
            'informar o telefone do setor.',
          ],
          gabarito: 'A',
          explicacao:
            'O campo "Assunto" resume, em poucas palavras, o tema do documento, para facilitar a leitura e o arquivamento.',
          dicaBolso: 'Assunto = o tema em uma linha.',
          dica: 'É o "título" do documento.',
          dificuldade: 1,
        },
      ],
    },
    {
      chave: 'secao:informatica-basica',
      titulo: 'Noções de informática',
      assunto: {
        slug: 'nocoes-de-informatica',
        nome: 'Noções de informática',
        dicaTitulo: 'Atalhos e planilhas',
        dicaTexto:
          'Atalhos que mais caem: Ctrl+C copia, Ctrl+X recorta, Ctrl+V cola e Ctrl+Z desfaz. Em planilhas (Excel ou LibreOffice Calc), a fórmula começa com "=" e o intervalo A1:A5 vai de A1 até A5. No e-mail, CC é cópia visível e CCO é cópia oculta.',
        dicaExemplo: '=SOMA(A1:A5) soma as células de A1 até A5.',
      },
      questoes: [
        {
          chave: 'q:informatica:01',
          enunciado: 'No Windows, o atalho de teclado Ctrl+Z serve, em geral, para:',
          alternativas: [
            'desfazer a última ação.',
            'copiar.',
            'colar.',
            'salvar o arquivo.',
            'fechar a janela.',
          ],
          gabarito: 'A',
          explicacao:
            'Ctrl+Z desfaz a última ação na maioria dos programas. Ctrl+C copia, Ctrl+V cola e Alt+F4 fecha a janela.',
          dicaBolso: 'Z de "zerar" o que acabou de fazer: desfazer.',
          dica: 'É o atalho de quem errou e quer voltar atrás.',
          dificuldade: 1,
        },
        {
          chave: 'q:informatica:02',
          enunciado: 'O atalho Ctrl+X, aplicado a um texto selecionado, serve para:',
          alternativas: ['recortar.', 'copiar.', 'colar.', 'imprimir.', 'localizar.'],
          gabarito: 'A',
          explicacao:
            'Ctrl+X recorta: tira o conteúdo do lugar e o guarda na área de transferência para ser colado com Ctrl+V.',
          dicaBolso: 'X parece uma tesoura: recortar.',
          dica: 'Pense no desenho da letra X.',
          dificuldade: 1,
        },
        {
          chave: 'q:informatica:03',
          enunciado: 'Em uma planilha eletrônica, a fórmula =SOMA(A1:A4) calcula:',
          alternativas: [
            'a soma das células A1, A2, A3 e A4.',
            'a soma apenas das células A1 e A4.',
            'a média das células de A1 a A4.',
            'quantas células há entre A1 e A4.',
            'o produto das células de A1 a A4.',
          ],
          gabarito: 'A',
          explicacao:
            'Os dois-pontos indicam intervalo: A1:A4 é de A1 até A4. Para somar só A1 e A4 seria =SOMA(A1;A4).',
          dicaBolso: 'Dois-pontos (:) = "até". Ponto e vírgula (;) = "e".',
          dica: 'Repare no sinal entre A1 e A4.',
          dificuldade: 1,
        },
        {
          chave: 'q:informatica:04',
          enunciado:
            'Em uma planilha, as células B1, B2 e B3 contêm 4, 6 e 8. O resultado de =MÉDIA(B1:B3) é:',
          alternativas: ['6', '18', '8', '4', '3'],
          gabarito: 'A',
          explicacao: 'A média é a soma dividida pela quantidade: (4 + 6 + 8) ÷ 3 = 18 ÷ 3 = 6.',
          dicaBolso: 'Média = soma ÷ quantidade.',
          dica: 'Some os valores e divida por quantos são.',
          dificuldade: 1,
        },
        {
          chave: 'q:informatica:05',
          enunciado: 'Ao enviar um e-mail, o campo CCO (cópia oculta) serve para:',
          alternativas: [
            'enviar uma cópia sem que os outros destinatários vejam esse endereço.',
            'enviar a mensagem com prioridade alta.',
            'criptografar o anexo.',
            'agendar o envio.',
            'pedir confirmação de leitura.',
          ],
          gabarito: 'A',
          explicacao:
            'Quem está em CCO recebe a mensagem, mas o endereço não aparece para os demais destinatários. Em CC (cópia), o endereço fica visível.',
          dicaBolso: 'CCO: o "O" é de oculto.',
          dica: 'A última letra da sigla dá a resposta.',
          dificuldade: 1,
        },
        {
          chave: 'q:informatica:06',
          enunciado: 'Um arquivo com a extensão .pdf é, normalmente:',
          alternativas: [
            'um documento em formato portátil, aberto em leitores de PDF ou no navegador.',
            'uma planilha do Excel.',
            'uma apresentação de slides editável.',
            'um programa executável.',
            'um arquivo de áudio.',
          ],
          gabarito: 'A',
          explicacao:
            'PDF (Portable Document Format) é o formato de documento portátil, que mantém a aparência do arquivo em qualquer computador.',
          dicaBolso: 'PDF = documento pronto para ler e imprimir.',
          dica: 'É o formato em que costumam sair editais e gabaritos.',
          dificuldade: 1,
        },
        {
          chave: 'q:informatica:07',
          enunciado: 'A extensão .xlsx é usada, por padrão, por arquivos de:',
          alternativas: [
            'planilha do Microsoft Excel.',
            'texto do Microsoft Word.',
            'apresentação do PowerPoint.',
            'imagem.',
            'vídeo.',
          ],
          gabarito: 'A',
          explicacao:
            '.xlsx é a planilha do Excel; .docx é o documento do Word; .pptx é a apresentação do PowerPoint.',
          dicaBolso: 'xls = Excel, doc = Word, ppt = PowerPoint.',
          dica: 'O "x" do começo lembra o nome de qual programa?',
          dificuldade: 1,
        },
        {
          chave: 'q:informatica:08',
          enunciado:
            'Um e-mail que imita o banco, pede para clicar num link e digitar a senha é um exemplo típico de:',
          alternativas: ['phishing.', 'backup.', 'firewall.', 'cookie.', 'antivírus.'],
          gabarito: 'A',
          explicacao:
            'Phishing é a fraude que "pesca" dados pessoais (senhas, cartões) com mensagens falsas que imitam empresas ou órgãos conhecidos.',
          dicaBolso: 'Pediu senha por link? Desconfie: é phishing.',
          dica: 'O nome vem de "pescar" em inglês.',
          dificuldade: 1,
        },
        {
          chave: 'q:informatica:09',
          enunciado: 'Fazer backup de arquivos significa:',
          alternativas: [
            'criar uma cópia de segurança para recuperar os dados em caso de perda.',
            'apagar arquivos antigos para liberar espaço.',
            'instalar um antivírus.',
            'compactar arquivos para enviar por e-mail.',
            'trocar a senha do computador.',
          ],
          gabarito: 'A',
          explicacao:
            'Backup é a cópia de segurança dos dados, guardada em outro lugar (pen drive, HD externo ou nuvem), para recuperá-los se o original se perder.',
          dicaBolso: 'Backup = cópia guardada em outro lugar.',
          dica: 'Pense no que salva você quando o computador quebra.',
          dificuldade: 1,
        },
        {
          chave: 'q:informatica:10',
          enunciado:
            'Em uma planilha eletrônica, o sinal usado para iniciar uma fórmula, como em ___SOMA(A1:A3), é:',
          alternativas: ['=', '#', '&', '!', '?'],
          gabarito: 'A',
          explicacao:
            'Fórmulas começam com o sinal de igual (=). Sem ele, a planilha trata o conteúdo como texto.',
          dicaBolso: 'Fórmula começa com "=".',
          dica: 'É o mesmo sinal do resultado de uma conta.',
          dificuldade: 1,
        },
      ],
    },
  ],
};
