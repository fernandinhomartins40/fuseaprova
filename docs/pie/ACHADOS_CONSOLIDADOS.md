# Achados consolidados

- **Data:** 27/10/2026
- **Commits:** de `6a2cb43` (partida) até o HEAD local desta auditoria. Ver `git log 6a2cb43..HEAD`.
- **Classificação:** CONFIRMADO, FORTE INDÍCIO, HIPÓTESE ou NÃO REPRODUZIDO (protocolo, seção 2.4).
- **Detalhes de cada achado:** reprodução, esperado × observado e evidência estão nos pareceres `BANCA_R*.md`, citados pelo ID de origem.

Situação de cada achado:
- **CORRIGIDO**: o código mudou e um teste prova a correção.
- **CORRIGIDO (sem prova de corrida)**: o código mudou, mas o teste não reprova o código antigo.
- **PENDENTE**: não foi corrigido, com o motivo indicado.

## Bloqueadores e altos

| ID | Origem | Título | Sev. | Estado | Evidência (arquivo:linha / teste) | Situação |
|---|---|---|---|---|---|---|
| A-01 | R1-01, R1-02, R3-01, R3-02 | Sync offline aceitava questão repetida, lição bloqueada ou desafio e datas retroativas: inflava XP, gemas, liga e ofensiva | ALTA | CONFIRMADO | `apps/api/src/servicos/offline.ts` (antes: 89-180). Provas de conceito do R1 e do R3. | CORRIGIDO `5c264ef`. 3 testes novos em `apps/api/test/conteudo-offline.test.ts`. A PoC do R1 deu 0 XP, 0 gemas e ofensiva 0 depois da correção. |
| A-02 | R5-05 + verificação do Auditor-Chefe | `Date` solto em `sql` cru: 5 rotas com erro 500 em produção (financeiro, lista e ficha de usuários do super, prévia de comunicação, painel do admin) | ALTA | CONFIRMADO (logs de produção + Postgres 16 local, antes 500 e depois 200) | `apps/api/src/rotas/super/financeiro.ts:129,138`; `super/usuarios.ts:74,75,128`; `super/comunicacao.ts:31`; `admin/gestao.ts:71,74,76` | CORRIGIDO `fa6b6a3`. API com 266/266 no Postgres real e passo novo no CI. |
| A-03 | R5-01 (+R1-14) | Backup das 03:30 nunca rodou (`sh` = dash recusa `pipefail`) | CRÍTICA | CONFIRMADO (`jobs_execucoes`: 3 de 3 falhas) | `apps/worker/src/jobs/backup.ts:28` | CORRIGIDO no código. **Falta comprovar em produção** depois do deploy. |
| A-05 | R5-03 | Uploads e figuras (`/root/fuseaprova/arquivos`) fora do backup | ALTA | CONFIRMADO | `infra/backup/backup.sh` | CORRIGIDO (tar.gz com retenção; testado com pg_dump falso no scratchpad). |
| A-06 | R5-02 | Nenhuma cópia fora da VPS; restore nunca testado em produção | ALTA | CONFIRMADO | listagem de `backups/` na VPS | PENDENTE: exige um destino externo, e portanto custo e credencial (decisão do dono). |
| A-07 | R5-04 | Nenhum alerta para falha de job ou erro 500 | ALTA | CONFIRMADO | grep no código | PENDENTE: exige um canal de alerta (e-mail de operação, SMTP já existente) e decisão de destinatário. Ver P-03. |
| A-08 | R2-01 | Service worker não tratava `push` nem `notificationclick`: lembretes não apareciam | ALTA | CONFIRMADO | `apps/web/vite.config.ts` | CORRIGIDO `3a0681d` (`public/sw-push.js` + `importScripts`; o build contém `importScripts("/sw-push.js")`). Não testado em navegador real. |
| A-09 | R2-02 | Falha no "concluir" da lição: TENTAR DE NOVO abria sessão nova e a conclusão se perdia | ALTA | CONFIRMADO | `apps/web/src/telas/licao/Licao.tsx` | CORRIGIDO `3a0681d`. Sem teste de UI dedicado (typecheck, lint e E2E da lição). |
| A-11 | R4-02 | Comparação visual não usa `design/png`; no CI Linux passa sem `expect` | ALTA | CONFIRMADO | `e2e/testes/06-visual.spec.ts:51-60` | PENDENTE P-06. ACEITE #21 fica NÃO COMPROVADO. |

## Médios

