// src/context/cart.ts
// Tipos y hook desacoplados del Provider para compatibilidad con React Fast Refresh y ESLint
import { createContext, useContext } from 'react';
import type { Producto } from '../data/productos';

export interface CartItem extends Producto {
  cantidad: number;
}

export interface CartContextType {
  cart: CartItem[];
  addToCart: (producto: Producto) => void;
  removeFromCart: (id: number) => void;
  incrementQuantity: (id: number) => void;
  decrementQuantity: (id: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

// Hook personalizado para consumir el contexto del carrito
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser usado dentro de un CartProvider');
  }
  return context;
};
