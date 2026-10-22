// src/components/Dashboard.tsx
import { useEffect, useState } from 'react';
import {
  adminGetReporteResumen,
  adminGetTopProductos,
  adminGetTopReferidos,
} from '../services/adminService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import IndicadorDatosGuardados from './IndicadorDatosGuardados';
import {
  type ReporteResumen,
  type TopProducto,
  type TopReferido,
} from '../types/backoffice';

const Dashboard = () => {
  const isOnline = useOnlineStatus();
  const [resumen, setResumen] = useState<ReporteResumen | null>(null);
  const [topProductos, setTopProductos] = useState<TopProducto[]>([]);
  const [topReferidos, setTopReferidos] = useState<TopReferido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    Promise.all([
      adminGetReporteResumen(),
      adminGetTopProductos(5),
      adminGetTopReferidos(5),
    ])
      .then(([res, prods, refs]) => {
        if (!activo) return;
        setResumen(res);
        setTopProductos(prods || []);
        setTopReferidos(refs || []);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setError(err instanceof Error ? err.message : 'Error al cargar los reportes ejecutivos');
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="text-center p-8 text-red-600 font-bold bg-red-50 rounded-2xl border border-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (loading || !resumen) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
        Cargando indicadores ejecutivos del negocio...
      </div>
    );
  }

  const kpis = [
    {
      etiqueta: "Ventas Totales",
      valor: `$${resumen.total_ventas.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: "💰",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      etiqueta: "Pedidos Completados",
      valor: resumen.numero_pedidos.toString(),
      icon: "📦",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      etiqueta: "Ticket Promedio",
      valor: `$${resumen.ticket_promedio.toFixed(2)}`,
      icon: "🎯",
      gradient: "from-indigo-500 to-fuchsia-500",
    },
    {
      etiqueta: "Comisiones Devengadas",
      valor: `$${resumen.comisiones_devengadas.toFixed(2)}`,
      icon: "📈",
      gradient: "from-amber-400 to-orange-500",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Panel de Control Ejecutivo
          </h1>
          {!isOnline && <IndicadorDatosGuardados />}
        </div>
        <p className="text-slate-500 text-sm mt-1">
          Métricas consolidadas del negocio en tiempo real desde PostgreSQL
        </p>
      </div>

      {/* ===== KPIs EJECUTIVOS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        {kpis.map((kpi) => (
          <div
            key={kpi.etiqueta}
            className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
          >
            <div
              className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${kpi.gradient} rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500`}
            ></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-xs text-slate-500 uppercase font-extrabold tracking-widest mb-1">
                  {kpi.etiqueta}
                </p>
                <p className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                  {kpi.valor}
                </p>
              </div>
              <div className="text-3xl">{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== SECCIÓN DOBLE: RANKINGS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Distribuidores Referidos */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
          <h2 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-sm">
              👑
            </span>
            Top Distribuidores de la Red
          </h2>

          <div className="space-y-4">
            {topReferidos.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">
                No hay ventas registradas por distribuidores aún.
              </p>
            ) : (
              topReferidos.map((ref, idx) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center shadow-sm text-white ${
                        idx === 0
                          ? "bg-amber-500"
                          : idx === 1
                          ? "bg-slate-400"
                          : idx === 2
                          ? "bg-orange-400"
                          : "bg-indigo-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{ref.nombre}</p>
                      <p className="text-xs text-slate-400 font-mono">
                        Cód: {ref.codigo || "—"} • {ref.directos} directos
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-bold uppercase">Ventas</p>
                    <p className="font-mono font-black text-slate-900 text-base">
                      ${ref.ventas.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Productos Más Vendidos */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
          <h2 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm">
              🔥
            </span>
            Top Productos Más Vendidos
          </h2>

          <div className="space-y-4">
            {topProductos.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">
                No hay ventas de productos registradas aún.
              </p>
            ) : (
              topProductos.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center shadow-sm text-white ${
                        idx === 0
                          ? "bg-emerald-500"
                          : idx === 1
                          ? "bg-teal-500"
                          : "bg-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{p.nombre}</p>
                      <p className="text-xs text-slate-400">
                        {p.unidades_vendidas} unidades vendidas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-bold uppercase">Recaudado</p>
                    <p className="font-mono font-black text-emerald-600 text-base">
                      ${p.total_generado.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;