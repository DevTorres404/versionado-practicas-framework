// src/context/AuthContext.tsx
import { useState, type ReactNode } from 'react';
import { AuthContext, type Usuario } from './auth';
import { getStoredSession, saveStoredSession, clearStoredSession } from '../services/http';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Inicializamos la sesión leyendo el localStorage ('multicatalogo_sesion')
  const [session, setSession] = useState(() => getStoredSession());

  const user = session?.user ?? null;
  const token = session?.token ?? null;
  const isAuthenticated = Boolean(user && token);

  const login = (usuario: Usuario, jwtToken: string) => {
    const newSession = { user: usuario, token: jwtToken };
    saveStoredSession(newSession);
    setSession(newSession);
  };

  const logout = () => {
    clearStoredSession();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;