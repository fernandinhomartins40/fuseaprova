# Banca R4: qualidade, funcionalidades e regressões

Revisor R4 (engenharia de qualidade). Data: 27/10/2026. Commit auditado: `6a2cb43` (main).
Modo: somente auditoria. O único arquivo do projeto alterado é este parecer.

## 1. Comandos executados (resultados reais)

| # | Comando | Onde | Resultado |
|---|---|---|---|
| 1 | `pnpm typecheck` (orquestrador) | `scratchpad/base-typecheck.log` | **exit=0**, 7/7 pacotes |
| 2 | `pnpm lint` (orquestrador) | `scratchpad/base-lint.log` | **exit=0**, 7/7 pacotes |
| 3 | `pnpm test` (orquestrador, turbo em paralelo) | `scratchpad/base-test.log` | **exit=1**. worker 13/13, db 23/23, shared 140/140, crawler 147/147 aprovados. **web 64/65**: falhou `telas.test.tsx › cadastro valida com o schema compartilhado e mostra erros por campo` (`findByRole` do botão esgotou 4 441 ms com a tela ainda em "Carregando…"). O turbo abortou a API no meio: 8 arquivos (133 testes) concluídos e aprovados; `guardas`, `licao`, `fumaca` e `superadmin-cli` não chegaram a rodar. |
| 4 | `pnpm --filter @fuse/api exec vitest run test/guardas.test.ts test/licao.test.ts test/fumaca.test.ts test/superadmin-cli.test.ts` | `scratchpad/r4/api-restantes.log` | **exit=0**, 4 arquivos, 124/124. Somado ao item 3, a API tem **257/257** (o orquestrador confirmou 257/257 em `base-api.log`). |
| 5 | `pnpm --filter @fuse/web exec vitest run src/telas/telas.test.tsx` (isolado) | `scratchpad/r4/web-telas-1.log` | **exit=0**, 8/8 |
| 6 | `pnpm --filter @fuse/web exec vitest run` (suíte web isolada) | `scratchpad/r4/web-full.log` | **exit=0**, 10 arquivos aprovados (65/65) |
| 7 | `pnpm --filter @fuse/shared exec vitest run --coverage --coverage.reportsDirectory=<scratchpad>/r4/cov-shared` | `scratchpad/r4/cov-shared.log` | **exit=0**. Linhas **100%** (4 741/4 741), statements 100%, funções 100% (168/168), branches **99,49%** (592/595; faltam `api/admin-conteudo.ts:36` e `api/comum.ts:154`). A pasta `packages/shared/coverage/` já existia (24/10) e está no `.gitignore`. Esta execução não a criou nem a alterou. |
| 8 | `pnpm e2e` (Playwright, API real + PGlite + Asaas falso, sem Docker) | `scratchpad/r4/e2e-1.log` | **exit=0**, **21/21 aprovados** em 4,2 min (Windows, Chromium). Nenhuma anotação "linha de base criada": o teste visual comparou com `e2e/testes/__capturas__/win32/`. `git status` ficou limpo depois. |

Também fiz uma busca estática em `apps/web/dist`: não há vestígio do mock (`Falha na API simulada`, `mock/servidor`).

Foi uma única execução de E2E. Não há amostra para medir instabilidade no Playwright. O histórico tem `899eb5e ci: reexecuta pipeline (E2E instável no runner)`.

## 2. Uso de mocks

- `apps/web/mock/servidor.ts` é a API simulada em memória. Entra em dois lugares: (a) `vite --mode mock` (`dev:mock`), pelo plugin `apiSimulada()` com `apply: 'serve'`, que não entra no build (`apps/web/vite.config.ts:14-44`); (b) os testes Vitest da PWA, por `apps/web/src/test/apiSimulada.ts`. **Não é usada em produção** (o dist não a contém). Consequência: todos os testes `*.test.tsx` da PWA validam as telas contra o mock, não contra a API real. O contrato é o mesmo (`@fuse/shared` + Zod), mas a regra de negócio do mock é outra implementação.
- **O E2E roda contra a API real** (`criarApp` em `e2e/servidor.ts`), com PGlite novo em memória, seed com as autorais publicadas, relógio controlável, `rateLimit: false` e **Asaas falso** (`criarAsaasFalso`, sem rede). O webhook é o real (`POST /api/webhooks/asaas` com token). O build da PWA é o de produção (`vite build` + `vite preview`), e o service worker fica bloqueado, exceto no teste `07-offline`.
- Nenhum teste fala com o sandbox real do Asaas.

