# Project Map

## Frontend (`frontend/`) - React + Vite + Tailwind CSS
- `src/components/`: Vistas y componentes UI (Login, Storefront, Catalogo, DetalleProducto, etc.)
- `src/context/`: Estado global de la aplicación (`AuthContext.tsx`, `CartContext.tsx`)
- `src/data/`: Datos simulados/mocks (`productos.ts`, `red.ts`) para la fase actual.
- `src/services/`: Capa de consumo de API (`productosService.ts`)
- `src/App.tsx`: Enrutador principal (React Router)
- `dist/` y `public/`: Archivos construidos y estáticos.

## Backend (`backend/`) - Go + Fiber
- `config/`: Configuración y pools (`db.go` para PostgreSQL, `redis.go` para Redis)
- `controllers/`: Lógica de los endpoints HTTP (`authController.go`, `prodController.go`, `redController.go`, `healthController.go`)
- `database/`: Scripts de inicialización y seeds (`init.sql`)
- `models/`: Estructuras de datos y tipos (`models.go`)
- `repository/`: Capa de persistencia relacional sobre PostgreSQL (`repository.go`)
- `routes/`: Definición de rutas de la API e inyección de dependencias (`routes.go`)
- `main.go`: Punto de entrada de la aplicación, fail-fast y graceful shutdown.
