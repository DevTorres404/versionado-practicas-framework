import { describe, expect, it } from 'vitest'

import {
  CACHE_NAMES,
  CACHEABLE_METHODS,
  NETWORK_TIMEOUT_SECONDS,
  TTL,
  USER_CACHE_PREFIXES,
  isApiPath,
  isUserCacheName,
  partitionCacheName,
  resolveCacheRule,
} from './cachePolicy'

describe('resolveCacheRule', () => {
  describe('métodos no cacheables (escrituras)', () => {
    it('nunca cachea un POST: el checkout jamás entra a caché', () => {
      const rule = resolveCacheRule('/api/checkout', 'POST')

      expect(rule).toBeNull()
    })

    it('nunca cachea un POST ni siquiera sobre endpoints cacheeables', () => {
      expect(resolveCacheRule('/api/productos', 'POST')).toBeNull()
      expect(resolveCacheRule('/api/red', 'POST')).toBeNull()
      expect(resolveCacheRule('/api/health', 'POST')).toBeNull()
    })

    it('nunca cachea PUT ni DELETE', () => {
      expect(resolveCacheRule('/api/productos/42', 'PUT')).toBeNull()
      expect(resolveCacheRule('/api/productos/42', 'DELETE')).toBeNull()
    })

    it('nunca cachea un PATCH', () => {
      expect(resolveCacheRule('/api/productos/42', 'PATCH')).toBeNull()
      expect(resolveCacheRule('/api/pedidos/7', 'PATCH')).toBeNull()
    })

    it('es insensible a mayúsculas en el método', () => {
      expect(resolveCacheRule('/api/productos', 'get')).not.toBeNull()
      expect(resolveCacheRule('/api/productos', 'post')).toBeNull()
    })

    it('expone los métodos cacheables', () => {
      expect(CACHEABLE_METHODS).toEqual(['GET'])
    })
  })

  describe('/api/health', () => {
    it('es network-only con la caché del shell', () => {
      expect(resolveCacheRule('/api/health', 'GET')).toEqual({
        strategy: 'network-only',
        cacheName: CACHE_NAMES.shell,
      })
    })
  })

  describe('/api/red', () => {
    it('es stale-while-revalidate con la caché de red', () => {
      expect(resolveCacheRule('/api/red', 'GET')).toEqual({
        strategy: 'stale-while-revalidate',
        cacheName: CACHE_NAMES.red,
        maxAgeSeconds: TTL.red,
      })
    })

    it('usa un TTL de 10 minutos', () => {
      expect(TTL.red).toBe(600)
    })
  })

  describe('/api/productos', () => {
    it('es network-first con la caché de productos para la colección', () => {
      expect(resolveCacheRule('/api/productos', 'GET')).toEqual({
        strategy: 'network-first',
        cacheName: CACHE_NAMES.productos,
        maxAgeSeconds: TTL.productos,
        networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
      })
    })

    it('es network-first con la caché de productos para un recurso', () => {
      expect(resolveCacheRule('/api/productos/42', 'GET')).toEqual({
        strategy: 'network-first',
        cacheName: CACHE_NAMES.productos,
        maxAgeSeconds: TTL.productos,
        networkTimeoutSeconds: NETWORK_TIMEOUT_SECONDS,
      })
    })

    it('usa un TTL de 5 minutos', () => {
      expect(TTL.productos).toBe(300)
    })

    it('limita la espera a la red a 3 segundos para no colgar offline', () => {
      expect(NETWORK_TIMEOUT_SECONDS).toBe(3)
      expect(
        resolveCacheRule('/api/productos', 'GET')?.networkTimeoutSeconds,
      ).toBe(3)
    })
  })

  describe('APIs desconocidas', () => {
    it('no cachea /api/pedidos', () => {
      expect(resolveCacheRule('/api/pedidos', 'GET')).toBeNull()
    })

    it('no cachea ninguna API que no esté en la lista explícita', () => {
      expect(resolveCacheRule('/api/usuarios', 'GET')).toBeNull()
      expect(resolveCacheRule('/api/checkout/status', 'GET')).toBeNull()
    })
  })

  describe('assets estáticos', () => {
    it('es cache-first para el bundle con hash', () => {
      expect(resolveCacheRule('/assets/index-abc123.js', 'GET')).toEqual({
        strategy: 'cache-first',
        cacheName: CACHE_NAMES.assets,
        maxAgeSeconds: TTL.assets,
      })
    })

    it('es cache-first para las fuentes auto-alojadas', () => {
      expect(resolveCacheRule('/fonts/outfit-latin.woff2', 'GET')).toEqual({
        strategy: 'cache-first',
        cacheName: CACHE_NAMES.assets,
        maxAgeSeconds: TTL.assets,
      })
    })

    it('es cache-first para los iconos de la PWA', () => {
      expect(resolveCacheRule('/pwa-icons/icon-512.png', 'GET')).toEqual({
        strategy: 'cache-first',
        cacheName: CACHE_NAMES.assets,
        maxAgeSeconds: TTL.assets,
      })
    })

    it('usa un TTL de un año', () => {
      expect(TTL.assets).toBe(31536000)
    })
  })

  describe('normalización de la URL', () => {
    it('resuelve igual una URL relativa que la absoluta equivalente', () => {
      expect(resolveCacheRule('/api/productos', 'GET')).toEqual(
        resolveCacheRule('http://localhost:5173/api/productos', 'GET'),
      )
    })

    it('ignora el query string: el pathname no lo incluye', () => {
      expect(resolveCacheRule('/api/productos?categoria=labial', 'GET')).toEqual(
        resolveCacheRule('/api/productos', 'GET'),
      )
    })

    it('no deja que un query string simule otra regla', () => {
      expect(resolveCacheRule('/api/pedidos?path=/api/productos', 'GET')).toBeNull()
    })
  })

  describe('todo lo demás', () => {
    it('no cachea la home', () => {
      expect(resolveCacheRule('/', 'GET')).toBeNull()
    })

    it('no cachea una ruta de la SPA', () => {
      expect(resolveCacheRule('/carrito', 'GET')).toBeNull()
    })
  })
})