## 3. Matriz de jornadas

Legenda de método: **E** = executado nesta auditoria (resultado real); **S** = análise estática do teste ou do código.

| Jornada | Testes (arquivo) | O que comprovam (UI → API → regra → persistência → permissão) | Lacunas | Classificação |
|---|---|---|---|---|
| Cadastro | E2E `01-acesso-pagamento` (cadastro → Pix); API `auth.test` (cookie httpOnly/Lax, hash, aceite, 409 repetido); web `telas.test` (validação por campo, e-mail existente); `guardas.test` (erros Zod em pt-BR) | Cadeia inteira: UI → API → banco | O teste web de validação é instável sob carga (R4-01) | **VERIFICADA** (E) |
| Login / sair / sessão | API `auth.test` (senha errada, sair, 60 dias, rate limit 20/15 min); E2E indireto | API, regra, persistência | Nenhum E2E de login de aluno pela UI com senha errada | **VERIFICADA** na API, UI coberta só de forma indireta (E) |
| 2FA (superadmin) | API `totp.test` (RFC 6238, sem reuso, AES-GCM), `superadmin.test` (sem 2FA → 403, sessão 2 h/12 h, reconfirmação); E2E `09-superadmin` (login com 2FA, desktop e celular); web `super.test` | Cadeia inteira | `super2faCodigos` (gerar novos códigos de recuperação) sem teste funcional (R4-05) | **VERIFICADA** (E) |
| Recuperação de senha | API `auth.test` (resposta igual sempre, redefinir encerra sessões, link de 1 h) | API, regra, persistência | Nenhum teste de UI de `Recuperar.tsx` (o E2E 08 só passa o axe na tela) | **PARCIAL** (E na API; S na UI) |
| Pagamento Pix + webhook + status | API `pagamento.test` (14 testes: reaproveita pendente, 5× sem duplicar com contagem no banco, 401 sem efeito, estorno, consulta após 60 s, expirado, OVERDUE, DELETED, 502, reembolso, conta compartilhada); E2E `01` (4 testes, < 10 s sem reload); `superadmin.test` (conciliação, aprovação manual) | Cadeia inteira com Asaas **falso** | Sandbox real nunca exercitado (R4-06) | **VERIFICADA** com Asaas simulado; sandbox **BLOQUEADA** (E) |
| Onboarding | E2E `01` (cargo → Continuar → "Agora não"); API `social.test` (concurso com áreas) | UI → API → persistência | O pedido de permissão de push é sempre pulado ("Agora não") | **PARCIAL** (E) |
| Trilha | API `fumaca.test`, `licao.test` (bloqueada não abre, baú +20 gemas uma vez); E2E `01`/`02` | Cadeia inteira | — | **VERIFICADA** (E) |
| Lição | API `licao.test` (5 questões, sem gabarito antes, XP 45/65, vidas, dica 5 gemas, idempotência por `id_cliente`, REVISAR ERROS, desafio 70%); E2E `02` (4 testes, inclusive só teclado); `shared` xp/vidas | Cadeia inteira | — | **VERIFICADA** (E) |
| Revisão espaçada | `shared revisao-dominio.test`; API `revisao-simulado.test` (dia seguinte, 4 acertos, erro volta à etapa 0); E2E `03` (+1/+3/+7/+15 dias pela UI) | Cadeia inteira | — | **VERIFICADA** (E) |
| Simulado | `shared simulado.test`; API (5/5/5/25, 4 h no servidor, nota 2,0/2,8, entrega automática na leitura e na varredura, 409 sem questões); E2E `04` (2 testes) | Cadeia inteira | — | **VERIFICADA** (E) |
| Liga | `shared liga-conquistas.test`; API `social.test` (entra no 1º XP, nome abreviado, modal uma vez); worker `jobs.test` (fechamento, empate, grupo pequeno, bronze) | Regra, API, persistência e job | Na UI, só captura visual e axe, sem asserção funcional | **VERIFICADA** na regra e na API; UI **PARCIAL** (E) |
| Perfil / conquistas | API `social.test` (estatísticas, domínio, 9 conquistas), `licao.test` (`conquistasNovas`) | API, regra | Nenhum teste de UI com asserção de conquistas | **PARCIAL** (E) |
| Ofensiva | `shared gemas-ofensiva.test`; API `licao.test` (sobe, zera, protetor, 10 de revisão contam o dia); worker 00:05; E2E `02` ("1 dia de ofensiva!") | Cadeia inteira | — | **VERIFICADA** (E) |
| Offline / sync | API `conteudo-offline.test` (pacote com 3 lições e revisão vencida, sync idempotente, rejeita retirada); web `offline.test` (contra o mock); E2E `07` (lição offline, sync +65 XP, reenvio 0) | Cadeia inteira para a lição; a revisão vencida offline não passa pela UI | Revisão offline e "retirar → some offline" não testados de ponta a ponta (R4-04) | **PARCIAL** (E) |
| Push | API `social.test` (VAPID, inscrever, remover); worker (lembretes, 1 por dia, remove expiradas) | API e worker | Nenhum teste de UI (`app/push.ts`), nem de permissão do navegador | **PARCIAL** (E) |
| LGPD (exportar/excluir) do aluno | API `auth.test` (exportar sem `senhaHash`, 1 pedido; excluir anonimiza e mantém o pedido); `superadmin.test` (exportar/anonimizar pelo super) | API, persistência | O teste não confere que a exportação traz as **tentativas** (PRD 8.8); nenhum teste de UI de `Configuracoes.tsx` (R4-07) | **PARCIAL** (E na API; S na UI) |
| Admin: questões | API `admin.test` (rascunho → publicar exige dica, explicação e revisão; `a-classificar` 422; lote); E2E `05` (editar e publicar; 401/403); web `editor/questoes.test` | Cadeia inteira | — | **VERIFICADA** (E) |
| Admin: trilhas | API `admin.test` (criar unidade/seção/lição, reordenar, excluir); web `trilhas.test` | API, persistência | `adminLicaoAtualizar`, `adminLicaoExcluir`, `adminSecaoAtualizar` e `adminUnidadeAtualizar` sem teste funcional (R4-05) | **PARCIAL** (E) |
| Admin: concursos / edital | API `admin.test` (modo edital, provas/cargos/concursos/importações) | API, persistência | `adminConcursoCriar`, `adminConcursoObter`, `adminCargoAtualizar`, `adminCargosListar`, `adminAssuntoCriar`, `adminAssuntoAtualizar`, `adminProvaAtualizar` e `adminImportacoesListar` sem teste funcional | **PARCIAL** (E) |
| Admin: reports / uploads / revogar acesso | Só a guarda 403 (`guardas.test`) | Só a permissão | `adminReportAtualizar`, `adminUpload` e `adminUsuarioRevogarAcesso` sem nenhum teste funcional (R4-05) | **IMPLEMENTADA, NÃO VERIFICADA** (S) |
| Superadmin: usuários / pagamentos | API `superadmin.test` (75 testes: ficha, bloqueio, papel, convite, CSV, conciliação, reprocessar webhook, reembolso, aprovação manual, comprovante, comunicação, sistema); E2E `09` (aprovação manual libera o acesso); web `super.test`, `pedidos.test` | Cadeia inteira | `superUsuarioRevogarSessao`, `superAsaasTestar` e `superComunicacoesListar` sem teste funcional | **VERIFICADA** com lacunas pontuais (E) |
| Worker jobs (8.7) | worker `jobs.test` (13 testes: liga, vidas 00:00, ofensiva 00:05, Pix vencido, sessões, lembretes, backup, trava, cron de todos os jobs, `jobs_execucoes`) | Regra e persistência | O backup só é testado como "roda o script e registra a falha" | **VERIFICADA** (E) |
| Crawler / importador | crawler, 10 arquivos com 147 testes (robots RFC 9309, rate limit, detecção de captcha e login, parsers, pareamento, importar → rascunho, `--simular`, recusa gabarito preliminar, PDF sem texto, figuras) | Regra e persistência com fixtures | Sem rede real (correto, por política) | **VERIFICADA** (E, com fixtures) |
| Comparação visual das 13 telas | E2E `06-visual` | Regressão contra uma linha de base gravada pelo próprio app | Não compara com `design/png`, e no CI Linux não compara nada (R4-02) | **PARCIAL** (E) |

