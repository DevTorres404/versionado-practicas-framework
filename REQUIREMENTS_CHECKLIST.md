# REQUIREMENTS CHECKLIST — MultiCatálogo

> Fuente de verdad del progreso. Leer al inicio de cada sesión; marcar `- [x]`
> y actualizar "Estado General" al completar cualquier tarea.
>
> **Estructura:** el documento se divide en fases por **Unidad/Tema del sílabo**
> (`Silabo_Framework_Programacion_Web.md`). Cada fase trae un comentario con lo
> que se hará en esa clase. El producto integrador es UNO: MultiCatálogo —
> una tienda cosmética con red de ventas multinivel (MLM) que crece como
> **sistema políglota**: React (front) + Go/Fiber (núcleo transaccional, U2)
> + FastAPI (capa SaaS/multitenant, U3), desplegado contenerizado (U4).
>
> **Principios rectores (aplican a toda fase):**
> - Seguridad por defecto: ningún endpoint nuevo nace sin auth ni validación.
> - Inyección de dependencias: interfaces en los bordes; globals solo en el entry point.
> - Funciones puras para el dominio (comisiones, totales, validadores) — testeables sin I/O.
> - Mobile-first: UI a 360px, touch ≥44px, un campo por fila en formularios.

## Estado General

| Ítem | Valor |
|---|---|
| **Hito actual** | **Unidades 1 y 2 completadas y validadas al 100%** (SPA React modular con sesión JWT persistida + Go/Fiber bancario seguro: bcrypt, JWT real, rutas protegidas, ACID for update, health con dependencias) |
| **Última tarea completada** | Implementación y verificación integral de requisitos de Unidad 1 y Unidad 2 (2026-10-16) |
| **Siguiente tarea pendiente** | Commit del trabajo actual; luego U3-T1: scaffold FastAPI `Unidad3_SaaS/` |
| **Bloqueadores** | Ninguno. `backend-haskell` detenido (`docker start backend-haskell` restaura); `postgres-funcional` en :5433 → Postgres propio en **5434** |
| **Ruta paralela activa** | **PWA** (instalable + offline) — 7 fases; detalle en la sección «PWA — PROGRESSIVE WEB APP» de este documento |
| **Bloqueadores PWA** | Sin origen seguro (HTTPS) ni reverse proxy con SPA fallback → bloquea PWA-6. Frontend sin runner de tests → lo resuelve PWA-1. Chrome sólo ofrece la instalación si hay SW registrado con handler `fetch` → PWA-3 |

## Arquitectura objetivo del semestre

```
React SPA (:5173) ──► Caddy/Nginx (U4: proxy inverso + SSL)
                        ├─ /api/tx/*   → Go/Fiber  :3000  — núcleo transaccional (U2)
                        └─ /api/saas/* → FastAPI   :8000  — capa SaaS/multitenant (U3)
                                            │
                          PostgreSQL 16 (:5434) + Redis (:6379)
```

---

# UNIDAD 1 — FRAMEWORKS FRONTEND (SPA React + Vite + Tailwind)

## U1-T1 · Introducción a frameworks web y arquitectura de soluciones

> Se presenta la pila tecnológica del semestre, la inversión de control y los
> lineamientos del producto integrador MultiCatálogo (tienda + red MLM).

- [x] Pila definida y workspace estructurado (`Unidad1_Frontend/`, `Unidad2_Backend/`)

## U1-T2 · Entorno SPA con Vite + Tailwind CSS

> Scaffold del frontend: empaquetador Vite, Tailwind v4, estructura de carpetas
> por responsabilidad (`components/`, `context/`, `services/`, `data/`).

- [x] Entorno SPA con Vite + Tailwind CSS
- [x] `package.json` renombrado a `multicatalogo-frontend`
- [x] `VITE_API_URL` en `.env` + `import.meta.env` (cliente único en `services/http.ts`)

## U1-T3 · Componentes y gestión de estado global

> Estado global con React Context: sesión de usuario y carrito por usuario.

- [x] `AuthContext` (sesión `{email, rol}`) y `CartContext` (carrito en localStorage por email)
- [x] Persistencia de sesión en `AuthContext` (`multicatalogo_sesion`: usuario + JWT en localStorage)
- [x] Warnings eslint resueltos: split `context/auth.ts` + `context/cart.ts` (hooks/tipos separados del Provider); `npm run lint` → 0 errores, 0 warnings

## U1-T4 · Consumo de API RESTful y enrutamiento

> Promesas con fetch, capa de servicios desacoplada y guardas de ruta por rol.

