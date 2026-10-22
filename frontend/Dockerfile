# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Imagen del frontend de MultiCatálogo.
#
# Etapa 1: build con Vite (node) -> /app/dist
# Etapa 2: runtime con nginx sirviendo los estáticos y haciendo proxy de /api
# ---------------------------------------------------------------------------

# --- Etapa 1: build -------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Primero el manifiesto, el lockfile y la configuración de npm: la capa de
# `npm ci` se cachea mientras no cambien las dependencias, así que un cambio
# en el código no reinstala node_modules en cada build.
#
# `.npmrc` es obligatorio: fija `legacy-peer-deps` para que el lockfile sea
# reproducible entre Windows y Linux (ver el comentario dentro del archivo).
COPY package*.json .npmrc ./
RUN npm ci

# El build de Vite corre `tsc -b && vite build`: el type-check necesita los
# tsconfig*.json y TODAS las fuentes, así que se copia el proyecto entero.
# Lo que no debe entrar al build (node_modules, dist, .env, .git) está
# excluido en `.dockerignore`.
COPY . .

# La URL base de la API se compila dentro del bundle (Vite la inyecta en
# tiempo de build, no en runtime). El default "/" = mismo origen: el proxy de
# nginx sirve `/api` desde el mismo origen que la app.
ARG VITE_API_URL=/
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# --- Etapa 2: runtime -----------------------------------------------------
FROM nginx:alpine AS runtime

# `nginx.conf` es un FRAGMENTO de servidor: se instala en conf.d/default.conf,
# que el nginx.conf principal ya incluye dentro de su bloque `http`.
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# `wget` viene en la imagen alpine: si nginx no responde, el contenedor queda
# marcado como unhealthy y el orquestador lo puede reiniciar.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
