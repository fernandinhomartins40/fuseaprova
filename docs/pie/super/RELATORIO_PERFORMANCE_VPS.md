# Relatório de desempenho: painel superadmin (`/super`)

- **Data:** 28/10/2026.
- **Commit:** `2f71392`.
- **Revisor:** R5.
- **Achados:** o parecer com os achados é `BANCA_R5_SRE.md`.
- **Este arquivo:** guarda as medidas brutas e as comparações.

## Ambiente e método

- **Banco:** Postgres 16.15 local (`127.0.0.1:55432`), com `shared_buffers` de 128 MB e `work_mem` de 4 MB, iguais aos de `deploy/docker-compose.yml`.
  - `effective_cache_size`: 4 GB no local e 384 MB na produção.
  - Máquina: desktop Windows 11, e não a VPS de 2 vCPU.
  - Os tempos servem para **comparação relativa**, não como tempo de produção.
- **Banco sintético `r5_perf`:**
  - Montagem: migrações reais (`migrar`), seed (`semear`, com as questões autorais publicadas) e depois `generate_series`.
  - Volume:
    - 20 000 alunos (datas em 365 dias);
    - 30 000 pedidos, sendo 1/3 pagos, 1/3 vencidos e 5% manuais;
    - `pix_imagem` com 4 000 caracteres aleatórios (o QR base64 do Asaas, incompressível);
    - 1 000 000 de `tentativas` em 180 dias;
    - 200 000 linhas de `auditoria`;
    - 30 000 `webhook_eventos`;
    - 56 880 `jobs_execucoes` (30 dias no ritmo do cron real);
    - 5 000 sessões.
  - O banco foi apagado no fim (`drop database r5_perf with (force)`).
- **Medição:**
  - As rotas reais foram chamadas com `criarApp` e `app.inject`, autenticadas como superadmin com 2FA e com o rate limit desligado.
  - Cada rota rodou 4 vezes. "Frio" é a 1ª execução; "mediana" é a mediana das 3 seguintes.
  - O SQL foi capturado pelo logger do Drizzle e analisado com `EXPLAIN (ANALYZE, BUFFERS)`, com os mesmos parâmetros.
- **Scripts:** `<scratchpad>/r5/01-popular … 09-cfg`, fora do repositório.

## Rotas do `/super` (volume sintético)

| Caso | Rota | HTTP | Frio (ms) | Mediana (ms) | Bytes da resposta | Consultas SQL |
|---|---|---|---|---|---|---|
| sistema | `superSistema` | 200 | 87 | 93 | 2.072 | 29 |
| financeiro 30 dias, por dia | `superFinanceiro` | 200 | 900 | 480 | 6.442 | 10 |
| financeiro 2 anos, por dia | `superFinanceiro` | 200 | 3656 | 2010 | 131.932 | 10 |
| financeiro 2 anos, por mês | `superFinanceiro` | 200 | 1993 | 2771 | 5.393 | 11 |
| CSV do financeiro, 2 anos | `superFinanceiroCsv` | 200 | 3985 | 2989 | 45.720 | 11 |
| pagamentos, lista | `superPagamentosListar` | 200 | 45 | 38 | 13.539 | 3 |
| pagamentos, busca por nome | `superPagamentosListar` | 200 | 298 | 252 | 7.719 | 3 |
| pagamentos, busca `pay_…` | `superPagamentosListar` | 200 | 192 | 196 | 1.216 | 3 |
| pagamentos pagos, página 500 | `superPagamentosListar` | 200 | 143 | 145 | 11.898 | 3 |
| CSV de pagamentos (10 000 de 30 000) | `superPagamentosCsv` | 200 | 1498 | 920 | 1.776.297 | 3 |
| detalhe do pagamento | `superPagamentoObter` | 200 | 36 | 25 | 1.241 | 5 |
| usuários, lista | `superUsuariosListar` | 200 | 46 | 48 | 8.058 | 3 |
| usuários, busca | `superUsuariosListar` | 200 | 59 | 55 | 4.903 | 3 |
| usuários inativos há 30 dias | `superUsuariosListar` | 200 | 353 | 190 | 408 | 3 |
| usuários pagos | `superUsuariosListar` | 200 | 63 | 46 | 8.093 | 3 |
| CSV de usuários (20 000) | `superUsuariosCsv` | 200 | 764 | 1040 | 4.008.482 | 3 |
| ficha do usuário (o que mais respondeu) | `superUsuarioObter` | 200 | 222 | 38 | 2.205 | 14 |
| auditoria, lista | `superAuditoria` | 200 | 43 | 37 | 5.958 | 3 |
| auditoria por alvo (`ilike`) | `superAuditoria` | 200 | 493 | 552 | 5.296 | 3 |
| auditoria por ação e período | `superAuditoria` | 200 | 162 | 70 | 5.351 | 3 |
| webhooks, lista | `superWebhooksListar` | 200 | 327 | 108 | 7.533 | 3 |
| webhooks, busca | `superWebhooksListar` | 200 | 68 | 81 | 434 | 3 |
| estatísticas do Asaas, 2 anos | `superAsaasEstatisticas` | 200 | 3112 | 2442 | 421 | 2 |
| equipe | `superEquipe` | 200 | 23 | 16 | 329 | 2 |