- [x] `services/productosService.ts`, `redService.ts` + guardas `ProtectedRoute`/`AdminRoute`
- [x] `services/http.ts`: `apiFetch` único con `Authorization: Bearer` automático, `ApiError` tipado con status y helpers de sesión

## U1-T5 · Interfaces full-screen y flujos MLM (Práctica 03)

> Vistas inmersivas del catálogo y flujo completo de compra y red multinivel.

- [x] F8 Login con rol + redirección por rol
- [x] F1 Storefront `/tienda` full-screen | F3 Catálogo con búsqueda/filtros | F2 Detalle `/producto/:id` | F4 Lightbox
- [x] F5 Carrito + checkout + confirmación | F6 Árbol multinivel comisiones 10/5/2 % | F7 Dashboard KPIs
- [x] `Checkout.tsx` → `POST /api/checkout` real (sin simulación) + manejo de `APIError`
- [x] Audit mobile-first: 375px sin overflow en Dashboard/MiRed/Catálogo; botones de acción ≥44px (`Añadir al Carrito`, steppers de `Carrito`, `Cerrar Sesión`)

---

# UNIDAD 2 — BACKEND ALTA TRANSACCIONALIDAD (Go/Fiber · "entornos bancarios")

## U2-T1 · Rendimiento, memoria y concurrencia

> Goroutines y contextos: procesos de misión crítica que no bloquean la respuesta HTTP.

- [x] Goroutine `procesarComisiones` tras el COMMIT del pedido (contexto propio, no el del request)

## U2-T2 · Microservicios y APIs robustas (Fiber)

> API REST en capas con contrato de error estándar y configuración por entorno.

- [x] Capas routes → controllers → repository; endpoints login/productos/red/health
- [x] `APIError{status,message,details}` en todos los errores + validación de entrada (400/404)
- [x] Puerto de escucha configurable (`PORT`, defecto 3000)
- [x] `/api/health` real: `HealthController` con ping a Postgres (503 si cae) y Redis (`"degraded"` si cae)

## U2-T3 · Persistencia PostgreSQL + caché Redis

> Dockeriza la BD, SQL puro con pgx, reconstrucción del árbol y Cache-Aside.

- [x] `docker-compose` Postgres 16 + Redis alpine + volumen + healthchecks
- [x] `init.sql` (usuarios/productos/referidos + seed), `repository.go` a SQL real, árbol por `parent_id`
- [x] Cache-Aside: `productos:all` TTL 5 min, `red:tree:{email}` TTL 10 min, degradación sin caché
- [x] Índices: `referidos(parent_id)`, `pedidos(cliente_email)`, `pedido_items(pedido_id)`, `productos(categoria)` (migración `003_seguridad.sql` + init.sql)
- [x] Errores propagados: firmas del repo devuelven `error`; `ErrNoEncontrado`→404/401, resto→500 (nunca lista vacía silenciosa)

## U2-T4 · Inyección de dependencias y microservicio seguro

> DI por interfaces en toda la cadena + transacción ACID del checkout + hardening.

- [x] Interfaces `DBRepository`/`CacheRepository`; `PostgresRepository`/`RedisCache`; structs de controladores; `NewControllers` en `main.go`
- [x] `POST /api/checkout` ACID: `FOR UPDATE` + descuento de stock + `pedidos`/`pedido_items`, ROLLBACK → 400/500, total recalculado en servidor
- [x] Invalidación de caché tras compra (`productos:all`, `red:tree:*`) + migración `002_checkout.sql`
- [x] bcrypt de passwords (pgcrypto `crypt()/gen_salt('bf')` en migración `003_seguridad.sql` + seed; login con `CompareHashAndPassword`)
- [x] JWT real (`JWT_SECRET` en env, claims `{sub,email,rol,iat,exp}` 2h, HS256) + `middleware.RequireAuth(secret)`/`RequireAdmin()`
- [x] Protegidos `/api/red` y `/api/checkout` con el middleware (401 sin token / token adulterado)
- [x] Checkout toma la identidad del TOKEN (`c.Locals` desde claims) — verificado: `email` falso en body NO se persiste ni atribuye comisiones
- [x] Errores sanitizados: `Details` solo con `APP_ENV=dev`; `ErrCantidadInvalida` propio (400 "cantidad debe ser mayor que cero", distinto de stock)

---

# PWA — PROGRESSIVE WEB APP (capa transversal · U1 frontend + U4 despliegue)

