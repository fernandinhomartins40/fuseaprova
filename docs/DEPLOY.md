# Deploy do Fuse Aprova (GitHub Actions → VPS)

O deploy é automático: **todo push na `main`** roda os testes, gera as imagens no GitHub Container Registry (GHCR) e atualiza a VPS **72.60.10.112**, que serve **https://www.fuseaprova.com.br**. O único serviço externo do app é o Asaas (Pix). Não há CDN nem SaaS de log, analytics ou e-mail: o SMTP é o do próprio dono.

> **A VPS é compartilhada** (fusai, palmital e outros projetos; 2 vCPU e 7,8 GB de RAM). Tudo o que é do Fuse Aprova tem nome próprio: projeto compose `fuseaprova`; containers `fuseaprova-postgres`, `fuseaprova-api`, `fuseaprova-worker` e `fuseaprova-nginx`; rede `fuseaprova-interna`; volume `fuseaprova-pgdata`; pasta `/root/fuseaprova`; porta local `3600`; site do nginx `fuseaprova.com.br`. Cada container tem limite de memória, e o conjunto fica abaixo de ~1,6 GB. Nada aqui mexe nos containers, nas imagens, nos sites do nginx, no sshd ou nas portas de outros projetos.
>
> **O deploy acontece só pelo GitHub Actions**, num workflow único (`Fuse Aprova`, `.github/workflows/deploy.yml`), que também configura o nginx do host e o HTTPS e faz o rollback. Não rode `deploy.sh` nem suba imagens novas à mão na VPS.

## Visão geral

```
Aluno ──HTTPS 443──► nginx do HOST (Ubuntu; certbot/Let's Encrypt)
                       │  www.fuseaprova.com.br  ──► 127.0.0.1:3600
                       │  fuseaprova.com.br      ──► 301 para https://www.fuseaprova.com.br
                       │  (fusai.com.br          ──► 127.0.0.1:3500, não muda)
                       ▼
            ┌─ projeto compose "fuseaprova" (/root/fuseaprova/deploy) ───────────┐
            │ nginx (sem root, PWA estática)  ── /api/* ──► api:3000 (Fastify)  │
            │                                               │                    │
            │ worker (node-cron, backup 03:30) ─────────────┼──► postgres:5432   │
            │ migrate / coletor (sob demanda, perfil "ferramentas")              │
            └────────────────────────────────────────────────────────────────────┘
```

| Serviço | Imagem | Portas | Dados |
|---|---|---|---|
| `postgres` | `postgres:16-bookworm` (enxuto, 512 MB) | nenhuma publicada | volume `fuseaprova-pgdata` |
| `api` | `ghcr.io/fernandinhomartins40/fuseaprova-api@sha256:…` | 3000 só na rede interna | `/root/fuseaprova/arquivos` |
| `worker` | `ghcr.io/fernandinhomartins40/fuseaprova-worker@sha256:…` | — | `arquivos` e `/root/fuseaprova/backups` |
| `nginx` | `ghcr.io/fernandinhomartins40/fuseaprova-web@sha256:…` | **só `127.0.0.1:3600`** | — |
| `migrate` | a mesma da api | — (roda e sai) | — |
| `coletor` | a mesma da api | — (sob demanda) | `arquivos` |

Arquivos:

| Caminho no repositório | O que é |
|---|---|
| `.github/workflows/deploy.yml` | workflow **único**: migrações + testes + E2E → build api, worker e web em 3 jobs simultâneos (GHCR) + nginx do host e HTTPS → deploy → verificação pública; manual com `acao=rollback` |
| `.github/actions/preparar-ssh/` | SSH por chave de deploy, com a chave de host fixada |
| `.github/vps_known_hosts` | chave de host ed25519 da VPS (impressão conferida em `VPS_HOST_FINGERPRINT`) |
| `deploy/docker-compose.yml` | a stack de produção (vai para a VPS) |
| `deploy/deploy.sh` | o deploy na VPS: `.env`, backup, migração, troca, saúde e volta automática |
| `deploy/env.modelo` | modelo do `.env` de produção |
| `deploy/setup-host.sh`, `deploy/nginx-host/fuseaprova.com.br` | preparação do host e site do nginx do host |
| `infra/docker/*.Dockerfile` | imagens multi-stage (pnpm + `turbo prune`), usuário não root |
| `infra/nginx/` | configuração do nginx do container (CSP, cache, proxy de `/api`) |
| `infra/backup/*.sh` | backup, restore e teste de restore (vão para `/root/fuseaprova/deploy/backup/`) |
| `infra/docker-compose.build.yml` | override para buildar as imagens localmente |

