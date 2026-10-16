// src/services/productosService.ts
// Capa de servicios del catálogo: consume la API real de Go/PostgreSQL mediante apiFetch.
import { type Producto } from "../data/productos";
import { apiFetch, ApiError } from "./http";

// GET /api/productos (lista completa desde PostgreSQL con Cache-Aside)
export const getProductos = async (): Promise<Producto[]> => {
  return await apiFetch<Producto[]>("/api/productos");
};

// GET /api/productos/:id (detalle de un producto)
// 404 → undefined, igual que el mock cuando el id no existía.
export const getProductoById = async (
  id: number
): Promise<Producto | undefined> => {
  try {
    return await apiFetch<Producto>(`/api/productos/${id}`);
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) {
      return undefined;
    }
    throw err;
  }
};
