# Desarrollo

## Objetivo

Esta base se esta usando para el TP de "Gastos Grupales". El objetivo del desarrollo local es iterar rapido sobre el flujo de grupos, integrantes, gastos, saldos y liquidaciones sin perder tiempo en configuraciones innecesarias.

## Requisitos

- Docker y Docker Compose
- `uv` para el backend
- `bun` para el frontend

## Levantar todo con Docker

```bash
docker compose up -d --wait
```

Endpoints locales:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8000`
- docs: `http://localhost:8000/docs`

Para bajar el stack:

```bash
docker compose down
```

## Nota sobre PostgreSQL local

Este proyecto expone la base del stack Docker en `localhost:5433` para evitar
conflictos con instalaciones locales de PostgreSQL que suelen usar `5432`.

Eso deja alineados estos dos escenarios:

- backend corriendo localmente con `uv` usando `POSTGRES_PORT=5433`
- backend corriendo dentro de Docker conectandose internamente al servicio `db`
  por `5432`

Si en tu maquina `5433` tambien esta ocupado, cambia `POSTGRES_PORT` en
`.env` por otro puerto libre.

## Backend local

```bash
cd backend
uv sync
source ../.venv/bin/activate
fastapi dev app/main.py
```

## Frontend local

```bash
cd frontend
bun install
bun run dev
```

## Comandos utiles

Desde la raiz:

```bash
bun run dev
bun run lint
bun run test
```

Estos comandos de la raiz delegan en el workspace del frontend. Para backend, usar los comandos de la seccion siguiente.

Backend:

```bash
cd backend
bash ./scripts/test.sh
bash ./scripts/lint.sh
```

Frontend:

```bash
cd frontend
bun run build
bun run test
```

## Verificacion rapida de auth

Con backend y DB levantados, podes validar registro y login con `curl`:

```bash
curl -X POST http://localhost:8000/api/v1/users/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"supersecreta","full_name":"Test User"}'
```

```bash
curl -X POST http://localhost:8000/api/v1/login/access-token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'username=test@example.com&password=supersecreta'
```

## Despliegue en Railway

El repositorio puede desplegarse en Railway, pero no como un unico servicio con
`docker compose`.

La forma recomendada es separar al menos dos servicios:

- `backend`
- `frontend`

Configuracion sugerida:

- conectar ambos servicios al mismo repo
- usar como raiz del codigo la raiz del repositorio
- definir `RAILWAY_DOCKERFILE_PATH=backend/Dockerfile` para el backend
- definir `RAILWAY_DOCKERFILE_PATH=frontend/Dockerfile` para el frontend

Variables importantes del backend:

- `DATABASE_URL`: preferida para produccion y para bases externas
- `SECRET_KEY`
- `FIRST_SUPERUSER`
- `FIRST_SUPERUSER_PASSWORD`
- `FRONTEND_HOST`
- `BACKEND_CORS_ORIGINS`
- `ENVIRONMENT=production`

Variables importantes del frontend:

- `VITE_API_BASE_URL`: URL publica del backend

Antes de promover un deploy del backend, conviene configurar un
Pre-Deploy Command en Railway para correr migraciones y datos iniciales.
Por ejemplo:

```bash
bash scripts/prestart.sh
```

## Criterio para este TP

El dominio principal ya esta implementado en una primera version funcional. Para seguir evolucionando el TP:

- mantener autenticacion como base de usuarios
- priorizar mejoras sobre grupos, integrantes, gastos, saldos y liquidaciones
- tratar `items`, `admin` y otras pantallas heredadas como estructura transitoria
- reemplazar branding y textos demo cada vez que aparezcan
- actualizar tests y documentacion cuando cambie el comportamiento
