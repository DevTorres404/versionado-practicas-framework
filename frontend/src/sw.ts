/// <reference lib="webworker" />

/**
 * Service worker de MultiCatálogo.
 *
 * Responsabilidades:
 *
 * 1. Precargar el build (`index.html`, bundle, fuentes e iconos) para que la
 *    app abra sin conexión y los deep links (`/producto/42`, `/carrito`,
 *    `/mi-red`) se resuelvan con el `index.html` precacheado.
 * 2. Cachear en tiempo de ejecución SOLO las lecturas que define
 *    `src/pwa/cachePolicy.ts`. Las escrituras jamás se cachean.
 *
 * La política de caché vive en un módulo puro y testeable aparte: este archivo
 * sólo la conecta con las estrategias de Workbox.
 */

import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  matchPrecache,
  precacheAndRoute,
} from 'workbox-precaching'
import { registerRoute, setCatchHandler } from 'workbox-routing'
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from 'workbox-strategies'

import { type CacheRule, isApiPath, resolveCacheRule } from './pwa/cachePolicy'

declare let self: ServiceWorkerGlobalScope

/** URL del shell de la SPA dentro del precache. */
const SHELL_URL = '/index.html'

/** Códigos de respuesta que se consideran cacheables (0 = respuesta opaca). */
const CACHEABLE_STATUSES = [0, 200]

/** Máximo de entradas por caché de runtime. */
const MAX_ENTRIES = {
  productos: 50,
  red: 20,
  assets: 100,
} as const

// ---------------------------------------------------------------------------
// 1. Precache del build
// ---------------------------------------------------------------------------

precacheAndRoute(self.__WB_MANIFEST)
// Elimina las cachés de precache de versiones anteriores del service worker.
cleanupOutdatedCaches()
// El SW toma control de las pestañas abiertas sin necesidad de recargar.
clientsClaim()

// ---------------------------------------------------------------------------
// 2. Actualización manual
// ---------------------------------------------------------------------------

// `skipWaiting` automático se descarta a propósito: actualizar a mitad de un
// checkout es pérdida de contexto. Sólo se activa el worker nuevo cuando la
// UI lo pide explícitamente (fase PWA-5) mandando el mensaje 'SKIP_WAITING'.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

// ---------------------------------------------------------------------------
// 3. Navegación SPA (deep links)
// ---------------------------------------------------------------------------

const navigationHandler = createHandlerBoundToURL(SHELL_URL)

registerRoute(
  ({ request }) => request.mode === 'navigate',
  async (options) => {
    try {
      return await navigationHandler(options)
    } catch (error) {
      // Si el handler falló (por ejemplo, no hay red), se intenta una vez más
      // el shell precacheado antes de dejar que el catch handler global
      // responda 503.
      const cachedShell = await matchPrecache(SHELL_URL)
      if (cachedShell) {
        return cachedShell
      }
      throw error
    }
  },
)

// ---------------------------------------------------------------------------
// 4. Cacheo de runtime por lectura
// ---------------------------------------------------------------------------

/**
 * Construye la estrategia de Workbox correspondiente a una regla de política.
 */
const createStrategy = (rule: CacheRule) => {
  switch (rule.strategy) {
    case 'network-first':
      return new NetworkFirst({
        cacheName: rule.cacheName,
        networkTimeoutSeconds: rule.networkTimeoutSeconds,
        plugins: [
          new ExpirationPlugin({
            maxEntries: MAX_ENTRIES.productos,
            maxAgeSeconds: rule.maxAgeSeconds,
          }),
          new CacheableResponsePlugin({ statuses: CACHEABLE_STATUSES }),
        ],
      })
    case 'stale-while-revalidate':
      return new StaleWhileRevalidate({
        cacheName: rule.cacheName,
        plugins: [
          new ExpirationPlugin({
            maxEntries: MAX_ENTRIES.red,
            maxAgeSeconds: rule.maxAgeSeconds,
          }),
          new CacheableResponsePlugin({ statuses: CACHEABLE_STATUSES }),
        ],
      })
    case 'cache-first':
      return new CacheFirst({
        cacheName: rule.cacheName,
        plugins: [
          new ExpirationPlugin({
            maxEntries: MAX_ENTRIES.assets,
            maxAgeSeconds: rule.maxAgeSeconds,
          }),
          new CacheableResponsePlugin({ statuses: CACHEABLE_STATUSES }),
        ],
      })
    case 'network-only':
      // NetworkOnly no usa caché: va siempre a la red (health check).
      return new NetworkOnly()
  }
}

registerRoute(
  ({ request, url, sameOrigin }) => {
    // Sólo GET: las escrituras (POST/PUT/PATCH/DELETE) jamás se cachean.
    if (request.method !== 'GET') {
      return false
    }
    // Las navegaciones las maneja la ruta de arriba.
    if (request.mode === 'navigate') {
      return false
    }
    // El matcher cubre requests del mismo origen y también APIs que viven en
    // otro origin (VITE_API_URL=http://localhost:3000 en desarrollo).
    const isApiRequest = isApiPath(url.pathname)
    if (!sameOrigin && !isApiRequest) {
      return false
    }
    return resolveCacheRule(url.href, request.method) !== null
  },
  async (options) => {
    const { request, url } = options
    const rule = resolveCacheRule(url.href, request.method)

    if (!rule) {
      // Sin regla: directo a la red, sin cachear.
      return fetch(request)
    }

    return createStrategy(rule).handle(options)
  },
)

// ---------------------------------------------------------------------------
// 5. Manejo de fallos global
// ---------------------------------------------------------------------------

setCatchHandler(async ({ request }) => {
  if (request.mode === 'navigate') {
    const cachedShell = await matchPrecache(SHELL_URL)
    if (cachedShell) {
      return cachedShell
    }
  }

  // La capa de servicios de la app (`apiFetch`) espera JSON en las respuestas
  // de error. Si el origen es la API, se responde JSON para que el mensaje
  // "sin conexión" llegue tipado al componente en vez de un error genérico.
  if (isApiPath(new URL(request.url).pathname)) {
    return new Response(
      JSON.stringify({
        message: 'Sin conexión y sin datos guardados para esta consulta.',
        offline: true,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Offline': '1',
        },
      },
    )
  }

  return new Response('Sin conexión y sin contenido disponible en caché.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
})
