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

Este repositorio sigue montado sobre la base tecnica del template original de FastAPI + React, pero ya fue reorientado para este TP:

- se removio documentacion y branding del template generico
- la interfaz visible ahora referencia "Gastos Grupales"
- la documentacion describe el dominio del trabajo practico
- se conservaron las piezas tecnicas utiles para seguir desarrollando sobre esta base
- ya existe flujo funcional para grupos, integrantes, gastos, saldos y liquidacion sugerida
- todavia quedan piezas heredadas del template como `items`, `admin` y `settings`

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
uv sync
cd backend
../.venv/bin/fastapi dev app/main.py
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

1. remover o reemplazar las pantallas heredadas que no formen parte del TP
2. agregar edicion/eliminacion de gastos si se decide contemplarlo
3. agregar soporte de multimoneda y cierre de grupo
4. evaluar recordatorios o notificaciones si entran en el alcance final

## Ejecucion local verificada

Estos son los comandos usados para correr y probar el estado actual del proyecto.

### 1. Instalar dependencias

Desde la raiz del repositorio:

```bash
cp .env.example .env
uv sync
```

Frontend:

```bash
cd frontend
bun install
```

Si `uv` o `bun` no estan en el `PATH`, usar los binarios locales:

```bash
~/.local/bin/uv sync
~/.bun/bin/bun install
```

### 2. Levantar base de datos

Con Docker Compose:

```bash
docker compose up -d db
```

La configuracion local espera PostgreSQL en `localhost:5433`, con base `app`, usuario `postgres` y password `postgres`, segun el `.env` del proyecto.

### 3. Levantar backend

En una terminal:

```bash
cd backend
../.venv/bin/fastapi dev app/main.py
```

Servicios utiles:

- API: `http://127.0.0.1:8000`
- Docs: `http://127.0.0.1:8000/docs`

### 4. Levantar frontend

En otra terminal:

```bash
cd frontend
~/.bun/bin/bun run dev
```

Abrir:

```text
http://localhost:5173
```

### 5. Comandos de verificacion

Backend:

```bash
cd backend
../.venv/bin/ruff check app tests
../.venv/bin/ty check tests/api/routes/test_groups.py
../.venv/bin/pytest tests/api/routes/test_groups.py
```

Frontend:

```bash
cd frontend
~/.bun/bin/bunx tsc -p tsconfig.json --noEmit
~/.bun/bin/bun run build
```

Los tests de backend usan la base configurada en `.env`, por eso conviene correrlos con una base local de desarrollo.

## Alcance actual del proyecto

### Funcionalidades implementadas y probadas

- Registro de usuarios.
- Login con email y password.
- Obtencion del perfil autenticado.
- Home con resumen de grupos, saldos y gastos recientes.
- Creacion de grupos desde Home y desde la pantalla de grupos.
- Listado de grupos del usuario.
- Detalle de grupo con integrantes, saldos, gastos y liquidacion sugerida.
- Edicion de nombre y descripcion de grupo.
- Eliminacion de grupo.
- Alta de participantes por email.
- Baja de participantes sin saldo pendiente.
- Registro de gastos en un grupo.
- Division equitativa entre los participantes seleccionados al crear el gasto.
- Division personalizada por monto manual.
- Busqueda de gastos por descripcion.
- Filtro de gastos por pagador.
- Calculo de saldos por integrante.
- Propuesta de liquidacion para llevar saldos a cero.

### Decisiones de diseno actuales

- Los gastos son historicos: agregar un participante despues de registrar un gasto no recalcula gastos anteriores.
- La division equitativa se aplica sobre los participantes seleccionados al momento de crear el gasto.
- El resumen de Home se calcula desde los datos de grupos y gastos recientes; no hay todavia un endpoint dedicado de dashboard.

### Pendiente o fuera del alcance actual

- OAuth.
- Soporte real de multiples monedas.
- Recordatorios/notificaciones.
- Cierre formal de grupo.
- Edicion o eliminacion individual de gastos.
- Endpoint backend dedicado para resumen de dashboard.
- Limpieza final de rutas heredadas del template, como `items`, `admin` y `settings`.
