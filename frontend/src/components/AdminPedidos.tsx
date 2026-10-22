// src/components/AdminPedidos.tsx
import { useState, useEffect } from "react";
import { adminGetPedidos, adminCambiarEstadoPedido } from "../services/pedidosService";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import IndicadorDatosGuardados from "./IndicadorDatosGuardados";
import { type Pedido, type EstadoPedido } from "../types/backoffice";
import { ApiError, NetworkError } from "../services/http";

const ESTADOS: EstadoPedido[] = ["pendiente", "preparando", "enviado", "entregado", "cancelado"];

const getBadgeStyle = (estado: EstadoPedido) => {
  switch (estado) {
    case "entregado":
      return "bg-emerald-100 text-emerald-800";
    case "enviado":
      return "bg-blue-100 text-blue-800";
    case "preparando":
      return "bg-amber-100 text-amber-800";
    case "cancelado":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

const AdminPedidos = () => {
  const isOnline = useOnlineStatus();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const limit = 10;

  useEffect(() => {
    let activo = true;
    adminGetPedidos(estadoFiltro, page, limit)
      .then((res) => {
        if (!activo) return;
        setPedidos(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err) => {
        if (!activo) return;
        if (err instanceof ApiError) setError(err.message);
        else if (err instanceof NetworkError) setError("Sin conexiÃ³n: no se pudieron cargar los pedidos.");
        else setError("Error al cargar pedidos");
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [page, estadoFiltro, refreshTrigger]);

  const handleCambiarEstado = async (id: number, nuevoEstado: EstadoPedido) => {
    setUpdatingId(id);
    setError("");
    setSuccess("");
    try {
      const updated = await adminCambiarEstadoPedido(id, nuevoEstado);
      setSuccess(`Pedido ${updated.numero} actualizado a "${nuevoEstado}"`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("No se pudo cambiar el estado del pedido");
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Gestión de Pedidos</h1>
            {!isOnline && <IndicadorDatosGuardados />}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Control de ciclo de vida, despacho y transiciones de estado de compras
          </p>
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

      {/* Filtros de estado */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs font-semibold uppercase text-slate-500 mr-2">Filtrar por:</span>
        <button
          onClick={() => {
            setEstadoFiltro("");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition min-h-[36px] ${
            estadoFiltro === ""
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Todos
        </button>
        {ESTADOS.map((est) => (
          <button
            key={est}
            onClick={() => {
              setEstadoFiltro(est);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition min-h-[36px] ${
              estadoFiltro === est
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {est}
          </button>
        ))}
      </div>

      {/* Tabla de pedidos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Nº Pedido</th>
                <th className="px-4 py-3.5">Cliente</th>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-4 py-3.5 text-right">Total</th>
                <th className="px-4 py-3.5 text-center">Estado Actual</th>
                <th className="px-4 py-3.5 text-right">Cambiar Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Cargando pedidos...
                  </td>
                </tr>
              ) : pedidos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No se encontraron pedidos con este filtro
                  </td>
                </tr>
              ) : (
                pedidos.map((ped) => {
                  const isExpanded = expandedId === ped.id;
                  return (
                    <tr key={ped.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : ped.id)}
                          className="font-mono font-bold text-indigo-600 hover:text-indigo-800 text-left min-h-[36px] flex items-center"
                        >
                          {ped.numero} {isExpanded ? "▲" : "▼"}
                        </button>
                        {isExpanded && ped.items && (
                          <div className="mt-2 text-xs text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            {ped.items.map((it) => (
                              <div key={it.id} className="flex justify-between">
                                <span>{it.cantidad}x {it.nombre}</span>
                                <span className="font-mono">${it.subtotal.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="pt-1 border-t border-slate-200 text-slate-400">
                              Dir: {ped.direccion}, {ped.ciudad}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{ped.cliente_nombre}</div>
                        <div className="text-xs text-slate-400">{ped.cliente_email}</div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {ped.fecha}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                        ${ped.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getBadgeStyle(
                            ped.estado
                          )}`}
                        >
                          {ped.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <select
                          disabled={updatingId === ped.id || ped.estado === "cancelado" || ped.estado === "entregado"}
                          value={ped.estado}
                          onChange={(e) =>
                            handleCambiarEstado(ped.id, e.target.value as EstadoPedido)
                          }
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-indigo-600 outline-none transition disabled:opacity-40 min-h-[36px]"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="preparando">Preparando</option>
                          <option value="enviado">Enviado</option>
                          <option value="entregado">Entregado</option>
                          <option value="cancelado">Cancelado (Revertir)</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-xs text-slate-500">
              Página {page} de {totalPages} ({total} pedidos)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-40 min-h-[36px]"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-40 min-h-[36px]"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPedidos;
