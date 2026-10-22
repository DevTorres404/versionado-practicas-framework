# Despliegue con Docker

Guía para correr MultiCatálogo en un servidor con Docker. Todos los comandos
asumen que estás parado en la **raíz del repositorio** salvo que se indique otra
cosa.

> Para desarrollo local alcanza con `docker compose up -d` (archivo
> `docker-compose.yml`) y abrir `http://localhost:8080`. Esta guía es para el
> servidor: dominio, TLS y operación, con `docker-compose.prod.yml`.

---

## 1. Qué se despliega

| Servicio | Imagen / build | Puerto en el contenedor | Puerto en el host | Necesita acceso público |
|---|---|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 | — (solo red interna) | No |
| `redis` | `redis:alpine` | 6379 | — (solo red interna) | No |
| `backend` | build `./backend` (Go/Fiber) | 3000 | — (solo red interna) | No |
| `frontend` | build `./frontend` (nginx) | 80 | — (solo red interna) | No (va detrás de Caddy) |
| `caddy` | `caddy:2-alpine` | 80 y 443 | 80 y 443 | **Sí** |

Tres detalles que no son obvios:

- **`docker-compose.prod.yml` es autocontenido e incluye Caddy.** No se combina
  con `docker-compose.yml`: ése es el de desarrollo y publica 5432/6379/3000/8080
  en el host. Cada archivo se usa solo, con su propio `-f`.
- **Sólo `caddy` publica puertos.** Los otros cuatro servicios no tienen
  `ports:` ni `expose`: se alcanzan únicamente por la red interna, así que no
  hay que abrir 5432/6379/3000/8080 en el firewall.
- La red se declara con `name: multicatalogo`, así se llama **exactamente
  `multicatalogo`** y no `multicatalogo_multicatalogo`. Con el nombre prefijado
  Caddy arrancaba pero no resolvía `frontend` y devolvía 502.

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

### 3.2 `.env` en la raíz — obligatorio en producción

`docker-compose.prod.yml` interpola `APP_HOST`, `ACME_EMAIL` y
`POSTGRES_PASSWORD` con `${VAR:?}`: **si falta alguna, `docker compose` no
arranca** y dice cuál falta. No tienen default a propósito — un dominio
`localhost` o una password de ejemplo en producción es peor que un error claro.

```bash
cat > .env <<'EOF'
# Dominio público que sirve Caddy y email para Let's Encrypt.
# ACME_EMAIL no puede quedar vacío: Caddy no arranca.
APP_HOST=app.ejemplo.com
ACME_EMAIL=dev@ejemplo.com

# Credenciales de la base (tienen que coincidir con backend/.env)
POSTGRES_USER=multicatalogo
POSTGRES_PASSWORD=cambiame-por-una-password-real
POSTGRES_DB=multicatalogo
EOF
```

Los valores de `POSTGRES_*` de este archivo **pisan** los del `backend/.env`
(el bloque `environment:` del compose gana sobre `env_file`). Mantenelos
iguales o vas a tener un backend que no puede autenticarse.

> Nota (sólo desarrollo): en `docker-compose.yml` los puertos se publican en el
> host y se pueden restringir a loopback con `POSTGRES_PORT=127.0.0.1:5432` (y
> lo mismo para `REDIS_PORT`, `BACKEND_PORT`, `FRONTEND_PORT`). En producción
> ese truco no hace falta: ningún servicio salvo Caddy publica puertos.

---

## 4. Construir y levantar el stack

Producción (el archivo de esta guía):

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

El archivo `docker-compose.yml` (el que se usa sin `-f`) es el de
**desarrollo**: publica puertos en el host y no incluye Caddy. No mezcles los
dos archivos en la misma máquina.

Primera vez en un servidor lento, el build del backend (Go) y del frontend
(Vite) tarda unos minutos. Después:

```bash
docker compose -f docker-compose.prod.yml ps
```

