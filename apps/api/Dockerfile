# syntax=docker/dockerfile:1
# API image for Cloud Run (Phase 2 §6.1, #16). Built from the repo root:
#   docker build -f apps/api/Dockerfile .
# Two stages: the first installs everything and compiles shared and the API;
# the second only gets the compiled code and the production dependencies.

# Node 24 like .nvmrc (D114). 24.22.1 is a security release (2026-10-20), so
# it skips the 14-day cooldown (D131). The digest pins the exact image;
# Dependabot updates it.
ARG NODE_IMAGE=node:24.22.1-trixie-slim@sha256:43b9ba1142b8dcf33fa8f922ca1be85714adc444e0586c7cf7726daaeabc1bea

FROM ${NODE_IMAGE} AS build
ENV CI=true HUSKY=0 TURBO_TELEMETRY_DISABLED=1
# Corepack installs the pnpm version pinned in packageManager.
RUN corepack enable
WORKDIR /repo
COPY . .
# Only the API and what it depends on (shared): no web, no root tooling.
RUN pnpm install --frozen-lockfile --filter "@focaldrop/api..."
RUN pnpm --filter "@focaldrop/api..." run build
# A self-contained copy of the API with production dependencies only. Legacy
# mode copies shared as a regular package (its "files": dist), without
# turning on injected workspace packages for the whole repo.
RUN pnpm --filter @focaldrop/api deploy --prod --legacy /prod/api

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Owned by root and run as `node`: the process cannot modify its own code.
COPY --from=build /prod/api ./
USER node
# Cloud Run sets PORT; the config reads it (default 3001).
CMD ["node", "dist/main.js"]
