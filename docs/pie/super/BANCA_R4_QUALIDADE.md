# Banca R4: qualidade, funcionalidades e regressões do painel superadmin (`/super`)

- **Revisor:** R4 (engenharia de qualidade).
- **Data:** 28/10/2026.
- **Commit auditado:** `2f71392` (main). O código não tem alterações locais.
- **Modo:** somente auditoria. Os únicos arquivos do repositório criados são este parecer e `MATRIZ_VERIFICACAO.md`.
- **Escopo:** RQ1 revisado, RQ2, RQ3 e RQ4 de `ESCOPO_BANCA.md`, mais D13 e D23. Os testes de prova ficam fora do repositório, em `scratchpad/r4/prova/` (`super.prova.ts` + `vitest.config.mts`).
- **Matriz por rota e por tela:** `MATRIZ_VERIFICACAO.md`.

## 1. Comandos executados (resultados reais)

| # | Comando | Log (scratchpad `r4/`) | Resultado |
|---|---|---|---|
| 1 | `pnpm --filter @fuse/api test` (PGlite) | `api-pglite.log` | **exit=0**: 14 arquivos, **299/299** em 82 s |
| 2 | `TESTE_DATABASE_URL=postgres://fuse@127.0.0.1:55432/postgres pnpm --filter @fuse/api test` | `api-pg.log` | **exit=0**: 14 arquivos, **299/299** em 56 s (Postgres 16.15) |
| 3 | `pnpm --filter @fuse/web test` | `web.log` | **exit=0**: 11 arquivos, **74/74** |
| 4 | `pnpm typecheck` | `typecheck.log` | **exit=0**: 8/8 tarefas (3 do cache) |
| 5 | `pnpm lint` | `lint.log` | **exit=0**: 8/8 tarefas |
| 6 | Testes de prova do R4 (`npx vitest run --config <scratch>/r4/prova/vitest.config.mts --root <scratch>/r4/prova`, a partir de `apps/api`) com PGlite | `prova-pglite.log` | **exit=0**: 20/20 |
| 7 | Os mesmos testes com `TESTE_DATABASE_URL=…55432/postgres` | `prova-pg.log` | **exit=0**: 20/20 no Postgres 16.15 |
| 8 | `npx playwright test testes/09-superadmin.spec.ts testes/05-admin.spec.ts --reporter=list --output=<scratch>/r4/e2e-out` (em `e2e/`) | `e2e.log` | **exit=0**: **6/6** em 1,8 min (o build da web e o PGlite em memória ficam em `apps/web/dist`, que está no `.gitignore`) |

### Como ler os resultados

- **Banco de teste.** O helper `packages/db/src/teste.ts:47-52` cria um banco novo (`teste_<id>`) a cada `criarBancoTeste()`. Na API isso equivale a um banco por arquivo, porque cada arquivo chama `criarAmbienteTeste()` uma vez no `beforeAll`. Os bancos não são apagados depois.
- **Testes de prova.** Os 20 casos registram o comportamento observado com `anotar()` e só falham diante de 500, de resposta fora do contrato ou de filtro errado. O "20/20" quer dizer que **nenhuma rota deu 500 nem saiu do contrato Zod**. Não quer dizer que o comportamento esteja correto: os achados abaixo vêm das anotações.
- **Falso positivo descartado.** Na 1ª execução, o filtro `ativoDias=7` voltou vazio. A causa era o meu teste, que avançou o relógio 12 dias depois da lição. Corrigido, o filtro funciona nos dois bancos (`total=1`). **NÃO REPRODUZIDO.**

## 2. Tabela de achados

