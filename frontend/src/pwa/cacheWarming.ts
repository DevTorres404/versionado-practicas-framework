import { apiFetch } from '../services/http';
import { type Producto } from '../data/productos';

export interface CacheWarmingResult {
  productosTotal: number;
  redPrecargada: boolean;
}

/**
 * Precarga y almacena en la caché del Service Worker los datos disponibles
 * en el momento de la instalación para que la PWA funcione sin conexión de inmediato.
 *
 * Se ejecuta al hacer clic en instalar o al confirmarse el evento appinstalled.
 */
export const precalentarDatosOffline = async (): Promise<CacheWarmingResult> => {
  let productosTotal = 0;
  let redPrecargada = false;

  // 1. Precargar catálogo general de productos (/api/productos)
  try {
    const productos = await apiFetch<Producto[]>('/api/productos');
    if (Array.isArray(productos)) {
      productosTotal = productos.length;

      // Precargar los detalles de los primeros productos (hasta 10) para navegación offline inmediata
      const productosDestacados = productos.slice(0, 10);
      await Promise.allSettled(
        productosDestacados.map((p) => apiFetch<Producto>(`/api/productos/${p.id}`))
      );
    }
  } catch {
    // Si la red no está disponible en este momento, no se interrumpe el flujo
  }

  // 2. Si existe sesión activa, precargar árbol de referidos (/api/red)
  try {
    await apiFetch('/api/red');
    redPrecargada = true;
  } catch {
    // Si no está autenticado o la petición falla, se ignora silenciosamente
  }

  return { productosTotal, redPrecargada };
};
