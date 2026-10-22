import { registerSW } from 'virtual:pwa-register'

/**
 * Registro del service worker y estado observable.
 *
 * La fase PWA-5 monta la UI de actualización ("hay una versión nueva",
 * "listo para usar sin conexión"). Para que esa UI no tenga que tocar
 * `main.tsx` ni el service worker, este módulo expone un estado mínimo y
 * observable: `subscribePwaState` para suscribirse, `getPwaState` para leer
 * el estado actual y `registerPwa` para arrancar el registro.
 */

/** Estado observable de la PWA. */
export interface PwaState {
  /** Hay una versión nueva del service worker esperando a activarse. */
  needRefresh: boolean
  /** La app ya está cacheada y puede abrirse sin conexión. */
  offlineReady: boolean
}

type PwaListener = (state: PwaState) => void

const listeners = new Set<PwaListener>()

let state: PwaState = {
  needRefresh: false,
  offlineReady: false,
}

const notify = (): void => {
  for (const listener of listeners) {
    listener(state)
  }
}

const updateState = (patch: Partial<PwaState>): void => {
  state = { ...state, ...patch }
  notify()
}

/** Suscribe un listener al estado de la PWA. Devuelve la función de baja. */
export const subscribePwaState = (listener: PwaListener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Estado actual de la PWA. */
export const getPwaState = (): PwaState => state

/** Registra el service worker. No rompe la app si el registro falla. */
export const registerPwa = (): void => {
  registerSW({
    immediate: true,
    onNeedRefresh: () => {
      updateState({ needRefresh: true })
    },
    onOfflineReady: () => {
      updateState({ offlineReady: true })
    },
    onRegisterError: (error) => {
      // El registro del SW puede fallar (contexto no seguro, cuota, etc.).
      // No es motivo para romper la app: se registra y se sigue.
      console.error('[pwa] No se pudo registrar el service worker:', error)
    },
  })
}
