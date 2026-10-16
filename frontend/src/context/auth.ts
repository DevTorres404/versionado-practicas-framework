// src/context/auth.ts
// Tipos y hook desacoplados del Provider para compatibilidad con React Fast Refresh y ESLint
import { createContext, useContext } from 'react';

// Tipos de rol admitidos
export type Rol = 'admin' | 'cliente';

// Usuario con sesión activa
export interface Usuario {
  email: string;
  rol: Rol;
}

// Contrato del contexto de autenticación
export interface AuthContextType {
  isAuthenticated: boolean;
  user: Usuario | null;
  token: string | null;
  login: (usuario: Usuario, token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personalizado para consumir el contexto de autenticación
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