describe('isApiPath', () => {
  it('reconoce los paths de la API', () => {
    expect(isApiPath('/api/productos')).toBe(true)
    expect(isApiPath('/api/health')).toBe(true)
  })

  it('no reconoce paths que no son de la API', () => {
    expect(isApiPath('/assets/index-abc123.js')).toBe(false)
    expect(isApiPath('/')).toBe(false)
  })
})

describe('partitionCacheName', () => {
  it('agrega la partición como sufijo del nombre base', () => {
    expect(partitionCacheName(CACHE_NAMES.red, 'ana@example.com')).toBe(
      'multicatalogo-red:ana@example.com',
    )
  })

  it('devuelve el nombre base sin sufijo cuando la partición está vacía', () => {
    expect(partitionCacheName(CACHE_NAMES.red, '')).toBe('multicatalogo-red')
  })

  it('genera nombres distintos por usuario', () => {
    expect(partitionCacheName(CACHE_NAMES.red, 'ana@example.com')).not.toBe(
      partitionCacheName(CACHE_NAMES.red, 'bob@example.com'),
    )
  })
})

describe('USER_CACHE_PREFIXES', () => {
  it('marca la caché del árbol de referidos como caché por usuario', () => {
    expect(USER_CACHE_PREFIXES).toContain(CACHE_NAMES.red)
  })

  it('no incluye las cachés públicas (catálogo, assets, shell)', () => {
    expect(USER_CACHE_PREFIXES).not.toContain(CACHE_NAMES.productos)
    expect(USER_CACHE_PREFIXES).not.toContain(CACHE_NAMES.assets)
    expect(USER_CACHE_PREFIXES).not.toContain(CACHE_NAMES.shell)
  })

  it('la caché particionada sigue arrancando con el prefijo de usuario', () => {
    // La purga se hace por prefijo: el nombre particionado tiene que seguir
    // matcheando el prefijo de la caché base.
    for (const prefix of USER_CACHE_PREFIXES) {
      expect(partitionCacheName(prefix, 'ana@example.com').startsWith(prefix)).toBe(true)
    }
  })
})

describe('isUserCacheName', () => {
  it('reconoce la caché base de la red y su versión particionada', () => {
    expect(isUserCacheName(CACHE_NAMES.red)).toBe(true)
    expect(isUserCacheName(partitionCacheName(CACHE_NAMES.red, 'ana@example.com'))).toBe(true)
  })

  it('no reconoce las cachés públicas', () => {
    expect(isUserCacheName(CACHE_NAMES.productos)).toBe(false)
    expect(isUserCacheName(CACHE_NAMES.assets)).toBe(false)
    expect(isUserCacheName(CACHE_NAMES.shell)).toBe(false)
  })

  it('no reconoce el marcador de identidad (debe sobrevivir a la purga)', () => {
    expect(isUserCacheName('multicatalogo-identity')).toBe(false)
  })
})

describe('CACHE_NAMES', () => {
  it('son nombres distintos y estables', () => {
    expect(new Set(Object.values(CACHE_NAMES)).size).toBe(Object.values(CACHE_NAMES).length)
    expect(CACHE_NAMES.shell).toBe('multicatalogo-shell')
  })
})
