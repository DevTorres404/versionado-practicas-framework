import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de la suite E2E de la PWA (fase PWA-7).
 *
 * Los tests corren contra el BUILD real de la app (no contra el dev server):
 * el service worker sólo existe en `dist/sw.js`, y su comportamiento
 * (precache, `navigateFallback`, estrategias de caché) es justamente lo que
 * hay que verificar en un navegador de verdad.
 *
 * `localhost` es un ORIGEN SEGURO POR EXCEPCIÓN: los navegadores lo tratan
 * como `https` para el registro del service worker, así que la PWA se
 * registra igual en local. En producción el service worker EXIGE HTTPS (ver
 * el `Caddyfile` de la raíz, que termina TLS) o la app no se registra y no
 * hay modo offline.
 */
export default defineConfig({
  // Los specs viven en `tests/e2e`: la suite unitaria de Vitest sigue en
  // `src/**/*.test.ts` (ver `vitest.config.ts`).
  testDir: './tests/e2e',

  // Los tests tocan el service worker y el build: NO se paralelizan. Dos
  // workers contendiendo por el mismo registro de service worker y por el
  // mismo `dist/` producirían falsos verdes y falsos rojos.
  fullyParallel: false,
  workers: 1,

  // Un `test.only` olvidado en un commit es un bug silencioso.
  forbidOnly: true,

  reporter: [['list']],

  // Margen generoso: los tests esperan al service worker, al precache y a
  // re-registros del worker, que son procesos lentos.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:4173',
    // El service worker es parte de lo que se prueba: no se puede bloquear.
    serviceWorkers: 'allow',
    // Si el test falla, el trace guarda la traza de red y los pasos.
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Se compila y se sirve el build estático con `vite preview`.
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // `vite preview` sirve `dist/` SIN el proxy de `/api` que hace nginx en
    // el despliegue. Por eso los tests que necesitan API la mockean con
    // `context.route(...)`. Compilando con `VITE_API_URL=/` la app usa
    // URLs relativas (mismo origen), que es exactamente la topología del
    // despliegue (nginx proxyeando `/api`): lo que se prueba en local es lo
    // mismo que se despliega.
    env: { VITE_API_URL: '/' },
  },
});
