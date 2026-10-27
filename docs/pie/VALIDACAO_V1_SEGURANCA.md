# Validação V1: segurança, receita e regras de jogo

**Escopo:** as correções dos commits `6a2cb43..HEAD` (de `5c264ef` até `fa6b6a3`), com foco no sync offline, no pagamento e webhook, na guarda do admin, no push, no `dataSql` e nos jobs de liga e ofensiva.
**Método:** leitura do diff e testes de prova escritos fora do repositório (`<scratchpad>/v1/test/offline.test.ts` e `pagamento.test.ts`), rodados com `npx vitest run --globals --dir <scratchpad>/v1` contra o **Postgres 16 real** (`TESTE_DATABASE_URL=postgres://fuse@127.0.0.1:55432/postgres`). Não alterei nenhum arquivo do projeto além deste parecer.
**Data:** 27/10/2026.

## Resumo

| ID | Sev. | Estado | Tema |
|---|---|---|---|
| V1-01 | **Alta** | CONFIRMADO | Revisão offline datada antes do vencimento dá XP infinito |
| V1-02 | Média | CONFIRMADO | Lição concluída offline com 1 resposta (com bônus de "perfeita"); avança sem pacote |
| V1-03 | Média | CONFIRMADO | Refazer lição concluída em lotes seguidos rende gemas e XP com 1 resposta |
| V1-04 | Média | CONFIRMADO | **Caminho legítimo quebrado:** a lição do pacote depois de um baú é recusada no sync |
| V1-05 | Baixa | CONFIRMADO | O `expiraEm` do pacote não é conferido no sync |
| V1-06 | Baixa | CONFIRMADO | Sessão já concluída aceita tentativas novas, e o resumo fica congelado |
| V1-07 | Média | CONFIRMADO | `valor_divergente` é contornado pelo `GET /pagamento/status` (e pela conciliação) |
| V1-08 | Média | CONFIRMADO | Chamadas ao Asaas dentro da transação seguram o pool e travam a API de todos |
| V1-09 | Baixa | FORTE INDÍCIO | Deadlock entre `gerarPix` e `confirmarPagamento` (ordem de travas invertida) |
| V1-10 | Baixa | FORTE INDÍCIO | Inscrições de push antigas não são revalidadas, e o worker não valida no envio |
| V1-11 | Baixa | CONFIRMADO | O admin lê IP e user-agent das sessões do superadmin |
| V1-12 | Info | HIPÓTESE | A ordem das sessões compara `iniciadaEm` como texto |

---

## Achados

### V1-01: XP infinito com revisão offline datada antes do vencimento (Alta, CONFIRMADO)
- **Onde:** `apps/api/src/servicos/offline.ts:300-305` (`recusaDaTentativa` confere `venceEm <= agora`), `:216` (a data da tentativa é presa a `[iniciadaEm, agora]`) e `:229-231` (`aplicarRevisao` com a data do aparelho, seguido de `creditarXp`), junto com `packages/shared/src/revisao.ts:44-45` (`revisaoAposAcerto` não avança se o item não estava vencido em `em`).
- **Reprodução** (teste `V1-01`):
  1. O aluno erra uma questão online. A revisão dela vence amanhã às 00:00.
  2. Ele baixa um pacote hoje.
  3. No dia seguinte, manda 3 lotes de 50 sessões `revisao`, cada uma com a mesma questão certa e `respondidaEm` igual a "hoje + 1 min", antes do vencimento.
  - **Resultado:** 150 tentativas aceitas e **+1.500 XP**. A revisão continua `etapa 0` e vencida (`2026-10-21T03:00Z`), então dá para repetir sem limite.
- **Por que acontece:** a validade da tentativa é medida em `agora`, mas o efeito na revisão é medido na data do aparelho. Acertar "antes do vencimento" não avança o item, então ele segue vencido para a próxima sessão. Também não há limite de sessões de revisão por lote, nem de lotes.
- **Impacto:** XP e liga sem limite (a classificação semanal e as +50 gemas de promoção ficam fraudáveis). O atacante só precisa de um pacote gerado antes do vencimento e do gabarito, que vem no próprio pacote ou no feedback online.
- **Correção sugerida:**
  - Exigir `venceEm <= em`, a data efetiva da tentativa.
  - Aceitar cada questão de revisão no máximo uma vez por lote e por dia em São Paulo.
  - O ideal é gravar em `pacotes_offline` os ids das questões entregues (lições e revisão) e recusar tentativas fora dessa lista.

