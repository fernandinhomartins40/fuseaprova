#!/usr/bin/env bash
# =============================================================================
# Fuse Aprova: preparação do HOST da VPS (Ubuntu), como root
#
# Uso (o workflow .github/workflows/setup-host.yml envia e roda):
#   bash /root/fuseaprova/deploy/setup-host.sh --email voce@exemplo.com.br
#
# O que faz (pode rodar de novo quantas vezes quiser):
#   1. instala o que faltar: docker + compose, rsync, curl, nginx, certbot
#      (plugin nginx), poppler-utils, openssl;
#   2. cria /root/fuseaprova/{deploy,backups,arquivos,estado};
#   3. instala o site do nginx do host para www.fuseaprova.com.br (proxy para
#      127.0.0.1:3600) e o 301 do apex fuseaprova.com.br -> www, este só se o
#      apex resolver para esta VPS;
#   4. roda `nginx -t` antes de QUALQUER reload; se falhar, volta o arquivo
#      anterior e não recarrega;
#   5. emite/renova o certificado com `certbot --nginx` só para os nomes que
#      resolvem para esta VPS.
#
# NÃO faz: não mexe em sites de outros domínios, nem no sshd (a configuração
# de acesso SSH da VPS fica como está), nem no firewall, nem em containers.
# =============================================================================
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
VPS_IP="${VPS_IP:-72.60.10.112}"
DOMINIO_WWW="www.fuseaprova.com.br"
DOMINIO_APEX="fuseaprova.com.br"
RAIZ=/root/fuseaprova
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELO_SITE="$DIR/nginx-host/fuseaprova.com.br"
SITE_DISPONIVEL=/etc/nginx/sites-available/fuseaprova.com.br
SITE_ATIVO=/etc/nginx/sites-enabled/fuseaprova.com.br
MARCA_SITE=/etc/nginx/.fuseaprova-site.sha256
PORTA_APP=3600

log()   { printf '[setup-host %s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
aviso() { printf '[setup-host %s] AVISO: %s\n' "$(date '+%H:%M:%S')" "$*" >&2; }
fail()  { printf '[setup-host %s] ERRO: %s\n' "$(date '+%H:%M:%S')" "$*" >&2; exit 1; }

EMAIL=""
while (($#)); do
  case "$1" in
    --email) EMAIL="${2:-}"; shift 2 ;;
    --email=*) EMAIL="${1#*=}"; shift ;;
    *) fail "opção desconhecida: $1 (use --email voce@exemplo.com.br)" ;;
  esac
