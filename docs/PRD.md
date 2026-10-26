# PRD: Fuse Aprova

**Produto:** Fuse Aprova, um app de estudo gamificado (PWA) para o concurso da Prefeitura Municipal de Palmital-PR 2026/27, banca FAU-Unicentro.
**Dono do produto:** Luiz
**Data:** 23/10/2026
**Status:** pronto para implementação completa

> Este documento descreve o produto inteiro. **Não há fases nem MVP reduzido.** Tudo o que está aqui faz parte do produto que vai ao ar. A ordem de implementação está no `CLAUDE.md`; ela é só uma sequência de trabalho, e o produto é lançado completo.

---

## 1. Contexto

### 1.1 O concurso
- A Prefeitura de **Palmital, no Paraná**, contratou a **FAU-Unicentro** (Fundação de Apoio à Unicentro, Guarapuava-PR) para o próximo concurso público. O edital está em elaboração; a fonte é o Portal Douglas, em 10/09/2026.
- **Não confundir com Palmital-SP.** Todo o conteúdo, os textos e as leis locais são de Palmital-PR.
- O último concurso efetivo com prova realizada na Prefeitura é antigo: o certame de 2023 (IPPEC) foi cancelado. A Câmara Municipal teve concurso em 2018 (Instituto Saber). Por isso o acervo de treino vem das provas da FAU em outros municípios, que seguem o mesmo padrão.

### 1.2 O padrão de prova da FAU
O padrão abaixo foi tirado do edital de Paula Freitas-PR 2026, e a FAU repete essa estrutura nos municípios.

| Bloco | Questões | Pontos por questão | Total |
|---|---|---|---|
| Língua Portuguesa | 5 | 2,0 | 10 |
| Matemática / Raciocínio Lógico | 5 | 2,0 | 10 |
| Conhecimentos Gerais (inclui Lei Orgânica Municipal e Estatuto dos Servidores) | 5 | 2,0 | 10 |
| Conhecimentos Específicos do cargo | 25 | 2,8 | 70 |
| **Total** | **40** | | **100** |

- Cada questão tem 5 alternativas (A–E). A prova dura 4 horas. É eliminado quem fizer menos de 50 pontos.
- A FAU tira o caderno de questões do site após o prazo de recursos. Ficam online o **gabarito definitivo** e as **respostas aos recursos**, com a justificativa de questões anuladas ou alteradas.
- Os conteúdos comuns e os específicos mais frequentes estão no Anexo II do edital de Paula Freitas (veja as Fontes).

### 1.3 Proposta de valor
Treinar no formato exato da banca que vai aplicar a prova, com questões reais da FAU explicadas, em sessões curtas e diárias que criam hábito (ofensiva, XP, liga local). Quando o edital de Palmital sair, o app passa a seguir os cargos e o conteúdo do edital, sem custo extra para quem já comprou.

---

## 2. Regras de negócio (não negociáveis)

1. **Nome:** Fuse Aprova. O wordmark é "fuse" em laranja e "aprova" em verde.
2. **Preço:** R$ 397,00, pagamento único, à vista, só por Pix. Não existe cartão, boleto nem parcelamento.
3. **Não existe acesso gratuito.** Não há período de teste, modo demo nem lições abertas. Sem pagamento confirmado, a conta só vê o fluxo de pagamento, os termos e a saída.
4. **Gateway:** Asaas, que é o único serviço externo do sistema.
5. **Acesso:** todas as provas e questões FAU do acervo, de todas as disciplinas e cargos. O acesso vale até a homologação do concurso de Palmital (veja 2.9).
6. **Comunicação obrigatória:** em cadastro, pagamento, perfil e termos deve estar claro que, **quando o edital de Palmital for publicado, o app se ajusta aos cargos e ao conteúdo do edital, sem custo adicional**.
7. **Infra própria:** tudo roda na VPS do dono, num monorepo Turborepo. São **proibidos** Supabase, Firebase, Vercel, Clerk, Auth0 e qualquer BaaS ou SaaS de backend. Não há analytics de terceiros nem CDN de fontes ou scripts.
8. **Questões reais da FAU desde o lançamento.** Cada questão guarda a origem (banca, órgão, ano, cargo, link) e pode ser retirada do ar em minutos pelo painel admin.
9. **Direito de arrependimento:** é compra online, então vale o CDC, art. 49. O reembolso integral é feito pelo painel se pedido em até 7 dias. O estorno revoga o acesso.
10. **Escopo geográfico:** só Palmital-PR. O modelo de dados já suporta vários concursos e municípios, mas a interface só expõe Palmital.

---

## 3. Público e personas

- **Marina, 27 anos, de Palmital.** Tem ensino médio e trabalha no comércio. Quer o cargo de Agente Administrativo. Estuda no celular, no ônibus e à noite, 15–30 minutos por dia. Nunca fez prova da FAU.
- **Carlos, 41 anos, motorista.** Quer o cargo de Motorista. Tem dificuldade com Português e Matemática e precisa de explicações muito simples.
- **Patrícia, 33 anos, técnica de enfermagem em cidade vizinha.** Quer estabilidade. Domina o específico de saúde, mas precisa de Lei Orgânica e Estatuto de Palmital.

Implicações:
- linguagem simples;
- funcionar bem em Android de entrada e com 3G;
- funcionar offline;
- explicação em toda questão;
- ênfase na legislação local.

---

## 4. Jornada principal

```
Boas-vindas → Cadastro → Pagamento Pix → (webhook confirma) → Escolha do cargo → Trilha
Trilha → Lição (dica → 5 questões → feedback) → Fim da lição → Ofensiva → Trilha
Abas: Revisar · Simulado · Liga · Perfil
```

---

## 5. Telas

As telas marcadas com ✅ têm desenho final em `design/png` e `design/html`. As marcadas com ✏️ não têm desenho e devem ser feitas com o Design System (`docs/DESIGN-SYSTEM.md`), no mesmo estilo.

### 5.1 ✅ 01 Boas-vindas (`/`)
- Capi feliz com o balão "Bora passar?", o wordmark e o título "Treine para o concurso da Prefeitura de Palmital com as provas da FAU".
- Subtítulo e os chips "Palmital · PR", "Provas da FAU" e "2026/27".
- **COMEÇAR AGORA** leva ao Cadastro. **JÁ TENHO CONTA** leva ao Login.
- Se houver sessão: com acesso, redireciona para a Trilha; sem acesso, para o Pagamento.

