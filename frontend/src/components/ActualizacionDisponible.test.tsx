import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ActualizacionDisponible from './ActualizacionDisponible'

/**
 * El módulo de registro se aísla: los tests no dependen de un service worker
 * real, sólo del contrato observable de la UI.
 */
const { listeners, applyUpdateMock } = vi.hoisted(() => ({
  listeners: [] as Array<(estado: { needRefresh: boolean; offlineReady: boolean }) => void>,
  applyUpdateMock: vi.fn(),
}))

vi.mock('../pwa/registration', () => ({
  applyUpdate: applyUpdateMock,
  getPwaState: () => ({ needRefresh: false, offlineReady: false }),
  subscribePwaState: (listener: (estado: { needRefresh: boolean; offlineReady: boolean }) => void) => {
    listeners.push(listener)
    return () => undefined
  },
}))

describe('ActualizacionDisponible', () => {
  beforeEach(() => {
    listeners.length = 0
    applyUpdateMock.mockClear()
  })

  it('avisa que hay una versión nueva y ofrece el botón de actualización', () => {
    render(<ActualizacionDisponible />)

    act(() => {
      listeners.forEach((listener) => listener({ needRefresh: true, offlineReady: false }))
    })

    expect(screen.getByText(/Hay una versión nueva disponible/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actualizar ahora' })).toBeInTheDocument()
  })

  it('no muestra nada mientras no haya actualizaciones', () => {
    render(<ActualizacionDisponible />)

    expect(screen.queryByRole('button', { name: 'Actualizar ahora' })).toBeNull()
  })

  it('aplica la actualización al pulsar el botón', async () => {
    const user = userEvent.setup()

    render(<ActualizacionDisponible />)

    act(() => {
      listeners.forEach((listener) => listener({ needRefresh: true, offlineReady: false }))
    })

    await user.click(screen.getByRole('button', { name: 'Actualizar ahora' }))

    expect(applyUpdateMock).toHaveBeenCalledTimes(1)
  })
})
