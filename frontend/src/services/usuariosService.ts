// src/services/usuariosService.ts
import { apiFetch } from './http';
import { type Pagina, type UsuarioAdmin } from '../types/backoffice';

// GET /api/admin/usuarios (admin: listado paginado con búsqueda por nombre o email)
export const adminGetUsuarios = async ({
  q = '',
  page = 1,
  limit = 10,
}: {
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<Pagina<UsuarioAdmin>> => {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (q) {
    query.append('q', q);
  }
  return await apiFetch<Pagina<UsuarioAdmin>>(`/api/admin/usuarios?${query.toString()}`);
};
