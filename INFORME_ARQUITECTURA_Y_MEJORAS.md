# Informe Integral de Arquitectura, Seguridad y Mejoras del Sistema

**Proyecto:** MultiCatálogo (Frontend React + Backend Go/Fiber + PostgreSQL + Redis)  
**Fecha de Auditoría:** 15 de Octubre de 2026  
**Perfil Evaluador:** Senior Software Architect (MVP & GDE)  
**Estado Actual:** Fases 1 a 4 implementadas y operativas.

---

## 1. Resumen Ejecutivo y Diagnóstico General

El sistema ha cumplido satisfactoriamente la transición de un prototipo académico monolítico a una aplicación con persistencia relacional, inyección de dependencias, almacenamiento en caché y procesamiento asíncrono.

Sin embargo, al someter el código a un estándar de ingeniería de software para entornos de producción, se evidencian brechas de seguridad severas, riesgos de inconsistencia de datos bajo alta concurrencia (*Race Conditions*), y ausencia de mecanismos de resiliencia operativa.

A continuación se detalla el análisis exhaustivo categorizado por áreas técnicas, acompañado de su impacto y la solución técnica recomendada.

---

## 2. Seguridad y Control de Acceso (Nivel Crítico)

### 2.1 Almacenamiento de Contraseñas en Texto Plano
* **Problema:** En `database/init.sql` y `controllers/authController.go`, las contraseñas se almacenan y comparan en texto plano (`'123456'`). Si la base de datos se ve comprometida mediante un volcado accidental o una inyección SQL, las credenciales quedan expuestas de inmediato.
* **Impacto:** Vulnerabilidad crítica (CWE-256).
* **Solución Técnica:**
  - Integrar el paquete estándar de Go `golang.org/x/crypto/bcrypt`.
  - Aplicar un factor de costo (*work factor*) mínimo de 12 para generar el hash al registrar usuarios.
  - Reemplazar la consulta SQL `WHERE password = $2` por la verificación segura:
    ```go
    err := bcrypt.CompareHashAndPassword([]byte(usuario.PasswordHash), []byte(passwordIngresado))
    ```

### 2.2 Tokens Falsos vs. JWT Criptográfico Real
* **Problema:** El endpoint `/api/login` responde con cadenas estáticas: `"fake-jwt-token-123"` para administradores y `"fake-jwt-token-456"` para clientes. No existe firma digital, clave secreta ni validación de integridad.
* **Impacto:** Suplantación total de identidad (*Identity Spoofing*).
* **Solución Técnica:**
  - Implementar `github.com/golang-jwt/jwt/v5`.
  - Generar tokens firmados mediante **HMAC-SHA256** utilizando una clave privada (`JWT_SECRET`) leída desde el entorno.
  - Incluir claims estándar: `sub` (identificador del usuario), `email`, `role`, `iat` (fecha de emisión) y `exp` (expiración acotada, ej. 2 horas).

### 2.3 Ausencia de Middleware de Autorización (RBAC) en Backend
* **Problema:** En `routes/routes.go`, endpoints críticos como `GET /api/red` y `POST /api/checkout` no tienen ningún middleware de autenticación. Las protecciones actuales (`AdminRoute`, `ProtectedRoute`) existen exclusivamente en el frontend de React. Cualquier cliente HTTP externo puede invocar estas rutas sin credenciales.
* **Impacto:** Acceso no autorizado y manipulación de datos sensibles de la red.
* **Solución Técnica:**
  - Crear un middleware en Fiber (`middleware/auth.go`) que:
    1. Extraiga la cabecera `Authorization: Bearer <token>`.
    2. Valide la firma y la fecha de expiración del JWT.
    3. Inyecte el usuario y su rol en `c.Locals("currentUser")`.
    4. Rechace con HTTP 401 si el token es inválido, o HTTP 403 si un rol cliente intenta consultar recursos de administrador (`/api/red`).

### 2.4 Rate Limiting en Endpoints Sensibles
* **Problema:** `/api/login` y `/api/checkout` permiten peticiones ilimitadas por segundo.
* **Impacto:** Susceptibilidad a ataques de fuerza bruta contra contraseñas o denegación de servicio (DoS) en el motor transaccional.
* **Solución Técnica:**
  - Implementar el middleware oficial de Fiber `github.com/gofiber/fiber/v2/middleware/limiter`, configurando límites estrictos en el login (ej. máximo 5 intentos por minuto por IP) con almacenamiento en Redis.

---

## 3. Concurrencia, Transacciones y Consistencia de Datos

### 3.1 Condición de Carrera en Descuento de Stock (*Race Condition*)
* **Problema:** En `repository.CrearPedido`, el decremento de stock se realiza mediante:
  ```sql
  UPDATE productos SET stock = stock - $1 WHERE id = $2
  ```
  Si dos compradores adquieren simultáneamente la última unidad de un producto con stock 1, ambas transacciones leerán stock positivo y restarán 1, dejando el stock en `-1` (sobreventa).
