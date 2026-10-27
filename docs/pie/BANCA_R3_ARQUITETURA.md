# Banca R3: Arquitetura, engenharia e dados

Revisor R3 (arquiteto sênior). Data: 27/10/2026. Modo: só auditoria (nenhum arquivo do projeto foi alterado além deste parecer).
Linha de base informada pela coordenação: typecheck e lint com exit 0, API 257/257, shared, db, worker e crawler aprovados.

## Resumo dos achados

| ID | Sev. | Estado | Local | Uma linha |
|---|---|---|---|---|
| R3-01 | ALTA | CONFIRMADO | apps/api/src/servicos/offline.ts:89-180 | O sync offline aceita sessões e respostas arbitrárias: a mesma questão N vezes, lição bloqueada ou desafio. Isso gera XP, liga, gemas, progresso e coroa sem limite. |
| R3-02 | ALTA | CONFIRMADO | offline.ts:74-76 e 179; estudo.ts:562; progresso.ts:241 | Datas retroativas no sync reconstroem a ofensiva: 0→30 dias, +400 gemas e conquistas `ofensiva_7` e `ofensiva_30`. |
| R3-03 | MÉDIA | CONFIRMADO | apps/api/src/servicos/pagamento.ts:38-98 e 197-203 | Pix gerado em duplicidade em corrida: 2 cobranças pendentes. O estorno de uma revoga o acesso mesmo com a outra paga. |
| R3-04 | MÉDIA | FORTE INDÍCIO | apps/worker/src/jobs/diarios.ts:32-48 | `verificar-ofensivas` grava valores lidos sem trava (lost update) sobre a ofensiva, os protetores e o último dia do aluno. |
| R3-05 | MÉDIA | FORTE INDÍCIO | apps/worker/src/jobs/liga.ts:23-28; agenda.ts:56 | O fechamento da liga não recupera execução perdida e, rodado manualmente na segunda, fecha a semana nova. O XP do último minuto cai em grupo já fechado. |
| R3-06 | MÉDIA | FORTE INDÍCIO | apps/api/src/servicos/simulado.ts:84-150 | `criarSimulado` sem transação nem índice único "1 aberto por aluno". Requisições simultâneas podem abrir 2 simulados. |
| R3-07 | BAIXA | FORTE INDÍCIO | apps/web/src/offline/fila.ts:61-66; offline.ts:166-180 | Com mais de 500 respostas na fila, a sessão é finalizada com tentativas parciais e o lote seguinte entra numa sessão já concluída. |
| R3-08 | BAIXA | FORTE INDÍCIO | apps/api/src/servicos/progresso.ts:115-147 | A entrada simultânea na liga sem grupo aberto cria 2 grupos de 1 membro, porque não há trava quando a lista está vazia. |
| R3-09 | BAIXA | FORTE INDÍCIO | pagamento.ts:170-193 | Um webhook de pagamento numa conta excluída (LGPD) liga `acesso=true` e manda e-mail ao endereço anonimizado. |
| R3-10 | BAIXA | HIPÓTESE | simulado.ts:320 | `entregarExpirados` para no primeiro erro, e um simulado com problema bloqueia a entrega dos demais. |
| R3-11 | BAIXA | CONFIRMADO | worker util.ts:21; pagamento.ts:102 | Travas e caches em memória: só valem com 1 instância (hoje é assim). O mapa `ultimaConsulta` cresce sem limite. |
| R3-12 | BAIXA | CONFIRMADO | apps/web/mock/servidor.ts:637, 800, 836, 866 | O mock (só dev e capturas) repete as regras com literais (200, 20, 5, vidas−1) em vez de usar as constantes do shared. Há risco de divergência visual. |

---

## Achados detalhados

