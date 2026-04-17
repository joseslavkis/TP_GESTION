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
source .venv/bin/activate
fastapi dev app/main.py
```

## Tests

```bash
cd backend
bash ./scripts/test.sh
```

## Nota importante

Todavia existen modelos, rutas y tests heredados del template como `users` e `items`. No estan mal para arrancar, pero conviene tomarlos como estructura transitoria y no como modelo final del dominio.
