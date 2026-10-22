# MultiCatálogo — Práctica 03 (Unidad 1, Tema 5)

Aplicación web desarrollada como práctica de la materia **Framework Programación Web** — UPSE.  
Implementa interfaces a pantalla completa, flujos de compra multinivel, autenticación con roles y carrito persistente por usuario; conectando un frontend React con una API REST en Go/Fiber.

---

## Tecnologías

| Herramienta | Versión |
|---|---|
| Go | 1.21+ |
| Fiber | v2 |
| React | 19 |
| TypeScript | 6 |
| Vite | 8 |
| React Router | v7 |
| Tailwind CSS | v4 |
| Vitest | 5 |
| Playwright | 1 |
| Docker + nginx + Caddy | multi-stage + proxy `/api` + TLS |

---

## Estructura del proyecto

```
PRACTICA_4_CONEXION/
├── backend/                        # API REST en Go + Fiber
│   ├── controllers/
│   │   ├── authController.go       # POST /api/login (devuelve email + rol)
│   │   └── prodController.go       # GET /api/productos
│   ├── models/                     # Structs de request/response
│   ├── routes/                     # Registro de rutas
│   └── main.go                     # Servidor con CORS habilitado
│
└── frontend/                       # SPA en React + Vite + TypeScript
    └── src/
        ├── App.tsx                 # Rutas, guardas ProtectedRoute / AdminRoute
        ├── context/
        │   ├── AuthContext.tsx     # Estado global: isAuthenticated + user {email, rol}
        │   └── CartContext.tsx     # Carrito persistente por usuario (localStorage)
        ├── data/
        │   ├── productos.ts        # Mock del catálogo (8 productos + interfaz Producto)
        │   └── red.ts              # Árbol MLM + funciones puras de cálculo
        ├── services/
        │   └── productosService.ts # Capa de servicios (simula fetch a la API)
        └── components/
            ├── Storefront.tsx      # Hero full-screen + categorías + destacados (F1)
            ├── Catalogo.tsx        # Búsqueda + filtros con useMemo (F3)
            ├── DetalleProducto.tsx # Ruta dinámica + galería + lightbox (F2, F4)
            ├── Carrito.tsx         # Control de cantidades + resumen (F5)
            ├── Checkout.tsx        # Formulario de envío + simulación de pago (F5)
            ├── Confirmacion.tsx    # Pantalla de confirmación con número de pedido (F5)
            ├── MiRed.tsx           # Árbol recursivo de referidos + KPIs (F6)
            ├── Dashboard.tsx       # KPIs dinámicos + top referidos + progreso de nivel (F7)
            ├── Login.tsx           # Autenticación con rol + redirección por perfil (F8)
            ├── Sidebar.tsx         # Navegación filtrada por rol (F8)
            ├── Navbar.tsx          # Insignia de rol + carrito + logout (F8)
            └── Layout.tsx          # Layout responsive con sidebar colapsable
```

---

## Cuentas de prueba

| Rol | Correo | Contraseña | Vista inicial |
|---|---|---|---|
| Admin | `admin@upse.edu.ec` | `123456` | Dashboard (`/`) |
| Cliente | `cliente@upse.edu.ec` | `123456` | Tienda (`/tienda`) |

---

## Mapa de rutas

| Ruta | Acceso | Componente |
|---|---|---|
| `/login` | Público | `Login` |
| `/` | Solo admin | `Dashboard` |
| `/mi-red` | Solo admin | `MiRed` |
| `/tienda` | Admin + cliente | `Storefront` |
| `/catalogo` | Admin + cliente | `Catalogo` |
| `/producto/:id` | Admin + cliente | `DetalleProducto` |
| `/carrito` | Admin + cliente | `Carrito` |
| `/checkout` | Admin + cliente | `Checkout` |
| `/confirmacion` | Admin + cliente | `Confirmacion` |

---

## PWA (instalable y sin conexión)

MultiCatálogo es una Progressive Web App instalable (add to home screen) y
operable **sin conexión para lectura**.

### Qué se puede hacer sin conexión

- Leer el catálogo y el detalle de producto: la respuesta de `GET /api/productos`
  queda en la caché del service worker y se sirve con estrategia *network-first*.
- Consultar el árbol de red de referidos (`/mi-red`) y mis pedidos
  (`/mis-pedidos`), cacheados con *stale-while-revalidate*.
- Navegar por la app: el shell de la SPA está precacheado, así que los deep links
  (`/producto/42`, `/carrito`, `/checkout`) se resuelven con el `index.html`
  guardado.
- Todo mientras el banner **"Sin conexión — mostrando los datos guardados"**
  está visible, para que el usuario sepa que no está mirando datos en vivo.

### Qué NO se puede hacer sin conexión

- **Confirmar la compra.** `POST /api/checkout` reserva stock con una
  transacción ACID en Go/PostgreSQL (`FOR UPDATE` + descuento de stock):
  encolar compras a ciegas generaría pedidos fantasma y stock corrupto. Sin
  conexión, el botón queda deshabilitado y la app no emite ningún `POST`. La
  regla es: **offline para leer; para escribir, bloqueo explícito.**
