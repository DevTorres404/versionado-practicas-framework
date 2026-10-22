import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BotonInstalarApp } from './BotonInstalarApp';

const mockUseInstallPrompt = vi.fn();

vi.mock('../hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => mockUseInstallPrompt(),
}));

describe('BotonInstalarApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no muestra el botón si la aplicación ya está instalada', () => {
    mockUseInstallPrompt.mockReturnValue({
      isInstalled: true,
      canPromptNative: false,
      promptInstall: vi.fn(),
    });

    const { container } = render(<BotonInstalarApp variant="login" />);
    expect(container.firstChild).toBeNull();
  });

  it('muestra el botón si la aplicación no está instalada', () => {
    mockUseInstallPrompt.mockReturnValue({
      isInstalled: false,
      canPromptNative: true,
      promptInstall: vi.fn(),
    });

    render(<BotonInstalarApp variant="login" />);
    expect(
      screen.getByRole('button', { name: /Instalar App/i })
    ).toBeInTheDocument();
  });

  it('ejecuta promptInstall al hacer clic si el navegador soporta prompt nativo', async () => {
    const promptInstallMock = vi.fn().mockResolvedValue(true);
    mockUseInstallPrompt.mockReturnValue({
      isInstalled: false,
      canPromptNative: true,
      promptInstall: promptInstallMock,
    });

    const user = userEvent.setup();
    render(<BotonInstalarApp variant="login" />);

    const boton = screen.getByRole('button', { name: /Instalar App/i });
    await user.click(boton);

    expect(promptInstallMock).toHaveBeenCalledTimes(1);
  });

  it('muestra la guía manual adaptada si el navegador no emitió prompt nativo', async () => {
    mockUseInstallPrompt.mockReturnValue({
      isInstalled: false,
      canPromptNative: false,
      promptInstall: vi.fn(),
    });

    const user = userEvent.setup();
    render(<BotonInstalarApp variant="login" />);

    const boton = screen.getByRole('button', { name: /Instalar App/i });
    await user.click(boton);

    expect(
      screen.getByRole('heading', { name: /Instalar MultiCatálogo Torres/i })
    ).toBeInTheDocument();
  });
});
