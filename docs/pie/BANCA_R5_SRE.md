# Banca R5: SRE / VPS (infraestrutura e desempenho)

Data: 27/10/2026, entre 12:54 e 13:10 UTC (09:54 a 10:10 em São Paulo).
Modo: somente auditoria. Na VPS só rodei comandos de leitura. Nenhum segredo foi exibido: o `.env` foi checado só com `grep -c` e `stat`, e os digests aparecem truncados.
Commit local: `6a2cb43`. Em produção, pelo `estado/historico.log`, está o commit `ac6aa67`.

## Resumo

| ID | Título | Sev. | Estado |
|---|---|---|---|
| R5-01 | O backup diário das 03:30 nunca funcionou: o worker roda `backup.sh` (bash) com `sh` (dash) | CRÍTICA | CONFIRMADO |
| R5-02 | Não há cópia de backup fora da VPS e o restore nunca foi testado em produção | ALTA | CONFIRMADO |
| R5-03 | `/root/fuseaprova/arquivos` (PDFs, uploads e figuras) fica fora de qualquer backup | ALTA | CONFIRMADO |
| R5-04 | Nenhum alerta: falhas de job e erros 500 ficam só no log ou no painel | ALTA | CONFIRMADO |
| R5-05 | `/api/super/financeiro` falha 100% em produção (Date em `sql` cru); o PGlite dos testes não pega | ALTA | CONFIRMADO |
| R5-06 | O postgres é recriado em todo deploy, porque o `.env` muda e entra no hash do compose | MÉDIA | CONFIRMADO |
| R5-07 | Nenhum limite de CPU ou de PIDs nos containers do Fuse Aprova, numa VPS de 2 vCPU compartilhada | MÉDIA | CONFIRMADO |
| R5-08 | A soma dos `mem_limit` da VPS (~12,9 GB) passa da RAM física (7,75 GB), e não há swap | MÉDIA | CONFIRMADO (risco é HIPÓTESE) |
| R5-09 | O "rollback rápido sem pull" não existe: um cron global apaga as imagens anteriores | MÉDIA | CONFIRMADO |
| R5-10 | O deploy derruba o serviço por alguns segundos (recreate sem blue/green) | BAIXA | HIPÓTESE (não medido) |
| R5-11 | O deploy entra como root por SSH numa VPS compartilhada, e o sshd aceita root com senha | MÉDIA | CONFIRMADO |
| R5-12 | Sem visibilidade de consultas lentas (sem `pg_stat_statements`, `log_min_duration_statement=-1`) | BAIXA | CONFIRMADO |
| R5-13 | 24 FKs sem índice, e `tentativas.respondida_em` sem índice para os relatórios | BAIXA | CONFIRMADO (impacto é HIPÓTESE) |
| R5-14 | Imagens api e worker de ~0,5 GB cada (node_modules completos, com devDependencies) | BAIXA | CONFIRMADO |
| R5-15 | Healthcheck do worker só olha se o processo está vivo; logs de saúde poluem o log da API | BAIXA | CONFIRMADO |
| R5-16 | Host sem HTTP/2, e o redirect 80→443 expõe `nginx/1.18.0 (Ubuntu)` | BAIXA | CONFIRMADO |
| R5-17 | Pool do postgres-js sem `idle_timeout` e sem `statement_timeout` | BAIXA | CONFIRMADO (impacto é HIPÓTESE) |

Pontos que estão bons e foram verificados:
- **Postgres e rede:** o Postgres não publica porta, só o nginx publica e só em `127.0.0.1:3600`, e há uma rede própria `fuseaprova-interna`.
- **Containers:** restart `unless-stopped`; logs `json-file` limitados a 10m×5; api e worker rodam como `node`, e o nginx como uid 101 (não-root).
- **Imagens e deploy:** imagens por digest; o deploy faz backup antes da migração e confere a saúde, com reversão automática.
- **Cabeçalhos HTTP:** CSP, HSTS e o restante estão presentes. Os assets têm cache `immutable` de 1 ano; `index.html` e `sw.js` usam `no-cache`. Há gzip.
- **TLS e uso de recursos:** TLS 1.0/1.1 recusado, e o certificado vale até 22/01/2027. Nenhum OOM nem restart dos containers do Fuse.

