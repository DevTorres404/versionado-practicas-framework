// src/types/backoffice.ts
// Tipos e interfaces estandarizados para el back-office y dominio MLM de MultiCatálogo

export interface Pagina<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  img: string;
  galeria?: string[];
  stock?: number;
  activo?: boolean;
}

export interface PedidoItem {
  id: number;
  pedido_id: number;
  producto_id: number;
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

export type EstadoPedido = 'pendiente' | 'preparando' | 'enviado' | 'entregado' | 'cancelado';

export interface Pedido {
  id: number;
  numero: string;
  usuario_id?: number;
  cliente_nombre: string;
  cliente_email: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  metodo_pago: string;
  total: number;
  estado: EstadoPedido;
  fecha: string;
  items?: PedidoItem[];
}

export interface Comision {
  id: number;
  pedido_id: number;
  pedido_numero?: string;
  referido_id: number;
  nivel: number;
  porcentaje: number;
  monto: number;
  estado: 'pendiente' | 'pagada' | 'revertida';
  liquidacion_id?: number;
  creado_en: string;
}

export interface Liquidacion {
  id: number;
  referido_id: number;
  referido_nombre?: string;
  total: number;
  estado: string;
  creado_en: string;
  pagada_en?: string;
}

export interface ReporteResumen {
  total_ventas: number;
  numero_pedidos: number;
  ticket_promedio: number;
  comisiones_devengadas: number;
  comisiones_pendientes: number;
}

export interface TopProducto {
  id: number;
  nombre: string;
  unidades_vendidas: number;
  total_generado: number;
}

export interface TopReferido {
  id: number;
  nombre: string;
  codigo: string;
  ventas: number;
  directos: number;
}