| ID | Severidade | Estado | Título | Arquivo:linha |
|---|---|---|---|---|
| R4-01 | **Crítica** (RQ1) | CONFIRMADO | O superadmin abre todo o app de estudo (8 de 8 GET da guarda `acesso` respondem 200) e todas as rotas `/admin` | `apps/api/src/http/registrar.ts:101-109`; `apps/api/src/servicos/superadminCli.ts:52` |
| R4-02 | **Alta** (RQ1) | CONFIRMADO | Superadmin só com a senha, com o 2FA pendente, já abre a trilha (o `/super` responde 403 nesse estado) | `registrar.ts:101-104` |
| R4-03 | **Alta** (receita) | CONFIRMADO | Rebaixar superadmin ou admin para aluno mantém `acesso=true` sem nenhum pedido: acesso gratuito | `apps/api/src/rotas/super/usuarios.ts:300-312`; `superadminCli.ts:52` |
| R4-04 | **Alta** (RQ2) | CONFIRMADO | Há um só `POST /auth/login` e uma só tela `/entrar` para os três papéis | `packages/shared/src/api/rotas.ts:75`; `apps/api/src/rotas/auth.ts:26-38` |
| R4-05 | **Alta** (RQ4/D21/D23) | CONFIRMADO | A aprovação manual grava o preço cheio do 1º concurso por cima do valor do pedido. Um pedido de R$ 197 (adicional) vira R$ 397, e o `receiveInCash` no Asaas usa o mesmo valor errado | `apps/api/src/servicos/pagamentoManual.ts:55,96-97,147-150` |
| R4-06 | **Alta** (RQ4/D21) | CONFIRMADO | A aprovação manual age sobre o concurso **ativo** do aluno, não sobre o pedido. Se o aluno já tem outro concurso liberado, responde `jaAprovado=true` e não libera o concurso pago | `pagamentoManual.ts:62-79` |
| R4-07 | **Alta** (receita) | CONFIRMADO | Pix **vencido** pago por fora: a aprovação cria um pedido novo e não cancela o Pix vencido, que segue aberto no Asaas. Se esse Pix for pago depois, o aluno fica com **2 pedidos pagos** pelo mesmo concurso | `pagamentoManual.ts:80-91,141` |
| R4-08 | Média (RQ4) | CONFIRMADO | A tela do pagamento não oferece como liberar nos 3 cenários do RQ4: o botão fica oculto, a conciliação não repara um pedido pago sem liberação e o contrato nem informa o concurso do pedido | `apps/web/src/super/telas/PagamentoDetalhe.tsx:132`; `UsuarioFicha.tsx:141`; `packages/shared/src/api/superadmin.ts:210` |
| R4-09 | Média | CONFIRMADO | O reembolso não é idempotente na API: a 2ª chamada antes do webhook manda um 2º estorno ao Asaas | `apps/api/src/rotas/super/pagamentos.ts:328-342` |
| R4-10 | Baixa | CONFIRMADO | No CSV do financeiro, um valor negativo vira texto (`'-397,00`), porque a neutralização de fórmula pega o sinal de menos | `packages/shared/src/api/superadmin.ts:939-943`; `rotas/super/financeiro.ts:316-334` |
| R4-11 | Baixa | CONFIRMADO | A busca não escapa `%` nem `_`: `q=%` ou `q=_` traz tudo (pagamentos, usuários, alvo da auditoria, webhooks) | `pagamentos.ts:51-53,445`; `usuarios.ts:64-65`; `sistema.ts:149` |
| R4-12 | Média (cobertura) | CONFIRMADO | 4 rotas `/super` e 14 rotas de conteúdo do `/admin` não têm teste funcional no repositório. 8 das 13 telas do `/super` não têm teste de UI, e os testes web rodam contra o simulador de fetch | `apps/api/test/superadmin.test.ts`; `apps/web/src/super/testes/` |
| R4-13 | Alta (regressão) | FORTE INDÍCIO | Testes e helpers acoplados ao desenho atual vão quebrar com o RQ1 e o RQ2 e precisam ser reescritos, não só ajustados (lista na seção 5) | `apps/api/src/teste/index.ts:127-160`; ver a seção 5 |

Nenhuma das 55 rotas `/super` respondeu **500** nem saiu do contrato (o que viraria `interno`) nos cenários exercitados, no PGlite e no Postgres 16. Também não apareceu SQL que só quebra no Postgres real.

## 3. Detalhe dos achados

### R4-01. O superadmin consome o conteúdo do aluno e todo o `/admin`

- **Reprodução (P):** `super.prova.ts › RQ1 › superadmin com 2FA abre as rotas…`, com o superadmin de `t.superadmin()` (`acesso: true`, igual ao `superadminCli.ts:52`). Resultados:
  - guarda `acesso`: `concurso`, `trilha`, `offlinePacote`, `revisao`, `simuladosListar`, `liga`, `perfilEstatisticas` e `pushChave` responderam **200**;
  - guarda `admin`: todas as GET sem parâmetro responderam 200 (`adminEditalObter` sem `concursoId` deu 400).