### 5.2 ✅ 02 Cadastro (`/cadastro`)
- Progresso "1 de 2" e Capi: "Vamos criar sua conta. O CPF é usado só na cobrança Pix."
- **Campos:** nome completo, e-mail, CPF (com máscara), celular (com máscara), senha.
- **Validações:**
  - nome com 2 ou mais palavras;
  - e-mail válido;
  - CPF com dígitos verificadores corretos;
  - celular brasileiro com 11 dígitos;
  - senha com 8 ou mais caracteres.
- **Erros por campo:**
  - "Esse CPF não é válido.";
  - "Já existe uma conta com este e-mail ou CPF. Entre com sua senha." (com link para o Login).
- **CRIAR CONTA E IR PARA O PAGAMENTO** cria a conta, abre a sessão e leva ao Pagamento.
- Links para Termos de uso e Política de privacidade. O aceite fica registrado com data, hora e versão dos termos.

### 5.3 ✅ 03 Pagamento Pix (`/pagamento`)
- Cartão "ACESSO COMPLETO · R$ 397 à vista no Pix · pagamento único" com 4 benefícios:
  - Todas as provas FAU;
  - Questões comentadas;
  - Simulados ilimitados;
  - Até o dia da prova.
- **QR Code** com a imagem base64 vinda do Asaas, o texto "Escaneie no app do seu banco" e a contagem regressiva até expirar.
- **Pix copia e cola:** campo só leitura e botão COPIAR, que confirma com o toast "Código copiado".
- **Status:** "Aguardando pagamento… o acesso libera sozinho assim que o Pix cair". A tela consulta o status a cada 4 s.
- Ao confirmar o pagamento: animação de celebração e "Pagamento confirmado!", e depois o app vai para a Escolha do cargo.
- **Expirado:** "Esse Pix expirou." e o botão GERAR NOVO PIX.
- **Rodapé:** aviso do edital (regra 2.6).
- **Erro ao gerar o Pix:** "Não foi possível gerar o Pix agora. Tente de novo em alguns minutos." e o botão TENTAR DE NOVO.

### 5.4 ✏️ Login (`/entrar`)
- Campos de e-mail e senha, o botão ENTRAR e o link "Esqueci minha senha".
- Mesmo cabeçalho do Cadastro, sem barra de progresso.

### 5.5 ✏️ Recuperar senha (`/recuperar` e `/recuperar/:token`)
- O aluno informa o e-mail e recebe um link com validade de 1 h, enviado pelo SMTP do próprio dono.
- A resposta é sempre a mesma, para não revelar se o e-mail existe.
- No link, ele define a nova senha e todas as outras sessões são encerradas.

### 5.6 ✏️ Escolha do cargo (`/onboarding`), logo após o primeiro pagamento
- **Passo 1:** "Qual cargo você quer?", com uma lista de cartões grandes por área. A lista inicial, antes do edital, está na seção 7.2.
- **Passo 2:** "Quanto tempo por dia?", com as opções 1 lição (5 min), 2 lições (10 min) e 3 lições (15 min). Isso define a meta diária.
- **Passo 3:** "Quer um lembrete?", com escolha de horário e o pedido de permissão de notificação (Web Push).
- Ao final, leva à Trilha. O cargo pode ser trocado depois, no Perfil.

### 5.7 ✅ 04 Trilha (`/aprender`)
- **Cabeçalho:** chip do concurso ("PAL · FAU"), ofensiva e gemas (o contador de vidas não aparece na interface: D17).
  - O chip abre a tela ✏️ **Sobre o concurso**, com o status do edital, os links oficiais e a data da prova se houver.
  - A contagem regressiva aparece quando a data da prova estiver cadastrada.
- **Banner da unidade:** "UNIDADE n · SEÇÃO n" e o título. O botão livro abre o ✏️ **Guia da unidade**: as dicas de todas as lições da unidade em cartões curtos, para ler sem responder.
- **Caminho em zigue-zague** (estados: concluída, atual, bloqueada, baú, troféu):
  - a lição atual tem o anel de progresso (quantas vezes foi feita, até 3) e o balão COMEÇAR;
  - só é possível abrir a lição atual e as já concluídas, para refazer;
  - o baú se abre ao completar as lições anteriores e dá +20 gemas;
  - o troféu é o **Desafio da unidade**: 10 questões, sem dica e sem vidas, e passar com 70% ou mais dá a "coroa" da unidade.
- **Capi** aparece com uma frase contextual, por exemplo "Faltam 2 lições para o baú!" ou "Você errou 3 de crase ontem. Bora revisar?".
- O divisor anuncia a próxima unidade.
- **Barra de navegação**, com o selo de revisões pendentes.

### 5.8 ✅ 05 Pergunta (`/licao/:id`)
- **Topo:**
  - fechar (✕), que abre a confirmação ✏️ "Quer mesmo sair? Você perde o progresso desta lição." com os botões CONTINUAR ESTUDANDO e SAIR;
  - barra de progresso (sem contador de vidas na interface: D17).
- **Antes da 1ª questão:** um cartão ✏️ **Dica da lição**, com Capi, o título do conceito, 2–4 linhas e um exemplo. O botão é ENTENDI, VAMOS LÁ.
- **Chip de origem:** "FAU-Unicentro · {Órgão} · {Ano}" e o nome da disciplina. Questão autoral mostra "Questão Fuse Aprova · estilo FAU".
- Título "Selecione a alternativa correta".
- Capi pensando, com o enunciado num balão. Para enunciados longos (com texto de apoio), o texto fica num cartão rolável acima e o balão traz só o comando.
- **5 alternativas.** Tocar seleciona (azul) e o VERIFICAR é habilitado.
- **DICA** custa 5 gemas, depois de uma confirmação, e mostra a dica da questão sem eliminar alternativas. Se o aluno tiver menos de 5 gemas, o botão fica desabilitado com o texto "Sem gemas".
- **VERIFICAR** leva à folha de Acerto ou de Erro.
- Uma lição tem 5 questões. A ordem é: questões novas do assunto, intercaladas com 1 questão de revisão vencida, se houver.

