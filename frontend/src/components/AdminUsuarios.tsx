// src/components/AdminUsuarios.tsx
import { useState, useEffect, type FormEvent } from "react";
import { adminGetUsuarios } from "../services/usuariosService";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import IndicadorDatosGuardados from "./IndicadorDatosGuardados";
import { type UsuarioAdmin } from "../types/backoffice";
import { ApiError, NetworkError } from "../services/http";

const getRolBadgeStyle = (rol: string) =>
  rol === "admin" ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-700";

const getEstadoBadgeStyle = (activo: boolean) =>
  activo ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800";

const AdminUsuarios = () => {
  const isOnline = useOnlineStatus();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [busqueda, setBusqueda] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const limit = 10;

  useEffect(() => {
    let activo = true;
    setLoading(true);
    adminGetUsuarios({ q, page, limit })
      .then((res) => {
        if (!activo) return;
        setUsuarios(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err) => {
        if (!activo) return;
        if (err instanceof ApiError) setError(err.message);
        else if (err instanceof NetworkError)
          setError("Sin conexión: no se pudieron cargar los usuarios.");
        else setError("Error al cargar usuarios");
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [q, page]);

  const handleBuscar = (e: FormEvent) => {
    e.preventDefault();
    setQ(busqueda.trim());
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Gestión de Usuarios</h1>
            {!isOnline && <IndicadorDatosGuardados />}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cuentas registradas, rol, nodo de red y actividad de compras
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="font-bold">✕</button>
        </div>
      )}

      {/* Búsqueda por nombre o email */}
      <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o email"
          className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 outline-none transition min-h-[40px]"
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition min-h-[40px]"
        >
          Buscar
        </button>
      </form>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Usuario</th>
                <th className="px-4 py-3.5 text-center">Rol</th>
                <th className="px-4 py-3.5">Nodo</th>
                <th className="px-4 py-3.5 text-center">Nivel</th>
                <th className="px-4 py-3.5 text-right">Pedidos</th>
                <th className="px-4 py-3.5 text-right">Ventas</th>
                <th className="px-4 py-3.5 text-center">Estado</th>
                <th className="px-4 py-3.5">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No se encontraron usuarios con este filtro
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{usuario.nombre}</div>
                      <div className="text-xs text-slate-400">{usuario.email}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getRolBadgeStyle(
                          usuario.rol
                        )}`}
                      >
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">{usuario.nodo_nombre ?? "—"}</td>
                    <td className="px-4 py-3.5 text-center font-mono">{usuario.nivel}</td>
                    <td className="px-4 py-3.5 text-right font-mono">{usuario.pedidos}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      ${usuario.ventas.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getEstadoBadgeStyle(
                          usuario.activo
                        )}`}
                      >
                        {usuario.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {usuario.creado_en ? usuario.creado_en.split(" ")[0] : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-xs text-slate-500">
              Página {page} de {totalPages} ({total} usuarios)
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

export default AdminUsuarios;