### V1-02: lição concluída offline com 1 resposta, sem precisar de pacote (Média, CONFIRMADO)
- **Onde:** `offline.ts:236-248`. A única exigência é `feitas.length > 0` (`:241`). O `concluir` online (`estudo.ts:592-598`) exige todas as questões.
- **Reprodução:**
  - **Teste `V1-02`:** uma sessão por lição normal, cada uma com 1 resposta certa e `concluidaEm`, com `pacoteId: null`. As 3 primeiras lições (tamanho 5) foram concluídas com 25 XP cada (10 + 5 + 10 de "perfeita") e 5 gemas cada. As seguintes só pararam no baú.
  - **Teste `V1-02b`:** abrindo o baú online entre os lotes, 3 lotes concluíram 9 lições normais com 1 resposta cada, nenhuma delas vinda de pacote.
- **O que resistiu:** lição bloqueada, desafio e baú continuam recusados ("Lição indisponível offline."), e repetir a mesma lição no mesmo lote também.
- **Impacto:** a trilha anda sem estudo, com bônus de lição perfeita e gemas. O limite de 3 lições do pacote não existe no servidor.
- **Correção sugerida:**
  - Exigir `feitas.length >= min(licao.tamanho, questões do pacote para a lição)` para concluir.
  - Aceitar só lições e questões registradas no pacote (`pacoteId` obrigatório para sessão nova).

### V1-03: farm de gemas e XP refazendo lições concluídas (Média, CONFIRMADO)
- **Onde:** `offline.ts:275`. `licoesNoLote` só vale dentro do lote, e `licaoAbrivel` aceita lição concluída.
- **Reprodução** (teste `V1-03`): 5 lotes, cada um com a mesma lição já concluída, 1 resposta certa e `concluidaEm`.
  - **Resultado:** **+25 gemas e +125 XP** com 5 respostas. Online, cada repetição exige as 5 questões sorteadas pelo servidor.
- **Correção:** a mesma da V1-02 (mínimo de respostas e vínculo com o pacote). Avaliar também um limite de repetições premiadas por dia.

### V1-04: o caminho legítimo perde a lição do pacote que vem depois de um baú (Média, CONFIRMADO, regressão)
- **Onde:** `offline.ts:36-39`. `montarPacote` pega as próximas 3 lições **normais** e pula baú e desafio. Já `validarSessaoOffline` (`:268-282`) exige `licaoAbrivel`, e o baú só abre online.
- **Reprodução** (teste `V1-04`):
  1. O aluno faz 1 lição online. O pacote vem com as posições `[1, 2, 4]` da trilha, e o baú está na posição 3 (cada seção tem 3 normais e 1 baú).
  2. Ele faz as 3 lições offline e sincroniza.
  - **Resultado:** 10 tentativas aceitas e **5 rejeitadas** com "Lição indisponível offline.". O trabalho feito de boa-fé se perde.
- **Correção:** escolher uma das três.
  - Montar o pacote só até o próximo baú ou desafio.
  - Ou abrir o baú automaticamente no sync quando a lição seguinte do pacote for concluída.
  - Ou considerar abrível a lição que estava no pacote no momento da geração (gravar os ids no pacote).

### V1-05: `expiraEm` do pacote não é conferido no sync (Baixa, CONFIRMADO)
- **Onde:** `offline.ts:100-112`. Só `geradoEm` é lido.
- **Reprodução** (teste `V1-05`): pacote gerado em 20/10 e válido até 29/10, sync em 01/11 com a lição datada de 30/10.
  - **Resultado:** a sessão foi aceita e gravada com `concluida_em = 2026-10-30`, depois do vencimento.
- **Limite real:** o `limparSessoes` das 03:00 apaga o pacote 1 dia depois do `expiraEm`, e daí o piso volta a ser `agora`. Na prática, o retrodatar vai até cerca de 8 dias, ou mais se o worker parar.
- **Impacto:** a ofensiva pode ser montada com datas passadas. Um usuário offline legítimo teria o mesmo comportamento dentro dos 7 dias.
- **Correção:** usar `noIntervalo(d, geradoEm, min(agora, expiraEm))`.

### V1-06: sessão já concluída recebe tentativas depois (Baixa, CONFIRMADO)
- **Onde:** `offline.ts:236`. Uma sessão já concluída pula a finalização, mas as tentativas novas ainda entram nas linhas 203-233.
- **Reprodução** (teste `V1-07`):
  1. Lote 1: 1 resposta certa e conclusão. A lição sai "perfeita", com 25 XP e `melhorPrecisao` 100.
  2. Lote 2: a mesma sessão com 2 respostas erradas. As duas são aceitas, mas a sessão continua `total 1 / acertos 1` e o bônus de perfeita não é revisto.
- **Impacto:** a precisão e o resumo ficam falsos. A falha alimenta a V1-02.
- **Correção:** recusar tentativa nova em sessão com `concluidaEm`, ou recalcular o resumo.