### 5.9 ✅ 06 Acerto
- A alternativa correta fica verde e com ✓. As outras ficam esmaecidas.
- A folha verde traz um título que varia ("Mandou bem!", "Isso aí!", "Certinho!", "Boa, Marina!"), o selo +10 XP e a explicação curta.
- O chip COMBO × n aparece a partir de 3 acertos seguidos. É só visual.
- **CONTINUAR** leva à próxima questão ou ao Fim.

### 5.10 ✅ 07 Erro
- A alternativa marcada fica vermelha com ✕, e a correta aparece tracejada em verde.
- A folha vermelha traz:
  - "Resposta correta: X";
  - a explicação de por que a marcada está errada e a certa está certa;
  - o cartão **Dica de bolso** (macete);
  - a linha "Essa questão volta na sua revisão amanhã".
- Uma vida é descontada no servidor (`/me.vidas`), sem exibir contador nem animação (D17).
- **ENTENDI** leva à próxima questão.
- O link "Reportar problema" fica no rodapé da folha, com as opções gabarito errado, enunciado com erro, explicação confusa e outro, mais um campo de texto. Isso cria um registro no painel admin.
- **Vidas nunca travam o estudo** (decisão do dono, 26/10/2026): o contador cai a cada erro, mas com 0 vidas a lição continua normalmente. Não existe a folha "Suas vidas acabaram" (veja 6.2 e D16).

### 5.11 ✅ 08 Fim da lição
- Confete, Capi comemorando e "Lição concluída!", com o nome da lição.
- Três cartões: **XP TOTAL**, **PRECISÃO** e **TEMPO**.
- Botões **CONTINUAR** e **REVISAR ERROS (n)**. O segundo só aparece quando houve erro e abre uma mini-lição só com os erros desta lição.

### 5.12 ✅ 09 Ofensiva
- Aparece depois do Fim, **só na primeira lição do dia** que conta para a ofensiva.
- Mostra a chama com o número, "dias de ofensiva!", a frase motivacional, a semana com os dias cumpridos e a meta diária.
- Variante ✏️ **Ofensiva perdida**: "Sua ofensiva zerou". Se o aluno tinha protetor, aparece "O protetor salvou sua ofensiva!".

### 5.13 ✅ 10 Revisar (`/revisar`)
- **Hero:** "N questões para hoje" e o botão PRATICAR ERROS, que inicia uma lição de até 10 questões da fila vencida. Revisão não gasta vidas e acertar recupera 1 vida, até o máximo (as vidas são só um indicador: não bloqueiam nada).
- **Por disciplina:** a barra mostra o domínio e o selo mostra o número de pendentes. Tocar abre a revisão filtrada por aquela disciplina.
- **Explicação da regra:** "Cada erro volta em 1, 3, 7 e 15 dias. Acertou 4 vezes seguidas, a questão sai da fila."
- **Estado vazio:** Capi de óculos e "Nada para revisar hoje. Que tal uma lição nova?".

### 5.14 ✅ 11 Simulado (`/simulado`)
- **Hero roxo:** "Prova completa no padrão FAU · 40 questões · 4h · mínimo 50%", com os blocos 5/5/5/25 e a nota sobre Lei Orgânica e Estatuto.
- **Seletor de cargo**, que usa por padrão o cargo do perfil.
- **COMEÇAR SIMULADO** leva ao ✏️ **Simulado em andamento**:
  - cronômetro regressivo de 4h no topo;
  - navegação por número de questão numa grade de 1–40, com as marcadas e as "para revisar depois";
  - sem feedback por questão;
  - o botão ENTREGAR PROVA pede confirmação e mostra quantas questões estão em branco;
  - se o tempo acabar, a prova é entregue automaticamente;
  - o aluno pode sair e voltar enquanto o tempo não acabar, porque o tempo é contado no servidor.
- ✏️ **Resultado do simulado:**
  - nota em pontos (2,0 por questão nos blocos comuns, 2,8 nos específicos) e percentual;
  - selo APROVADO (≥ 50) ou ABAIXO DO MÍNIMO;
  - desempenho por bloco e tempo gasto;
  - lista de questões com filtro de erradas, cada uma com o gabarito e a explicação;
  - todos os erros entram na fila de revisão.
- **Seus simulados:** o histórico com nota, data, acertos e tempo.

### 5.15 ✅ 12 Liga (`/liga`)
- Escudo e nome da divisão, a regra "Os 3 primeiros sobem de liga · termina em X dias", e o ranking de até 30 pessoas por XP da semana.
- Marcador "ZONA DE PROMOÇÃO" depois do 3º lugar e "ZONA DE REBAIXAMENTO" antes dos 3 últimos (nos grupos com mais de 10 pessoas).
- A linha do aluno é destacada em verde. Tocar no nome de outra pessoa não faz nada; não há perfil público.
- **Estado inicial:** "Complete 1 lição para entrar na liga desta semana".
- ✏️ **Resultado semanal:** um modal na primeira abertura após o fechamento, com "Você subiu para a Liga Prata!" e Capi comemorando, ou "Você ficou na Bronze".

### 5.16 ✅ 13 Perfil (`/perfil`)
- Avatar com as iniciais e a cor derivada do id, o nome com sobrenome abreviado, o cargo e o órgão, e o selo "Acesso completo · pago via Pix".
- **4 estatísticas:** ofensiva, XP total, questões feitas e precisão.
- **Domínio por disciplina:** 4 barras.
- **Cartão do edital**, com o status vindo do banco:
  - "em elaboração pela FAU";
  - "publicado: veja seus cargos";
  - "prova em dd/mm".
- A engrenagem abre ✏️ **Configurações**:
  - trocar cargo;
  - meta diária;
  - horário do lembrete e notificações;
  - sons e vibração;
  - aparecer na liga com nome ou apelido;
  - alterar senha;
  - baixar meus dados (JSON, LGPD);
  - excluir conta;
  - termos, privacidade e suporte (link de WhatsApp ou e-mail do dono);
  - sair.

### 5.17 ✏️ Painel admin (`/admin`, só para o papel `admin`)
- **Painel:** vendas do dia e do mês, usuários ativos (7 dias), reports abertos e questões em rascunho.
- **Concursos e provas:** criar e editar o concurso, as provas e os links (caderno, gabarito, recursos).
- **Questões:**
  - lista com filtros (disciplina, assunto, status, origem, área);
  - editor com enunciado (markdown simples e imagem), 5 alternativas, gabarito, dica, explicação, dica de bolso, assunto, área de cargo, dificuldade (1–3) e status;
  - status: `rascunho`, `revisao`, `publicada`, `anulada`, `retirada`;
  - ações em lote de publicar e retirar;
  - a pré-visualização no formato da tela de Pergunta.
