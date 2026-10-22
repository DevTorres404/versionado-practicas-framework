import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import BannerOffline from './BannerOffline'

/** Fija el estado de conexión que ve la app. */
const setOnline = (value: boolean): void => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  })
}

describe('BannerOffline', () => {
  afterEach(() => {
    setOnline(true)
  })

  it('avisa que no hay conexión y que se muestran datos guardados', () => {
    setOnline(false)

    render(<BannerOffline />)

    expect(screen.getByText(/Sin conexión/i)).toBeInTheDocument()
    expect(screen.getByText(/datos guardados/i)).toBeInTheDocument()
  })

  it('no muestra el aviso de sin conexión cuando hay conexión', () => {
    setOnline(true)

    render(<BannerOffline />)

    expect(screen.queryByText(/Sin conexión/i)).toBeNull()
  })

  it('es un status polite para los lectores de pantalla', () => {
    setOnline(false)

    render(<BannerOffline />)

    const banner = screen.getByRole('status')
    expect(banner).toHaveAttribute('aria-live', 'polite')
  })
})