- Iniciar sesión (el JWT se valida en el backend) ni administrar productos.
- No hay cola de sincronización de escrituras: es una exclusión deliberada del
  alcance.

### Cómo instalarla

| Plataforma | Cómo |
|---|---|
| Chrome / Edge (escritorio y Android) | Menú ⋮ → **Instalar aplicación** (o el ícono de instalar en la barra de direcciones) |
| iOS (Safari) | **Compartir** → **Añadir a pantalla de inicio** |

iOS no implementa `beforeinstallprompt`: por eso el manifest declara
`apple-touch-icon` y `apple-mobile-web-app-capable` en `index.html`.

### Comandos

```bash
cd frontend
npm test            # suite unitaria (Vitest)
npm run test:e2e    # suite E2E (Playwright; compila y sirve dist/ en :4173)
npm run build       # compila dist/ con sw.js + manifest + íconos
npm run preview     # sirve dist/ en http://localhost:4173
npm run lint        # ESLint
```

### Despliegue

```bash
docker compose up -d      # desde la raíz del repositorio
```

Levanta backend (Go/Fiber), PostgreSQL, Redis, frontend (nginx) y **Caddy como
terminador TLS**. El nginx de `frontend/nginx.conf` proxyea `/api` hacia el
backend en el mismo origen y resuelve los deep links con fallback a `index.html`.

**El service worker exige un origen seguro (HTTPS).** `localhost` es la única
excepción que los navegadores aceptan, así que en local la PWA se registra y
funciona igual; en producción, sin TLS no se registra el worker y no hay
instalación ni modo offline (por eso el `Caddyfile` termina TLS).

### Dónde vive cada pieza

| Archivo | Qué hace |
|---|---|
| `frontend/src/sw.ts` | Service worker (Workbox con `injectManifest`): precache del shell, `navigateFallback` para deep links, runtime caching y manejo de fallos |
| `frontend/src/pwa/cachePolicy.ts` | Política de caché: funciones puras, sólo lecturas, nunca `POST`, `/api/health` nunca cacheado |
| `frontend/src/pwa/requestRouting.ts` | Gating del worker (sólo `GET`, navegaciones aparte, cross-origin sólo si es API) |
| `frontend/src/pwa/registration.ts` | Registro del SW y estado observable (`needRefresh` / `offlineReady`) |
| `frontend/src/components/BannerOffline.tsx` | Banner "Sin conexión" y aviso de reconexión |
| `frontend/src/components/ActualizacionDisponible.tsx` | Aviso "Hay una versión nueva disponible" |
| `frontend/public/manifest.webmanifest` | Web App Manifest (`start_url`, `scope`, íconos, atajos) |
| `frontend/public/pwa-icons/`, `frontend/public/fonts/` | Iconos instalables y fuentes auto-alojadas (sin dependencias externas en offline) |
| `frontend/tests/e2e/`, `frontend/playwright.config.ts` | Suite E2E: instalabilidad, offline y actualización |

### `frontend/.npmrc` — por qué existe

Declara `legacy-peer-deps=true`. `workbox-build` exige `ajv@^6` y `eslint@10`
exige `ajv@^8`: con la resolución de peers por defecto npm construye un árbol
**distinto en Windows y en Linux**, y el lockfile generado en Windows no
reproduce el árbol de la imagen de Docker (`npm ci` falla con
`Invalid: lock file's ajv@6.15.0 does not satisfy ajv@8.20.0`). Con
`legacy-peer-deps` el árbol queda determinista y el mismo lockfile sirve para
`npm install` en local y para `npm ci` dentro del contenedor.

---

## Instalación y uso

Se requieren dos terminales separadas.

### Backend

```bash
cd backend
go mod tidy
go run main.go
# API en http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App en http://localhost:5173
```

---

## Entregables implementados

| # | Entregable | Concepto aplicado |
|---|---|---|
| F1 | Storefront a pantalla completa | `min-h-screen`, hero con degradado, secciones |
| F2 | Ruta dinámica de detalle | `useParams`, rutas anidadas |
| F3 | Búsqueda + filtros del catálogo | `useMemo`, `useSearchParams` |
| F4 | Galería / lightbox | Overlay `fixed inset-0`, listener `Escape` |
| F5 | Carrito persistente + checkout + confirmación | `localStorage` por usuario, `clearCart`, `location.state` |
| F6 | Árbol multinivel de referidos | Componente recursivo `NodoReferido`, funciones puras |
| F7 | Dashboard con KPIs dinámicos | Estado global derivado, barra de progreso |
| F8 | Login con rol y navegación por rol | `AdminRoute`, Sidebar filtrado, insignia de rol |

---

## Autor

**Damián Jesús Torres Cadena**  
Docente: Ing. Carlos Muñoz  
Materia: Framework Programación Web  
Período: 2026-02 — UPSE