- **Importação:** fila do coletor com os PDFs baixados, as questões extraídas e o confronto automático com o gabarito definitivo. O status começa em `rascunho`.
- **Trilhas:** montar unidades, seções e lições, arrastando assuntos e definindo a ordem e a dica de cada lição.
- **Reports:** fila de reportes de erro, com resolver ou descartar.
- **Pedidos:** lista de pagamentos, reembolso (chama o estorno no Asaas) e liberação manual de acesso, que exige um motivo e fica no log.
- **Edital:** cadastrar o edital de Palmital (cargos, vagas, conteúdo programático por cargo, data da prova). Ao publicar, o app entra no "modo edital" (veja 7.3).
- **Usuários:** busca, ver progresso, revogar sessões.

---

## 6. Gamificação: regras exatas

Todas as datas usam o fuso **America/Sao_Paulo**. O "dia" vai de 00:00 a 23:59 nesse fuso.

### 6.1 XP
| Evento | XP |
|---|---|
| Acerto em lição ou revisão | +10 |
| Concluir lição | +5 |
| Lição perfeita (0 erros) | +10 bônus |
| Concluir o Desafio da unidade com 70% ou mais | +30 |
| Simulado entregue | +1 por acerto, +20 se aprovado |

O XP total nunca diminui. O XP semanal alimenta a liga.

### 6.2 Vidas
- O máximo é 5.
- Errar em **lição de trilha** custa 1 vida. Revisão, simulado e desafio não gastam vidas.
- **As vidas nunca bloqueiam o treino.** Quem pagou não espera recarga: com 0 vidas, a lição de trilha inicia e continua normalmente, e o contador fica em 0 (nunca negativo).
- Recarga: +1 vida a cada 4 h, contadas da perda, até o máximo. Cada acerto em revisão também dá +1 vida.
- Todo dia à meia-noite, as vidas voltam para 5.

### 6.3 Gemas
| Evento | Gemas |
|---|---|
| Concluir lição | +5 |
| Abrir baú | +20 |
| Subir de liga | +50 |
| Ofensiva de 7, 30 e 100 dias | +50, +200, +500 |
| Usar dica numa questão | −5 |
| Protetor de ofensiva (máximo 2 guardados) | −200 |

Gemas não se compram com dinheiro.

### 6.4 Ofensiva
- O dia conta quando o aluno conclui ao menos 1 lição de trilha **ou** 10 questões de revisão **ou** 1 simulado.
- Se passar um dia sem contar: havendo protetor, ele é consumido e a ofensiva continua; sem protetor, a ofensiva volta a 0.
- A **meta diária** (1, 2 ou 3 lições) é separada da ofensiva. Ela aparece no anel da tela de Ofensiva e no lembrete.

### 6.5 Revisão espaçada
- Errar uma questão (em qualquer modo) cria ou reinicia o item de revisão na **etapa 0**, vencendo em +1 dia.
- Acertar o item vencido avança a etapa: 1 → 3 → 7 → 15 dias.
- Acertar na etapa de 15 dias retira o item da fila (status `dominada`). São 4 acertos seguidos.
- Errar na revisão volta o item à etapa 0 (+1 dia).
- **Pendentes** = itens com `vence_em <= agora`.

### 6.6 Domínio
- O domínio de um assunto é a fração de acertos nas últimas 30 tentativas daquele assunto. Só aparece a partir de 5 tentativas; antes disso, mostra "—".
- O domínio por disciplina é a média ponderada dos assuntos, pelo número de tentativas.

### 6.7 Liga
- A semana vai de segunda 00:00 a domingo 23:59.
- O aluno entra no primeiro ganho de XP da semana e é colocado num grupo de até 30 pessoas do mesmo concurso e da mesma divisão.
- **Divisões:** Bronze → Prata → Ouro → Safira → Diamante.
- No fechamento, um job no domingo às 23:59:
  - os 3 primeiros sobem;
  - os 3 últimos descem (não se desce da Bronze, e não há rebaixamento em grupos com 10 pessoas ou menos);
  - os demais ficam.
- Empate: vence quem chegou ao XP primeiro.
- **Privacidade:** por padrão, aparece o primeiro nome e a inicial do sobrenome. Nas configurações dá para usar um apelido.

### 6.8 Conquistas (aparecem no Perfil, abaixo do domínio)
- Primeira lição;
- 7 dias de ofensiva;
- 30 dias de ofensiva;
- 100 questões;
- 500 questões;
- primeiro simulado;
- aprovado num simulado;
- unidade de Português coroada;
- liga Ouro.

---

## 7. Conteúdo

### 7.1 Estrutura
```
Concurso (Palmital-PR 2026/27)
 └─ Trilha (por área de cargo: comum + específico da área)
     └─ Unidade (= disciplina ou grande tema)
         └─ Seção (= assunto do edital, ex. "Crase")
             └─ Lição (dica + 5 questões) × 3–6 por seção
             └─ Baú a cada 3 lições
         └─ Desafio da unidade (troféu)
```
- A trilha de cada aluno intercala as unidades comuns (Português, Matemática/RL, Conhecimentos Gerais com Palmital/Paraná) com as unidades do específico da área, na proporção da prova: a cada 3 seções comuns, há 5 específicas.
- **Conhecimentos Gerais** tem unidades próprias de **Lei Orgânica de Palmital** e **Estatuto dos Servidores de Palmital**, com questões autorais escritas a partir do texto vigente. O texto deve ser obtido na Câmara ou na Prefeitura e conferido.

