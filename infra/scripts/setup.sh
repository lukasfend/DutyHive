#!/usr/bin/env bash
# DutyHive — one-command local-dev bootstrap.
#
# Phase 1 stub: starts Docker stack + installs deps. Phase 2 will add
# `pnpm db:migrate && pnpm db:seed && pnpm db:generate`.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "▶ Starting Docker dev stack..."
docker compose -f infra/docker/docker-compose.dev.yml up -d

echo "▶ Installing dependencies..."
pnpm install

echo "✓ Setup complete. Run: pnpm dev"