---

## Medições brutas (27/10/2026, UTC)

**M1. Host** (`uptime; nproc; free -m; df -h`), às 12:54:55 UTC
- Carga: `load average: 2.05, 1.36, 1.13`, com nproc=2.
- Memória: total 7936 MB, used 3527, available 3494. **Swap 0**.
- Disco: `/dev/sda1 97G, 64G usados (66%), 33G livres`.
- Versões: Docker 28.3.3, Compose 2.39.1.

**M2. Containers do Fuse** (`docker stats --no-stream`)

| Container | CPU | Memória / limite | Uso |
|---|---|---|---|
| fuseaprova-nginx | 0% | 6,8 MiB / 64 MiB | 10,6% |
| fuseaprova-api | 0% | 90 MiB / 512 MiB | 17,6% |
| fuseaprova-worker | 0,01% | 49 MiB / 384 MiB | 12,9% |
| fuseaprova-postgres | 0,02% | 84 MiB / 512 MiB | 16,3% |

Há 45 containers no host, de 12 projetos. Exemplos de outras apps perto do limite: mercadoflow-cron em 598/640 MiB (93%) e rebania-worker em 157/256 MiB (61%).

**M3. Portas** (`docker ps`, `ss -ltn`)
- Fuse: só `127.0.0.1:3600->8080`. O postgres aparece como `5432/tcp` (só interna).
- Outras apps publicam em 0.0.0.0: 3010, 3180, 3190, 3230 e 7000. Um processo python (`/opt/palmital/webhook.py`) escuta em 0.0.0.0:8109. Nada disso é do Fuse, mas todos dividem o mesmo host.
- `ufw status: inactive`, `iptables -P INPUT ACCEPT`, fail2ban inativo.

**M4. Limites dos containers** (`docker inspect` só com HostConfig, sem env)
- Fuse: `NanoCpus=0`, `CpuShares=0`, `PidsLimit=<none>` nos 4 containers. Memória: nginx 64m, api 512m, worker 384m, postgres 512m.
- Para comparar: os containers do fuseai têm `nanocpu` e `pids` limitados.
- Sem limite de memória (mem=0): palmital, metalgest, tagflow e fusesite.

**M5. Backups** (`ls -la /root/fuseaprova/backups/{diario,semanal}`)
- Em `diario/` há 13 dumps, de 853 B a 5,6 MB. Todos os carimbos batem com os deploys do `historico.log` (00:31, 00:35, 20:42, 20:48, 21:00, 21:04, 21:43, 23:39, 00:28, 16:06, 19:20, 20:10 e 22:12, horário de São Paulo). **Nenhum é das 03:30.**
- Em `semanal/`, `W43` tem 853 B (só schema) e `W44` tem 5,6 MB.
- `ULTIMO_BACKUP`: `2026-10-26T22:12:50-0300`.
- `teste-restore.log`: **não existe**.
- Há também 7 dumps manuais em `/root/fuseaprova/backups-manuais/` (pasta 755 e arquivos 644, protegidos pela pasta-pai 700).
- Tamanhos (`du -sh`): backups 29M, arquivos 14M.
- `crontab -l`: vazio para o root. `/etc/cron.d`: certbot, docker-image-prune, docker-builder-prune, e2scrub e mercadoflow-backup. Nenhuma ferramenta de cópia externa (rclone, restic, borg ou aws).

**M6. Log do worker** (`docker logs --since 72h fuseaprova-worker | grep backup`)
```
{"nivel":"error","msg":"backup falhou","job":"backup","codigo":2,"saida":"/app/infra/backup/backup.sh: 24: set: Illegal option -o pipefail\n","em":"2026-10-27T06:30:00.144Z"}
```

**M7. `jobs_execucoes`** (SELECT agregado)

| Job | Execuções | Falhas | Último ok |
|---|---|---|---|
| backup | 3 | 3 | nenhum |
| enviar-comunicacoes | 3611 | 0 | |
| enviar-lembretes | 723 | 0 | |
| expirar-pix | 361 | 0 | |
| fechar-liga | 1 | 0 | |
| limpar-sessoes | 3 | 0 | |
| resetar-vidas | 3 | 0 | |
| verificar-ofensivas | 3 | 0 | |