### 7.2 Áreas de cargo (antes do edital)
| Área | Exemplos de cargo | Específicos típicos FAU |
|---|---|---|
| `administrativo` | Agente Administrativo, Auxiliar Administrativo, Assistente Administrativo, Recepcionista | Redação oficial, noções de Direito Administrativo, Lei 14.133, LRF, informática, atendimento |
| `saude_medio` | Técnico de Enfermagem, Auxiliar de Saúde Bucal, Agente Comunitário de Saúde, Agente de Endemias | SUS (Lei 8.080/8.142), PNAB, ética, procedimentos |
| `saude_superior` | Enfermeiro, Farmacêutico, Fisioterapeuta, Psicólogo, Nutricionista, Odontólogo, Médico | SUS, legislação do conselho, conteúdo técnico |
| `educacao` | Professor, Educador Infantil, Auxiliar de Educação | LDB, BNCC, ECA, didática, educação inclusiva |
| `operacional` | Motorista, Operador de Máquinas, Mecânico | Código de Trânsito, direção defensiva, primeiros socorros, mecânica básica |
| `servicos_gerais` | Auxiliar de Serviços Gerais, Merendeira, Zelador, Gari | Segurança do trabalho, higiene, noções de cidadania |
| `social_juridico` | Assistente Social, Advogado, Contador, Fiscal | Conteúdo técnico e legislação |

Cada questão de específico é marcada com uma ou mais áreas.

### 7.3 Modo edital
Quando o admin publica o edital de Palmital:
- a lista de cargos passa a ser a do edital, com a área de cada cargo mapeada pelo admin;
- quem tinha um cargo genérico vê o modal "O edital saiu! Confirme seu cargo";
- as seções ganham o selo "No edital" ou "Fora do edital"; as que estão fora saem da trilha, mas continuam acessíveis no Guia;
- a data da prova liga a contagem regressiva no cabeçalho e no Perfil;
- o simulado passa a seguir exatamente a distribuição e os conteúdos do edital (se diferir de 5/5/5/25, vale o edital).

Nada disso exige deploy: é dado no banco.

### 7.4 Banco de questões
**Campos obrigatórios por questão:**
- enunciado e texto de apoio opcional;
- alternativas A–E e gabarito;
- disciplina, assunto, áreas e dificuldade;
- dica da lição (vinculada ao assunto), explicação e dica de bolso;
- origem: `fau_real` (com prova, número da questão e link) ou `autoral`;
- status.

**Fontes:**
1. Site da FAU (`concursosfau.com.br/novo/encerrados/`): 246 certames válidos, 179 prefeituras e 22 câmaras, já catalogados em `dados/catalogo_fau.json`. A página de cada certame tem editais, gabaritos definitivos e respostas a recursos. Os cadernos só ficam disponíveis enquanto o certame está em andamento.
2. PCI Concursos (`pciconcursos.com.br/provas/fau-unicentro`): cerca de 1.400 provas FAU em 28 páginas de 50. Os cadernos e gabaritos ficam em PDF.
3. Certames FAU em andamento: baixar o caderno logo após cada prova.

**Prioridade de importação:**
1. prefeituras e câmaras do Paraná de 2022 em diante (78 certames marcados `relevancia_palmital=true`);
2. os demais certames do Paraná;
3. os de outros estados.

**Regras de qualidade:**
- O gabarito importado é sempre o **definitivo**, depois dos recursos.
- Questão anulada vira `anulada` e não aparece no app. Questão com gabarito alterado usa o gabarito novo e cita a alteração na explicação.
- Nenhuma questão é `publicada` sem dica, explicação e uma revisão humana no painel.
- O botão "Reportar problema" alimenta o painel. Três ou mais reports na mesma questão a tiram do ar automaticamente para revisão.

**Retirada rápida:** mudar uma questão, uma prova ou toda a origem `fau_real` de uma banca para `retirada` some com ela do app no próximo carregamento. O cache do service worker é invalidado pela versão do conteúdo.

### 7.5 Coletor (`packages/crawler`)
- Usa Node, `undici` e `cheerio`. Extrai texto de PDF com `pdftotext` (poppler-utils), chamado por child_process.
- **Comandos:**
  - `crawler fau:certames`: atualiza a lista de certames da FAU;
  - `crawler fau:docs <slug>`: baixa os PDFs de edital, gabarito e recursos;
  - `crawler pci:listar --paginas 1-28`: lista as provas FAU do PCI;
  - `crawler pci:baixar <id>`: baixa o caderno e o gabarito;
  - `crawler importar <pdf> --gabarito <pdf>`: extrai as questões numeradas (o padrão FAU numera "01."… e marca as alternativas "A)"…"E)"), confronta com o gabarito e grava como `rascunho`.
- **Postura:**
  - User-Agent identificado;
  - 1 requisição a cada 2 s por host;
  - respeita robots.txt;
  - **não contorna captcha nem login**;
  - guarda o hash dos arquivos para não baixar de novo.
- Os PDFs ficam em `/srv/fuse/arquivos/provas/{banca}/{slug}/` na VPS, fora do diretório público.

---

## 8. Arquitetura

### 8.1 Stack
| Camada | Escolha |
|---|---|
| Monorepo | pnpm workspaces + Turborepo, TypeScript estrito |
| Front | `apps/web`: React 18 + Vite + React Router + TanStack Query + `vite-plugin-pwa` (Workbox); CSS Modules sobre `tokens.css` |
| API | `apps/api`: Fastify 4, Zod (validação), `@fastify/cookie`, `@fastify/rate-limit`, `@fastify/helmet` |
| Jobs | `apps/worker`: Node com `node-cron` (liga, lembretes, vidas, expiração de Pix, limpeza) |
| Banco | PostgreSQL 16 + Drizzle ORM e migrações (`packages/db`) |
| Compartilhado | `packages/shared`: schemas Zod, regras de XP, ofensiva, revisão e liga, validação de CPF, formatação |
| Coletor | `packages/crawler` |
| Testes | Vitest (unidade), Playwright (fim a fim, com o Chromium da VPS ou do CI) |
| Infra | Docker Compose: `postgres`, `api`, `worker`, `caddy` (HTTPS automático e servindo o build da PWA) |

### 8.2 Autenticação
- Conta própria. A senha usa `argon2id`.
- A sessão é um token aleatório de 32 bytes num cookie `httpOnly; Secure; SameSite=Lax`. O banco guarda o **hash** do token. A sessão expira em 60 dias e o prazo é renovado com o uso.
- **Rate limit:**
  - login: 20 por 15 min por IP;
  - cadastro: 10 por hora;
  - geração de Pix: 10 por hora por usuário.
- O papel é `aluno` ou `admin`. O primeiro admin é criado por `pnpm --filter api cli admin:criar`.
- Guardas:
  - `exigirLogin` responde 401;
  - `exigirAcesso` responde 402 se não houver pagamento confirmado; **toda rota de conteúdo usa essa guarda**;
  - `exigirAdmin` responde 403.