Na VPS:

| Caminho | O que é |
|---|---|
| `/root/fuseaprova/deploy/` | cópia de `deploy/` + `backup/` (o rsync do workflow apaga o que sobrar, **menos o `.env`**) |
| `/root/fuseaprova/deploy/.env` | segredos e imagens em uso (`chmod 600`) |
| `/root/fuseaprova/backups/` | `pg_dump` diários (14) e semanais (8) |
| `/root/fuseaprova/arquivos/` | PDFs do coletor e imagens enviadas pelo admin |
| `/root/fuseaprova/estado/` | trava do deploy e `historico.log` |

Os comandos `docker compose` deste guia (consulta, logs, `.env`, seed, admin, coletor e backup) rodam **dentro de `/root/fuseaprova/deploy`**, como root. A troca de versão é só pelo Actions.

---

## 1. Configuração inicial (uma vez só, nesta ordem)

### 1.1 Chave SSH de deploy e secret `FUSEAPROVA_DEPLOY_SSH_KEY`

O Actions entra na VPS como `root` **com chave**, no mesmo modelo da fusai, e **nunca com senha**: `IdentitiesOnly yes`, `PasswordAuthentication no`, `BatchMode yes` e `StrictHostKeyChecking yes`. Este passo é do dono, ou do coordenador com a aprovação dele:

1. Gerar um par de chaves **só para este deploy**, sem senha (ex.: `ssh-keygen -t ed25519 -N "" -C fuseaprova-deploy -f fuseaprova_deploy`).
2. Acrescentar a chave **pública** (`fuseaprova_deploy.pub`) ao `/root/.ssh/authorized_keys` da VPS, sem tirar as que já estão lá.
3. No GitHub, em **fernandinhomartins40/fuseaprova → Settings → Secrets and variables → Actions → New repository secret**, criar `FUSEAPROVA_DEPLOY_SSH_KEY` com o conteúdo **inteiro** da chave **privada** (`fuseaprova_deploy`, da linha `-----BEGIN OPENSSH PRIVATE KEY-----` até a `-----END ...`). Depois, apague a cópia local da privada ou guarde-a no cofre de senhas.

É a **única** secret. O login no GHCR usa o `GITHUB_TOKEN` automático do Actions.

A chave de host da VPS está fixada em `.github/vps_known_hosts`, e o workflow confere a impressão `SHA256:6ZU1oyYcSKKrodyE2uYKme3ciSkCWFxfniTKCGn7NW8` (`VPS_HOST_FINGERPRINT`). Se o arquivo ou a VPS apresentarem outra chave, o workflow aborta antes de enviar qualquer coisa. Nada no projeto mexe no sshd da VPS.

Opcional, em **Variables** (não são segredos, vão para o bundle público): `VITE_SUPORTE_WHATSAPP` (ex.: `5542999999999`) e `VITE_SUPORTE_EMAIL`. Vazias, a tela de suporte usa `suporte@fuseaprova.com.br` e esconde o WhatsApp.

### 1.2 nginx do host e HTTPS (automático)

O DNS de `www.fuseaprova.com.br` e de `fuseaprova.com.br` já aponta para a VPS. Não há nada a rodar à mão: o job **nginx do host e HTTPS** roda em todo deploy, em paralelo com os builds. O e-mail do Let's Encrypt é `fuseagencia1515@gmail.com` (padrão do workflow; no Run workflow manual dá para informar outro).

O job (`deploy/setup-host.sh`):

1. instala o que faltar: docker + compose, rsync, curl, nginx, certbot (plugin nginx) e poppler-utils;
2. cria `/root/fuseaprova/{deploy,backups,arquivos,estado}`;
3. cria o site `/etc/nginx/sites-available/fuseaprova.com.br` (`www` → `127.0.0.1:3600`) e o 301 de `fuseaprova.com.br` → `https://www.fuseaprova.com.br`, **só se o apex também resolver para 72.60.10.112** (`getent`);
4. roda `nginx -t` antes de recarregar; se falhar, volta o arquivo anterior e não recarrega nada;
5. roda `certbot --nginx` só para os nomes que resolvem para a VPS.

