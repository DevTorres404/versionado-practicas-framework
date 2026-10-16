// src/components/MisPedidos.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMisPedidos } from "../services/pedidosService";
import { type Pedido, type EstadoPedido } from "../types/backoffice";
import { ApiError } from "../services/http";

const getEstadoBadgeClass = (estado: EstadoPedido) => {
  switch (estado) {
    case "entregado":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "enviado":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "preparando":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "cancelado":
      return "bg-rose-100 text-rose-800 border-rose-300";
    case "pendiente":
    default:
      return "bg-slate-100 text-slate-800 border-slate-300";
  }
};

const MisPedidos = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const limit = 10;

  useEffect(() => {
    let activo = true;
    getMisPedidos(page, limit)
      .then((res) => {
        if (!activo) return;
        setPedidos(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err) => {
        if (!activo) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Error al cargar tus pedidos");
        }
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [page]);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Mis Pedidos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Revisa el historial y estado en tiempo real de tus compras
          </p>
        </div>
        <Link
          to="/tienda"
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition min-h-[44px]"
        >
          Explorar Tienda
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6 text-sm"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
          Cargando pedidos...
        </div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            📦
          </div>
          <h2 className="text-lg font-semibold text-slate-800">No tienes pedidos registrados</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-2 mb-6">
            Aún no has realizado ninguna compra en el catálogo. ¡Descubre nuestros productos cosméticos exclusivos!
          </p>
          <Link
            to="/tienda"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition min-h-[44px]"
          >
            Ir a la Tienda
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((ped) => {
            const isExpanded = expandedId === ped.id;
            return (
              <div
                key={ped.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition"
              >
                <div
                  onClick={() => toggleExpand(ped.id)}
                  className="p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900 text-lg">
                        {ped.numero}
                      </span>
                      <span
                        className={`text-xs uppercase font-semibold px-2.5 py-1 rounded-full border ${getEstadoBadgeClass(
                          ped.estado
                        )}`}
                      >
                        {ped.estado}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Fecha: {ped.fecha} • Método: {ped.metodo_pago}
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto gap-6">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Total</div>
                      <div className="text-xl font-black text-indigo-600">
                        ${ped.total.toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={isExpanded ? "Ocultar detalle" : "Ver detalle"}
                      className="p-2 text-slate-400 hover:text-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <span className="text-xl font-bold">{isExpanded ? "▲" : "▼"}</span>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Productos del pedido
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                          <tr>
                            <th className="px-3 py-2 rounded-l-lg">Producto</th>
                            <th className="px-3 py-2 text-center">Cant.</th>
                            <th className="px-3 py-2 text-right">Precio Unit.</th>
                            <th className="px-3 py-2 text-right rounded-r-lg">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ped.items && ped.items.length > 0 ? (
                            ped.items.map((it) => (
                              <tr key={it.id}>
                                <td className="px-3 py-2.5 font-medium text-slate-800">
                                  {it.nombre}
                                </td>
                                <td className="px-3 py-2.5 text-center">{it.cantidad}</td>
                                <td className="px-3 py-2.5 text-right font-mono">
                                  ${it.precio.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                                  ${it.subtotal.toFixed(2)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-3 py-3 text-center text-slate-400 text-xs">
                                Sin desglose de items disponible
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
                      <span>Destino: {ped.direccion}, {ped.ciudad}</span>
                      <span>Contacto: {ped.cliente_nombre} ({ped.telefono})</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-slate-500">
                Página {page} de {totalPages} ({total} pedidos en total)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[44px]"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 min-h-[44px]"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MisPedidos;