### 8.3 Pagamento (Asaas)
**Variáveis:**
- `ASAAS_API_KEY`;
- `ASAAS_BASE_URL`: `https://api-sandbox.asaas.com/v3` em teste, `https://api.asaas.com/v3` em produção;
- `ASAAS_WEBHOOK_TOKEN`;
- `PRICE_CENTS=39700`.

**Fluxo:**
1. `POST /pagamento/pix`, com a guarda `exigirLogin`.
   - Se já houver um pedido `pendente` não expirado, devolve o mesmo pedido.
   - Senão:
     - cria o cliente no Asaas, se ainda não existir: `POST /customers {name, cpfCnpj, email, mobilePhone, externalReference: "usuario:<id>"}`, enviando o header `access_token`;
     - cria a cobrança: `POST /payments {customer, billingType: "PIX", value: 397.00, dueDate: amanhã, description: "Fuse Aprova – acesso completo", externalReference: "usuario:<id>"}`;
     - busca o QR: `GET /payments/{id}/pixQrCode`, que devolve `{encodedImage, payload, expirationDate}`;
     - grava o pedido.
   - Responde com `{valorCentavos, imagem, payload, expiraEm}`.
2. **Webhook** `POST /webhooks/asaas`:
   - confere o header `asaas-access-token` com `ASAAS_WEBHOOK_TOKEN`; se não bater, responde 401;
   - grava o evento pelo `id`, de forma idempotente (`ON CONFLICT DO NOTHING`); se o evento já existir, responde 200 e para;
   - trata os eventos:

| Evento | Ação |
|---|---|
| `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED` | pedido `pago`, `usuarios.acesso = true` |
| `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED` | pedido `estornado`, `acesso = false`, sessões revogadas |
| `PAYMENT_OVERDUE` | pedido `vencido` |

   - responde 200 em menos de 1 s; o trabalho pesado vai para a fila do worker, se houver.
3. **`GET /pagamento/status`:** a PWA consulta a cada 4 s. Se o pedido estiver pendente há mais de 60 s, a API também consulta `GET /payments/{id}` no Asaas e libera se o status for `RECEIVED`, `CONFIRMED` ou `RECEIVED_IN_CASH`. Isso cobre atraso do webhook.
4. **Reembolso pelo admin:** chama `POST /payments/{id}/refund` e espera o webhook para revogar o acesso.
5. Ao liberar o acesso, envia o e-mail de boas-vindas com o recibo (valor, data e id da cobrança).

> Antes de codar, confira esses endpoints e campos na documentação oficial do Asaas (`docs.asaas.com`), porque a API pode ter mudado.

### 8.4 PWA e offline
- `manifest.webmanifest` com `name` "Fuse Aprova", `short_name` "Fuse Aprova", `theme_color` #D9480F e `background_color` #FFFFFF, ícones de 192, 512 e maskable gerados a partir da Capi, e `display: standalone`.
- **Service worker:**
  - *precache* do shell;
  - *stale-while-revalidate* para a API de conteúdo;
  - um pacote offline das **próximas 3 lições e de toda a revisão vencida**, guardado no IndexedDB.
- **Respostas offline:** ficam numa fila no IndexedDB e são enviadas por `POST /sync/tentativas` (em lote e idempotente, por `id_cliente`) quando a conexão volta.
- O servidor recalcula o XP, a ofensiva e a revisão a partir das tentativas. **O cliente nunca é a fonte da verdade** de XP ou acesso.
- Com o app instalado, a tela de Boas-vindas não aparece para quem já está logado.

### 8.5 Notificações
- Web Push com chaves VAPID próprias (lib `web-push`).
- Lembrete diário no horário escolhido, só se a meta do dia ainda não foi cumprida. Exemplos de texto:
  - "A Capi está te esperando. 5 minutinhos e a ofensiva continua!";
  - "Sua ofensiva de 8 dias está em risco."
- No máximo 1 push por dia. O aluno pode desligar nas configurações.

### 8.6 E-mail
- SMTP do próprio dono, configurado pelas variáveis `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM`.
- Envia: boas-vindas com recibo, recuperação de senha e confirmação de reembolso.
- Os templates são HTML simples com as cores da marca.

### 8.7 Jobs do worker
| Job | Quando |
|---|---|
| Fechar a liga e criar os grupos novos | domingo 23:59 |
| Zerar as vidas para 5 | todo dia 00:00 |
| Verificar ofensivas quebradas e consumir protetores | todo dia 00:05 |
| Enviar lembretes | a cada 5 min (quem tem lembrete naquele horário) |
| Expirar pedidos Pix vencidos | a cada 10 min |
| Limpar sessões expiradas | todo dia 03:00 |
| Backup `pg_dump` em `/srv/fuse/backups`, guardando 14 diários e 8 semanais | todo dia 03:30 |

### 8.8 Segurança e LGPD
- HTTPS obrigatório (Caddy), HSTS, CSP restritiva (só o próprio domínio, `img-src data:` para o QR) e `helmet`.
- O CPF é guardado só para a cobrança. Nos logs e no admin, aparece mascarado: `***.123.456-**`.
- Exportar dados: `GET /me/exportar` devolve um JSON com perfil, pedidos e tentativas.
- Excluir conta: anonimiza o perfil e mantém o pedido por obrigação fiscal.
- Logs sem senha, token ou payload Pix.
- O webhook só é aceito com o token. Toda a entrada da API é validada com Zod.

---

## 9. Modelo de dados (PostgreSQL)

Os ids são `uuid`. As datas são `timestamptz`. As colunas estão em snake_case.

