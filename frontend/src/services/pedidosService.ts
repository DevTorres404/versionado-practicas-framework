// src/services/pedidosService.ts
import { apiFetch } from './http';
import { type Pedido, type Pagina, type EstadoPedido } from '../types/backoffice';

// GET /api/pedidos/mios (historial de pedidos del usuario autenticado)
export const getMisPedidos = async (page = 1, limit = 20): Promise<Pagina<Pedido>> => {
  return await apiFetch<Pagina<Pedido>>(`/api/pedidos/mios?page=${page}&limit=${limit}`);
};

// GET /api/pedidos/:id (detalle de pedido con items)
export const getPedidoById = async (id: number): Promise<Pedido> => {
  return await apiFetch<Pedido>(`/api/pedidos/${id}`);
};

// GET /api/pedidos (admin: listado completo con filtro de estado)
export const adminGetPedidos = async (
  estado = '',
  page = 1,
  limit = 20
): Promise<Pagina<Pedido>> => {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (estado) {
    query.append('estado', estado);
  }
  return await apiFetch<Pagina<Pedido>>(`/api/pedidos?${query.toString()}`);
};

// PATCH /api/pedidos/:id/estado (admin: cambiar estado de pedido)
export const adminCambiarEstadoPedido = async (
  id: number,
  estado: EstadoPedido
): Promise<Pedido> => {
  return await apiFetch<Pedido>(`/api/pedidos/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
};
