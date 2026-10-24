#!/usr/bin/env bash
# =============================================================================
# Fuse Aprova: TESTE de restore (não mexe no banco de produção)
#
# Restaura um backup num banco temporário dentro do mesmo container postgres,
# conta as tabelas e as linhas de cada uma, compara com a produção e apaga o
# banco temporário no final (mesmo se der erro).
#
# Uso (no host da VPS, com a stack no ar):
#   bash /root/fuseaprova/deploy/backup/teste-restore.sh                 # o diário mais recente
#   bash /root/fuseaprova/deploy/backup/teste-restore.sh <arquivo.dump>  # um arquivo específico
#
# Resultado: "TESTE DE RESTORE OK" e código 0 quando o restore funciona e o
# número de tabelas bate com a produção. Código 1 se falhar. Uma linha de
# resultado é anexada a $BACKUP_DIR/teste-restore.log (se houver permissão).
# Recomendado: rodar 1 vez por mês e depois de toda mudança de schema.
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$SCRIPT_DIR/../docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-$( [[ -f /.dockerenv ]] && echo /srv/fuse/backups || echo /root/fuseaprova/backups )}"
export TZ="${TZ:-America/Sao_Paulo}"

log()  { printf '[teste-restore %s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
fail() { log "ERRO: $*" >&2; registrar "FALHOU: $*"; exit 1; }
compose() { docker compose -f "$COMPOSE_FILE" "$@"; }
registrar() {
  { printf '%s %s %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "${ARQUIVO:-?}" "$1" >> "$BACKUP_DIR/teste-restore.log"; } 2>/dev/null || true
}
# psql_em <banco>  (SQL pela entrada padrão; saída "a|b" sem cabeçalho)
psql_em() {
  compose exec -T postgres sh -c 'exec psql -X -q -At -F "|" -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1"' sh "$1"
}

ARQUIVO="${1:-}"
if [[ -z "$ARQUIVO" ]]; then
  ARQUIVO="$(find "$BACKUP_DIR/diario" -maxdepth 1 -type f -name 'fuse_*.dump' 2>/dev/null | sort | tail -n 1)"
  [[ -n "$ARQUIVO" ]] || fail "nenhum backup em $BACKUP_DIR/diario (rode backup.sh antes)"
fi
[[ -f "$ARQUIVO" && -r "$ARQUIVO" ]] || fail "arquivo não encontrado ou sem leitura: $ARQUIVO"

compose ps --status running --services 2>/dev/null | grep -qx postgres \
  || fail "o serviço postgres não está rodando"

PROD="$(compose exec -T postgres sh -c 'printf %s "$POSTGRES_DB"')"
TESTE="fuse_teste_restore_$(date '+%Y%m%d%H%M%S')"

limpar() {
  compose exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" --if-exists --force "$1"' sh "$TESTE" >/dev/null 2>&1 || true
}
trap limpar EXIT

SQL_TABELAS="SELECT count(*) FROM information_schema.tables
 WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_type='BASE TABLE';"
SQL_LINHAS="SELECT table_schema || '.' || table_name,
       (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text
  FROM information_schema.tables
 WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_type='BASE TABLE'
 ORDER BY 1;"

log "arquivo: $ARQUIVO ($(du -h "$ARQUIVO" | cut -f1))"
log "criando banco temporário $TESTE ..."
compose exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$1"' sh "$TESTE" \
  || fail "não consegui criar o banco temporário"

log "restaurando ..."
inicio=$SECONDS
compose exec -T postgres sh -c \
  'exec pg_restore -U "$POSTGRES_USER" -d "$1" --no-owner --no-privileges --exit-on-error --single-transaction' sh "$TESTE" \
  < "$ARQUIVO" || fail "pg_restore falhou"
log "restore em $(( SECONDS - inicio ))s"

N_TESTE="$(psql_em "$TESTE" <<<"$SQL_TABELAS")"
N_PROD="$(psql_em "$PROD" <<<"$SQL_TABELAS")"

echo
printf '%-48s %12s %12s\n' "TABELA" "BACKUP" "PRODUÇÃO"
printf '%-48s %12s %12s\n' "------" "------" "--------"
LC_ALL=C join -t '|' -a 1 -a 2 -e '-' -o 0,1.2,2.2 \
  <(psql_em "$TESTE" <<<"$SQL_LINHAS" | LC_ALL=C sort -t '|' -k1,1) \
  <(psql_em "$PROD"  <<<"$SQL_LINHAS" | LC_ALL=C sort -t '|' -k1,1) \
  | awk -F '|' '{ printf "%-48s %12s %12s\n", $1, $2, $3 }'
echo
log "tabelas no backup: $N_TESTE | na produção: $N_PROD"
log "(as contagens de linhas podem diferir: a produção mudou depois do backup)"

(( N_TESTE > 0 )) || fail "o backup restaurou 0 tabelas"
if (( N_TESTE != N_PROD )); then
  fail "número de tabelas diferente ($N_TESTE x $N_PROD). Normal só se houve migração depois do backup; confira."
fi

registrar "OK tabelas=$N_TESTE"
log "TESTE DE RESTORE OK ($N_TESTE tabelas). Banco temporário será removido."
