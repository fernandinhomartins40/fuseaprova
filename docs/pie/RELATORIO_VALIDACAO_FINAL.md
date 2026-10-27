# Relatório de validação final

- **Data:** 27/10/2026.
- **Commits:** partida `6a2cb43`, final `5ca050f`, mais o commit desta documentação.
- **Ambiente:** Windows 11, Node 24.21, pnpm 10.28, PGlite, PostgreSQL 16 local descartável (`127.0.0.1:55432`, scratchpad) e Asaas falso.
- **Produção:** observada só em leitura pelo R5, no commit `ac6aa67`.

## 1. Comandos e resultados (reais)

### Linha de base (`6a2cb43`)

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm test` | **exit 1**: `@fuse/web` `telas.test.tsx` › "cadastro valida…" preso em "Carregando…" (4.441 ms). O turbo abortou a API |
| `@fuse/api` sozinho / `telas.test.tsx` sozinho | 257/257 / 8/8 |
| `pnpm e2e` (R4) | 21/21 |
| Cobertura de linhas do shared (R4) | 100% |

### Final (`5ca050f`)

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm test --concurrency=1` | exit 0: api **269**, shared 141, crawler 147, web 65, db 23, worker 14 (**659**) |
| API com `TESTE_DATABASE_URL` (Postgres 16 real) | **269/269** |
| Worker com `TESTE_DATABASE_URL` | 14/14 |
| `pnpm e2e` | **21/21** (2,0 min) |
| `@fuse/shared` com cobertura | linhas, funções e statements em **100%**; branches em 99,5% |
| `pnpm --filter @fuse/web build` | ok; `dist/sw.js` contém `importScripts("/sw-push.js")` |

### Provas de conceito reexecutadas (scratchpad)

| Prova | Resultado |
|---|---|
| R1 sync | Antes +1000 XP, +200 gemas, ofensiva 11. Depois **0 / 0 / 0** |
| R3 sync | Os mesmos vetores foram cobertos pelos testes novos |
| V1 (9 cenários) | Fraudes bloqueadas; o caminho legítimo (3 lições + revisão, 2 lotes, pacote novo) passa com 0 recusas |
| Postgres real, 5 rotas | Antes **500** em todas. Depois **200** |
| Backup com `pg_dump` falso | Dump + tar.gz + retenção ok. Com o `tar` quebrado, exit 0 e aviso, sem bloquear o deploy |

### Testes novos que reprovam o código anterior

Cada um foi confirmado com `git stash`.

- **Pagamento:**
  - estorno com outro pedido pago;
  - webhook com valor menor;
  - Pix duplo;
  - status com valor menor.
- **Offline:** revisão uma vez por vencimento; lição com 1 resposta não conclui.
- **Infraestrutura:** as 5 rotas no Postgres real.

**Exceção:** o teste de "simulado duplo" passa também no código antigo (o PGlite serializa as consultas). Ele é só guarda de comportamento.

## 2. Correções (12 commits)

| Commit | Achados |
|---|---|
| `5c264ef` | A-01 sync offline (pacote registrado, migração `0004_pacotes_offline`) |
| `1510c17` | A-04, A-28 estorno, Pix duplo, valor |
| `b0c9ba2` | A-12, A-27 admin sobre alunos, push restrito |
| `3a0681d` | A-08, A-09, A-10 push no SW, concluir lição, teste instável |
| `c671bec` | A-14, A-15, A-16 ofensiva, liga, simulado |
| `1d45408`, `945916a`, `1003c94` | A-17, A-18, A-19, A-29 UX do Pix, do sair, do simulado e do celular |
| `f3125e5` | A-03, A-05 backup com bash e com os uploads |
| `fa6b6a3` | A-02 `dataSql` + Postgres real no CI |
| `062d490` | Brechas do V1: revisão, lição incompleta, baú, valor no status e na conciliação, pool, push no worker, sessões de admin |
| `5ca050f` | Ajustes do V2: backup não bloqueia o deploy, SW, simulado, sair |

## 3. Regressões encontradas durante a correção, e resolvidas

- **Pacote parando no baú:** quebrava o critério "as próximas 3 lições" do PRD. Revertido: o pacote volta a pular o baú, e o sync aceita o mesmo conjunto.
- **Exigir a lição completa offline:** mudou a expectativa do teste "sync recusa…". Ajustado, porque essa é a regra nova pretendida, igual ao online.
- **`tar` falhando:** saía com exit 1 e bloquearia o deploy (V2-01). Corrigido.
- **Trava de linha no Pix:** esgotava o pool com o Asaas lento (V1-08). Trocada por fila em memória por aluno.

## 4. Conferência do docs/ACEITE.md (pelo R4, atualizada)

- O documento cita 458 testes e 17 E2E; hoje são **659** e **21**.
- **#17 (questão retirada também offline) e #20 (revisão vencida offline):** PARCIAIS. A API está coberta (`conteudo-offline.test.ts`); a UI de ponta a ponta, não.
- **#18:** PARCIAL (R4).
- **#21 (comparação visual com `design/png`):** **NÃO COMPROVADO** (A-11).

## 5. Riscos que restam e bloqueios

- **Backup em produção (A-03):** corrigido no código. A prova é a 1ª execução das 03:30 depois do deploy (`jobs_execucoes` com `ok`).
- **Backup fora da VPS e restore em produção (A-06):** não feitos. Exigem destino externo, ou seja, decisão e custo do dono.
- **Alertas (A-07):** não há.
- **Asaas sandbox real:** BLOQUEADO (sem credencial nesta sessão; cobrança real exige autorização).
- **Comparação visual (A-11):** não comprovada.
- **Dependências com CVE (A-13):** atualizar majors fica para uma janela própria.
- **Infraestrutura compartilhada (A-24 a A-26):** recomendações que pedem aprovação.
- **LGPD (A-31):** os prazos de retenção são decisão jurídica.
- **Não testado em navegador real:** notificação push e as telas alteradas (Lição, Pagamento, Configurações, Simulado). Cobertura por typecheck, lint, testes de tela existentes e E2E.

## 6. Higiene

- Nenhum segredo, CPF, e-mail de aluno ou token aparece nos documentos de `docs/pie/`. O R5 sanitizou as saídas da VPS.
- Arquivos temporários (provas de conceito, Postgres descartável, logs) ficaram só no scratchpad da sessão, fora do repositório.
- Migração nova só por adição: `0004_pacotes_offline`. As migrações existentes não mudaram, conforme a regra do CI.
