# Despliegue con Docker

Guía para correr MultiCatálogo en un servidor con Docker. Todos los comandos
asumen que estás parado en la **raíz del repositorio** salvo que se indique otra
cosa.

> Para desarrollo local alcanza con `docker compose up -d` y abrir
> `http://localhost:8080`. Esta guía es para el servidor: dominio, TLS y
> operación.

---

## 1. Qué se despliega

| Servicio | Imagen / build | Puerto en el contenedor | Puerto en el host | Necesita acceso público |
|---|---|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 | `${POSTGRES_PORT}` (5432) | No |
| `redis` | `redis:alpine` | 6379 | `${REDIS_PORT}` (6379) | No |
| `backend` | build `./backend` (Go/Fiber) | 3000 | `${BACKEND_PORT}` (3000) | No |
| `frontend` | build `./frontend` (nginx) | 80 | `${FRONTEND_PORT}` (8080) | No (va detrás de Caddy) |
| `caddy` | `caddy:2-alpine` | 80 y 443 | 80 y 443 | **Sí** |

Dos detalles que no son obvios:

- **Caddy no está en `docker-compose.yml`.** Corre aparte porque necesita los
  puertos 80/443 del host y se conecta a la red del stack. El comando exacto
  está en el paso 6.
- La red que crea el compose se llama **`multicatalogo_multicatalogo`** (el
  proyecto es `multicatalogo` y la red también). Si usás otro nombre, Caddy
  arranca pero no resuelve `frontend` y devuelve 502.

Flujo de una request en producción:

```
navegador --443--> Caddy --(red interna)--> frontend:80 (nginx)
                                             ├── estáticos de `dist/`
                                             └── /api/* --> backend:3000
```

---

## 2. Requisitos del servidor

- Docker Engine 24+ con el plugin `docker compose` v2 (`docker compose version`).
- 2 vCPU / 2 GB de RAM / 10 GB de disco como mínimo razonable.
- Puertos **80** y **443** abiertos en el firewall y libres en el host.
- Un dominio con registro **A** (o AAAA) apuntando a la IP del servidor. Sin
  dominio se puede probar, pero **la PWA no se instala** (ver paso 7).

Instalación de Docker en Debian/Ubuntu:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # cerrar sesión y volver a entrar
```

Firewall (si usás `ufw`):

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 3. Clonar y configurar variables

```bash
git clone <URL_DEL_REPO> multicatalogo
cd multicatalogo
git checkout feat/pwa     # o `main` cuando el PR esté mergeado
```

Hay **dos archivos `.env` distintos** y cumplen funciones distintas. No los
mezcles.

### 3.1 `backend/.env` — obligatorio

El compose lo inyecta con `env_file`. **Si el archivo no existe, `docker compose
up` falla** (`env file ... not found`). Partí del ejemplo:

```bash
cp backend/.env.example backend/.env
```

Claves que lee el backend (`backend/config/db.go`, `backend/config/redis.go`,
`backend/main.go`):

| Clave | Default | Qué poner en el servidor |
|---|---|---|
| `POSTGRES_HOST` | `localhost` | **No la toques**: el compose la fuerza a `postgres` |
| `POSTGRES_PORT` | `5432` | **No la toques**: el compose la fuerza a `5432` (puerto interno) |
| `POSTGRES_USER` | `multicatalogo` | El mismo valor que en el `.env` de la raíz |
| `POSTGRES_PASSWORD` | `multicatalogo` | Una contraseña real (no la de ejemplo) |
| `POSTGRES_DB` | `multicatalogo` | `multicatalogo` |
| `POSTGRES_SSLMODE` | `disable` | `disable` (Postgres no está expuesto a internet) |
| `REDIS_HOST` | `localhost` | **No la toques**: el compose la fuerza a `redis` |
| `REDIS_PORT` | `6379` | **No la toques**: el compose la fuerza a `6379` |
| `REDIS_PASSWORD` | vacío | Solo si le ponés password a Redis |
| `PORT` | `3000` | **No la toques**: el compose la fuerza a `3000` |
| `JWT_SECRET` | *fallback hardcodeado en `main.go`* | **Obligatorio cambiarlo**. Si queda vacío, el binario usa un secreto público del repositorio y cualquiera puede firmar tokens |
| `APP_ENV` | vacío | Dejarlo vacío en producción (con `dev` el checkout loguea de más) |

Generar el secreto:

```bash
openssl rand -hex 32
```

### 3.2 `.env` en la raíz — opcional pero recomendado

El compose lo lee solo si existe. Sirve para los puertos publicados y para las
credenciales de Postgres que se interpolan en el servicio `postgres`:

```bash
cat > .env <<'EOF'
# Puertos del host. El prefijo 127.0.0.1 los publica SOLO en loopback:
# Postgres, Redis y el backend no quedan expuestos a internet.
POSTGRES_PORT=127.0.0.1:5432
REDIS_PORT=127.0.0.1:6379
BACKEND_PORT=127.0.0.1:3000
FRONTEND_PORT=127.0.0.1:8080