> **Objetivo de producto:** MultiCatálogo instalable en el dispositivo (add to home
> screen) y operable sin conexión para **lectura** de catálogo y red.
>
> **Límite explícito del alcance:** la escritura transaccional (`POST /api/checkout`)
> **NO** se opera offline. El backend es ACID con `FOR UPDATE` y descuento de stock;
> encolar compras a ciegas genera pedidos fantasma y stock corrupto. Offline para
> leer, bloqueo explícito para escribir.
>
> **Restricciones de plataforma que condicionan el plan:**
> - El service worker exige **origen seguro** (HTTPS; `localhost` sólo en desarrollo).
>   Hoy el frontend se sirve con `vite dev/preview`, sin reverse proxy → la PWA no es
>   viable fuera de localhost hasta que exista PWA-6.
> - Chrome sólo ofrece "Instalar app" si hay **manifest válido + SW registrado con
>   handler `fetch`** (criterios de instalabilidad). El manifest solo (PWA-2) no instala.
> - iOS no implementa `beforeinstallprompt`: requiere `apple-touch-icon` +
>   `apple-mobile-web-app-capable` + `viewport-fit=cover` (safe-area en standalone).
>
> **Decisiones de diseño tomadas en este plan:**
> - `injectManifest` (service worker escrito en TypeScript) y no `generateSW`:
>   permite testear la política de caché como funciones puras y controlar el
>   fallback offline. Alineado con el principio "funciones puras testeables sin I/O".
> - Mismo origen: el reverse proxy expone `/api` hacia `backend:3000`. Evita CORS,
>   simplifica el scope del SW y deja el JWT en un único origen.
> - Política de caché **por lectura**, no global. `/api/health` nunca se cachea;
>   `/api/checkout` nunca entra a caché.

## PWA-1 · Harness de testeo y política de caché como función pura

> El frontend no tiene runner de tests. Se instala antes de escribir lógica de caché,
> para que la política de estrategias quede cubierta por tests desde el primer día.

- [x] Vitest configurado en `frontend` (versión compatible con la de Vite en uso — verificar peer deps), scripts `npm test` y `npm run test:watch`
- [x] `src/pwa/cachePolicy.ts`: funciones puras que resuelven **estrategia + nombre de caché** a partir de la URL de la request (sin I/O, sin estado global)
- [x] Tests unitarios de `cachePolicy.ts`: `/api/productos` → NetworkFirst · `/api/productos/:id` → NetworkFirst · `/api/red` → StaleWhileRevalidate · `/api/health` → NetworkOnly · `/api/checkout` y cualquier `POST` → excluida de caché
- [x] `npm test` verde y `npm run lint` sin errores ni warnings

## PWA-2 · Manifiesto, iconos y metadatos de instalación

> Deja la app declarable. Todavía no instalable: falta el service worker (PWA-3).

- [x] `frontend/public/manifest.webmanifest`: `name`, `short_name`, `description`, `lang: "es"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `display_override`, `background_color`, `theme_color`, `orientation`, `categories`, `shortcuts` (Tienda, Carrito)
- [x] Iconos PNG generados: 192x192, 512x512 y 512x512 con `purpose: "maskable"` (logo con zona segura del 20%) + `apple-touch-icon` 180x180
- [x] `index.html`: `<link rel="manifest">`, `<meta name="theme-color">`, `<meta name="color-scheme">`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-touch-icon` y `viewport` con `viewport-fit=cover`
- [x] `vite.config.ts`: `VitePWA` con `registerType: 'prompt'`, `injectManifest`, `includeAssets` (favicon + iconos) y `manifest` consumido desde `public/`
- [ ] Manifest validado sin errores en DevTools → Application → Manifest
- [x] `npm run build` emite `dist/manifest.webmanifest` y los iconos dentro de `dist/`

## PWA-3 · Service worker: app shell, navegación y runtime caching

> Con esta fase la app cumple los criterios de instalabilidad de Chrome.

- [x] `frontend/src/sw.ts` con Workbox (`injectManifest`): precache del build incluyendo `manifest.webmanifest` e íconos
- [x] `navigateFallback: '/index.html'` + denylist de `/api` — navegación SPA en deep links (`/producto/:id`, `/carrito`, `/mi-red`)
- [x] Runtime caching gobernado por `cachePolicy.ts` (PWA-1): `productos` NetworkFirst (timeout 3s) · `red` StaleWhileRevalidate · `producto/:id` NetworkFirst · fuentes de Google CacheFirst · `/api/health` NetworkOnly
- [x] Cachés versionados por hash de build; purga de cachés viejas en `activate` (`cleanupOutdatedCaches`)
- [x] Fuentes: auto-alojar Outfit en `public/fonts` (recomendado) o, en su defecto, CacheFirst explícito — la dependencia externa de `fonts.googleapis.com` hoy rompe el offline
- [x] SW registrado en `src/main.tsx` vía `virtual:pwa-register`
- [ ] Verificado sobre build real (`npm run build && npm run preview`) — en dev Workbox no emite SW salvo `devOptions.enabled`
- [ ] **Criterio de instalación:** Chrome ofrece "Instalar app" (manifest + SW activo con handler `fetch`)

