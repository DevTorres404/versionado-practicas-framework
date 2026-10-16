// src/services/redService.ts
// Capa de servicios de la red multinivel de referidos.
// Consume GET /api/red con autenticación Bearer token y caché en Redis.
import type { Referido } from "../data/red";
import { apiFetch } from "./http";

// GET /api/red (árbol completo: {id, nombre, nivel, ventas, hijos})
// Acepta un email opcional para particionar la caché en Redis (red:tree:{email})
export const getRed = async (email?: string): Promise<Referido> => {
  const endpoint = email ? `/api/red?email=${encodeURIComponent(email)}` : "/api/red";
  return await apiFetch<Referido>(endpoint);
};

// GET /api/red/mia (subárbol multinivel a partir del nodo propio del usuario autenticado)
export const getMiRed = async (): Promise<Referido> => {
  return await apiFetch<Referido>('/api/red/mia');
};

export interface MisComisionesResponse {
  comisiones: import('../types/backoffice').Comision[];
  pendiente: number;
  pagado: number;
}

// GET /api/comisiones/mias (ledger de comisiones del distribuidor)
export const getMisComisiones = async (): Promise<MisComisionesResponse> => {
  return await apiFetch<MisComisionesResponse>('/api/comisiones/mias');
};

// GET /api/liquidaciones/mias (historial de pagos percibidos por el distribuidor)
export const getMisLiquidaciones = async (): Promise<import('../types/backoffice').Liquidacion[]> => {
  return await apiFetch<import('../types/backoffice').Liquidacion[]>('/api/liquidaciones/mias');
};