# Credenciales de la base (tienen que coincidir con backend/.env)
POSTGRES_USER=multicatalogo
POSTGRES_PASSWORD=cambiame-por-una-password-real
POSTGRES_DB=multicatalogo
EOF
```

Por qué el prefijo `127.0.0.1:`: el compose interpola `"${POSTGRES_PORT}:5432"`,
así que `POSTGRES_PORT=127.0.0.1:5432` produce `127.0.0.1:5432:5432`, una de las
formas válidas de Docker. El puerto sigue disponible para el host y para Caddy
por la red interna, pero no desde afuera.

Los valores de `POSTGRES_*` de este archivo **pisan** los del `backend/.env`
(el bloque `environment:` del compose gana sobre `env_file`). Mantenelos
iguales o vas a tener un backend que no puede autenticarse.

---

## 4. Construir y levantar el stack

```bash
docker compose build
docker compose up -d
```

Primera vez en un servidor lento, el build del backend (Go) y del frontend
(Vite) tarda unos minutos. Después:

```bash
docker compose ps
```

Esperado: `postgres` y `redis` en `healthy`, `backend` y `frontend` en `Up`.
Si `frontend` aparece `starting`, esperá 15 segundos: el healthcheck sondea
nginx cada 30s.

### Qué pasa con la base la primera vez

`backend/database/init.sql` se monta en `/docker-entrypoint-initdb.d/` y
**Postgres lo ejecuta solo si el volumen de datos está vacío**. Ahí se crean las
tablas y los usuarios de prueba:

| Rol | Correo | Contraseña |
|---|---|---|
| Admin | `admin@upse.edu.ec` | `123456` |
| Cliente | `cliente@upse.edu.ec` | `123456` |

**Cambiar esas contraseñas no es opcional en un servidor público.** El script
usa `crypt('123456', gen_salt('bf', 12))`; para reemplazarlas, editá
`init.sql` **antes del primer arranque** o cambiá el hash después:

```bash
docker compose exec -T postgres psql -U multicatalogo -d multicatalogo -c \
  "UPDATE usuarios SET password = crypt('NUEVA_PASSWORD', gen_salt('bf', 12)) WHERE email = 'admin@upse.edu.ec';"
```

Ojo: `init.sql` arranca con `DROP TABLE IF EXISTS`. Si el volumen ya existe,
**no se vuelve a ejecutar** (bien), y forzarlo con `down -v` **borra los datos**.

---

## 5. Verificar antes de exponerlo

```bash
# Salud del backend a través del proxy (debe traer database y redis en ok)
curl -s http://localhost:8080/api/health

# La app se sirve
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/

# Deep link: nginx tiene que devolver 200 con el index.html, no 404
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/producto/42

# El service worker NUNCA se cachea
curl -sI http://localhost:8080/sw.js | grep -i cache-control

