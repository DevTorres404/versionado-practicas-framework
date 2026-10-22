// src/context/AuthContext.tsx
import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext, type Usuario } from './auth';
import { getStoredSession, saveStoredSession, clearStoredSession } from '../services/http';
import { setUserPartition } from '../pwa/registration';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Inicializamos la sesión leyendo el localStorage ('multicatalogo_sesion')
  const [session, setSession] = useState(() => getStoredSession());

  const user = session?.user ?? null;
  const token = session?.token ?? null;
  const isAuthenticated = Boolean(user && token);

  // La identidad del usuario particiona la caché del service worker: el árbol
  // de referidos es dato personal. Al iniciar sesión con otra cuenta (o al
  // cerrar sesión) el worker purga la caché del usuario anterior.
  useEffect(() => {
    setUserPartition(user?.email ?? null);
  }, [user?.email]);

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