// src/services/http.ts
// Cliente HTTP centralizado para MultiCatálogo:
// - URL base configurada vía VITE_API_URL e import.meta.env
// - Inyección automática de cabecera Authorization: Bearer con el JWT de la sesión
// - Manejo tipado de errores de API (ApiError) y de red (NetworkError)
// - Persistencia de sesión y bóveda de autenticación offline ('multicatalogo_sesion', 'multicatalogo_offline_vault')

export const SESSION_STORAGE_KEY = 'multicatalogo_sesion';
export const OFFLINE_VAULT_KEY = 'multicatalogo_offline_vault';

export interface UsuarioSesion {
  email: string;
  rol: 'admin' | 'cliente';
}

export interface StoredSession {
  user: UsuarioSesion;
  token: string;
}

export interface OfflineUserVault {
  email: string;
  rol: 'admin' | 'cliente';
  token: string;
  savedAt: number;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Error de RED: la petición no pudo comunicarse con el servidor.
 */
export class NetworkError extends Error {
  constructor(message?: string, options?: { cause?: unknown }) {
    super(message ?? 'No se pudo conectar con el servidor. Revisá tu conexión a internet.', options);
    this.name = 'NetworkError';
  }
}

// Helpers de almacenamiento de sesión en localStorage
export const getStoredSession = (): StoredSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
};

export const getStoredToken = (): string | null => {
  const session = getStoredSession();
  return session ? session.token : null;
};

export const saveStoredSession = (session: StoredSession): void => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Si localStorage está bloqueado o lleno, no rompe la ejecución en memoria
  }
};

export const clearStoredSession = (): void => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Fallback silencioso
  }
};

export const saveOfflineUser = (email: string, rol: 'admin' | 'cliente', token: string): void => {
  try {
    const raw = localStorage.getItem(OFFLINE_VAULT_KEY);
    const vault: Record<string, OfflineUserVault> = raw ? JSON.parse(raw) : {};
    vault[email.toLowerCase()] = {
      email: email.toLowerCase(),
      rol,
      token,
      savedAt: Date.now(),
    };
    localStorage.setItem(OFFLINE_VAULT_KEY, JSON.stringify(vault));
  } catch {
    // Manejo de almacenamiento
  }
};

export const authenticateOffline = (
  email: string,
  password: string
): { email: string; rol: 'admin' | 'cliente'; token: string } => {
  const normEmail = email.trim().toLowerCase();

  // 1. Cuentas de prueba preconfiguradas para pruebas offline
  if (normEmail === 'admin@upse.edu.ec' && password === '123456') {
    const offlineToken = `offline-jwt-admin-${Date.now()}`;
    saveOfflineUser(normEmail, 'admin', offlineToken);
    saveStoredSession({ user: { email: normEmail, rol: 'admin' }, token: offlineToken });
    return { email: normEmail, rol: 'admin', token: offlineToken };
  }

  if (normEmail === 'cliente@upse.edu.ec' && password === '123456') {
    const offlineToken = `offline-jwt-cliente-${Date.now()}`;
    saveOfflineUser(normEmail, 'cliente', offlineToken);
    saveStoredSession({ user: { email: normEmail, rol: 'cliente' }, token: offlineToken });
    return { email: normEmail, rol: 'cliente', token: offlineToken };
  }

  // 2. Usuarios previamente sincronizados en este dispositivo
  try {
    const raw = localStorage.getItem(OFFLINE_VAULT_KEY);
    if (raw) {
      const vault: Record<string, OfflineUserVault> = JSON.parse(raw);
      const cached = vault[normEmail];
      if (cached) {
        saveStoredSession({ user: { email: cached.email, rol: cached.rol }, token: cached.token });
        return { email: cached.email, rol: cached.rol, token: cached.token };
      }
    }
  } catch {
    // Error al leer localStorage
  }

  throw new Error('Sin conexión: usuario no sincronizado en este dispositivo o credenciales inválidas.');
};

/**
 * Detecta fallos de conectividad o red para manejo resiliente en PWA.
 */
export const isNetworkError = (err: unknown): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  if (err instanceof NetworkError) {
    return true;
  }
  if (err instanceof ApiError && err.status === 0) {
    return true;
  }
  if (err instanceof TypeError || err instanceof Error) {
    const msg = (err.message || '').toLowerCase();
    return (
      msg.includes('networkerror') ||
      msg.includes('failed to fetch') ||
      msg.includes('load failed') ||
      msg.includes('network request failed') ||
      msg.includes('sin conexión') ||
      msg.includes('offline') ||
      msg.includes('connection refused')
    );
  }
  return false;
};

export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  if (typeof envUrl === 'string') {
    const trimmed = envUrl.trim();
    if (trimmed === '/') {
      return '';
    }
    if (trimmed !== '') {
      return trimmed.replace(/\/+$/, '');
    }
  }

  return 'http://localhost:3000';
};

// Cliente fetch unificado para todas las llamadas a la API
export const apiFetch = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const session = getStoredSession();
  const token = session ? session.token : null;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (session?.user?.email && !headers.has('X-User-Email')) {
    headers.set('X-User-Email', session.user.email);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new NetworkError(
      'No se pudo conectar con el servidor. Revisá tu conexión a internet.',
      { cause: error },
    );
  }

  if (response.headers.get('X-Offline') === '1') {
    let message = 'No se pudo conectar con el servidor y no hay datos guardados para esta consulta.';
    try {
      const errorJson = await response.json();
      if (errorJson && typeof errorJson.message === 'string') {
        message = errorJson.message;
      }
    } catch {
      // Ignorar
    }
    throw new NetworkError(message);
  }

  if (!response.ok) {
    let message = `Error ${response.status} en ${cleanEndpoint}`;
    let details: unknown = undefined;

    try {
      const errorJson = await response.json();
      if (errorJson) {
        if (typeof errorJson.message === 'string') {
          message = errorJson.message;
        } else if (typeof errorJson.error === 'string') {
          message = errorJson.error;
        }
        details = errorJson.details;
      }
    } catch {
      // Usar mensaje por defecto
    }

    throw new ApiError(response.status, message, details);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
};
