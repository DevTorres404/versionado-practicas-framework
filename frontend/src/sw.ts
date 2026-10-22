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

import {
  type CacheRule,
  isApiPath,
  isUserCacheName,
  partitionCacheName,
  resolveCacheRule,
} from './pwa/cachePolicy'
import { shouldHandleRuntimeCache } from './pwa/requestRouting'

declare let self: ServiceWorkerGlobalScope

/** URL del shell de la SPA dentro del precache. */
const SHELL_URL = '/index.html'

/**
 * Partición de usuario activa.
 *
 * `/api/red` devuelve el árbol de referidos DEL USUARIO AUTENTICADO (va en el
 * JWT). La Cache API indexa por URL solamente, así que una caché compartida
 * serviría el árbol de un usuario a otro en un dispositivo compartido: eso es
 * una fuga de datos entre cuentas, no un detalle de performance.
 *
 * Por eso la caché de la red de referidos se particiona por usuario. El
 * catálogo (`/api/productos`), los assets y el shell NO se particionan: son
 * públicos e inmutables, no dependen de quién esté logueado.
 */
let userPartition = 'anon'

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
// 2. Actualización manual y partición de usuario
// ---------------------------------------------------------------------------

/**
 * Purga todas las cachés que contienen datos por usuario.
 *
 * Se llama cuando cambia la identidad (login con otra cuenta o logout): lo
 * cacheado pertenece al usuario anterior y no puede quedar en el dispositivo.
 */
const purgeUserCaches = async (): Promise<void> => {
  const keys = await caches.keys()
  await Promise.all(keys.filter(isUserCacheName).map((name) => caches.delete(name)))
}

/**
 * Caché donde se recuerda qué identidad está activa en el dispositivo.
 *
 * El service worker se termina cuando el navegador lo evicte (tras un rato de
 * inactividad). Al volver a arrancar, la variable de módulo `userPartition`
 * vuelve a 'anon' y, sin este marcador, la app que re-afirma la identidad
 * dispararía una purga y borraría la caché del árbol de referidos del MISMO
 * usuario: el caso de uso offline (abrir la app más tarde sin red) se
 * perdería en cada arranque del worker.
 *
 * El marcador NO matchea ningún prefijo de `USER_CACHE_PREFIXES`: sobrevive a
 * la purga, que es justamente lo que tiene que hacer (el cambio de
 * identidad se decide comparando contra este valor, no contra 'anon').
 */
const IDENTITY_CACHE = 'multicatalogo-identity'
const IDENTITY_KEY = '/__multicatalogo-identity__'

/** Lee la identidad persistida (si el worker se reinició, la recupera). */
let identityPromise: Promise<void> | null = null

const readIdentity = async (): Promise<void> => {
  try {
    const cache = await caches.open(IDENTITY_CACHE)
    const response = await cache.match(IDENTITY_KEY)
    if (!response) {
      return
    }
    const stored = (await response.json()) as unknown
    if (typeof stored === 'string' && stored !== '') {
      userPartition = stored
    }
  } catch {
    // Sin marcador legible: se sigue con la partición por defecto.
  }
}

/**
 * Garantiza que la partición activa esté cargada antes de cachear.
 *
 * Se memoiza: la lectura ocurre una sola vez por vida del worker, pero todas
 * las requests esperan a la misma promesa (así la primera request tras un
 * reinicio NO cachea bajo la partición equivocada).
 */
const loadIdentity = async (): Promise<void> => {
  if (!identityPromise) {
    identityPromise = readIdentity()
  }
  await identityPromise
}

/** Persiste la identidad activa para que sobreviva al reinicio del worker. */
const saveIdentity = async (partition: string): Promise<void> => {
  try {
    const cache = await caches.open(IDENTITY_CACHE)
    await cache.put(
      IDENTITY_KEY,
      new Response(JSON.stringify(partition), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
    )
  } catch {
    // Sin cuota o sin Cache API: la purga igual se aplicó, que es lo
    // importante para la seguridad.
  }
}

/**
 * Cambia la partición de usuario y purga las cachés personales si cambió.
 *
 * La purga ocurre ANTES de setear la partición: si se invirtiera, una request
 * concurrente podría escribir en la caché vieja con la partición nueva.
 */
const applyUserPartition = async (partition: string): Promise<void> => {
  await loadIdentity()

  if (partition === userPartition) {
    // Idempotente: la app re-afirma la partición en cada arranque.
    return
  }

  await purgeUserCaches()
  userPartition = partition
  await saveIdentity(partition)
}

// Las cambios de partición se serializan: dos mensajes seguidos no pueden
// purgar y setear fuera de orden.
let partitionChain: Promise<void> = Promise.resolve()

const queueUserPartition = (partition: string): Promise<void> => {
  partitionChain = partitionChain.then(() => applyUserPartition(partition))
  return partitionChain
}

// `skipWaiting` automático se descarta a propósito: actualizar a mitad de un
// checkout es pérdida de contexto. Sólo se activa el worker nuevo cuando la
// UI lo pide explícitamente (fase PWA-5) mandando el mensaje 'SKIP_WAITING'.
self.addEventListener('message', (event) => {
  // Se aceptan las dos formas del mensaje: el string plano y el objeto con
  // `type`. `workbox-window` (usado por `virtual:pwa-register`) manda la
  // segunda; algunos clientes mandan la primera.
  const type = typeof event.data === 'string' ? event.data : event.data?.type

  if (type === 'SKIP_WAITING') {
    void self.skipWaiting()
    return
  }

  if (type === 'SET_USER_PARTITION') {
    const partition =
      typeof event.data?.partition === 'string' ? event.data.partition : 'anon'
    void queueUserPartition(partition)
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
      // El árbol de referidos es dato personal del usuario autenticado: su
      // caché se particiona por identidad. El catálogo y los assets no, porque
      // son públicos e inmutables.
      return new StaleWhileRevalidate({
        cacheName: partitionCacheName(rule.cacheName, userPartition),
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
  ({ request, url, sameOrigin }) =>
    // El gating vive en una función pura testeable (`requestRouting.ts`):
    // sólo GET, nunca navegaciones, cross-origin sólo si es API, y siempre
    // con una regla de caché que lo valga.
    shouldHandleRuntimeCache({
      url: url.href,
      method: request.method,
      mode: request.mode,
      sameOrigin,
    }),
  async (options) => {
    const { request, url } = options

    // La identidad tiene que estar resuelta antes de elegir el nombre de la
    // caché: si el worker se reinició, la partición se recupera del marcador
    // persistido y no de 'anon'.
    await loadIdentity()

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
