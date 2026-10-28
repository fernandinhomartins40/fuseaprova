# Matriz de verificação: painel superadmin (`/super`) e rotas `/admin`

- **Revisor:** R4 (qualidade, funcionalidades e regressões). **Data:** 28/10/2026. **Commit:** `2f71392` (main, sem alterações locais no código).
- **Ambiente:** Windows 11, Node 24.21, pnpm 10. PGlite (padrão) e **Postgres 16.15 real** em `127.0.0.1:55432` (`TESTE_DATABASE_URL`, um banco novo por `criarAmbienteTeste()`, isto é, por arquivo de teste). Asaas **falso** (`criarAsaasFalso`). Sem produção.
- **Métodos:**
  - **T** = teste do repositório, executado nesta rodada (PGlite **e** Postgres 16: 299/299 nos dois);
  - **P** = teste de prova do R4, fora do repositório (`scratchpad/r4/prova/super.prova.ts`), executado em PGlite **e** Postgres 16 (20/20 nos dois; os achados são registrados por `anotar`, não por falha de asserção);
  - **W** = teste web (Vitest + Testing Library) **contra o simulador de fetch**, não contra a API real;
  - **E2E** = Playwright contra a API real + build de produção;
  - **L** = só leitura de código.
- **Estados:** VERIFICADA · PARCIAL · FALHA REPRODUZIDA · IMPLEMENTADA, NÃO VERIFICADA · NÃO LOCALIZADA · BLOQUEADA.
- Abreviações dos testes: `SA` = `apps/api/test/superadmin.test.ts`; `PR` = `apps/api/test/precos.test.ts`; `AD` = `apps/api/test/admin.test.ts`; `PG` = `apps/api/test/pagamento.test.ts`; `MC` = `apps/api/test/multi-concurso.test.ts`; `CO` = `apps/api/test/conteudo-offline.test.ts`; `GU` = `apps/api/test/guardas.test.ts`; `WS` = `apps/web/src/super/testes/super.test.tsx`; `E09` = `e2e/testes/09-superadmin.spec.ts`; `E05` = `e2e/testes/05-admin.spec.ts`.
- **Guarda:** toda rota `superadmin`/`superadmin_2fa` tem o caso `SA › guardas do superadmin (D13) › %s: 401 sem login, 403 para aluno e para admin` (55 casos, T). Isso prova a guarda, não o comportamento; não é repetido em cada linha abaixo.

## 1. Rotas `/super` (55)

