# syntax=docker/dockerfile:1
# =============================================================================
# Fuse Aprova: imagem web = nginx (sem root) com o build estático da PWA
#
# O nginx serve a PWA (apps/web/dist) e encaminha /api/* para a api:3000.
# Configuração em infra/nginx/ (copiada para a imagem e validada com nginx -t).
# O TLS fica no nginx do HOST da VPS, que faz proxy para 127.0.0.1:3600.
#
# Contexto de build: raiz do repositório (no GitHub Actions e localmente).
# Ignore específico: infra/docker/web.Dockerfile.dockerignore
#
# Build args (opcionais, NÃO são segredos: vão para o bundle público):
#   VITE_SUPORTE_WHATSAPP, VITE_SUPORTE_EMAIL  contato de Configurações → Suporte
# =============================================================================

ARG NODE_IMAGE=node:24-bookworm-slim
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.28-alpine

# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    COREPACK_HOME=/opt/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    TZ=America/Sao_Paulo \
    CI=1
ENV PATH=${PNPM_HOME}:${PATH}
RUN corepack enable && mkdir -p "${COREPACK_HOME}" "${PNPM_HOME}"
WORKDIR /app

# -----------------------------------------------------------------------------
FROM base AS prune
ARG APP_DIR=apps/web
RUN --mount=type=cache,id=npm,target=/root/.npm npm install -g turbo@2
COPY . .
RUN APP_NAME="$(node -p "require('./${APP_DIR}/package.json').name")" \
 && turbo prune "${APP_NAME}" --docker \
 && for f in .npmrc tsconfig.json tsconfig.base.json vitest.shared.ts; do \
      if [ -f "$f" ]; then cp "$f" out/json/ && cp "$f" out/full/; fi; \
    done

# -----------------------------------------------------------------------------
FROM base AS build
ARG APP_DIR=apps/web
ARG VITE_SUPORTE_WHATSAPP=""
ARG VITE_SUPORTE_EMAIL=""
COPY --from=prune /app/out/json/ ./
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY --from=prune /app/out/full/ ./
# Os assets leves (WebP, ícones, fontes) já estão versionados em apps/web/src
# e apps/web/public. Os PNGs 4K são só matrizes e NÃO entram no contexto.
# A PWA não recebe segredo em build: a API é chamada em caminho relativo
# (/api) e a chave pública VAPID vem da API em runtime.
RUN APP_NAME="$(node -p "require('./${APP_DIR}/package.json').name")" \
 && VITE_SUPORTE_WHATSAPP="${VITE_SUPORTE_WHATSAPP}" VITE_SUPORTE_EMAIL="${VITE_SUPORTE_EMAIL}" \
    pnpm turbo run build --filter="${APP_NAME}..." \
 && test -f "${APP_DIR}/dist/index.html" \
 && test -f "${APP_DIR}/dist/sw.js" \
 && mkdir -p /out && cp -a "${APP_DIR}/dist/." /out/

# -----------------------------------------------------------------------------
FROM ${NGINX_IMAGE} AS runtime
LABEL com.fuseaprova.projeto="fuseaprova" \
      org.opencontainers.image.title="fuseaprova-web" \
      org.opencontainers.image.description="Fuse Aprova: PWA estática + proxy /api (nginx sem root)"
# A imagem roda como o usuário nginx (uid 101) e escuta na 8080. Só o apk
# precisa de root; voltamos para o uid 101 logo depois.
USER root
RUN apk add --no-cache tzdata \
 && rm -f /etc/nginx/conf.d/*.conf \
 && mkdir -p /etc/nginx/fuseaprova
ENV TZ=America/Sao_Paulo
COPY infra/nginx/fuseaprova.conf /etc/nginx/conf.d/default.conf
COPY infra/nginx/seguranca.conf /etc/nginx/fuseaprova/seguranca.conf
COPY --from=build --chown=101:101 /out /usr/share/nginx/html
USER 101
# Falha o build se a configuração tiver erro (o upstream `api` é resolvido
# só em runtime, então o teste não depende da API).
RUN nginx -t
EXPOSE 8080