### R3-01: o sync offline não valida o conteúdo das sessões e infla XP, liga, gemas, progresso e coroa
- **Categoria:** integridade de dados, servidor como fonte da verdade e antifraude.
- **Severidade:** ALTA. Qualquer aluno pagante, com uma única requisição, consegue resultados arbitrários na liga (ranking público entre alunos, promoção e +50 gemas), gemas, conquistas e destravamento da trilha. Isso contraria a regra "o servidor é a fonte da verdade" do CLAUDE.md. Não envolve dinheiro, por isso a severidade não é CRÍTICA.
- **Estado:** CONFIRMADO por um teste executado.
- **Código:** `apps/api/src/servicos/offline.ts`:
  - 89-104: insere qualquer `licaoId` existente, sem conferir se a lição está liberada (`licaoAbrivel`) nem se é do concurso do aluno.
  - 118-160: a deduplicação é só por `idCliente`. Não verifica se a questão pertence à lição nem se já foi respondida na sessão. Também ignora `pacoteId`, que não é checado.
  - 166-180: a finalização paga `GEMAS.CONCLUIR_LICAO`, grava `progresso_licoes` com a precisão calculada e conclui a lição.
- **Reprodução** (`scratchpad/r3/sync.test.ts`, caso R3-01a):
  - Aluno pago novo.
  - Uma única chamada a `POST /sync/tentativas` com 50 sessões `tipo:'licao'`, cada uma com `licaoId` = um **desafio bloqueado**, e 10 tentativas por sessão, **todas com a mesma questão** e o gabarito tirado do pacote.
- **Observado:**
  - `status 200 aceitas 500 xpGanho 5750`;
  - gemas de 0 para 250;
  - `progresso_licoes` do desafio com `vezes 50, melhorPrecisao 100, concluida`;
  - na trilha, o desafio aparece como `concluida`.
  - Com precisão ≥ 70 num desafio de Português, a contagem de coroas usada para conquistas (progresso.ts, `verificarConquistas`) também é afetada.
- **Esperado:** cada tentativa offline corresponde a uma questão entregue num pacote válido (`pacoteId` emitido para o aluno), a lição é a do pacote e está liberada, cada questão conta uma vez por sessão e a sessão tem no máximo `licao.tamanho` questões.
- **Impacto:** fraude no ranking da liga, nas gemas e nas conquistas. Também permite pular a trilha, porque o aluno conclui lições e desafios sem estudar.
- **Correção proposta:**
  1. Persistir o pacote emitido (`pacotes_offline`: id, usuário, expiração, lições e questões permitidas) ou assiná-lo com HMAC e devolvê-lo no sync.
  2. Rejeitar sessões cujo `licaoId` não esteja no pacote nem em `licaoAbrivel`.
  3. Rejeitar tentativas de questões fora da sessão do pacote e repetidas na mesma sessão. O índice único `(sessao_estudo_id, questao_id)` em `tentativas` exige uma migração nova, porque as versionadas são imutáveis.
  4. Limitar as sessões concluídas por dia.
- **Teste de aceite:**
  - Repetir R3-01a: as 499 tentativas duplicadas da mesma questão e as sessões com `licaoId` bloqueado ou fora do pacote vêm em `rejeitadas`.
  - XP ≤ 10 × tamanho da lição.
  - Sem gemas para sessão inválida.
  - O desafio continua `bloqueada`.

### R3-02: a ofensiva é reconstruída retroativamente pelo sync
- **Categoria:** regra de "dia" e ofensiva, antifraude.
- **Severidade:** ALTA. Gera gemas (marcos de 7, 30 e 100 dias) e conquistas, e anula a mecânica central de retenção.
- **Estado:** CONFIRMADO.
- **Código:**
  - `offline.ts:74-76`: `limitar` só corta datas no futuro, sem limite inferior.
  - `offline.ts:179`: `finalizarSessao(..., concluidaEm)`.
  - `estudo.ts:562`: a ofensiva é registrada no `diaSP(concluidaEm)`.
  - `progresso.ts:241`: só recusa dias anteriores a `ultimoDiaEstudo`. Com `ultimoDiaEstudo` nulo ou antigo, cada sync com um dia posterior encadeia a ofensiva.
