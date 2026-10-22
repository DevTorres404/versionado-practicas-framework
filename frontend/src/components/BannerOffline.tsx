// src/components/BannerOffline.tsx
import { useEffect, useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/** Milisegundos que permanece visible el aviso de "conexión restablecida". */
const TIEMPO_AVISO_RESTAURADA = 3000;

/**
 * Banner global de estado de conexión.
 *
 * While there's no connection, the app keeps working with the data cached by
 * the service worker: the user has to KNOW that what they're seeing is saved
 * data and not the server's. That's the whole point of the banner.
 *
 * When the connection comes back, a short confirmation appears and hides
 * itself: the user is online again and doesn't need to keep reading about it.
 *
 * Accessibility: `role="status"` + `aria-live="polite"` so a screen reader
 * announces the change without interrupting whatever the user is doing.
 */
const BannerOffline = () => {
  const isOnline = useOnlineStatus();
  const [mostrarRestaurada, setMostrarRestaurada] = useState<boolean>(false);
  const [estadoPrevio, setEstadoPrevio] = useState<boolean>(isOnline);

  // Ajuste de estado durante el render: cuando la conexión cambia, se marca
  // el aviso correspondiente. Es el patrón que recomienda React para reaccionar
  // a un valor externo sin un efecto (y evita renders en cascada).
  if (isOnline !== estadoPrevio) {
    setEstadoPrevio(isOnline);
    // Se acaba de recuperar la conexión (veníamos de estar sin ella).
    setMostrarRestaurada(isOnline);
  }

  // El aviso de "conexión restablecida" se oculta solo.
  useEffect(() => {
    if (!mostrarRestaurada) return;

    const timer = window.setTimeout(() => {
      setMostrarRestaurada(false);
    }, TIEMPO_AVISO_RESTAURADA);

    return () => window.clearTimeout(timer);
  }, [mostrarRestaurada]);

  if (isOnline && !mostrarRestaurada) {
    return null;
  }

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto rounded-xl bg-amber-500 px-4 py-3 shadow-lg ring-1 ring-amber-600/40"
      >
        <p className="text-center text-sm font-semibold text-amber-950">
          Sin conexión — mostrando los datos guardados
        </p>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto rounded-xl bg-emerald-600 px-4 py-3 shadow-lg ring-1 ring-emerald-700/40"
    >
      <p className="text-center text-sm font-semibold text-emerald-950">
        Conexión restablecida
      </p>
    </div>
  );
};

export default BannerOffline;
