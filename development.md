# Desarrollo

## Objetivo

Esta base se esta usando para el TP de "Gastos Grupales". El objetivo del desarrollo local es iterar rapido sobre la estructura heredada del template sin perder tiempo en configuraciones innecesarias.

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

## Backend local

```bash
cd backend
uv sync
source .venv/bin/activate
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

## Criterio para este TP

Mientras el dominio definitivo no este implementado, conviene usar esta base como plataforma tecnica:

- reutilizar autenticacion solo si aporta
- transformar `items` en gastos
- transformar la parte administrativa en gestion de integrantes y grupos
- reemplazar branding y textos demo cada vez que aparezcan