| Tabela | Colunas principais |
|---|---|
| `concursos` | id, nome, banca, orgao, municipio, uf, ano, status (`aguardando_edital`·`edital_publicado`·`prova_realizada`·`homologado`), data_prova, links (jsonb), ativo |
| `cargos` | id, concurso_id, nome, area, escolaridade, vagas, distribuicao (jsonb `{portugues:5,matematica:5,gerais:5,especificos:25}`) |
| `provas_origem` | id, banca, orgao, municipio, uf, ano, cargo, nivel, url_caderno, url_gabarito, url_recursos, hash_pdf, slug_fau |
| `disciplinas` | id, slug (`portugues`·`matematica`·`gerais`·`especificos`), nome, cor |
| `assuntos` | id, disciplina_id, nome, slug, dica_titulo, dica_texto, dica_exemplo |
| `questoes` | id, prova_origem_id (nullable), numero_origem, origem (`fau_real`·`autoral`), disciplina_id, assunto_id, areas (text[]), dificuldade, texto_apoio, enunciado, alternativas (jsonb `[{letra,texto}]`), gabarito, explicacao, dica_bolso, status, anulada_motivo, versao, criado_por, revisado_por, publicado_em |
| `unidades` | id, concurso_id, area (nullable = comum), ordem, titulo, disciplina_id |
| `secoes` | id, unidade_id, ordem, titulo, assunto_id, no_edital (bool, nullable) |
| `licoes` | id, secao_id, ordem, tipo (`normal`·`bau`·`desafio`), tamanho (5 ou 10) |
| `usuarios` | id, nome, email (único), cpf (único), celular, senha_hash, papel, acesso (bool), concurso_id, cargo_id, area, meta_diaria, lembrete_hora, apelido_liga, sons (bool), xp_total, gemas, vidas, vidas_atualizado_em, ofensiva, ofensiva_recorde, ultimo_dia_estudo (date), protetores, divisao, aceite_termos_em, versao_termos, criado_em, excluido_em |
| `sessoes` | id, usuario_id, token_hash, user_agent, ip, expira_em, criado_em |
| `redefinicoes_senha` | id, usuario_id, token_hash, expira_em, usado_em |
| `pedidos` | id, usuario_id, asaas_customer_id, asaas_payment_id (único), valor_centavos, status (`pendente`·`pago`·`vencido`·`estornado`), pix_payload, pix_imagem, pix_expira_em, pago_em, criado_em |
| `webhook_eventos` | id (id do evento Asaas, PK), evento, corpo (jsonb), recebido_em, processado_em |
| `progresso_licoes` | usuario_id, licao_id, vezes, melhor_precisao, concluida_em |
| `sessoes_estudo` | id, usuario_id, tipo (`licao`·`revisao`·`desafio`·`simulado`), licao_id, iniciada_em, concluida_em, xp_ganho, acertos, total |
| `tentativas` | id, id_cliente (único por usuário, para sync), usuario_id, questao_id, sessao_estudo_id, resposta, acertou, usou_dica, tempo_ms, respondida_em |
| `revisoes` | usuario_id, questao_id (PK composta), etapa (0–4), vence_em, status (`ativa`·`dominada`), atualizado_em |
| `simulados` | id, usuario_id, cargo_id, questoes (uuid[]), respostas (jsonb), iniciado_em, termina_em, entregue_em, pontos, acertos_por_bloco (jsonb) |
| `xp_eventos` | id, usuario_id, tipo, valor, criado_em, semana (date, segunda-feira) |
| `ligas_grupos` | id, semana, divisao, concurso_id |
| `ligas_membros` | grupo_id, usuario_id, xp_semana, alcancado_em, resultado (`subiu`·`ficou`·`desceu`) |
| `conquistas_usuario` | usuario_id, codigo, obtida_em |
| `reports` | id, usuario_id, questao_id, tipo, texto, status, resolvido_por, criado_em |
| `push_inscricoes` | id, usuario_id, endpoint, p256dh, auth, criado_em |
| `auditoria` | id, admin_id, acao, alvo, detalhes (jsonb), criado_em |

**Índices:**
- `questoes(status, assunto_id)`;
- `questoes using gin(areas)`;
- `revisoes(usuario_id, vence_em) where status='ativa'`;
- `tentativas(usuario_id, questao_id, respondida_em desc)`;
- `ligas_membros(grupo_id, xp_semana desc, alcancado_em)`.

---

## 10. API (prefixo `/api`)