| # | Rota (nome · método caminho) | Tela → ação | Serviço / dado | Prova do comportamento (arquivo › caso) | Auditoria provada? | Estado |
|---|---|---|---|---|---|---|
| S01 | `super2faStatus` · GET /super/2fa | DoisFatores, Layout, Sistema | `doisfatores.statusDoisFatores` | T: SA › "superadmin sem 2FA fica bloqueado…"; E09 | n/a | VERIFICADA |
| S02 | `super2faIniciar` · POST /super/2fa/iniciar | DoisFatores → "Gerar QR code" | `iniciarDoisFatores` (QR SVG) | T: idem; E09 | n/a | VERIFICADA |
| S03 | `super2faAtivar` · POST /super/2fa/ativar | DoisFatores → "Ativar" | `ativarDoisFatores`, `codigos_recuperacao` | T: idem (código errado 400, 10 códigos só hash); E09 | `2fa.ativar` só L | VERIFICADA (auditoria L) |
| S04 | `super2faVerificar` · POST /super/2fa/verificar | DoisFatores → "Confirmar" | `verificarDoisFatores` | T: idem (reuso negado, recuperação 1×); E09 (código errado → alerta) | `2fa.recuperacao_usada` T | VERIFICADA |
| S05 | `super2faCodigos` · POST /super/2fa/codigos | Sistema → novos códigos | `gerarCodigosRecuperacao` | **P**: 200, 10 códigos, restantes=10, senha errada 403 | `2fa.codigos` P (1) | VERIFICADA (só P; sem teste no repo) |
| S06 | `superFinanceiro` · GET /super/financeiro | VisaoGeral (KPIs, gráfico, filtros) | `calcularFinanceiro` | T: SA › "sistema…" (mês), "aprova…" (metodo=manual); **P**: dia/semana/mês × todos/asaas/manual × 3 períodos (27 combinações), série = totais, 400 para período invertido, > 2 anos e data inválida | n/a | VERIFICADA |
| S07 | `superFinanceiroCsv` · GET /super/financeiro/csv | VisaoGeral → Exportar | idem + `gerarCsv` | T: SA (33 linhas); **P**: 27 combinações, 10 colunas, linhas = série | `exportar.csv` L | VERIFICADA com defeito: negativo vira texto (R4-10) |
| S08 | `superPagamentosListar` · GET /super/pagamentos | Pagamentos (busca, filtros, paginação); Comunicação (busca de pago) | `ondePagamentos` | T: SA (e-mail, CPF, id Asaas); W: WS › "filtros vão para a API"; E09; **P**: 4 status, 2 métodos, período, paginação, `porPagina=101` → 400, `pagina=999` → vazio | n/a | VERIFICADA; `%`/`_` não escapados (R4-11) |
| S09 | `superPagamentosCsv` · GET /super/pagamentos/csv | Pagamentos → Exportar | idem | T: SA (metodo=manual); **P**: 5 filtros, 17 colunas por linha, nome com `"`, `;` e `=` neutralizado | `exportar.csv` **P** (5) | VERIFICADA |
| S10 | `superConciliarLote` · POST …/conciliar-lote | Pagamentos e Asaas → conciliar período | `conciliarPedido` | T: SA › "conciliação em lote…"; **P**: 1 falha do Asaas → 200 com `erros=1` | `pedido.conciliar(_lote)` L | VERIFICADA |
| S11 | `superPagamentoObter` · GET …/:id | PagamentoDetalhe | `linhaDoTempo` | T: SA (linha do tempo, sem payload Pix); **P**: manual sem Asaas 200, UUID inexistente 404, id inválido 400 | n/a | VERIFICADA; contrato sem `concursoId` (R4-08) |
| S12 | `superPagamentoConciliar` · POST …/:id/conciliar | PagamentoDetalhe → "Conciliar" | `conciliarPedido` | T: SA › "conciliar: o Asaas diz pago…"; **P**: manual → 200 "não é conciliado", Asaas fora → 502, pedido pago sem concurso liberado → só "divergência", não repara (RQ4-A) | `pedido.conciliar` T | VERIFICADA; não serve ao RQ4-A |
| S13 | `superPagamentoReembolso` · POST …/:id/reembolso | PagamentoDetalhe → "Reembolsar" | `asaas.estornar` | T: SA (reconfirmação, manual 409); **P**: 2ª chamada antes do webhook → 200 e 2º estorno no Asaas | L | **FALHA REPRODUZIDA** (R4-09, idempotência) |
| S14 | `superPagamentoCancelarPix` · POST …/:id/cancelar | PagamentoDetalhe → "Cancelar Pix" | `asaas.removerCobranca` | T: SA (vencido + `canceladoEm`, 2ª vez 409) | L | VERIFICADA |
| S15 | `superPagamentoReenviarEmail` · POST …/:id/reenviar-email | PagamentoDetalhe, Comunicação | `enviarEmailConfirmacao` | T: SA; **P**: pedido pendente → 409 | L | VERIFICADA |
| S16 | `superPagamentoDesfazerManual` · POST …/:id/desfazer-manual | PagamentoDetalhe → "Desfazer aprovação manual" | `desfazerAprovacaoManual` | T: SA (revoga, webhook atrasado não reverte); **P** (RQ4-C): desfazer o 2º concurso mantém o 1º | `pedido.desfazer_manual` T | VERIFICADA |
| S17 | `superAprovarManual` · POST /super/usuarios/:id/aprovar-pagamento | UsuarioFicha e PagamentoDetalhe → "Aprovar pagamento manual" (`acoes.tsx`) | `aprovarPagamentoManual` | T: SA (3 casos); W: WS › "pede observação e a senha…"; E09 › "aprovação manual… libera o acesso"; **P** RQ4: valor errado, concurso errado, Pix vencido aberto | `pedido.aprovar_manual` T | **FALHA REPRODUZIDA** (R4-05, R4-06, R4-07) |
| S18 | `superComprovanteEnviar` · POST /super/comprovantes | AprovarManual → anexar | multipart, assinatura do arquivo | T: SA › "comprovante: só imagem ou PDF…" | L | VERIFICADA |
| S19 | `superWebhooksListar` · GET /super/webhooks | Webhooks; Comunicação | `webhook_eventos` | T: SA (situacao=erro); **P**: 4 situações, evento, q, paginação | n/a | VERIFICADA |
| S20 | `superWebhooksReprocessarLote` · POST …/reprocessar-lote | Webhooks, Comunicação | `reprocessarEvento` | T: SA; **P**: sem ids → 200 total 0 | L | VERIFICADA |
| S21 | `superWebhookReprocessar` · POST …/:id/reprocessar | Webhooks → reprocessar | `reprocessarEvento` | T: SA (idempotente, e-mail 1×); **P**: inexistente 404 | L | VERIFICADA |
| S22 | `superAsaasStatus` · GET /super/asaas | Asaas | `asaas.minhaConta` | T: SA (sem expor chave/token) | n/a | VERIFICADA (Asaas falso) |
| S23 | `superAsaasTestar` · POST /super/asaas/testar | Asaas → "Testar conexão" | `asaas.saldo` | **P**: ok → 200 `ok:true`; falha → 200 `ok:false` | `asaas.testar` **P** (2) | VERIFICADA (só P) |
| S24 | `superAsaasSaldo` · GET /super/asaas/saldo | Asaas | `asaas.saldo` | T: SA (aviso de conta compartilhada); **P**: falha → 502 | n/a | VERIFICADA |
| S25 | `superAsaasExtrato` · GET /super/asaas/extrato | Asaas | `asaas.extrato` + filtro por pedidos | T: SA (só lançamentos do Fuse); **P**: período invertido → 400 | n/a | VERIFICADA |
| S26 | `superAsaasEstatisticas` · GET /super/asaas/estatisticas | Asaas | pedidos locais | T: SA; **P**: sem período → 200 | n/a | VERIFICADA |
| S27 | `superAsaasWebhook` · GET /super/asaas/webhook | Asaas | `asaas.listarWebhooks` | T: SA (só o do app) | n/a | VERIFICADA |
| S28 | `superAsaasWebhookSalvar` · PUT /super/asaas/webhook | Asaas → configurar | criar/atualizar webhook | T: SA | `asaas.webhook_salvar` L | VERIFICADA |
| S29 | `superAsaasWebhookReativar` · POST …/webhook/reativar | Asaas → reativar fila | `atualizarWebhook` | T: SA (só o do app) | L | VERIFICADA |
| S30 | `superUsuariosListar` · GET /super/usuarios | Usuarios (busca, filtros) | `ondeUsuarios` | T: SA (bloqueado, pago, papel); W: WS (cartões); E09; **P**: 18 combinações (papel ×3, acesso, pago, bloqueado, ativoDias, inativoDias, excluídos, período, celular, `'`) | n/a | VERIFICADA; `%` não escapado (R4-11) |
| S31 | `superUsuariosCsv` · GET /super/usuarios/csv | Usuarios → Exportar | idem | T: SA (CPF mascarado); **P**: 16 colunas com filtro `ativoDias` | `exportar.csv` L | VERIFICADA |
| S32 | `superUsuarioObter` · GET /super/usuarios/:id | UsuarioFicha | `ficha` | T: SA; E09; **P**: ficha do próprio superadmin, com push, de excluído, 404 | n/a | VERIFICADA |
| S33 | `superUsuarioEditar` · PATCH /super/usuarios/:id | UsuarioFicha → editar | update + unicidade | T: SA (nome, e-mail duplicado 409); **P**: celular 200, sem campos 400 | `usuario.editar` L | VERIFICADA |
| S34 | `superUsuarioForcarSenha` · POST …/forcar-senha | UsuarioFicha | `criarLinkSenha` + e-mail | T: SA | L | VERIFICADA |
| S35 | `superUsuarioBloquear` · POST …/bloquear | UsuarioFicha | sessões caem | T: SA (login 403 `conta_bloqueada`) | L | VERIFICADA |
| S36 | `superUsuarioDesbloquear` · POST …/desbloquear | UsuarioFicha | | T: SA | L | VERIFICADA |
| S37 | `superUsuarioPapel` · POST …/papel | UsuarioFicha → papel | update papel + sessões | T: SA (último superadmin 409, promoção exige 2FA); **P**: rebaixar superadmin/admin para aluno mantém `acesso=true` sem pedido → `trilha` 200 | `usuario.papel` T (contagem) | **FALHA REPRODUZIDA** (R4-03) |
| S38 | `superUsuarioExportar` · GET …/exportar | UsuarioFicha → exportar | `exportarDadosUsuario` | T: SA (sem segredos); **P**: conta excluída 200 | L | VERIFICADA |
| S39 | `superUsuarioAnonimizar` · POST …/anonimizar | UsuarioFicha → excluir (LGPD) | `anonimizarUsuario` | T: SA (e-mail digitado, si mesmo 409); W: WS › "ficha: excluir (LGPD)…" | `usuario.anonimizar` T | VERIFICADA |
| S40 | `superUsuarioRevogarSessao` · DELETE …/sessoes/:sessaoId | UsuarioFicha → encerrar sessão | delete `sessoes` | **P**: 200, cookie do aluno → 401, de novo → 404 | `usuario.revogar_sessao` **P** | VERIFICADA (só P) |
| S41 | `superEquipe` · GET /super/equipe | Equipe | join `sessoes` | T: SA; **P**: `ultimoAcessoEm` preenchido em PG 16 | n/a | VERIFICADA |
| S42 | `superEquipeConvidar` · POST /super/equipe/convites | Equipe → convidar | conta sem senha + link 72 h | T: SA (e-mail, link, 409); **P**: e-mail em maiúsculas normalizado | `equipe.convidar` L | VERIFICADA |
| S43 | `superComunicacaoPrevia` · POST …/previa | Comunicação → prévia | `condicaoSegmento` | T: SA (pagos/e-mail; inativos sem dias → 400); **P**: 2 canais × 4 segmentos → 200 | n/a | VERIFICADA |
| S44 | `superComunicacaoCriar` · POST /super/comunicacoes | Comunicação → enviar | fila `comunicacoes_envios` | T: SA (sem SMTP 409, na fila); **P**: 6ª do dia → 429 (limite 5/dia) | `comunicacao.criar` L | VERIFICADA |
| S45 | `superComunicacoesListar` · GET /super/comunicacoes | Comunicação → histórico | `mapComunicacao` | **P**: 200, paginação | n/a | VERIFICADA (só P) |
| S46 | `superComunicacaoCancelar` · POST …/:id/cancelar | Comunicação → cancelar | | T: SA; **P**: concluída → 409 | L | VERIFICADA |
| S47 | `superSistema` · GET /super/sistema | Sistema | `pg_database_size`, `jobs_execucoes` | T: SA; **P**: PG 16.15 real → 200, 8 jobs | n/a | VERIFICADA |
| S48 | `superPrecos` · GET /super/precos | Precos | `lerPrecos` | T: PR › "sem nada salvo…" | n/a | VERIFICADA |
| S49 | `superPrecosSalvar` · PUT /super/precos | Precos → salvar | `salvarPrecos` + `sincronizarPixPendentes` | T: PR (Pix pendente cancelado); **P**: limites 499→400, 500→200, 500000→200, 500001→400, "de" = preço → 400 | `precos.salvar` T | VERIFICADA |
| S50 | `superCupons` · GET /super/cupons | Precos | `usosDosCupons` | T: PR | n/a | VERIFICADA |
| S51 | `superCupomCriar` · POST /super/cupons | Precos → novo cupom | | T: PR; **P**: duplicado em minúsculas 409, concurso inexistente 400, 91% 400 | `cupom.criar` L | VERIFICADA |
| S52 | `superCupomAtualizar` · PUT /super/cupons/:id | Precos → editar | `sincronizarPixPendentes` | T: PR (desativar cancela Pix); **P**: inexistente 404 | `cupom.atualizar` L | VERIFICADA |
| S53 | `superConfiguracoes` · GET /super/configuracoes | Sistema | `lerConfiguracoes` | T: SA (manutenção); **P** | n/a | VERIFICADA |
| S54 | `superConfiguracoesSalvar` · PUT /super/configuracoes | Sistema → salvar | `salvarConfiguracoes` | T: SA (código repetido 403, manutenção 503) | `config.salvar` T (antes/depois/IP/motivo) | VERIFICADA |
| S55 | `superAuditoria` · GET /super/auditoria | Auditoria (filtros) | `auditoria` | T: SA (acao, alvo); **P**: acao, adminId, alvo, período, paginação, `adminId` inválido 400 | n/a | VERIFICADA |

