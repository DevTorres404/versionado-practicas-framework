// src/services/productosService.ts
// Capa de servicios del catálogo: consume la API real de Go/PostgreSQL.
// Se conservan los mismos nombres de función y las mismas formas de
// resolución que el mock anterior, por lo que los componentes no cambian.

import { type Producto } from "../data/productos";

// URL base del backend (Fiber escucha en :3000).
const API_BASE = "http://localhost:3000";

// GET /api/productos (lista completa desde PostgreSQL)
export const getProductos = async (): Promise<Producto[]> => {
  const res = await fetch(`${API_BASE}/api/productos`);
  if (!res.ok) {
    throw new Error(`Error ${res.status} al cargar el catálogo`);
  }
  return (await res.json()) as Producto[];
};

// GET /api/productos/:id (detalle de un producto)
// 404 → undefined, igual que el mock cuando el id no existía.
export const getProductoById = async (
  id: number
): Promise<Producto | undefined> => {
  const res = await fetch(`${API_BASE}/api/productos/${id}`);
  if (res.status === 404) {
    return undefined;
  }
  if (!res.ok) {
    throw new Error(`Error ${res.status} al cargar el producto`);
  }
  return (await res.json()) as Producto;
};