**M8. Postgres**
- Versão 16.15. O banco tem **61 MB**; o volume `fuseaprova-pgdata` tem 171 MB e o WAL, 80 MB.
- Conexões: 9 backends (1 ativo e 8 ociosos), com `max_connections=40` e `shared_buffers=128MB`.
- `log_min_duration_statement=-1`. Extensões: só plpgsql.
- `deadlocks=0` e `temp_files=0`.
- Maior tabela: `questoes`, com 21.872 linhas e 48 MB (116 seq_scan contra 82.918 idx_scan).
- Produção tem **1 usuário**; o app ainda não foi lançado.

**M9. FKs sem índice de apoio** (consulta em `pg_constraint`/`pg_index`)

São 24. As mais relevantes:
- `tentativas.questao_id`, `revisoes.questao_id`;
- `questoes.assunto_id` (já coberto em parte por `(status, assunto_id)`), `questoes.disciplina_id`;
- `progresso_licoes.licao_id`, `sessoes_estudo.licao_id`;
- `xp_eventos.sessao_estudo_id` e `xp_eventos.simulado_id`.

**M10. Imagens e disco do Docker** (`docker system df`, `docker images`)
- Imagens no host: 35, ocupando 11,03 GB.
- Fuse: api 513 MB, worker 551 MB e web 56 MB. **Só a versão atual de cada uma está no host.**
- Cron `/etc/cron.d/docker-image-prune`: `4 0 * * * root docker image prune -af --filter "until=24h"`.
- Logs json do Fuse: api 1,7 MB em 12 h, worker 246 KB.
- `daemon.json`: json-file com max-size 10m e max-file 3.

**M11. Recriação do postgres**
- Container: `docker inspect fuseaprova-postgres` mostra `Created=2026-10-27T01:12:42Z`.
- Volume: criado em `2026-10-24T03:31:47Z`.
- Log: `database system was shut down at 2026-10-26 22:12:42 -03`, que é o horário exato do deploy do `ac6aa67` (22:13:05).

**M12. API em produção** (`docker logs --since 24h fuseaprova-api`)
- São 5.654 linhas. Dessas, 2.907 requisições são `/api/saude` (healthcheck).
- Os 10 erros level 50 vêm todos de `/api/super/financeiro` (10 de 10 chamadas), com `DrizzleQueryError ... Received an instance of Date` em `rotas/super/financeiro.js:125`.
- `responseTime` de 2.945 requisições: p50 1,2 ms, p95 4,7 ms, p99 19,8 ms, máx 226 ms.

**M13. HTTP público** (curl, 3 requisições cada)

| URL | TTFB | Observação |
|---|---|---|
| `/` | 0,141 s | HTTP/1.1, gzip, CSP, HSTS e `no-cache` |
| `/sw.js` | 0,261 s | `no-cache` |
| `/api/saude` | 0,198 s | `{"ok":true,"banco":"ok"}` |

- Asset `/assets/index-*.js`: 172.904 B brutos e 49.756 B com gzip; `max-age=31536000, immutable`.
- `http://www…` responde 301 com `Server: nginx/1.18.0 (Ubuntu)`.
- O apex `fuseaprova.com.br` responde 301 para `https://www…`.
- TLS 1.0/1.1 recusado, e `options-ssl-nginx.conf` traz `ssl_protocols TLSv1.2 TLSv1.3`.
- No site do host não há `http2` nem `listen 443 ssl`.

**M14. SSH** (`sshd -T`, `journalctl` e `auth.log` das últimas 24 h)
- Configuração: `permitrootlogin yes`, `passwordauthentication yes`, `maxauthtries 6`.
- Acessos: 85 logins aceitos, todos `publickey` para root. 0 falhas registradas, o que sugere um filtro de rede do provedor (HIPÓTESE).

**M15. Memória e OOM**
- `vm.overcommit_memory=0`. Nenhum evento de OOM no `dmesg` ou no `journalctl -k` dos últimos 10 dias.
- Containers do Fuse: `RestartCount=0` e `OOMKilled=false`.

