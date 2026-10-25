# syntax=docker/dockerfile:1
# =============================================================================
# Fuse Aprova: imagem do worker (node-cron)
#
# Além do Node, traz:
#   - postgresql-client-16 (pg_dump/pg_restore na MESMA versão major do
#     servidor; o Debian bookworm só tem a 15, que se recusa a fazer dump de
#     um servidor 16, por isso o repositório oficial PGDG);
#   - poppler-utils (pdftotext), caso jobs do coletor rodem no worker;
#   - infra/backup/*.sh em /app/infra/backup (o job das 03:30 executa
#     /app/infra/backup/backup.sh, caminho exposto em BACKUP_SCRIPT).
#
# Contexto de build: raiz do repositório (deploy/docker-compose.yml e o
# workflow .github/workflows/deploy.yml, que publica no GHCR).
# Ignore específico: infra/docker/worker.Dockerfile.dockerignore
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
ARG APP_DIR=apps/worker
RUN --mount=type=cache,id=npm,target=/root/.npm npm install -g turbo@2
COPY . .
RUN APP_NAME="$(node -p "require('./${APP_DIR}/package.json').name")" \
 && turbo prune "${APP_NAME}" --docker \
 && for f in .npmrc tsconfig.json tsconfig.base.json vitest.shared.ts; do \
      if [ -f "$f" ]; then cp "$f" out/json/ && cp "$f" out/full/; fi; \
    done

# -----------------------------------------------------------------------------
FROM base AS build
ARG APP_DIR=apps/worker
COPY --from=prune /app/out/json/ ./
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY --from=prune /app/out/full/ ./
RUN APP_NAME="$(node -p "require('./${APP_DIR}/package.json').name")" \
 && pnpm turbo run build --filter="${APP_NAME}..." \
 && test -f "${APP_DIR}/dist/index.js"

# -----------------------------------------------------------------------------
FROM base AS runtime
ARG APP_DIR=apps/worker
ARG PG_MAJOR=16
LABEL com.fuseaprova.projeto="fuseaprova" \
      org.opencontainers.image.title="fuseaprova-worker" \
      org.opencontainers.image.description="Fuse Aprova: jobs agendados (node-cron) e backup pg_dump 16"
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg tzdata \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
      https://www.postgresql.org/media/keys/ACCC4CF8.asc \
 && . /etc/os-release \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends "postgresql-client-${PG_MAJOR}" poppler-utils util-linux \
 && apt-get purge -y --auto-remove gnupg \
 && rm -rf /var/lib/apt/lists/* \
 && pg_dump --version

ENV NODE_ENV=production \
    ARQUIVOS_DIR=/srv/fuse/arquivos \
    BACKUP_DIR=/srv/fuse/backups \
    BACKUP_SCRIPT=/app/infra/backup/backup.sh \
    APP_ENTRY=${APP_DIR}/dist/index.js

COPY --from=build --chown=node:node /app /app
COPY --chown=node:node dados /app/dados
COPY --chown=node:node infra/backup /app/infra/backup
RUN chmod 0755 /app/infra/backup/*.sh \
 && sed -i 's/\r$//' /app/infra/backup/*.sh \
 && pnpm --version >/dev/null \
 && mkdir -p /srv/fuse/arquivos /srv/fuse/backups \
 && chown -R node:node /srv/fuse "${COREPACK_HOME}"

USER node
WORKDIR /app
# D13: versão em produção (o workflow passa o SHA do commit); aparece em /super/sistema.
# Fica no fim para não invalidar o cache das camadas acima a cada commit.
ARG APP_VERSION=desenvolvimento
ENV APP_VERSION=${APP_VERSION}
CMD ["sh", "-c", "exec node \"$APP_ENTRY\""]
