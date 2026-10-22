import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';

const mockLogout = vi.fn();

vi.mock('../context/auth', () => ({
  useAuth: () => ({
    logout: mockLogout,
    user: { email: 'admin@upse.edu.ec', rol: 'admin' },
  }),
}));

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el botón de cerrar sesión en el menú lateral y cierra sesión al pulsarlo', async () => {
    const user = userEvent.setup();
    const closeMobileMenu = vi.fn();

    render(
      <MemoryRouter>
        <Sidebar
          isCollapsed={false}
          isMobileOpen={true}
          closeMobileMenu={closeMobileMenu}
        />
      </MemoryRouter>
    );

    const botonLogout = screen.getByRole('button', { name: /Cerrar Sesión/i });
    expect(botonLogout).toBeInTheDocument();

    await user.click(botonLogout);
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(closeMobileMenu).toHaveBeenCalledTimes(1);
  });
});