É idempotente: só reescreve o site quando o modelo em `deploy/nginx-host/` muda, e o certbot só reemite perto de expirar. Ele não toca nos sites de outros domínios e para com erro se outro site já declarar `www.fuseaprova.com.br`.

> Antes do primeiro deploy o site responde **502** (ainda não há nada em 127.0.0.1:3600). É normal.

### 1.3 Primeiro push

```bash
git push origin main
```

Acompanhe em **Actions → Fuse Aprova**. No primeiro deploy, o `deploy.sh`:

- cria `/root/fuseaprova/deploy/.env` a partir de `deploy/env.modelo`, com `APP_URL=https://www.fuseaprova.com.br`;
- **gera** a senha do Postgres, a `DATABASE_URL`, o `SESSION_SECRET`, o `ASAAS_WEBHOOK_TOKEN` e o par de chaves VAPID (Web Push). Os valores não aparecem no log;
- avisa no log, em destaque, o que **só o dono pode preencher**: `ASAAS_API_KEY` e SMTP.

O app sobe mesmo sem eles, mas sem o Asaas o Pix não funciona e sem SMTP nenhum e-mail sai.

> Os pacotes do GHCR (`fuseaprova-api`, `-web` e `-worker`) nascem privados e ligados ao repositório. Não precisa torná-los públicos: a VPS baixa com o `GITHUB_TOKEN` de cada execução.

### 1.4 Preencher o Asaas e o SMTP no `.env` da VPS

Entre na VPS (console da Hostinger ou SSH) e edite:

```bash
nano /root/fuseaprova/deploy/.env
```

| Variável | Valor |
|---|---|
| `ASAAS_API_KEY` | a chave do Asaas **entre aspas simples**: `ASAAS_API_KEY='$aact_hmlg_...'`. Ela começa com `$`, e sem aspas simples o Docker Compose a trataria como variável (a chave chegaria vazia ou cortada). |
| `ASAAS_BASE_URL` | sandbox: `https://api-sandbox.asaas.com/v3`. Produção: `https://api.asaas.com/v3`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | dados do seu SMTP (porta 587 STARTTLS ou 465 TLS). Se a senha tiver `$`, use aspas simples também. |
| `SMTP_FROM` | `"Fuse Aprova <nao-responda@fuseaprova.com.br>"` |
| `SUPORTE_WHATSAPP`, `SUPORTE_EMAIL` | contato mostrado pela API |
| `VAPID_SUBJECT` | `mailto:seu-email@fuseaprova.com.br` |

**Não mexa** em `POSTGRES_PASSWORD`/`DATABASE_URL` (o banco já foi criado com essa senha) nem nas linhas `FUSEAPROVA_*_IMAGE` (o deploy cuida delas).

Recrie a api e o worker (um `restart` não relê o `.env`):

```bash
cd /root/fuseaprova/deploy
docker compose up -d --force-recreate api worker
docker compose ps
```

Guarde uma **cópia do `.env` fora da VPS** (no cofre de senhas do dono). Sem ele, um restore em outra máquina perde as sessões e as inscrições de push, e o banco não abre com uma senha nova.

### 1.5 Cadastrar o webhook do Asaas

A URL é **`https://www.fuseaprova.com.br/api/webhooks/asaas`** (rota `webhookAsaas` de `packages/shared/src/api/rotas.ts`, com o prefixo `/api`).

Pegue o token gerado:

```bash
grep '^ASAAS_WEBHOOK_TOKEN=' /root/fuseaprova/deploy/.env
```

O jeito recomendado é o script `deploy/asaas-webhook.sh`, que cria ou atualiza o webhook pela API do Asaas, só com os eventos que o app trata (veja **7.1 Asaas em produção**):

```bash
bash /root/fuseaprova/deploy/asaas-webhook.sh
```

Se preferir o painel do Asaas (sandbox: `https://sandbox.asaas.com`; produção: `https://www.asaas.com`, em **Integrações → Webhooks**), use os mesmos valores do script:

- **Nome:** Fuse Aprova - cobranças Pix
- **URL:** `https://www.fuseaprova.com.br/api/webhooks/asaas`
- **E-mail:** `fuseagencia1515@gmail.com` (o Asaas avisa se a fila travar)
- **Versão da API:** v3
- **Token de autenticação:** o valor de `ASAAS_WEBHOOK_TOKEN` (de 32 a 255 caracteres). O Asaas o envia no header `asaas-access-token`, e a API responde 401 se não bater.
- **Fila de sincronização:** ativa, sequencial.
- **Eventos (só estes):** `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`.

O token errado precisa dar **401**:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://www.fuseaprova.com.br/api/webhooks/asaas \
  -H 'Content-Type: application/json' -H 'asaas-access-token: errado' -d '{}'
```

Teste de ponta a ponta no sandbox: crie uma conta de aluno, gere o Pix e, no painel sandbox, confirme o recebimento da cobrança. O app libera o acesso em menos de 10 s. Mesmo sem webhook, `GET /api/pagamento/status` consulta o Asaas depois de 60 s de pedido pendente.

### 1.6 Seed (uma vez)

Cria o concurso de Palmital, as disciplinas, os 246 certames FAU em `provas_origem` e as unidades de exemplo com questões autorais marcadas `rascunho` (o aluno não vê rascunho):

```bash
cd /root/fuseaprova/deploy
docker compose run --rm migrate pnpm --filter ./packages/db run seed
```

O seed é idempotente, mas não há motivo para repeti-lo em produção (e ele recusa `SEED_DEV_PUBLICAR=1` com `NODE_ENV=production`).

### 1.7 Criar o primeiro admin

```bash
cd /root/fuseaprova/deploy
docker compose exec api pnpm --filter @fuse/api cli admin:criar --email voce@fuseaprova.com.br --nome "Luiz Fernando Martins Oliveira"
```

Sem `--senha`, o comando pede a senha no terminal sem eco (não passe a senha na linha de comando: ela fica no histórico do shell). O admin nasce com acesso liberado. Entre em `https://www.fuseaprova.com.br/entrar` e abra `/admin`.

### 1.8 Criar ou promover o superadmin (D13)

```bash
cd /root/fuseaprova/deploy
docker compose exec api pnpm --filter @fuse/api cli superadmin:criar --email voce@fuseaprova.com.br
```

Se a conta já existe (por exemplo, o admin do passo 1.7), o comando **só promove o papel**: a senha não muda e as sessões abertas caem. Se a conta não existe, passe também `--nome "Nome Sobrenome"`. Sem `--senha`, o comando gera uma senha forte e a mostra **uma única vez**; guarde-a num gerenciador de senhas. No primeiro login, a PWA leva para `/super/2fa`, onde você lê o QR code com um app autenticador e guarda os códigos de recuperação. Se perder o celular e os códigos, use `cli superadmin:resetar-2fa --email …`.

---

## 2. Como o deploy funciona (cada push na `main`)

`.github/workflows/deploy.yml`:

1. **Migrações imutáveis.** Compara o push com o commit anterior em `packages/db/drizzle/` (SQL, `meta/*_snapshot.json` e `meta/_journal.json`). Só são aceitos arquivos **novos** e o `_journal.json` crescendo no fim. Editar ou apagar uma migração já versionada falha o workflow, salvo com `[migracao-revertida]` na mensagem do commit.
2. **Testes.** Node 22, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck` e `pnpm test` (os testes de banco usam PGlite, sem serviço postgres).
3. **Imagens.** Build das 3 imagens em **3 jobs simultâneos** (matrix `api`/`worker`/`web`, cada um no seu runner e com o seu cache do GitHub Actions; `infra/docker/*.Dockerfile`, contexto `.`) e push para `ghcr.io/fernandinhomartins40/fuseaprova-{api,web,worker}` com as tags `sha-<commit>` e `main`. O job **Imagens por digest** resolve as 3 tags `sha-<commit>` para o **digest** (`repo@sha256:…`). Nada é compilado na VPS: ela só faz pull. Em paralelo rodam o **E2E** (Playwright) e o job **nginx do host e HTTPS**; o deploy só começa com os três verdes.
4. **Deploy.** Confere que as 3 referências são por digest. Faz o primeiro contato SSH numa tentativa só, com limite de 3 min, e confere a chave de host. Envia `deploy/` + `infra/backup/` por `rsync --delete --no-owner --no-group`, sem tocar no `.env`, e roda o `deploy.sh` na VPS, que:
   1. trava (um deploy por vez) e faz login no GHCR com o token do Actions pela entrada padrão, num `DOCKER_CONFIG` temporário, com logout no fim;
   2. baixa as imagens novas e faz o **pré-teste** (arquivos de entrada, coletor, `pdftotext`, `pg_dump`, `nginx -t`, `index.html` e `sw.js`), com o site antigo ainda no ar;
   3. cria ou completa o `.env`, sem sobrescrever o que já existe;
   4. sobe o postgres, faz **backup** (`pg_dump`) e roda a **migração**;
   5. troca api, worker e nginx e espera `GET /api/saude` e `/` em `127.0.0.1:3600` (até 180 s);
   6. se a saúde falhar, **volta sozinho** para as imagens anteriores e marca o deploy como falho (as migrações já aplicadas não são desfeitas);
   7. grava as imagens novas no `.env` e em `/root/fuseaprova/estado/historico.log` e apaga imagens antigas **só** de `ghcr.io/fernandinhomartins40/fuseaprova-*` (mantém a atual e a anterior).
5. **Verificação pública.** Se `www.fuseaprova.com.br` resolve para a VPS e o HTTPS responde, confere `/api/saude`, `/` (HTML, CSP, HSTS, `no-cache`), o fallback SPA, `sw.js` e o 301 do apex (só se o apex existir). Se o DNS ou o HTTPS ainda não estiverem prontos, só avisa.

Pull requests rodam só as migrações, os testes e o E2E. Um deploy em andamento nunca é cancelado: o próximo push espera na fila (`concurrency`).

> **Regra para as migrações:** como o rollback não desfaz o banco, uma migração precisa funcionar com o código da versão anterior (adicione colunas anuláveis ou com padrão; remova colunas só num deploy seguinte, quando nenhum código as usa).

---

## 3. Operação

```bash
cd /root/fuseaprova/deploy
docker compose ps                          # estado e saúde
docker compose logs -f api                 # API em tempo real
docker compose logs --since 1h worker      # jobs (liga, vidas, lembretes, backup)
docker compose logs --tail=100 nginx       # erros de proxy
cat /root/fuseaprova/estado/historico.log  # deploys e rollbacks
docker compose exec postgres psql -U fuse -d fuse
tail -n 50 /var/log/nginx/error.log        # nginx do host
```

- **Mudou só o `.env`:** `docker compose up -d --force-recreate api worker`.
- **Reimplantar a versão atual:** **Actions → Fuse Aprova → Run workflow** (branch `main`, `acao=deploy`). Depois de um reboot da VPS, os containers voltam sozinhos (`restart: unless-stopped`).
- **Parar tudo:** `docker compose down` (**nunca** `down -v`, que apaga o banco).
- **Coletor** (mesma imagem da api, com `pdftotext`; respeita o robots.txt e o rate limit e não contorna captcha nem login):
  ```bash
  docker compose run --rm coletor fau:certames
  docker compose run --rm coletor fau:docs pmsf2026 --tipos gabarito,recursos
  docker compose run --rm coletor importar /srv/fuse/arquivos/provas/.../caderno.pdf \
    --gabarito /srv/fuse/arquivos/provas/.../gabarito-definitivo.pdf --prova pmsf2026 --simular
  ```
  Os caminhos `/srv/fuse/arquivos/...` são os de **dentro** do container (no host, `/root/fuseaprova/arquivos/...`). Para importar um PDF baixado no navegador, copie-o antes para `/root/fuseaprova/arquivos/` e `chown 1000:1000`.
- Os logs dos containers têm rotação (10 MB × 5). O nginx não grava log de acesso, para não registrar os tokens de `/recuperar/:token`.

---

## 4. Backups

### 4.1 Automático

O worker roda `/app/infra/backup/backup.sh` todo dia às **03:30** (America/Sao_Paulo), e o `deploy.sh` roda o mesmo script antes de cada migração. O script:

- faz `pg_dump -Fc` e valida o arquivo com `pg_restore --list`;
- grava em `/root/fuseaprova/backups/diario/fuse_AAAA-MM-DD_HHMMSS.dump`;
- guarda o primeiro backup de cada semana ISO em `semanal/` (hardlink);
- mantém **14 dias** de diários e **8** semanais;
- escreve o último sucesso em `/root/fuseaprova/backups/ULTIMO_BACKUP`.

```bash
cat /root/fuseaprova/backups/ULTIMO_BACKUP
ls -lh /root/fuseaprova/backups/diario /root/fuseaprova/backups/semanal
```

### 4.2 Manual

```bash
cd /root/fuseaprova/deploy
docker compose exec worker /app/infra/backup/backup.sh     # dentro do worker
bash /root/fuseaprova/deploy/backup/backup.sh              # pelo host
```

### 4.3 Cópia fora da VPS

Backup que só existe na VPS se perde junto com ela. Puxe-o de outra máquina do dono:

```bash
# na OUTRA máquina
rsync -az root@72.60.10.112:/root/fuseaprova/backups/ ~/backups-fuseaprova/
```

---

## 5. Restore

> Apaga o banco atual e o substitui pelo backup. Use só em caso de perda de dados ou de migração de servidor.

```bash
ls -lh /root/fuseaprova/backups/diario/
bash /root/fuseaprova/deploy/backup/restore.sh /root/fuseaprova/backups/diario/fuse_2026-10-23_033000.dump
```

O script valida o arquivo, pede que você **digite o nome do banco**, faz um dump de segurança do estado atual em `/root/fuseaprova/backups/pre-restore/`, para a api e o worker, recria o banco, restaura numa transação única, roda o `migrate` e sobe a stack. Se der erro no meio, ele mostra o comando para voltar ao dump de segurança.

**Teste de restore** (não toca na produção; rode depois do primeiro backup, uma vez por mês e depois de toda migração):

```bash
bash /root/fuseaprova/deploy/backup/teste-restore.sh
```

Ele restaura num banco temporário, compara tabelas e linhas com a produção e termina com `TESTE DE RESTORE OK`. O resultado fica em `/root/fuseaprova/backups/teste-restore.log`.

**Restore em outra VPS:** rode o workflow nela (com o IP novo, `.github/vps_known_hosts` e `VPS_HOST_FINGERPRINT` atualizados nos workflows), restaure o **mesmo `.env`** em `/root/fuseaprova/deploy/.env`, faça um deploy, copie o `.dump` e `/root/fuseaprova/arquivos`, rode o `restore.sh` e só então aponte o DNS.

---

## 6. Rollback

- **Automático:** se a versão nova não fica saudável, o `deploy.sh` volta sozinho para as imagens anteriores, e o workflow fica vermelho.
- **Manual:** em **Actions → Fuse Aprova → Run workflow**, escolha `acao=rollback` e informe em `commit` o **SHA completo** (40 caracteres, `git log --format=%H`) de um commit da `main` que já passou pelo deploy. O workflow acha as imagens `sha-<commit>` no GHCR por digest e roda o `deploy.sh` da VPS com `SKIP_MIGRATIONS=1` (sem backup e sem migração). Ele entra na mesma fila do deploy. O próximo push na `main` volta a implantar a versão mais nova.
- **Dados:** o rollback não desfaz migrações. Se uma versão estragou dados, restaure o backup feito antes da migração dela (seção 5); o `historico.log` e os nomes dos dumps ajudam a achar o horário.

---

## 7. Trocar o Asaas de sandbox para produção

1. Na conta de **produção** do Asaas: conta aprovada, chave Pix cadastrada e uma chave de API (`$aact_prod_...`).
2. Gere um token novo para o webhook de produção (`openssl rand -hex 32`), grave no `.env` (passo 3) e rode `bash /root/fuseaprova/deploy/asaas-webhook.sh` (seção 7.1).
3. No `.env` da VPS:
   ```
   ASAAS_API_KEY='$aact_prod_...'
   ASAAS_BASE_URL=https://api.asaas.com/v3
   ASAAS_WEBHOOK_TOKEN=<token novo>
   ```
4. `docker compose up -d --force-recreate api worker`.
5. Os clientes e cobranças do sandbox não existem na produção: remova as contas de teste antes de abrir as vendas.
6. Faça uma compra real de R$ 397, confirme a liberação e, se quiser, estorne pelo admin (o acesso é revogado quando chega o `PAYMENT_REFUNDED`).

### 7.1 Asaas em produção

**A conta é compartilhada.** A conta Asaas de produção (FUSE AGENCIA LTDA) também atende o MercadoFlow e o fusai, cada um com o seu webhook. O Asaas manda para cada webhook os eventos de **todas** as cobranças da conta, então o do Fuse Aprova também recebe os pagamentos das outras aplicações.

**Filtro de eventos na API** (`webhookAsaas`, DECISOES D14):

1. confere o header `asaas-access-token` (401 se não bater);
2. o evento é do Fuse Aprova quando o `payment.id` está em `pedidos.asaas_payment_id` **ou** o `payment.externalReference` começa com `fuseaprova:` (as cobranças e os clientes novos usam `fuseaprova:usuario:<uuid>`; os pedidos antigos, com `usuario:<uuid>`, são reconhecidos pelo `payment.id`);
3. evento de outra aplicação responde **200 `{ ok: true }`** e **não grava nada** (o corpo traz dados pessoais de clientes das outras aplicações). Só sai um log em nível debug com o id e o tipo do evento;
4. evento do Fuse Aprova segue como antes: grava em `webhook_eventos` de forma idempotente pelo id, processa e marca `processado_em`; em erro, apaga a marca e responde 500, para o Asaas reenviar.

A descrição da cobrança, que o pagador e o painel da conta compartilhada veem, é "Fuse Aprova: acesso ao preparatório do concurso da Prefeitura de Palmital-PR (FAU)".

**Cadastrar ou atualizar o webhook** (na VPS, como root, depois de preencher `ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ASAAS_WEBHOOK_TOKEN` e `APP_URL` no `.env`):

```bash
bash /root/fuseaprova/deploy/asaas-webhook.sh
```

O script:

- lê as 4 variáveis de `/root/fuseaprova/deploy/.env` (a chave fica entre aspas simples, porque começa com `$`; `ENV_FILE=/outro/.env` muda o caminho);
- procura em `GET /v3/webhooks` o webhook com a URL `${APP_URL}/api/webhooks/asaas`. Se não houver, cria com `POST /v3/webhooks`; se houver, atualiza com `PUT /v3/webhooks/{id}`. Rodar de novo não muda nada (idempotente);
- **nunca toca** nos webhooks de outras URLs (MercadoFlow, fusai). Se houver mais de um webhook com a nossa URL, ele para e pede para apagar os repetidos no painel;
- cadastra só os eventos tratados pelo app: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_OVERDUE` e `PAYMENT_DELETED`, com fila sequencial, `enabled` true e `interrupted` false;
- imprime o resultado **sem a chave e sem o token** e sai com erro se os eventos, o token ou a fila não estiverem como esperado.

O `PUT` do Asaas não aceita `email` nem `apiVersion`. Se o webhook já existia com outro e-mail, o script avisa, e a troca se faz no painel. Se a fila do webhook for interrompida (o Asaas para depois de falhas seguidas), corrija a causa e rode o script de novo: ele grava `interrupted: false`, e o Asaas reenvia os eventos pendentes.

Depois, confira o 401 com o token errado (seção 1.5) e faça uma compra real.

---

## 8. Problemas comuns

| Sintoma | Causa provável e solução |
|---|---|
| "VPS inacessível" no primeiro contato | A Hostinger filtra os IPs de alguns runners do GitHub. Clique em **Re-run all jobs** (cai em outro runner). Se persistir, veja se a VPS está no ar. |
| `Permission denied (publickey)` | A chave pública de deploy não está no `/root/.ssh/authorized_keys` da VPS, ou a secret `FUSEAPROVA_DEPLOY_SSH_KEY` não é a privada correspondente (seção 1.1). |
| "Secret ausente" ou "Chave inválida" | Crie a secret `FUSEAPROVA_DEPLOY_SSH_KEY` com a chave privada inteira, sem senha. |
| "Chave de host diferente" ou `Host key verification failed` | A VPS foi reinstalada ou há um intermediário. Confira no console: `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256`. Se a VPS foi mesmo reinstalada, atualize `.github/vps_known_hosts` e `VPS_HOST_FINGERPRINT` nos 3 workflows. |
| "rsync ausente na VPS" | Rode o fluxo completo (`acao=deploy`): o job "nginx do host e HTTPS" instala o rsync. |
| `porta 127.0.0.1:3600 já está em uso` | Outro projeto pegou a porta. Escolha outra livre: `FUSEAPROVA_PORTA=<porta>` no `.env` da VPS, o mesmo número em `deploy/nginx-host/fuseaprova.com.br` (upstream) e em `PORTA_APP` do `deploy/setup-host.sh`; rode o setup-host e depois um deploy. |
| 502 em `www.fuseaprova.com.br` | O container nginx não está no ar: `docker compose ps`, `docker compose logs nginx api`. |
| Container morto por falta de memória (`OOMKilled` em `docker inspect`) | Um `mem_limit` ficou apertado. Aumente o do serviço em `deploy/docker-compose.yml`, de pouco em pouco (a VPS é compartilhada), e faça push. |
| A migração falhou | O deploy parou antes da troca: a versão antiga segue no ar. Veja o log do workflow; se o banco ficou inconsistente, restaure o backup feito logo antes (seção 5). |
| O certbot falhou | O DNS não aponta para a VPS, a porta 80 está fechada no firewall da Hostinger ou estourou o limite do Let's Encrypt. Veja `/var/log/letsencrypt/letsencrypt.log` e rode o workflow de novo (`acao=deploy`). |
| O apex não redireciona | O apex `fuseaprova.com.br` não resolvia para a VPS quando o setup rodou. Confira o DNS e rode o workflow de novo (`acao=deploy`). |
| O Pix não gera ou dá erro de autenticação | `ASAAS_API_KEY` vazia ou sem aspas simples no `.env` (o `$` foi interpretado). Corrija e recrie api e worker. |
| `o volume fuseaprova-pgdata já existe, mas .env não` | O `.env` sumiu. Restaure a cópia do dono em `/root/fuseaprova/deploy/.env`; uma senha nova não abriria o banco. |
| Rate limit bloqueia todo mundo junto | A cadeia de proxies precisa sobrescrever `X-Forwarded-For` com o IP real (o site do host e `infra/nginx/fuseaprova.conf` já fazem isso; a API usa `trustProxy`). Confira se ninguém editou o site do host na mão. |

---

## 9. Checklist depois do primeiro deploy

**Servidor**
- [ ] `ss -ltnp | grep -E ':3600|:5432|:3000'` mostra só `127.0.0.1:3600` (docker-proxy). O postgres e a api não aparecem.
- [ ] `nginx -t` ok e `ls /etc/nginx/sites-enabled/` mostra o site do fusai **e** `fuseaprova.com.br`.
- [ ] `curl -sI https://fusai.com.br | head -1` continua respondendo como antes, e `docker ps` mostra os containers dos outros projetos intactos.
- [ ] `docker stats --no-stream` mostra cada container `fuseaprova-*` abaixo do seu limite.

**Stack**
- [ ] `docker compose ps`: `fuseaprova-postgres`, `fuseaprova-api`, `fuseaprova-worker` e `fuseaprova-nginx` healthy.
- [ ] `docker compose exec api date` mostra o horário de Brasília (-03).

**HTTPS e cabeçalhos**
- [ ] `curl -I http://www.fuseaprova.com.br` responde 301 para `https://`.
- [ ] `curl -I https://www.fuseaprova.com.br` traz `strict-transport-security`, `content-security-policy` (com `img-src 'self' data:`), `x-content-type-options: nosniff` e `cache-control: no-cache`.
- [ ] Um arquivo de `/assets/` responde `cache-control: public, max-age=31536000, immutable` e, com `-H 'Accept-Encoding: gzip'`, `content-encoding: gzip`.
- [ ] `curl -sI https://www.fuseaprova.com.br/aprender` responde 200 (fallback SPA) e `/assets/nao-existe.js` responde 404.
- [ ] `curl -sI https://fuseaprova.com.br` responde 301 para `https://www.fuseaprova.com.br/` (se o apex existir).

**API e pagamento**
- [ ] `curl -fsS https://www.fuseaprova.com.br/api/saude` responde `{"ok":true,...}`.
- [ ] Uma rota de conteúdo sem pagamento responde 402.
- [ ] O webhook com token errado responde 401.
- [ ] Pix pago no sandbox libera o acesso em menos de 10 s.
- [ ] O e-mail de recuperação de senha chega (SMTP ok) e o push de teste chega no celular (VAPID ok).

**Backup**
- [ ] `/root/fuseaprova/backups/ULTIMO_BACKUP` tem a data de hoje.
- [ ] `bash /root/fuseaprova/deploy/backup/teste-restore.sh` termina com `TESTE DE RESTORE OK`.
- [ ] Existe cópia dos backups e do `.env` fora da VPS.
