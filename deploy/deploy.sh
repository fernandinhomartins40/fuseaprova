#!/usr/bin/env bash
# =============================================================================
# Fuse Aprova: deploy na VPS (roda em /root/fuseaprova/deploy, como root)
#
# Chamado SÓ pelo workflow .github/workflows/deploy.yml (job deploy; o
# deploy é só pelo GitHub Actions). Idempotente: rodar de novo com as mesmas
# imagens só confere a saúde e não muda nada.
#
# Entrada (variáveis de ambiente):
#   FUSEAPROVA_API_IMAGE     ghcr.io/fernandinhomartins40/fuseaprova-api@sha256:...
#   FUSEAPROVA_WEB_IMAGE     ghcr.io/fernandinhomartins40/fuseaprova-web@sha256:...
#   FUSEAPROVA_WORKER_IMAGE  ghcr.io/fernandinhomartins40/fuseaprova-worker@sha256:...
#       (sem elas, usa as que já estão no .env: reimplanta a versão atual)
#   SKIP_MIGRATIONS=1        não roda backup nem migração (rollback)
#   GHCR_LOGIN_STDIN=1       lê o token do GHCR da 1ª linha da entrada padrão
#   GHCR_USUARIO             usuário do login no GHCR (padrão: github-actions)
#   DEPLOY_COMMIT            SHA do commit (só para o histórico)
#
# Passos:
#   1. trava (um deploy por vez) e confere as referências por digest;
#   2. login no GHCR num DOCKER_CONFIG temporário (logout no trap);
#   3. pull das imagens novas e pré-teste (arquivos de entrada e nginx -t);
#   4. cria/completa o .env (gera segredos que faltam, mantém os existentes);
#   5. sobe o postgres, faz backup (pg_dump) e roda a migração;
#   6. troca api, worker e nginx e espera GET /api/saude em 127.0.0.1:3600;
#   7. se a saúde falhar, volta sozinho para as imagens anteriores;
#   8. grava as imagens no .env e limpa imagens antigas SÓ deste projeto.
#
# Nunca mexe em containers, redes, volumes ou imagens de outros projetos da
# VPS (ex.: fusai): tudo é filtrado pelo projeto compose `fuseaprova` e pelo
# repositório ghcr.io/fernandinhomartins40/fuseaprova-*.
# =============================================================================
set -euo pipefail
umask 077

export TZ=America/Sao_Paulo
RAIZ=/root/fuseaprova
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$DIR/.env"
MODELO="$DIR/env.modelo"
ESTADO="$RAIZ/estado"
BACKUPS="$RAIZ/backups"
ARQUIVOS="$RAIZ/arquivos"
PREFIXO_IMAGEM="ghcr.io/fernandinhomartins40/fuseaprova-"
UID_APP=1000   # usuário `node` dos containers da api e do worker
TEMPO_SAUDE="${TEMPO_SAUDE:-180}"