Fora do registro: `GET /api/super/comprovantes/:nome` (`app.ts`) — T: SA › "comprovante…" (superadmin lê, admin 403). VERIFICADA.

Resumo: **55/55 rotas responderam no PGlite e no Postgres 16 sem 500 e sem resposta fora do contrato** nos cenários exercitados. **4 rotas não têm teste funcional no repositório** (S05, S23, S40, S45); foram provadas só pelo R4. **3 rotas com falha reproduzida** (S13, S17, S37).

## 2. Rotas `/admin` (guarda `admin`, 52) — separação exigida pelo RQ1/RQ3 revisado

Classificação proposta: **C** = conteúdo (superadmin e admin); **N** = negócio (passa a ser só do superadmin). Hoje **todas** aceitam admin e superadmin (com 2FA). Na varredura do R4 (**P**), o superadmin recebeu 200 em todas as GET sem parâmetro (`adminEditalObter` sem `concursoId` → 400, esperado).

| # | Rota | Tipo | Tela (`apps/web/src/admin/telas`) ou consumidor | Prova | Estado |
|---|---|---|---|---|---|
| A01 | `adminPainel` | **N** | Painel | T: AD › "painel com as métricas…"; SA | VERIFICADA |
| A02 | `adminConcursosListar` | C | Concursos; **também `super/telas/Precos.tsx`** | T: AD | VERIFICADA |
| A03 | `adminConcursoCriar` | C | Concursos | — | IMPLEMENTADA, NÃO VERIFICADA |
| A04 | `adminConcursoClonar` | C | Concursos | T: MC › "clonar concurso…" | VERIFICADA |
| A05 | `adminConcursoObter` | C | (sem consumidor na web) | — | IMPLEMENTADA, NÃO VERIFICADA |
| A06 | `adminConcursoAtualizar` | C | Concursos | T: AD, MC | VERIFICADA |
| A07 | `adminCargosListar` | C | (sem consumidor na web) | P: só fumaça 200 | IMPLEMENTADA, NÃO VERIFICADA |
| A08 | `adminCargoCriar` | C | (sem consumidor na web) | T: AD | VERIFICADA |
| A09 | `adminCargoAtualizar` | C | (sem consumidor na web) | — | IMPLEMENTADA, NÃO VERIFICADA |
| A10 | `adminProvasListar` | C | Concursos, EditorQuestao | T: AD | VERIFICADA |
| A11 | `adminProvaCriar` | C | Concursos | T: AD | VERIFICADA |
| A12 | `adminProvaObter` | C | EditorQuestao | T: AD | VERIFICADA |
| A13 | `adminProvaAtualizar` | C | Concursos | — | IMPLEMENTADA, NÃO VERIFICADA |
| A14 | `adminQuestoesListar` | C | Questoes | T: AD; W: `admin/testes/questoes.test.tsx` | VERIFICADA |
| A15 | `adminQuestaoCriar` | C | EditorQuestao | T: AD; W: editor.test | VERIFICADA |
| A16 | `adminQuestaoObter` | C | EditorQuestao | T: AD, CO | VERIFICADA |
| A17 | `adminQuestaoAtualizar` | C | EditorQuestao | T: AD; W: editor.test; E05 | VERIFICADA |
| A18 | `adminQuestaoPrevia` | C | Questoes | T: AD | VERIFICADA |
| A19 | `adminQuestoesLote` | C | Questoes, Importacoes | T: AD, CO; W: questoes.test | VERIFICADA |
| A20 | `adminQuestoesRetirarOrigem` | C | Concursos | T: CO | VERIFICADA |
| A21 | `adminUpload` | C | EditorQuestao (`admin/api.ts`) | — | IMPLEMENTADA, NÃO VERIFICADA |
| A22 | `adminDisciplinas` | C | consultas | T: AD | VERIFICADA |
| A23 | `adminAssuntosListar` | C | consultas | T: AD | VERIFICADA |
| A24 | `adminAssuntoCriar` | C | (sem consumidor na web) | — | IMPLEMENTADA, NÃO VERIFICADA |
| A25 | `adminAssuntoAtualizar` | C | (sem consumidor na web) | — | IMPLEMENTADA, NÃO VERIFICADA |
| A26 | `adminTrilhas` | C | Trilhas | T: AD; W: trilhas.test | VERIFICADA |
| A27 | `adminTrilhasOrdem` | C | Trilhas | T: AD; W: trilhas.test | VERIFICADA |
| A28 | `adminUnidadeCriar` | C | Trilhas | T: AD | VERIFICADA |
| A29 | `adminUnidadeAtualizar` | C | Trilhas | — | IMPLEMENTADA, NÃO VERIFICADA |
| A30 | `adminUnidadeExcluir` | C | Trilhas | T: AD | VERIFICADA |
| A31 | `adminSecaoCriar` | C | Trilhas | T: AD | VERIFICADA |
| A32 | `adminSecaoAtualizar` | C | Trilhas | — | IMPLEMENTADA, NÃO VERIFICADA |
| A33 | `adminSecaoExcluir` | C | Trilhas | T: AD | VERIFICADA |
| A34 | `adminLicaoCriar` | C | Trilhas | T: AD | VERIFICADA |
| A35 | `adminLicaoAtualizar` | C | Trilhas | — | IMPLEMENTADA, NÃO VERIFICADA |
| A36 | `adminLicaoExcluir` | C | Trilhas | — | IMPLEMENTADA, NÃO VERIFICADA |
| A37 | `adminEditalObter` | C | Edital | T: AD › "modo edital…" | VERIFICADA |
| A38 | `adminEditalSalvar` | C | Edital | T: AD | VERIFICADA |
| A39 | `adminEditalPublicar` | C | Edital | T: AD | VERIFICADA |
| A40 | `adminImportacoesListar` | C | Importacoes | P: só fumaça 200 | IMPLEMENTADA, NÃO VERIFICADA |
| A41 | `adminImportacaoObter` | C | Importacoes | T: AD | VERIFICADA |
| A42 | `adminImportacaoAtualizar` | C | Importacoes | T: AD | VERIFICADA |
| A43 | `adminReportsListar` | C | Reports | T: CO | VERIFICADA |
| A44 | `adminReportAtualizar` | C | Reports | — | IMPLEMENTADA, NÃO VERIFICADA |
| A45 | `adminPedidosListar` | **N** | Pedidos | T: PG; W: `admin/testes/pedidos.test.tsx` | VERIFICADA |
| A46 | `adminPedidoReembolso` | **N** | Pedidos (`AcoesAcesso.tsx`) | T: PG › "reembolso pelo admin…", "fora dos 7 dias…"; W: pedidos.test | VERIFICADA (duplica S13) |
| A47 | `adminUsuariosListar` | **N** | Usuarios | T: AD | VERIFICADA |
| A48 | `adminUsuarioObter` | **N** | Usuarios | T: AD | VERIFICADA |
| A49 | `adminUsuarioRevogarSessoes` | **N** | Usuarios | T: AD › "admin só age sobre alunos…" | VERIFICADA |
| A50 | `adminUsuarioLiberarAcesso` | **N** | Usuarios/AcoesAcesso; **`super/telas/UsuarioFicha.tsx` → "Liberar acesso"** | T: AD, MC; W: pedidos.test (motivo ≥ 10) | VERIFICADA; libera sem pedido (ver R4-08) |
| A51 | `adminUsuarioRevogarAcesso` | **N** | Usuarios/AcoesAcesso; **`super/telas/UsuarioFicha.tsx` → "Revogar acesso"** | T: AD › "admin só age sobre alunos…" | VERIFICADA |
| A52 | `adminAuditoria` | **N** | Auditoria | T: AD, PG | VERIFICADA (duplica S55) |

