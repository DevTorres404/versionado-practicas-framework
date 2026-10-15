// src/services/redService.ts
// Capa de servicios de la red multinivel de referidos.
// Consume GET /api/red, que devuelve el árbol reconstruido desde PostgreSQL
// con la misma forma que el antiguo mock de src/data/red.ts.

import type { Referido } from "../data/red";

// URL base del backend (Fiber escucha en :3000).
const API_BASE = "http://localhost:3000";

// GET /api/red (árbol completo: {id, nombre, nivel, ventas, hijos})
// Acepta un email opcional para particionar la caché en Redis (red:tree:{email})
export const getRed = async (email?: string): Promise<Referido> => {
  const url = email ? `${API_BASE}/api/red?email=${encodeURIComponent(email)}` : `${API_BASE}/api/red`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error ${res.status} al cargar la red de referidos`);
  }
  return (await res.json()) as Referido;
};