### V1-07: `valor_divergente` é contornado pelo status e pela conciliação (Média, CONFIRMADO)
- **Onde:**
  - `apps/api/src/servicos/pagamento.ts:131-133`: `statusPagamento` chama `confirmarPagamento` só pelo `status` do Asaas, sem olhar `value`.
  - `apps/api/src/servicos/conciliacao.ts:71`: mesmo problema, por leitura de código.
  - A trava fica só em `webhook.ts:38-41`.
- **Reprodução** (teste `V1-08`):
  1. Cobrança alterada para R$ 1,00 e paga (`RECEIVED`).
  2. O webhook com `value: 1` volta `valor_divergente`, e o acesso continua `false`.
  3. Dois minutos depois, o aluno abre `GET /pagamento/status`.
  - **Resultado:** `{"status":"pago","acesso":true}`.
- **Correção:** levar a conferência de valor para dentro de `confirmarPagamento`, com um parâmetro `valorCentavos`, e passar `c.value` no status e na conciliação. Divergência vira pendência para o superadmin.

### V1-08: chamadas ao Asaas dentro da transação esgotam o pool (Média, CONFIRMADO)
- **Onde:** `pagamento.ts:43-108`. Com a linha do aluno travada (`for update`, `:44`), o código faz até 3 chamadas HTTP (`criarCliente`, `criarCobranca`, `qrCodePix`), cada uma com timeout de 15 s (`integracoes/asaas.ts:158`). O pool tem 10 conexões (`packages/db/src/cliente.ts:63`).
- **Reprodução** (teste `V1-09`):
  1. O Asaas falso passa a responder com 1,5 s de atraso.
  2. Um aluno sem acesso dispara 12 `POST /pagamento/pix` simultâneos: 1 segura a trava e os outros 9 esperam no `FOR UPDATE`, cada um com uma conexão.
  - **Resultado:** o `GET /trilha` de **outro** aluno levou **1.359 ms**, ou seja, ficou parado até o Asaas responder. Com o Asaas lento de verdade (até 45 s), uma única conta trava a API inteira.
- **O que resistiu:** só 1 pedido foi criado, então a duplicidade de cobrança foi resolvida.
- **Correção:** usar uma trava curta para reservar a geração (por exemplo, `pg_advisory_xact_lock` ou uma coluna "gerando desde" com um update condicional), chamar o Asaas **fora** da transação e gravar o pedido numa segunda transação. Também vale limitar a taxa de `POST /pagamento/pix` por usuário.

### V1-09: deadlock entre `gerarPix` e `confirmarPagamento` (Baixa, FORTE INDÍCIO)
- **Onde:** `gerarPix` trava `usuarios` (`pagamento.ts:44`) e depois atualiza o pedido pendente vencido (`:57`). Já `confirmarPagamento` trava o pedido (`:186`) e depois atualiza `usuarios`. As travas são pegas em ordem inversa.
- **Quando acontece:** o webhook do Pix antigo, pago no limite, chega no mesmo instante em que o aluno pede um Pix novo. O Postgres aborta uma das duas transações. Se for o webhook, ele responde erro e o Asaas reenvia. Não consegui reproduzir de forma determinística porque a janela é de 2 comandos SQL.
- **Correção:** em `confirmarPagamento`, travar o usuário antes do pedido, ou fazer `gerarPix` marcar o pendente como vencido sem segurar a trava do usuário. A V1-08 resolve as duas coisas juntas.

### V1-10: push antigo não é revalidado (Baixa, FORTE INDÍCIO)
- **Onde:** `endpointPushValido` só roda na entrada (`packages/shared/src/api/social.ts:150`). O worker manda para `insc.endpoint` sem conferir (`apps/worker/src/jobs/lembretes.ts:29`), e nenhuma migração limpou as inscrições gravadas antes da correção R1-06.
- **Impacto:** o SSRF continua para quem se inscreveu com uma URL interna antes do deploy.
- **Correção:** validar também no envio e apagar as inscrições inválidas com uma migração ou um job.

### V1-11: admin lê as sessões do superadmin (Baixa, CONFIRMADO)
- **Onde:** `apps/api/src/rotas/admin/gestao.ts:259-296`. `adminUsuarioObter` não usa `exigirAlvoAluno` e devolve `sessoes[].ip/userAgent` de qualquer usuário.
- **Reprodução** (teste "exigirAlvoAluno…"): um admin consulta o superadmin e recebe 200 com IP, user-agent e validade da sessão.
- **Correção:** aplicar `exigirAlvoAluno` também na leitura, ou omitir as sessões quando o alvo não for aluno.

### V1-12: ordenação de sessões por texto (Info, HIPÓTESE)
- **Onde:** `offline.ts:146-148`. A ordem cronológica compara `iniciadaEm` como texto. O schema aceita offset (`DataHora` com `offset: true`), e as sessões já gravadas usam o formato `Z`. Com offsets misturados, a ordem pode sair errada e a 2ª lição seria validada antes da 1ª.
- **Situação atual:** o cliente web manda `toISOString()` (`apps/web/src/offline/motor.ts:120`), então hoje não acontece.
- **Correção:** ordenar por `Date.parse`.

