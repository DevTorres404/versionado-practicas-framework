// src/components/MiRed.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { contarRed, sumarVentasRed, sumarComisiones, nivelAlcanzado, comisionDeReferido, TASA_COMISION, type Referido } from '../data/red';
import { getRed } from '../services/redService';

const NIVEL_ESTILO: Record<number, { badge: string; border: string; gradient: string; text: string; bg: string }> = {
  1: { badge: "bg-indigo-100 text-indigo-700", border: "border-indigo-200", gradient: "from-indigo-500 to-blue-500", text: "text-indigo-600", bg: "bg-indigo-50" },
  2: { badge: "bg-fuchsia-100 text-fuchsia-700", border: "border-fuchsia-200", gradient: "from-fuchsia-500 to-pink-500", text: "text-fuchsia-600", bg: "bg-fuchsia-50" },
  3: { badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", gradient: "from-emerald-500 to-teal-500", text: "text-emerald-600", bg: "bg-emerald-50" },
};

const NodoReferido = ({ nodo }: { nodo: Referido }) => {
  const estilo = NIVEL_ESTILO[nodo.nivel] ?? NIVEL_ESTILO[1];
  const comision = comisionDeReferido(nodo);

  return (
    <li className="relative">
      <div className="absolute left-[-21px] top-8 w-4 h-[2px] bg-slate-200"></div>
      <div className={`bg-white rounded-2xl border ${estilo.border} shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden group`}>
        <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${estilo.gradient}`}></div>
        
        <div className="flex items-center gap-4 pl-2">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-inner bg-gradient-to-br ${estilo.gradient}`}>
            {nodo.nombre.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-lg">{nodo.nombre}</p>
            <div className="flex gap-2 mt-1">
              <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${estilo.badge}`}>
                Nivel {nodo.nivel}
              </span>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-100 text-slate-600`}>
                {TASA_COMISION[nodo.nivel as keyof typeof TASA_COMISION] * 100}% Com.
              </span>
            </div>
          </div>
        </div>
        <div className="text-right sm:pr-2 flex-1 sm:flex-none flex justify-between sm:block w-full sm:w-auto items-center">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Ventas</p>
            <p className="font-black text-slate-900 text-lg">${nodo.ventas.toLocaleString()}</p>
          </div>
          <div className={`sm:mt-1 ${estilo.bg} px-3 py-1.5 rounded-lg border ${estilo.border}`}>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tu ganancia</p>
            <p className={`text-sm font-black ${estilo.text}`}>
              +${comision.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {nodo.hijos && nodo.hijos.length > 0 && (
        <ul className="mt-4 ml-8 space-y-4 border-l-2 border-slate-200 pl-5 relative before:absolute before:top-0 before:bottom-0 before:-left-[2px] before:w-[2px] before:bg-gradient-to-b before:from-slate-200 before:to-transparent">
          {nodo.hijos.map((hijo) => (
            <NodoReferido key={hijo.id} nodo={hijo} />
          ))}
        </ul>
      )}
    </li>
  );
};

const MiRed = () => {
  const { user } = useAuth();
  // El árbol ahora viene de la API (GET /api/red?email=...) con caché en Redis.
  const [red, setRed] = useState<Referido | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRed(user?.email)
      .then(setRed)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la red');
      });
  }, [user?.email]);

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <div className="text-center p-8 text-red-600 font-bold">{error}</div>
      </div>
    );
  }

  if (!red) {
    return <div className="text-center p-8">Cargando red...</div>;
  }

  const referidosActivos = contarRed(red);
  const ventasRed = sumarVentasRed(red);
  const comisionesMes = sumarComisiones(red);
  const nivel = nivelAlcanzado(red.hijos?.length ?? 0);

  const resumen = [
    { etiqueta: "Referidos Activos", valor: referidosActivos.toString(), color: "text-blue-600", bg: "bg-blue-50" },
    { etiqueta: "Ventas de la Red", valor: `$${ventasRed.toLocaleString()}`, color: "text-indigo-600", bg: "bg-indigo-50" },
    { etiqueta: "Comisiones del Mes", valor: `$${comisionesMes.toFixed(2)}`, color: "text-emerald-600", bg: "bg-emerald-50" },
    { etiqueta: "Nivel Alcanzado", valor: nivel, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">Mi Red de Referidos</h1>
        <p className="text-slate-500 font-medium bg-white inline-block px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          Estructura multinivel: gana el <strong className="text-indigo-600">{TASA_COMISION[1] * 100}%</strong> de nivel 1, <strong className="text-fuchsia-600">{TASA_COMISION[2] * 100}%</strong> de nivel 2 y <strong className="text-emerald-600">{TASA_COMISION[3] * 100}%</strong> de nivel 3.
        </p>
      </div>

      {/* ===== TARJETAS DE RESUMEN ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
        {resumen.map((item) => (
          <div key={item.etiqueta} className={`p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100 text-center hover:-translate-y-1 transition-transform ${item.bg}`}>
            <p className="text-[10px] sm:text-xs text-slate-600 uppercase font-extrabold tracking-widest">{item.etiqueta}</p>
            <p className={`text-2xl sm:text-3xl font-black mt-2 ${item.color}`}>{item.valor}</p>
          </div>
        ))}
      </div>

      {/* ===== ÁRBOL DE REFERIDOS ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 rounded-full blur-3xl -z-0 pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        
        <h2 className="text-2xl font-extrabold text-slate-900 mb-8 relative z-10 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm shadow-md">🌿</span>
          Árbol de Referidos
        </h2>

        {/* Raíz: el usuario */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8 flex flex-wrap items-center justify-between gap-6 shadow-2xl relative z-10 border border-slate-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-fuchsia-500 flex items-center justify-center font-black text-2xl shadow-inner border border-white/20">
              {red.nombre.charAt(0)}
            </div>
            <div>
              <p className="font-extrabold text-2xl tracking-tight">{red.nombre}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400 font-medium">Líder de Red</span>
                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">{nivel}</span>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10 text-center sm:text-right w-full sm:w-auto relative z-10">
            <p className="text-[10px] uppercase tracking-widest text-slate-300 font-bold mb-0.5">Comisiones generadas</p>
            <p className="font-black text-2xl text-green-400">
              ${comisionesMes.toFixed(2)}
            </p>
          </div>
        </div>

        <ul className="space-y-4 relative z-10">
          {red.hijos?.map((hijo) => (
            <NodoReferido key={hijo.id} nodo={hijo} />
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MiRed;