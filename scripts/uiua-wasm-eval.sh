#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRELUDE="$ROOT/uiua-modules/prelude.ua"

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <module.ua> <uiua expression>" >&2
  echo "Example: $0 uiua-modules/cobweb.ua 'CobwebPath 51 3.7 0.2'" >&2
  exit 1
fi

MODULE_PATH="$1"
shift
EXPR="$*"

if [[ "$MODULE_PATH" != /* ]]; then
  MODULE_PATH="$ROOT/$MODULE_PATH"
fi

if [[ ! -f "$MODULE_PATH" ]]; then
  echo "Module not found: $MODULE_PATH" >&2
  exit 1
fi

if [[ ! -f "$PRELUDE" ]]; then
  echo "Prelude not found: $PRELUDE" >&2
  exit 1
fi

cd "$ROOT"

{
  cat "$PRELUDE"
  echo
  # Match wasm runtime behavior: strip imports and inline shared prelude once.
  sed '/^[[:space:]]*~/d' "$MODULE_PATH"
  echo
  echo "$EXPR"
} | uiua run -
