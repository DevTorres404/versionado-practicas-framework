// src/components/Catalogo.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getProductos } from '../services/productosService';
import { categorias, type Producto } from '../data/productos';

const Catalogo = () => {
  const { addToCart } = useCart();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchParams, setSearchParams] = useSearchParams();

  const [busqueda, setBusqueda] = useState<string>("");
  const [categoria, setCategoria] = useState<string>(searchParams.get("categoria") ?? "Todas");

  useEffect(() => {
    getProductos()
      .then((data) => {
        setProductos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos.filter((prod) => {
      const coincideCategoria = categoria === "Todas" || prod.categoria === categoria;
      const coincideTexto =
        texto === "" ||
        prod.nombre.toLowerCase().includes(texto) ||
        prod.descripcion.toLowerCase().includes(texto);
      return coincideCategoria && coincideTexto;
    });
  }, [productos, busqueda, categoria]);

  const handleCategoriaChange = (value: string) => {
    setCategoria(value);
    if (value === "Todas") {
      setSearchParams({});
    } else {
      setSearchParams({ categoria: value });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Catálogo de Productos</h1>
        <p className="text-slate-500 font-medium">
          Descubre nuestra colección completa. {productosFiltrados.length} {productosFiltrados.length === 1 ? 'resultado' : 'resultados'}.
        </p>
      </div>

      {/* ===== BARRA DE BÚSQUEDA Y FILTROS ===== */}
      <div className="flex flex-col md:flex-row gap-4 mb-10 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
          />
        </div>
        <div className="relative md:w-72">
          <select
            value={categoria}
            onChange={(e) => handleCategoriaChange(e.target.value)}
            className="w-full pl-4 pr-10 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 appearance-none cursor-pointer"
          >
            <option value="Todas">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      {/* ===== GRILLA DE PRODUCTOS ===== */}
      {productosFiltrados.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No encontramos nada</h3>
          <p className="text-slate-500 mb-6">Intenta con otra palabra clave o quita los filtros aplicados.</p>
          <button
            onClick={() => {
              setBusqueda("");
              setCategoria("Todas");
              setSearchParams({});
            }}
            className="px-6 py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {productosFiltrados.map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col group relative"
            >
              <div className="absolute top-4 left-4 z-20">
                <span className="glass px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 rounded-full shadow-sm">
                  {prod.categoria}
                </span>
              </div>
              <Link to={`/producto/${prod.id}`} className="relative overflow-hidden aspect-[4/3] block">
                <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-transparent transition-colors z-10"></div>
                <img
                  src={prod.img}
                  alt={prod.nombre}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
              </Link>
              <div className="p-6 flex flex-col flex-1">
                <Link to={`/producto/${prod.id}`}>
                  <h3 className="font-bold text-lg text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1 mb-1">
                    {prod.nombre}
                  </h3>
                </Link>
                <p className="text-2xl font-extrabold text-indigo-600 mt-auto pt-4 mb-5">
                  ${prod.precio.toFixed(2)}
                </p>

                <button
                  onClick={() => addToCart(prod)}
                  className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                  Añadir al Carrito
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Catalogo;