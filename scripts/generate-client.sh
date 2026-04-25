#! /usr/bin/env bash

set -e
set -x

if ! command -v uv >/dev/null 2>&1; then
  if [ -n "${USERNAME:-}" ] && [ -x "/c/Users/${USERNAME}/.local/bin/uv.exe" ]; then
    export PATH="$PATH:/c/Users/${USERNAME}/.local/bin"
  elif [ -x "$HOME/.local/bin/uv" ]; then
    export PATH="$PATH:$HOME/.local/bin"
  fi
fi

UV_BIN="$(command -v uv || command -v uv.exe || true)"
BUN_BIN="$(command -v bun || command -v bun.exe || true)"

if [ -z "$BUN_BIN" ]; then
  if [ -n "${USERNAME:-}" ] && [ -x "/c/Users/${USERNAME}/.bun/bin/bun.exe" ]; then
    export PATH="$PATH:/c/Users/${USERNAME}/.bun/bin"
  elif [ -x "/mnt/c/Users/guido/.bun/bin/bun.exe" ]; then
    export PATH="$PATH:/mnt/c/Users/guido/.bun/bin"
  fi
  BUN_BIN="$(command -v bun || command -v bun.exe || true)"
fi

if [ -z "$UV_BIN" ]; then
  echo "uv not found in PATH"
  exit 127
fi

if [ -z "$BUN_BIN" ]; then
  echo "bun not found in PATH"
  exit 127
fi

if [ -f .env.ci ]; then
  set -a
  source .env.ci
  set +a
elif [ -f .env ]; then
  set -a
  source .env
  set +a
fi

cd backend

export SECRET_KEY="${SECRET_KEY:-ci-test-secret-key-for-testing-only}"
export FRONTEND_HOST="${FRONTEND_HOST:-http://localhost:5173}"
export DOMAIN="${DOMAIN:-localhost}"
export PROJECT_NAME="${PROJECT_NAME:-TestApp}"
export POSTGRES_SERVER="${POSTGRES_SERVER:-localhost}"
export POSTGRES_USER="${POSTGRES_USER:-postgres}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
export POSTGRES_DB="${POSTGRES_DB:-app}"
export FIRST_SUPERUSER="${FIRST_SUPERUSER:-test@example.com}"
export FIRST_SUPERUSER_PASSWORD="${FIRST_SUPERUSER_PASSWORD:-testpassword123}"
export ENVIRONMENT="${ENVIRONMENT:-local}"
export BACKEND_CORS_ORIGINS="${BACKEND_CORS_ORIGINS:-[\"http://localhost:5173\",\"http://localhost:8000\"]}"

"$UV_BIN" run python -c "import app.main; import json; print(json.dumps(app.main.app.openapi()))" > ../openapi.json
cd ..
mv openapi.json frontend/
"$BUN_BIN" run --filter frontend generate-client
"$BUN_BIN" run lint
