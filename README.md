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
| TypeScript | 5 |
| Vite | 6 |
| React Router | v7 |
| Tailwind CSS | v3 |

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
