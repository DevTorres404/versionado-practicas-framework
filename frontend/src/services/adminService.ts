// src/services/adminService.ts
import { apiFetch } from './http';
import {
  type Producto,
  type Pagina,
  type Liquidacion,
  type ReporteResumen,
  type TopProducto,
  type TopReferido,
} from '../types/backoffice';

// GET /api/admin/productos (catálogo completo incluyendo inactivos)
export const adminGetProductos = async (
  q = '',
  page = 1,
  limit = 20
): Promise<Pagina<Producto>> => {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (q) {
    query.append('q', q);
  }
  return await apiFetch<Pagina<Producto>>(`/api/admin/productos?${query.toString()}`);
};

// POST /api/productos (crear nuevo producto)
export const adminCrearProducto = async (producto: Omit<Producto, 'id'>): Promise<Producto> => {
  return await apiFetch<Producto>('/api/productos', {
    method: 'POST',
    body: JSON.stringify(producto),
  });
};

// PUT /api/productos/:id (actualizar datos del producto)
export const adminActualizarProducto = async (
  id: number,
  producto: Partial<Producto>
): Promise<Producto> => {
  return await apiFetch<Producto>(`/api/productos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(producto),
  });
};

// DELETE /api/productos/:id (borrado lógico: activo=false)
export const adminDesactivarProducto = async (
  id: number
): Promise<{ mensaje: string; id: number }> => {
  return await apiFetch<{ mensaje: string; id: number }>(`/api/productos/${id}`, {
    method: 'DELETE',
  });
};

// GET /api/liquidaciones (historial de liquidaciones admin)
export const adminGetLiquidaciones = async (): Promise<Liquidacion[]> => {
  return await apiFetch<Liquidacion[]>('/api/liquidaciones');
};

// POST /api/liquidaciones (aprobar y procesar pago de comisiones pendientes)
export const adminCrearLiquidacion = async (referidoId: number): Promise<Liquidacion> => {
  return await apiFetch<Liquidacion>('/api/liquidaciones', {
    method: 'POST',
    body: JSON.stringify({ referido_id: referidoId }),
  });
};

// GET /api/reportes/resumen (KPIs globales de negocio)
export const adminGetReporteResumen = async (
  desde = '',
  hasta = ''
): Promise<ReporteResumen> => {
  const query = new URLSearchParams();
  if (desde) query.append('desde', desde);
  if (hasta) query.append('hasta', hasta);
  const qStr = query.toString();
  return await apiFetch<ReporteResumen>(`/api/reportes/resumen${qStr ? `?${qStr}` : ''}`);
};

// GET /api/reportes/top-productos (ranking de productos más vendidos)
export const adminGetTopProductos = async (limit = 5): Promise<TopProducto[]> => {
  return await apiFetch<TopProducto[]>(`/api/reportes/top-productos?limit=${limit}`);
};

// GET /api/reportes/top-referidos (ranking de distribuidores con mayor facturación)
export const adminGetTopReferidos = async (limit = 5): Promise<TopReferido[]> => {
  return await apiFetch<TopReferido[]>(`/api/reportes/top-referidos?limit=${limit}`);
};
