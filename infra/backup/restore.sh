#!/usr/bin/env bash
# =============================================================================
# Fuse Aprova: restaura um backup (pg_dump -Fc) no banco de PRODUÇÃO
#
# ATENÇÃO: apaga o banco atual e o recria a partir do arquivo.
#
# Uso (no host da VPS, com a stack no ar):
#   bash /root/fuseaprova/deploy/backup/restore.sh /root/fuseaprova/backups/diario/fuse_2026-10-23_033000.dump
#   bash /root/fuseaprova/deploy/backup/restore.sh -y <arquivo>     # sem pergunta (cuidado)
#
# O que faz:
#   1. valida o arquivo com pg_restore --list;
#   2. pede confirmação digitando o nome do banco;
#   3. faz um dump de segurança do estado atual em $BACKUP_DIR/pre-restore/
#      (ou em ~/fuse-pre-restore/ se não houver permissão);
#   4. para api e worker (o nginx segue no ar, a API responde 502);
#   5. DROP DATABASE ... WITH (FORCE) + CREATE DATABASE;
#   6. pg_restore --single-transaction --exit-on-error;
#   7. docker compose run --rm migrate + up -d (aplica migrações mais novas que
#      o backup, se houver) e mostra a contagem de tabelas.
#
# Se algo falhar no passo 5 ou 6, a api e o worker ficam parados. Para voltar
# ao estado anterior, rode este script com o dump de segurança do passo 3.
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$SCRIPT_DIR/../docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-$( [[ -f /.dockerenv ]] && echo /srv/fuse/backups || echo /root/fuseaprova/backups )}"
export TZ="${TZ:-America/Sao_Paulo}"

log()  { printf '[restore %s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
fail() { log "ERRO: $*" >&2; exit 1; }
compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

uso() { sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

SIM=0
ARQUIVO=""
while (( $# )); do
  case "$1" in
    -y|--sim) SIM=1 ;;
    -h|--help) uso 0 ;;
    -*) log "opção desconhecida: $1"; uso 2 ;;
    *) [[ -z "$ARQUIVO" ]] || uso 2; ARQUIVO="$1" ;;
  esac
  shift
done
[[ -n "$ARQUIVO" ]] || uso 2
[[ -f "$ARQUIVO" && -r "$ARQUIVO" ]] || fail "arquivo não encontrado ou sem leitura: $ARQUIVO"
command -v docker >/dev/null || fail "docker não encontrado"
[[ -f "$COMPOSE_FILE" ]] || fail "compose não encontrado: $COMPOSE_FILE"

compose ps --status running --services 2>/dev/null | grep -qx postgres \
  || fail "o serviço postgres não está rodando (cd /root/fuseaprova/deploy && docker compose up -d postgres)"

BANCO="$(compose exec -T postgres sh -c 'printf %s "$POSTGRES_DB"')"
USUARIO="$(compose exec -T postgres sh -c 'printf %s "$POSTGRES_USER"')"
[[ -n "$BANCO" && -n "$USUARIO" ]] || fail "POSTGRES_DB/POSTGRES_USER vazios no container"

# 1. validação ------------------------------------------------------------------
log "validando $ARQUIVO ..."
INDICE="$(compose exec -T postgres pg_restore --list < "$ARQUIVO")" \
  || fail "o arquivo não é um dump válido do pg_dump -Fc"
N_TAB="$(grep -c ' TABLE DATA ' <<<"$INDICE" || true)"
DATA_DUMP="$(grep -m1 '^; Archive created at' <<<"$INDICE" | sed 's/^; Archive created at //' || true)"

cat <<EOF

  Arquivo ........ $ARQUIVO ($(du -h "$ARQUIVO" | cut -f1))
  Criado em ...... ${DATA_DUMP:-?}
  Tabelas ........ $N_TAB com dados
  Banco destino .. $BANCO  (usuário $USUARIO)

  TODO o conteúdo atual do banco "$BANCO" será APAGADO e substituído.

EOF

# 2. confirmação ----------------------------------------------------------------
if (( ! SIM )); then
  read -r -p "Para confirmar, digite o nome do banco ($BANCO): " RESPOSTA
  [[ "$RESPOSTA" == "$BANCO" ]] || fail "confirmação não confere; nada foi alterado"
fi

# 3. dump de segurança ---------------------------------------------------------
CARIMBO="$(date '+%Y-%m-%d_%H%M%S')"
DIR_SEG="$BACKUP_DIR/pre-restore"
if ! mkdir -p "$DIR_SEG" 2>/dev/null || [[ ! -w "$DIR_SEG" ]]; then
  DIR_SEG="$HOME/fuse-pre-restore"; mkdir -p "$DIR_SEG"
fi
SEGURANCA="$DIR_SEG/fuse_pre-restore_${CARIMBO}.dump"
log "dump de segurança do estado atual -> $SEGURANCA"
( umask 077
  compose exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$SEGURANCA"
) || fail "não consegui fazer o dump de segurança; nada foi alterado"

# 4-6. troca do banco -----------------------------------------------------------
trap 'log "FALHOU. api e worker estão parados. Para voltar ao estado anterior:"; log "  bash $0 $SEGURANCA"' ERR

log "parando api e worker ..."
compose stop api worker

log "recriando o banco $BANCO ..."
compose exec -T postgres sh -c '
  set -e
  dropdb  -U "$POSTGRES_USER" --if-exists --force "$POSTGRES_DB"
  createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$POSTGRES_DB"
'

log "restaurando (transação única) ..."
compose exec -T postgres sh -c \
  'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges --exit-on-error --single-transaction' \
  < "$ARQUIVO"

trap - ERR

# 7. volta ao ar ----------------------------------------------------------------
log "subindo a stack (migrate -> api/worker) ..."
compose run --rm migrate
compose up -d

TOTAL="$(compose exec -T postgres sh -c 'exec psql -X -At -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
SELECT count(*) FROM information_schema.tables
 WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE';
SQL
)"
log "restore concluído: $TOTAL tabelas no banco $BANCO."
log "dump de segurança mantido em $SEGURANCA (apague quando não precisar mais)."
cat <<'EOF'

Verifique agora:
  docker compose ps                       # api healthy, worker up
  docker compose logs --tail=50 migrate   # migrações aplicadas sem erro
  curl -fsS https://www.fuseaprova.com.br/api/saude
  Entre no /admin e confira usuários, pedidos e questões.
EOF
