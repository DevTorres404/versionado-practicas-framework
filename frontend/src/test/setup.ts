/**
 * Setup global de los tests.
 *
 * - `@testing-library/jest-dom/vitest` agrega los matchers de DOM (`toBeVisible`,
 *   `toBeDisabled`, `toHaveTextContent`, ...) sobre las aserciones de Vitest.
 * - `cleanup()` desmonta los componentes renderizados al terminar cada test.
 *   Sin esto, el DOM de un test se filtra al siguiente y las consultas por rol
 *   encuentran elementos de más.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
