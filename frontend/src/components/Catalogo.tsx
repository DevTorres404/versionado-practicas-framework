import { useCart } from '../context/CartContext';

import { useState, useEffect } from 'react';

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  img: string;
}

const Catalogo = () => {
  const { addToCart } = useCart();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/productos')
      .then((res) => res.json())
      .then((data) => {
        console.log("[Sistema] Conexión establecida con el backend. Productos recibidos:", data);
        setProductos(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[Sistema] Error cargando el catálogo:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-stone-600 text-center py-10">Cargando productos...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">
        Catálogo de Productos
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {productos.map((prod) => (
          <div
            key={prod.id}
            className="bg-white rounded-lg overflow-hidden border border-stone-200 shadow-sm flex flex-col"
          >
            <img
              src={prod.img}
              alt={prod.nombre}
              className="w-full h-40 object-cover"
            />

            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-semibold text-stone-700">{prod.nombre}</h3>
              <p className="text-orange-600 font-bold mt-2 mb-4">
                ${prod.precio.toFixed(2)}
              </p>

              <button
                onClick={() => addToCart(prod)}
                className="mt-auto w-full bg-stone-900 text-white py-3 sm:py-2 rounded text-sm hover:bg-orange-600 transition"
              >
                Añadir al Carrito
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Catalogo;
