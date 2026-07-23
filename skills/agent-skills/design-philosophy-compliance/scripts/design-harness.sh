#!/usr/bin/env bash
# リポジトリ内で design-harness CLI を実行する薄いラッパー。
# 外部リポジトリでは design-harness を PATH に置き、このスクリプトは使わない。
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
BIN="$ROOT/packages/cli/dist/bin.js"
if [ ! -f "$BIN" ]; then
  echo "design-harness is not built. run: pnpm install && pnpm build" >&2
  exit 4
fi
exec node "$BIN" "$@"
