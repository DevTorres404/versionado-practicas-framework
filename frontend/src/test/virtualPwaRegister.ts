/**
 * Doble de prueba del módulo virtual `virtual:pwa-register`.
 *
 * `virtual:pwa-register` lo provee `vite-plugin-pwa` en tiempo de build: no
 * existe como archivo en disco, así que Vitest no lo puede resolver. Este
 * archivo es su equivalente en el entorno de test y se inyecta con un alias
 * en `vitest.config.ts`.
 *
 * Guarda las opciones con las que se registró el service worker para que los
 * tests puedan disparar los callbacks (`onNeedRefresh`, `onOfflineReady`).
 */

export interface RegisterSWOptions {
  immediate?: boolean
  onNeedReload?: () => void
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
  onRegisteredSW?: (
    swScriptUrl: string,
    registration: ServiceWorkerRegistration | undefined,
  ) => void
  onRegisterError?: (error: unknown) => void
}

let lastOptions: RegisterSWOptions | null = null

/** Últimas opciones con las que se registró el service worker. */
export const getLastRegisterOptions = (): RegisterSWOptions | null => lastOptions

/** Reinicia el doble de prueba (opciones capturadas). */
export const resetRegisterStub = (): void => {
  lastOptions = null
}

/**
 * Registro simulado: no toca el navegador y devuelve la función de
 * actualización (que en el test no hace nada).
 */
export const registerSW = (options: RegisterSWOptions = {}) => {
  lastOptions = options
  return async (): Promise<void> => {}
}
