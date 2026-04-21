#! /usr/bin/env bash

set -e
set -x

cd backend

export FRONTEND_HOST="${FRONTEND_HOST:-http://localhost:5173}"
export DOMAIN="${DOMAIN:-localhost}"
export PROJECT_NAME="${PROJECT_NAME:-TestApp}"
export POSTGRES_SERVER="${POSTGRES_SERVER:-localhost}"
export POSTGRES_USER="${POSTGRES_USER:-postgres}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
export POSTGRES_DB="${POSTGRES_DB:-app}"
export FIRST_SUPERUSER="${FIRST_SUPERUSER:-test@example.com}"
export FIRST_SUPERUSER_PASSWORD="${FIRST_SUPERUSER_PASSWORD:-testpassword123}"

uv run python -c "import app.main; import json; print(json.dumps(app.main.app.openapi()))" > ../openapi.json
cd ..
mv openapi.json frontend/
bun run --filter frontend generate-client
bun run lint