- **Reprodução** (caso R3-01b): aluno novo, 30 syncs sucessivos, cada um com 1 sessão e 1 tentativa datadas de D−30 até D−1.
- **Observado:** `ofensiva 0 -> 30, recorde 30, gemas 0 -> 400`, conquistas `ofensiva_7` e `ofensiva_30`.
- **Esperado:** o offline só pode valer para o período do pacote. Atividade com data anterior a `geradoEm` do pacote (ou a mais de N horas do envio) não conta para a ofensiva nem para os marcos, ou conta no máximo para "ontem" dentro de uma janela curta. Esta decisão deve ir para `docs/DECISOES.md`.
- **Correção proposta:** prender `iniciadaEm`, `respondidaEm` e `concluidaEm` ao intervalo [`geradoEm` do pacote, agora]. Datas fora dele são rejeitadas, ou aceitas sem ofensiva nem marcos.
- **Teste de aceite:** com R3-01b, a ofensiva fica ≤ 1 e não há gemas de marco.

### R3-03: Pix duplicado em corrida e estorno que revoga o acesso apesar de outro pedido pago
- **Categoria:** concorrência e pagamento.
- **Severidade:** MÉDIA. Exige dois cliques ou duas abas simultâneas, mas o resultado é cobrança dupla possível (R$ 794) e perda de acesso de quem pagou.
- **Estado:** CONFIRMADO no PGlite (`scratchpad/r3/corrida.test.ts`, caso R3-04).
- **Código:**
  - `pagamento.ts:38-98`: `gerarPix` faz SELECT do pendente → cria no Asaas → INSERT, sem trava no usuário e sem índice único parcial `pedidos(usuario_id) WHERE status='pendente'`.
  - `pagamento.ts:197-203`: `estornarPagamento` faz `acesso=false` sem verificar outros pedidos pagos. O estorno manual (`pagamentoManual.ts:157-161`) faz essa verificação, então o comportamento é inconsistente entre os dois caminhos.
- **Observado:**
  - Dois `POST /pagamento/pix` em `Promise.all` responderam `200, 200`, com 2 pedidos pendentes e 2 `asaasPaymentId` diferentes.
  - Depois de pagar os dois e estornar um: `acesso false`, status `['pago','estornado']`.
- **Esperado:** um único pendente por aluno. O estorno só revoga o acesso se não restar outro pedido `pago`.
- **Correção proposta:**
  - `travarUsuario` (SELECT … FOR UPDATE) no começo do `gerarPix`. A chamada ao Asaas fica dentro da trava, ou se usa um pedido "reservando" inserido antes.
  - Índice único parcial numa migração nova.
  - Em `estornarPagamento`, a mesma checagem de `ne(pedidos.id, …)` com status `pago` do estorno manual.
- **Teste de aceite:** repetir R3-04 e obter 1 pedido e, no fim do cenário, `acesso true`.

### R3-04: `verificar-ofensivas` com lost update
- **Categoria:** job e concorrência.
- **Severidade:** MÉDIA.
- **Estado:** FORTE INDÍCIO (inspeção; não reproduzível de forma determinística no PGlite).
- **Código:** `apps/worker/src/jobs/diarios.ts:32-48`. Lê todos os candidatos sem `FOR UPDATE` e depois grava `ofensiva`, `protetores` e `ultimoDiaEstudo` **absolutos** calculados a partir da leitura antiga.
- **Cenário:** às 00:05, entre a leitura e o UPDATE, o aluno conclui uma lição (`registrarOfensivaSeContou` grava `ofensiva=1` e `ultimoDia=hoje`) ou compra um protetor (`meComprarProtetor`). O job sobrescreve com `ofensiva=0` e o `ultimoDia` antigo, ou devolve os protetores ao valor anterior.
- **Correção proposta:** processar por usuário numa transação com `travarUsuario` e recalcular a partir da linha travada, ou usar um UPDATE condicional (`WHERE ultimo_dia_estudo = <lido> AND protetores = <lido>`).
- **Teste de aceite:** um teste unitário que injeta uma escrita concorrente entre a leitura e a gravação (via `Db` falso ou duas conexões Postgres) e verifica que o estado do aluno é preservado.

