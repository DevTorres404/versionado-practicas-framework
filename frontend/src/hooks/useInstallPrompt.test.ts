import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInstallPrompt } from './useInstallPrompt';

describe('useInstallPrompt', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const setupMatchMedia = (isStandalone = false) => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: isStandalone && query.includes('standalone'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  it('detecta modo standalone si matchMedia indica standalone', () => {
    setupMatchMedia(true);

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstalled).toBe(true);
  });

  it('inicia como instalado en recarga (F5) si el estado previo quedó en localStorage', () => {
    setupMatchMedia(false);
    localStorage.setItem('pwa_installed', 'true');

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstalled).toBe(true);
  });

  it('al recibir beforeinstallprompt resetea isInstalled y limpia localStorage (desinstalación)', () => {
    setupMatchMedia(false);
    localStorage.setItem('pwa_installed', 'true');

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstalled).toBe(true);

    const mockPromptEvent = new Event('beforeinstallprompt');
    Object.assign(mockPromptEvent, {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
      platforms: ['web'],
    });

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    expect(result.current.canPromptNative).toBe(true);
    expect(result.current.isInstalled).toBe(false);
    expect(localStorage.getItem('pwa_installed')).toBeNull();
  });

  it('marca isInstalled como true y persiste en localStorage al recibir appinstalled', () => {
    setupMatchMedia(false);

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstalled).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canPromptNative).toBe(false);
    expect(localStorage.getItem('pwa_installed')).toBe('true');
  });

  it('detecta instalación si getInstalledRelatedApps retorna aplicaciones instaladas', async () => {
    setupMatchMedia(false);

    const getInstalledRelatedAppsMock = vi.fn().mockResolvedValue([
      { platform: 'webapp', url: '/manifest.webmanifest' },
    ]);
    Object.defineProperty(navigator, 'getInstalledRelatedApps', {
      value: getInstalledRelatedAppsMock,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useInstallPrompt());

    // Esperar a que la promesa de checkInstalledStatus resuelva
    await vi.waitFor(() => {
      expect(result.current.isInstalled).toBe(true);
    });
    expect(localStorage.getItem('pwa_installed')).toBe('true');
  });
});