- **Esperado (RQ1 revisado):** 403 em toda a guarda `acesso` para superadmin e admin. O superadmin continua no conteúdo (`/admin`) e no negócio.
- **Causa:**
  - a guarda `acesso` só confere `u.acesso` e ignora o papel (`registrar.ts:101-104`);
  - a CLI liga `acesso: true` para o superadmin;
  - a manutenção também libera quem é `ehAdmin` (`registrar.ts:122`). O teste `SA › modo manutenção` (`superadmin.test.ts:186`) depende disso.
- **Correção proposta:** a guarda `acesso` passa a exigir `papel === 'aluno'`, e a CLI e os convites deixam de ligar `acesso`.
- **Aceite:** casos A1.1–A1.4 da seção 6.

### R4-02. Conteúdo aberto com o 2FA pendente

- **Reprodução (P):** um `authLogin` novo do superadmin devolve `proximo=dois_fatores`. Com esse cookie:
  - `superFinanceiro` → 403 `dois_fatores_pendente`;
  - `trilha` → **200**.
- **Impacto:** com a senha vazada, o 2FA protege o painel, mas não o conteúdo pago.
- **Correção:** a mesma do R4-01 resolve.
- **Aceite:** A1.2.

### R4-03. O papel muda e o `acesso=true` fica

- **Reprodução (P):** o superadmin rebaixa outro superadmin para aluno (`superUsuarioPapel`). Esse aluno faz login e fica com:
  - **0 pedidos**;
  - `me.acesso=true`;
  - `trilha` → **200**.

  Com um admin rebaixado, o resultado é o mesmo: `trilha` 200.
- **Esperado:** um aluno sem pedido pago responde 402 ("sem acesso gratuito", CLAUDE.md).
- **Correção:** ao mudar o papel, recalcular o acesso pelos pedidos (`sincronizarAcesso`/`usuarios_concursos`) e nunca herdar o `acesso` da equipe.
- **Aceite:** A1.5.

### R4-04. Login único

- **Reprodução (P):** `authLogin` com as três contas devolve `pagamento`, `admin` e `dois_fatores`. Na web existe só `/entrar` (`apps/web/src/telas/Entrar.tsx`). Os E2E `05` e `09` entram pelo `/entrar` (`e2e/testes/apoio.ts:117-118`).
- **Estado:** NÃO LOCALIZADA. É requisito novo.
- **Aceite:** casos A2.x.

### R4-05. A aprovação manual não respeita o valor do pedido

Reprodução (P, `RQ4 › cenário C`):

1. Os preços estão em 39700/19700.
2. O aluno pagou Palmital e gerou o Pix do 2º concurso: pedido de **19700**.
3. Com o ativo apontando para o 2º, `superAprovarManual` muda o pedido para `pago/manual/valor=39700`.

O mesmo `preco` vai no `receiveInCash` (`pagamentoManual.ts:147-150`). Com isso o Asaas registra R$ 397 numa cobrança de R$ 197, e o financeiro infla a receita. Um cupom (D23) também seria ignorado.

- **Correção:** usar `pendente.valorCentavos` quando houver Pix pendente e `precoDoConcurso` (com cupom, se houver) quando não houver.
- **Aceite:** A4.4.

### R4-06. Aprovação pelo concurso ativo, não pelo pedido

- **Reprodução (P, cenário C):** o ativo é Palmital, que está pago. `superAprovarManual` responde `jaAprovado=true` e o pedido do 2º concurso segue `pendente/asaas`, sem linha em `usuarios_concursos`.
- **Por que não há saída pela interface hoje:** os botões ficam ocultos porque o aluno tem acesso (R4-08), e o aluno não consegue trocar para um concurso que não pagou.
- **Correção:** criar uma rota no pedido (`POST /super/pagamentos/:id/liberar` ou `aprovar-manual`) que trabalhe com `pedido.concursoId`.
- **Aceite:** A4.3 e A4.4.

### R4-07. Pix vencido fica aberto e pode ser pago duas vezes

Reprodução (P, cenários B2 e B3):

