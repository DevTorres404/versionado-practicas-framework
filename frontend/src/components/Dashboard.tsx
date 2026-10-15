// src/components/Dashboard.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { contarRed, sumarVentasRed, sumarComisiones, nivelAlcanzado, comisionDeReferido, type Referido } from '../data/red';
import { getRed } from '../services/redService';

const Dashboard = () => {
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
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center p-8 text-red-600 font-bold">{error}</div>
      </div>
    );
  }

  if (!red) {
    return <div className="text-center p-8">Cargando panel...</div>;
  }

  const referidosDirectos = red.hijos?.length ?? 0;
  const referidosActivos = contarRed(red);
  const ventasRed = sumarVentasRed(red);
  const comisionesMes = sumarComisiones(red);
  const nivel = nivelAlcanzado(referidosDirectos);

  const kpis = [
    { etiqueta: "Ventas de la Red", valor: `$${ventasRed.toLocaleString()}`, icon: "💰", gradient: "from-emerald-500 to-teal-500" },
    { etiqueta: "Referidos Activos", valor: referidosActivos.toString(), icon: "👥", gradient: "from-blue-500 to-cyan-500" },
    { etiqueta: "Comisiones del Mes", valor: `$${comisionesMes.toFixed(2)}`, icon: "📈", gradient: "from-indigo-500 to-fuchsia-500" },
    { etiqueta: "Nivel Actual", valor: nivel, icon: "👑", gradient: "from-amber-400 to-orange-500" },
  ];

  const topReferidos = [...(red.hijos ?? [])]
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Panel de Control</h1>
        <p className="text-slate-500 font-medium mt-2">Visión general del rendimiento de tu red.</p>
      </div>

      {/* ===== KPIs DERIVADOS DEL ESTADO ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        {kpis.map((kpi) => (
          <div key={kpi.etiqueta} className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${kpi.gradient} rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500`}></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-xs text-slate-500 uppercase font-extrabold tracking-widest mb-1">{kpi.etiqueta}</p>
                <p className="text-3xl font-black text-slate-900 tracking-tight">{kpi.valor}</p>
              </div>
              <div className="text-3xl">{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ===== TOP REFERIDOS ===== */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -z-0 pointer-events-none"></div>
          <h2 className="relative z-10 text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm">🔥</span>
            Top Referidos del Mes
          </h2>
          <div className="space-y-4 relative z-10">
            {topReferidos.map((ref, idx) => (
              <div
                key={ref.id}
                className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <span className={`w-10 h-10 rounded-xl font-black flex items-center justify-center shadow-sm ${
                    idx === 0 ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white' :
                    idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                    'bg-gradient-to-br from-orange-300 to-orange-400 text-white'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{ref.nombre}</p>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                      Nivel {ref.nivel}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-lg">${ref.ventas.toLocaleString()}</p>
                  <p className="text-xs text-green-600 font-extrabold mt-0.5">
                    +${comisionDeReferido(ref).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== PROGRESO DE NIVEL ===== */}
        <div className="bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden text-white">
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-fuchsia-600/30 blur-3xl rounded-full z-0 pointer-events-none"></div>
          
          <div className="relative z-10">
            <h2 className="text-xl font-extrabold mb-2 text-white">Progreso al Siguiente Nivel</h2>
            <p className="text-slate-400 text-sm mb-8 font-medium">
              Tienes <span className="text-white font-bold">{referidosDirectos} directos</span> activos.
            </p>
            
            <div className="grid grid-cols-4 gap-2 mb-8 relative">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 rounded-full z-0"></div>
              <div className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500 -translate-y-1/2 rounded-full z-10 transition-all duration-1000" style={{ width: `${Math.min((referidosDirectos / 6) * 100, 100)}%` }}></div>
              
              {[
                { n: 'Bronce', req: 0 },
                { n: 'Plata', req: 2 },
                { n: 'Oro', req: 4 },
                { n: 'Diamante', req: 6 }
              ].map((lvl) => {
                const alcanzado = referidosDirectos >= lvl.req;
                return (
                  <div key={lvl.n} className="relative z-20 flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full border-4 mb-2 transition-colors ${alcanzado ? 'bg-white border-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]' : 'bg-slate-900 border-slate-700'}`}></div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${alcanzado ? 'text-white' : 'text-slate-600'}`}>{lvl.n}</span>
                    <span className="text-[10px] text-slate-500 mt-1">{lvl.req}+ refs</span>
                  </div>
                )
              })}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md text-center">
              <p className="text-sm font-medium text-slate-300">Nivel actual</p>
              <p className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-400 mt-1">{nivel}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;