# El manifest se sirve con su tipo correcto
curl -sI http://localhost:8080/manifest.webmanifest | grep -i content-type
```

Resultados esperados: `{"database":"ok","redis":"ok","status":"ok"}`,
`200`, `200`, `no-cache, no-store, must-revalidate`,
`application/manifest+json`.

---

## 6. TLS con Caddy (obligatorio para la PWA)

El service worker exige un **origen seguro**: HTTPS, o `localhost`. Si publicás
la app por `http://IP`, todo funciona menos la PWA (no se registra el worker, no
hay instalación ni offline).

Con un dominio real apuntando al servidor, Caddy pide el certificado de Let's
Encrypt solo. Reemplazá `app.ejemplo.com` y el email:

```bash
docker run -d \
  --name multicatalogo-caddy \
  --restart unless-stopped \
  --network multicatalogo_multicatalogo \
  -p 80:80 -p 443:443 \
  -e APP_HOST=app.ejemplo.com \
  -e ACME_EMAIL=dev@ejemplo.com \
  -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" \
  -v multicatalogo_caddy_data:/data \
  caddy:2-alpine
```

- `ACME_EMAIL` **no puede quedar vacío**: Caddy no arranca.
- El volumen `multicatalogo_caddy_data` guarda los certificados. Sin él, cada
  recreación del contenedor pide certificados nuevos y Let's Encrypt te limita
  por rate limit.
- Caddy no usa los puertos publicados del compose: dentro de la red interna
  habla con `frontend:80`.

Logs y validación:

```bash
docker logs -f multicatalogo-caddy
# La primera vez tarda unos segundos en emitir el certificado.
```

Cuando el certificado esté emitido:

```bash
curl -sI https://app.ejemplo.com/ | head -1
curl -sI https://app.ejemplo.com/sw.js | grep -i cache-control
```

### Actualizar el Caddyfile

```bash
docker restart multicatalogo-caddy
```

### Si cambiás de dominio

Caddy guarda el certificado atado al host anterior. Hay que recrear el
contenedor (el volumen puede quedar: Caddy emite el nuevo certificado y
mantiene el viejo):

```bash
docker rm -f multicatalogo-caddy
# volver a correr el `docker run` del paso 6 con el nuevo APP_HOST
```

---

## 7. Probar sin dominio (solo para validar el despliegue)

Se puede acceder por `http://IP_DEL_SERVIDOR:8080` y la app funciona: catálogo,
login, checkout. Lo que **no** funciona:

- El service worker no se registra (origen no seguro) → no hay instalación ni
  modo offline.
- El aviso "Hay una versión nueva disponible" nunca aparece.

Para una prueba real de la PWA necesitás el dominio + Caddy, o acceder por
`http://localhost` desde un túnel SSH contra el propio servidor:

```bash
ssh -L 8080:127.0.0.1:8080 usuario@servidor
# y abrir http://localhost:8080 en tu máquina
```

---

## 8. Actualizar a una versión nueva

```bash
git pull
docker compose build          # solo reconstruye lo que cambió
docker compose up -d          # recrea los contenedores afectados
docker compose ps
```

El frontend se compila dentro de la imagen (`npm ci` + `vite build`), así que un
`git pull` **no** alcanza: sin `build` seguís sirviendo la imagen vieja.

Qué ven los usuarios: el service worker detecta el `sw.js` nuevo, muestra el
cartel "Hay una versión nueva disponible" y **no** recarga solo. La recarga
ocurre cuando el usuario toca "Actualizar ahora", para no cortarle un checkout a
mitad de camino.

Si cambiaste `backend/database/init.sql` con datos ya en producción: **no se
aplica solo**. Hay que escribir la migración a mano y correrla con `psql` (ver
paso 4).

---

## 9. Operación

```bash
# Logs
docker compose logs -f backend
docker compose logs -f frontend
docker logs -f multicatalogo-caddy

# Reiniciar un servicio sin reconstruir
docker compose restart backend

# Estado y consumo
docker compose ps
docker stats --no-stream

# Backup de la base (guardalo FUERA del servidor)
docker compose exec -T postgres pg_dump -U multicatalogo multicatalogo > backup-$(date +%F).sql

# Restore
cat backup-2026-10-22.sql | docker compose exec -T postgres psql -U multicatalogo -d multicatalogo

# Apagar todo (los volúmenes se conservan)
docker compose down

# Apagar y BORRAR los datos (destructivo: la próxima vez re-ejecuta init.sql)
docker compose down -v
```