* **Impacto:** Inconsistencia de inventario y pedidos huérfanos.
* **Solución Técnica:**
  - Añadir una restricción en el motor: `ALTER TABLE productos ADD CONSTRAINT chk_stock_positivo CHECK (stock >= 0);`
  - Ejecutar el update condicional atómico:
    ```sql
    UPDATE productos 
       SET stock = stock - $1 
     WHERE id = $2 AND stock >= $1;
    ```
    Si las filas afectadas (`RowsAffected`) son 0, retornar error de *"Stock insuficiente"* forzando el `ROLLBACK`.

### 3.2 Resiliencia del Proceso Asíncrono de Comisiones (*Fire-and-Forget*)
* **Problema:** En `checkoutController.go`, la Goroutine:
  ```go
  go cc.procesarComisionesAsincrono(pedido.Total, req.Cliente.Email)
  ```
  corre en memoria sin persistencia. Si el servidor se reinicia, si se corta la conexión con PostgreSQL o si la base de datos devuelve un timeout, la función imprime en el log y termina. La comisión del vendedor se pierde permanentemente.
* **Impacto:** Pérdida financiera silenciosa en la red multinivel.
* **Solución Técnica:**
  - **Patrón Outbox o Cola de Tareas:** En lugar de lanzar una Goroutine efímera, guardar un registro en una tabla `eventos_pendientes` dentro de la misma transacción ACID del pedido, o publicar el evento en **Redis Streams**.
  - Un proceso trabajador (*Worker*) lee los eventos, actualiza los referidos y reintenta con retroceso exponencial (*Exponential Backoff*) hasta que la base de datos confirme la operación.

---

## 4. Persistencia y Optimización de Consultas en PostgreSQL

### 4.1 Indexación Faltante en Claves Foráneas
* **Problema:** Las tablas `pedidos` y `pedido_items` carecen de índices en columnas que son objeto de filtros y uniones frecuentes:
  - `pedido_items(pedido_id)` y `pedido_items(producto_id)`
  - `pedidos(cliente_email)` y `pedidos(fecha)`
  - `referidos(parent_id)`
* **Impacto:** Degradación exponencial del rendimiento (*Full Table Scans*) a medida que el volumen de ventas crezca.
* **Solución Técnica:**
  ```sql
  CREATE INDEX idx_pedido_items_pedido ON pedido_items(pedido_id);
  CREATE INDEX idx_pedido_items_producto ON pedido_items(producto_id);
  CREATE INDEX idx_pedidos_cliente_email ON pedidos(cliente_email);
  CREATE INDEX idx_referidos_parent_id ON referidos(parent_id);
  ```

### 4.2 Reconstrucción del Árbol de Referidos (En Memoria vs. Base de Datos)
* **Problema:** `repository.ObtenerRed()` trae todas las filas planas de la tabla `referidos` y las procesa recursivamente en memoria de Go. Para estructuras de red grandes (miles de usuarios), esto satura el ancho de banda y la memoria del servidor.
* **Solución Técnica:**
  - Migrar la jerarquía a una consulta recursiva en PostgreSQL mediante **Common Table Expressions (CTE)**:
    ```sql
    WITH RECURSIVE ArbolRed AS (
        SELECT id, nombre, nivel, ventas, parent_id FROM referidos WHERE id = 0
        UNION ALL
        SELECT r.id, r.nombre, r.nivel, r.ventas, r.parent_id
        FROM referidos r INNER JOIN ArbolRed a ON r.parent_id = a.id
    )
    SELECT * FROM ArbolRed;
    ```

### 4.3 Paginación en el Catálogo de Productos
* **Problema:** `GET /api/productos` devuelve la tabla completa sin límites ni paginación.
* **Impacto:** Caída de rendimiento cuando el catálogo supere los cientos de artículos.
* **Solución Técnica:**
  - Implementar paginación por cursor o por desplazamiento (`LIMIT $1 OFFSET $2`) aceptando query params `?page=1&limit=12`.

---

## 5. Estrategia y Ciclo de Vida de Caché (Redis)

### 5.1 Prevención de Cache Stampede (*Dogpiling*)
* **Problema:** Cuando la clave `productos:all` expira a los 5 minutos, si 100 peticiones concurrentes llegan simultáneamente, todas encontrarán un *Cache Miss* y golpearán a PostgreSQL en el mismo instante.
* **Solución Técnica:**
  - Implementar **Singleflight** (`golang.org/x/sync/singleflight`) en Go para garantizar que solo una petición vaya a PostgreSQL mientras las demás esperan el resultado de esa única consulta para reutilizarlo.

