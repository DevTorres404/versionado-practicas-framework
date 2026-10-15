# Fase 3 — Arquitectura y API Robusta (Optimización con Redis)

## Objective
Integrate Redis as a caching layer using the Cache-Aside pattern to optimize recurrent read operations
(Catalog and Multilevel Referral Network), reducing latency and database load on PostgreSQL.

## Scope (Fase 3.ipynb)
- **Paso 1: Infraestructura (Docker)**: Add Redis service (`redis:alpine`) on port 6379 to `backend/docker-compose.yml`, configure healthchecks and backend dependencies. Add multi-stage `backend/Dockerfile`.
- **Paso 2: Cliente de Redis (`config/redis.go`)**: Integrate official `github.com/redis/go-redis/v9` library, load environment variables (`REDIS_*`), implement ping check (fail-fast), and graceful shutdown.
- **Paso 3: Caché en el Catálogo de Productos (`controllers/prodController.go`)**: Cache-Aside on `GetProductos` using key `productos:all` with 5 minutes TTL and `X-Cache` header.
- **Paso 4: Caché en la Red Multinivel (`controllers/redController.go`)**: Cache-Aside on `GetRed` using key `red:tree:{email_usuario}` with 10 minutes TTL and `X-Cache` header.

## Tasks
- [x] P1 Infra: `backend/docker-compose.yml` updated with `redis` and `backend` services; `Dockerfile` created; `.env` & `.env.example` updated with `REDIS_*`.
- [x] P2 Client: `backend/config/redis.go` created with `LoadRedis`, `NewRedisClient`, `CloseRedis`; unit tests in `backend/config/redis_test.go`.
- [x] P3 Catalog Cache: `backend/controllers/prodController.go` implements Cache-Aside on `GetProductos` (`productos:all`, 5m TTL).
- [x] P4 Network Tree Cache: `backend/controllers/redController.go` implements Cache-Aside on `GetRed` (`red:tree:{email_usuario}`, 10m TTL); frontend service `redService.ts`, `MiRed.tsx` and `Dashboard.tsx` pass user email.
- [x] Verification: `go test -v ./...` passed; `npm run build` passed.

## Visual Verification Guide (DevTools / Postman)
1. Start infrastructure: `docker compose -f backend/docker-compose.yml up -d`
2. Start backend: `cd backend && go run main.go`
3. Request `GET http://localhost:3000/api/red`:
   - 1st request: Cache Miss (~100ms+), header `X-Cache: MISS`.
   - 2nd request (reload): Cache Hit (~2-5ms), header `X-Cache: HIT`.
4. Request `GET http://localhost:3000/api/productos`:
   - 1st request: Cache Miss, header `X-Cache: MISS`.
   - 2nd request: Cache Hit, header `X-Cache: HIT`.