## 4. Verificação das evidências de `docs/ACEITE.md`

Conferi cada teste citado: todos existem com o nome indicado e passaram nesta auditoria, com estas ressalvas.

| Item | Situação no ACEITE | Parecer R4 |
|---|---|---|
| Cabeçalho "458 testes" / "17 testes E2E" | — | **Desatualizado.** Hoje: 645 testes de unidade e integração (shared 140, db 23, crawler 147, worker 13, web 65, api 257) e 21 E2E. |
| #1 (402 + redirecionamento) | ✅ | Confirmado. `guardas.test` percorre todo o `ROTAS` com guarda `acesso`, e só `/api/saude` fica fora do registro. |
| #2 (Pix < 10 s) | ⚠️ | Honesto. O teste mede < 10 s, mas com o Asaas falso. |
| #3, #4, #5 (webhook e estorno) | ✅ | Confirmado. Os testes contam linhas no banco e e-mails (qualidade alta). |
| #6–#15 (lição, gamificação, revisão, ofensiva, liga, simulado) | ✅ | Confirmado (E). |
| #16 (rascunho etc. não aparecem) | ✅ | Confirmado na API. O E2E `05` citado testa o fluxo de publicar, não a invisibilidade. |
| #17 (retirar → some, "inclusive offline") | ✅ | **Exagerado → PARCIAL.** A API e o pacote estão testados, mas `offline.test › invalida o pacote quando a versão do conteúdo muda` roda contra o **mock** e só chama `conferirVersao(…, 2)` à mão. Nenhum teste encadeia "admin retira → PWA do aluno recarrega (online ou offline) → questão some" (R4-04). |
| #18 (chip `fau_real`) | ✅ | Confirmado na API. Na UI, nenhum teste mostra uma questão `fau_real` com o chip (o ACEITE admite que o seed do E2E só tem autorais). Na prática, está **PARCIAL**. |
| #19 (instalável / Lighthouse PWA) | ⚠️ | Honesto. Bloqueado nesta máquina. |
| #20 (modo avião) | ✅ | Lição confirmada (E2E 07). Revisão vencida offline só passa pela API e pelo mock (o próprio ACEITE admite). Na prática, está **PARCIAL**. |
| #21 (13 telas × `design/png`, 2%) | ⚠️ | **Mais grave do que o ACEITE diz.** Ver R4-02: a comparação é com a linha de base do próprio app, e no CI (Linux) o teste sempre passa sem comparar. |
| #22 (axe + teclado) | ✅ | Confirmado (E2E 08 e 02 executados). |
| #23 (LCP / bundle) | ⚠️ | Bundle não reexecutado por R4. LCP bloqueado. |
| #24 (100% de linhas no shared) | ✅ | **Confirmado (E):** 100% de linhas. Ressalva R4-03: o limite **não é verificado no CI** (`pnpm test` roda sem `--coverage`). |
| #25, #26 (Docker / backup) | ⚠️ | Bloqueados aqui (sem Docker). Fora do escopo R4. |

