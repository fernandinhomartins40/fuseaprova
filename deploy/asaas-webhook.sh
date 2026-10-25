#!/usr/bin/env bash
# Cadastra ou atualiza o webhook do Fuse Aprova no Asaas (DECISOES D14, docs/DEPLOY.md).
#
# Rodar NA VPS, como root:
#   bash /root/fuseaprova/deploy/asaas-webhook.sh
#
# - Lê ASAAS_API_KEY, ASAAS_BASE_URL, ASAAS_WEBHOOK_TOKEN e APP_URL do .env do deploy
#   (ENV_FILE muda o caminho).
# - A conta Asaas é compartilhada (MercadoFlow, fusai): só toca no webhook cuja URL é
#   ${APP_URL}/api/webhooks/asaas. Os webhooks de outras URLs nunca são alterados.
# - Idempotente: cria se não existir, senão atualiza (PUT) com os mesmos valores.
# - Não imprime a chave da API nem o token do webhook. A chave vai para o curl por um
#   arquivo temporário (não aparece no `ps`), apagado na saída.
#
# Endpoints conferidos em https://docs.asaas.com (24/10/2026): GET/POST /v3/webhooks e
# PUT /v3/webhooks/{id}. O PUT não aceita `email` nem `apiVersion` (só na criação).
set -euo pipefail

ENV_FILE="${ENV_FILE:-/root/fuseaprova/deploy/.env}"
NOME_WEBHOOK='Fuse Aprova - cobranças Pix'
EMAIL_WEBHOOK='fuseagencia1515@gmail.com'
# Os eventos de cobrança que a API trata. Mantenha igual a EVENTOS_ASAAS_WEBHOOK em
# packages/shared/src/api/pagamento.ts (apps/api/test/pagamento.test.ts confere).
EVENTOS=(PAYMENT_RECEIVED PAYMENT_CONFIRMED PAYMENT_REFUNDED PAYMENT_CHARGEBACK_REQUESTED PAYMENT_OVERDUE PAYMENT_DELETED)

erro() {
  printf 'ERRO: %s\n' "$*" >&2
  exit 1
}

for cmd in curl python3 grep; do
  command -v "$cmd" >/dev/null 2>&1 || erro "comando '$cmd' não encontrado."
done
[[ -r "$ENV_FILE" ]] || erro "não consegui ler $ENV_FILE."

