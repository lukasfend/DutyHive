# syntax=docker/dockerfile:1.7
#
# DutyHive web app — production image.
#
# Multi-stage build for Next.js 16 standalone output. Coolify points at this
# Dockerfile via the "Dockerfile" build pack. See docs/guides/coolify-build.md
# for Coolify-side settings (build context, healthcheck path, ENV mounting).
#
# Inputs (build-time ARGs / build-time env from Coolify):
#   GIT_SHA                 — short git SHA, written into the runtime build badge
#   SENTRY_AUTH_TOKEN       — optional; when set, Sentry uploads source maps
#   SENTRY_ORG              — optional Sentry org slug
#   SENTRY_PROJECT          — optional Sentry project slug
#   NEXT_PUBLIC_SENTRY_DSN  — must be present at build time (baked into client bundle)
#   NEXT_PUBLIC_APP_VERSION — defaults to package.json version
#
# Runtime env is supplied by Coolify (see docs/guides/coolify-secrets.md).

ARG NODE_VERSION=22.11.0
ARG PNPM_VERSION=10.14.0

# ---- deps -------------------------------------------------------------------
# Installs the full pnpm workspace (incl. dev deps so the next stage can build).
FROM node:${NODE_VERSION}-alpine AS deps
ARG PNPM_VERSION
RUN apk add --no-cache libc6-compat \
 && corepack enable \
 && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

# Copy package manifests first so Docker can cache `pnpm install` when only
# source files change. We copy the whole packages/ tree because there are 11
# workspace packages and globbing per-package manifests in vanilla Dockerfile
# COPY is brittle — the cost is a few small TS files in this layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages ./packages

RUN pnpm install --frozen-lockfile

# ---- build ------------------------------------------------------------------
# Generates Prisma client and builds the Next.js standalone output.
FROM node:${NODE_VERSION}-alpine AS build
ARG PNPM_VERSION
RUN apk add --no-cache libc6-compat \
 && corepack enable \
 && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /repo

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Pull in deps + node_modules from the deps stage, then layer in the rest of
# the source tree. Anything outside .dockerignore comes through.
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY . .

# Build-time secrets/IDs that need to be baked into the client bundle.
# These are pulled from Coolify's build-arg / build-env channel.
ARG GIT_SHA=""
ARG SENTRY_AUTH_TOKEN=""
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
ARG NEXT_PUBLIC_SENTRY_DSN=""
ENV GIT_SHA=${GIT_SHA}
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV SENTRY_ORG=${SENTRY_ORG}
ENV SENTRY_PROJECT=${SENTRY_PROJECT}
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}

# Generate Prisma client into node_modules, then build the web app.
# `pnpm --filter @dutyhive/db exec` runs the bundled prisma binary directly
# rather than the workspace's db:generate script (which is a Phase-2 stub).
RUN pnpm --filter @dutyhive/db exec prisma generate \
 && pnpm --filter @dutyhive/web build

# ---- runtime ----------------------------------------------------------------
# Minimal image: only the standalone bundle, static assets, and public/.
FROM node:${NODE_VERSION}-alpine AS runtime
RUN apk add --no-cache wget tini \
 && addgroup -S app \
 && adduser -S app -G app
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone output already includes a pruned node_modules, the server
# entry point, and any files declared via outputFileTracingIncludes (the legal
# Markdown docs in our case). Static assets and public/ must be copied
# alongside per Next.js standalone deployment guidance.
COPY --from=build --chown=app:app /repo/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /repo/apps/web/public ./apps/web/public

USER app
EXPOSE 3000

# tini handles PID 1 / signal forwarding so the container shuts down cleanly
# when Coolify sends SIGTERM during a redeploy.
ENTRYPOINT ["/sbin/tini", "--"]

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
