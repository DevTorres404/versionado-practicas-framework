import { beforeEach, describe, expect, it, vi } from 'vitest';
import { precalentarDatosOffline } from './cacheWarming';

const mockApiFetch = vi.fn();

vi.mock('../services/http', () => ({
  apiFetch: (url: string) => mockApiFetch(url),
}));

describe('cacheWarming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('precarga el catálogo y sus primeros productos para soporte offline', async () => {
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === '/api/productos') {
        return [
          { id: 1, nombre: 'Perfume A' },
          { id: 2, nombre: 'Crema B' },
        ];
      }
      if (url.startsWith('/api/productos/')) {
        return { id: 1, nombre: 'Perfume A' };
      }
      if (url === '/api/red') {
        return { total: 0 };
      }
      return null;
    });

    const resultado = await precalentarDatosOffline();

    expect(mockApiFetch).toHaveBeenCalledWith('/api/productos');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/productos/1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/productos/2');
    expect(resultado.productosTotal).toBe(2);
    expect(resultado.redPrecargada).toBe(true);
  });

  it('tolera fallos de red silenciosamente sin romper la ejecución', async () => {
    mockApiFetch.mockRejectedValue(new Error('Fallo de red'));

    const resultado = await precalentarDatosOffline();

    expect(resultado.productosTotal).toBe(0);
    expect(resultado.redPrecargada).toBe(false);
  });
});
