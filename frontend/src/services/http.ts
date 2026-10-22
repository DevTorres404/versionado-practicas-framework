// src/services/http.ts
// Cliente HTTP centralizado para MultiCatálogo:
// - URL base configurada vía VITE_API_URL e import.meta.env
// - Inyección automática de cabecera Authorization: Bearer con el JWT de la sesión
// - Manejo tipado de errores de API (ApiError)
// - Helpers de persistencia de sesión en localStorage ('multicatalogo_sesion')

export const SESSION_STORAGE_KEY = 'multicatalogo_sesion';

export interface UsuarioSesion {
  email: string;
  rol: 'admin' | 'cliente';
}

export interface StoredSession {
  user: UsuarioSesion;
  token: string;
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
 * Error de RED: la request ni siquiera llegó al servidor.
 *
 * Es un tipo aparte de `ApiError` a propósito. `ApiError` significa "el
 * servidor respondió y dijo que no" (validación, permisos, 404): la UI puede
 * mostrar el mensaje tal cual. `NetworkError` significa "no hubo respuesta"
 * (sin conexión, DNS caído, CORS): la UI tiene que ofrecer reintentar,
 * avisar que se muestran datos guardados o bloquear la acción.
 *
 * Convertir un fallo de red en `ApiError` haría que la app le mostrara al
 * usuario un "Error 500" inexistente.
 */
export class NetworkError extends Error {
  constructor(message?: string, options?: { cause?: unknown }) {
    super(message ?? 'No se pudo conectar con el servidor.', options);
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

// Base URL configurada dinámicamente mediante variables de entorno Vite
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.replace(/\/+$/, '');
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

  // Adjuntamos Content-Type por defecto si se envía body y no está especificado
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Inyección automática del token JWT persistido en la sesión
  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    // Fallo de red: offline, DNS caído, CORS,_timeout. El servidor nunca
    // respondió, así que NO es un ApiError.
    throw new NetworkError(
      'No se pudo conectar con el servidor. Revisá tu conexión a internet.',
      { cause: error },
    );
  }

  // El service worker responde con `X-Offline: 1` cuando no tiene nada
  // cacheado para la consulta. Es un 503 sintético, no una respuesta del
  // backend: se traduce a NetworkError para que la UI sepa que no hay red.
  if (response.headers.get('X-Offline') === '1') {
    let message = 'No se pudo conectar con el servidor y no hay datos guardados para esta consulta.';

    try {
      const errorJson = await response.json();
      if (errorJson && typeof errorJson.message === 'string') {
        message = errorJson.message;
      }
    } catch {
      // El cuerpo no era JSON: se conserva el mensaje por defecto.
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
      // Si la respuesta no es JSON, conservamos el mensaje con el código HTTP
    }

    throw new ApiError(response.status, message, details);
  }

  // Manejo de respuestas 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
};
