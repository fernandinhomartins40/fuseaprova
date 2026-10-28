# Banca R3: Arquitetura, engenharia e dados (painel `/super`)

Revisor R3 (arquiteto sênior). Data: 28/10/2026. Commit de partida: `2f71392` (main). Modo: só auditoria. Nenhum arquivo do projeto foi alterado além deste parecer. Os testes de prova ficam fora do repositório, em `C:\Users\fusea\AppData\Local\Temp\claude\c--FuseDev-fuseaprova\445488ab-e48b-411b-a2b8-1b53b73ae451\scratchpad\r3\test\prova.test.ts`.

Linha de base medida por mim: `pnpm --filter @fuse/api test`, com 14 arquivos e **299/299 aprovados** (PGlite).

## Resumo dos achados

| ID | Sev. | Estado | Local | Uma linha |
|---|---|---|---|---|
| R3-01 | ALTA | CONFIRMADO | apps/api/src/http/registrar.ts:98-101, 121-124; app.ts:177 | O superadmin abre a trilha, a revisão, a liga, os simulados e o pacote offline (todos 200). RQ1 revisado é descumprido. A curadoria (`adminQuestoesListar` 200) é permitida pelo RQ1 revisado, mas hoje fica em outro painel. |
| R3-02 | ALTA | CONFIRMADO | registrar.ts:98-101 | A guarda `acesso` não exige o 2FA. Um superadmin só com a senha (sessão sem 2FA) abre o conteúdo (trilha 200). No app nativo, esse é o caminho padrão (`formulario.ts:18`). |
| R3-03 | MÉDIA | CONFIRMADO | superadminCli.ts:52, 80; cli.ts:89, 100; super/usuarios.ts:300-312 | Um superadmin (ou admin) criado pela CLI tem `acesso=true` sem pedido. Se for rebaixado para aluno, ganha acesso **gratuito** (trilha 200, 0 pedidos). |
| R3-04 | ALTA | CONFIRMADO | servicos/pagamentoManual.ts:62-79 | A aprovação manual vale só para o concurso **ativo**. Com um concurso já pago, ela devolve "já aprovado" e o 2º concurso, pago por fora, nunca é liberado (D21 × D13; RQ4). |
| R3-05 | ALTA | CONFIRMADO | pagamentoManual.ts:68-79; conciliacao.ts:68-71; PagamentoDetalhe.tsx:132 | Não há caminho para refazer a liberação do concurso de um pedido **já pago**. A aprovação manual e a conciliação respondem "ok" e o concurso continua bloqueado (RQ4). |
| R3-06 | MÉDIA | FORTE INDÍCIO | pagamentoManual.ts:55, 90-98 | A aprovação manual grava o preço cheio do 1º concurso por cima do valor do Pix pendente (adicional ou com cupom). Isso distorce o financeiro, o recibo e o desconto D21. |
| R3-07 | MÉDIA | CONFIRMADO | servicos/precos.ts:88-97; pagamento.ts:276-307 | O limite de usos do cupom é ultrapassado: com limite 1, saíram 2 Pix e houve **2 pagamentos confirmados**. Nada reserva o uso nem reage quando o limite é atingido. |
| R3-08 | MÉDIA | CONFIRMADO | rotas/me.ts:88-96 | O **último** superadmin se exclui por `DELETE /me` só com a senha e sem 2FA: sobram 0 superadmins. Isso fura `garantirOutroSuperadmin`. |
| R3-09 | MÉDIA | CONFIRMADO (estático) | super/telas/UsuarioFicha.tsx:344, 358; Precos.tsx:178; gestao.ts:309-330, 369 | O `/super` depende de 3 rotas do `/admin`: liberar acesso, revogar acesso e a lista de concursos. A liberação vale só para o concurso ativo e a revogação revoga **todos**. Sem concurso, sem reconfirmação, e a auditoria fica fora da transação. |
| R3-10 | MÉDIA | CONFIRMADO (estático) | rotas/super/*.ts; shared/api/superadmin.ts | D21 não chegou ao `/super`. Pagamentos, ficha, CSV e financeiro não mostram o concurso do pedido, e a ficha não lista `usuarios_concursos`. Não dá para liberar ou revogar por concurso. |
| R3-11 | BAIXA | FORTE INDÍCIO | servicos/pagamento.ts:113-120 | `gerarPix` marca o pendente antigo como `vencido` sem a condição `status='pendente'`. Se o webhook pagar no meio, um pedido `pago` vira `vencido` com o acesso liberado. A D23 aumenta essa janela. |
| R3-12 | BAIXA | FORTE INDÍCIO | super/pagamentos.ts:328-350 | O reembolso não confere `reembolsoSolicitadoEm` nem trava a linha. Dois cliques fazem 2 chamadas `estornar` ao Asaas e geram 2 auditorias. |
| R3-13 | ALTA | CONFIRMADO (estático) | shared/api/rotas.ts (`adminPainel`, `adminPedidos*`, `adminUsuario*`, `adminAuditoria`, guarda `admin`); gestao.ts:100-179, 233-360 | O papel `admin` vê e opera o **negócio**: receita no painel, pedidos, reembolso sem reconfirmação, usuários, liberar e revogar acesso, auditoria. Isso descumpre o RQ1 revisado ("admin só Conteúdo"). O reembolso também está duplicado, sem a trava de pedido manual. |
| R3-14 | BAIXA | FORTE INDÍCIO | super/comunicacao.ts:101-110; worker/jobs/comunicacoes.ts:48-60 | O limite de 5 comunicações por dia é verificado fora da transação (corrida). Cancelar durante um lote não interrompe os envios já lidos pelo worker, e o `marcar('enviado')` sobrescreve o `ignorado`. |
| R3-15 | BAIXA | HIPÓTESE | super/financeiro.ts:136-141; usuarios.ts:43-44; schema tabelas.ts:640-667 | DAU/WAU/MAU e "última atividade" varrem `tentativas` por `respondida_em` sem índice próprio. `pedidos.estornado_em` e `webhook_eventos.corpo->payment->id` também não têm índice. Hoje o volume é pequeno. |
| R3-16 | BAIXA | CONFIRMADO (estático) | super/usuarios.ts:300-312; comum.ts:94-108 | `garantirOutroSuperadmin` é TOCTOU: conta, depois atualiza, sem trava. Dois superadmins podem rebaixar um ao outro ao mesmo tempo. O papel e a queda das sessões também não ficam numa transação. |

---

## Achados detalhados

### R3-01: o superadmin acessa o app de estudo (RQ1 revisado)
> **Nota sobre o RQ1 revisado (28/10/2026):** o acesso do superadmin à curadoria passa a ser **desejado**, como seção do `/super`. O que continua sendo falha é: (1) o app de estudo (trilha, revisão, liga, simulado, offline), que é o objeto deste achado; e (2) a curadoria morar em outro painel (`/admin`, com layout e login próprios), que é tratado na proposta.
- **Severidade:** ALTA. Descumpre um requisito de liberação do dono.
- **Estado:** CONFIRMADO (Postgres 16 e PGlite).
- **Código:**
  - `registrar.ts:98-101`: a guarda `acesso` só olha `u.acesso`, e o superadmin da CLI tem `acesso=true` (`superadminCli.ts:52, 80`; também `teste/index.ts:149`).
  - `registrar.ts:105-109`: a guarda `admin` aceita superadmin com 2FA.
  - `registrar.ts:122`: a manutenção libera `ehAdmin`.
  - `app.ts:177`: as imagens das questões (`/api/arquivos/uploads`) liberam `ehAdmin`.
  - Na web, `Guarda.tsx:39` usa `ehAdmin` para `/admin`; `LayoutAbas.tsx:14-23` mostra o "Voltar ao painel superadmin" dentro do app do aluno; `super/Layout.tsx:160, 213` traz o link para o `/admin`; `admin/componentes/Layout.tsx:66-67` traz "Ver o app como aluno" e "Voltar ao painel superadmin".
- **Reprodução:** prova `R3-01a`, superadmin com 2FA.
- **Observado:** `trilha 200`, `revisao 200`, `liga 200`, `simuladosListar 200`, `offlinePacote 200`, `adminQuestoesListar 200` e `adminPainel 200`.
- **Esperado:** 403 em todas as rotas `acesso` e `admin` para o papel superadmin.
- **Correção e teste de aceite:** ver a seção "Proposta de arquitetura". O teste percorre `rotasComGuarda('acesso')` e `rotasComGuarda('admin')` com o cookie do superadmin e espera 403 `proibido`. O `GET /api/arquivos/uploads/:nome` também deve responder 403.

### R3-02: a guarda `acesso` não exige o 2FA do superadmin
- **Severidade:** ALTA, porque a senha sozinha dá ao superadmin o conteúdo pago. Isso some com a correção do R3-01, mas é o caminho real hoje no app nativo: lá, `rotaDoProximo('dois_fatores')` vai para `/aprender` (`formulario.ts:18-19`) e `rotaInicial` vai para `/aprender` com `acesso` (`rotaInicial.ts:11`).
- **Estado:** CONFIRMADO (`R3-01b`).
- **Observado:** sessão sem 2FA, `trilha 200`. Na mesma sessão, `adminQuestoesListar` responde 403 `dois_fatores_necessario`.
- **Correção:** a mesma do R3-01 (a guarda `acesso` recusa o papel superadmin). Seria um contrassenso exigir o 2FA para algo que o superadmin não pode fazer.

### R3-03: o superadmin ou admin rebaixado vira aluno com acesso gratuito
- **Severidade:** MÉDIA. Fere a regra inegociável "sem acesso gratuito". Depende de uma ação da equipe, e a interface não avisa.
- **Estado:** CONFIRMADO (`R3-03`).
- **Reprodução:**
  1. `criarOuPromoverSuperadmin` cria a conta (`acesso:true`).
  2. Outro superadmin chama `superUsuarioPapel` com `papel:'aluno'`.
  3. A conta entra pelo login.
- **Observado:** `proximo:'trilha'`, 0 pedidos e `trilha 200`. O mesmo vale para o admin da CLI (`cli.ts:89, 100`, `acesso: true`). O convite (`usuarios.ts:384`) já cria com `acesso:false`, o que mostra que o padrão do projeto não é uniforme.
- **Correção:**
  1. A CLI não toca em `acesso`: conta nova com `false`, promovida mantém o valor.
  2. `superUsuarioPapel`, ao levar para `aluno`, recalcula o acesso a partir dos pedidos pagos e não estornados (`recalcularAcessoPorPedidos`: libera os concursos com pedido pago, revoga os outros e chama `sincronizarAcesso`) dentro de uma transação.
  3. Migração de dados (ver a proposta).
- **Teste de aceite:** repetir `R3-03` e esperar `proximo:'pagamento'` e `trilha 402`.

### R3-04: a aprovação manual não alcança outro concurso (D21; RQ4)
- **Severidade:** ALTA. É uma perda de receita e um bloqueio de atendimento: o aluno pagou e não recebe.
- **Estado:** CONFIRMADO (`R3-04`, Postgres 16).
- **Código:**
  - `pagamentoManual.ts:62`: `concursoId = concursoDoUsuario(aluno)`, ou seja, o **ativo**.
  - `concursos.ts:96-99` e `:258-259`: enquanto houver um concurso liberado, o ativo é sempre um liberado, e o aluno não consegue ativar um bloqueado (`ativarConcurso:274`).
  - Por isso, quem já pagou Palmital nunca tem Siqueira como ativo, e a aprovação sempre encontra o pagamento de Palmital (`:63-79`).
  - A rota é `/super/usuarios/:id/aprovar-pagamento`: recebe o **usuário**, não o pedido nem o concurso (`AprovarManualEntrada`, `superadmin.ts:354`).
- **Observado:** `{"jaAprovado":true,"mensagem":"O aluno já tinha pagamento aprovado: nada foi duplicado."}`, `siqueira.acesso=false` e o pedido de Siqueira continua `pendente` (19700).
- **Agravante na interface:** o botão só aparece com `p.status !== 'pago' && !p.usuario.acesso` (`PagamentoDetalhe.tsx:132`). Para quem tem qualquer concurso liberado, o botão nem existe.
- **Correção:** ver "Avaliação RQ4 e proposta": a aprovação passa a ser **por pedido** (ou por concurso explícito).
- **Teste de aceite:** repetir `R3-04` chamando a ação no pedido de Siqueira e esperar `siqueira.acesso=true`, o pedido `pago` e `metodo='manual'` com o valor do próprio pedido.

### R3-05: não há como refazer a liberação de um pedido pago (RQ4)
- **Severidade:** ALTA. É o caso "o sistema falhou em liberar" que o dono descreveu.
- **Estado:** CONFIRMADO (`R3-05`).
- **Reprodução:**
  1. Pedido de Siqueira pago por webhook.
  2. Simulo a falha: `usuarios_concursos.acesso=false`.
  3. Chamo `superAprovarManual`, que devolve "já aprovado" (o pago de Palmital) sem tocar em Siqueira.
  4. Chamo `superPagamentoConciliar`.
- **Observado:** a conciliação só registra (`conciliacao.ts:68-71`; com o Asaas `RECEIVED`, a resposta seria "Tudo certo") e `siqueira.acesso=false`. `confirmarPagamento` também não age em pedido `pago` (`pagamento.ts:282`).
- **Correção:** `liberarPedido(pedidoId)` idempotente (ver a seção RQ4). A conciliação, ao ver "pago aqui e pago no Asaas", também confere `usuarios_concursos` e reporta (ou corrige) "pago sem liberação".
- **Teste de aceite:** com o mesmo cenário, `superPedidoLiberar` deixa `siqueira.acesso=true`. Uma segunda chamada não altera nada e é auditada como `sem_mudanca`.

### R3-06: a aprovação manual sobrescreve o valor do pedido
- **Severidade:** MÉDIA. Afeta a contabilidade e o recibo.
- **Estado:** FORTE INDÍCIO, por leitura: o caminho não foi exercitado, porque o R3-04 o bloqueia no cenário multi-concurso.
- **Código:** `pagamentoManual.ts:55` lê `precoCentavos` (o 1º concurso, sem cupom). Em `:90-98`, `dadosManuais.valorCentavos = preco` é aplicado no `update` do **pendente** (`:100`), por cima de um valor que pode ser o adicional (19700) ou ter cupom (`valorOriginalCentavos` e `cupomId` ficam incoerentes).
  - O `receberEmDinheiro` envia esse mesmo valor ao Asaas (`:136`), que diverge do `value` da cobrança.
  - A D23 documenta que o registro usa "o preço vigente do 1º concurso", mas não trata o pendente já precificado.
- **Correção:** o valor da aprovação manual é o do pedido (pendente ou vencido) quando ele existe. Sem pedido, usa `precoComCupom(precoBase(usuario, concurso))`. Um campo opcional `valorRecebidoCentavos`, acima do mínimo e auditado, cobre um valor diferente.
- **Teste de aceite:** um Pix adicional de 19700 aprovado manualmente fica com `valorCentavos=19700` e `receberEmDinheiro.value=197`.

### R3-07: o limite de usos do cupom não é respeitado
- **Severidade:** MÉDIA. Perda de receita controlada pelo próprio dono.
- **Estado:** CONFIRMADO (`R3-07`: cupom `UNICOR3` com `limiteUsos:1`, 2 alunos, 2 Pix e 2 webhooks, **2 pedidos pagos com o cupom**).
- **Causa:**
  - O limite conta só os pagos (`precos.ts:88-97`), e a D23 diz que "Pix pendente não conta".
  - Nenhum ponto reage quando o uso N acontece: `confirmarPagamento` não olha o cupom.
  - `sincronizarPixPendentes({cupomId})` só roda quando o superadmin edita o cupom (`super/precos.ts:139`).
- **Correção, escolha do dono (registrar na DECISOES):**
  - **(a)** Reserva: o pendente conta para o limite enquanto `pixExpiraEm > agora`. É a mais simples e não deixa ultrapassar.
  - **(b)** Ao confirmar um pagamento com cupom que atingiu o limite, `confirmarPagamento` dispara, fora da transação, `sincronizarPixPendentes(deps, agora, { cupomId })`, que cancela os demais pendentes. Ainda pode ultrapassar em corrida, porque o Pix já pago não pode ser recusado.
  - Em qualquer caso, o pagamento já feito é honrado.
- **Teste de aceite:** com limite 1 e (a), o 2º `pagamentoPix` com o cupom responde 400 "atingiu o limite". Com (b), depois do 1º pago o 2º pedido fica `vencido` com `cancelado_em` e o Asaas registra a remoção.

### R3-08: o último superadmin se autoexclui por `DELETE /me`
- **Severidade:** MÉDIA. Integridade operacional: o painel fica sem dono, e a recuperação só é possível pela CLI na VPS.
- **Estado:** CONFIRMADO (`R3-08`, Postgres 16: `meExcluir 200`, superadmins não excluídos = 0, sessão **sem 2FA**).
- **Correção:**
  - `meExcluir` recusa o papel diferente de aluno com 409: "Contas da equipe são excluídas pelo superadmin".
  - Ou aplica `garantirOutroSuperadmin` e exige a sessão com 2FA.
  - Com o RQ1/RQ2, o caminho natural é a guarda `aluno` em todas as rotas `/me/*` de aluno (exclusão, exportação, concursos, Pix).
- **Teste de aceite:** repetir `R3-08` e esperar 409 ou 403, com 1 superadmin restante.

### R3-09: o `/super` usa rotas do `/admin`
- **Estado:** CONFIRMADO (estático; `grep api('admin` em `apps/web/src/super`).
- **Rotas e problemas:**
  - `adminUsuarioLiberarAcesso` (`UsuarioFicha.tsx:344`):
    - só o concurso ativo (`gestao.ts:313-318`), então para quem já tem um liberado é um no-op silencioso;
    - não tem reconfirmação;
    - motivo de 10 caracteres;
    - auditoria fora da transação (`:320`).
  - `adminUsuarioRevogarAcesso` (`UsuarioFicha.tsx:358`): `revogarTudo` revoga **todos os concursos**, inclusive os pagos.
  - `adminConcursosListar` (`Precos.tsx:178`): só para o select de concurso do cupom.
  - `gestao.ts:272` (o super vê as sessões de outro admin) e `:369` (exceção do super em `exigirAlvoAluno`) ficam mortos depois do RQ1.
- **Impacto:** com o RQ1 revisado, liberar e revogar são ações de **negócio** e saem do `/admin`; os dois botões precisam de rotas `/super` próprias. A lista de concursos é conteúdo e continua acessível ao superadmin pela guarda `conteudo`. Hoje, liberar e revogar também tratam o concurso de forma errada.
- **Correção:** rotas próprias (ver a lista na proposta).

### R3-10: D21 ausente do painel do super
- **Estado:** CONFIRMADO (estático). `grep concurso apps/api/src/rotas/super` só encontra as linhas dos cupons. `PagamentoSuper`, `FichaUsuarioResposta`, o CSV de pagamentos e o `FinanceiroResposta` não têm `concursoId` nem `concursoNome`.
- **Impacto:**
  - O superadmin não sabe qual concurso um pedido libera e não vê quais concursos o aluno tem liberados.
  - Não consegue liberar ou revogar por concurso.
  - O financeiro não separa por concurso nem mostra o desconto de cupom (`valor_original - valor`).
  - Os segmentos de comunicação ("pagos" = `u.acesso`) não são por concurso.
  - A D13 não promete o recorte por concurso, mas a D21 diz que "aprovação manual, liberação e revogação do admin passam por" `servicos/concursos.ts`, e a UI do super não dá meios de escolher.
- **Correção mínima:**
  - `concurso: {id, nome} | null` em `PagamentoSuper`, na lista e no CSV.
  - `concursos: [{id, nome, acesso, acessoEm, cargo, pedidoPagoId}]` na ficha.
  - Filtro `concursoId` em pagamentos e no financeiro.
  - `cupomCodigo` e `descontoCentavos` no pagamento.

### R3-11: `gerarPix` pode rebaixar um pedido pago para vencido
- **Estado:** FORTE INDÍCIO.
- **Código:** `pagamento.ts:113-120`. O `removerCobranca` falha (o Asaas recusa remover cobrança recebida) e só gera um *warn*. Em seguida, `update pedidos set status='vencido' where id=…` roda **sem** `status='pendente'`.
- **Sequência:** o aluno paga no banco; o webhook marca `pago`; o app, aberto com o preço antigo depois de uma mudança de preço (D23), chama `pagamentoPix`, que leu o pendente antes do webhook. O resultado é pedido `vencido`, acesso liberado e receita sumindo do financeiro.
- **Correção:** `where id and status='pendente'`, e só seguir para a nova cobrança se o `update` afetou uma linha. Se o Asaas recusar a remoção com 400, reconsultar a cobrança (`obterCobranca`) e confirmar se ela foi paga.
- **Teste de aceite:** com o Asaas falso e o `removerCobranca` falhando com o pedido já `pago`, o pedido continua `pago`.

### R3-12 e R3-13: reembolso sem idempotência e duplicado no `/admin`
- **R3-12:** `super/pagamentos.ts:328-350` não recusa um pedido com `reembolsoSolicitadoEm` já preenchido (a UI esconde o botão, mas a API não protege) e não trava a linha. Correção: `update … set reembolso_solicitado_em=agora where id and status='pago' and reembolso_solicitado_em is null returning` **antes** de chamar o Asaas; se o Asaas falhar, desfazer o campo.
- **R3-13:** `gestao.ts:162-179` é uma segunda implementação, com o código de erro `pix_indisponivel` em vez de `asaas_indisponivel`, sem reconfirmação, sem auditoria antes e depois e sem recusar `metodo='manual'` que tenha `asaasPaymentId` (aprovação manual que aproveitou um Pix pendente).
  - Proposta: um único serviço `servicos/reembolso.ts`, usado pelos dois painéis.
  - Ou retirar o dinheiro do `/admin` (o dono decide; a D13 sugere tirar).

### R3-14: comunicação, limite diário e cancelamento
- `comunicacao.ts:101-110`: o `count` dos envios do dia e o `insert` estão em comandos separados. Duas criações simultâneas passam o limite de 5.
  - Correção: `pg_advisory_xact_lock(hashtext('comunicacao-dia'))` dentro da transação de criação.
- Worker `comunicacoes.ts:48-60`: o lote é lido uma vez. Se o superadmin cancelar no meio, o laço continua enviando, e `marcar('enviado')` sobrescreve `ignorado/cancelada`.
  - Correção: `update … where id=envio and status='pendente'` antes de enviar (reserva), ou reler o status da comunicação a cada iteração.

### R3-15: índices para as consultas do painel
- **HIPÓTESE:** sem volume de produção, não medi.
  - DAU/WAU/MAU (`financeiro.ts:139`) filtra `tentativas.respondida_em` sem `usuario_id` e não tem índice que comece por `respondida_em`.
  - Os filtros `ativoDias`/`inativoDias` e "última atividade" usam o índice (`usuario_id, questao_id, respondida_em`) só pelo prefixo `usuario_id`.
  - `linhaDoTempo` e a lista de webhooks filtram `corpo->'payment'->>'id'` sem índice de expressão.
- **Proposta (migração aditiva):**
  - `create index concurrently tentativas_respondida_idx on tentativas (respondida_em)`;
  - `… tentativas_usuario_respondida_idx on tentativas (usuario_id, respondida_em desc)`;
  - `… webhook_eventos_payment_idx on webhook_eventos ((corpo->'payment'->>'id'))`;
  - `… pedidos_estornado_em_idx`.
- **Datas:** `periodo()` usa `inicioDoDiaSP`, e `dataSql` serializa ISO com `::timestamptz`. As fronteiras de dia em São Paulo estão corretas. A paginação usa `limit/offset` com `count` separado, o que é adequado ao volume.

### R3-16: o último superadmin em corrida
- `garantirOutroSuperadmin` conta e depois atualiza sem trava. O risco prático é baixo (são 2 pessoas).
- Correção: `select … from usuarios where papel='superadmin' for update` dentro da mesma transação do `update papel` e da queda das sessões.

---

## Proposta de arquitetura para RQ1 (revisado) e RQ2

### Princípio
Há **dois mundos** e **três portais**.

- **App de estudo:** só o papel `aluno`.
- **Painel único `/super`:** um só layout, uma só sidebar e um só módulo web, com seções filtradas por papel:
  - **Conteúdo:** `admin` e `superadmin`;
  - **Negócio:** só `superadmin`.
- **O `/admin` deixa de ser um painel.** Vira só a URL de login da equipe e um redirecionamento para `/super/conteudo`.

A autorização é por **capacidade** (`estudo`, `conteudo`, `negocio`), derivada do papel em um único lugar do shared, e não por comparações de papel espalhadas. `ehAdmin` deixa de existir.

```ts
// packages/shared/src/dominio.ts
export const CAPACIDADES = { aluno: ['estudo'], admin: ['conteudo'], superadmin: ['conteudo', 'negocio'] } as const;
export const pode = (papel, cap) => CAPACIDADES[papel]?.includes(cap) ?? false;
export const PORTAL_DO_PAPEL = { aluno: '/entrar', admin: '/admin/entrar', superadmin: '/super/entrar' };
export const CASA_DO_PAPEL = { aluno: '/aprender', admin: '/super/conteudo', superadmin: '/super' };
```

### Guardas da API (`packages/shared/src/api/rotas.ts` e `apps/api/src/http/registrar.ts:86-124`)

| Guarda | Quem passa | Erros |
|---|---|---|
| `nenhuma`, `webhook` | sem mudança | — |
| `login` | qualquer papel logado. Fica **só** em `meObter`, `meSenha`, `authSair` e no `meAtualizar` restrito (a equipe muda nome e senha; o cargo é recusado com 403) | 401 |
| `aluno` (nova) | papel `aluno`. Para `meusConcursos`, `meuConcurso*`, `pagamento*`, `concursoPorId`, `meExportar`, `meExcluir` (R3-08) e `meComprarProtetor` | 401 / 403 `proibido` |
| `acesso` | papel `aluno` **e** `u.acesso`. A ordem é: `if (!pode(papel,'estudo')) 403`, depois o 402 | 401 / 403 / 402 |
| `conteudo` (renomeia `admin`) | `pode(papel,'conteudo')`. Para o superadmin, exige também `exigirDoisFatores` | 401 / 403 `proibido` / 403 `dois_fatores_*` |
| `superadmin`, `superadmin_2fa` | sem mudança | — |

- **Manutenção** (`registrar.ts:121-124`): `if (def.guarda !== 'acesso') return`. Como `acesso` passa a ser só para alunos, o `ehAdmin` sai.
- **`app.ts:177`** (imagens das questões): `if (!(u.papel === 'aluno' && u.acesso) && !pode(u.papel,'conteudo')) throw sem_acesso`. A equipe vê as imagens para a curadoria e não estuda.
- **Comprovantes** (`app.ts:189`): sem mudança.

### Separação das rotas `/admin` em conteúdo × negócio

Inventário: `rotas.ts:428-865` tem 54 rotas com a guarda `admin`.

| Grupo | Rotas hoje | Destino |
|---|---|---|
| **Conteúdo** (admin e superadmin) | `adminConcursos*` (listar, criar, clonar, obter, atualizar), `adminCargos*`, `adminProvas*`, `adminQuestoes*` (com prévia, lote, retirar-origem), `adminUpload`, `adminDisciplinas`, `adminAssuntos*`, `adminTrilhas*`, `adminUnidade*`, `adminSecao*`, `adminLicao*`, `adminEdital*`, `adminImportacoes*`, `adminReports*` | Guarda `conteudo`. **Os caminhos e os nomes podem ficar** (`/api/admin/...`), para não mexer em 40+ handlers e nos testes. O prefixo da API não precisa espelhar a URL da web. Renomear para `/api/conteudo/...` é mecânico, mas não traz ganho de segurança. |
| **Negócio** (só superadmin) | `adminPainel` (mistura receita, `gestao.ts:110-112`, com métricas de conteúdo), `adminPedidosListar`, `adminPedidoReembolso`, `adminUsuariosListar`, `adminUsuarioObter`, `adminUsuarioRevogarSessoes`, `adminUsuarioLiberarAcesso`, `adminUsuarioRevogarAcesso`, `adminAuditoria` | **Remover do `/admin`.** Todas têm equivalente melhor no `/super` (`superPagamentos*`, `superPagamentoReembolso`, `superUsuarios*`, `superUsuarioRevogarSessao`, `superAuditoria`, `superFinanceiro`), exceto liberar e revogar, que ganham rotas `/super` por concurso (abaixo). Isso fecha o R3-13 e a duplicação. |
| **Painel de conteúdo** | a parte de conteúdo do `adminPainel` (questões por status, reports abertos, importações) | `GET /admin/painel` com a guarda `conteudo`, **sem** receita, pedidos e usuários ativos. A receita já está em `superFinanceiro` e na Visão geral. |
| **Auditoria de conteúdo** | `adminAuditoria` | Não é necessária para o admin. Opcional: `conteudoAuditoria` com as próprias ações dele (`admin_id = u.id`). |

Rotas novas de negócio no `/super`, que substituem o que o painel usa do `/admin` (R3-09):

- `POST /super/usuarios/:id/concursos/:concursoId/liberar`: cortesia sem receita, com reconfirmação, motivo e auditoria na mesma transação;
- `POST /super/usuarios/:id/concursos/:concursoId/revogar`: `revogarConcurso`, e não `revogarTudo`;
- `POST /super/pedidos/:id/liberar` e `POST /super/pedidos/:id/aprovar-manual`: RQ4, ver abaixo;
- a ficha `superUsuarioObter` ganha `concursos[]` (R3-10);
- `Precos.tsx:178` pode continuar em `adminConcursosListar`, porque a guarda `conteudo` aceita o superadmin.

Também muda, em `gestao.ts`:

- `:272` e `:369`: os ramos do superadmin somem com as rotas de usuários;
- `exigirAlvoAluno` sai também;
- os blocos de pedidos, usuários e auditoria de `apps/api/test/admin.test.ts` migram para `superadmin.test.ts`.

### Web: estrutura de URLs e módulo único

```
/entrar                     login do aluno (o app nativo usa só este)
/admin/entrar               login da equipe de conteúdo (novo)
/super/entrar               login do dono (novo)
/admin, /admin/*            Navigate para /super/conteudo/* (favoritos e e-mails antigos)
/recuperar/:token  /admin/recuperar/:token  /super/recuperar/:token
/super                      Visão geral (negócio; o admin é levado a /super/conteudo)
/super/conteudo             Painel de conteúdo
/super/conteudo/concursos | questoes | questoes/nova | questoes/:id | importacao | importacao/:id | trilhas | edital | reports
/super/pagamentos, /super/usuarios, ... /super/sistema   negócio, como hoje
/super/2fa                  só superadmin
```

| Arquivo | Mudança |
|---|---|
| `apps/web/src/admin/util.ts:16` | `BASE_ADMIN = '/super/conteudo'`. As referências do módulo usam a constante, então os links internos acompanham. |
| `apps/web/src/admin/rotas.tsx` | Exporta `RotasConteudo` **sem** o `Layout` e **sem** as telas de negócio. São apagados: `telas/Pedidos.tsx`, `telas/Usuarios.tsx`, `telas/Auditoria.tsx`, `testes/pedidos.test.tsx` e `admin/componentes/Layout.tsx` (com "Ver o app como aluno" e "Voltar ao painel superadmin"). |
| `apps/web/src/super/rotas.tsx` | Monta `<Route path="conteudo/*" element={<RotasConteudo/>}/>` dentro do `Layout` do super. As rotas de negócio ficam sob `<SoNegocio>`, que manda o admin para `/super/conteudo`. Usa um QueryClient só (`criarClienteAdmin` já é o do super, `super/rotas.tsx:9`). |
| `apps/web/src/super/Layout.tsx` | Os itens da sidebar e do menu inferior ganham `cap: 'negocio' \| 'conteudo'` e são filtrados por `pode(me.papel, cap)`. Um grupo **Conteúdo** (Painel, Concursos, Questões, Importação, Trilhas, Edital, Reports) substitui o link "Conteúdo (/admin)" (`:160`, `:213`). O selo vira "Superadmin" ou "Equipe de conteúdo". No celular, o admin vê Painel, Questões, Importação, Reports e "Mais". O status do 2FA aparece só para o superadmin. |
| `apps/web/src/app/App.tsx:210-228` | Uma rota `/super/*` com `<Guarda nivel="painel">`. `/admin/*` vira `<Navigate>`. `/admin/entrar`, `/super/entrar` e os `recuperar` ficam fora das guardas e antes delas. No `EH_APP`, nada disso é montado. |
| `apps/web/src/app/Guarda.tsx` | Níveis: `aluno` (login e papel aluno), `acesso` (aluno, acesso e onboarding), `painel` (`pode(papel,'conteudo')`; superadmin com 2FA pendente vai para `/super/2fa`). Num 401, vai para o login do portal do pathname. Com o papel errado, vai para `CASA_DO_PAPEL`. `/meus-concursos`, `/configuracoes`, `/pagamento` e `/onboarding` passam ao nível `aluno`. |
| `apps/web/src/api/cliente.ts:61, 170` e `admin/api.ts` | O redirecionamento global do 401 decide pelo pathname. A sessão do super cai com 2 h sem uso. |
| `apps/web/src/app/rotaInicial.ts` | Usa `CASA_DO_PAPEL`. No `EH_APP`, a equipe vê uma tela neutra ("Use o navegador para o painel") e faz `authSair`. |
| `apps/web/src/telas/formulario.ts:16-31` | `proximo: 'conteudo'` vai para `/super/conteudo` e `dois_fatores` para `/super/2fa`. No `EH_APP`, a equipe vai para a tela neutra (fecha o R3-02 no app nativo). |
| `apps/web/src/telas/Entrar.tsx` → `FormLogin({ portal })` | Três instâncias: aluno (com cadastro), equipe e dono (os dois sem cadastro). Cada uma chama o seu endpoint. |
| `apps/web/src/app/LayoutAbas.tsx:14-23` | A faixa "vendo o app como aluno" sai. |
| `super/telas/UsuarioFicha.tsx:340-362`, `PagamentoDetalhe.tsx:130-138` | Usam as rotas novas por concurso e por pedido. |

### Logins separados (RQ2)

| Portal | Endpoint | Aceita | Sessão | `proximo` |
|---|---|---|---|---|
| `/entrar` | `POST /auth/login` | `aluno` | 60 dias | `pagamento` \| `onboarding` \| `trilha` |
| `/admin/entrar` | `POST /auth/equipe/login` | `admin` | 60 dias. Sugiro 12 h, como o super, porque edita conteúdo pago; o dono decide | `conteudo` |
| `/super/entrar` | `POST /auth/super/login` | `superadmin` | 12 h, com 2 h de ociosidade (`sessoes.ts:16-18`) | `dois_fatores` |

- **Implementação** (`apps/api/src/rotas/auth.ts:107-118`): `entrarNoPortal(portal)`. Busca a conta, roda `conferirSenha` **sempre** e confere o bloqueio. Com papel diferente do portal, responde o **mesmo 401 `credenciais_invalidas`**, para não revelar que o e-mail é da equipe. O rate limit é compartilhado pelos três endpoints (chave `login:ip`), para não triplicar as tentativas.
- **`ProximoPasso`:** `admin` vira `conteudo`. `authCadastro` fica só no portal do aluno.
- **Recuperação** (`auth.ts:120-145`): um endpoint só. O link segue o **papel da conta** (`/recuperar/`, `/admin/recuperar/`, `/super/recuperar/`), então funciona mesmo se pedido pelo portal errado. `authRedefinir` devolve o `proximo` do papel.
- **Convite e "forçar senha"** (`super/usuarios.ts:205-211, 390`): `criarLinkSenha(papel)` e `entrar: PORTAL_DO_PAPEL[papel]`.
- **Sair:** `authSair` não muda. A web volta para `PORTAL_DO_PAPEL[me.papel]`, e não fixo para `/entrar` (`super/rotas.tsx:48`).
- **Cookie:** continua único. Uma conta tem um papel, as sessões caem quando o papel muda (`super/usuarios.ts:308`) e o portal confere o papel. Não é preciso coluna nova em `sessoes`.
- **Capacitor (`EH_APP`):** só o `FormLogin` do aluno está no bundle. A equipe recebe o 401 genérico.

### Migração dos dados de produção
1. **A segurança não depende de migração.** Com a guarda `acesso` exigindo o papel `aluno`, o `acesso=true` da equipe deixa de abrir o app assim que o deploy sai.
2. **Migração recomendada** `00xx_equipe_sem_acesso.sql` (idempotente, rollback pela auditoria), para os números (comAcesso, segmentos, filtros) e para o R3-03:
   ```sql
   insert into auditoria (acao, alvo, detalhes, motivo)
     select 'migracao.equipe_acesso', 'usuario:' || id,
            jsonb_build_object('acessoAntes', acesso, 'papel', papel), 'RQ1: equipe fora do app de estudo'
     from usuarios where papel in ('admin', 'superadmin') and acesso = true;
   update usuarios_concursos uc set acesso = false
     from usuarios u
     where u.id = uc.usuario_id and u.papel in ('admin', 'superadmin')
       and not exists (select 1 from pedidos p where p.usuario_id = u.id and p.concurso_id = uc.concurso_id and p.status = 'pago');
   update usuarios u set acesso = exists (select 1 from usuarios_concursos uc where uc.usuario_id = u.id and uc.acesso)
     where u.papel in ('admin', 'superadmin');
   ```
   Pedidos, progresso, XP e a liga da semana ficam intactos.
3. **CLI** (`superadminCli.ts:52, 80`; `cli.ts:89, 100`): parar de escrever `acesso: true`. Conta nova da equipe com `acesso:false`, sem `concursoId` e sem `onboardingConcluidoEm`.
4. **`superUsuarioPapel`:** ao ir para `aluno`, recalcular o acesso pelos pedidos pagos (R3-03).
5. **Antes de aplicar**, contar em produção (BLOQUEADO nesta rodada): `select papel, acesso, count(*) from usuarios where papel <> 'aluno' group by 1, 2`. Ver também se algum membro da equipe tem pedido pago.
6. **Sessões abertas:** ficam válidas. Só o que acessam muda. Os favoritos `/admin/...` caem no `Navigate` para `/super/conteudo/...`.

### Riscos e consequências
1. **Testes:** precisam ser reescritos, e não só ajustados.
   - `superadmin.test.ts` (`adminPainel`);
   - `admin.test.ts` (pedidos, usuários e auditoria do admin);
   - `teste/index.ts:133, 149` (`acesso:true` na equipe);
   - `auth.test.ts` (login único);
   - `apps/web/src/admin/testes/*` (base `/admin`, `pedidos.test.tsx`);
   - `apps/web/src/super/testes/super.test.tsx` (sidebar por papel);
   - `rotaInicial.test.ts`;
   - E2E (login da equipe em `/entrar`).
2. **A equipe de conteúdo perde** pedidos, usuários, auditoria e liberar ou revogar acesso. É o que o RQ1 pede, mas o PRD 5.17 dava isso ao admin. **Registrar a D24 em `docs/DECISOES.md`** como uma divergência consciente do PRD.
3. **Sem "Ver o app como aluno":** a prévia (`adminQuestaoPrevia`) continua. Se o dono quiser ver a lição inteira, criar uma prévia de lição sob a guarda `conteudo`, **sem** sessão de estudo, XP nem liga.
4. **Um e-mail, um papel:** quem for aluno e da equipe precisa de duas contas.
5. **Layout:** as telas de conteúdo passam a renderizar no `Layout` do super, que já usa `admin/componentes/ui` (`super/componentes.tsx:18`). Conferir a largura do `EditorQuestao` e das `Trilhas` com a sidebar de 248 px e no celular.
6. **Bundle:** as telas de conteúdo entram por `lazy` no módulo do super. O bundle do aluno não muda.

---

## Avaliação RQ3 (D13 e D23 × backend)

| Promessa | Situação | Evidência |
|---|---|---|
| D13: liberar e revogar acesso no super | **Parcial**: usa rotas do `/admin`, só o concurso ativo, e a revogação revoga tudo | R3-09 |
| D13: aprovação manual idempotente, "o financeiro separa Asaas e manual" | Idempotente por concurso ativo, mas **não** alcança outro concurso e sobrescreve o valor | R3-04, R3-06 |
| D13: "Desfazer" marca estornado e revoga | OK por concurso do pedido (`pagamentoManual.ts:165-199`), em transação com `for update` | leitura |
| D13: reembolso | OK, mas sem idempotência na API | R3-12 |
| D13: conciliação individual e em lote (até 200, relatório ou correção) | OK. Não detecta "pago sem liberação" | R3-05 |
| D13: webhooks com erro, reprocessar (idempotente) | OK: `confirmar` e `estornar` com `for update`, `vencer` condicional | leitura de `webhook.ts`, `pagamento.ts` |
| D13: comunicação (fila, 30/120 por minuto, 5 por dia, 1 por aluno em 24 h, cancelar) | Implementada. Corridas no limite diário e no cancelamento | R3-14 |
| D13: sistema/jobs (`jobs_execucoes`, retenção de 30 dias) | Implementado (`worker/util.ts:44-72`, `agenda.ts:66`) | leitura |
| D13: financeiro em São Paulo, CSV com `;` e BOM | Implementado. Sem recorte por concurso nem cupom | R3-10, R3-15 |
| D13: usuários/LGPD (anonimizar mantendo pedidos, último superadmin protegido) | Protegido no `/super`, **furado** por `DELETE /me` | R3-08 |
| D23: preços com reconfirmação e auditoria; `sincronizarPixPendentes` | OK. O update para `vencido` é condicional a `pendente` (`precos.ts:196`) | leitura |
| D23: limite de usos do cupom | **Não cumprido** na prática | R3-07 |
| D23: "Pix nunca abaixo de R$ 5 nem de graça" | OK no servidor (`aplicarCupom`). Na aprovação manual não se aplica (usa o preço cheio) | R3-06 |
| D21 no super (concurso por pedido, liberar e revogar por concurso) | **Ausente** | R3-10 |
| RQ1 e RQ3 revisados: Conteúdo como seção do `/super`, admin restrito | **Ausente**: o conteúdo é outro painel (`/admin`, outro layout), e o admin vê o negócio (painel com receita, pedidos, reembolso, usuários, auditoria) | R3-13; `super/Layout.tsx:160,213`; `admin/rotas.tsx` |

**Veredito R3 para o RQ3:** NÃO CUMPRIDO, por causa do R3-04, R3-05, R3-07, R3-09, R3-10 e R3-13. Não exercitei as telas de conteúdo do `/admin` na web nesta rodada; a suíte da API (299/299) cobre as rotas.

---

## Avaliação RQ4 e proposta (estornar e liberar acesso no pagamento)

### Como está hoje
- **Aprovação manual** (`superAprovarManual`, rota por **usuário**):
  - concurso = o ativo (`pagamentoManual.ts:62`), nunca o do pedido aberto na tela;
  - valor = o preço cheio vigente, sobrescrevendo o do pedido (R3-06);
  - idempotência = "existe pago desse concurso ativo?", com `for update` na linha do aluno, o que está correto para corridas;
  - para o aluno que já tem outro concurso pago, devolve "já aprovado" e não faz nada (R3-04, CONFIRMADO).
- **Liberação** (`liberarConcurso`): idempotente (upsert e `sincronizarAcesso`), correta por concurso. O problema é que nenhuma ação do super a chama para o **concurso do pedido**.
- **Pedido Asaas pago sem liberação:** sem ação (R3-05, CONFIRMADO).
- **Pix pago e webhook não chegou:** "Conciliar" resolve se o Asaas disser `RECEIVED`/`CONFIRMED` (`conciliacao.ts:76-78` → `confirmarPagamento`, que libera o concurso do pedido). Coberto pelo teste existente.
- **Pix pendente ou vencido comprovado por fora** (o aluno pagou outro Pix ou transferiu): só pela aprovação manual, com os defeitos acima. Para um vencido, `aprovarPagamentoManual` não o reaproveita (busca só `pendente`) e cria um pedido novo. Aceitável, mas o vencido fica solto.
- **Estorno:**
  - Asaas pago dentro de 7 dias: "Reembolsar".
  - Fora do prazo: o mesmo botão, com "fora do prazo" (`foraDoPrazo`), já existe.
  - Manual: "Desfazer aprovação manual".
  - Falta a idempotência (R3-12) e falta estornar um manual que aproveitou um Pix do Asaas recebido "em dinheiro". Hoje é só "desfazer", e no Asaas a cobrança fica `RECEIVED_IN_CASH`, o que é correto: não houve dinheiro pelo Asaas para devolver.

### Desenho mínimo

**1. `POST /super/pedidos/:id/liberar`: "Liberar acesso deste pedido" (refazer a liberação).**
- Precondição: `pedido.status = 'pago'` (Asaas ou manual). Sem pedido pago, a resposta é 409 "Use Conciliar ou Aprovar pagamento manual". Assim **nunca** é acesso gratuito: a ação só materializa o que um pagamento registrado já dá direito.
- Numa transação:
  1. `select … for update` no pedido;
  2. `concursoId = pedido.concursoId ?? concursoDoUsuario(...)`;
  3. `liberarConcurso(tx, usuarioId, concursoId, agora)`;
  4. `auditar(... 'pedido.liberar', antes:{acessoConcurso}, depois:{acessoConcurso}, motivo)`, dentro da transação.
- Idempotente: se já estava liberado, devolve `{ alterado:false }`.
- Exige motivo (5+). A reconfirmação é opcional, porque não move dinheiro.
- Na UI: o botão aparece quando `status==='pago'` e `!pagamento.concursoLiberado` (campo novo em `PagamentoSuper`). Isso substitui o critério `!usuario.acesso` (`PagamentoDetalhe.tsx:132`).

**2. `POST /super/pedidos/:id/aprovar-manual`: "Pix comprovado por fora".**
- Precondição: `pedido.status in ('pendente','vencido')` e `metodo='asaas'`.
- Antes de aprovar, **consultar o Asaas** (`obterCobranca`). Se estiver pago lá, aplicar `confirmarPagamento` (é conciliação, não manual) e responder "Pago no Asaas: conciliado". Isso evita registrar como manual um Pix que foi pago pelo Asaas.
- Senão, numa transação, com `for update` no pedido e na linha do aluno:
  1. Se já existe pedido `pago` do **mesmo concurso do pedido**, responder `jaAprovado` e só garantir `liberarConcurso` (idempotente).
  2. Senão, atualizar **este** pedido para `pago, metodo='manual'`, mantendo `valorCentavos` (e `cupomId`/`valorOriginal`) **do pedido**, com os campos `manual*` e `aprovadoPor`.
  3. `liberarConcurso(pedido.concursoId)`.
  4. Auditoria na transação.
- Depois da transação: `tratarCobrancaPendente` (receber em dinheiro com o valor **do pedido**, cancelar ou nada) e o e-mail.
- Reconfirmação e motivo continuam (D13).
- A rota atual por usuário passa a exigir `concursoId` explícito (pagamento recebido sem nenhum Pix gerado) e calcula `precoComCupom(precoBase(usuario, concurso))`. Isso respeita o desconto D21 e o mínimo D23.

**3. Estornar (um botão, decidido pelo método):**
- `metodo='asaas'` e `status='pago'`: reembolso pelo Asaas.
  - Fazer a idempotência antes da chamada: `update … set reembolso_solicitado_em=agora where id and status='pago' and reembolso_solicitado_em is null returning`. Sem linha atualizada, a resposta é 409 "Reembolso já pedido".
  - Se o Asaas falhar, desfazer `reembolso_solicitado_em`.
  - Fora de 7 dias, exigir `foraDoPrazo=true` (já existe) e motivo.
  - O acesso cai no webhook `PAYMENT_REFUNDED` (só o concurso do pedido), como hoje.
- `metodo='manual'`: "estorno manual" = `desfazerAprovacaoManual` (já é por concurso, em transação). Se o pedido tem `asaasPaymentId` com `RECEIVED_IN_CASH`, não chamar o estorno do Asaas, porque ele recusaria e não há dinheiro lá. Mostrar "Devolva o valor por fora; o pedido fica estornado".
- Unificar num serviço `servicos/reembolso.ts`, usado também pelo `/admin` se ele mantiver o dinheiro (R3-13).

**4. Nada disso cria acesso gratuito:** "liberar" exige pedido pago; "aprovar manual" grava receita com o valor do pedido; "estornar" revoga. A única liberação sem receita continua sendo a cortesia explícita (`…/concursos/:id/liberar`), que o dono pode suprimir. Ela não dá desconto (`precoBase` só conta pedidos pagos), como a D21 define.

**Testes de aceite do RQ4:**
1. R3-04 com `POST /super/pedidos/:idSiqueira/aprovar-manual`: Siqueira liberado, pedido `pago/manual` com 19700. Repetir devolve `jaAprovado` sem novo pedido.
2. R3-05 com `POST /super/pedidos/:id/liberar`: Siqueira liberado. Repetir dá `alterado:false`. Num pedido `pendente`, 409.
3. Pix pendente pago no Asaas falso (`definirStatus('RECEIVED')`) com `aprovar-manual`: resposta "conciliado", `metodo='asaas'`.
4. Reembolso em dois cliques simultâneos: 1 chamada `estornar` e um 409.
5. Desfazer um manual que tem `asaasPaymentId`: nenhuma chamada ao Asaas e o concurso revogado.

---

## Fechamento

**Inspecionado:**
- API:
  - `http/registrar.ts`, `app.ts` e `rotas/auth.ts`;
  - `rotas/me.ts:88`, `rotas/admin/gestao.ts:135-370`, `rotas/super/*.ts` (todos);
  - `servicos/{concursos, pagamento, pagamentoManual, precos, conciliacao, webhook, sessoes, superadminCli}.ts`.
- Banco: `packages/db/src/schema/tabelas.ts` (pedidos, tentativas, sessões, auditoria, jobs, comunicações).
- Shared: `packages/shared/src/dominio.ts`, `api/rotas.ts` (guardas), `api/superadmin.ts` (trechos).
- Worker: `apps/worker/src/jobs/comunicacoes.ts`, `agenda.ts`, `util.ts`.
- Web: `app/{Guarda, App, rotaInicial, LayoutAbas}.tsx`, `telas/formulario.ts`, `telas/Entrar.tsx`, `super/{Layout, rotas}.tsx`, `super/telas/{PagamentoDetalhe, UsuarioFicha}.tsx`, `admin/componentes/Layout.tsx`.
- Decisões D13, D21 e D23.

**Testado:**
- `pnpm --filter @fuse/api test` (PGlite): 14 arquivos, **299/299 aprovados**.
- Testes de prova `scratchpad/r3/test/prova.test.ts`, com `npx vitest run --globals --dir <scratchpad>/r3`. 8/8 executados em PGlite e depois em **Postgres 16 real** (`TESTE_DATABASE_URL=postgres://fuse@127.0.0.1:55432/postgres`). Saídas observadas (Postgres 16):
  - R3-01a: `trilha, revisao, liga, simuladosListar, offlinePacote, adminQuestoesListar, adminPainel` = 200.
  - R3-01b: sem 2FA, `trilha 200` e admin 403 `dois_fatores_necessario`.
  - R3-03: rebaixado, `proximo trilha`, pedidos 0, `trilha 200`.
  - R3-04: `jaAprovado:true`, `siqueira.acesso false`, pedido de Siqueira pendente (19700).
  - R3-05: aprovar devolve `jaAprovado:true`; conciliar dá 200 com a mensagem "Divergência: aqui está "pago" e no Asaas "PENDING"" (o Asaas falso não muda o status pelo webhook); `siqueira.acesso false`.
  - R3-07: 2 pedidos pagos com um cupom de limite 1.
  - R3-08: `meExcluir 200`, superadmins não excluídos = 0. Na primeira rodada, em PGlite, deu 400 por falta de `confirmacao:'EXCLUIR'` no corpo; corrigi o corpo da prova.

**Não testado e por quê:**
- R3-06, R3-11, R3-12, R3-14 e R3-16: são corridas ou caminhos dependentes de ordem de eventos. Ficaram só na leitura, marcados FORTE INDÍCIO.
- R3-15: sem volume nem `EXPLAIN` de produção.
- A web (Guarda, rotas e Sair): só leitura. Não rodei `pnpm --filter @fuse/web test` nem o E2E.
- Produção, para contar os superadmins e admins com `acesso=true`: BLOQUEADO (sem acesso nesta rodada).
- O Asaas real (idempotência do `estornar` repetido, recusa do `DELETE` em cobrança recebida): sem credencial de sandbox, e o cliente falso aproxima esse comportamento.

**Limitações:** o Asaas falso não reflete o webhook no status da cobrança, por isso o R3-05 mostra "PENDING" na conciliação. A conclusão (nenhuma ação refaz a liberação de um pedido pago) vem também da leitura de `conciliacao.ts:68-71` e `pagamento.ts:282`. Os números de linha são do commit `2f71392`. A proposta de arquitetura é um desenho, não foi implementada nem testada.
