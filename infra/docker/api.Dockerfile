# syntax=docker/dockerfile:1
# =============================================================================
# Fuse Aprova: imagem da API (Fastify) — também usada pelo serviço `migrate`
# (migrações e seed do Drizzle), pelo serviço `coletor` (packages/crawler) e
# pelos comandos de CLI (admin:criar).
#
# Contexto de build: raiz do repositório (deploy/docker-compose.yml e o
# workflow .github/workflows/deploy.yml, que publica no GHCR).
# Ignore específico deste Dockerfile: infra/docker/api.Dockerfile.dockerignore
#
# Estágios:
#   base    -> Node + corepack (pnpm na versão do campo packageManager)
#   prune   -> `turbo prune` com a api, o coletor e as dependências deles
#   build   -> pnpm install (lockfile congelado) + turbo build
#   runtime -> poppler-utils (pdftotext, usado pelo importador de PDF)
# =============================================================================

ARG NODE_IMAGE=node:24-bookworm-slim

# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    COREPACK_HOME=/opt/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    TZ=America/Sao_Paulo \
    CI=1
ENV PATH=${PNPM_HOME}:${PATH}
RUN corepack enable \
 && mkdir -p "${COREPACK_HOME}" "${PNPM_HOME}" \
 && chmod 0777 "${COREPACK_HOME}"
WORKDIR /app

# -----------------------------------------------------------------------------
FROM base AS prune
# Pastas dentro do monorepo. Os nomes dos pacotes são lidos do package.json.
# O coletor (packages/crawler) não é dependência da api, por isso entra no
# prune à parte: em produção ele roda com `docker compose run --rm coletor ...`.
ARG APP_DIR=apps/api
ARG EXTRA_DIR=packages/crawler
RUN --mount=type=cache,id=npm,target=/root/.npm npm install -g turbo@2
COPY . .
RUN APP_NAME="$(node -p "require('./${APP_DIR}/package.json').name")" \
 && EXTRA_NAME="$(node -p "require('./${EXTRA_DIR}/package.json').name")" \
 && turbo prune "${APP_NAME}" "${EXTRA_NAME}" --docker \
 && for f in .npmrc tsconfig.json tsconfig.base.json vitest.shared.ts; do \
      if [ -f "$f" ]; then cp "$f" out/json/ && cp "$f" out/full/; fi; \
    done

# -----------------------------------------------------------------------------
FROM base AS build
ARG APP_DIR=apps/api
ARG EXTRA_DIR=packages/crawler
# 1) só manifests + lockfile: a camada do install fica em cache enquanto
#    nenhuma dependência mudar.
COPY --from=prune /app/out/json/ ./
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
# 2) código-fonte e build com o turbo (a api, o coletor e o que eles usam).
COPY --from=prune /app/out/full/ ./
RUN APP_NAME="$(node -p "require('./${APP_DIR}/package.json').name")" \
 && EXTRA_NAME="$(node -p "require('./${EXTRA_DIR}/package.json').name")" \
 && pnpm turbo run build --filter="${APP_NAME}..." --filter="${EXTRA_NAME}..." \
 && test -f "${APP_DIR}/dist/index.js" \
 && test -f "${EXTRA_DIR}/dist/cli.js"

# -----------------------------------------------------------------------------
FROM base AS runtime
ARG APP_DIR=apps/api
LABEL com.fuseaprova.projeto="fuseaprova" \
      org.opencontainers.image.title="fuseaprova-api" \
      org.opencontainers.image.description="Fuse Aprova: API Fastify, migrações Drizzle e coletor"
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates poppler-utils tzdata \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    ARQUIVOS_DIR=/srv/fuse/arquivos \
    PDFTOTEXT_BIN=pdftotext \
    APP_ENTRY=${APP_DIR}/dist/index.js

# Workspace inteiro (podado) com node_modules completos: precisamos do pnpm,
# do drizzle (migrate/seed), do coletor e da CLI `pnpm --filter api cli ...`
# dentro do container. Se a imagem ficar grande demais, troque por
# `pnpm deploy --prod`.
COPY --from=build --chown=node:node /app /app
# Catálogo FAU usado pelo seed (provas_origem). `turbo prune` não copia pastas
# da raiz que não são pacotes.
COPY --chown=node:node dados /app/dados

# Aquece o cache do corepack para o pnpm funcionar sem rede em runtime.
RUN pnpm --version >/dev/null \
 && mkdir -p /srv/fuse/arquivos \
 && chown -R node:node /srv/fuse "${COREPACK_HOME}"

USER node
WORKDIR /app
EXPOSE 3000
# `exec` deixa o node como processo principal (sinais chegam direto;
# o compose usa `init: true` para ter um init reaper).
# D13: versão em produção (o workflow passa o SHA do commit); aparece em /super/sistema.
# Fica no fim para não invalidar o cache das camadas acima a cada commit.
ARG APP_VERSION=desenvolvimento
ENV APP_VERSION=${APP_VERSION}
CMD ["sh", "-c", "exec node \"$APP_ENTRY\""]
