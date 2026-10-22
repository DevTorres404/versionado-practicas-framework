import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { abrirAppConServiceWorker, esperarServiceWorkerControlando, sembrarSesion } from './helpers';

/**
 * Aviso de versión nueva.
 *
 * Para que el navegador detecte una actualización tiene que cambiar el BYTES
 * del script del service worker: `injectManifest` inlinea el precache manifest
 * dentro de `sw.js`, así que un build distinto produce un `sw.js` distinto. El
 * worker nuevo instala y queda en `waiting` (no hay `skipWaiting` automático: la
 * actualización es explícita) y `workbox-window` avisa `onNeedRefresh`, que es
 * lo que enciende el cartel "Hay una versión nueva disponible".
 *
 * El archivo temporal es un SVG y no un TXT a propósito: `injectManifest` sólo
 * precachea js, css, html, svg, png y woff2 (ver `globPatterns` en
 * `vite.config.ts`). Un `.txt` se copia a `dist/` pero NO entra al precache
 * manifest, así que `sw.js` quedaría byte a byte igual y el navegador no vería
 * ninguna versión nueva.
 */

/** `npm run test:e2e` se ejecuta desde `frontend/`. */
const DIR_FRONTEND = process.cwd();

/** Archivo temporal: precacheable y eliminado en el `finally`. */
const ARCHIVO_VERSION = join(DIR_FRONTEND, 'public', 'e2e-version.svg');

/** Verifica que el cwd sea la raíz del frontend antes de compilar nada. */
const verificarDirectorio = (): void => {
  if (!existsSync(join(DIR_FRONTEND, 'package.json'))) {
    throw new Error(
      `La suite E2E esperaba ejecutarse desde frontend/, pero el cwd es ${DIR_FRONTEND}`,
    );
  }
};

/**
 * Compila el frontend a `dist/`.
 *
 * Se usa `execSync` (y no `execFileSync`) porque en Windows `npm` es un `.cmd`
 * y `execFile` no puede lanzar archivos `.cmd` sin shell.
 *
 * `VITE_API_URL='/'` replica el entorno del `webServer` de Playwright: sin
 * eso, el build de este test dejaría la app apuntando a `http://localhost:3000`
 * y contaminaría los specs que corren después.
 */
const compilar = (): void => {
  try {
    execSync('npm run build', {
      cwd: DIR_FRONTEND,
      stdio: 'pipe',
      env: { ...process.env, VITE_API_URL: '/' },
    });
  } catch (error) {
    const salida =
      error instanceof Error && 'stdout' in error
        ? String((error as { stdout?: Buffer | string }).stdout ?? '')
        : '';
    const errores =
      error instanceof Error && 'stderr' in error
        ? String((error as { stderr?: Buffer | string }).stderr ?? '')
        : '';

    throw new Error(
      `Falló "npm run build" durante el test de actualización:\n${salida}\n${errores}`,
      { cause: error },
    );
  }
};

test.describe('PWA: aviso de versión nueva', () => {
  test('aparece el aviso cuando el service worker cambia', async ({ page }) => {
    // Dos builds completos (uno para provocar la actualización y otro para
    // dejar el árbol limpio) no entran en el timeout global de 60 s.
    test.setTimeout(240_000);

    verificarDirectorio();
    // El aviso vive en el `Layout` de las rutas protegidas: sin sesión, `/`
    // redirige a /login y no hay componente montado que muestre el cartel.
    await sembrarSesion(page);
    await abrirAppConServiceWorker(page);

    try {
      writeFileSync(
        ARCHIVO_VERSION,
        `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><title>${Date.now()}</title></svg>`,
        'utf-8',
      );
      compilar();

      await page.reload();
      await esperarServiceWorkerControlando(page);

      // `update()` fuerza la comprobación salteando la caché HTTP: el aviso no
      // puede depender de cómo el servidor de preview etiquete `sw.js`.
      await page.evaluate(async () => {
        const registro = await navigator.serviceWorker.getRegistration();

        if (registro) {
          await registro.update().catch(() => undefined);
        }
      });

      // Primero se verifica que el mecanismo de actualización funcionó (hay un
      // worker nuevo esperando). Si eso ocurre pero el aviso no aparece, el bug
      // está en la UI de actualización, no en el service worker.
      await expect
        .poll(
          async () =>
            page.evaluate(async () => {
              const registro = await navigator.serviceWorker.getRegistration();
              return Boolean(registro?.waiting);
            }),
          { timeout: 30_000 },
        )
        .toBe(true);

      await expect(page.getByText(/versión nueva/i)).toBeVisible({ timeout: 30_000 });
    } finally {
      // El árbol tiene que quedar como estaba: sin el archivo temporal y con
      // `dist/` reconstruido con el contenido original.
      rmSync(ARCHIVO_VERSION, { force: true });
      compilar();
    }
  });
});
