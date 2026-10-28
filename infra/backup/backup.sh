#!/usr/bin/env bash
# =============================================================================
# Fuse Aprova: backup do PostgreSQL (pg_dump -Fc)
#
# Onde roda:
#   1) Dentro do container do worker (job das 03:30, PRD 8.7):
#        /app/infra/backup/backup.sh            (caminho em $BACKUP_SCRIPT)
#      Usa o pg_dump 16 da imagem e o DATABASE_URL do .env.
#   2) No host da VPS, manualmente ou por cron, com a stack no ar:
#        bash /root/fuseaprova/deploy/backup/backup.sh
#      Usa `docker compose exec postgres pg_dump`.
#   O modo é detectado sozinho; force com BACKUP_MODO=local|docker.
#
# Layout em $BACKUP_DIR (padrão /srv/fuse/backups no container e
# /root/fuseaprova/backups no host da VPS, que é o mesmo diretório montado):
#   diario/fuse_AAAA-MM-DD_HHMMSS.dump   mantém os 14 dias mais recentes
#   semanal/fuse_AAAA-Wss.dump           1 por semana ISO, mantém 8
#   ULTIMO_BACKUP                        data e caminho do último sucesso
#
#   arquivos/fuse_arquivos_AAAA-MM-DD.tar.gz  uploads e figuras (1 por dia)
#                                        ($ARQUIVOS_DIR), mantém os KEEP_DAILY mais recentes
# Variáveis: BACKUP_DIR, KEEP_DAILY (14), KEEP_WEEKLY (8), TZ, DATABASE_URL,
#            COMPOSE_FILE (modo docker), BACKUP_MODO, ARQUIVOS_DIR.
# Saída: 0 em sucesso; diferente de 0 em qualquer falha (o worker deve logar).
# =============================================================================
set -Eeuo pipefail
umask 077

export TZ="${TZ:-America/Sao_Paulo}"
BACKUP_DIR="${BACKUP_DIR:-$( [[ -f /.dockerenv ]] && echo /srv/fuse/backups || echo /root/fuseaprova/backups )}"
KEEP_DAILY="${KEEP_DAILY:-14}"
KEEP_WEEKLY="${KEEP_WEEKLY:-8}"
ARQUIVOS_DIR="${ARQUIVOS_DIR:-$( [[ -f /.dockerenv ]] && echo /srv/fuse/arquivos || echo /root/fuseaprova/arquivos )}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$SCRIPT_DIR/../docker-compose.yml}"

log()  { printf '[backup %s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')" "$*"; }
fail() { log "ERRO: $*" >&2; exit 1; }

if [[ -n "${BACKUP_MODO:-}" ]]; then
  MODO="$BACKUP_MODO"
elif [[ -f /.dockerenv ]] && command -v pg_dump >/dev/null 2>&1 && [[ -n "${DATABASE_URL:-}" ]]; then
  MODO=local
else
  MODO=docker
fi

compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

# Escreve o dump em formato custom na saída padrão.
fazer_dump() {
  case "$MODO" in
    local)  pg_dump --dbname="$DATABASE_URL" --format=custom --compress=6 --no-password ;;
    docker) compose exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=6' ;;
    *)      fail "BACKUP_MODO inválido: '$MODO' (use local ou docker)" ;;
  esac
}

# Lê um dump da entrada padrão e lista o índice (valida o arquivo).
listar_dump() {
  case "$MODO" in
    local)  pg_restore --list ;;
    docker) compose exec -T postgres pg_restore --list ;;
  esac
}