1. Gera o Pix e o marca como vencido.
2. Aprova manualmente com `acaoAsaas='cancelar'`. A resposta vem com `asaas.mensagem="Não havia cobrança Pix pendente"`, e os pedidos ficam `pago/manual` e `vencido/asaas`.
3. Chega o `PAYMENT_RECEIVED` do Pix vencido: os pedidos ficam `pago/manual` e `pago/asaas`, **2 pagos** pelo mesmo concurso.

O sistema não avisa nada. A causa é que a busca considera só o status `pendente` (`:86`).

- **Correção:** tratar o `vencido` com `asaas_payment_id` e sem `cancelado_em` como pendente na aprovação (reaproveitar ou cancelar). No webhook, um 2º pago do mesmo concurso deve virar alerta ou reembolso.
- **Aceite:** A4.2.

### R4-08. A tela do pagamento não resolve o RQ4

Observado em P, cenários A e C:

- **Pedido pago, concurso não liberado:**
  - `PagamentoDetalhe` esconde "Aprovar pagamento manual" (`status !== 'pago' && !usuario.acesso`);
  - a ficha também esconde (`!pagoAprovado`, `UsuarioFicha.tsx:141`);
  - `superPagamentoConciliar` não repara: com o Asaas real em RECEIVED, ele diria "Tudo certo" (`conciliacao.ts:63-66`) e deixaria o acesso desligado.
- **Caminho que existe hoje:** só a API `superAprovarManual` repara, pelo caminho `jaAprovado` (`pagamentoManual.ts:75-78`), sem botão na interface. O outro caminho é "Liberar acesso" (`adminUsuarioLiberarAcesso`), que libera sem pedido. É a mesma porta do acesso gratuito, e o `/admin` é quem decide.
- **Contrato:** `PagamentoSuper` (`superadmin.ts:210`) não tem `concursoId` nem `cupom`, então a tela não consegue mostrar qual concurso o pedido libera.
- **Ressalva:** no cenário A, a conciliação marcou "divergência: Asaas PENDING". É um artefato do Asaas falso, que não muda o status quando o webhook chega (ver as limitações).

### R4-09. Reembolso duplicado

- **Reprodução (P, cenário C):** duas chamadas de `superPagamentoReembolso` antes do webhook respondem 200 e 200, e `t.asaas.estornos` mostra 2 pedidos de estorno para o mesmo `paymentId`.
- **O que protege hoje:** a interface esconde o botão quando há `reembolsoSolicitadoEm`. A API não tem essa trava. Um duplo clique ou duas abas bastam para repetir o estorno.
- **Impacto:** depende de como o Asaas responde a um 2º `refund` (não verificado). No mínimo, a auditoria fica duplicada.
- **Correção:** devolver 409 se `reembolsoSolicitadoEm` já estiver preenchido, ou uma trava `for update`.
- **Aceite:** A4.6.

### R4-10. CSV do financeiro com número negativo virando texto

- **Reprodução (P):** num dia com estorno e sem venda, a linha sai `2026-10-22;todos;0;0,00;…;397,00;'-397,00;0`.
- **Causa:** `celulaCsv` prefixa `'` em tudo que começa com `-`. `reais()` devolve string.
- **Impacto:** o Excel não soma essa coluna.
- **Correção:** só neutralizar o `-` quando o valor não for numérico (regex `^-\d+(,\d+)?$`).

### R4-11. Curingas na busca

