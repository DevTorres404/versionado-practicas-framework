import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from './Navbar';

const mockLogout = vi.fn();

vi.mock('../context/auth', () => ({
  useAuth: () => ({
    logout: mockLogout,
    user: { email: 'admin@upse.edu.ec', rol: 'admin' },
  }),
}));

vi.mock('../context/cart', () => ({
  useCart: () => ({
    totalItems: 0,
  }),
}));

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permite abrir el menú de usuario al hacer clic en el avatar y cerrar sesión', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Navbar toggleSidebar={vi.fn()} />
      </MemoryRouter>
    );

    const avatarBoton = screen.getByRole('button', { name: /Menú de usuario/i });
    expect(avatarBoton).toBeInTheDocument();

    // En estado inicial el menú está cerrado
    expect(screen.queryByRole('button', { name: /Cerrar Sesión/i })).toBeNull();

    // Clic en avatar (funciona en celulares con touch y en escritorio con click)
    await user.click(avatarBoton);

    const botonLogout = screen.getByRole('button', { name: /Cerrar Sesión/i });
    expect(botonLogout).toBeInTheDocument();

    // Clic en cerrar sesión
    await user.click(botonLogout);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
