# Práctica 2 — Pokédex con React + TypeScript + Vite

Aplicación web desarrollada como práctica de la materia **Framework Programación Web** — UPSE.  
Implementa una Pokédex interactiva consumiendo la [PokéAPI](https://pokeapi.co/), con pantalla de carga animada, tarjetas de Pokémon, modal de detalles y soporte para usuario.

---

## Tecnologías

| Herramienta | Versión |
|---|---|
| React | 19 |
| TypeScript | 6 |
| Vite | 8 |
| Tailwind CSS | 4 |

---

## Componentes principales

- **`App.tsx`** — Componente raíz: maneja estado global, llamadas a la API y renderizado principal.
- **`PantallaCarga`** — Splash screen animado que se muestra mientras cargan los datos.
- **`TarjetaPokemon`** — Tarjeta visual por cada Pokémon con stats, tipos e imagen.
- **`TarjetaUsuario`** — Muestra información del usuario/entrenador.
- **`Modal`** — Ventana emergente con el detalle completo de un Pokémon seleccionado.

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