### R3-05: fechamento da liga frágil a falhas e a execução manual
- **Categoria:** job, agendamento e semana em São Paulo.
- **Severidade:** MÉDIA.
- **Estado:** FORTE INDÍCIO.
- **Código:** `agenda.ts:56` (`fecharLiga(db, agora(), semanaSP(agora()))`) e `liga.ts:23-28` (fecha todo grupo com `semana <= semanaSP(agora)`).
- **Problemas:**
  - (a) O node-cron não recupera execuções perdidas. Se o worker estiver fora no domingo às 23:59, a semana só fecha no domingo seguinte, junto com a nova. Enquanto isso, a divisão da semana nova foi formada com a divisão antiga e não sai resultado na segunda.
  - (b) A execução manual documentada (`node dist/index.js fechar-liga`) feita na segunda para recuperar o atraso fecha também os grupos da **semana corrente**, recém-abertos.
  - (c) O XP ganho entre 23:59:00 e 23:59:59 de domingo continua sendo somado em `ligas_membros` de grupo já fechado, porque `somarNaLiga` não olha `fechadoEm`. Um aluno que ganha o primeiro XP da semana nesse minuto cria um grupo novo, que só fecha uma semana depois.
- **Correção proposta:**
  - O job fecha apenas `semana < semanaSP(agora)`, rodando à 00:00 de segunda, ou recebe a semana explícita na execução manual.
  - Ao subir, o worker fecha as semanas anteriores pendentes.
  - `somarNaLiga` ignora membros de grupo fechado.
- **Teste de aceite:** rodar `fecharLiga` numa segunda às 08:00 não fecha os grupos da semana corrente. Ao reiniciar o worker com uma semana anterior aberta, ela é fechada.

### R3-06: simulados simultâneos
- **Severidade:** MÉDIA.
- **Estado:** FORTE INDÍCIO.
- **Código:** `simulado.ts:84-150`. Faz SELECT do aberto e depois INSERT fora de transação. Não há índice único parcial `simulados(usuario_id) WHERE entregue_em IS NULL`; `simulados_abertos_idx` é só um índice comum em `termina_em`.
- **Teste:** com 3 `POST /simulados` em `Promise.all` no PGlite, saiu **1** simulado aberto (o PGlite serializou). Por isso o estado é FORTE INDÍCIO, não CONFIRMADO: no Postgres real, com pool, a janela existe.
- **Impacto:** dois simulados abertos. O histórico mostra só um em andamento, e o outro é entregue automaticamente e conta XP e ofensiva.
- **Correção proposta:** `travarUsuario` + transação, ou índice único parcial (migração nova) com tratamento de 23505 que devolve o aberto.
- **Teste de aceite:** um teste com Postgres real (CI) disparando N criações e esperando 1 linha aberta.

### R3-07: lote de sync acima de 500 tentativas finaliza a sessão com respostas parciais
- **Severidade:** BAIXA.
- **Estado:** FORTE INDÍCIO.
- **Código:**
  - `fila.ts:61-66`: `tentativas.slice(0,500)` na ordem das chaves (UUID aleatório, não cronológica). As sessões vão com `concluidaEm` mesmo sem todas as tentativas no lote.
  - `offline.ts:166-180`: finaliza a sessão se houver alguma tentativa.
  - `offline.ts:147`: insere tentativas sem checar `s.concluidaEm`.
- **Impacto:** precisão, bônus e progresso calculados sobre um subconjunto. As tentativas seguintes caem numa sessão já fechada.
- **Correção proposta:** só finalizar no servidor quando o número de tentativas da sessão bater com o declarado, e no cliente ordenar por sessão e por `respondidaEm`.

