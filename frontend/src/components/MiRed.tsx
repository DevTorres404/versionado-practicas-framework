// src/components/MiRed.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import IndicadorDatosGuardados from './IndicadorDatosGuardados';
import {
  contarRed,
  sumarVentasRed,
  nivelAlcanzado,
  comisionDeReferido,
  TASA_COMISION,
  type Referido,
} from '../data/red';
import { getMiRed, getMisComisiones, type MisComisionesResponse } from '../services/redService';
import { type Comision } from '../types/backoffice';

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
      <div className={`bg-white rounded-2xl border ${estilo.border} shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-3 sm:p-5 flex flex-wrap items-center justify-between gap-3 sm:gap-4 relative overflow-hidden group`}>
        <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${estilo.gradient}`}></div>
        
        <div className="flex items-center gap-3 sm:gap-4 pl-2">
          <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-xl flex items-center justify-center font-black text-lg sm:text-xl text-white shadow-inner bg-gradient-to-br ${estilo.gradient}`}>
            {nodo.nombre.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-base sm:text-lg">{nodo.nombre}</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
              <span className={`inline-block text-[10px] font-extrabold px-2 sm:px-2.5 py-0.5 rounded-md uppercase tracking-wider ${estilo.badge}`}>
                Nivel {nodo.nivel}
              </span>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-100 text-slate-600`}>
                {TASA_COMISION[nodo.nivel as keyof typeof TASA_COMISION] * 100}% Com.
              </span>
              {nodo.codigo && (
                <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                  Cód: {nodo.codigo}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right sm:pr-2 flex-1 sm:flex-none flex justify-between sm:block w-full sm:w-auto items-center">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Ventas</p>
            <p className="font-black text-slate-900 text-base sm:text-lg">${nodo.ventas.toLocaleString()}</p>
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
        <ul className="mt-4 ml-3 sm:ml-8 space-y-4 border-l-2 border-slate-200 pl-2 sm:pl-5 relative before:absolute before:top-0 before:bottom-0 before:-left-[2px] before:w-[2px] before:bg-gradient-to-b before:from-slate-200 before:to-transparent">
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
  const isOnline = useOnlineStatus();
  const [red, setRed] = useState<Referido | null>(null);
  const [comisionesData, setComisionesData] = useState<MisComisionesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<boolean>(false);

  useEffect(() => {
    let activo = true;
    Promise.all([
      getMiRed(),
      getMisComisiones().catch(() => ({ comisiones: [], pendiente: 0, pagado: 0 })),
    ])
      .then(([arbol, comisiones]) => {
        if (!activo) return;
        setRed(arbol);
        setComisionesData(comisiones);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar la red');
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [user?.email]);

  const codigoReferido = red?.codigo || (user?.email ? user.email.split('@')[0].toUpperCase() : 'INVITADO');
  const referralLink = `${window.location.origin}/registro?ref=${codigoReferido}`;

  const copiarEnlace = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="text-center p-8 text-red-600 font-bold bg-red-50 rounded-2xl border border-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (loading || !red) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
        Cargando tu red y comisiones...
      </div>
    );
  }

  const referidosActivos = contarRed(red);
  const ventasRed = sumarVentasRed(red);
  const nivel = nivelAlcanzado(red.hijos?.length ?? 0);

  const resumen = [
    { etiqueta: "Referidos en Red", valor: referidosActivos.toString(), color: "text-blue-600", bg: "bg-blue-50" },
    { etiqueta: "Ventas de tu Red", valor: `$${ventasRed.toLocaleString()}`, color: "text-indigo-600", bg: "bg-indigo-50" },
    { etiqueta: "Comisiones Pendientes", valor: `$${(comisionesData?.pendiente ?? 0).toFixed(2)}`, color: "text-amber-600", bg: "bg-amber-50" },
    { etiqueta: "Comisiones Pagadas", valor: `$${(comisionesData?.pagado ?? 0).toFixed(2)}`, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Mi Red y Comisiones
            </h1>
            {!isOnline && <IndicadorDatosGuardados />}
          </div>
          <p className="text-slate-500 text-sm">
            Gana el 10% (Nivel 1), 5% (Nivel 2) y 2% (Nivel 3) sobre cada compra generada por tus referidos.
          </p>
        </div>

        {/* Enlace de referido con botón de copiar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 max-w-full">
          <div className="text-xs text-slate-600 truncate max-w-xs sm:max-w-sm">
            <span className="font-semibold text-slate-800">Tu Link: </span>
            <span className="font-mono text-indigo-600 font-bold">{referralLink}</span>
          </div>
          <button
            onClick={copiarEnlace}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition flex-shrink-0 min-h-[36px]"
          >
            {copiado ? "✓ ¡Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      {/* ===== TARJETAS DE RESUMEN ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
        {resumen.map((item) => (
          <div key={item.etiqueta} className={`p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100 text-center hover:-translate-y-1 transition-transform ${item.bg}`}>
            <p className="text-[10px] sm:text-xs text-slate-600 uppercase font-extrabold tracking-widest">{item.etiqueta}</p>
            <p className={`text-2xl sm:text-3xl font-black mt-2 ${item.color}`}>{item.valor}</p>
          </div>
        ))}
      </div>

      {/* ===== ÁRBOL DE REFERIDOS ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 relative overflow-hidden mb-12">
        <h2 className="text-2xl font-extrabold text-slate-900 mb-8 relative z-10 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm shadow-md">🌿</span>
          Tu Estructura Multinivel
        </h2>

        {/* Raíz: el usuario */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8 flex flex-wrap items-center justify-between gap-6 shadow-2xl relative z-10 border border-slate-700 overflow-hidden group">
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-fuchsia-500 flex items-center justify-center font-black text-2xl shadow-inner border border-white/20">
              {red.nombre.charAt(0)}
            </div>
            <div>
              <p className="font-extrabold text-2xl tracking-tight">{red.nombre}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400 font-medium">Distribuidor</span>
                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                  {nivel}
                </span>
                {red.codigo && (
                  <span className="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md">
                    Código: {red.codigo}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10 text-center sm:text-right w-full sm:w-auto relative z-10">
            <p className="text-[10px] uppercase tracking-widest text-slate-300 font-bold mb-0.5">Saldo Pendiente</p>
            <p className="font-black text-2xl text-emerald-400">
              ${(comisionesData?.pendiente ?? 0).toFixed(2)}
            </p>
          </div>
        </div>

        {red.hijos && red.hijos.length > 0 ? (
          <ul className="space-y-4 relative z-10">
            {red.hijos.map((hijo) => (
              <NodoReferido key={hijo.id} nodo={hijo} />
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-sm">Aún no tienes referidos directos en tu red.</p>
            <p className="text-xs text-slate-500 mt-1">
              Comparte tu enlace de invitación para que tus conocidos se registren y comiences a ganar comisiones.
            </p>
          </div>
        )}
      </div>

      {/* ===== PANEL AUDITABLE: LEDGER DE COMISIONES ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm shadow-md">💰</span>
              Libro Mayor de Comisiones (Ledger)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Registro inmutable de cada comisión devengada por venta realizada en tu red
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3 text-center">Nivel</th>
                <th className="px-4 py-3 text-right">Porcentaje</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!comisionesData?.comisiones || comisionesData.comisiones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No se registran comisiones devengadas todavía.
                  </td>
                </tr>
              ) : (
                comisionesData.comisiones.map((com: Comision) => (
                  <tr key={com.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">#{com.id}</td>
                    <td className="px-4 py-3 font-mono text-indigo-600 font-semibold">
                      {com.pedido_numero || `Pedido #${com.pedido_id}`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                        Nivel {com.nivel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {com.porcentaje.toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                      ${com.monto.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          com.estado === "pagada"
                            ? "bg-emerald-100 text-emerald-800"
                            : com.estado === "revertida"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {com.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 whitespace-nowrap">
                      {com.creado_en}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MiRed;