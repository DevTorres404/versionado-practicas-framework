import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiFetch, getApiBaseUrl } from './http'

/**
 * Tests de la resolución de la URL base de la API.
 *
 * El despliegue (fase PWA-6) sirve la API en el mismo origen que la app:
 * `VITE_API_URL='/'` ⇒ base vacía ⇒ URLs relativas. Es lo que permite que
 * el service worker cachee `/api/*` y que el JWT viva en un único origen.
 */

/** Respuesta JSON mínima, sin depender de la implementación de `fetch` real. */
const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
  }) as unknown as Response

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('getApiBaseUrl', () => {
  it('resuelve la base vacía cuando VITE_API_URL es "/" (modo mismo-origen)', () => {
    vi.stubEnv('VITE_API_URL', '/')

    expect(getApiBaseUrl()).toBe('')
  })

  it('quita la barra final de una URL absoluta', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.ejemplo.com/')

    expect(getApiBaseUrl()).toBe('https://api.ejemplo.com')
  })

  it('mantiene el default de desarrollo cuando VITE_API_URL está vacío', () => {
    vi.stubEnv('VITE_API_URL', '')

    expect(getApiBaseUrl()).toBe('http://localhost:3000')
  })

  it('mantiene el default de desarrollo cuando VITE_API_URL no está definido', () => {
    vi.stubEnv('VITE_API_URL', undefined)

    expect(getApiBaseUrl()).toBe('http://localhost:3000')
  })
})

describe('apiFetch con base vacía (mismo origen)', () => {
  it('pide a la ruta relativa del mismo origen', async () => {
    vi.stubEnv('VITE_API_URL', '/')

    const urls: string[] = []
    const fetchMock = vi.fn(async (url: string) => {
      urls.push(url)
      return jsonResponse({ productos: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/api/productos')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(urls).toEqual(['/api/productos'])
  })

  it('devuelve el cuerpo parseado de la respuesta', async () => {
    vi.stubEnv('VITE_API_URL', '/')

    const fetchMock = vi.fn(async (url: string) => {
      void url
      return jsonResponse([{ id: 1 }])
    })
    vi.stubGlobal('fetch', fetchMock)

    const resultado = await apiFetch<Array<{ id: number }>>('/api/productos')

    expect(resultado).toEqual([{ id: 1 }])
  })
})