---

## Correções que resistiram (com evidência)

| Correção | Tentativa | Resultado |
|---|---|---|
| Sync: lição bloqueada, desafio, baú, mesma lição 2× no lote | `V1-02` (6 lições além do baú) e o teste do repositório | Recusadas ("Lição indisponível offline.") |
| Sync: questão de outro assunto, questão repetida na sessão, mais respostas que o tamanho | Teste do repositório e leitura de `recusaDaTentativa` | Recusadas |
| Sync: `pacoteId` de outro aluno como piso de data | `V1-06` (pacote de B 2 dias antes, sincronizado por A) | O piso virou `agora` e a data não foi forjada |
| Sync: datas antes do pacote ou no futuro | `V1-05` e o teste do repositório (30 dias atrás) | Datas presas a `[geradoEm, agora]` |
| **Caminho legítimo:** 3 lições + revisão do pacote em **2 lotes**, com **pacote novo baixado antes do sync** (`lote.pacoteId = P2`, `sessão.pacoteId = P1`) | Teste "legítimo…" | 10 + 7 aceitas, 0 rejeitadas, 3 lições concluídas (com o baú aberto antes) |
| Pix em dobro: 12 cliques simultâneos | `V1-09` | 1 pedido só |
| Estorno com outro pedido pago | Teste "estorno de um pedido com outro pago…" | O acesso continua; o estorno do 2º revoga |
| `valor_divergente` no webhook: 397, 397.0, 397.01, 396.995 liberam; 396.99 barra; `value` ausente libera; `value` texto dá 400 | Teste "valor_divergente resiste…" | Como esperado (`Math.round(valor*100)` não erra em 39700) |
| `exigirAlvoAluno` nas 3 ações (revogar sessões, liberar e revogar acesso) contra outro admin, o superadmin e o próprio admin | Teste "exigirAlvoAluno…" | Todas deram 403 |
| `endpointPushValido`: `https://fcm.googleapis.com@evil.com`, `evil.com#@fcm…`, `evil.com?.fcm…`, `evil.com\@fcm…`, `fcm.googleapis.com.`, `xfcm…`, `fcm.googleapis.com%2e.evil.com`, `127.0.0.1`, `[::1]` | Teste de push | Todos recusados. Maiúsculas, IDN de largura total (normalizado para `fcm.googleapis.com`), porta e userinfo no host certo foram aceitos, sem risco porque o destino continua sendo o Google |
| `dataSql`: varredura de **todos** os templates `sql\`…\`` e `sql<T>\`…\`` (incluindo os de várias linhas) em `apps/api`, `apps/worker`, `packages/db`, `packages/crawler` e `packages/shared` com um parser próprio (`<scratchpad>/v1/scan.cjs`) | — | Nenhum `Date` solto sobrou. A única data é `agora.toISOString()::timestamptz` em `estudo.ts:538`. Comparações com `Date` passam pelos operadores do Drizzle sobre colunas, que convertem a data corretamente |
| `semanaAFechar` com cron `59 * * * *` | Leitura | No domingo às 23:59, `+60 s` cai na segunda e fecha a semana corrente. Nas outras horas fecha a anterior. O `for update` com `fechadoEm` impede fechar duas vezes. Não fecha cedo |
| `verificarOfensivas` com update otimista | Leitura | Os candidatos já são filtrados por `isNotNull(ultimoDiaEstudo)` e `ofensiva > 0`, então o `u.ultimoDiaEstudo!` nunca é null na leitura. Se mudar para null depois, o `eq` falha e o job pula, que é o comportamento seguro |

**Observação sobre a liga (não é regressão):** quem ganha o primeiro XP da semana entre 23:59 e 00:00 de domingo cai num grupo novo e sozinho. Esse grupo é fechado na rodada de segunda às 00:59 e sobe com +50 gemas. Grupos de 1 já sobem em qualquer horário (`fecharGrupo`), então o efeito é o mesmo de antes.

## Testes de prova
- `C:\Users\fusea\AppData\Local\Temp\claude\c--FuseDev-fuseaprova\5c01e833-c735-4764-be3d-7df5d2680052\scratchpad\v1\test\offline.test.ts` (9 testes, todos passando, comprovando V1-01 a V1-06 e o caminho legítimo)
- `C:\Users\fusea\AppData\Local\Temp\claude\c--FuseDev-fuseaprova\5c01e833-c735-4764-be3d-7df5d2680052\scratchpad\v1\test\pagamento.test.ts` (V1-07, V1-08, V1-11, estorno, valor e push; a única falha foi uma expectativa minha errada para `value: "1"`, que a API recusa com 400, como deve)
