import { test, expect, type APIRequestContext } from '@playwright/test';
import sharp from 'sharp';
import { esperarServiceWorkerControlando } from './helpers';

/**
 * Criterios de instalabilidad de la PWA.
 *
 * Chrome (y Edge) sólo ofrecen "Instalar aplicación" si se cumplen TODOS estos
 * requisitos: manifest accesible con los campos obligatorios, íconos del tamaño
 * declarado (incluido uno `maskable`), `start_url` y `scope` en el mismo
 * origen, y un service worker registrado con handler `fetch`.
 *
 * Un manifest roto no produce ningún error en la app: simplemente la opción de
 * instalar no aparece. Por eso se verifica como contrato, no como UI.
 */

interface IconoManifest {
  src: string;
  sizes?: string;
  type?: string;
  purpose?: string;
}

interface AtajoManifest {
  name?: string;
  short_name?: string;
  url?: string;
  icons?: IconoManifest[];
}

interface Manifiesto {
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  theme_color?: string;
  background_color?: string;
  icons?: IconoManifest[];
  shortcuts?: AtajoManifest[];
}

/** URL del manifest servida por el build. */
const MANIFEST_URL = '/manifest.webmanifest';

/** Descarga y parsea el manifest desde el servidor de preview. */
const leerManifiesto = async (request: APIRequestContext): Promise<Manifiesto> => {
  const respuesta = await request.get(MANIFEST_URL);
  expect(respuesta.status(), `${MANIFEST_URL} debe responder 200`).toBe(200);
  return (await respuesta.json()) as Manifiesto;
};

test.describe('PWA instalable', () => {
  test('el service worker se registra y queda activo', async ({ page }) => {
    await page.goto('/');

    const registro = await page.evaluate(async () => {
      const r = await navigator.serviceWorker.ready;
      const worker = r.active;

      if (!worker) {
        return { scope: r.scope, state: null, script: null };
      }

      // `ready` resuelve apenas hay un worker activo, pero el estado puede ser
      // todavía 'activating': se espera al `statechange` para no leer una
      // transición a medio terminar.
      if (worker.state !== 'activated') {
        await new Promise<void>((resolve) => {
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') {
              resolve();
            }
          });
        });
      }

      return { scope: r.scope, state: worker.state, script: worker.scriptURL };
    });

    expect(registro.state).toBe('activated');
    expect(registro.scope).toContain('/');
    expect(registro.script).toContain('/sw.js');

    // Con `clientsClaim` el worker toma control de la pestaña abierta: sin
    // `controller` la página no pasa por el worker y no hay precache activo.
    await esperarServiceWorkerControlando(page);
  });

  test('el manifest es accesible y cumple los campos de instalación', async ({ request }) => {
    const respuesta = await request.get(MANIFEST_URL);

    expect(respuesta.status()).toBe(200);
    expect(respuesta.headers()['content-type'] ?? '').toMatch(/manifest\+json|json/);

    const manifest = (await respuesta.json()) as Manifiesto;

    expect(manifest.name?.trim()).toBeTruthy();
    expect(manifest.short_name?.trim()).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color?.trim()).toBeTruthy();
    expect(manifest.background_color?.trim()).toBeTruthy();
    expect(manifest.icons?.length ?? 0).toBeGreaterThan(0);
  });

  test('cada icono referenciado existe y tiene las dimensiones declaradas', async ({ request }) => {
    const manifest = await leerManifiesto(request);
    const iconosPng = (manifest.icons ?? []).filter((icono) => icono.type === 'image/png');

    expect(iconosPng.length).toBeGreaterThan(0);

    for (const icono of iconosPng) {
      const respuesta = await request.get(icono.src);

      expect(respuesta.status(), `el icono ${icono.src} debe existir`).toBe(200);

      // `sharp` lee la cabecera real del PNG: si alguien reemplaza el archivo
      // por uno de otro tamaño, el manifest queda mintiendo y la instalación
      // muestra un ícono pixelado.
      const metadatos = await sharp(await respuesta.body()).metadata();
      const [ancho, alto] = (icono.sizes ?? '').split('x').map(Number);

      expect(metadatos.width, `${icono.src}: ancho real`).toBe(ancho);
      expect(metadatos.height, `${icono.src}: alto real`).toBe(alto);
    }

    // Chrome exige al menos un `any` y un `maskable` de 192x192 o más.
    const porProposito = (proposito: string) =>
      iconosPng.filter((icono) => (icono.purpose ?? 'any') === proposito);

    const cualquiera = porProposito('any');
    const maskable = porProposito('maskable');

    expect(cualquiera.length).toBeGreaterThan(0);
    expect(maskable.length).toBeGreaterThan(0);

    for (const icono of [...cualquiera, ...maskable]) {
      const [ancho, alto] = (icono.sizes ?? '').split('x').map(Number);

      expect(ancho, `${icono.src}: ancho mínimo`).toBeGreaterThanOrEqual(192);
      expect(alto, `${icono.src}: alto mínimo`).toBeGreaterThanOrEqual(192);
    }
  });

  test('los atajos del manifest apuntan a rutas existentes de la app', async ({ request }) => {
    const manifest = await leerManifiesto(request);
    const urls = (manifest.shortcuts ?? []).map((atajo) => atajo.url ?? '');

    // Los atajos son el menú de larga presión del ícono: si apuntan a una ruta
    // que no existe, el usuario cae en el catch-all y vuelve al inicio.
    expect(urls).toEqual(expect.arrayContaining(['/tienda', '/carrito']));

    for (const url of urls) {
      const respuesta = await request.get(url);

      expect(respuesta.status(), `el atajo ${url} debe resolver`).toBe(200);
      expect(respuesta.headers()['content-type'] ?? '').toContain('text/html');
    }
  });

  test('el apple-touch-icon está referenciado y disponible', async ({ request }) => {
    const home = await request.get('/');

    expect(home.status()).toBe(200);

    const html = await home.text();
    const coincidencia = html.match(/<link[^>]+rel="apple-touch-icon"[^>]+href="([^"]+)"/);
    const href = coincidencia?.[1] ?? '';

    expect(href, 'index.html debe declarar un apple-touch-icon').not.toBe('');

    const icono = await request.get(href);

    expect(icono.status(), `${href} debe responder 200`).toBe(200);
    expect(icono.headers()['content-type'] ?? '').toContain('image/png');
  });
});
