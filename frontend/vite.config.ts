import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // La actualización del service worker es manual: se avisa al usuario y él
      // decide cuándo aplicar (fase PWA-5). Por eso `prompt` y no `autoUpdate`.
      registerType: 'prompt',
      // El service worker se escribe a mano en `src/sw.ts` (TypeScript) para
      // poder testear la política de caché como funciones puras.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // El registro lo hacemos a mano en `src/main.tsx` para poder exponer el
      // estado (needRefresh / offlineReady) a la UI.
      injectRegister: null,
      // El Web App Manifest vive en `public/manifest.webmanifest`: el plugin no
      // debe generar otro (evita entradas duplicadas en el precache).
      manifest: false,
      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'pwa-icons/*.png',
        'pwa-icons/icon.svg',
        'fonts/*.woff2',
        'fonts/fonts.css',
      ],
      devOptions: {
        enabled: false,
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  server: {
    host: true
  }
})