### 5.2 Invalidación Proactiva al Modificar Productos
* **Problema:** Si un administrador actualiza el precio o el nombre de un producto directamente en la base de datos o mediante un endpoint administrativo, el catálogo seguirá entregando datos obsoletos hasta que venza el TTL de 5 minutos.
* **Solución Técnica:**
  - Implementar hooks en los métodos de mutación (creación, edición, borrado de productos) que ejecuten de forma explícita `cache.Del(ctx, "productos:all")`.

---

## 6. Frontend y Experiencia de Usuario (React + Vite)

### 6.1 Visibilidad y Validación de Stock en la UI
* **Problema:** Las tarjetas de producto en `Catalogo.tsx` y la ficha en `DetalleProducto.tsx` no muestran la disponibilidad de stock, ni deshabilitan el botón "Añadir al carrito" si el stock llega a 0.
* **Solución Técnica:**
  - Exponer la propiedad `stock` en la respuesta de la API.
  - Mostrar insignias dinámicas: *"Agotado"*, *"Últimas unidades"* o *"Disponible"*.
  - Impedir que el selector de cantidad en el carrito supere el stock real.

### 6.2 Historial de Pedidos del Cliente ("Mis Compras")
* **Problema:** Una vez finalizada la compra en `Checkout.tsx`, el usuario ve `Confirmacion.tsx`, pero los pedidos quedan inaccesibles para el cliente.
* **Solución Técnica:**
  - Crear el endpoint `GET /api/pedidos/mis-pedidos` (filtrado por el usuario autenticado).
  - Desarrollar la vista `MisPedidos.tsx` en React para consultar pedidos anteriores, estado y detalles de entrega.

### 6.3 Sistema Centralizado de Notificaciones (Toasts)
* **Problema:** Los errores se manejan con estados locales aislados en cada componente. Si la API se cae o Redis no responde, el usuario no recibe feedback consistente.
* **Solución Técnica:**
  - Integrar una librería ligera como `react-hot-toast` o `sonner` para emitir mensajes globales de error, advertencia y éxito.

---

## 7. Observabilidad, Operaciones y DevOps

### 7.1 Liveness y Readiness Probes en `/api/health`
* **Problema:** El endpoint `/api/health` actual responde `{ "status": "ok" }` de forma fija sin validar si PostgreSQL o Redis siguen vivos.
* **Solución Técnica:**
  - Dividir el health check:
    - `/health/live`: comprueba que el proceso Go esté corriendo.
    - `/health/ready`: ejecuta un `db.PingContext()` y un `redis.Ping()` para responder 200 solo si ambas dependencias de infraestructura están operativas, facilitando orquestación en Docker/Kubernetes.

### 7.2 Structured Logging
* **Problema:** Se utiliza el paquete estándar `log.Printf`, el cual emite texto plano sin formato estructurado.
* **Solución Técnica:**
  - Adoptar `log/slog` (estándar desde Go 1.21) para emitir trazas en formato JSON (`level`, `timestamp`, `route`, `latency`, `error`), permitiendo auditorías y análisis en herramientas como Datadog o Grafana Loki.

---

## 8. Elementos Superfluos y Deuda de Limpieza para Producción ("Lo que está de más")

Para que un repositorio y su despliegue sean aptos para un entorno productivo profesional, se debe eliminar todo artefacto que agregue peso muerto (*dead weight*), represente código muerto (*dead code*), o exponga configuraciones pedagógicas o locales.

### 8.1 Mocks Estáticos Residuales en el Frontend (`src/data/productos.ts` y `src/data/red.ts`)
* **Diagnóstico:** En el frontend existen archivos con arreglos estáticos completos de productos y árboles de referidos que se usaron en la Fase 1 cuando no existía el backend en Go.
* **Problema en Producción:**
  - **Aumento del Bundle de JavaScript:** Esos arrays gigantes se empaquetan en el archivo `.js` final distribuido al navegador del usuario, consumiendo ancho de banda móvil innecesario.
  - **Riesgo de Regresión:** Cualquier desarrollador nuevo puede importar por error el mock en lugar de invocar `productosService` o `redService`.
* **Acción Recomendada:** Conservar únicamente las interfaces TypeScript (`Producto`, `Referido`, etc.) y las funciones puras de cálculo de comisiones; eliminar por completo los arreglos de datos mockeados (`productos`, `redInicial`).

### 8.2 Código Muerto Comentado en el Backend (`backend/main.go`)
* **Diagnóstico:** En `backend/main.go` (líneas 95 a 160) existe un bloque entero de código comentado con la primera versión de los endpoints antes de la refactorización a capas.
* **Problema en Producción:** El código comentado degrada la legibilidad, confunde las revisiones de código (*Code Reviews*) y es una mala práctica reconocida; el historial de versiones de Git ya conserva el código pasado.
* **Acción Recomendada:** Eliminar todo bloque de código comentado en `main.go`.