| ID | Origem | Título | Estado | Situação |
|---|---|---|---|---|
| A-04 | R1-03, R3-03 | Estorno revogava o acesso mesmo com outro pedido pago; dois cliques geravam 2 cobranças | CONFIRMADO | CORRIGIDO `1510c17` (teste novo reprova o código antigo) |
| A-10 | R4-01 | Teste web instável derrubava o `pnpm test` | CONFIRMADO | CORRIGIDO `3a0681d` |
| A-12 | R1-05, R4-05 | Admin sem 2FA derrubava as sessões do superadmin; revogar acesso não derrubava sessões | CONFIRMADO | CORRIGIDO `b0c9ba2` (403 para alvo não aluno). Pendente para o dono: 2FA também no papel admin. |
| A-13 | R1-07 | 35 vulnerabilidades (13 high) em dependências de produção (fastify 4, nodemailer, drizzle-orm, react-router, zod) | presença CONFIRMADA; exploração HIPÓTESE | PENDENTE P-04: atualizar majors exige regressão completa e janela própria |
| A-14 | R3-04 | Job de ofensiva sobrescrevia, sem trava, o aluno que estudava às 00:05 | FORTE INDÍCIO | CORRIGIDO (sem prova de corrida) `c671bec` |
| A-15 | R3-05 | Liga não fechava com o worker fora no domingo; execução manual na segunda fechava a semana nova | FORTE INDÍCIO | CORRIGIDO `c671bec` (`semanaAFechar` com teste; cron de hora em hora) |
| A-16 | R3-06 | Dois toques em COMEÇAR abriam 2 simulados | FORTE INDÍCIO | CORRIGIDO (sem prova de corrida) `c671bec` |
| A-17 | R2-03 | Simulado: "prova entregue" mesmo com a entrega falhando sem rede; toast a cada 1 s | CONFIRMADO | CORRIGIDO `945916a` |
| A-18 | R2-04 | Pix pago no último segundo: laço "Seu acesso já está liberado." | CONFIRMADO | CORRIGIDO `1d45408` |
| A-19 | R2-06 | SAIR apagava sem aviso as respostas offline pendentes | CONFIRMADO | CORRIGIDO `1d45408` (sincroniza antes; senão, pede confirmação) |
| A-20 | R2-05 | Pix vencido não é cancelado no Asaas | HIPÓTESE | PENDENTE: depende do comportamento real do Asaas (sandbox) |
| A-21 | R2-07, R2-08 | Rede caindo no meio da lição online trava a sessão; refresh recomeça a lição | CONFIRMADO | PENDENTE P-07: mudança de fluxo maior (retomar sessão do servidor) |
| A-22 | R2-09, R2-10, R2-11 | Aviso de push negado some; COMEÇAR SIMULADO sem confirmação; editor do admin perde alterações | CONFIRMADO | PENDENTE P-07 (UX, baixo risco) |
| A-23 | R4-04, R4-05, R4-07, R4-08 | Lacunas de teste (19 rotas sem teste funcional, UI de LGPD/push/recuperação) e `docs/ACEITE.md` otimista | CONFIRMADO | PARCIAL: 4 rotas ganharam teste nesta auditoria; ACEITE corrigido no RELATORIO_VALIDACAO_FINAL; resto em P-05 |
| A-24 | R5-06, R5-09 | Postgres recriado em todo deploy; "rollback sem pull" impossível por prune global de imagens | CONFIRMADO | PENDENTE P-08: infraestrutura compartilhada (o cron de prune é do host) |
| A-25 | R5-07, R5-08 | Sem limite de CPU e PIDs; limites de memória somam ~12,9 GB para 7,75 GB de RAM, sem swap | CONFIRMADO; risco HIPÓTESE | PENDENTE P-08: afeta outras apps da VPS (pede aprovação) |
| A-26 | R5-11 | Deploy como root; SSH com root e senha | CONFIRMADO | PENDENTE: a memória do dono proíbe desligar o login por senha; só recomendação |
| A-27 | R1-06 | Endpoint de push aceitava qualquer URL (worker fazia POST para a rede interna) | CONFIRMADO | CORRIGIDO `b0c9ba2` |

## Baixos

| ID | Origem | Título | Situação |
|---|---|---|---|
| A-28 | R1-04 | Valor pago não conferido no webhook | CORRIGIDO `1510c17` (`valor_divergente`) |
| A-29 | R2-12, R2-13, R2-15 | Nota de revisão com 0 erros; celular colado com +55 cortado; "copiado" falso | CORRIGIDOS `945916a`, `1d45408`, celular |
| A-30 | R1-08 | Cadastro revela que o CPF ou e-mail existe | PENDENTE (o fluxo do PRD mostra o link "Entrar"; trade-off de UX) |
| A-31 | R1-09 | Auditoria guarda nome, e-mail e celular depois da exclusão (LGPD); sem retenção de `auditoria` e `webhook_eventos` | PENDENTE: prazo de retenção é decisão jurídica (encarregado) |
| A-32 | R1-10 | Rate limit só por IP, em memória | PENDENTE |
| A-33 | R1-11, R1-12, R1-13 | CPF reconstruível pela busca do admin; upload sem conferir assinatura; troca de e-mail de superadmin sem reautenticação | PENDENTES |
| A-34 | R3-07, R3-08, R3-09, R3-10, R3-11, R3-12 | Fila offline > 500, 2 grupos de liga de 1 membro, pagamento após exclusão, entrega automática para no 1º erro, travas em memória, mock com números fixos | PENDENTES (baixa probabilidade) |
| A-35 | R2-14, R2-16, R2-17, R2-18, R2-19, R2-21 | Pequenas fricções de UX e acessibilidade | PENDENTES (OPORTUNIDADES_PRODUTO) |
| A-36 | R5-10, R5-12 a R5-17 | Downtime do deploy, sem pg_stat_statements, 24 FKs sem índice, imagens de 0,5 GB, healthcheck fraco, sem HTTP/2, pool sem timeouts | PENDENTES (RELATORIO_PERFORMANCE_VPS) |
| A-37 | R2-20 | XP por resposta "infla a liga" | NÃO REPRODUZIDO como fraude (C5) |