# Valor de NOME no .env (última ocorrência), sem as aspas simples ou duplas das pontas.
ler_env() {
  local nome=$1 linha valor
  linha=$(grep -E "^[[:space:]]*(export[[:space:]]+)?${nome}=" "$ENV_FILE" | tail -n 1 || true)
  [[ -n "$linha" ]] || return 0
  valor=${linha#*=}
  valor=${valor%$'\r'}
  valor="${valor#"${valor%%[![:space:]]*}"}"
  valor="${valor%"${valor##*[![:space:]]}"}"
  if [[ ${#valor} -ge 2 && ( ( $valor == \'*\' ) || ( $valor == \"*\" ) ) ]]; then
    valor=${valor:1:${#valor}-2}
  fi
  printf '%s' "$valor"
}

ASAAS_API_KEY=$(ler_env ASAAS_API_KEY)
ASAAS_BASE_URL=$(ler_env ASAAS_BASE_URL)
ASAAS_WEBHOOK_TOKEN=$(ler_env ASAAS_WEBHOOK_TOKEN)
APP_URL=$(ler_env APP_URL)

[[ -n "$ASAAS_API_KEY" ]] || erro "ASAAS_API_KEY vazia em $ENV_FILE (entre aspas simples, porque começa com \$)."
[[ "$ASAAS_API_KEY" == \$* ]] || erro "ASAAS_API_KEY não começa com \$: confira as aspas simples em $ENV_FILE."
[[ -n "$ASAAS_BASE_URL" ]] || erro "ASAAS_BASE_URL vazia em $ENV_FILE."
[[ "$ASAAS_BASE_URL" == https://* ]] || erro "ASAAS_BASE_URL precisa ser https."
[[ -n "$APP_URL" ]] || erro "APP_URL vazia em $ENV_FILE."
[[ "$APP_URL" == https://* ]] || erro "APP_URL precisa ser https (o Asaas só entrega em HTTPS público)."
[[ -n "$ASAAS_WEBHOOK_TOKEN" ]] || erro "ASAAS_WEBHOOK_TOKEN vazio em $ENV_FILE."
if [[ ${#ASAAS_WEBHOOK_TOKEN} -lt 32 || ${#ASAAS_WEBHOOK_TOKEN} -gt 255 || "$ASAAS_WEBHOOK_TOKEN" =~ [[:space:]] ]]; then
  erro "ASAAS_WEBHOOK_TOKEN precisa ter de 32 a 255 caracteres, sem espaços (gere com: openssl rand -hex 32)."
fi
[[ "$ASAAS_WEBHOOK_TOKEN" != "$ASAAS_API_KEY" ]] || erro "ASAAS_WEBHOOK_TOKEN não pode ser a chave da API."

BASE=${ASAAS_BASE_URL%/}
URL_WEBHOOK="${APP_URL%/}/api/webhooks/asaas"
case "$BASE" in
  https://api.asaas.com/*) AMBIENTE='PRODUÇÃO' ;;
  https://api-sandbox.asaas.com/*) AMBIENTE='sandbox' ;;
  *) AMBIENTE="outro ($BASE)" ;;
esac

umask 077
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
printf 'access_token: %s\n' "$ASAAS_API_KEY" >"$TMP/cabecalho"

# api MÉTODO CAMINHO [ARQUIVO_CORPO] -> grava a resposta em $TMP/resp e imprime o status HTTP.
api() {
  local metodo=$1 caminho=$2 corpo=${3:-}
  local args=(-sS -o "$TMP/resp" -w '%{http_code}' --max-time 30 -X "$metodo"
    -H @"$TMP/cabecalho"
    -H 'Accept: application/json'
    -H 'User-Agent: FuseAprova/1.0 (asaas-webhook.sh)')
  if [[ -n "$corpo" ]]; then
    args+=(-H 'Content-Type: application/json' --data-binary @"$corpo")
  fi
  curl "${args[@]}" "$BASE$caminho" || true
}

# Falha com o status e as descrições de erro do Asaas (nunca com o corpo inteiro).
conferir() {
  local status=$1 contexto=$2 descricao
  if [[ "$status" =~ ^2 ]]; then return 0; fi
  descricao=$(python3 - "$TMP/resp" <<'PY' 2>/dev/null || true
import json, sys
try:
    with open(sys.argv[1], encoding="utf-8") as f:
        j = json.load(f)
    print("; ".join(str(e.get("description", "")) for e in j.get("errors", [])))
except Exception:
    pass
PY
)
  erro "$contexto: o Asaas respondeu HTTP $status. ${descricao}"
}

echo "Asaas: ambiente $AMBIENTE"
echo "Webhook do Fuse Aprova: $URL_WEBHOOK"

# 1. Procura o webhook com a nossa URL (a conta tem no máximo 10; pagina por garantia).
: >"$TMP/ids"
offset=0
while :; do
  status=$(api GET "/webhooks?limit=100&offset=$offset")
  conferir "$status" "GET /webhooks"
  mais=$(python3 - "$TMP/resp" "$URL_WEBHOOK" "$TMP/ids" <<'PY'
import json, sys
resp, alvo, ids = sys.argv[1], sys.argv[2].rstrip("/"), sys.argv[3]
with open(resp, encoding="utf-8") as f:
    j = json.load(f)
dados = j.get("data") or []
with open(ids, "a", encoding="utf-8") as saida:
    for w in dados:
        if str(w.get("url") or "").rstrip("/") == alvo:
            saida.write(f"{w['id']}\t{w.get('email') or ''}\n")
outros = sum(1 for w in dados if str(w.get("url") or "").rstrip("/") != alvo)
print(f"{'1' if j.get('hasMore') else '0'} {len(dados)} {outros}")
PY
)
  read -r tem_mais quantos outros <<<"$mais"
  echo "  página offset=$offset: $quantos webhook(s), $outros de outras URLs (não serão alterados)"
  [[ "$tem_mais" == 1 && "$quantos" -gt 0 ]] || break
  offset=$((offset + quantos))
done

total=$(grep -c . "$TMP/ids" || true)
if [[ "$total" -gt 1 ]]; then
  erro "há $total webhooks com a URL $URL_WEBHOOK ($(cut -f1 "$TMP/ids" | paste -sd, -)). Apague os repetidos no painel do Asaas e rode de novo."
fi

# 2. Monta o corpo (o token vai pelo ambiente do python, não pela linha de comando).
modo=criar
[[ "$total" -eq 1 ]] && modo=atualizar
WH_TOKEN="$ASAAS_WEBHOOK_TOKEN" python3 - "$TMP/corpo" "$modo" "$NOME_WEBHOOK" "$URL_WEBHOOK" "$EMAIL_WEBHOOK" "${EVENTOS[@]}" <<'PY'
import json, os, sys
saida, modo, nome, url, email, *eventos = sys.argv[1:]
corpo = {
    "name": nome,
    "url": url,
    "enabled": True,
    "interrupted": False,
    "authToken": os.environ["WH_TOKEN"],
    "sendType": "SEQUENTIALLY",
    "events": eventos,
}
if modo == "criar":
    # O PUT não aceita email nem apiVersion (docs.asaas.com, 24/10/2026).
    corpo["email"] = email
    corpo["apiVersion"] = 3
with open(saida, "w", encoding="utf-8") as f:
    json.dump(corpo, f, ensure_ascii=False)
PY

if [[ "$modo" == criar ]]; then
  echo "Nenhum webhook com essa URL: criando."
  status=$(api POST /webhooks "$TMP/corpo")
  conferir "$status" "POST /webhooks"
else
  IFS=$'\t' read -r id email_atual <"$TMP/ids"
  email_atual=${email_atual%$'\r'}
  echo "Webhook existente ($id): atualizando."
  status=$(api PUT "/webhooks/$id" "$TMP/corpo")
  conferir "$status" "PUT /webhooks/$id"
  if [[ "$email_atual" != "$EMAIL_WEBHOOK" ]]; then
    echo "AVISO: o e-mail do webhook é '$email_atual'. A API não altera o e-mail; troque para $EMAIL_WEBHOOK no painel do Asaas se quiser."
  fi
fi

# 3. Resultado, só com campos sem segredo (a resposta da criação traz o authToken).
python3 - "$TMP/resp" "${EVENTOS[@]}" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    w = json.load(f)
esperados = sys.argv[2:]
print("Resultado:")
for campo in ("id", "name", "url", "email", "enabled", "interrupted", "apiVersion", "hasAuthToken", "sendType", "penalizedRequestsCount"):
    if campo in w:
        print(f"  {campo}: {w[campo]}")
eventos = w.get("events") or []
print(f"  events: {', '.join(eventos)}")
problemas = []
if sorted(eventos) != sorted(esperados):
    problemas.append("a lista de eventos não bate com a esperada")
if w.get("enabled") is False:
    problemas.append("o webhook está desativado")
if w.get("interrupted") is True:
    problemas.append("a fila está interrompida")
if w.get("hasAuthToken") is False:
    problemas.append("o webhook está sem token de autenticação")
if problemas:
    print("ATENÇÃO: " + "; ".join(problemas) + ".")
    sys.exit(1)
print("OK: webhook do Fuse Aprova configurado.")
PY
