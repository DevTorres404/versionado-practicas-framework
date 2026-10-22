// src/components/ActualizacionDisponible.tsx
import { useEffect, useState } from 'react';
import {
  applyUpdate,
  getPwaState,
  subscribePwaState,
  type PwaState,
} from '../pwa/registration';

/** Milisegundos que permanece visible el aviso de "listo para usar sin conexión". */
const TIEMPO_AVISO_OFFLINE_READY = 4000;

/**
 * Avisos del ciclo de vida del service worker.
 *
 * - `needRefresh`: hay una versión nueva esperando. El usuario decide cuándo
 *   aplicarla (aplicar el worker nuevo en medio de un checkout es pérdida de
 *   contexto), así que el botón es explícito.
 * - `offlineReady`: la app ya se puede abrir sin conexión. Es información
 *   transitoria: se muestra unos segundos y se oculta sola.
 */
const ActualizacionDisponible = () => {
  const [estado, setEstado] = useState<PwaState>(() => getPwaState());
  const [mostrarOfflineReady, setMostrarOfflineReady] = useState<boolean>(false);

  useEffect(
    () =>
      subscribePwaState((nuevo) => {
        setEstado(nuevo);
        if (nuevo.offlineReady) {
          setMostrarOfflineReady(true);
        }
      }),
    [],
  );

  useEffect(() => {
    if (!mostrarOfflineReady) return;

    const timer = window.setTimeout(() => {
      setMostrarOfflineReady(false);
    }, TIEMPO_AVISO_OFFLINE_READY);

    return () => window.clearTimeout(timer);
  }, [mostrarOfflineReady]);

  const hayActualizacion = estado.needRefresh;

  if (!hayActualizacion && !mostrarOfflineReady) {
    return null;
  }

  return (
    <>
      {hayActualizacion && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto rounded-xl bg-indigo-600 px-4 py-3 shadow-lg ring-1 ring-indigo-700/40"
        >
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-center text-sm font-semibold text-white sm:text-left">
              Hay una versión nueva disponible
            </p>
            <button
              type="button"
              onClick={() => {
                void applyUpdate();
              }}
              className="w-full shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white min-h-[44px] sm:w-auto"
            >
              Actualizar ahora
            </button>
          </div>
        </div>
      )}

      {mostrarOfflineReady && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto rounded-xl bg-emerald-600 px-4 py-3 shadow-lg ring-1 ring-emerald-700/40"
        >
          <p className="text-center text-sm font-semibold text-emerald-950">
            Listo para usar sin conexión
          </p>
        </div>
      )}
    </>
  );
};

export default ActualizacionDisponible;
