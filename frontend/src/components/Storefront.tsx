// src/components/Storefront.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProductos } from '../services/productosService';
import type { Producto } from '../data/productos';
import { categorias } from '../data/productos';

const Storefront = () => {
  const { user } = useAuth();
  const [destacados, setDestacados] = useState<Producto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getProductos()
      .then((data) => {
        setDestacados(data.slice(0, 4));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="font-sans">
      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/30 rounded-full blur-[120px] animate-float"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-fuchsia-600/30 rounded-full blur-[120px] animate-float-delayed"></div>
          <div className="absolute top-[20%] right-[20%] w-[30vw] h-[30vw] bg-blue-500/20 rounded-full blur-[100px] animate-float"></div>
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-dark text-indigo-300 text-sm font-semibold tracking-widest uppercase mb-8 shadow-2xl border border-white/10">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            El futuro del catálogo multinivel
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight">
            Belleza que conecta, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300">
              ganancias que inspiran.
            </span>
          </h1>
          
          <p className="text-lg md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
            Descubre nuestra línea de cosméticos de élite. Únete a una red global que recompensa tu influencia en cada nivel.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center w-full sm:w-auto">
            <Link
              to="/catalogo"
              className="bg-white text-slate-900 font-bold px-8 py-4 rounded-xl hover:bg-indigo-50 hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              Explorar Colección
            </Link>
            {user?.rol === "admin" && (
              <Link
                to="/mi-red"
                className="glass-dark text-white font-bold px-8 py-4 rounded-xl hover:bg-white/10 hover:scale-105 transition-all duration-300"
              >
                Plan Multinivel
              </Link>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 animate-bounce">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ===== CATEGORÍAS (Glassmorphism Grid) ===== */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Esencia por Categoría</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500 mx-auto mt-4 rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {categorias.map((cat) => (
            <Link
              key={cat}
              to={`/catalogo?categoria=${encodeURIComponent(cat)}`}
              className="group relative overflow-hidden bg-white border border-slate-100 rounded-2xl p-8 text-center shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-fuchsia-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <p className="relative font-bold text-slate-700 group-hover:text-indigo-700 transition-colors z-10">{cat}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== PRODUCTOS DESTACADOS ===== */}
      <section className="py-24 px-6 bg-slate-50 border-y border-slate-200/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Selección Exclusiva</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500 mt-4 rounded-full"></div>
            </div>
            <Link to="/catalogo" className="hidden sm:inline-flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
              Ver todo el catálogo <span aria-hidden="true">→</span>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {destacados.map((prod) => (
                <Link
                  key={prod.id}
                  to={`/producto/${prod.id}`}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"
                >
                  <div className="relative overflow-hidden aspect-[4/3]">
                    <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors z-10"></div>
                    <img
                      src={prod.img}
                      alt={prod.nombre}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute top-4 left-4 z-20">
                      <span className="glass px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-800 rounded-full">
                        {prod.categoria}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1">{prod.nombre}</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-extrabold text-indigo-600">${prod.precio.toFixed(2)}</p>
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== LLAMADA FINAL (Premium Dark) ===== */}
      <section className="relative py-32 px-6 bg-slate-950 text-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
            Eleva tu potencial hoy
          </h2>
          <p className="text-xl text-slate-400 mb-10 font-light">
            Únete a MultiCatálogo Premium y transforma tu red de contactos en una fuente de ingresos exponencial.
          </p>
          <Link
            to="/catalogo"
            className="inline-block bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-bold px-12 py-5 rounded-full hover:scale-105 hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all duration-300"
          >
            Comenzar la experiencia
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Storefront;