# Práctica 3 — Panel de Administración (Catálogo) con React + TypeScript + Vite

Aplicación web desarrollada como práctica de la materia **Framework Programación Web** — UPSE.  
Implementa un Panel de Administración interactivo para un catálogo multinivel, con enrutamiento dinámico, diseño responsivo adaptado a móviles y un tema visual cálido.

---

## Tecnologías

| Herramienta | Versión |
|---|---|
| React | 19 |
| TypeScript | 6 |
| Vite | 8 |
| Tailwind CSS | 4 |
| React Router | 7 |

---

## Componentes principales

- **`Layout.tsx`** — Contenedor estructural con diseño responsivo que envuelve el área de contenido.
- **`Sidebar.tsx`** — Menú lateral colapsable a 80px (desktop) y tipo *drawer* (móviles) con iconos.
- **`Navbar.tsx`** — Barra superior con botón toggle para el menú lateral y dropdown de usuario.
- **`Dashboard.tsx` / `Catalogo.tsx` / `MiRed.tsx` / `Carrito.tsx`** — Vistas principales mapeadas por rutas.
- **Contextos (`AuthContext`, `CartContext`)** — Manejan el estado global de autenticación y carrito.

---

## Instalación y uso

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Build de producción
npm run build
```

---

## Autor

**Damián Jesús Torres Cadena**  
Docente: Ing. Carlos Muñoz  
Materia: Framework Programación Web  
Período: 2026-1 — UPSE