Backup automático diario con cron (ejemplo):

```bash
0 3 * * * cd /home/usuario/multicatalogo && docker compose exec -T postgres pg_dump -U multicatalogo multicatalogo > /var/backups/multicatalogo-$(date +\%F).sql
```

---

## 10. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `Bind for 0.0.0.0:5432 failed: port is already allocated` | Ya hay un Postgres (u otro proceso) en el host usando ese puerto | Definir `POSTGRES_PORT` en el `.env` de la raíz (ej. `127.0.0.1:5434`) y volver a `up -d` |
| `env file .../backend/.env not found` | Falta `backend/.env` | `cp backend/.env.example backend/.env` y completar `JWT_SECRET` |
| Caddy: `email is required` | `ACME_EMAIL` vacío | Pasarlo con `-e ACME_EMAIL=...` |
| Caddy arranca pero `/` da **502** | No resuelve `frontend` | Verificar que el contenedor esté en `multicatalogo_multicatalogo` (`docker inspect -f '{{json .NetworkSettings.Networks}}' multicatalogo-caddy`) y que el stack esté arriba |
| El certificado no se emite | DNS sin registro A, puerto 80 cerrado, o el dominio ya está detrás de otro proxy | `dig +short app.ejemplo.com` debe dar la IP del servidor; abrir 80 y 443 |
| `frontend` queda `unhealthy` | Healthcheck fallando | `docker inspect --format '{{json .State.Health}}' multicatalogo-frontend-1` y revisar los logs de la sonda |
| `/api/health` responde 502 | El backend no arrancó (DB no lista o credenciales distintas) | `docker compose logs backend`; revisar que `POSTGRES_*` del `.env` raíz coincida con `backend/.env` |
| La PWA no se instala y no hay offline | La app se está abriendo por `http://` con IP (origen no seguro) | Publicar por HTTPS con Caddy, o acceder por `localhost` (paso 7) |
| Sigue apareciendo el HTML viejo después de un deploy | `sw.js` cacheado por un proxy intermedio | Confirmar `Cache-Control: no-cache, no-store` en `/sw.js`; el nginx y Caddy ya lo fuerzan |
| Cambié `init.sql` y no veo los cambios | El volumen ya estaba inicializado | Escribir una migración con `psql`; `down -v` solo si podés perder los datos |

---

## 11. Checklist del primer despliegue

- [ ] Docker + compose v2 instalados; usuario en el grupo `docker`.
- [ ] Puertos 80/443 abiertos; 5432/6379/3000/8080 **no** expuestos a internet.
- [ ] `backend/.env` creado con `JWT_SECRET` propio.
- [ ] `.env` de la raíz con password de Postgres real y los cuatro puertos.
- [ ] Contraseñas de los usuarios seed cambiadas.
- [ ] `docker compose up -d` y los cuatro servicios `healthy`/`Up`.
- [ ] `/api/health` devuelve `database` y `redis` en `ok`.
- [ ] Dominio con registro A apuntando al servidor.
- [ ] Caddy corriendo con `APP_HOST` y `ACME_EMAIL`; certificado emitido.
- [ ] `https://<dominio>/producto/42` responde 200 (deep link).
- [ ] `https://<dominio>/sw.js` responde con `no-cache`.
- [ ] Chrome ofrece "Instalar aplicación" en el dominio con HTTPS.
- [ ] Backup de la base probado (dump + restore en una base de prueba).

---

## Referencias

- `docker-compose.yml` — definición del stack (raíz).
- `Caddyfile` — terminador TLS.
- `frontend/Dockerfile`, `frontend/nginx.conf` — imagen estática, SPA fallback y proxy `/api`.
- `backend/Dockerfile` — build multi-stage del binario Go.
- `backend/database/init.sql` — esquema y datos seed.
- `README.md` — desarrollo local y estructura del proyecto.
