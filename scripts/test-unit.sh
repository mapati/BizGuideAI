#!/usr/bin/env bash
# Task #291 — Runner de testes unitários (suite executável em CI).
# Uso:
#   bash scripts/test-unit.sh           # roda toda a suite unitária
#   bash scripts/test-unit.sh --watch   # modo watch durante desenvolvimento
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--watch" ]]; then
  exec npx vitest
fi

exec npx vitest run