### R3-08: corrida na criação de grupo da liga
- **Severidade:** BAIXA.
- **Estado:** FORTE INDÍCIO.
- **Código:** `progresso.ts:115-147`. O `FOR UPDATE` só trava grupos que já existem. Com lista vazia, dois alunos de divisão ou concurso sem grupo pré-criado inserem 2 grupos.
- **Impacto:** grupos de 1 membro, que sobem com XP mínimo.
- **Correção proposta:** `pg_advisory_xact_lock(hash(semana, concurso, divisão))` antes da busca.

### R3-09: pagamento confirmado em conta excluída
- **Severidade:** BAIXA.
- **Estado:** FORTE INDÍCIO.
- **Código:** `pagamento.ts:170-193`. `confirmarPagamento` não olha `excluidoEm` (o estorno olha) e envia boas-vindas para `excluido+<id>@fuse.invalid`.
- **Correção proposta:** se `excluidoEm`, registrar o pedido como pago sem religar o acesso nem enviar e-mail, e sinalizar ao superadmin para reembolso.

### R3-10: `entregarExpirados` para no primeiro erro
- **Severidade:** BAIXA.
- **Estado:** HIPÓTESE (não encontrei um gatilho concreto de erro).
- **Código:** `simulado.ts:320`. Um `for … await entregar` sem try/catch por item.
- **Correção proposta:** capturar o erro por simulado, registrar no log e seguir para o próximo.

### R3-11: travas e caches só em memória
- **Severidade:** BAIXA.
- **Estado:** CONFIRMADO por leitura.
- **Código:**
  - `worker/util.ts:21`: o `emExecucao` é um Set do processo.
  - `pagamento.ts:102`: o `ultimaConsulta` é um Map que nunca é limpo.
- Hoje o deploy tem um worker só (`container_name: fuseaprova-worker`) e a API em instância única, então o risco está latente. Uma execução manual concorrente com o cron não é bloqueada. `fecharLiga` se protege por grupo; os demais jobs são aproximadamente idempotentes.
- **Correção proposta:** `pg_try_advisory_lock(nome_do_job)` em `executarRegistrado`, e um TTL ou limpeza no Map.

### R3-12: mock duplica regras com literais
- **Severidade:** BAIXA. Não entra no build (`apply: 'serve'`, modo `mock`).
- **Estado:** CONFIRMADO.
- **Código:** `apps/web/mock/servidor.ts:637` (protetor 200), 800 (baú 20), 836 (vidas−1), 866 (dica 5).
- O mock valida corpo e resposta com os contratos Zod de `ROTAS`, o que reduz o risco de deriva de contrato, mas não de regra.
- **Correção proposta:** usar `GEMAS.*` e `vidasAposResposta` do shared.

---

## O que foi inspecionado
- **API, serviços:** `estudo.ts`, `progresso.ts`, `offline.ts`, `webhook.ts`, `conciliacao.ts`, `pagamento.ts`, `pagamentoManual.ts` (travas), `simulado.ts`, `lgpd.ts`.
- **API, demais arquivos:** `rotas/me.ts` (protetor), `rotas/offline.ts`, `index.ts` (varredura de simulados), `http/erros.ts` e o `setErrorHandler`.
- **Worker:** `agenda.ts`, `index.ts`, `util.ts`, `jobs/liga.ts`, `jobs/diarios.ts`, `jobs/comunicacoes.ts` e `jobs/lembretes.ts` (por amostragem).
- **Shared:** `datas.ts`, `ofensiva.ts`, `liga.ts` (fechar e escolher grupo), `gemas.ts`, `api/offline.ts`, cron de `JOBS_WORKER`.
- **DB:** `schema/tabelas.ts` (constraints, FKs, índices e cascatas) e as migrações 0000 a 0003.
- **Web:** `src/api/cliente.ts`, `src/offline/fila.ts`, `vite.config.ts`, `mock/servidor.ts` (por amostragem).
- **Deploy:** `deploy/docker-compose.yml` (instâncias do worker).

