# Frontend

El frontend esta hecho con React, TypeScript y Vite. Ya fue orientado al TP de Gastos Grupales y consume los endpoints del backend para grupos, integrantes, gastos y saldos.

## Objetivo

Servir como interfaz funcional para:

- listado de grupos
- detalle de grupo
- alta de gastos
- reparto entre integrantes
- resumen de deudas y saldos
- liquidacion sugerida

## Desarrollo local

```bash
cd frontend
bun install
bun run dev
```

El archivo `frontend/.env` debe apuntar al backend local:

```text
VITE_API_BASE_URL=http://localhost:8000
```

## Build

```bash
cd frontend
bun run build
```

## Estado actual

Pantallas principales implementadas:

- Home con resumen de saldos, grupos y gastos recientes.
- Listado de grupos con busqueda.
- Detalle de grupo con integrantes, gastos, filtros y liquidacion sugerida.
- Dialogos para crear grupo, editar grupo, agregar participante y registrar gasto.

Todavia hay componentes y rutas heredadas como `items`, `admin` y `settings`. La idea es removerlas o reemplazarlas si no forman parte del alcance final del TP.
