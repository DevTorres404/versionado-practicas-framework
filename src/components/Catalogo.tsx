import { useCart } from '../context/CartContext';

const Catalogo = () => {
  const { addToCart } = useCart();

  const productos = [
    { id: 1, nombre: "Serum Revitalizante", precio: 45.00, img: "https://picsum.photos/seed/serum/150" },
    { id: 2, nombre: "Crema Hidratante Pro", precio: 32.50, img: "https://picsum.photos/seed/crema/150" },
    { id: 3, nombre: "Tónico Purificante", precio: 28.00, img: "https://picsum.photos/seed/tonico/150" },
    { id: 4, nombre: "Mascarilla Nocturna", precio: 50.00, img: "https://picsum.photos/seed/mascarilla/150" },
  ];

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
