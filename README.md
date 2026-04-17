# GDSI - Trabajo Practico 3

## Gastos Grupales

Base inicial del TP para gestionar grupos temporales, registrar gastos compartidos y calcular cuanto debe aportar cada integrante hasta cerrar el grupo sin saldos pendientes.

## Vision del sistema

La aplicacion esta pensada para personas socialmente activas que necesitan organizar gastos de corta duracion, por ejemplo:

- un asado entre amigos
- un viaje donde distintos integrantes pagan cosas diferentes
- una salida donde algunos gastos se reparten entre todos y otros solo entre parte del grupo

## Necesidades del enunciado

- definir multiples grupos
- invitar integrantes
- registrar gastos grupales
- repartir gastos segun participantes
- manejar deudas, recordatorios y cierre de grupos
- contemplar multiples monedas

## Estado actual del repo

Este repositorio sigue montado sobre la base tecnica del template original de FastAPI + React, pero ya fue limpiado y reorientado para este TP:

- se removio documentacion y branding del template generico
- la interfaz visible ahora referencia "Gastos Grupales"
- la documentacion describe el dominio del trabajo practico
- se conservaron las piezas tecnicas utiles para seguir desarrollando sobre esta base

Todavia no se implemento la logica especifica del dominio. Hoy la estructura sigue teniendo entidades y pantallas heredadas como `items`, `users` y autenticacion, que pueden servir como punto de partida para modelar grupos, gastos, integrantes y balances.

## Stack actual

- `backend/`: FastAPI + SQLModel + PostgreSQL
- `frontend/`: React + TypeScript + Vite + TanStack Router/Query
- `compose.yml`: stack local con base de datos, backend y frontend

## Puesta en marcha

### Opcion 1: con Docker Compose

```bash
docker compose up -d --wait
```

Servicios utiles:

- frontend: `http://localhost:5173`
- backend: `http://localhost:8000`
- docs OpenAPI: `http://localhost:8000/docs`

### Opcion 2: desarrollo separado

Backend:

```bash
cd backend
uv sync
source .venv/bin/activate
fastapi dev app/main.py
```

Frontend:

```bash
cd frontend
bun install
bun run dev
```

## Guia rapida del repo

- [development.md](./development.md): flujo de desarrollo local
- [backend/README.md](./backend/README.md): notas del backend
- [frontend/README.md](./frontend/README.md): notas del frontend
- [CONTRIBUTING.md](./CONTRIBUTING.md): criterios de trabajo para este TP

## Siguiente refactor sugerido

Si despues queres seguir acomodandolo al dominio del TP, el camino mas natural seria:

1. renombrar `items` a `gastos`
2. redefinir `users/admin` hacia integrantes y gestion de grupos
3. modelar grupos, miembros, gastos, participaciones y balances
4. agregar soporte de multimoneda y cierre de grupo