## PWA-4 · Resiliencia offline en la app (UX + contrato de red)

> El service worker guarda datos; la aplicación debe **explicar** que esos datos son cacheados.

- [x] `services/http.ts`: distinguir fallo de red (`TypeError` de `fetch`) de error HTTP → `NetworkError` tipado; la red caída nunca se reporta como `ApiError` genérico
- [x] Hook `useOnlineStatus` (`navigator.onLine` + eventos `online`/`offline`)
- [x] Banner global "Sin conexión — mostrando datos guardados" montado en `Layout`
- [x] Rutas sin caché offline muestran estado vacío explícito, nunca pantalla en blanco
- [x] `Checkout.tsx` **bloquea el submit sin conexión** con mensaje explícito (no encola, no simula)
- [x] Distinción visual "dato cacheado" vs "dato real" en `MiRed`, `MisPedidos`, `AdminPedidos` y `Dashboard`

## PWA-5 · Ciclo de vida y actualizaciones controladas

> Actualizar una PWA a mitad de un checkout es pérdida de contexto. El update es explícito.

- [x] `registerType: 'prompt'` + componente `ActualizacionDisponible` con aviso de versión nueva y botón "Actualizar ahora"
- [x] Aviso `offlineReady` ("App lista para usar sin conexión")
- [x] `skipWaiting` disparado **solo** por acción del usuario; nunca automático
- [x] `controllerchange` → recarga única, preservando el carrito (ya persistido en `localStorage` por usuario)

## PWA-6 · Despliegue: imagen estática, reverse proxy, TLS y SPA fallback

> Sin esta fase la PWA no existe fuera de `localhost`: el SW exige HTTPS y los deep links exigen fallback de servidor.

- [ ] `frontend/Dockerfile` multi-stage (build con Node → `nginx:alpine`)
- [ ] `frontend/nginx.conf`: `try_files $uri $uri/ /index.html` (SPA fallback **obligatorio**), `sw.js` servido con `Cache-Control: no-cache`, assets hasheados con `immutable`, `index.html` con `no-cache`
- [ ] `docker-compose.yml` con servicios `frontend`, `backend`, `postgres` y `redis` en red común
- [ ] Proxy `/api` → `backend:3000` en el mismo origen (elimina CORS y acota el scope del SW)
- [ ] TLS: Caddy como terminador con Let's Encrypt automático (alineado con la arquitectura objetivo del semestre) o certificado en nginx — **origen seguro obligatorio**
- [ ] `VITE_API_URL` apuntando al origen público en el build de producción
- [ ] Deep link con refresh (`/producto/42`) responde 200 — no 404 — en el entorno desplegado
- [ ] Lighthouse sobre el entorno desplegado: instalable y SW activo

## PWA-7 · E2E, auditoría y documentación

- [ ] Playwright instalado; test de humo: SW registrado tras `build` + `preview`
- [ ] E2E: navegación offline del catálogo con banner visible
- [ ] E2E: checkout bloqueado offline — **no** se envía `POST /api/checkout`
- [ ] E2E: aviso de versión nueva tras un build nuevo
- [ ] `README.md` y `docs_ia/PROJECT_MAP.md` actualizados (service worker, manifest, nuevos servicios PWA)
- [ ] `docs_ia/REQUIREMENTS_CHECKLIST.md` sincronizado con esta sección

### Riesgos técnicos identificados

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `vite-plugin-pwa` puede no declarar peer deps compatibles con **Vite 8** | Falla el build | Verificar en PWA-2; fallback: `workbox-build` como paso de build propio + `sw.js` estático, sin plugin |
| SW en `localhost` sin HTTPS no es representativo | Falsos positivos/negativos | Probar siempre en el entorno con TLS de PWA-6; `localhost` es origen seguro por excepción |
| Caché del SW vs caché de Redis (backend) | Doble capa de caché con invalidaciones distintas | Redis = performance en servidor (TTL 5m/10m); SW = supervivencia offline. Nunca cachear en SW lo que el server ya invalida por evento |
| Service worker desactualizado sirviendo HTML viejo | Rutas 404 o UI rota tras deploy | `no-cache` en `sw.js` + `skipWaiting` manual (PWA-5) |
| Google Fonts externo | Offline sin tipografía y fuga a terceros | Auto-alojar las fuentes (PWA-3) |

---