## 5. Achados

### R4-01: Teste web instável sob carga quebra o `pnpm test`
- **Severidade:** Média · **Estado:** CONFIRMADO (reproduzido na linha de base e não reproduzido isolado)
- **Local:** `apps/web/src/telas/telas.test.tsx:46` (primeiro teste do arquivo); `apps/web/src/test/setup.ts:11` (`asyncUtilTimeout: 4000`).
- **Reprodução:** `pnpm test` na raiz (turbo com web, api e crawler em paralelo). O teste falhou em 4 441 ms, ainda em "Carregando…". Isolado (`vitest run src/telas/telas.test.tsx`), passou 8/8, e a suíte web isolada passou 65/65.
- **Esperado × observado:** determinístico × depende da carga da máquina. O primeiro teste do arquivo paga o carregamento preguiçoso da rota.
- **Impacto:** `pnpm test` dá exit 1 de forma intermitente. O turbo então aborta os outros pacotes: nesta execução, 124 testes da API não rodaram. No CI, isso bloqueia o deploy ou obriga a reexecutar (já houve `899eb5e ci: reexecuta pipeline`).
- **Correção:** aquecer a rota preguiçosa num `beforeAll` (importar o módulo da tela), ou usar `findByRole(..., {timeout: 15000})` só no primeiro `find`, ou limitar a concorrência do turbo no CI (`--concurrency`).
- **Teste de aceite:** rodar `pnpm test` 5 vezes seguidas na raiz, todas com exit 0.