- **Reprodução (P):** `q=%` e `q=_` trazem todos os registros, em `pagamentos` (4/4), `usuarios` (11/11) e `webhooks` (4/4), e na auditoria com `alvo=%`.
- **Impacto:** baixo (só o superadmin), mas a busca fica imprecisa.
- **Correção:** escapar `\`, `%` e `_` antes do `ilike`.

### R4-12. Lacunas de cobertura

- **Rotas `/super` sem teste funcional no repositório:**
  - `super2faCodigos`;
  - `superAsaasTestar`;
  - `superUsuarioRevogarSessao`;
  - `superComunicacoesListar`.

  As quatro passaram nos testes de prova (matriz S05, S23, S40 e S45).
- **Rotas de conteúdo do `/admin` sem teste funcional (14):** A03, A05, A07, A09, A13, A21, A24, A25, A29, A32, A35, A36, A40 e A44.
- **Telas do `/super` sem nenhum teste de UI:** Asaas, Webhooks, Equipe, Comunicação, Sistema, Preços e Auditoria. A VisaoGeral aparece só no E2E.
- **Simulador:** os 7 casos web do `/super` rodam contra o simulador de fetch (`super/testes/ajuda.tsx:2-3`), não contra a API.
- **E2E (09):** cobre o 2FA, o layout e a aprovação manual. Não cobre financeiro, CSV, reembolso, preços nem cupons.

## 4. Avaliação RQ1, RQ2, RQ3 e RQ4

- **RQ1 (revisado): REPROVADO no estado atual.**
  - O superadmin entra no app de estudo, com ou sem o 2FA confirmado (R4-01, R4-02).
  - Uma conta da equipe rebaixada vira aluno com acesso gratuito (R4-03).
  - O admin ainda tem as 9 rotas de negócio: A01 e A45–A52 (matriz §2). Os testes `AD › painel com as métricas…` e `AD › admin só age sobre alunos…` **afirmam** esse comportamento.
  - O Conteúdo não é uma seção do `/super`: o Layout aponta para `/admin`, e `WS` confere `href="/admin"`.
- **RQ2: NÃO LOCALIZADO.** Existe um só endpoint e uma só tela de login (R4-04).
- **RQ3: PARCIAL.**
  - **O que funciona:** as 55 rotas `/super` respondem nos dois bancos, sem 500. Destas, 52 têm o comportamento principal comprovado, e 3 têm falha reproduzida (S13, S17 e S37).
  - **Falhas:** o RQ4 (R4-05 a R4-09) e os defeitos menores R4-10 e R4-11.
  - **Dependências do `/admin`:** o `/super` usa A02 (`adminConcursosListar`, em Preços), A50 e A51 (liberar e revogar, na ficha).
  - **UI sem prova:** 7 das 13 telas não têm nenhum teste de UI (R4-12).
- **RQ4: REPROVADO.**
  - Apenas o caso "webhook perdido com o Asaas dizendo RECEIVED" funciona (conciliar, B1).
  - "Pedido pago sem liberação" não tem caminho pela interface.
  - "Vencido pago por fora" gera cobrança dupla.
  - "Aluno com outro concurso" usa o concurso errado e o valor errado.
  - O estorno do Asaas não é idempotente na API.
  - A auditoria das ações existentes está provada (`pedido.aprovar_manual` e `pedido.desfazer_manual`, em T e P).

## 5. Testes que vão quebrar ou precisam mudar com o RQ1, o RQ2 e o RQ4

| Arquivo › caso | Por quê |
|---|---|
| `apps/api/src/teste/index.ts:127-160` (`admin()`, `superadmin()`) | Criam a conta com `acesso: true` e entram por `authLogin`. É preciso tirar o `acesso` da equipe e usar os logins próprios. **Todos** os arquivos que usam esses helpers são afetados. |
| `superadmin.test.ts › superadmin sem 2FA fica bloqueado…` (`:57-67`, `:89`, `:98`) | Usa `authLogin` e espera `proximo: 'dois_fatores'`. `adminPainel` passa a ser negócio. |
| `superadmin.test.ts › superadmin também usa as rotas do admin` (`:125-127`) | Continua válido para o **conteúdo**. `adminPainel` precisa trocar por uma rota de conteúdo. |
| `superadmin.test.ts › modo manutenção…` (`:186`) | Espera `trilha` ≠ 503 para o superadmin. Com o RQ1, deve esperar 403. |
| `superadmin.test.ts › mudar papel…` (`:452-453`) e `› convite da equipe…` (`:471-473`, `proximo: 'admin'`) | Login e `authRedefinir` pelo endpoint único. |
| `admin.test.ts › painel com as métricas, usuários e liberação manual com auditoria` | O admin usa A01 e A47–A52, que passam a ser do superadmin: esperar 403 e mover o caso para o superadmin. |
| `admin.test.ts › admin só age sobre alunos…` | Perde o sentido: o admin não terá mais essas rotas. |
| `pagamento.test.ts › reembolso pelo admin…` e `› reembolso fora dos 7 dias…` | Usam A45, A46 e A52 com o admin. |
| `multi-concurso.test.ts` (usos de `adminUsuarioLiberarAcesso` com o admin) | Passa a ser do superadmin. |
| `guardas.test.ts` | Precisa de casos novos: guarda `acesso` com admin e superadmin → 403, e rotas N com admin → 403. |
| `apps/web/src/super/testes/super.test.tsx › desktop: sidebar… /admin…` (`:18`) | Confere o link `href="/admin"`. Com o Conteúdo como seção, muda. |
| `apps/web/src/admin/testes/pedidos.test.tsx` (4 casos) | A tela Pedidos sai do admin. |
| `e2e/testes/05-admin.spec.ts`, `e2e/testes/09-superadmin.spec.ts` | Entram por `/entrar` (`apoio.ts:117`): precisam das páginas de login próprias. O 09 › "aprovação manual…" depende do botão na ficha, e o RQ4 muda o fluxo. |
| `apps/api/test/superadmin-cli.test.ts` | Não confere o `acesso`, mas a CLI precisa parar de ligá-lo. Falta o caso que prova isso. |

## 6. Casos de aceite propostos

### RQ1 (revisado)

- **A1.1.** Para cada rota da guarda `acesso` (25) e para `GET /api/arquivos/uploads/:nome`, o superadmin com 2FA recebe **403**, e não 402 nem 200. O mesmo vale para o admin.
- **A1.2.** O superadmin com o 2FA pendente recebe 403 nas rotas `acesso` e nas `/admin`.
- **A1.3.** Para cada rota de conteúdo (43, matriz §2 "C"), o superadmin com 2FA e o admin recebem 2xx ou 4xx de validação, nunca 403. O aluno recebe 403.
- **A1.4.** Para cada rota de negócio (9, matriz §2 "N"), o admin recebe 403 e o superadmin com 2FA recebe 2xx.
- **A1.5.** Superadmin ou admin rebaixado para aluno, sem pedido pago: `trilha` → 402. Com pedido pago antes da promoção: `trilha` → 200.
- **A1.6.** A CLI `superadmin:criar` e o convite deixam `acesso=false`, e não existe `usuarios_concursos` com acesso para papéis da equipe.
- **A1.7 (web).** O `/super` tem a seção Conteúdo na mesma sidebar, e não existe link para `/admin`. O admin logado vê só a seção Conteúdo. O superadmin em `/aprender` é redirecionado ao `/super`, e o admin a `/conteudo` ou equivalente.
- **A1.8 (manutenção).** Com a manutenção ativa, o conteúdo do aluno responde 503, e a equipe continua sem acesso a ele (403, não 503).

### RQ2

- **A2.1.** Existem 3 endpoints, por exemplo `POST /auth/login`, `/auth/admin/login` e `/auth/super/login`. A conta de outro papel recebe a mesma resposta genérica de credenciais inválidas e **não abre sessão** (sem `Set-Cookie`).
- **A2.2.** O aluno no login do admin ou do super recebe recusa. O admin no `/entrar` e no login do super também. O superadmin no `/entrar` e no login do admin também.
- **A2.3.** O rate limit e o bloqueio valem por endpoint e por conta. O login do super sempre pede o 2FA.
- **A2.4.** A recuperação de senha e o link de convite levam à página de login do papel certo (`authRedefinir.proximo`).
- **A2.5 (E2E).** Cada papel entra pela sua página. O `/entrar` com uma conta da equipe mostra o erro e fica na página.
- **A2.6.** Uma sessão criada por um endpoint não serve às rotas de outro papel (por exemplo, a sessão do aluno não acessa o super, mesmo que o papel mude depois). O papel mudado derruba as sessões, como já é feito.

### RQ4

- **A4.1. Webhook perdido.** Pedido pendente, Asaas RECEIVED, "Liberar" na tela do pagamento: o pedido fica `pago/asaas` com o valor e o líquido do Asaas, o concurso do pedido fica liberado, o e-mail sai 1 vez e a auditoria registra `pedido.liberar` com motivo. Repetir não muda nada (idempotente).
- **A4.2. Vencido pago por fora.** Pedido vencido com `asaas_payment_id`, "Liberar manualmente": a cobrança é cancelada ou recebida em dinheiro no Asaas, e não nasce um 2º pedido pago. Um `PAYMENT_RECEIVED` posterior dessa cobrança **não** cria um 2º pago e gera alerta ou auditoria.
- **A4.3. Pedido pago sem o concurso liberado.** "Liberar acesso do pedido" religa `usuarios_concursos` do `pedido.concursoId`, sem mexer no valor nem criar pedido. A ação aparece na tela mesmo com `status=pago` e `usuario.acesso=true`.
- **A4.4. Aluno com outro concurso liberado.** A liberação manual do pedido do 2º concurso usa `pedido.concursoId` (não o ativo) e mantém `valorCentavos` do pedido (19700, ou o valor com cupom). O `receiveInCash` usa o mesmo valor, e o 1º concurso continua liberado.
- **A4.5. Estornar.** Pedido manual: "Desfazer" revoga só o concurso do pedido. Pedido Asaas: "Estornar" chama o Asaas 1 vez. O webhook `PAYMENT_REFUNDED` revoga só o concurso do pedido, e o aluno mantém os outros.
- **A4.6. Idempotência do estorno.** A 2ª chamada antes do webhook recebe 409 e não chama o Asaas de novo.
- **A4.7. Sem acesso gratuito.** Nenhuma ação da tela do pagamento libera um concurso sem pedido `pago` daquele concurso. "Liberar acesso" sem pedido (A50) fica restrito ao superadmin, com motivo, e aparece no financeiro como R$ 0 (ou é removido).
- **A4.8. Contrato e UI.** `PagamentoSuper` traz `concursoId`, o nome do concurso, `valorOriginalCentavos` e o cupom. A tela mostra os dois botões ("Estornar" e "Liberar acesso manualmente") de acordo com o estado do pedido, e cada um tem teste de UI e E2E.

## 7. Fechamento

- **Inspecionado:**
  - escopo e protocolo (§1–4, 9), D13, D21 e D23;
  - `packages/shared/src/api/rotas.ts` (55 rotas super e 52 admin);
  - `superadmin.ts` (contratos e CSV);
  - `registrar.ts` e `app.ts` (guardas, arquivos);
  - `rotas/super/*.ts` (todos);
  - `servicos/pagamentoManual.ts`, `conciliacao.ts`, `concursos.ts`, `pagamento.ts` (estorno) e `superadminCli.ts`;
  - `rotas/admin/gestao.ts` (liberar e revogar);
  - `apps/api/src/teste/index.ts`;
  - as 13 telas do `/super` (mapa de chamadas à API) e `PagamentoDetalhe.tsx`/`UsuarioFicha.tsx` em detalhe;
  - `app/Guarda.tsx`, `App.tsx`;
  - os testes `superadmin`, `precos`, `admin` e `multi-concurso`, os testes web do super e do admin, e os E2E 05 e 09.
- **Testado:** os comandos 1 a 8 da seção 1. Resultados:
  - API: 299/299 no PGlite e 299/299 no Postgres 16;
  - web: 74/74;
  - typecheck e lint limpos;
  - prova do R4: 20/20 nos dois bancos;
  - E2E 05 e 09: 6/6.
- **Não testado:**
  - Asaas sandbox real, porque não há credencial: BLOQUEADO;
  - produção e VPS, porque não há autorização: BLOQUEADO;
  - os E2E 01–04 e 06–08 (fora do foco), o worker `enviar-comunicacoes` (só a fila foi provada) e o envio real de SMTP e push;
  - as telas Asaas, Webhooks, Equipe, Comunicação, Sistema, Preços e Auditoria pela UI (só análise estática);
  - concorrência real (duas aprovações ou dois reembolsos em paralelo). O R4-09 foi provado em sequência.
- **Limitações:**
  - O Asaas falso não muda o status da cobrança quando chega o webhook. Por isso a conciliação de um pedido pago por webhook mostra uma falsa "divergência" (RQ4-A). A conclusão do R4-08 sobre a conciliação real (dizer "Tudo certo" sem religar o acesso) vem da leitura de `conciliacao.ts:63-66`.
  - Os testes web usam o simulador de fetch, e não a regra de negócio da API.
  - A comparação PGlite × Postgres foi feita com os mesmos cenários. Não houve divergência entre os bancos.
  - Os bancos `teste_*` criados no Postgres local não foram apagados (comportamento do helper).
  - As evidências valem para o commit `2f71392`.
