import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminUsuarios from './AdminUsuarios';
import { adminGetUsuarios } from '../services/usuariosService';
import { type UsuarioAdmin } from '../types/backoffice';

vi.mock('../services/usuariosService', () => ({
  adminGetUsuarios: vi.fn(),
}));

const mockAdminGetUsuarios = vi.mocked(adminGetUsuarios);

const USUARIOS: UsuarioAdmin[] = [
  {
    id: 1,
    nombre: 'Wilter Villón',
    email: 'admin@upse.edu.ec',
    rol: 'admin',
    activo: true,
    referido_id: 0,
    nodo_nombre: 'Tú',
    nivel: 0,
    ventas: 5400,
    pedidos: 5,
    creado_en: '2026-10-22 16:10:44',
  },
  {
    id: 2,
    nombre: 'María Torres',
    email: 'cliente@upse.edu.ec',
    rol: 'cliente',
    activo: true,
    referido_id: 3,
    nodo_nombre: 'Red Norte',
    nivel: 1,
    ventas: 120,
    pedidos: 2,
    creado_en: '2026-10-20 09:00:00',
  },
];

describe('AdminUsuarios Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminGetUsuarios.mockResolvedValue({
      data: USUARIOS,
      page: 1,
      limit: 10,
      total: USUARIOS.length,
    });
  });

  it('renderiza el listado de usuarios sin llamar a la red real', async () => {
    render(<AdminUsuarios />);

    expect(await screen.findByText('Wilter Villón')).toBeInTheDocument();
    expect(screen.getByText('María Torres')).toBeInTheDocument();
    expect(screen.getByText('admin@upse.edu.ec')).toBeInTheDocument();
    expect(mockAdminGetUsuarios).toHaveBeenCalledWith({ q: '', page: 1, limit: 10 });
  });
});
