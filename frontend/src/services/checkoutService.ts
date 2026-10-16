// src/services/checkoutService.ts
// Capa de servicios para el microservicio transaccional de Checkout (Fase 4 & Hardening).
import { apiFetch } from "./http";

export interface ClienteCheckout {
  nombre: string;
  email: string;
  direccion: string;
  ciudad: string;
  telefono: string;
}

export interface ItemCheckout {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface CheckoutPayload {
  cliente: ClienteCheckout;
  metodoPago: string;
  items: ItemCheckout[];
  total: number;
}

export interface CheckoutResponse {
  numero: string;
  total: number;
  fecha: string;
  cliente: ClienteCheckout;
  items: ItemCheckout[];
  mensaje?: string;
}

// POST /api/checkout: invoca la transacción ACID en el backend de Go con token JWT y recálculo en servidor
export const procesarCheckout = async (payload: CheckoutPayload): Promise<CheckoutResponse> => {
  return await apiFetch<CheckoutResponse>("/api/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
