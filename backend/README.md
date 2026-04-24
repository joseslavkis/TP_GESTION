# Backend

El backend actual esta montado con FastAPI, SQLModel y PostgreSQL. Conserva piezas utiles del template original, pero ya incluye el dominio principal de Gastos Grupales.

## Rol en el TP

Este modulo concentra:

- grupos
- integrantes
- gastos
- participaciones por gasto
- balances por integrante
- propuesta de liquidacion

Todavia no incluye cierre formal de grupos, recordatorios ni soporte real de multiples monedas.

## Desarrollo local

```bash
cd backend
uv sync
source ../.venv/bin/activate
fastapi dev app/main.py
```

## Deploy

Para plataformas como Railway, el backend ya puede tomar una conexion completa
por `DATABASE_URL` y usar el `PORT` inyectado por la plataforma al iniciar el
contenedor.

Si `DATABASE_URL` no esta definida, el backend sigue funcionando con la
configuracion tradicional basada en:

- `POSTGRES_SERVER`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

## Tests

```bash
cd backend
../.venv/bin/pytest tests/api/routes/test_groups.py
../.venv/bin/ruff check app tests
../.venv/bin/ty check tests/api/routes/test_groups.py
```

## Nota importante

Todavia existen modelos, rutas y tests heredados del template como `users` e `items`. `users` sigue siendo parte del flujo de autenticacion; `items` queda como estructura transitoria y no forma parte del flujo principal de Gastos Grupales.
