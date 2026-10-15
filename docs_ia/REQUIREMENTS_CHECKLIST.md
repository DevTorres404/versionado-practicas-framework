# Requirements Checklist

## Estado General
- **Hito actual:** Fase 4 — Motor Transaccional ACID, Inyección de Dependencias y Concurrencia
- **Última tarea completada:** Fase 4 (P1–P5): Inyección de dependencias + Transacciones ACID (pedidos/pedido_items) + Goroutines para comisiones + Invalidación de caché Redis + Checkout.tsx conectado.
- **Siguiente tarea pendiente:** Validación visual del flujo de compra y simulación de fallas ACID.

## Backend (Go/Fiber)
- [x] La API devuelve el rol del usuario (admin/cliente) en login.
- [x] Refactorización a `APIError` (Fase 1).
- [x] Validaciones de campos en `authController` y `prodController`.
- [x] Health check endpoint (`/api/health`).
- [x] F2-T1: Docker Compose con PostgreSQL 16 (`docker-compose.yml`, `.env`, healthcheck).
- [x] F2-T2: Esquema y seeds en `database/init.sql` (`usuarios`, `productos` con galería JSONB, `referidos` con auto-FK).
- [x] F2-T3: Pool de conexiones y carga de `.env` en `config/db.go` (pgx stdlib + `database/sql`).
- [x] F2-T4: Capa `repository/` sin datos en memoria (CRUD + `construirArbol` con unit test).
- [x] F2-T5: Controladores sobre repositorio (firmas intactas); `GET /api/productos/:id` responde 404 real.
- [x] F2-T6: Endpoint nuevo `GET /api/red` y apagado elegante con cierre del pool.
- [x] F2-T6: El servidor no arranca si PostgreSQL no está alcanzable (fail fast).
- [x] F3-P1: Docker Compose con servicio Redis (`redis:alpine`, puerto 6379, volumen `redisdata`, dependencia backend).
- [x] F3-P2: Cliente oficial `go-redis/v9` en `config/redis.go` (`LoadRedis`, `NewRedisClient`, fail-fast y `CloseRedis`).
- [x] F3-P3: Caché Cache-Aside en `GetProductos` (clave `productos:all`, TTL 5m, cabecera `X-Cache: HIT/MISS`).
- [x] F3-P4: Caché Cache-Aside en `GetRed` (clave `red:tree:{email_usuario}`, TTL 10m, cabecera `X-Cache: HIT/MISS`).
- [x] F4-P1: Inyección de Dependencias en repositorios y controladores (`DBRepository`, `CacheRepository`, `RedisCache`, constructores `New*Controller`).
- [x] F4-P2: Microservicio `POST /api/checkout` en `checkoutController.go` recibiendo payload de compra.
- [x] F4-P3: Transacciones ACID en `repository.CrearPedido` (`BEGIN`, `pedidos`, `pedido_items` con FK, decremento de stock, `ROLLBACK`/`COMMIT`).
- [x] F4-P4: Concurrencia asíncrona mediante Goroutine (`go procesarComisionesAsincrono`) para actualizar ventas de la red en segundo plano.
- [x] F4-P5: Invalidación de caché en Redis (`Del`) para actualizar los KPIs de la red automáticamente.

## Frontend (React/Vite)
- [x] Datos de ejemplo (mock) del catálogo y de la red multinivel (`productos.ts`, `red.ts`).
- [x] Capa de servicios del catálogo (`productosService.ts`).
- [x] F2-T7: `productosService.ts` consume la API real (`/api/productos`, `/api/productos/:id`).
- [x] F2-T7: `redService.ts` nuevo; `MiRed.tsx` y `Dashboard.tsx` consumen `GET /api/red`.
- [x] Autenticación con roles en AuthContext.
- [x] Rutas protegidas y guardas por rol (`AdminRoute`, `ProtectedRoute`).
- [x] F1: Storefront a pantalla completa con hero y secciones.
- [x] F2: Ruta dinámica de detalle de producto.
- [x] F3: Búsqueda y filtros del catálogo.
- [x] F4: Galería/lightbox en el detalle de producto.
- [x] F5: Carrito persistente por usuario y proceso de checkout.
- [x] F6: Árbol multinivel de referidos con cálculos de comisiones.
- [x] F7: Dashboard con KPIs dinámicos para admin.
- [x] F8: Navegación diferenciada por rol.