### O que não foi medido, e por quê
- **Downtime real do deploy (R5-10):** medir exigiria fazer um deploy, o que está proibido.
- **Snapshots ou backups da Hostinger:** a API `vps_virtual-machines_list` não respondeu (o timeout passou de 30 min). Segue como HIPÓTESE que não existam.
- **Carga e latência sob concorrência:** testes de carga estão proibidos, e produção tem só 1 usuário.
- **Tempo e consumo de memória do pg_dump no worker:** o job nunca rodou com sucesso (R5-01).
- **Consultas lentas reais:** não há `pg_stat_statements` (R5-12).
- **Firewall da rede do provedor:** não é visível de dentro da VPS.

---

## Achados

### R5-01: O backup diário das 03:30 nunca funcionou
- **Categoria:** backup. **Severidade: CRÍTICA.** O PRD 8.7 exige backup diário, e produção vai receber dados pagos. Hoje o único backup automático acontece quando há deploy. Se ficar um dia sem deploy, fica um dia sem backup.
- **Estado:** CONFIRMADO (M5, M6 e M7).
- **Evidência:**
  - `apps/worker/src/jobs/backup.ts:28` executa `spawn(script.endsWith('.sh') ? 'sh' : script, [script])`.
  - Na imagem node bookworm, `sh` é o dash.
  - `infra/backup/backup.sh:1` é `#!/usr/bin/env bash`, e `:24` faz `set -Eeuo pipefail`. O script também usa `[[ ]]`, `mapfile` e `<<<`.
  - O dash recusa: `set: Illegal option -o pipefail`, com código 2. Foram 3 de 3 falhas, e nenhum dump das 03:30 em `diario/`.
  - O teste `apps/worker/test/jobs.test.ts:202` usa um `ok.sh` falso e não o script real, por isso não detectou o problema.
- **Impacto:** perda de até N dias de dados (pagamentos, progresso, revisões). O container do worker continua "healthy" (R5-15) e não há alerta (R5-04). Não afeta outras apps.
- **Correção:** executar com `bash` (`spawn('bash', [script])`) ou direto pelo shebang (`spawn(script)`, que já é executável pelo `chmod 0755` do Dockerfile). Somar um teste que roda o `infra/backup/backup.sh` real em modo `local` (ou ao menos `bash -n` + `sh` ⇒ erro) e um pré-teste no `deploy.sh`: `docker run worker bash -n /app/infra/backup/backup.sh`.
- **Teste de aceite:**
  1. `docker compose exec worker node apps/worker/dist/index.js backup` termina com `backup concluído`.
  2. No dia seguinte existe `diario/fuse_AAAA-MM-DD_0330*.dump`.
  3. `jobs_execucoes` registra `backup ok=true`.

### R5-02: Sem cópia fora da VPS e sem restore testado em produção
- **Categoria:** backup e DR. **Severidade: ALTA.**
- **Estado:** CONFIRMADO (M5).
- **Evidência:**
  - Todos os dumps ficam em `/dev/sda1`, o mesmo disco do banco.
  - Não há cron, timer nem ferramenta de sync externo.
  - `docs/DEPLOY.md:283-290` só sugere um `rsync` manual a partir de "outra máquina".
  - `teste-restore.log` não existe, embora `docs/DEPLOY.md:421-422` deixe os itens de checklist "restore OK" e "cópia fora da VPS" em aberto.
  - Snapshot da Hostinger: não verificado (HIPÓTESE).
- **Impacto:** se o disco ou a VPS se perderem, ou a VPS for comprometida (ela é compartilhada com 11 outros projetos, R5-11), os dados e os backups somem juntos.
- **Correção:**
  1. Um timer no host ou um job do worker que envie o dump do dia, cifrado (`age`/`gpg`), para um destino externo. O PRD permite só o Asaas como serviço externo, então a opção é um pull agendado a partir de outra máquina do dono ou uma segunda VPS via `rsync`/`restic`. Registrar a escolha em `docs/DECISOES.md`.
  2. Rodar `teste-restore.sh` todo mês, por job, gravando o resultado em `jobs_execucoes`.
- **Teste de aceite:** um dump de D-1 existe no destino externo e pode ser listado com `pg_restore --list`, e `teste-restore.log` tem uma linha `OK` com menos de 31 dias.

