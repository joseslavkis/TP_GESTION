#! /usr/bin/env bash

set -euo pipefail

if [ "${CI:-}" != "true" ] && [ -f .env ]; then
  echo "Refusing to overwrite .env outside CI. Set CI=true to generate CI env files." >&2
  exit 1
fi

cat > .env.ci << 'EOF'
SECRET_KEY=ci-test-secret-key-for-testing-only
FRONTEND_HOST=http://localhost:5173
DOMAIN=localhost
PROJECT_NAME=TestApp
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=app
FIRST_SUPERUSER=admin@example.com
FIRST_SUPERUSER_PASSWORD=testpassword123
EMAIL_TEST_USER=test@example.com
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_TLS=false
EMAILS_FROM_EMAIL=noreply@example.com
ENVIRONMENT=local
BACKEND_CORS_ORIGINS=http://localhost:5173,http://localhost:8000
STACK_NAME=test
DOCKER_IMAGE_BACKEND=test
DOCKER_IMAGE_FRONTEND=test
EOF

# Compose interpolation uses --env-file, but services still declare env_file: .env
# and backend Settings loads ../.env when scripts run from ./backend.
cp .env.ci .env