### R4-02: A comparação visual não compara com `design/png` e no CI não compara nada
- **Severidade:** Alta (para o critério #21) · **Estado:** CONFIRMADO (estático + execução)
- **Local:** `e2e/testes/06-visual.spec.ts:51-60`; `e2e/playwright.config.ts` (`snapshotPathTemplate: '{testDir}/__capturas__/{platform}/…'`); `e2e/testes/__capturas__/` só tem `win32/`; `.github/workflows/deploy.yml:170-196` (E2E em `ubuntu-latest`).
- **Reprodução:** no Linux, `test.info().snapshotPath(...)` não existe, então `foto()` grava a captura atual como linha de base, anota "linha de base criada" e retorna **sem `expect`**. O teste passa sempre. No Windows (execução R4), comparou com capturas do próprio app, não com `design/png`.
- **Esperado × observado:** "as 13 telas batem com `design/png` em 390×844 (tolerância 2%)" × regressão contra si mesmo no Windows e nenhuma verificação no CI.
- **Impacto:** o portão de deploy (`needs: e2e`) não protege a aparência. Qualquer regressão visual passa no CI. O critério #21 não tem evidência automatizada.
- **Correção:** versionar `__capturas__/linux/` gerado no container do CI, e falhar quando a linha de base não existir (sob `CI=1`). Se a decisão D1 dispensa `design/png`, registrar a mudança do critério no PRD/DECISOES e marcar #21 como ❌/⚠️ com essa justificativa.
- **Teste de aceite:** alterar 1 cor de token e rodar o E2E no Linux: o `06-visual` deve falhar.

### R4-03: O limite de 100% de cobertura do shared não é verificado no CI
- **Severidade:** Baixa · **Estado:** CONFIRMADO (estático)
- **Local:** `packages/shared/package.json:22` (`"test": "vitest run"`, sem `--coverage`); `packages/shared/vitest.config.ts` (os limites só valem com `--coverage`); `.github/workflows/deploy.yml:163-165`.
- **Esperado × observado:** a exigência do CLAUDE.md é protegida automaticamente × hoje está em 100% (E), mas uma regressão de cobertura passaria no CI.
- **Correção:** `"test": "vitest run --coverage"` no shared, ou um passo dedicado no CI.
- **Teste de aceite:** remover um teste do shared: o CI deve falhar no limite.

### R4-04: "Retirar → some do app, inclusive offline" e "revisão vencida offline" sem teste de ponta a ponta
- **Severidade:** Média · **Estado:** CONFIRMADO (lacuna de teste; o comportamento não foi refutado)
- **Local:** `apps/web/src/offline/offline.test.ts:38-45` (contra o mock, versão injetada à mão); `e2e/testes/07-offline.spec.ts` (só a lição); `docs/ACEITE.md` #17 e #20.
- **Esperado × observado:** um teste encadeado admin → aluno × peças isoladas (API real, PWA com mock).
- **Impacto:** a integração entre o `versaoConteudo` real da API e a invalidação do pacote na PWA não é exercida. Uma divergência do contrato real em relação ao mock passaria.
- **Correção:** um E2E que baixa o pacote, retira a questão pelo `/admin`, recarrega (online) e confirma que ela não aparece, depois repete offline. E um E2E que faz a revisão vencida em modo avião.
- **Teste de aceite:** os dois E2E novos verdes.

### R4-05: Rotas de admin e superadmin sem nenhum teste funcional
- **Severidade:** Média · **Estado:** CONFIRMADO (estático, cruzando `ROTAS` com `apps/api/test`, `apps/api/src/teste` e `e2e/testes`, por nome e por caminho)
- **Rotas:** `adminUpload`, `adminUsuarioRevogarAcesso`, `adminReportAtualizar`, `adminLicaoAtualizar`, `adminLicaoExcluir`, `adminSecaoAtualizar`, `adminUnidadeAtualizar`, `adminAssuntoCriar`, `adminAssuntoAtualizar`, `adminCargoAtualizar`, `adminCargosListar`, `adminConcursoCriar`, `adminConcursoObter`, `adminProvaAtualizar`, `adminImportacoesListar`, `super2faCodigos`, `superAsaasTestar`, `superComunicacoesListar`, `superUsuarioRevogarSessao`. São 19 de 140. Hoje só a guarda 403 está coberta (`guardas.test`, `superadmin.test`).
- **Destaques:**
  - `adminUpload` é entrada de arquivo sem teste de tipo e tamanho. O teste análogo existe só para o comprovante do super.
  - `adminUsuarioRevogarAcesso` (`apps/api/src/rotas/admin/gestao.ts:310-315`) só grava `acesso=false`, sem encerrar as sessões, ao contrário do estorno. O efeito imediato depende de `acesso` ser relido a cada requisição, o que não foi verificado (HIPÓTESE).
  - `adminReportAtualizar` decide se uma questão reportada volta ao ar.
- **Correção:** um teste de integração por rota, com o caminho feliz e 1 caso negativo (404, 400 ou permissão).
- **Teste de aceite:** o script de cruzamento (seção 1, método) não lista nenhuma rota.

### R4-06: Pagamento nunca exercitado contra o Asaas real (sandbox)
- **Severidade:** Média · **Estado:** CONFIRMADO (BLOQUEADO nesta máquina)
- **Local:** `e2e/servidor.ts` (`criarAsaasFalso`); `apps/api/test/pagamento.test.ts`.
- **Impacto:** campos e eventos do Asaas são validados só contra um falso escrito pela equipe. Uma divergência do contrato real só aparece em produção. O ACEITE #2 reconhece isso.
- **Correção:** teste de contrato opcional (`ASAAS_SANDBOX=1`) que cria uma cobrança Pix no sandbox, consulta `GET /payments/{id}` e `pixQrCode`, e valida com os mesmos schemas Zod do falso.
- **Teste de aceite:** rodar o passo do ACEITE #2 com a chave de sandbox e registrar o tempo.

### R4-07: Jornadas do aluno sem teste de UI (LGPD, recuperação, push, conquistas)
- **Severidade:** Baixa · **Estado:** CONFIRMADO (estático)
- **Local:** `apps/web/src/telas/Configuracoes.tsx:133` (`meExportar`) e `:427` (`meExcluir`); `apps/web/src/telas/Recuperar.tsx:33,102`; `apps/web/src/app/push.ts:46`. Nenhum `*.test.tsx` nem E2E aciona esses fluxos (o E2E 08 só passa o axe em `/recuperar`). O teste da API de exportação (`auth.test.ts:106-109`) não confere as **tentativas** que o PRD 8.8 exige no JSON.
- **Correção:** testes web contra o mock para cada tela, um E2E de "esqueci a senha" com o e-mail em memória (`/__e2e/emails`), e uma asserção `exp.json().tentativas` na API.
- **Teste de aceite:** os novos testes verdes.

### R4-08: `docs/ACEITE.md` desatualizado e com evidências otimistas
- **Severidade:** Baixa · **Estado:** CONFIRMADO
- **Local:** `docs/ACEITE.md` (cabeçalho com 458 e 17; itens #17, #18 e #20 como ✅).
- **Correção:** atualizar as contagens (645 + 21), rebaixar #17, #18 e #20 para ⚠️ com a lacuna descrita, e detalhar no #21 o comportamento do CI (R4-02).

## 6. Distinção do que foi feito

- **Executado:** itens 1–8 da seção 1 (typecheck, lint e suíte completa pelo orquestrador; API restante, web isolado, cobertura do shared e E2E por R4).
- **Análise estática:** mocks e build, cruzamento rotas × testes, CI, visual, ACEITE, código de `adminUsuarioRevogarAcesso`.
- **Bloqueado:** Asaas sandbox real, Docker/HTTPS, Lighthouse (PWA e LCP), instalação em aparelho, restore na VPS.
- **Proposto (não executado):** os testes de aceite de cada achado. Repetição do E2E para medir instabilidade (houve 1 execução, 21/21).