### R5-03: `arquivos/` fora do backup
- **Categoria:** backup. **Severidade: ALTA.** As figuras de questões publicadas (commit `eadd641` e o dump `pre-publicacao-figuras` de hoje) e os uploads ficam no disco. Sem eles, as questões perdem imagem.
- **Estado:** CONFIRMADO. `infra/backup/backup.sh:48-54` só faz `pg_dump`. `/root/fuseaprova/arquivos` tem 14 MB (M5).
- **Impacto:** depois de um restore, o banco aponta para arquivos que não existem.
- **Correção:** incluir no backup um `tar` (ou um `restic` incremental) de `$ARQUIVOS_DIR`, montando a pasta como somente leitura no worker, e enviar junto para fora da VPS (R5-02).
- **Teste de aceite:** um restore em máquina limpa exibe uma questão com figura.

### R5-04: Nenhum alerta
- **Categoria:** observabilidade. **Severidade: ALTA.** Os casos R5-01 e R5-05 estão falhando há dias sem que ninguém saiba.
- **Estado:** CONFIRMADO. Não há envio de e-mail ou push para o dono em falha de job nem em erro 5xx (grep em `apps/worker/src` e em `rotas/super/sistema.ts`). Os erros só aparecem no painel `/super/sistema` e em `docker logs`.
- **Correção:** no `executarRegistrado`, em falha de `backup`, `fechar-liga` ou `resetar-vidas`, e quando houver mais de N erros 5xx por hora, enviar e-mail pelo SMTP já configurado para um `ALERTA_EMAIL`. Somar um job "sentinela" que alerta se `ULTIMO_BACKUP` tiver mais de 26 h.
- **Teste de aceite:** forçar `BACKUP_SCRIPT=/nao/existe` gera um e-mail de alerta.

### R5-05: `/api/super/financeiro` falha sempre em produção
- **Categoria:** confiabilidade e paridade de ambiente. **Severidade: ALTA.** É um painel de receita do dono quebrado. A causa raiz também é estrutural: os testes rodam em PGlite, que aceita `Date` como parâmetro, e o postgres-js de produção não aceita.
- **Estado:** CONFIRMADO (M12).
- **Evidência:**
  - `apps/api/src/rotas/super/financeiro.ts:138` faz `` sql`... respondida_em >= ${new Date(...)} and respondida_em < ${ref}` ``.
  - Postgres-js: `ERR_INVALID_ARG_TYPE ... Received an instance of Date`.
  - O mesmo padrão aparece em `rotas/super/comunicacao.ts:31` e `rotas/super/usuarios.ts:74-75` (FORTE INDÍCIO, não testei em produção).
- **Correção:** passar `.toISOString()` ou usar o operador do Drizzle (`gte(tentativas.respondidaEm, data)`). Para cobrir a classe de erro, rodar a suíte de integração da API também contra Postgres 16 real no CI (service container), além do PGlite.
- **Teste de aceite:** `GET /api/super/financeiro` responde 200 em produção, e o CI tem um job que roda com Postgres real.

### R5-06: O postgres é recriado a cada deploy
- **Categoria:** deploy. **Severidade: MÉDIA.** Reiniciar o banco a cada deploy derruba as conexões da API antiga, que ainda está no ar, e produz um instante de 5xx antes mesmo da troca.
- **Estado:** CONFIRMADO (M11). O container foi criado no segundo do deploy e o volume é de 24/10.
- **Causa:**
  - `deploy/docker-compose.yml:64` dá ao postgres `env_file: .env`.
  - `deploy.sh:360-362` grava os digests novos no `.env` ao final do deploy.
  - No deploy seguinte, `compose up -d postgres` (`deploy.sh:293`) vê a configuração mudada e recria o container.
- **Correção:** o postgres deve receber só `POSTGRES_*`, num arquivo separado (`postgres.env`) ou via `environment:` com interpolação; outra opção é guardar as imagens num arquivo à parte (`imagens.env` / `--env-file`).
- **Teste de aceite:** dois deploys seguidos mantêm o `Created` do `fuseaprova-postgres` igual.