Não medidos: as rotas que dependem do Asaas real (saldo, extrato, testar, conciliação contra a API do Asaas) e as do `/admin` (Conteúdo).

## Planos relevantes (`EXPLAIN ANALYZE`)

| Consulta | Execução | Plano e observação |
|---|---|---|
| `count(distinct usuario_id) from tentativas where respondida_em …` (DAU/WAU/MAU, `financeiro.ts:136-142`) | 199 a 300 ms (frio) cada, × 3 | Index Only Scan do índice inteiro `tentativas_usuario_questao_respondida_idx` (sem coluna líder), com 8 576 buffers lidos |
| `select * from pedidos where pago_em/criado_em …` (financeiro, 2 anos) | 36 ms no Postgres | O custo está em trazer o `pix_imagem` (TOAST) para a API. A rota leva 2 a 3 s |
| `superAsaasEstatisticas` (`select *`, 2 anos) | 20 ms no Postgres | A rota leva 2,4 s pelo mesmo motivo |
| CSV de usuários (`select` com todas as colunas + `(select max(respondida_em) …)` correlacionada) | 448 ms | Sort com `external merge Disk: 3488kB`, SubPlan com 20 000 loops e 63 325 buffers. Lê `senha_hash` e `totp_segredo` |
| auditoria `alvo ilike '%…%'` | 124 a 144 ms × 2 (contagem e lista) | Parallel Seq Scan, com 4 349 buffers lidos. `pg_trgm` está disponível e não está instalado |
| pagamentos, busca por nome (`ilike` em 3 colunas) | 62 + 125 ms | Seq Scan com junção |
| usuários inativos (`not exists … respondida_em >= …`) | 128 + 161 ms | Varre as tentativas de cada usuário pelo prefixo `usuario_id` |
| `jobs()` em `/super/sistema` | 34 ms (`select distinct`) + 26 × ~0,05 ms | Seq Scan em `jobs_execucoes`. Há N+1 (3 consultas por job), mas barato |

## Comparações antes × depois (mesma máquina, mesmo banco, mediana de 3)

| Consulta | Antes | Depois (proposta) | Ganho |
|---|---|---|---|
| Pedidos de 2 anos: `select *` → 9 colunas | 498 ms, 144,7 MB de JSON | 62 ms, 7,1 MB | 8× no tempo, 20× no volume |
| Pedidos de 2 anos → agregado no SQL (`group by`) | 498 ms | 12 ms | ~40× |
| DAU + WAU + MAU: 3 consultas → 1 com `filter` | 3 × ~33 ms quente (3 × 200 a 300 ms frio) | 65 ms quente | Menos varreduras. Com o cache frio, o ganho esperado é ~3× (HIPÓTESE) |
| MAU com índice novo `(respondida_em, usuario_id)` | 33 ms quente | 53 ms quente | **Sem ganho com o cache quente.** O benefício só existe com o cache frio (HIPÓTESE). O índice foi criado e removido no banco sintético |

## Memória da API (financeiro e estatísticas, 2 anos)

| Cenário | Pico de `heapUsed` | Resultado |
|---|---|---|
| 1 requisição | 278 a 303 MB | 200 |
| 2 simultâneas | 317 a 331 MB | 200 (numa execução com o limite de 604 MB: `FATAL ERROR … JavaScript heap out of memory`) |
| 4 simultâneas (sem limite) | 661 MB | 200 |

Referência de produção: `NODE_OPTIONS=--max-old-space-size=384` e `mem_limit: 512m` (`deploy/docker-compose.yml:138-143`). O pico de 1 ou 2 requisições já se aproxima desse limite, ou passa dele.

## Build da PWA (precache)

`vite build --outDir <scratchpad>`:
- precache de 302 entradas e 2 828,37 KiB;
- chunks do `/admin` e do `/super` no precache de todo aluno: 259 004 bytes.

## Hipóteses não medidas (sem acesso à VPS ou ao Asaas)

- **Limiar de OOM na produção:** depende do número real de pedidos no período escolhido. Estimativa grosseira: ~7 KB de heap por pedido lido. BLOQUEADO.
- **Conciliação em lote:** com 200 chamadas sequenciais ao Asaas, passa de 60 s com mais de 300 ms por chamada, e o resultado é 504 no nginx.
- **Cache frio:** com `tentativas` maior que 128 MB e `effective_cache_size` de 384 MB, DAU/WAU/MAU e "inativos" ficam mais lentos na VPS do que aqui.
- **Comunicação em massa:** 30 e-mails/min dão ~11 h para 20 mil destinatários. A cota diária do SMTP compartilhado com os e-mails transacionais é desconhecida.
- **CPU compartilhada:** 2 vCPU com outros projetos (A-25). Os tempos de CPU em JS (agregação, CSV) tendem a ser maiores que os daqui.
