# Frontend

El frontend esta hecho con React, TypeScript y Vite. Ya fue limpiado del branding mas visible del template y ahora se presenta como base para el TP de Gastos Grupales.

## Objetivo

Servir como interfaz inicial para evolucionar hacia:

- listado de grupos
- detalle de grupo
- alta de gastos
- reparto entre integrantes
- resumen de deudas y saldos
- cierre de grupos

## Desarrollo local

```bash
cd frontend
bun install
bun run dev
```

## Build

```bash
cd frontend
bun run build
```

## Estado actual

Todavia hay componentes y rutas heredadas como `items`, `admin` y `settings`. La idea es reutilizar la estructura y luego renombrar o reemplazar esas pantallas conforme avances con el TP.