### R5-07: Sem limite de CPU e de PIDs
- **Categoria:** recursos e vizinhança. **Severidade: MÉDIA.**
- **Estado:** CONFIRMADO (M4). `NanoCpus=0` e `PidsLimit` vazio nos 4 serviços, e também no `migrate` e no `coletor` (`deploy/docker-compose.yml`). A VPS tem 2 vCPU, com load de 2,05 no momento da medição (M1).
- **Impacto:** o importador de PDF (`pdftotext`), o pg_dump ou um pico na API podem tomar os 2 núcleos e degradar fusai, mercadoflow e as demais apps. Isso não foi medido sob carga (HIPÓTESE quanto à magnitude).
- **Correção:** `cpus: "1.0"` em api e postgres, `cpus: "0.5"` em worker e coletor, e `pids_limit: 256`, seguindo o padrão já usado pelo fuseai.
- **Teste de aceite:** `docker inspect` mostra `NanoCpus>0` e `PidsLimit>0`.

### R5-08: Overcommit de memória no host, sem swap
- **Categoria:** capacidade (host). **Severidade: MÉDIA.** O risco é coletivo.
- **Estado:** a soma está CONFIRMADA; o risco de OOM é HIPÓTESE.
- **Números (M2, M4, M15):**
  - Soma dos `mem_limit` declarados: fuseaprova ≈1,47 GB (+0,5 GB do migrate ou do coletor), bipae ≈1,25, mercadoflow ≈3,9, fuseai ≈2,8, rebania ≈1,2, makucho ≈0,75, advocacia ≈1,5. Total ≈12,9 GB.
  - 4 projetos não têm limite nenhum.
  - RAM física de 7,75 GB e swap 0. Hoje há 3,5 GB livres e nenhum OOM.
- **Impacto:** num pico simultâneo, o OOM killer do kernel pode matar o postgres do Fuse.
- **Correção:**
  - No Fuse: `oom_score_adj` negativo no postgres.
  - No host, com decisão do dono: um swapfile de 2 GB e limites nas apps que não têm.
- **Teste de aceite:** `free -m` mostra swap maior que 0; nenhum container fica sem limite.

### R5-09: O rollback rápido sem pull não existe
- **Categoria:** deploy. **Severidade: MÉDIA.**
- **Estado:** CONFIRMADO (M10). `deploy.sh:366-368` afirma "mantém a versão atual e a anterior (rollback rápido sem pull)". Mas o cron global `/etc/cron.d/docker-image-prune` (`docker image prune -af --filter until=24h`, diário às 00:04 UTC) apaga toda imagem fora de uso com mais de 24 h. Só existe 1 versão de cada imagem no host.
- **Impacto:** a reversão automática e a manual dependem do GHCR estar no ar e do login. Se o GHCR cair durante um deploy ruim, não há para onde voltar.
- **Correção:** marcar as imagens anteriores com uma tag local (`fuseaprova-api:anterior`) e pedir ao dono que o cron use `--filter "label!=com.fuseaprova.projeto=fuseaprova"`; ou documentar que o rollback precisa do GHCR.
- **Teste de aceite:** 48 h depois de um deploy, `docker images` ainda lista a versão anterior.

### R5-10: Downtime durante o deploy
- **Categoria:** deploy. **Severidade: BAIXA.** Não há usuários ainda.
- **Estado:** HIPÓTESE (não medido).
- **Evidência:**
  - `deploy.sh:327-329` faz `compose up -d` de api, worker e nginx, o que recria os containers (para e sobe).
  - O host usa `proxy_next_upstream off` (`deploy/nginx-host/fuseaprova.com.br:59`).
  - A API leva um `start_period` de até 20 s.
  - Somado ao R5-06, a estimativa é de alguns segundos de 502.
- **Correção:** subir a API nova em paralelo (ex.: `--scale api=2 --no-recreate`, com `container_name` removido) e só depois retirar a antiga; ou aceitar o risco e documentar.
- **Teste de aceite:** um `curl` em laço durante o deploy não recebe nenhum 502.

### R5-11: Deploy como root e sshd com senha para root
- **Categoria:** segurança de infra. **Severidade: MÉDIA.**
- **Estado:** CONFIRMADO (M14). `.github/workflows/deploy.yml:55` usa `VPS_USUARIO: root`. O sshd tem `permitrootlogin yes` e `passwordauthentication yes`. Também: `ufw` inativo, `INPUT ACCEPT` e fail2ban ausente (M3).
- **Impacto:** o segredo `FUSEAPROVA_DEPLOY_SSH_KEY` vale root nas 12 aplicações. O job `host` roda `setup-host.sh` com apt e certbot, e recarrega o nginx compartilhado em todo push para a main (`setup-host.sh:199`).
- **Correção:** só como recomendação, sem alterar nada (o dono proibiu mexer no login por senha): um usuário `deploy` no grupo docker com chave restrita (`command=`/`from=`); `PermitRootLogin prohibit-password` quando o dono decidir; e tornar o reload do nginx condicional a alguma mudança.
- **Teste de aceite:** o workflow passa a usar um usuário não-root.

