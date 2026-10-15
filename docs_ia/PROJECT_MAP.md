# Project Map

## Frontend (`frontend/`) - React + Vite + Tailwind CSS
- `src/components/`: Vistas y componentes UI (Login, Storefront, Catalogo, DetalleProducto, Checkout, etc.)
- `src/context/`: Estado global de la aplicación (`AuthContext.tsx`, `CartContext.tsx`)
- `src/data/`: Datos simulados/mocks (`productos.ts`, `red.ts`) para la fase actual.
- `src/services/`: Capa de consumo de API (`productosService.ts`, `redService.ts`, `checkoutService.ts`)
- `src/App.tsx`: Enrutador principal (React Router)
- `dist/` y `public/`: Archivos construidos y estáticos.

## Backend (`backend/`) - Go + Fiber
- `config/`: Configuración y pools (`db.go` para PostgreSQL, `redis.go` con `RedisCache`)
- `controllers/`: Lógica de los endpoints HTTP con DI (`authController.go`, `prodController.go`, `redController.go`, `checkoutController.go`, `healthController.go`)
- `database/`: Scripts de inicialización y seeds (`init.sql`) con soporte de pedidos y pedido_items
- `models/`: Estructuras de datos y tipos (`models.go`)
- `repository/`: Interfaces y capa de persistencia relacional (`interfaces.go`, `repository.go`)
- `routes/`: Definición de rutas de la API e inyección de dependencias (`routes.go`)
- `main.go`: Punto de entrada de la aplicación, fail-fast y graceful shutdown.
