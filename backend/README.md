# Backend

El backend actual esta montado con FastAPI, SQLModel y PostgreSQL. Por ahora conserva bastante estructura del template original, pero queda como base para modelar el dominio de Gastos Grupales.

## Rol esperado en el TP

Este modulo deberia terminar concentrando:

- grupos
- integrantes
- gastos
- participaciones por gasto
- balances y cierres
- soporte de moneda

## Desarrollo local

```bash
cd backend
uv sync
source ../.venv/bin/activate
fastapi run app/main.py --reload --port 8000
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
bash ./scripts/test.sh
```

## Nota importante

Todavia existen modelos, rutas y tests heredados del template como `users` e `items`. No estan mal para arrancar, pero conviene tomarlos como estructura transitoria y no como modelo final del dominio.
