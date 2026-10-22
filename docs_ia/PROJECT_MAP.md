# Project Map

## Frontend (`frontend/`) - React + Vite + Tailwind CSS
- `src/components/`: Vistas y componentes UI (Login, Storefront, Catalogo, DetalleProducto, Checkout, etc.). Incluye la UX de PWA: `BannerOffline.tsx` y `ActualizacionDisponible.tsx`.
- `src/context/`: Estado global de la aplicación (`AuthContext.tsx`, `CartContext.tsx`)
- `src/data/`: Datos simulados/mocks (`productos.ts`, `red.ts`) para la fase actual.
- `src/services/`: Capa de consumo de API (`productosService.ts`, `redService.ts`, `checkoutService.ts`) y cliente HTTP centralizado (`http.ts`, con `ApiError` y `NetworkError`).
- `src/hooks/`: Hooks reutilizables (`useOnlineStatus.ts`).
- `src/sw.ts`: Service worker escrito en TypeScript y compilado por Workbox en modo `injectManifest`: precache del shell, `navigateFallback` para deep links, runtime caching por lectura y respuesta JSON sintética cuando la API no está disponible.
- `src/pwa/`: Módulos de la PWA — `cachePolicy.ts` (política de caché pura, sin I/O), `requestRouting.ts` (gating de las requests del worker) y `registration.ts` (registro del service worker y estado observable `needRefresh` / `offlineReady`).
- `public/manifest.webmanifest`: Web App Manifest (nombre, `start_url`, `scope`, `display`, colores, íconos y atajos).
- `public/pwa-icons/`: Íconos PNG/SVG instalables (`any` y `maskable`) generados por `scripts/generate-icons.mjs`; incluye `apple-touch-icon.png`.
- `public/fonts/`: Fuentes Outfit auto-alojadas (`fonts.css` + `.woff2`) para que el modo offline no dependa de Google Fonts.
- `tests/e2e/`: Suite E2E de Playwright (`pwa-instalable.spec.ts`, `offline.spec.ts`, `actualizacion.spec.ts`) con utilidades compartidas en `helpers.ts`.
- `playwright.config.ts`: Configuración de Playwright: compila y sirve `dist/` con `vite preview` en `:4173`, un worker y `serviceWorkers: 'allow'`.
- `Dockerfile`: Build multi-stage (Node → nginx) del frontend.
- `nginx.conf`: Sirve la SPA con fallback a `index.html`, proxyea `/api` al backend y define la política de caché por tipo de recurso.
- `src/App.tsx`: Enrutador principal (React Router)
- `dist/` y `public/`: Archivos construidos y estáticos.

## Raíz (despliegue)
- `docker-compose.yml`: Stack completo (backend Go, PostgreSQL, Redis, frontend nginx y Caddy).
- `Caddyfile`: Terminador TLS; el service worker exige HTTPS (o `localhost`) para registrarse.

## Backend (`backend/`) - Go + Fiber
- `config/`: Configuración y pools (`db.go` para PostgreSQL, `redis.go` con `RedisCache`)
- `controllers/`: Lógica de los endpoints HTTP con DI (`authController.go`, `prodController.go`, `redController.go`, `checkoutController.go`, `healthController.go`)
- `database/`: Scripts de inicialización y seeds (`init.sql`) con soporte de pedidos y pedido_items
- `models/`: Estructuras de datos y tipos (`models.go`)
- `repository/`: Interfaces y capa de persistencia relacional (`interfaces.go`, `repository.go`)
- `routes/`: Definición de rutas de la API e inyección de dependencias (`routes.go`)
- `main.go`: Punto de entrada de la aplicación, fail-fast y graceful shutdown.
