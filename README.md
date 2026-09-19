# Práctica 4 — Conexión Backend y Frontend (Go + React)

Aplicación web desarrollada como práctica de la materia **Framework Programación Web** — UPSE.  
Implementa la conexión entre una API REST desarrollada en Go (con Fiber) y un frontend en React, habilitando CORS y realizando peticiones al momento de montar la aplicación.

---

## Tecnologías

| Herramienta | Versión |
|---|---|
| Go | 1.21+ |
| Fiber | v2 |
| React | 19 |
| TypeScript | 6 |
| Vite | 8 |

---

## Estructura del Proyecto

- **`backend/`** — API REST en Go que expone rutas para obtener los productos del catálogo y un endpoint de login mockeado. Se encarga de manejar el CORS para el entorno de desarrollo local.
- **`frontend/`** — Aplicación cliente en React/Vite. Al iniciar, realiza una petición `fetch` al backend e imprime el estado de la conexión de forma profesional por la consola.

---

## Instalación y uso

Se requieren dos terminales separadas, una para el servidor y otra para el cliente.

### Backend

```bash
cd backend
go mod tidy
go run main.go
# Corre en http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Corre en http://localhost:5173
```

---

## Autor

**Damián Jesús Torres Cadena**  
Docente: Ing. Carlos Muñoz  
Materia: Framework Programación Web  
Período: 2026-1 — UPSE
