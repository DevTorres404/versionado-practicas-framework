// src/services/checkoutService.ts
// Capa de servicios para el microservicio transaccional de Checkout (Fase 4).

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

const API_BASE = "http://localhost:3000";

// POST /api/checkout: invoca la transacción ACID en el backend de Go
export const procesarCheckout = async (payload: CheckoutPayload): Promise<CheckoutResponse> => {
  const res = await fetch(`${API_BASE}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorMsg = `Error ${res.status} al procesar el pedido`;
    try {
      const errData = await res.json();
      if (errData && errData.message) {
        errorMsg = errData.message;
        if (errData.details) {
          errorMsg += `: ${errData.details}`;
        }
      }
    } catch {
      // Fallback
    }
    throw new Error(errorMsg);
  }

  return (await res.json()) as CheckoutResponse;
};
