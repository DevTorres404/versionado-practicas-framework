// src/components/AdminLiquidaciones.tsx
import { useState, useEffect, type FormEvent } from "react";
import { adminGetLiquidaciones, adminCrearLiquidacion } from "../services/adminService";
import { type Liquidacion } from "../types/backoffice";
import { ApiError } from "../services/http";

const AdminLiquidaciones = () => {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [referidoId, setReferidoId] = useState<string>("");
  const [procesando, setProcesando] = useState<boolean>(false);

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    let activo = true;
    adminGetLiquidaciones()
      .then((res) => {
        if (!activo) return;
        setLiquidaciones(res || []);
      })
      .catch((err) => {
        if (!activo) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Error al cargar historial de liquidaciones");
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [refreshTrigger]);

  const handleLiquidar = async (e: FormEvent) => {
    e.preventDefault();
    const idNum = parseInt(referidoId, 10);
    if (!idNum || idNum <= 0) {
      setError("Ingresa un ID de distribuidor / referido válido (número positivo)");
      return;
    }

    if (!window.confirm(`¿Confirmas procesar la liquidación de comisiones acumuladas para el distribuidor ID ${idNum}?`)) {
      return;
    }

    setProcesando(true);
    setError("");
    setSuccess("");

    try {
      const res = await adminCrearLiquidacion(idNum);
      setSuccess(
        `Liquidación #${res.id} generada con éxito por un total de $${res.total.toFixed(2)}`
      );
      setReferidoId("");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("No se pudo procesar la liquidación. Verifica que tenga saldo pendiente.");
    } finally {
      setProcesando(false);
    }
  };

  const totalHistorico = liquidaciones.reduce((acc, l) => acc + l.total, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Liquidaciones a Distribuidores</h1>
          <p className="text-sm text-slate-500 mt-1">
            Cierre del ciclo del dinero: liquidar comisiones acumuladas a la red MLM
          </p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 text-right">
          <div className="text-xs text-indigo-700 font-medium">Total Liquidado Histórico</div>
          <div className="text-2xl font-black text-indigo-900 font-mono">${totalHistorico.toFixed(2)}</div>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 mb-6 text-sm flex justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="font-bold">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="font-bold">✕</button>
        </div>
      )}

      {/* Tarjeta de acción: Liquidar por ID */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Liquidar Comisiones Pendientes</h2>
        <p className="text-sm text-slate-500 mb-4">
          Bloquea atómicamente (`FOR UPDATE`) todas las comisiones en estado <span className="font-semibold text-amber-600">pendiente</span> del distribuidor y genera el comprobante de desembolso.
        </p>

        <form onSubmit={handleLiquidar} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <div className="flex-1">
            <input
              type="number"
              min="1"
              value={referidoId}
              onChange={(e) => setReferidoId(e.target.value)}
              placeholder="ID del distribuidor (ej: 1, 2, 4)..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 outline-none font-mono"
              required
            />
          </div>
          <button
            type="submit"
            disabled={procesando}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition disabled:opacity-50 min-h-[44px]"
          >
            {procesando ? "Procesando..." : "Liquidar Ahora"}
          </button>
        </form>
      </div>

      {/* Historial de liquidaciones */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Historial de Liquidaciones Ejecutadas</h3>
          <span className="text-xs text-slate-400">{liquidaciones.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">ID Liq.</th>
                <th className="px-4 py-3.5">Distribuidor</th>
                <th className="px-4 py-3.5 text-right">Total Desembolsado</th>
                <th className="px-4 py-3.5 text-center">Estado</th>
                <th className="px-4 py-3.5">Fecha Creación</th>
                <th className="px-4 py-3.5">Fecha Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Cargando historial de pagos...
                  </td>
                </tr>
              ) : liquidaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No se han efectuado liquidaciones aún
                  </td>
                </tr>
              ) : (
                liquidaciones.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                      #{l.id}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {l.referido_nombre || `Distribuidor #${l.referido_id}`}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">ID: {l.referido_id}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600">
                      ${l.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800">
                        {l.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {l.creado_en}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {l.pagada_en || "—"}
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

export default AdminLiquidaciones;
