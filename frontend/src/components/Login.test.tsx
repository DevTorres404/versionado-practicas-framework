import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

vi.mock('../context/auth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    usuario: null,
    token: null,
    rol: null,
  }),
}));

vi.mock('../hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({
    isInstalled: true,
    canPromptNative: false,
    promptInstall: vi.fn(),
  }),
}));

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra las credenciales de prueba sin emojis y permite autocompletar con un clic', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Verificar que no existen emojis de corona o bolsa en el documento
    expect(screen.queryByText(/👑/)).toBeNull();
    expect(screen.queryByText(/🛍️/)).toBeNull();

    // Comprobar que los botones de autocompletado están presentes
    const adminBoton = screen.getByTitle('Cargar credenciales de Administrador');
    const clienteBoton = screen.getByTitle('Cargar credenciales de Cliente');

    expect(adminBoton).toBeInTheDocument();
    expect(clienteBoton).toBeInTheDocument();

    const inputEmail = screen.getByPlaceholderText('admin@upse.edu.ec');
    const inputPassword = screen.getByPlaceholderText('••••••');

    // Clic en Admin autocompleta credenciales de administrador
    await user.click(adminBoton);
    expect(inputEmail).toHaveValue('admin@upse.edu.ec');
    expect(inputPassword).toHaveValue('123456');

    // Clic en Cliente autocompleta credenciales de cliente
    await user.click(clienteBoton);
    expect(inputEmail).toHaveValue('cliente@upse.edu.ec');
    expect(inputPassword).toHaveValue('123456');
  });
});