# Mantém os arquivos dos N dias mais recentes (vários backups no mesmo dia
# contam como um dia só, para um backup manual não empurrar um diário fora).
podar_diarios() {
  local dir="$1" manter="$2" corte f nome dia
  local -a dias
  mapfile -t dias < <(find "$dir" -maxdepth 1 -type f -name 'fuse_*.dump' -printf '%f\n' \
                        | sed -n 's/^fuse_\([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\)_.*\.dump$/\1/p' \
                        | sort -u -r)
  (( ${#dias[@]} > manter )) || return 0
  corte="${dias[manter-1]}"
  for f in "$dir"/fuse_*.dump; do
    [[ -e "$f" ]] || continue
    nome="$(basename "$f")"; dia="${nome:5:10}"
    if [[ "$dia" < "$corte" ]]; then rm -f -- "$f"; log "removido (retenção diária): $nome"; fi
  done
}

# Mantém os N arquivos mais recentes (nomes ordenáveis por data).
podar_por_quantidade() {
  local dir="$1" manter="$2" i
  local -a arquivos
  mapfile -t arquivos < <(find "$dir" -maxdepth 1 -type f -name 'fuse_*.dump' | sort)
  local total=${#arquivos[@]}
  (( total > manter )) || return 0
  for (( i = 0; i < total - manter; i++ )); do
    rm -f -- "${arquivos[i]}"; log "removido (retenção semanal): $(basename "${arquivos[i]}")"
  done
}

# ---------------------------------------------------------------------------
[[ "$KEEP_DAILY" =~ ^[1-9][0-9]*$ && "$KEEP_WEEKLY" =~ ^[1-9][0-9]*$ ]] \
  || fail "KEEP_DAILY e KEEP_WEEKLY precisam ser inteiros positivos"
mkdir -p "$BACKUP_DIR/diario" "$BACKUP_DIR/semanal" \
  || fail "não foi possível criar $BACKUP_DIR (dono deve ser 1000:1000)"
[[ -w "$BACKUP_DIR/diario" ]] || fail "sem permissão de escrita em $BACKUP_DIR/diario"

if command -v flock >/dev/null 2>&1; then
  exec 9>"$BACKUP_DIR/.backup.lock"
  flock -n 9 || fail "já existe um backup em andamento"
fi

CARIMBO="$(date '+%Y-%m-%d_%H%M%S')"
SEMANA="$(date '+%G-W%V')"
DESTINO="$BACKUP_DIR/diario/fuse_${CARIMBO}.dump"
TEMP="${DESTINO}.parcial"
trap 'rm -f -- "$TEMP"' EXIT

log "início (modo $MODO) -> $DESTINO"
inicio=$SECONDS
fazer_dump > "$TEMP" || fail "pg_dump falhou"
[[ -s "$TEMP" ]] || fail "o dump saiu vazio"

INDICE="$(listar_dump < "$TEMP")" || fail "o arquivo gerado não é um dump válido (pg_restore --list falhou)"
TABELAS="$(grep -c ' TABLE DATA ' <<<"$INDICE" || true)"
mv -f -- "$TEMP" "$DESTINO"

SEMANAL="$BACKUP_DIR/semanal/fuse_${SEMANA}.dump"
if [[ ! -e "$SEMANAL" ]]; then
  ln -- "$DESTINO" "$SEMANAL" 2>/dev/null || cp -p -- "$DESTINO" "$SEMANAL"
  log "cópia semanal: $(basename "$SEMANAL")"
fi

podar_diarios "$BACKUP_DIR/diario" "$KEEP_DAILY"
podar_por_quantidade "$BACKUP_DIR/semanal" "$KEEP_WEEKLY"

# Uploads e figuras das questões (auditoria PIE R5-03): sem eles, o banco restaurado aponta
# para imagens que não existem.
# Um por dia (o do deploy e o das 03:30 se sobrescrevem), mantém os KEEP_DAILY dias mais
# recentes. S-09 (R5-11): falha aqui = backup com falha (código 3), com o ULTIMO_BACKUP gravado
# (o dump do banco está salvo e validado) e marcado `arquivos=falhou`. O deploy, que não pode
# travar por isso, passa BACKUP_ARQUIVOS_FALHA=aviso e recebe só o aviso, como antes.
ARQUIVOS_ESTADO=ausente
if [[ -d "$ARQUIVOS_DIR" ]]; then
  mkdir -p "$BACKUP_DIR/arquivos"
  ARQ="$BACKUP_DIR/arquivos/fuse_arquivos_$(date '+%Y-%m-%d').tar.gz"
  rc=0
  tar -czf "$ARQ.parcial" -C "$ARQUIVOS_DIR" . 2>/dev/null || rc=$?
  # tar 1 = "arquivo mudou durante a leitura" (upload no meio): o pacote é utilizável.
  if (( rc <= 1 )) && [[ -s "$ARQ.parcial" ]]; then
    mv -f -- "$ARQ.parcial" "$ARQ"
    log "arquivos: $(basename "$ARQ") ($(du -h "$ARQ" | cut -f1))"
    ARQUIVOS_ESTADO=ok
  else
    rm -f -- "$ARQ.parcial"
    log "ERRO: falha ao compactar $ARQUIVOS_DIR (tar $rc); o dump do banco foi salvo"
    ARQUIVOS_ESTADO=falhou
  fi
  mapfile -t antigos < <(find "$BACKUP_DIR/arquivos" -maxdepth 1 -type f -name 'fuse_arquivos_*.tar.gz' \
                           | sort -r | tail -n +"$(( KEEP_DAILY + 1 ))")
  for f in "${antigos[@]}"; do rm -f -- "$f"; log "removido (retenção de arquivos): $(basename "$f")"; done
  find "$BACKUP_DIR/arquivos" -maxdepth 1 -type f -name '*.parcial' -delete 2>/dev/null || true
else
  log "aviso: $ARQUIVOS_DIR não existe; uploads fora do backup"
fi

# <data ISO> <dump> arquivos=<ok|falhou|ausente> (lido pelo /super/sistema e pelos alertas).
printf '%s %s arquivos=%s\n' "$(date '+%Y-%m-%dT%H:%M:%S%:z')" "$DESTINO" "$ARQUIVOS_ESTADO" > "$BACKUP_DIR/ULTIMO_BACKUP"
TAMANHO="$(du -h "$DESTINO" | cut -f1)"
if [[ "$ARQUIVOS_ESTADO" == falhou && "${BACKUP_ARQUIVOS_FALHA:-erro}" != aviso ]]; then
  log "ERRO: banco salvo ($(basename "$DESTINO"), $TAMANHO), mas os arquivos falharam" >&2
  exit 3
fi
log "ok: $(basename "$DESTINO") ($TAMANHO, $TABELAS tabelas com dados, arquivos=$ARQUIVOS_ESTADO, $(( SECONDS - inicio ))s)"
