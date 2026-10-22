// src/hooks/useOnlineStatus.ts
import { useSyncExternalStore } from 'react';

/**
 * Estado de conexión de la app.
 *
 * `navigator.onLine` informa si el navegador tiene conexión de red, pero NO
 * garantiza que el servidor esté accesible: puede haber WiFi sin internet. Por
 * eso la app lo usa sólo como señal de UI (banner, bloqueo del checkout) y
 * nunca como garantía de que una escritura va a funcionar.
 *
 * La conexión se pierde y se recupera sin recargar la página, así que el valor
 * se lee del navegador en cada render y se suscribe a los eventos `online` y
 * `offline` de `window`.
 */

const subscribe = (onStoreChange: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener('online', onStoreChange);
  window.addEventListener('offline', onStoreChange);

  return () => {
    window.removeEventListener('online', onStoreChange);
    window.removeEventListener('offline', onStoreChange);
  };
};

const getSnapshot = (): boolean =>
  typeof navigator !== 'undefined' ? navigator.onLine : true;

/** Sin DOM (SSR) se asume conexión: es el estado conservador para renderizar. */
const getServerSnapshot = (): boolean => true;

export const useOnlineStatus = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

export default useOnlineStatus;