done
[[ "$EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || fail "informe um e-mail válido em --email (avisos do Let's Encrypt)"
[[ "$(id -u)" == 0 ]] || fail "rode como root"
[[ -f "$MODELO_SITE" ]] || fail "não achei $MODELO_SITE"
. /etc/os-release
[[ "${ID:-}" == ubuntu ]] || aviso "este script foi feito para Ubuntu (achei ${ID:-?})"

# ---------------------------------------------------------------------------
# 1. Pacotes
# ---------------------------------------------------------------------------
faltando=()
precisa() { dpkg -s "$1" >/dev/null 2>&1 || faltando+=("$1"); }
for p in rsync curl ca-certificates openssl nginx certbot python3-certbot-nginx poppler-utils util-linux iproute2; do
  precisa "$p"
done
if ((${#faltando[@]})); then
  log "instalando: ${faltando[*]}"
  apt-get update -q
  apt-get install -y -q --no-install-recommends "${faltando[@]}"
else
  log "pacotes do sistema ok"
fi

if ! command -v docker >/dev/null 2>&1; then
  log "instalando o Docker (repositório oficial) ..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi
docker compose version >/dev/null 2>&1 || {
  log "instalando o plugin docker compose ..."
  apt-get install -y -q docker-compose-plugin || fail "não consegui instalar o docker compose v2"
}
log "docker: $(docker --version) | $(docker compose version --short 2>/dev/null || echo '?')"

# ---------------------------------------------------------------------------
# 2. Diretórios
# ---------------------------------------------------------------------------
mkdir -p "$RAIZ/deploy" "$RAIZ/estado" "$RAIZ/backups/diario" "$RAIZ/backups/semanal" \
         "$RAIZ/arquivos/provas" "$RAIZ/arquivos/uploads"
chmod 700 "$RAIZ" "$RAIZ/estado"
chown -R 1000:1000 "$RAIZ/backups" "$RAIZ/arquivos"
chmod 700 "$RAIZ/backups"
chmod 750 "$RAIZ/arquivos"
log "diretórios em $RAIZ ok"

# ---------------------------------------------------------------------------
# 3. Quais nomes resolvem para esta VPS?
# ---------------------------------------------------------------------------
resolve_para_vps() {
  getent ahostsv4 "$1" 2>/dev/null | awk '{print $1}' | sort -u | grep -qx "$VPS_IP"
}
WWW_OK=0; APEX_OK=0
if resolve_para_vps "$DOMINIO_WWW"; then WWW_OK=1; else aviso "$DOMINIO_WWW NÃO resolve para $VPS_IP (DNS)."; fi
if resolve_para_vps "$DOMINIO_APEX"; then APEX_OK=1; else log "$DOMINIO_APEX não resolve para $VPS_IP: o 301 do apex fica de fora por enquanto."; fi

# Algum OUTRO site ativo já responde por estes nomes? Isso quebraria um dos dois.
for nome in "$DOMINIO_WWW" "$DOMINIO_APEX"; do
  outros="$(grep -rlE "server_name[^;]*[[:space:]]${nome//./\\.}([[:space:];]|$)" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null \
            | grep -vx "$SITE_ATIVO" | grep -v "fuseaprova.com.br$" || true)"
  [[ -z "$outros" ]] || fail "$nome já aparece em outro site do nginx: $outros. Resolva à mão antes (este script não mexe em sites de outros domínios)."
done

# A porta do app no loopback deve estar livre ou ser do container fuseaprova.
if ss -ltnH "sport = :$PORTA_APP" 2>/dev/null | grep -q .; then
  dono="$(docker ps --filter "publish=$PORTA_APP" --format '{{.Label "com.docker.compose.project"}}' | head -n 1)"
  [[ "$dono" == fuseaprova ]] || aviso "a porta $PORTA_APP já está em uso por ${dono:-um processo fora do Docker}. O deploy vai falhar até ela ficar livre."
fi

# ---------------------------------------------------------------------------
# 4. Site do nginx do host
# ---------------------------------------------------------------------------
gerado="$(mktemp)"
trap 'rm -f -- "$gerado"' EXIT
if (( APEX_OK )); then
  sed -e '/^# >>> APEX$/d' -e '/^# <<< APEX$/d' "$MODELO_SITE" > "$gerado"
else
  sed -e '/^# >>> APEX$/,/^# <<< APEX$/d' "$MODELO_SITE" > "$gerado"
fi
# Sem IPv6 no kernel, `listen [::]:80` derrubaria o nginx inteiro.
if [[ ! -e /proc/net/if_inet6 ]]; then
  sed -i '/listen \[::\]:/d' "$gerado"
fi
sha_novo="$(sha256sum "$gerado" | awk '{print $1}')"
sha_antigo="$(cat "$MARCA_SITE" 2>/dev/null || true)"

testar_e_recarregar() {
  if nginx -t 2>&1; then
    systemctl reload nginx
    return 0
  fi
  return 1
}

if [[ -f "$SITE_DISPONIVEL" && "$sha_novo" == "$sha_antigo" ]]; then
  # O arquivo instalado já tem os blocos 443 do certbot: não sobrescreve.
  log "site do nginx sem mudança no modelo; mantendo o arquivo atual (com o TLS do certbot)"
else
  backup_site=""
  if [[ -f "$SITE_DISPONIVEL" ]]; then
    backup_site="$SITE_DISPONIVEL.anterior-$(date '+%Y%m%d%H%M%S')"
    cp -p "$SITE_DISPONIVEL" "$backup_site"
  fi
  install -m 644 "$gerado" "$SITE_DISPONIVEL"
  ln -sfn "$SITE_DISPONIVEL" "$SITE_ATIVO"
  if testar_e_recarregar; then
    printf '%s\n' "$sha_novo" > "$MARCA_SITE"
    log "site instalado: $SITE_DISPONIVEL (nginx recarregado)"
  else
    aviso "nginx -t falhou com o site novo; voltando ao estado anterior"
    if [[ -n "$backup_site" ]]; then
      cp -p "$backup_site" "$SITE_DISPONIVEL"
    else
      rm -f -- "$SITE_ATIVO" "$SITE_DISPONIVEL"
    fi
    nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
    fail "configuração do nginx inválida; nada foi recarregado com ela"
  fi
fi
systemctl enable --now nginx >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
# 5. Certificado (Let's Encrypt via certbot --nginx)
# ---------------------------------------------------------------------------
if (( ! WWW_OK )); then
  aviso "sem DNS do $DOMINIO_WWW apontando para $VPS_IP: certificado NÃO emitido. Ajuste o DNS e rode este workflow de novo."
  exit 0
fi
nomes=(-d "$DOMINIO_WWW")
lista="$DOMINIO_WWW"
if (( APEX_OK )); then
  nomes+=(-d "$DOMINIO_APEX")
  lista="$lista $DOMINIO_APEX"
fi

log "certbot --nginx para: $lista"
# --keep-until-expiring: não reemite à toa (limite do Let's Encrypt);
# --expand: inclui o apex quando ele passar a resolver;
# --redirect: HTTP -> HTTPS nos blocos deste site.
certbot --nginx --non-interactive --agree-tos -m "$EMAIL" \
  --cert-name fuseaprova.com.br --keep-until-expiring --expand --redirect \
  "${nomes[@]}" \
  || fail "o certbot falhou (DNS, porta 80 fechada no firewall do provedor, ou limite do Let's Encrypt). Veja /var/log/letsencrypt/letsencrypt.log"

# O certbot já testou e recarregou; conferimos de novo por garantia.
nginx -t >/dev/null 2>&1 || fail "nginx -t falhou depois do certbot. Veja 'nginx -t'."
systemctl reload nginx
# A partir daqui o arquivo instalado tem o TLS: a marca guarda o modelo,
# então o próximo setup não o sobrescreve sem necessidade.
printf '%s\n' "$sha_novo" > "$MARCA_SITE"

if systemctl list-timers 2>/dev/null | grep -q certbot; then
  log "renovação automática: timer do certbot ativo"
else
  aviso "não achei o timer do certbot; confira com: systemctl list-timers | grep certbot"
fi

log "pronto. Teste: curl -I https://$DOMINIO_WWW"