### R5-12: Sem visibilidade de consultas lentas
- **Categoria:** observabilidade (banco). **Severidade: BAIXA.**
- **Estado:** CONFIRMADO (M8).
- **Correção:** `-c log_min_duration_statement=500` e `shared_preload_libraries=pg_stat_statements` no `command` do postgres.
- **Teste de aceite:** `SELECT * FROM pg_stat_statements LIMIT 1` funciona.

### R5-13: FKs sem índice
- **Categoria:** desempenho. **Severidade: BAIXA.** Hoje só há 1 usuário e o banco tem 61 MB.
- **Estado:** CONFIRMADO (M9); o impacto é HIPÓTESE.
- **Detalhe:** os acessos quentes por usuário estão cobertos (`tentativas_usuario_questao_respondida_idx`, `revisoes_usuario_vence_ativa_idx`, `questoes_status_assunto_idx`). Faltam:
  - `tentativas(respondida_em)`, usado nos relatórios do super;
  - `tentativas(questao_id)` e `revisoes(questao_id)`, usados em despublicação, exclusão e cascatas;
  - `progresso_licoes(licao_id)`.
- **Correção:** uma migração nova com esses índices.
- **Teste de aceite:** `EXPLAIN` das consultas do financeiro usa o índice.

### R5-14: Imagens grandes
- **Categoria:** build. **Severidade: BAIXA.**
- **Estado:** CONFIRMADO. api 513 MB e worker 551 MB (M10). `infra/docker/api.Dockerfile:84-88` e `worker.Dockerfile:190` copiam `/app` inteiro, com devDependencies.
- **Correção:** `pnpm deploy --prod` (o api precisa de drizzle-kit/migrate, que podem ir como dependência de produção do `@fuse/db`).
- **Teste de aceite:** cada imagem com menos de 300 MB e o pré-teste do `deploy.sh` passando.

### R5-15: Healthcheck do worker é superficial e saúde polui o log
- **Categoria:** observabilidade. **Severidade: BAIXA.**
- **Estado:** CONFIRMADO.
- **Evidência:**
  - `deploy/docker-compose.yml:195` só procura o processo; o worker ficou "healthy" com o backup falhando há 3 dias.
  - 2.907 das 2.945 linhas de requisição da API em 24 h são `/api/saude` (M12).
- **Correção:**
  - O healthcheck do worker deve consultar `jobs_execucoes` (falha se `enviar-comunicacoes` não rodou nos últimos 5 min).
  - Na API, desativar o log de requisição só para `/api/saude`.
- **Teste de aceite:** derrubar o cron interno deixa o worker `unhealthy`.

### R5-16: Host sem HTTP/2 e com versão exposta no redirect
- **Categoria:** TLS e HTTP. **Severidade: BAIXA.**
- **Estado:** CONFIRMADO (M13). Os blocos que o certbot criou na porta 80 não herdam `server_tokens off`, e o `nginx.conf` do host está com `# server_tokens off;` comentado.
- **Correção:** `listen 443 ssl http2;` no modelo, e `server_tokens off` dentro dos blocos de redirect do Fuse. Não alterar o `nginx.conf` global sem o dono.
- **Teste de aceite:** `curl -I --http2` responde `HTTP/2`, e o 301 vem sem versão.

### R5-17: Pool sem timeouts
- **Categoria:** banco. **Severidade: BAIXA.**
- **Estado:** CONFIRMADO no código (`packages/db/src/cliente.ts:62-66`: só `max: 10`); o impacto é HIPÓTESE.
- **Correção:** `idle_timeout: 60`, `connect_timeout: 10` e `connection: { statement_timeout: 15000 }` na API.
- **Teste de aceite:** `pg_sleep(20)` aborta em 15 s.
