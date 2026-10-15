# Fase 4 — Motor Transaccional ACID, Inyección de Dependencias y Concurrencia

## Objective
Convert the application into a robust transactional engine using:
1. **Dependency Injection (DI)** across controllers and repositories.
2. **ACID Transactions** in PostgreSQL for the checkout flow (`BEGIN`, `pedidos`, `pedido_items`, stock decrease, `COMMIT`/`ROLLBACK`).
3. **Concurrency with Goroutines** for asynchronous upline referral commission calculation.
4. **Cache Invalidation** in Redis for dynamic KPI updates.

## Scope (Fase 4.ipynb)
- **Paso 1: Inyección de Dependencias**:
  - `repository.DBRepository` and `repository.CacheRepository` interfaces.
  - Controllers refactored to structs: `AuthController`, `ProdController`, `RedController`, `CheckoutController`, `HealthController`.
  - `routes.SetupRoutes` and `main.go` instantiate and inject all dependencies.
- **Paso 2: Microservicio de Checkout**:
  - Endpoint `POST /api/checkout`.
  - Frontend `checkoutService.ts` and `Checkout.tsx` connected.
- **Paso 3: Transacciones ACID (PostgreSQL)**:
  - Database schema: `pedidos` and `pedido_items` with foreign keys and `productos.stock`.
  - `repository.CrearPedido` begins SQL transaction, inserts order, inserts items, decreases stock, and rolls back on failure or commits on success.
- **Paso 4: Concurrencia con Goroutines**:
  - Goroutine launched in background: `go cc.procesarComisionesAsincrono(total, email)`.
  - Updates sales in `referidos` table without blocking customer response.
- **Paso 5: Invalidación de Caché**:
  - Deletes `red:tree:{email}` and `red:tree:admin@upse.edu.ec` in Redis.
  - Next load of `/` (Dashboard) or `/mi-red` fetches updated KPIs.

## Unit & Integration Verification
- `go test -v ./...`:
  - `TestCheckoutExitoso`: verifies 201 Created and response body.
  - `TestCheckoutValidacionFalla`: verifies 400 Bad Request on empty cart.
  - `TestCheckoutRollbackEnFalla`: verifies 500 and database rollback when SQL/integrity fails.
- `npm run build`:
  - TypeScript compilation and Vite build succeeded with 0 errors.

## Didactic Fail Simulation (Class Guide)
1. **Integrity Violation (ACID Rollback)**:
   - Send cart item with non-existing `id` (e.g., `id: 99999`).
   - Foreign key constraint on `pedido_items.producto_id` aborts the transaction.
   - Frontend shows red error alert: *"Transacción Fallida (ACID Rollback)"*.
   - PostgreSQL creates neither a phantom order nor updates stock.
2. **Asynchronous Concurrency**:
   - Complete checkout with client user -> redirects to confirmation in <100ms.
   - Switch to admin -> Dashboard KPIs reflect increased network sales from the background Goroutine.