## O que foi testado (comandos e resultado real)
1. **Drift entre o schema e as migrações:**
   - Comando: cópia de `packages/db/drizzle` para `scratchpad/r3/drizzle`, depois `npx tsx --conditions=@fuse/source ./node_modules/drizzle-kit/bin.cjs generate --config scratchpad/r3/drizzle.config.ts` (com `out` apontando para o scratchpad).
   - Resultado: **"No schema changes, nothing to migrate"**. Não há drift entre `tabelas.ts` e o snapshot 0003.
   - `git status packages/db`: limpo. As migrações SQL não têm SQL manual além do gerado (CHECK `questoes_gabarito_ck` está no schema).
2. **Sync:** `npx vitest run --config scratchpad/r3/vitest.r3.config.ts --root scratchpad/r3` com `sync.test.ts`. 2 testes passaram e reproduziram R3-01 (5750 XP, 250 gemas, desafio bloqueado concluído) e R3-02 (ofensiva 0→30, +400 gemas, 2 conquistas).
3. **Corridas:** a mesma configuração com `corrida.test.ts`, 2 testes:
   - R3-03 reproduzido: 2 pedidos pendentes e acesso revogado com um pedido pago;
   - criação simultânea de simulado sem duplicata no PGlite.
4. **Fuso:** busca de `getDay|getDate|setHours|getHours|toISOString().slice(0,10)|toLocaleDateString|getMonth|getFullYear` em api, worker, shared, db e web. Só 2 ocorrências, ambas na UI e sem regra de dia: o ano padrão em `admin/telas/Concursos.tsx:85` e o nome do arquivo em `Configuracoes.tsx:138`. Nenhum `new Date()` decide "dia" no servidor.

## O que não foi testado e limitações
- Não houve Postgres real nem Docker. O PGlite serializa, então R3-04, R3-06 e R3-08 ficaram em FORTE INDÍCIO.
- Não rodei a suíte completa nem o E2E (rodavam em paralelo). Nada foi testado em produção.
- Não auditei o crawler, o admin/superadmin em profundidade, a PWA (service worker) nem o desempenho com volume real (índices só por leitura).

## Pontos fortes verificados
- **Caminho online bem serializado:**
  - `responder`, `usarDica` e `concluir` travam a sessão com `FOR UPDATE` e depois o usuário, sempre nessa ordem;
  - `entregar` trava o simulado e depois o usuário;
  - a compra de protetor usa `travarUsuario`.
  - Não encontrei inversão de ordem de trava (deadlock) entre os caminhos.
- **Idempotência:**
  - resposta repetida por `idCliente` ou questão devolve o mesmo resultado sem efeitos;
  - webhook com `id` único, reprocessável, e `confirmar`/`estornar` com `FOR UPDATE` e verificação de estado;
  - `entregar` é idempotente;
  - `fecharLiga` trava cada grupo e checa `fechadoEm`;
  - o sync é idempotente por `(usuario_id, id_cliente)` (unique em `tentativas` e `sessoes_estudo`).
- **Regras puras do shared** (xp, vidas, gemas, ofensiva, revisão, liga, nota) usadas de fato pela API, sem reimplementação no servidor.
- **Datas:** `datas.ts` só com Intl, tratando o horário de verão em `inicioDoDiaSP`. Os jobs agendam com `timezone: America/Sao_Paulo`.
- **Schema coerente com as migrações** (sem drift), com FKs e cascatas sensatas: `tentativas.questao_id` sem cascata preserva o histórico, e `pedidos.usuario_id` sem cascata convive com a anonimização da LGPD.
- **Front com os mesmos schemas Zod:** valida o corpo antes de enviar. O mock confere as respostas contra os contratos.

## Artefatos (fora do repositório)
`C:\Users\fusea\AppData\Local\Temp\claude\c--FuseDev-fuseaprova\5c01e833-c735-4764-be3d-7df5d2680052\scratchpad\r3\` (`sync.test.ts`, `corrida.test.ts`, `vitest.r3.config.ts`, `drizzle.config.ts`, `drizzle/`).