Esperado: `postgres` y `redis` en `healthy`, `backend` y `frontend` en
`healthy`/`Up`, y `caddy` en `Up` con 80/443 publicados. Si `frontend` aparece
`starting`, esperá unos 15 segundos: el healthcheck corre cada 15s con
`start_period` de 10s.

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
docker compose -f docker-compose.prod.yml exec -T postgres psql -U multicatalogo -d multicatalogo -c \
  "UPDATE usuarios SET password = crypt('NUEVA_PASSWORD', gen_salt('bf', 12)) WHERE email = 'admin@upse.edu.ec';"
```

Ojo: `init.sql` arranca con `DROP TABLE IF EXISTS`. Si el volumen ya existe,
**no se vuelve a ejecutar** (bien), y forzarlo con `down -v` **borra los datos**.

> Validar sin levantar nada: `docker compose -f docker-compose.prod.yml config`.
> Resuelve variables, rutas y `env_file`, y falla con un mensaje claro si falta
> alguna (por ejemplo `required variable APP_HOST is missing a value`). Es el
> chequeo más rápido antes de un `up -d`.

---

## 5. Verificar antes de exponerlo

```bash
# Salud del backend a través de Caddy (debe traer database y redis en ok)
curl -s https://app.ejemplo.com/api/health

# La app se sirve
curl -s -o /dev/null -w '%{http_code}\n' https://app.ejemplo.com/

# Deep link: nginx tiene que devolver 200 con el index.html, no 404
curl -s -o /dev/null -w '%{http_code}\n' https://app.ejemplo.com/producto/42

# El service worker NUNCA se cachea
curl -sI https://app.ejemplo.com/sw.js | grep -i cache-control

# El manifest se sirve con su tipo correcto
curl -sI https://app.ejemplo.com/manifest.webmanifest | grep -i content-type
```

Reemplazá `app.ejemplo.com` por tu `APP_HOST`. Si todavía no apuntás el dominio
al servidor, usá `https://localhost` con el túnel al 443 del paso 7.

Resultados esperados: `{"database":"ok","redis":"ok","status":"ok"}`,
`200`, `200`, `no-cache, no-store, must-revalidate`,
`application/manifest+json`.

---

## 6. TLS con Caddy (obligatorio para la PWA)

El service worker exige un **origen seguro**: HTTPS, o `localhost`. Si publicás
la app por `http://IP`, todo funciona menos la PWA (no se registra el worker, no
hay instalación ni offline).

Con un dominio real apuntando al servidor, Caddy pide el certificado de
Let's Encrypt solo. En producción **Caddy no se levanta a mano**: es el servicio
`caddy` de `docker-compose.prod.yml`, con TLS automático. Sólo hay que poner en
el `.env` de la raíz (paso 3.2):

```dotenv
APP_HOST=app.ejemplo.com
ACME_EMAIL=dev@ejemplo.com
```

y levantar el stack (paso 4). Detalles que importan:

- `ACME_EMAIL` **no puede quedar vacío**: Caddy no arranca.
- El volumen `caddy_data` guarda los certificados. Sin él, cada recreación del
  contenedor pide certificados nuevos y Let's Encrypt te limita por rate limit.
- Caddy no usa los puertos de ningún otro servicio: dentro de la red
  `multicatalogo` habla con `frontend:80` y ahí termina el proxy.
- Si falta `APP_HOST` o `ACME_EMAIL`, `docker compose` se niega a arrancar
  antes de crear nada (ver paso 10).

Logs y validación:

```bash
docker compose -f docker-compose.prod.yml logs -f caddy
# La primera vez tarda unos segundos en emitir el certificado.
```

Cuando el certificado esté emitido:

```bash
curl -sI https://app.ejemplo.com/ | head -1
curl -sI https://app.ejemplo.com/sw.js | grep -i cache-control
```

### Actualizar el Caddyfile

El `Caddyfile` se monta de sólo lectura: se edita en el repo y se reinicia el
servicio para que Caddy lo relea.

```bash
docker compose -f docker-compose.prod.yml restart caddy
```

### Si cambiás de dominio

