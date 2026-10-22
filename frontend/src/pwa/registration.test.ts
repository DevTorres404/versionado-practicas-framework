import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests del módulo de registro de la PWA.
 *
 * El módulo se importa de forma DINÁMICA en cada test: `vi.resetModules()`
 * devuelve un módulo nuevo, con su propio estado, y así un test no puede
 * dejar el estado modificado para el siguiente.
 */
const importModules = async () => {
  vi.resetModules()
  const stub = await import('../test/virtualPwaRegister')
  const registration = await import('./registration')
  return { stub, registration }
}

/** Instala (o elimina) `navigator.serviceWorker` en el entorno de test. */
const setServiceWorker = (value: unknown): void => {
  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    writable: true,
    value,
  })
}

afterEach(() => {
  Reflect.deleteProperty(window.navigator, 'serviceWorker')
  vi.restoreAllMocks()
})

describe('estado de la PWA', () => {
  it('arranca sin necesidad de refrescar ni listo para usar sin conexión', async () => {
    const { registration } = await importModules()

    expect(registration.getPwaState()).toEqual({
      needRefresh: false,
      offlineReady: false,
    })
  })

  it('notifica a los suscriptores cuando cambia el estado', async () => {
    const { stub, registration } = await importModules()
    const listener = vi.fn()

    const unsubscribe = registration.subscribePwaState(listener)
    registration.registerPwa()

    stub.getLastRegisterOptions()?.onNeedRefresh?.()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(registration.getPwaState().needRefresh).toBe(true)

    unsubscribe()
  })

  it('la función de baja deja de notificar', async () => {
    const { stub, registration } = await importModules()
    const listener = vi.fn()

    const unsubscribe = registration.subscribePwaState(listener)
    unsubscribe()

    registration.registerPwa()
    stub.getLastRegisterOptions()?.onNeedRefresh?.()

    expect(listener).not.toHaveBeenCalled()
  })

  it('getPwaState devuelve una copia: mutarla no altera el estado interno', async () => {
    const { registration } = await importModules()

    const snapshot = registration.getPwaState()
    snapshot.needRefresh = true
    snapshot.offlineReady = true

    expect(registration.getPwaState()).toEqual({
      needRefresh: false,
      offlineReady: false,
    })
  })
})

describe('setUserPartition', () => {
  it('normaliza la identidad (trim + lowercase) y la envía al service worker', async () => {
    const { registration } = await importModules()
    const postMessage = vi.fn()

    setServiceWorker({
      controller: { postMessage },
      addEventListener: vi.fn(),
      ready: Promise.resolve({ active: { postMessage } }),
    })

    registration.setUserPartition('  Ana@Example.COM  ')

    expect(postMessage).toHaveBeenCalledWith({
      type: 'SET_USER_PARTITION',
      partition: 'ana@example.com',
    })
    expect(registration.getUserPartition()).toBe('ana@example.com')
  })

  it('usa la partición "anon" cuando no hay usuario', async () => {
    const { registration } = await importModules()
    const postMessage = vi.fn()

    setServiceWorker({
      controller: { postMessage },
      addEventListener: vi.fn(),
      ready: Promise.resolve({ active: { postMessage } }),
    })

    registration.setUserPartition(null)

    expect(postMessage).toHaveBeenCalledWith({
      type: 'SET_USER_PARTITION',
      partition: 'anon',
    })
    expect(registration.getUserPartition()).toBe('anon')
  })

  it('espera al service worker activo cuando todavía no hay controller', async () => {
    const { registration } = await importModules()
    const postMessage = vi.fn()

    setServiceWorker({
      controller: null,
      addEventListener: vi.fn(),
      ready: Promise.resolve({ active: { postMessage } }),
    })

    registration.setUserPartition('ana@example.com')
    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith({
        type: 'SET_USER_PARTITION',
        partition: 'ana@example.com',
      })
    })
  })

  it('no rompe cuando el navegador no soporta service workers', async () => {
    const { registration } = await importModules()

    setServiceWorker(undefined)

    expect(() => registration.setUserPartition('ana@example.com')).not.toThrow()
    expect(registration.getUserPartition()).toBe('ana@example.com')
  })
})
