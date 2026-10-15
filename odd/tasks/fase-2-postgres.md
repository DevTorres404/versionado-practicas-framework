# Fase 2 — Arquitectura y API Robusta (PostgreSQL)

## Objective
Replace every in-memory/mock dataset in the MultiCatálogo backend with real PostgreSQL
persistence, and make the React frontend consume the API for catalog and referral network,
without changing existing controller function signatures or the current API contract.

## Problem / Why
`Fase 2.ipynb` (DRS - Tema 3) requires relational persistence with PostgreSQL. Today all data
is hardcoded inside controllers (`backend/controllers/authController.go:36`,
`backend/controllers/prodController.go:15`) and the referral network only exists as a frontend
mock (`frontend/src/data/red.ts`). There is no `repository/`, no `config/`, no `database/`.

## Scope (authorized: "Completa")
- Docker Compose + PostgreSQL 16.
- `config/db.go` connection pool + `.env` handling + shutdown.
- `database/init.sql`: schema + seed (`usuarios`, `productos`, `referidos` self-FK).
- `repository/repository.go`: DB-backed data access.
- Controllers keep their signatures; new `GET /api/red` endpoint.
- Frontend: catalog + detail + referral network read from the API (identical JSON shapes).
- Update `REQUIREMENTS_CHECKLIST.md` when done.

## Non-goals
- No auth/token overhaul (keep `fake-jwt-*` behavior and plaintext passwords, per notebook).
- No renaming of existing JSON tags or existing routes.
- No commits/push (Fase 1 is still uncommitted — user decides).

## Constraints
- Go 1.26, Fiber v2.52.15, module `multicatalogo-backend`.
- CORS origins stay `http://localhost:5173` (+ existing IP).
- Ports: backend `:3000`, Postgres `:5432` (avoid clash with local PG if present).
- Generated technical artifacts in English identifiers/SQL; Spanish only in user-facing copy.

## Tasks
- [ ] T1 Infra: `backend/docker-compose.yml` (Postgres 16, env vars), `backend/.env.example`, `backend/.env`, `.gitignore` for `.env`.
- [ ] T2 Schema+seed: `backend/database/init.sql` — `usuarios`, `productos` (descripcion, categoria, img, galeria JSONB/ARRAY), `referidos` (id, nombre, nivel, ventas, parent_id self-FK); INSERTs seeded from current controller data + `frontend/src/data/red.ts`.
- [ ] T3 Config: `backend/config/db.go` — pgx pool, env loading, `Close()` wired to app shutdown.
- [ ] T4 Repository: `backend/repository/repository.go` — `BuscarUsuarioPorCredenciales`, `ObtenerProductos`, `ObtenerProductoPorID`, `ObtenerRed` (+ pure `construirArbol` helper, unit-tested).
- [ ] T5 Controllers: refactor `authController.go` / `prodController.go` to call repository (signatures unchanged); add `redController.go` + route `GET /api/red`.
- [ ] T6 Wiring: `backend/main.go` loads config, opens pool, graceful shutdown; `models/models.go` additive structs only.
- [ ] T7 Frontend: `productosService.ts` → real `fetch`; new `redService.ts`; `MiRed.tsx` / `Dashboard.tsx` consume it (same shapes).
- [ ] T8 Verify: `go build ./... && go vet ./... && go test ./...`, `docker compose up -d`, curl the 4+1 endpoints, `npm run lint && npm run build`, notebook validation (`UPDATE productos SET precio=99.99 WHERE id=1` → `/catalogo`).

## Route declaration
- T1–T8: **delegated** (writer trigger: 2+ non-trivial files; mapping trigger already spent on explore handoff).

## Acceptance criteria
- Backend starts only with a reachable DB; no in-memory product/user/red arrays remain.
- `POST /api/login`, `GET /api/productos`, `GET /api/productos/:id`, `GET /api/health`,
  `GET /api/red` all respond with the pre-existing JSON shapes.
- Editing a price in Postgres is visible in `/catalogo` after reload.
- `REQUIREMENTS_CHECKLIST.md` updated.

## Progress
- [x] Exploration (read-only handoff, path:line evidence)
- [ ] T1–T8 pending
- Next step: delegate writer for T1–T7, then verify (T8).