Caddy guarda el certificado atado al host anterior. Editá `APP_HOST` en el
`.env` y recreá el servicio:

```bash
docker compose -f docker-compose.prod.yml up -d caddy
```

El volumen `caddy_data` se conserva: Caddy emite el nuevo certificado y mantiene
el viejo.

> Nota (stack de desarrollo): `docker-compose.yml` **no** incluye Caddy. Para
> probar TLS contra ese stack hay que correrlo a mano, conectado a
> `multicatalogo_multicatalogo` (en desarrollo la red sí lleva el prefijo del
> proyecto, porque ese archivo no fija `name:`):
>
> ```bash
> docker run -d \
>   --name multicatalogo-caddy \
>   --restart unless-stopped \
>   --network multicatalogo_multicatalogo \
>   -p 80:80 -p 443:443 \
>   -e APP_HOST=app.ejemplo.com \
>   -e ACME_EMAIL=dev@ejemplo.com \
>   -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" \
>   -v multicatalogo_caddy_data:/data \
>   caddy:2-alpine
> ```

---

## 7. Probar sin dominio (solo para validar el despliegue)

El stack de producción no publica el 8080 y, sin dominio, Caddy no puede emitir
un certificado público. Dos caminos según qué quieras validar:

**Smoke test del stack (sin PWA):** levantá el compose de **desarrollo**
(`docker compose up -d`) y entrá por `http://IP_DEL_SERVIDOR:8080`. Ahí
funcionan catálogo, login y checkout. Lo que **no** funciona:

- El service worker no se registra (origen no seguro) → no hay instalación ni
  modo offline.
- El aviso "Hay una versión nueva disponible" nunca aparece.

**PWA sin dominio público:** poné `APP_HOST=localhost` (Caddy usa su CA local) y
abrí un túnel al 443 del servidor:

```bash
ssh -L 443:127.0.0.1:443 usuario@servidor
# y abrir https://localhost en tu máquina: el navegador pide confiar en la CA
# local de Caddy, y el service worker se registra porque el origen es seguro.
```

La alternativa más simple es tunelar el 8080 del stack de desarrollo y abrir
`http://localhost:8080`: `localhost` cuenta como origen seguro y la PWA se
instala igual.

---

## 8. Actualizar a una versión nueva

```bash
git pull
docker compose -f docker-compose.prod.yml build   # solo reconstruye lo que cambió
docker compose -f docker-compose.prod.yml up -d   # recrea los contenedores afectados
docker compose -f docker-compose.prod.yml ps
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
# Logs (acotados a 10 MB x 3 archivos por servicio)
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f caddy

# Reiniciar un servicio sin reconstruir
docker compose -f docker-compose.prod.yml restart backend

# Estado y consumo
docker compose -f docker-compose.prod.yml ps
docker stats --no-stream

# Backup de la base (guardalo FUERA del servidor)
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U multicatalogo multicatalogo > backup-$(date +%F).sql

# Restore
cat backup-2026-10-22.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U multicatalogo -d multicatalogo

# Apagar todo (los volúmenes pgdata, redisdata, caddy_data y caddy_config se conservan)
docker compose -f docker-compose.prod.yml down

# Apagar y BORRAR los datos y los certificados (destructivo: la próxima vez
# re-ejecuta init.sql y Caddy pide certificados nuevos)
docker compose -f docker-compose.prod.yml down -v
```

Backup automático diario con cron (ejemplo):

```bash
0 3 * * * cd /home/usuario/multicatalogo && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U multicatalogo multicatalogo > /var/backups/multicatalogo-$(date +\%F).sql
```

---

