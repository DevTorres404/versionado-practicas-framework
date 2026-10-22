import { test, expect } from '@playwright/test';
import {
  PRODUCTO_E2E,
  abrirAppConServiceWorker,
  cortarRed,
  expectAppMontada,
  restaurarRed,
  sembrarCarrito,
  sembrarSesion,
} from './helpers';

/**
 * Comportamiento de la PWA sin conexión.
 *
 * La regla de producto es "offline para LEER": el catálogo y el shell salen de
 * la caché del service worker; el checkout, que descuenta stock con una
 * transacción ACID en el backend, se bloquea explícitamente.
 *
 * Todos los tests cortan la red con `context.setOffline(true)` y la restauran
 * en un `finally`: si un test la deja cortada, el siguiente falla por un motivo
 * que no tiene nada que ver con lo que se está probando.
 */

/** Nombre de la caché de runtime del catálogo (`src/pwa/cachePolicy.ts`). */
const CACHE_PRODUCTOS = 'multicatalogo-productos';

test.describe('PWA sin conexión', () => {
  test('sin conexión la app carga el shell y muestra el aviso', async ({ page, context }) => {
    // El banner vive en el `Layout` de las rutas protegidas: sin sesión, el
    // deep link redirige a /login y no hay layout que muestre el aviso.
    await sembrarSesion(page);
    await abrirAppConServiceWorker(page);

    try {
      await cortarRed(context, page);

      // `navigateFallback` del service worker resuelve el deep link con el
      // `index.html` precacheado: la ruta existe del lado del cliente aunque
      // no haya red.
      await page.goto('/producto/42');

      await expectAppMontada(page);
      await expect(page.getByText(/sin conexión/i).first()).toBeVisible();
    } finally {
      await restaurarRed(context);
    }
  });

  test('el catálogo servido desde la caché sigue disponible sin conexión', async ({
    page,
    context,
  }) => {
    // La ruta /catalogo está protegida: sin sesión, la app redirige al login y
    // el catálogo nunca pide los productos.
    await sembrarSesion(page);

    await context.route('**/api/productos', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([PRODUCTO_E2E]),
      });
    });

    await abrirAppConServiceWorker(page);

    try {
      await page.goto('/catalogo');
      await expect(page.getByText(PRODUCTO_E2E.nombre)).toBeVisible();

      // El `cache.put` de Workbox ocurre en `waitUntil`: la respuesta puede
      // llegar a la página un instante antes de que la entrada esté en caché.
      await expect
        .poll(
          async () =>
            page.evaluate(async (nombreCache) => {
              const cache = await caches.open(nombreCache);
              return (await cache.keys()).length;
            }, CACHE_PRODUCTOS),
          { timeout: 10_000 },
        )
        .toBeGreaterThan(0);

      // Se desmonta el mock ANTES de cortar la red: si quedara activo, el test
      // pasaría por el motivo equivocado (el mock responde, no la caché).
      await context.unroute('**/api/productos');

      await cortarRed(context, page);
      await page.reload();

      await expect(page.getByText(PRODUCTO_E2E.nombre)).toBeVisible();
      await expect(page.getByText(/sin conexión/i).first()).toBeVisible();
    } finally {
      await restaurarRed(context);
    }
  });

  test('sin conexión el checkout se bloquea y no envía la compra', async ({ page, context }) => {
    await sembrarSesion(page);
    await sembrarCarrito(page);

    const posts: string[] = [];
    page.on('request', (peticion) => {
      if (peticion.method() === 'POST') {
        posts.push(peticion.url());
      }
    });

    await abrirAppConServiceWorker(page);

    try {
      await cortarRed(context, page);
      await page.goto('/checkout');

      // El botón cambia de texto a "Sin conexión" cuando no hay red, así que
      // se ubica por el submit del formulario, no por su etiqueta.
      const botonConfirmar = page.locator('form button[type="submit"]');

      await expect(botonConfirmar).toBeDisabled();
      await expect(page.getByText(/no tenés conexión/i)).toBeVisible();

      // La garantía que importa: sin red no sale NINGUNA escritura. La compra
      // no se encola ni se simula.
      expect(posts).toEqual([]);
    } finally {
      await restaurarRed(context);
    }
  });
});
