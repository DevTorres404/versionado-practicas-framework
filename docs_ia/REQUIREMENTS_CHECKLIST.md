# Requirements Checklist

## Estado General
- **Hito actual:** Fase 4 — Motor Transaccional ACID, Inyección de Dependencias y Concurrencia
- **Última tarea completada:** Fase 4 (P1–P5): Inyección de dependencias + Transacciones ACID (pedidos/pedido_items) + Goroutines para comisiones + Invalidación de caché Redis + Checkout.tsx conectado.
- **Siguiente tarea pendiente:** Validación visual del flujo de compra y simulación de fallas ACID.
- **Ruta paralela:** Fase 5 — PWA (instalable + offline); plan de 7 fases en `REQUIREMENTS_CHECKLIST.md` (raíz).

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

## Fase 5 — PWA (instalable + offline)

> Plan completo, tareas y criterios de aceptación: `REQUIREMENTS_CHECKLIST.md` (raíz) → sección «PWA — PROGRESSIVE WEB APP». Aquí sólo el estado de avance.

- [x] F5-T1: Vitest instalado en el frontend + `src/pwa/cachePolicy.ts` (funciones puras de estrategia de caché) con sus tests.
- [x] F5-T2: `public/manifest.webmanifest` + iconos PNG 192/512/maskable + `apple-touch-icon` + metadatos (`theme-color`, `color-scheme`, `viewport-fit=cover`) + `VitePWA` configurado en `vite.config.ts`.
- [x] F5-T3: `src/sw.ts` (Workbox `injectManifest`): precache del app shell, `navigateFallback` con denylist de `/api`, runtime caching sólo de lecturas, cachés versionadas por build.
- [x] F5-T4: `NetworkError` tipado en `services/http.ts`, hook `useOnlineStatus`, banner de "sin conexión" en `Layout`, checkout bloqueado sin conexión.
- [x] F5-T5: Actualización controlada (`registerType: 'prompt'`, aviso "Actualizar ahora", `skipWaiting` manual) + aviso `offlineReady`.
- [ ] F5-T6: `frontend/Dockerfile` + `nginx.conf` con SPA fallback y `sw.js` en `no-cache` + `docker-compose` con `frontend`/`backend`/`postgres`/`redis` + TLS (Caddy) y proxy `/api` en el mismo origen.
- [ ] F5-T7: Playwright (catálogo offline, checkout bloqueado, aviso de versión nueva) + `README.md` y `docs_ia/PROJECT_MAP.md` actualizados.

### Límite de alcance (no negociable)

`POST /api/checkout` **no** se ejecuta offline. El backend es ACID con `FOR UPDATE` y descuento de stock; encolar compras a ciegas genera pedidos fantasma y stock corrupto. Offline para leer, bloqueo explícito para escribir.
