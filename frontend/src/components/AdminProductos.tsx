// src/components/AdminProductos.tsx
import { useState, useEffect, type FormEvent } from "react";
import {
  adminGetProductos,
  adminCrearProducto,
  adminActualizarProducto,
  adminDesactivarProducto,
} from "../services/adminService";
import { type Producto } from "../types/backoffice";
import { ApiError } from "../services/http";

interface FormState {
  id?: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  img: string;
  stock: number;
  activo: boolean;
}

const initialFormState: FormState = {
  nombre: "",
  descripcion: "",
  precio: 0,
  categoria: "Cuidado Facial",
  img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80",
  stock: 10,
  activo: true,
};

const AdminProductos = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [queryParam, setQueryParam] = useState<string>("");

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingProd, setEditingProd] = useState<FormState>(initialFormState);
  const [saving, setSaving] = useState<boolean>(false);

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const limit = 10;

  useEffect(() => {
    let activo = true;
    adminGetProductos(queryParam, page, limit)
      .then((res) => {
        if (!activo) return;
        setProductos(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err) => {
        if (!activo) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Error al cargar productos del catálogo administrativo");
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [page, queryParam, refreshTrigger]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setLoading(true);
    setQueryParam(search);
  };

  const handleOpenCreate = () => {
    setEditingProd(initialFormState);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Producto) => {
    setEditingProd({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      categoria: p.categoria,
      img: p.img,
      stock: p.stock ?? 0,
      activo: p.activo ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingProd.id) {
        await adminActualizarProducto(editingProd.id, {
          nombre: editingProd.nombre,
          descripcion: editingProd.descripcion,
          precio: Number(editingProd.precio),
          categoria: editingProd.categoria,
          img: editingProd.img,
          stock: Number(editingProd.stock),
          activo: editingProd.activo,
        });
        setSuccess("Producto actualizado exitosamente");
      } else {
        await adminCrearProducto({
          nombre: editingProd.nombre,
          descripcion: editingProd.descripcion,
          precio: Number(editingProd.precio),
          categoria: editingProd.categoria,
          img: editingProd.img,
          stock: Number(editingProd.stock),
          activo: true,
        });
        setSuccess("Producto creado exitosamente en el catálogo");
      }
      setModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Error al guardar el producto");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (p: Producto) => {
    const nuevoEstado = !p.activo;
    const confirmMsg = nuevoEstado
      ? `¿Reactivar el producto "${p.nombre}"?`
      : `¿Desactivar el producto "${p.nombre}"? (No se borrará de registros históricos)`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (!nuevoEstado) {
        await adminDesactivarProducto(p.id);
      } else {
        await adminActualizarProducto(p.id, { activo: true });
      }
      setSuccess(nuevoEstado ? "Producto reactivado" : "Producto desactivado");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Error al modificar estado del producto");
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Catálogo de Productos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Administración centralizada de inventario y estado activo/inactivo
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition min-h-[44px]"
        >
          + Nuevo Producto
        </button>
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

      {/* Barra de búsqueda server-side */}
      <form onSubmit={handleSearchSubmit} className="mb-6 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, categoría o descripción..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none text-sm"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition min-h-[44px]"
        >
          Buscar
        </button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setQueryParam("");
              setPage(1);
              setRefreshTrigger((prev) => prev + 1);
            }}
            className="px-3 py-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 text-sm min-h-[44px]"
          >
            Limpiar
          </button>
        )}
      </form>

      {/* Tabla de Productos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Producto</th>
                <th className="px-4 py-3.5">Categoría</th>
                <th className="px-4 py-3.5 text-right">Precio</th>
                <th className="px-4 py-3.5 text-center">Stock</th>
                <th className="px-4 py-3.5 text-center">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Cargando catálogo...
                  </td>
                </tr>
              ) : productos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No se encontraron productos registrados
                  </td>
                </tr>
              ) : (
                productos.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.img}
                          alt={prod.nombre}
                          className="w-12 h-12 object-cover rounded-lg border border-slate-200 bg-slate-100 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://placehold.co/100x100?text=Prod";
                          }}
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{prod.nombre}</div>
                          <div className="text-xs text-slate-400 line-clamp-1 max-w-xs">
                            {prod.descripcion}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {prod.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      ${prod.precio.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono">
                      <span
                        className={`font-semibold ${
                          (prod.stock ?? 0) <= 5 ? "text-amber-600" : "text-slate-800"
                        }`}
                      >
                        {prod.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          prod.activo
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {prod.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(prod)}
                          className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition min-h-[36px]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActivo(prod)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition min-h-[36px] ${
                            prod.activo
                              ? "text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100"
                              : "text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                          }`}
                        >
                          {prod.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
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
              Mostrando página {page} de {totalPages} ({total} productos)
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

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {editingProd.id ? "Editar Producto" : "Nuevo Producto"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editingProd.nombre}
                  onChange={(e) => setEditingProd({ ...editingProd, nombre: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={editingProd.descripcion}
                  onChange={(e) => setEditingProd({ ...editingProd, descripcion: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 outline-none h-20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editingProd.precio}
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, precio: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProd.stock}
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, stock: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Categoría
                </label>
                <input
                  type="text"
                  value={editingProd.categoria}
                  onChange={(e) => setEditingProd({ ...editingProd, categoria: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  URL de Imagen
                </label>
                <input
                  type="url"
                  value={editingProd.img}
                  onChange={(e) => setEditingProd({ ...editingProd, img: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 outline-none font-mono text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-50 min-h-[44px]"
                >
                  {saving ? "Guardando..." : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductos;
