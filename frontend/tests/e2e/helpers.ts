import { expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * Utilidades compartidas por la suite E2E de la PWA.
 *
 * La app guarda la sesión y el carrito en `localStorage` (ver
 * `src/services/http.ts` y `src/context/CartContext.tsx`). Para poder
 * navegar por las rutas protegidas sin depender del backend, los tests
 * siembran esa sesión ANTES de la primera navegación con `addInitScript`.
 */

/** Correo del usuario de prueba. La clave del carrito lleva este correo. */
export const EMAIL_PRUEBA = 'cliente@upse.edu.ec';

/** Rol del usuario de prueba: `cliente` (el `admin` entra al dashboard). */
export const ROL_PRUEBA = 'cliente';

/** Token JWT de mentira: la app sólo lo usa como cabecera `Authorization`. */
export const TOKEN_PRUEBA = 'token-de-prueba';

/** Clave de la sesión persistida (`src/services/http.ts`). */
export const CLAVE_SESION = 'multicatalogo_sesion';

/** Prefijo de la clave del carrito por usuario (`src/context/CartContext.tsx`). */
export const PREFIJO_CARRITO = 'multicatalogo_carrito_';

/**
 * Producto de prueba con la forma exacta de `Producto`
 * (`src/data/productos.ts`): `id`, `nombre`, `descripcion`, `precio`,
 * `categoria`, `img` y `galeria`.
 */
export const PRODUCTO_E2E = {
  id: 9001,
  nombre: 'Sérum E2E Offline',
  descripcion: 'Producto de prueba para la suite E2E de la PWA.',
  precio: 19.99,
  categoria: 'Serum',
  img: '/pwa-icons/icon-192.png',
  galeria: [] as string[],
};

/** Siembra la sesión persistida antes de cualquier navegación. */
export const sembrarSesion = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ({ clave, sesion }) => {
      window.localStorage.setItem(clave, JSON.stringify(sesion));
    },
    {
      clave: CLAVE_SESION,
      sesion: {
        user: { email: EMAIL_PRUEBA, rol: ROL_PRUEBA },
        token: TOKEN_PRUEBA,
      },
    },
  );
};

/** Siembra el carrito del usuario de prueba antes de cualquier navegación. */
export const sembrarCarrito = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ({ clave, items }) => {
      window.localStorage.setItem(clave, JSON.stringify(items));
    },
    {
      clave: `${PREFIJO_CARRITO}${EMAIL_PRUEBA}`,
      items: [{ ...PRODUCTO_E2E, cantidad: 2 }],
    },
  );
};

/**
 * Espera a que el service worker esté activo Y controlando la página.
 *
 * Sin el `controller` la página todavía no pasa por el worker: el precache
 * del shell y la caché de runtime no se usan y los tests pasarían por el
 * motivo equivocado.
 */
export const esperarServiceWorkerControlando = async (
  page: Page,
  timeout = 30_000,
): Promise<void> => {
  await page.waitForFunction(
    () => navigator.serviceWorker.controller !== null,
    undefined,
    { timeout },
  );
};

/** Espera a que exista un registro de service worker activo. */
export const esperarServiceWorkerActivo = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
};

/**
 * Crea la página y la deja con el service worker activo y controlando.
 *
 * Es el punto de partida de todos los tests que dependen de la caché: sin
 * control del worker no hay precache, y sin precache no hay shell offline.
 */
export const abrirAppConServiceWorker = async (page: Page): Promise<void> => {
  await page.goto('/');
  await esperarServiceWorkerActivo(page);
  await esperarServiceWorkerControlando(page);
};

/**
 * Corta la red del contexto y espera a que la app lo note.
 *
 * `useOnlineStatus` (la señal que usa la UI) lee `navigator.onLine`: en
 * Chromium la emulación de red offline la actualiza, así que el banner
 * "Sin conexión" aparece sin necesidad de tocar la app.
 */
export const cortarRed = async (context: BrowserContext, page: Page): Promise<void> => {
  await context.setOffline(true);
  await page.waitForFunction(() => navigator.onLine === false, undefined, {
    timeout: 10_000,
  });
};

/** Restaura la red del contexto. */
export const restaurarRed = async (context: BrowserContext): Promise<void> => {
  await context.setOffline(false);
};

/** Comprueba que el contenido de `#root` no está vacío (la app montó). */
export const expectAppMontada = async (page: Page): Promise<void> => {
  await expect(page.locator('#root')).not.toBeEmpty();
};