## 10. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `Bind for 0.0.0.0:80 failed: port is already allocated` | Otro proceso usa 80 u 443 (Apache/nginx del host, otro proxy) | `sudo ss -ltnp` y liberar el puerto; en producción sólo Caddy publica esos puertos |
| `required variable APP_HOST is missing a value` (o `ACME_EMAIL`, `POSTGRES_PASSWORD`) | Falta esa clave en el `.env` de la raíz | Completar el `.env` (paso 3.2) y validar con `docker compose -f docker-compose.prod.yml config` |
| `env file .../backend/.env not found` | Falta `backend/.env` | `cp backend/.env.example backend/.env` y completar `JWT_SECRET` |
| Caddy: `email is required` | `ACME_EMAIL` vacío | Completar `ACME_EMAIL` en el `.env` de la raíz (con `${VAR:?}` el stack ni arranca) |
| Caddy arranca pero `/` da **502** | No resuelve `frontend` | `docker compose -f docker-compose.prod.yml ps`; verificar que Caddy esté en la red `multicatalogo` con `docker inspect -f '{{json .NetworkSettings.Networks}}' multicatalogo-caddy-1` |
| Caddy queda sin certificado | DNS sin registro A, apuntando a otra IP, detrás de un proxy (Cloudflare en modo proxy) o puerto 80 cerrado | `dig +short app.ejemplo.com` debe dar la IP del servidor; abrir 80 y 443; `docker compose -f docker-compose.prod.yml logs caddy` muestra el error de ACME |
| `frontend` queda `unhealthy` | Healthcheck fallando | `docker inspect --format '{{json .State.Health}}' multicatalogo-frontend-1` y revisar los logs de la sonda |
| `/api/health` responde 502 | El backend no arrancó (DB no lista o credenciales distintas) | `docker compose -f docker-compose.prod.yml logs backend`; revisar que `POSTGRES_*` del `.env` raíz coincida con `backend/.env` |
| La PWA no se instala y no hay offline | La app se está abriendo por `http://` con IP (origen no seguro) | Publicar por HTTPS con Caddy, o acceder por `localhost` (paso 7) |
| Sigue apareciendo el HTML viejo después de un deploy | `sw.js` cacheado por un proxy intermedio | Confirmar `Cache-Control: no-cache, no-store` en `/sw.js`; el nginx y Caddy ya lo fuerzan |
| Cambié `init.sql` y no veo los cambios | El volumen ya estaba inicializado | Escribir una migración con `psql`; `down -v` solo si podés perder los datos |

---

## 11. Checklist del primer despliegue

- [ ] Docker + compose v2 instalados; usuario en el grupo `docker`.
- [ ] Puertos 80/443 abiertos y libres; el stack **no** publica 5432/6379/3000/8080.
- [ ] `backend/.env` creado con `JWT_SECRET` propio y `APP_ENV` sin `dev`.
- [ ] `.env` de la raíz con `APP_HOST`, `ACME_EMAIL` y password de Postgres real.
- [ ] `docker compose -f docker-compose.prod.yml config` sale sin errores.
- [ ] Contraseñas de los usuarios seed cambiadas.
- [ ] `docker compose -f docker-compose.prod.yml up -d` deja `postgres`, `redis`, `backend` y `frontend` en `healthy`, y `caddy` en `Up`.
- [ ] `/api/health` por HTTPS devuelve `database` y `redis` en `ok`.
- [ ] Dominio con registro A apuntando al servidor (sin proxy delante que rompa el desafío ACME).
- [ ] Caddy emitió el certificado y lo guardó en `caddy_data`.
- [ ] `https://<dominio>/producto/42` responde 200 (deep link).
- [ ] `https://<dominio>/sw.js` responde con `no-cache`.
- [ ] Chrome ofrece "Instalar aplicación" en el dominio con HTTPS.
- [ ] Backup de la base probado (dump + restore en una base de prueba).

---

## Referencias

- `docker-compose.prod.yml` — stack completo de producción (incluye Caddy).
- `docker-compose.yml` — stack de desarrollo (puertos publicados, sin Caddy).
- `Caddyfile` — terminador TLS.
- `frontend/Dockerfile`, `frontend/nginx.conf` — imagen estática, SPA fallback y proxy `/api`.
- `backend/Dockerfile` — build multi-stage del binario Go.
- `backend/database/init.sql` — esquema y datos seed.
- `README.md` — desarrollo local y estructura del proyecto.
