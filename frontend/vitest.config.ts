import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // `virtual:pwa-register` sólo existe durante el build (lo provee
      // `vite-plugin-pwa`). En los tests se reemplaza por un doble controlado.
      'virtual:pwa-register': fileURLToPath(
        new URL('./src/test/virtualPwaRegister.ts', import.meta.url),
      ),
    },
  },
  test: {
    // Los tests de componentes necesitan DOM; los de lógica pura siguen
    // funcionando igual en jsdom (no usan `window`).
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Un `it.only` olvidado en un commit es un bug silencioso: la suite pasa
    // "en verde" sin correr casi nada.
    forbidOnly: true,
    env: {
      // Ruta absoluta de `public/`: los tests del manifest la necesitan para
      // leer los PNG del disco (en el entorno de test `import.meta.url` no es
      // una URL de archivo).
      PUBLIC_DIR: fileURLToPath(new URL('./public/', import.meta.url)),
    },
  },
})
