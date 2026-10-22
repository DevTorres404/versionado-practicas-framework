import { describe, expect, it } from 'vitest'

import { shouldHandleRuntimeCache } from './requestRouting'

describe('shouldHandleRuntimeCache', () => {
  it('rechaza un POST: las escrituras nunca entran al caché', () => {
    expect(
      shouldHandleRuntimeCache({
        url: 'http://localhost:5173/api/productos',
        method: 'POST',
        mode: 'cors',
        sameOrigin: true,
      }),
    ).toBe(false)
  })

  it('rechaza una navegación: la maneja la ruta del shell de la SPA', () => {
    expect(
      shouldHandleRuntimeCache({
        url: 'http://localhost:5173/producto/42',
        method: 'GET',
        mode: 'navigate',
        sameOrigin: true,
      }),
    ).toBe(false)
  })

  it('rechaza un recurso cross-origin que no es de la API', () => {
    expect(
      shouldHandleRuntimeCache({
        url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
        method: 'GET',
        mode: 'cors',
        sameOrigin: false,
      }),
    ).toBe(false)
  })

  it('acepta un endpoint de la API en otro origin (modo desarrollo)', () => {
    expect(
      shouldHandleRuntimeCache({
        url: 'http://localhost:3000/api/productos',
        method: 'GET',
        mode: 'cors',
        sameOrigin: false,
      }),
    ).toBe(true)
  })

  it('rechaza /api/health: es network-only y no se cachea', () => {
    expect(
      shouldHandleRuntimeCache({
        url: 'http://localhost:5173/api/health',
        method: 'GET',
        mode: 'cors',
        sameOrigin: true,
      }),
    ).toBe(false)
  })

  it('acepta /api/productos del mismo origen', () => {
    expect(
      shouldHandleRuntimeCache({
        url: 'http://localhost:5173/api/productos',
        method: 'GET',
        mode: 'cors',
        sameOrigin: true,
      }),
    ).toBe(true)
  })

  it('rechaza una API desconocida: no hay política de caché para ella', () => {
    expect(
      shouldHandleRuntimeCache({
        url: 'http://localhost:5173/api/pedidos',
        method: 'GET',
        mode: 'cors',
        sameOrigin: true,
      }),
    ).toBe(false)
  })

  it('acepta los assets estáticos del build', () => {
    expect(
      shouldHandleRuntimeCache({
        url: 'http://localhost:5173/assets/index-abc.js',
        method: 'GET',
        mode: 'cors',
        sameOrigin: true,
      }),
    ).toBe(true)
  })
})
