/**
 * Contrato de ruteo del service worker.
 *
 * El service worker decide, request por request, si la respuesta entra al
 * caché de runtime. Esa decisión estaba embebida en `src/sw.ts` (una función
 * inline dentro de `registerRoute`), lo que la hacía intestable: los tests
 * sólo cubrían la política de caché, no el gating del worker.
 *
 * Este módulo extrae ese gating a una función PURA: recibe los datos de la
 * request y devuelve un booleano. Sin `fetch`, sin `caches`, sin DOM.
 *
 * La función se usa en dos lugares:
 *
 * 1. `src/sw.ts` — como matcher de la ruta de runtime.
 * 2. `src/pwa/requestRouting.test.ts` — como contrato verificado.
 */

import { isApiPath, pathnameOf, resolveCacheRule } from './cachePolicy'

/** Datos mínimos de una request nécessaires para decidir su ruteo. */
export interface RuntimeRequestInfo {
  /** URL absoluta de la request. */
  url: string
  /** Método HTTP (`GET`, `POST`, ...). */
  method: string
  /** Modo de la request (`navigate`, `cors`, `same-origin`, ...). */
  mode: string
  /** ¿La request es hacia el mismo origen que la app? */
  sameOrigin: boolean
}

/**
 * ¿La request debe pasar por la caché de runtime del service worker?
 *
 * Reglas (en orden):
 *
 * 1. Sólo `GET`. Las escrituras (POST/PUT/PATCH/DELETE) jamás se cachean:
 *    el checkout del backend es ACID y cachearlo generaría pedidos fantasma.
 * 2. Las navegaciones las maneja la ruta del shell de la SPA.
 * 3. Cross-origin sólo se acepta si es un endpoint de la API. En desarrollo
 *    la API vive en otro origin (`VITE_API_URL=http://localhost:3000`); los
 *    demás recursos de terceros no se tocan.
 * 4. Tiene que existir una regla de caché para esa URL.
 * 5. Una regla `network-only` (como `/api/health`) no cachea nada: no tiene
 *    sentido pasar por la caché de runtime, va siempre a la red.
 */
export const shouldHandleRuntimeCache = (info: RuntimeRequestInfo): boolean => {
  // Regla 1 — sólo lecturas.
  if (info.method.toUpperCase() !== 'GET') {
    return false
  }

  // Regla 2 — las navegaciones las resuelve la ruta del shell.
  if (info.mode === 'navigate') {
    return false
  }

  // Regla 3 — cross-origin: sólo la API.
  if (!info.sameOrigin && !isApiPath(pathnameOf(info.url))) {
    return false
  }

  // Regla 4 — tiene que haber política de caché para esta URL.
  const rule = resolveCacheRule(info.url, info.method)
  if (!rule) {
    return false
  }

  // Regla 5 — network-only no cachea: va directo a la red.
  if (rule.strategy === 'network-only') {
    return false
  }

  return true
}