Resumo: 43 de conteúdo e 9 de negócio. **14 rotas de conteúdo sem teste funcional** (A03, A05, A07, A09, A13, A21, A24, A25, A29, A32, A35, A36, A40, A44). As 3 rotas `/admin` consumidas pelo `/super` (A02, A50, A51) são as dependências apontadas no RQ3.

## 3. Telas

| Tela | Testes web (W, simulador) | E2E | Estado da cadeia UI → API real |
|---|---|---|---|
| `super/Layout.tsx` | WS › 3 casos (desktop, tablet, celular; link "/admin") | E09 (sidebar, recolher, "Mais", Sair) | VERIFICADA (o link "/admin" muda com o RQ1) |
| `super/telas/DoisFatores.tsx` | — | E09 (1º e 2º login, código errado) | VERIFICADA |
| `super/telas/VisaoGeral.tsx` | — | E09 (só `kpi-bruta` visível) | PARCIAL (filtros e CSV sem teste de UI) |
| `super/telas/Pagamentos.tsx` | WS › "desktop: tabela, e os filtros vão para a API", "celular: cartões e filtros numa folha" | E09 (busca, linha "Manual") | VERIFICADA (CSV e conciliar lote sem teste de UI) |
| `super/telas/PagamentoDetalhe.tsx` | WS › "celular: o detalhe é uma tela empilhada…" | — | PARCIAL; RQ4: botões ocultos nos 3 cenários (R4-08) |
| `super/telas/Usuarios.tsx` | WS › "lista no celular vira cartões…" | E09 (busca → ficha) | VERIFICADA |
| `super/telas/UsuarioFicha.tsx` | WS › "pede observação e a senha…", "ficha: excluir (LGPD)…" | E09 (aprovar manual) | PARCIAL (editar, bloquear, papel, sessão, exportar sem teste de UI) |
| `super/telas/Asaas.tsx` | — | — | IMPLEMENTADA, NÃO VERIFICADA na UI (API VERIFICADA) |
| `super/telas/Webhooks.tsx` | — | — | IMPLEMENTADA, NÃO VERIFICADA na UI |
| `super/telas/Equipe.tsx` | — | — | IMPLEMENTADA, NÃO VERIFICADA na UI |
| `super/telas/Comunicacao.tsx` | — | — | IMPLEMENTADA, NÃO VERIFICADA na UI |
| `super/telas/Sistema.tsx` | — | — | IMPLEMENTADA, NÃO VERIFICADA na UI |
| `super/telas/Precos.tsx` | — | — | IMPLEMENTADA, NÃO VERIFICADA na UI |
| `super/telas/Auditoria.tsx` | — | — | IMPLEMENTADA, NÃO VERIFICADA na UI |
| `admin/telas/*` (12 telas) | `admin/testes`: editor (5), pedidos (4), questoes (5), trilhas (3) | E05 (login, editar e publicar; 401/403) | Questões, editor, trilhas e pedidos VERIFICADOS; Concursos, Edital, Importacoes, Reports, Painel, Usuarios e Auditoria sem teste de UI |

