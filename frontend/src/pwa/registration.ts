import { registerSW } from 'virtual:pwa-register'

/**
 * Registro del service worker y estado observable.
 *
 * La fase PWA-5 monta la UI de actualización ("hay una versión nueva",
 * "listo para usar sin conexión"). Para que esa UI no tenga que tocar
 * `main.tsx` ni el service worker, este módulo expone un estado mínimo y
 * observable: `subscribePwaState` para suscribirse, `getPwaState` para leer
 * el estado actual y `registerPwa` para arrancar el registro.
 *
 * Además, este módulo es el único puente entre la app y el service worker
 * para dos acciones que el worker no puede initiates solo:
 *
 * - `setUserPartition`: comunica quién es el usuario autenticado, para que el
 *   worker purgue la caché del árbol de referidos de la cuenta anterior.
 * - `applyUpdate`: activa el service worker nuevo cuando la UI lo approves.
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

/**
 * Función que activa el service worker nuevo.
 *
 * La devuelve `registerSW` de `virtual:pwa-register`. Se guarda en una
 * variable de módulo para que `applyUpdate` pueda llamarla sin que el
 * componente de UI tenga que conocer el plugin.
 */
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null

/**
 * ¿El usuario pidió explícitamente aplicar la actualización?
 *
 * `clientsClaim()` hace que el worker tome control de las pestañas abiertas.
 * En la PRIMERA instalación eso dispara un `controllerchange` indistinguible
 * del de una actualización: recargar ahí sería hacer un refresh de la página
 * nada más entrar a la app. Por eso la recarga sólo ocurre si la actualización
 * fue solicitada desde la UI.
 */
let updateRequested = false

/** Evita que dos eventos (plugin + `controllerchange`) recarguen dos veces. */
let reloadScheduled = false

/** ¿Ya se escuchar el evento `controllerchange`? (evita listeners duplicados) */
let controllerChangeAttached = false

/** Partición de usuario comunicada al service worker. */
let currentPartition = 'anon'

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

/**
 * Estado actual de la PWA.
 *
 * Devuelve una COPIA: si devolviera la referencia interna, un consumidor
 * podría mutar el estado que ven todos los demás suscriptores.
 */
export const getPwaState = (): PwaState => ({ ...state })

/** Recarga la página una sola vez, aunque lleguen dos señales de actualización. */
const reloadOnce = (): void => {
  if (reloadScheduled) {
    return
  }
  reloadScheduled = true
  window.location.reload()
}

/**
 * Devuelve el contenedor de service workers del navegador, o `null`.
 *
 * La comprobación es defensiva a propósito: en el entorno de test (jsdom) y
 * en navegadores sin soporte, `navigator.serviceWorker` no existe o es
 * `undefined`, y leerlo sin guarda rompería la app.
 */
const getServiceWorkerContainer = (): ServiceWorkerContainer | null => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  const container: ServiceWorkerContainer | undefined = navigator.serviceWorker
  return container ?? null
}

/**
 * Normaliza la clave de usuario para usarla como partición de caché.
 *
 * El email es la identidad estable de la cuenta. Se normaliza a minúsculas y
 * sin espacios para que " Ana@Example.com " y "ana@example.com" caigan en la
 * misma partición. Sin usuario (anónimo o deslogueado) la partición es
 * `anon`.
 */
export const normalizePartition = (userKey: string | null): string => {
  if (!userKey) {
    return 'anon'
  }
  const normalized = userKey.trim().toLowerCase()
  return normalized === '' ? 'anon' : normalized
}

/**
 * Partición de usuario comunicada al service worker.
 *
 * Se expone como getter (y no como variable exportada) para que nadie pueda
 * cambiarla por fuera del módulo.
 */
export const getUserPartition = (): string => currentPartition

/**
 * Comunica al service worker cuál es el usuario autenticado.
 *
 * El worker purga las cachés con datos personales (el árbol de referidos) y
 * pasa a cachear bajo la partición del usuario nuevo. Es idempotente: la app
 * lo vuelve a llamar en cada arranque para re-afirmar la partición.
 *
 * Si el navegador no soporta service workers, no hace nada (y no rompe).
 */
export const setUserPartition = (userKey: string | null): void => {
  currentPartition = normalizePartition(userKey)

  const container = getServiceWorkerContainer()
  if (!container) {
    // Navegador sin soporte de service worker: nada que particionar.
    return
  }

  const message = { type: 'SET_USER_PARTITION', partition: currentPartition }

  const controller = container.controller
  if (controller) {
    controller.postMessage(message)
    return
  }

  // Todavía no hay worker controlando la página (arranque en frío): se espera
  // al registro activo para no perder el mensaje.
  void container.ready.then((registration) => {
    registration.active?.postMessage(message)
  })
}

/**
 * Aplica la actualización del service worker y recarga la app.
 *
 * Es la acción del botón "Actualizar ahora": el worker nuevo toma control y
 * la página se recarga UNA sola vez con la versión nueva.
 */
export const applyUpdate = async (): Promise<void> => {
  if (!updateServiceWorker) {
    // No hay service worker registrado: no hay nada que actualizar.
    return
  }

  updateRequested = true

  try {
    await updateServiceWorker(true)
  } catch (error) {
    // Si la activación falla, no queda una recarga pendiente que se dispare
    // más tarde por un `controllerchange` de otro motivo.
    updateRequested = false
    console.error('[pwa] No se pudo aplicar la actualización del service worker:', error)
  }
}

/**
 * Registra el service worker. No rompe la app si el registro falla.
 */
export const registerPwa = (): void => {
  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh: () => {
      updateState({ needRefresh: true })
    },
    onOfflineReady: () => {
      updateState({ offlineReady: true })
    },
    onNeedReload: () => {
      // El plugin avisa que el worker nuevo ya tomó control: recargamos una
      // sola vez (el guard de `reloadOnce` evita una segunda recarga).
      updateRequested = false
      reloadOnce()
    },
    onRegisterError: (error) => {
      // El registro del SW puede fallar (contexto no seguro, cuota, etc.).
      // No es motivo para romper la app: se registra y se sigue.
      console.error('[pwa] No se pudo registrar el service worker:', error)
    },
  })

  const container = getServiceWorkerContainer()
  if (container && !controllerChangeAttached) {
    controllerChangeAttached = true
    container.addEventListener('controllerchange', () => {
      // La primera instalación también dispara `controllerchange` (por
      // `clientsClaim`). Recargar ahí sería un refresh inesperado al entrar
      // a la app, así que sólo se recarga si la actualización fue pedida desde
      // la UI.
      if (!updateRequested) {
        return
      }
      updateRequested = false
      reloadOnce()
    })
  }
}
