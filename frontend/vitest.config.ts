import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Los tests de este repo son de lógica pura (sin DOM): por eso `node`.
    // Si algún test necesita DOM, se declara `// @vitest-environment jsdom`
    // en el propio archivo de test.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