## 4. RQ1, RQ2 e RQ4 (estado atual)

| ID | Requisito | Prova | Estado |
|---|---|---|---|
| Q1.1 | Superadmin não entra no app de estudo | **P**: com 2FA, `trilha`, `concurso`, `offlinePacote`, `revisao`, `simuladosListar`, `liga`, `perfilEstatisticas`, `pushChave` → 200 (8/8) | **FALHA REPRODUZIDA** (R4-01) |
| Q1.2 | Idem, sem 2FA na sessão | **P**: só senha → `superFinanceiro` 403 `dois_fatores_pendente`, `trilha` 200 | **FALHA REPRODUZIDA** (R4-02) |
| Q1.3 | Admin não entra no app de estudo | L: `t.admin()` cria `acesso: true`; a guarda `acesso` não olha o papel (`registrar.ts:101-104`). O convite cria `acesso: false`. | FORTE INDÍCIO para admins criados com acesso |
| Q1.4 | Admin sem negócio (9 rotas N) | T: AD usa o cookie do admin em A01, A47-A52; PG em A45-A46 → 200 hoje | **FALHA REPRODUZIDA** (o comportamento atual é o oposto do RQ1 revisado) |
| Q1.5 | Conteúdo como seção do `/super` | L: `super/Layout.tsx` tem link para `/admin`; WS confirma `href="/admin"` | NÃO LOCALIZADA |
| Q2.1 | Logins separados | **P**: um só `POST /auth/login` devolve `pagamento` / `admin` / `dois_fatores` para os 3 papéis | NÃO LOCALIZADA |
| Q4.1 | Liberar: pedido pago sem concurso liberado | **P** RQ4-A: botões ocultos; conciliar não repara; só a API `superAprovarManual` (caminho `jaAprovado`) religa | PARCIAL (sem UI) |
| Q4.2 | Liberar: Pix pago e webhook perdido | **P** RQ4-B1: conciliar corrige e libera (Asaas falso) | VERIFICADA (com Asaas falso) |
| Q4.3 | Liberar: Pix vencido pago por fora | **P** RQ4-B2/B3: cria pedido manual novo; o vencido fica aberto no Asaas; pago depois → **2 pedidos pagos** | **FALHA REPRODUZIDA** (R4-07) |
| Q4.4 | Liberar: aluno com outro concurso liberado | **P** RQ4-C: botão oculto; a API libera só o concurso ativo (`jaAprovado`); com o ativo forçado, grava R$ 397 em vez de R$ 197 | **FALHA REPRODUZIDA** (R4-05, R4-06) |
| Q4.5 | Estornar | **P**: desfazer manual do 2º mantém o 1º; reembolso Asaas repetido envia 2 estornos | PARCIAL (R4-09) |
