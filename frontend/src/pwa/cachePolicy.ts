/**
 * Política de caché del service worker.
 *
 * Reglas de diseño (ver `odd/tasks/pwa.md`):
 *
 * - Todo en este módulo es PURO: recibe datos y devuelve datos. No toca
 *   `fetch`, `caches`, `window` ni el reloj. Esa separación es la que permite
 *   testear la política con Vitest sin DOM, sin service worker y sin red.
 * - La caché es de LECTURA. Las escrituras (POST/PUT/PATCH/DELETE) jamás se
 *   cachean: el backend es ACID y el checkout descuenta stock, así que una
 *   compra cacheada generaría pedidos fantasma y stock corrupto.
 * - El service worker es supervivencia offline, no performance: no se cachea
 *   lo que el servidor ya invalida por evento (caché Redis).
 */

/** Estrategias soportadas por el service worker. */
export type CacheStrategy =
  | 'network-first'
  | 'stale-while-revalidate'
  | 'cache-first'
  | 'network-only'

/** Regla de caché resuelta para una request. */
export interface CacheRule {
  strategy: CacheStrategy
  cacheName: string
  /** Segundos de expiración sugeridos para la entrada. undefined = sin expiración. */
  maxAgeSeconds?: number
  /**
   * Segundos que se espera a la red antes de caer a la copia cacheada.
   *
   * Sin este límite, offline el usuario espera al timeout del navegador
   * (decenas de segundos) antes de ver los datos guardados. undefined = sin
   * límite (estrategias que no consultan la red primero).
   */
  networkTimeoutSeconds?: number
}

/**
 * Nombres de caché del service worker.
 *
 * Cada recurso del build tiene un hash en el nombre, así que un cambio de
 * contenido produce una URL nueva y la caché vieja se vuelve inservible sola.
 * No hace falta versionar a mano.
 */
export const CACHE_NAMES = {
  shell: 'multicatalogo-shell',
  productos: 'multicatalogo-productos',
  red: 'multicatalogo-red',
  assets: 'multicatalogo-assets',
} as const

/**
 * Prefijos de las cachés que contienen datos POR USUARIO.
 *
 * `/api/red` devuelve el árbol de referidos del usuario autenticado (va en el
 * JWT). La Cache API indexa por URL solamente: si dos personas usan el mismo
 * dispositivo, una cache compartida filtraría el árbol de una a la otra. Las
 * cachés con estos prefijos se purgan cuando cambia la identidad del usuario.
 *
 * El catálogo (`multicatalogo-productos`), los assets y el shell NO entran
 * acá: son públicos e inmutables, no dependen de quién esté logueado.
 *
 * Este valor debe mantenerse sincronizado con `CACHE_NAMES.red`.
 */
export const USER_CACHE_PREFIXES = ['multicatalogo-red'] as const

/**
 * Agrega la partición de usuario al nombre de una caché.
 *
 * La partición vacía devuelve el nombre base sin sufijo: así el service worker
 * puede trabajar con un único formato de nombre y no bifurcar la lógica.
 */
export const partitionCacheName = (baseCacheName: string, partition: string): string => {
  if (!partition) {
    return baseCacheName
  }
  return `${baseCacheName}:${partition}`
}

/**
 * ¿El nombre de una caché corresponde a datos por usuario?
 *
 * Es el predicado que usa el service worker para purgar: todo lo que matchee
 * con un prefijo de `USER_CACHE_PREFIXES` contiene datos personales y se
 * borra cuando cambia la identidad.
 */
export const isUserCacheName = (cacheName: string): boolean =>
  USER_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix))

/** Únicos métodos HTTP cuyas respuestas pueden cachearse. */
export const CACHEABLE_METHODS = ['GET'] as const

/**
 * Tiempos de vida (en segundos) sugeridos para cada caché.
 *
 * `productos` y `red` siguen de cerca al TTL del backend (5m / 10m): si el
 * servidor invalida por evento, el service worker no debe servir datos más
 * viejos que eso. `assets` es inmutable (nombre con hash) → un año.
 */
export const TTL = {
  productos: 300,
  red: 600,
  assets: 31536000,
} as const

/**
 * Espera máxima a la red antes de servir la copia cacheada.
 *
 * Tres segundos es el punto de equilibrio: por debajo se sirve contenido viejo
 * con red sana; por encima el usuario.offline cree que la app se cuelgó.
 */
export const NETWORK_TIMEOUT_SECONDS = 3

/** Prefijo que identifica cualquier endpoint de la API. */
export const API_PREFIX = '/api/'

/** ¿El pathname corresponde a un endpoint de la API? */
export const isApiPath = (pathname: string): boolean => pathname.startsWith(API_PREFIX)

/**
 * Extrae el pathname de una URL absoluta o relativa.
 *
 * Se usa una base fija (`http://localhost`) para tolerar URLs relativas sin
 * que `new URL` tire.
 */
export const pathnameOf = (url: string): string => {
  try {
    return new URL(url, 'http://localhost').pathname
  } catch {
    return ''
  }
}

/**
 * Resuelve la regla de caché para una request.
 *
 * Devuelve `null` cuando la request NO debe cachearse.
 */
export const resolveCacheRule = (url: string, method: string): CacheRule | null => {
  // Regla 0 — sólo GET.
  // Cualquier otro método es una escritura: cachearla podría reejecutar un
  // checkout o duplicar un pedido. Las escrituras van siempre a la red.
  if (!(CACHEABLE_METHODS as readonly string[]).includes(method.toUpperCase())) {
    return null
  }

  const pathname = pathnameOf(url)

  // Regla 1 — /api/health es la sonda de vida del backend.
  // Un health check cacheado informaría "todo sano" con el servicio caído,
  // así que nunca se cachea: va directo a la red.
  if (pathname === '/api/health') {
    return { strategy: 'network-only', cacheName: CACHE_NAMES.shell }
  }

  // Regla 2 — /api/red (árbol de referidos).
  // Cambia poco y se consulta seguido: se sirve la copia vieja al instante y
  // se refresca en segundo plano.
  if (pathname === '/api/red') {
    return {
      strategy: 'stale-while-revalidate',
      cacheName: CACHE_NAMES.red,
      maxAgeSeconds: TTL.red,
    }
  }

  // Regla 3 — /api/productos (catálogo).
  // La frescura del precio y el stock importa más que la latencia offline:
  // se intenta la red primero y se cae a la copia cacheada si falla.
  if (pathname === '/api/productos' || pathname.startsWith('/api/productos/')) {
    return {
      strategy: 'network-first',
      cacheName: CACHE_NAMES.productos,
      maxAgeSeconds: TTL.productos,
      networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
    }
  }

  // Regla 4 — cualquier otra API queda fuera.
  // No se conoce la invalidación ni los efectos de esos endpoints, así que no
  // se cachean: es preferible fallar rápido que mostrar datos incorrectos.
  if (isApiPath(pathname)) {
    return null
  }

  // Regla 5 — assets estáticos (iconos, fuentes, bundle con hash).
  // Sus nombres llevan hash de contenido: si cambia, cambia la URL.
  if (
    pathname.startsWith('/pwa-icons/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/assets/')
  ) {
    return {
      strategy: 'cache-first',
      cacheName: CACHE_NAMES.assets,
      maxAgeSeconds: TTL.assets,
    }
  }

  // Regla 6 — el resto no se cachea.
  return null
}
