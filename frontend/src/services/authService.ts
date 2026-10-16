// src/services/authService.ts
import { apiFetch } from './http';
import { type Rol } from '../context/auth';

export interface RegisterRequestPayload {
  nombre: string;
  email: string;
  password: string;
  ref?: string;
}

export interface RegisterResponse {
  token: string;
  email: string;
  rol: Rol;
  mensaje: string;
  usuario?: {
    id: number;
    nombre: string;
    email: string;
    rol: Rol;
    referido_id?: number;
  };
}

export const registerUser = async (payload: RegisterRequestPayload): Promise<RegisterResponse> => {
  return await apiFetch<RegisterResponse>('/api/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