### 8.3 Direcciones IP Locales Hardcodeadas en CORS
* **Diagnóstico:** En `backend/main.go` se encuentra quemada una IP de red local privada:
  ```go
  AllowOrigins: "http://172.17.82.108:5173, http://localhost:5173"
  ```
* **Problema en Producción:**
  - En un ambiente productivo (Kubernetes, AWS, Vercel), esa IP no existe o puede cambiar dinámicamente.
  - Abre un vector de riesgo si alguien levanta un frontend en esa misma subred interna.
* **Acción Recomendada:** Leer los orígenes permitidos desde la variable de entorno `CORS_ALLOWED_ORIGINS` (con fallback a `http://localhost:5173` en desarrollo).

### 8.4 Script SQL Destructivo (`init.sql`) vs. Sistema de Migraciones
* **Diagnóstico:** `database/init.sql` inicia con sentencias destructivas:
  ```sql
  DROP TABLE IF EXISTS pedido_items CASCADE;
  DROP TABLE IF EXISTS pedidos CASCADE;
  DROP TABLE IF EXISTS referidos CASCADE;
  DROP TABLE IF EXISTS productos CASCADE;
  DROP TABLE IF EXISTS usuarios CASCADE;
  ```
  seguido de `INSERT` con usuarios de contraseña `'123456'`.
* **Problema en Producción:**
  - Si por error este script se ejecuta contra la base de datos de producción o staging, **borra todas las tablas y elimina todos los pedidos reales de los clientes**.
* **Acción Recomendada:**
  - Eliminar los `DROP CASCADE` y los `INSERT` de usuarios predeterminados en ambientes productivos.
  - Reemplazar el archivo único `init.sql` por un sistema formal de migraciones versionadas (como `golang-migrate` o `goose`) que aplique migraciones incrementales (`000001_create_users.up.sql`, `000002_create_pedidos.up.sql`).

### 8.5 Directorios y Artefactos de Herramientas Locales (`.atl/`)
* **Diagnóstico:** Existe una carpeta oculta `.atl/` en la raíz del proyecto.
* **Problema en Producción:** Genera ruido en los despliegues y puede filtrar información de configuración de herramientas de desarrollo locales.
* **Acción Recomendada:** Asegurar su exclusión permanente en `.gitignore` y `.dockerignore`.

### 8.6 Exposición Innecesaria de Puertos de Bases de Datos en Docker
* **Diagnóstico:** En `docker-compose.yml`, los puertos `5432` (PostgreSQL) y `6379` (Redis) están expuestos hacia la máquina anfitriona (*host*).
* **Problema en Producción:** En un servidor de producción, la base de datos y la caché **nunca deben estar abiertas a Internet ni al host exterior**; deben residir exclusivamente dentro de una red interna aislada (*bridge network*) donde únicamente el contenedor del backend tenga visibilidad.
* **Acción Recomendada:** En producción, remover la sección `ports:` de Postgres y Redis, dejando solo `expose:` para la red interna de Docker.

---

## 9. Roadmap de Madurez y Limpieza Recomendado

| Prioridad | Área | Tarea Clave | Esfuerzo Estimado |
|---|---|---|---|
| **P0 (Inmediata)** | Seguridad | Bcrypt para passwords + JWT real con claims y expiración. | Medio |
| **P0 (Inmediata)** | Seguridad | Middleware de protección de rutas (RBAC) en Fiber. | Bajo |
| **P0 (Inmediata)** | Limpieza Prod | Eliminar `DROP CASCADE` del SQL y desacoplar IP de CORS a variable de entorno. | Bajo |
| **P1 (Alta)** | Concurrencia | Condición de carrera en stock (`WHERE stock >= $1`) y constraint en BD. | Bajo |
| **P1 (Alta)** | Limpieza Prod | Eliminar código muerto en `main.go` y depurar mocks estáticos en `src/data/`. | Bajo |
| **P1 (Alta)** | Base de Datos | Índices en claves foráneas de `pedidos` y `pedido_items`. | Bajo |
| **P2 (Media)** | Frontend / UX | Visibilidad de stock en tienda y bloqueo de compra de agotados. | Medio |
| **P2 (Media)** | Concurrencia | Reintentos o cola persistente para cálculo de comisiones. | Medio |
| **P2 (Media)** | Limpieza Prod | Aislar puertos de BD en red privada Docker. | Bajo |
| **P3 (Evolutiva)** | Arquitectura | Sistema formal de migraciones versionadas (`golang-migrate`). | Medio |
| **P3 (Evolutiva)** | Observabilidad | Readiness probe real en `/api/health` y structured logging con `slog`. | Bajo |
| **P3 (Evolutiva)** | Rendimiento | Paginación en catálogo y Singleflight para Redis. | Medio |