| Método | Rota | Guarda | Descrição |
|---|---|---|---|
| POST | /auth/cadastro | — | cria a conta e abre a sessão |
| POST | /auth/login | — | login |
| POST | /auth/sair | login | encerra a sessão |
| POST | /auth/recuperar | — | envia o e-mail de redefinição |
| POST | /auth/redefinir | — | token e nova senha |
| GET | /me | login | perfil e contadores (vidas, gemas, ofensiva, revisões pendentes, meta) |
| PATCH | /me | login | preferências (cargo, meta, lembrete, apelido, sons) |
| GET | /me/exportar · DELETE /me | login | LGPD |
| POST | /pagamento/pix | login | gera ou reaproveita o Pix |
| GET | /pagamento/status | login | consulta o pagamento |
| POST | /webhooks/asaas | token | webhook |
| GET | /concurso | acesso | dados do concurso, status do edital, cargos |
| GET | /trilha | acesso | unidades, seções e lições com o estado do aluno |
| GET | /guia/:unidadeId | acesso | dicas da unidade |
| POST | /licoes/:id/iniciar | acesso | sorteia as 5 questões e cria a sessão de estudo |
| POST | /sessoes/:id/responder | acesso | responde uma questão e devolve o gabarito, a explicação, o XP, as vidas e o combo |
| POST | /sessoes/:id/dica | acesso | gasta 5 gemas e devolve a dica |
| POST | /sessoes/:id/concluir | acesso | fecha a sessão e devolve o resumo, a ofensiva e as conquistas |
| POST | /sync/tentativas | acesso | lote offline |
| GET | /offline/pacote | acesso | próximas 3 lições e revisão vencida |
| GET | /revisao | acesso | pendentes por disciplina |
| POST | /revisao/iniciar | acesso | sessão de revisão (filtro opcional por disciplina) |
| POST | /simulados | acesso | cria um simulado (cargo) |
| GET | /simulados · /simulados/:id | acesso | histórico e detalhe |
| PUT | /simulados/:id/resposta | acesso | salva uma resposta (sem feedback) |
| POST | /simulados/:id/entregar | acesso | corrige e devolve o resultado |
| GET | /liga | acesso | grupo da semana e posição |
| GET | /perfil/estatisticas | acesso | estatísticas, domínio e conquistas |
| POST | /questoes/:id/report | acesso | reportar problema |
| POST | /push/inscrever · DELETE /push | acesso | Web Push |
| * | /admin/** | admin | CRUD de concursos, provas, questões, trilhas, edital, pedidos, reembolso, reports, usuários |

**Padrão de erro:** `{ erro: "mensagem em português para o usuário", codigo?: "..." }`.

**Regra de ouro:** a API **nunca** envia o gabarito antes da resposta, exceto no pacote offline. No pacote offline, o gabarito vai cifrado com uma chave por sessão, e o XP é sempre recalculado no servidor durante o sync.

---

## 11. Textos-chave (copy)

- **Aviso do edital:** "Quando o edital de Palmital sair, as trilhas e os simulados se ajustam ao seu cargo, sem custo extra."
- **Variações de acerto:** "Mandou bem!", "Isso aí!", "Certinho!", "Boa, {nome}!", "Tá voando!".
- **Variações de erro:** o título é sempre "Resposta correta: X", sem frases de culpa.
- **Termos de uso:** devem conter:
  - produto digital de acesso único;
  - validade até a homologação do concurso de Palmital ou 24 meses, o que vier primeiro;
  - direito de arrependimento de 7 dias;
  - questões reais com fonte citada e remoção mediante pedido do titular;
  - nenhuma garantia de aprovação;
  - o produto não é afiliado à FAU nem à Prefeitura.
- **Rodapé legal** em Boas-vindas e Pagamento: "Fuse Aprova não tem vínculo com a FAU-Unicentro nem com a Prefeitura de Palmital."

---

## 12. Critérios de aceite

**Acesso e pagamento**
- [ ] Uma conta sem pagamento confirmado recebe 402 em qualquer rota de conteúdo, e a PWA a redireciona para `/pagamento`.
- [ ] No sandbox do Asaas, pagar o Pix libera o acesso em menos de 10 s, sem recarregar a página.
- [ ] Repetir o mesmo webhook 5 vezes não duplica nada.
- [ ] Um webhook com token errado recebe 401 e não altera nada.
- [ ] O estorno revoga o acesso e derruba as sessões.

**Lição e gamificação**
- [ ] Uma lição tem 5 questões e o VERIFICAR fica desabilitado até a seleção.
- [ ] O feedback mostra a explicação.
- [ ] Errar numa lição de trilha tira 1 vida; com 0 vidas a lição inicia e continua normalmente (vidas não travam o treino).
- [ ] O XP de uma lição com 4 de 5 acertos é 45; com 5 de 5, é 65.
- [ ] Uma questão errada aparece na revisão no dia seguinte e some depois de 4 acertos espaçados.
- [ ] A ofensiva sobe com a primeira lição do dia e zera depois de um dia sem estudo e sem protetor.
- [ ] A liga fecha no domingo, move os 3 primeiros e os 3 últimos, e cria os grupos novos.

**Simulado**
- [ ] O simulado tem exatamente 5/5/5/25 questões do cargo (ou a distribuição do edital).
- [ ] O cronômetro é do servidor e a entrega é automática ao fim das 4 h.
- [ ] A nota é calculada com os pesos 2,0 e 2,8.

**Conteúdo**
- [ ] Nenhuma questão `rascunho`, `anulada` ou `retirada` aparece para o aluno.
- [ ] Retirar uma questão no admin a remove do app do aluno no próximo carregamento, inclusive offline.
- [ ] Toda questão `fau_real` mostra o chip de origem.

**PWA**
- [ ] O app é instalável no Android e iOS. O Lighthouse PWA passa.
- [ ] Em modo avião, o aluno faz a próxima lição e a revisão vencida. Ao voltar a conexão, o XP sincroniza sem duplicar.

**Qualidade**
- [ ] As 13 telas implementadas batem visualmente com `design/png` em 390×844 (comparação por Playwright, com tolerância de diferença de 2%).
- [ ] Axe sem violações sérias. Toda a lição é navegável por teclado.
- [ ] O LCP é menor que 2,5 s em 4G lento no Moto G (Lighthouse mobile). O bundle inicial tem menos de 200 kB gzip.
- [ ] Os testes de unidade de `packages/shared` (XP, ofensiva, revisão, liga, CPF, nota do simulado) têm 100% de cobertura de linhas.

**Infra**
- [ ] `docker compose up -d` na VPS sobe tudo com HTTPS.
- [ ] O backup diário existe e o restore está documentado e testado.

---

## 13. Métricas
| Métrica | Meta |
|---|---|
| Conversão do Cadastro para pago | ≥ 40% |
| Retenção D7 dos pagantes | ≥ 30% |
| Lições por aluno por semana | ≥ 5 |
| Pagantes com ofensiva de 7 dias ou mais | ≥ 25% |
| Pedidos de reembolso | ≤ 5% |
| Melhora de acerto por assunto entre a 1ª e a 5ª tentativa | ≥ +20 pp |

As métricas são calculadas por SQL sobre as tabelas próprias e aparecem no painel admin. Não há analytics de terceiros.

---

## 14. Riscos

| Risco | Mitigação |
|---|---|
| Uso comercial de questões reais | Fonte sempre citada, retirada em minutos, termos claros, parecer jurídico recomendado |
| Gabarito ou explicação errados | Só o gabarito definitivo, revisão humana obrigatória, reports com auto-retirada a partir de 3 |
| O edital mudar a banca ou a estrutura | O modo edital é dirigido por dados, sem deploy |
| O concurso atrasar ou ser cancelado (como em 2023) | Termos com validade definida; base reaproveitável para outros municípios FAU |
| Lei Orgânica ou Estatuto desatualizados | Obter os textos vigentes na Câmara antes de escrever as questões |
| Webhook falhar | Polling de status com consulta direta ao Asaas após 60 s |

---

## 15. Fontes
- Edital FAU, Paula Freitas 2026: https://paulafreitas.pr.gov.br/uploads/pagina/arquivos/REPUBLICACAOEDITALCONCURSOPUBLICO-PAULAFREITAS.pdf
- Anexo II, conteúdo programático: https://www.concursosfau.com.br//sistema/uploads/REPUBLICACAO_ANEXO_II_-_CONTEUDO_PROGRAMATICO_-_OK.pdf
- FAU, concursos encerrados: https://www.concursosfau.com.br/novo/encerrados/
- PCI Concursos, provas FAU-Unicentro: https://www.pciconcursos.com.br/provas/fau-unicentro
- Portal Douglas, FAU elabora o edital de Palmital (10/09/2026): https://www.portaldouglas.com.br/2026/09/concurso-publico-de-palmital.html
- Portal de concursos da Prefeitura de Palmital-PR: https://palmital.pr.gov.br/portal/portal-concursos.php?pesquisar=1
- Documentação Asaas: https://docs.asaas.com