log()   { printf '[deploy %s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
aviso() { printf '[deploy %s] AVISO: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >&2; }
fail()  { printf '[deploy %s] ERRO: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >&2; exit 1; }

compose() { docker compose --project-directory "$DIR" -f "$DIR/docker-compose.yml" "$@"; }

[[ "$(id -u)" == 0 ]] || fail "rode como root (o deploy cria diretórios em $RAIZ)"
command -v docker >/dev/null || fail "docker não encontrado. Rode o workflow Fuse Aprova (o job 'nginx do host e HTTPS' instala o docker)."
docker compose version >/dev/null 2>&1 || fail "o plugin 'docker compose' (v2) não está instalado"
command -v curl >/dev/null || fail "curl não encontrado (apt-get install -y curl)"
[[ -f "$DIR/docker-compose.yml" ]] || fail "não achei $DIR/docker-compose.yml"

# ---------------------------------------------------------------------------
# .env: leitura e escrita sem `source` (valores podem ter $, aspas e espaços)
# ---------------------------------------------------------------------------
ler_env() {
  local chave="$1" linha
  [[ -f "$ENV_FILE" ]] || return 0
  linha="$(grep -E "^${chave}=" "$ENV_FILE" | tail -n 1 || true)"
  linha="${linha#*=}"
  if [[ ${#linha} -ge 2 && ( ( "${linha:0:1}" == "'" && "${linha: -1}" == "'" ) || ( "${linha:0:1}" == '"' && "${linha: -1}" == '"' ) ) ]]; then
    linha="${linha:1:${#linha}-2}"
  fi
  printf '%s' "$linha"
}

# definir_env CHAVE VALOR: troca a linha CHAVE=... (ou acrescenta no fim).
# Só é usado com valores gerados aqui (hex, base64url, digests): sem $ nem \.
definir_env() {
  local chave="$1" valor="$2" tmp
  tmp="$(mktemp "$DIR/.env.tmp.XXXXXX")"
  if grep -qE "^${chave}=" "$ENV_FILE"; then
    awk -v k="$chave" -v v="$valor" 'index($0, k "=") == 1 { print k "=" v; next } { print }' "$ENV_FILE" > "$tmp"
  else
    cat "$ENV_FILE" > "$tmp"
    printf '%s=%s\n' "$chave" "$valor" >> "$tmp"
  fi
  chmod 600 "$tmp"
  mv -f "$tmp" "$ENV_FILE"
}

# completar_env CHAVE VALOR: só grava se a chave estiver vazia ou ausente.
completar_env() {
  if [[ -z "$(ler_env "$1")" ]]; then
    definir_env "$1" "$2"
    GERADOS+=("$1")
  fi
}

digest_valido() {
  [[ "$1" =~ ^ghcr\.io/fernandinhomartins40/fuseaprova-(api|web|worker)@sha256:[0-9a-f]{64}$ ]]
}

# ---------------------------------------------------------------------------
# 1. Trava e referências
# ---------------------------------------------------------------------------
mkdir -p "$ESTADO"
chmod 700 "$RAIZ" "$ESTADO" 2>/dev/null || true
exec 9>"$ESTADO/deploy.lock"
if ! flock -w 600 9; then
  fail "outro deploy do Fuse Aprova está em andamento há mais de 10 min"
fi

# Porta local do nginx do projeto (só 127.0.0.1). Ambiente > .env > 3600.
PORTA="${FUSEAPROVA_PORTA:-$(ler_env FUSEAPROVA_PORTA)}"
PORTA="${PORTA:-3600}"
[[ "$PORTA" =~ ^[0-9]{2,5}$ && "$PORTA" != 3500 ]] || fail "FUSEAPROVA_PORTA inválida ($PORTA); a 3500 é do fusai"

ANT_API="$(ler_env FUSEAPROVA_API_IMAGE)"
ANT_WEB="$(ler_env FUSEAPROVA_WEB_IMAGE)"
ANT_WORKER="$(ler_env FUSEAPROVA_WORKER_IMAGE)"

NOVA_API="${FUSEAPROVA_API_IMAGE:-$ANT_API}"
NOVA_WEB="${FUSEAPROVA_WEB_IMAGE:-$ANT_WEB}"
NOVA_WORKER="${FUSEAPROVA_WORKER_IMAGE:-$ANT_WORKER}"

for ref in "$NOVA_API" "$NOVA_WEB" "$NOVA_WORKER"; do
  [[ -n "$ref" ]] || fail "imagem não informada (defina FUSEAPROVA_API_IMAGE, FUSEAPROVA_WEB_IMAGE e FUSEAPROVA_WORKER_IMAGE)"
  digest_valido "$ref" || fail "imagem fora do padrão por digest (repo@sha256:...): $ref"
done
[[ "$NOVA_API" == *fuseaprova-api@* && "$NOVA_WEB" == *fuseaprova-web@* && "$NOVA_WORKER" == *fuseaprova-worker@* ]] \
  || fail "as imagens estão trocadas entre api, web e worker"

TEM_ANTERIOR=0
if [[ -n "$ANT_API" && -n "$ANT_WEB" && -n "$ANT_WORKER" ]] \
   && digest_valido "$ANT_API" && digest_valido "$ANT_WEB" && digest_valido "$ANT_WORKER"; then
  TEM_ANTERIOR=1
fi

log "commit: ${DEPLOY_COMMIT:-(manual)}"
log "api:    $NOVA_API"
log "web:    $NOVA_WEB"
log "worker: $NOVA_WORKER"
[[ "${SKIP_MIGRATIONS:-0}" == 1 ]] && log "SKIP_MIGRATIONS=1: sem backup e sem migração (rollback)"

# ---------------------------------------------------------------------------
# 2. Login no GHCR (token pela entrada padrão; nunca em argumento nem em log)
# ---------------------------------------------------------------------------
# DOCKER_CONFIG temporário: o login não toca o ~/.docker/config.json do root,
# que outros projetos da VPS podem usar.
DOCKER_CONFIG_TMP=""
limpar() {
  if [[ -n "$DOCKER_CONFIG_TMP" ]]; then
    docker logout ghcr.io >/dev/null 2>&1 || true
    rm -rf -- "$DOCKER_CONFIG_TMP"
  fi
  rm -f -- "$DIR"/.env.tmp.* 2>/dev/null || true
}
trap limpar EXIT

if [[ "${GHCR_LOGIN_STDIN:-0}" == 1 ]]; then
  IFS= read -r GHCR_TOKEN || true
  [[ -n "${GHCR_TOKEN:-}" ]] || fail "GHCR_LOGIN_STDIN=1, mas nenhum token chegou pela entrada padrão"
  DOCKER_CONFIG_TMP="$(mktemp -d)"
  # Mantém os plugins do CLI (compose/buildx) instalados no ~/.docker do root.
  if [[ -d "$HOME/.docker/cli-plugins" ]]; then
    ln -s "$HOME/.docker/cli-plugins" "$DOCKER_CONFIG_TMP/cli-plugins"
  fi
  export DOCKER_CONFIG="$DOCKER_CONFIG_TMP"
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USUARIO:-github-actions}" --password-stdin >/dev/null \
    || fail "login no ghcr.io falhou (o token do GitHub precisa de packages: read)"
  unset GHCR_TOKEN
  log "login no ghcr.io ok (config temporária)"
fi

# ---------------------------------------------------------------------------
# 3. Pull e pré-teste das imagens novas (o site atual segue no ar)
# ---------------------------------------------------------------------------
log "baixando as imagens ..."
# Por digest a imagem é imutável: se já está na VPS, não precisa do GHCR
# (permite reimplantar à mão, sem login).
for ref in "$NOVA_API" "$NOVA_WEB" "$NOVA_WORKER"; do
  if ! docker image inspect "$ref" >/dev/null 2>&1; then
    docker pull --quiet "$ref" >/dev/null || fail "não consegui baixar $ref (sem login no ghcr.io? rode pelo workflow)"
  fi
done

log "pré-teste das imagens novas ..."
docker run --rm --network none --entrypoint sh "$NOVA_API" -c \
  'test -f "/app/$APP_ENTRY" && test -f /app/packages/crawler/dist/cli.js && command -v pdftotext >/dev/null' \
  || fail "pré-teste da api falhou (entrada, coletor ou pdftotext ausente)"
docker run --rm --network none --entrypoint sh "$NOVA_WORKER" -c \
  'test -f "/app/$APP_ENTRY" && test -x /app/infra/backup/backup.sh && pg_dump --version >/dev/null' \
  || fail "pré-teste do worker falhou (entrada, backup.sh ou pg_dump ausente)"
docker run --rm --network none --entrypoint nginx "$NOVA_WEB" -t >/dev/null 2>&1 \
  || fail "pré-teste do nginx falhou (nginx -t)"
docker run --rm --network none --entrypoint sh "$NOVA_WEB" -c \
  'test -f /usr/share/nginx/html/index.html && test -f /usr/share/nginx/html/sw.js' \
  || fail "pré-teste da web falhou (index.html ou sw.js ausente)"

# ---------------------------------------------------------------------------
# 4. .env: cria no primeiro deploy e completa o que faltar
# ---------------------------------------------------------------------------
GERADOS=()
ENV_NOVO=0
if [[ ! -f "$ENV_FILE" ]]; then
  [[ -f "$MODELO" ]] || fail "não achei $MODELO"
  # .env sumiu mas o banco já existe? Gerar outra senha travaria o postgres.
  if docker volume inspect fuseaprova-pgdata >/dev/null 2>&1; then
    fail "o volume fuseaprova-pgdata já existe, mas $ENV_FILE não. Restaure o .env antigo (cópia do dono) antes de continuar; uma senha nova não abriria o banco."
  fi
  install -m 600 "$MODELO" "$ENV_FILE"
  ENV_NOVO=1
  log "criei $ENV_FILE a partir de env.modelo"
fi
chmod 600 "$ENV_FILE"

if [[ -z "$(ler_env POSTGRES_PASSWORD)" ]] && docker volume inspect fuseaprova-pgdata >/dev/null 2>&1; then
  fail "POSTGRES_PASSWORD está vazio no .env, mas o banco já existe. Coloque a senha original no .env."
fi
completar_env POSTGRES_USER fuse
completar_env POSTGRES_DB fuse
completar_env POSTGRES_PASSWORD "$(openssl rand -hex 24)"
completar_env DATABASE_URL "postgres://$(ler_env POSTGRES_USER):$(ler_env POSTGRES_PASSWORD)@postgres:5432/$(ler_env POSTGRES_DB)"
completar_env SESSION_SECRET "$(openssl rand -hex 32)"
completar_env ASAAS_WEBHOOK_TOKEN "$(openssl rand -hex 32)"
completar_env APP_URL "https://www.fuseaprova.com.br"
completar_env NODE_ENV production
completar_env TZ America/Sao_Paulo
completar_env ARQUIVOS_DIR /srv/fuse/arquivos
completar_env ASAAS_BASE_URL "https://api-sandbox.asaas.com/v3"
completar_env PRICE_CENTS 39700
completar_env PRICE_ADICIONAL_CENTS 19700

# Chaves VAPID (Web Push): geradas com o web-push da própria imagem da api;
# se falhar, com openssl (P-256: privada de 32 bytes, pública não comprimida
# de 65 bytes, ambas em base64url sem "=").
if [[ -z "$(ler_env VAPID_PUBLIC_KEY)" || -z "$(ler_env VAPID_PRIVATE_KEY)" ]]; then
  par="$(docker run --rm --network none -w /app/apps/api --entrypoint node "$NOVA_API" -e \
    'const k=require("web-push").generateVAPIDKeys();process.stdout.write(k.publicKey+" "+k.privateKey)' 2>/dev/null || true)"
  if [[ ! "$par" =~ ^[A-Za-z0-9_-]{80,}\ [A-Za-z0-9_-]{40,}$ ]]; then
    b64url() { base64 -w0 | tr '+/' '-_' | tr -d '='; }
    der="$(mktemp)"
    openssl ecparam -name prime256v1 -genkey -noout -outform DER > "$der"
    par="$(tail -c 65 "$der" | b64url) $(dd if="$der" bs=1 skip=7 count=32 status=none | b64url)"
    rm -f -- "$der"
  fi
  definir_env VAPID_PUBLIC_KEY "${par%% *}"
  definir_env VAPID_PRIVATE_KEY "${par##* }"
  GERADOS+=(VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY)
fi

if ((${#GERADOS[@]})); then
  log "gerei no .env (valores não exibidos): ${GERADOS[*]}"
fi
(( ENV_NOVO )) && log "ASAAS_WEBHOOK_TOKEN novo: copie-o do .env para o painel do Asaas (veja docs/DEPLOY.md)."

FALTANDO=()
for chave in ASAAS_API_KEY SMTP_HOST SMTP_USER SMTP_PASS SMTP_FROM; do
  [[ -n "$(ler_env "$chave")" ]] || FALTANDO+=("$chave")
done
if ((${#FALTANDO[@]})); then
  aviso "================================================================"
  aviso "Faltam valores que só o dono pode preencher: ${FALTANDO[*]}"
  aviso "Edite /root/fuseaprova/deploy/.env na VPS (ASAAS_API_KEY entre"
  aviso "aspas simples, porque começa com \$) e rode:"
  aviso "  cd /root/fuseaprova/deploy && docker compose up -d --force-recreate api worker"
  aviso "Sem ASAAS_API_KEY o Pix não funciona; sem SMTP nenhum e-mail sai."
  aviso "================================================================"
fi

# ---------------------------------------------------------------------------
# Diretórios de dados do host (dono 1000 = usuário node dos containers)
# ---------------------------------------------------------------------------
mkdir -p "$ARQUIVOS/provas" "$ARQUIVOS/uploads" "$BACKUPS/diario" "$BACKUPS/semanal"
chown -R "$UID_APP:$UID_APP" "$ARQUIVOS" "$BACKUPS"
chmod 750 "$ARQUIVOS"
chmod 700 "$BACKUPS"

# Daqui em diante o compose usa as imagens NOVAS (o ambiente vence o .env).
usar_imagens() {
  export FUSEAPROVA_API_IMAGE="$1" FUSEAPROVA_WEB_IMAGE="$2" FUSEAPROVA_WORKER_IMAGE="$3"
}
usar_imagens "$NOVA_API" "$NOVA_WEB" "$NOVA_WORKER"
export FUSEAPROVA_PORTA="$PORTA"

# A porta local precisa estar livre ou ser do nosso nginx.
if ss -ltnH "sport = :$PORTA" 2>/dev/null | grep -q .; then
  dono_porta="$(docker ps --filter "publish=$PORTA" --format '{{.Label "com.docker.compose.project"}}' | head -n 1)"
  [[ "$dono_porta" == fuseaprova ]] || fail "a porta 127.0.0.1:$PORTA já está em uso por outro processo/projeto (${dono_porta:-fora do Docker}). Escolha outra em FUSEAPROVA_PORTA e ajuste o site do nginx do host."
fi

# ---------------------------------------------------------------------------
# 5. Postgres, backup e migração
# ---------------------------------------------------------------------------
log "subindo o postgres ..."
compose up -d --wait --wait-timeout 120 postgres || fail "o postgres não ficou saudável (docker compose logs postgres)"

if [[ "${SKIP_MIGRATIONS:-0}" != 1 ]]; then
  if [[ -x "$DIR/backup/backup.sh" || -f "$DIR/backup/backup.sh" ]]; then
    log "backup antes da migração ..."
    BACKUP_MODO=docker BACKUP_DIR="$BACKUPS" COMPOSE_FILE="$DIR/docker-compose.yml" \
      bash "$DIR/backup/backup.sh" || fail "o backup falhou; nada foi migrado nem trocado"
    chown -R "$UID_APP:$UID_APP" "$BACKUPS"
  else
    fail "não achei $DIR/backup/backup.sh (o workflow envia infra/backup para cá)"
  fi

  log "aplicando migrações ..."
  if ! compose run --rm --no-deps migrate; then
    fail "a migração falhou. As imagens antigas continuam no ar. Se o banco ficou inconsistente, restaure o backup acima com backup/restore.sh."
  fi
fi

# ---------------------------------------------------------------------------
# 6. Troca e saúde
# ---------------------------------------------------------------------------
esperar_saude() {
  local limite=$((SECONDS + TEMPO_SAUDE)) corpo
  while (( SECONDS < limite )); do
    corpo="$(curl -fsS --max-time 5 "http://127.0.0.1:$PORTA/api/saude" 2>/dev/null || true)"
    if [[ "$corpo" == *'"ok":true'* ]] \
       && curl -fsS --max-time 5 -o /dev/null "http://127.0.0.1:$PORTA/" 2>/dev/null; then
      return 0
    fi
    sleep 3
  done
  return 1
}

subir() {
  compose up -d --remove-orphans --no-build api worker nginx
}

log "trocando api, worker e nginx ..."
if subir && esperar_saude; then
  SAUDE=ok
else
  SAUDE=falhou
fi

if [[ "$SAUDE" != ok ]]; then
  aviso "a versão nova não respondeu saudável em ${TEMPO_SAUDE}s em http://127.0.0.1:$PORTA/api/saude"
  compose ps || true
  compose logs --tail=80 api worker nginx || true
  if (( TEM_ANTERIOR )) && [[ "$ANT_API|$ANT_WEB|$ANT_WORKER" != "$NOVA_API|$NOVA_WEB|$NOVA_WORKER" ]]; then
    aviso "VOLTANDO para as imagens anteriores ..."
    usar_imagens "$ANT_API" "$ANT_WEB" "$ANT_WORKER"
    if subir && esperar_saude; then
      aviso "voltei para a versão anterior, que está saudável. O deploy FALHOU."
    else
      aviso "a versão anterior também não ficou saudável. Veja: cd $DIR && docker compose logs"
    fi
    aviso "migrações já aplicadas NÃO são desfeitas (o backup de antes está em $BACKUPS/diario)."
  fi
  printf '%s FALHOU commit=%s api=%s web=%s worker=%s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" \
    "${DEPLOY_COMMIT:-manual}" "$NOVA_API" "$NOVA_WEB" "$NOVA_WORKER" >> "$ESTADO/historico.log"
  exit 1
fi

# ---------------------------------------------------------------------------
# 7. Grava a versão atual e limpa imagens antigas deste projeto
# ---------------------------------------------------------------------------
definir_env FUSEAPROVA_API_IMAGE "$NOVA_API"
definir_env FUSEAPROVA_WEB_IMAGE "$NOVA_WEB"
definir_env FUSEAPROVA_WORKER_IMAGE "$NOVA_WORKER"
printf '%s OK commit=%s api=%s web=%s worker=%s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" \
  "${DEPLOY_COMMIT:-manual}" "$NOVA_API" "$NOVA_WEB" "$NOVA_WORKER" >> "$ESTADO/historico.log"

# Mantém a versão atual e a anterior (rollback rápido sem pull). Remove só
# ghcr.io/fernandinhomartins40/fuseaprova-*; uma imagem em uso não é removida.
manter=" $NOVA_API $NOVA_WEB $NOVA_WORKER $ANT_API $ANT_WEB $ANT_WORKER "
removidas=0
while IFS='|' read -r repo dig; do
  [[ "$repo" == "$PREFIXO_IMAGEM"* && "$dig" == sha256:* ]] || continue
  ref="$repo@$dig"
  [[ "$manter" == *" $ref "* ]] && continue
  if docker image rm "$ref" >/dev/null 2>&1; then removidas=$((removidas + 1)); fi
done < <(docker image ls --digests --format '{{.Repository}}|{{.Digest}}')
# Camadas soltas (dangling) só das imagens com o rótulo deste projeto.
docker image prune -f --filter "label=com.fuseaprova.projeto=fuseaprova" >/dev/null 2>&1 || true
log "imagens antigas removidas: $removidas"

compose ps
log "deploy OK: http://127.0.0.1:$PORTA (público: https://www.fuseaprova.com.br)"
