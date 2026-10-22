import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { procesarCheckout } from '../services/checkoutService'
import Checkout from './Checkout'

/**
 * El checkout se testea con el carrito y la sesión simulados: lo que importa
 * es el contrato "sin conexión NO se compra", no la integración con el
 * backend.
 */
vi.mock('../context/cart', () => ({
  useCart: () => ({
    cart: [{ id: 1, nombre: 'Labial Rosa', precio: 100, cantidad: 2 }],
    totalPrice: 200,
    totalItems: 2,
    clearCart: vi.fn(),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    incrementQuantity: vi.fn(),
    decrementQuantity: vi.fn(),
  }),
}))

vi.mock('../context/auth', () => ({
  useAuth: () => ({
    user: { email: 'ana@example.com', rol: 'cliente' },
    isAuthenticated: true,
    token: 'fake-token',
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('../services/checkoutService', () => ({
  procesarCheckout: vi.fn(),
}))

const setOnline = (value: boolean): void => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  })
}

describe('Checkout sin conexión', () => {
  afterEach(() => {
    setOnline(true)
    vi.clearAllMocks()
  })

  it('deshabilita el botón de confirmar y explica el motivo', () => {
    setOnline(false)

    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    )

    const boton = screen.getByRole('button', { name: /Sin conexión/i })
    expect(boton).toBeDisabled()
    expect(screen.getByText(/No tenés conexión/i)).toBeInTheDocument()
  })

  it('no envía el pedido al backend aunque se intente enviar el formulario', () => {
    setOnline(false)

    const { container } = render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    )

    const formulario = container.querySelector('form')
    expect(formulario).not.toBeNull()

    fireEvent.submit(formulario as HTMLFormElement)

    expect(vi.mocked(procesarCheckout)).not.toHaveBeenCalled()
  })
})
