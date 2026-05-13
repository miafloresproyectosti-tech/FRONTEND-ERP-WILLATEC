import { useState } from "react";
import { useRefresh } from "../RefreshContext";
import { useNavigate } from "react-router-dom";

import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  FileText,
  ShoppingCart,
} from "lucide-react";

import { CotizacionDetail } from "./CotizacionDetail";
import { useCotizaciones, type Cotizacion } from "../CotizacionesContext";
import { useAuth } from "../AuthContext";
import { useNotifications } from "../NotificationContext";

export default function Cotizaciones() {
  const { cotizaciones, deleteCotizacion } = useCotizaciones();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { lastSync } = useRefresh();

  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [selectedCotizacion, setSelectedCotizacion] =
    useState<string | null>(null);

  // 👇 SI HAY COTIZACION SELECCIONADA -> ABRE DETALLE
  if (selectedCotizacion) {
    return <CotizacionDetail cotizacionId={selectedCotizacion} />;
  }

  const filteredCotizaciones = cotizaciones.filter((cot) => {
    const matchesSearch =
      cot.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cot.cliente.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEstado =
      filterEstado === "todos" || cot.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  // ✅ BADGES
  const getEstadoBadge = (estado: Cotizacion["estado"]) => {
    const styles: Record<Cotizacion["estado"], string> = {
      borrador: "bg-gray-100 text-gray-700",
      enviada: "bg-blue-100 text-blue-700",
      aprobada: "bg-green-100 text-green-700",
      parcialmente_aprobada: "bg-yellow-100 text-yellow-700",
      rechazada: "bg-red-100 text-red-700",
    };

    const labels: Record<Cotizacion["estado"], string> = {
      borrador: "Borrador",
      enviada: "Enviada",
      aprobada: "Aprobada",
      parcialmente_aprobada: "Parcialmente aprobada",
      rechazada: "Rechazada",
    };

    const estadoValido = estado in styles ? estado : "borrador";

    return {
      style: styles[estadoValido],
      label: labels[estadoValido],
    };
  };

  const totalPorEstado = {
    borrador: cotizaciones.filter((c) => c.estado === "borrador").length,
    enviada: cotizaciones.filter((c) => c.estado === "enviada").length,
    aprobada: cotizaciones.filter((c) => c.estado === "aprobada").length,
  };

  const porRevisar = cotizaciones.filter(
    (c) => c.estado === "enviada"
  ).length;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Cotizaciones
          </h1>

          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestión de cotizaciones del sistema
          </p>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sincronizado: {lastSync}
        </p>
      </div>

      {/* BOTÓN */}
      <button
        onClick={() => setSelectedCotizacion("new")}
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl flex items-center gap-2 transition shadow-lg"
      >
        <Plus size={20} />
        Nueva Cotización
      </button>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-2xl">
              <FileText className="w-6 h-6 text-slate-600 dark:text-slate-200" />
            </div>

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Borradores
              </p>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalPorEstado.borrador}
              </h2>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-2xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Enviadas
              </p>

              <h2 className="text-2xl font-bold text-blue-600">
                {totalPorEstado.enviada}
              </h2>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 dark:bg-emerald-900 p-3 rounded-2xl">
              <FileText className="w-6 h-6 text-green-600" />
            </div>

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aprobadas
              </p>

              <h2 className="text-2xl font-bold text-green-600">
                {totalPorEstado.aprobada}
              </h2>
            </div>
          </div>
        </div>

        {user?.role === "SUPERADMIN" && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-yellow-200 dark:border-yellow-700">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-2xl">
                <FileText className="w-6 h-6 text-yellow-600" />
              </div>

              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Por revisar
                </p>

                <h2 className="text-2xl font-bold text-yellow-600">
                  {porRevisar}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFilterEstado("enviada")}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-yellow-700 bg-yellow-50 px-4 py-2 rounded-2xl hover:bg-yellow-100"
            >
              Ver pendientes
            </button>
          </div>
        )}
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
        {/* FILTROS */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />

            <input
              type="text"
              placeholder="Buscar por código o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
            />
          </div>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="todos">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="enviada">Enviada</option>
            <option value="aprobada">Aprobada</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Código
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Fecha
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Cliente
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Ítems
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Total
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Estado
                </th>

                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredCotizaciones.map((cotizacion) => {
                const estadoBadge = getEstadoBadge(cotizacion.estado);

                return (
                  <tr
                    key={cotizacion.id}
                    className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 transition"
                  >
                    <td className="px-6 py-5">
                      <span className="font-semibold text-blue-600 dark:text-blue-300">
                        {cotizacion.id}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Calendar size={16} />

                        {new Date(cotizacion.fecha).toLocaleDateString(
                          "es-PE",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-slate-900 dark:text-slate-100">
                      {cotizacion.cliente}
                    </td>

                    <td className="px-6 py-5 text-slate-600 dark:text-slate-300">
                      {cotizacion.items.length}
                    </td>

                    <td className="px-6 py-5 font-semibold text-slate-900 dark:text-slate-100">
                      S/.{" "}
                      {cotizacion.items
                        .reduce(
                          (sum, item) =>
                            sum + item.precioVenta * item.cantidad,
                          0
                        )
                        .toLocaleString()}
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${estadoBadge.style}`}
                      >
                        {estadoBadge.label}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-3">
                        {/* VER */}
                        <button
                          onClick={() =>
                            setSelectedCotizacion(cotizacion.id)
                          }
                          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                          title="Ver detalle"
                        >
                          <Eye size={18} />
                        </button>

                        {/* EDITAR */}
                        <button
                          onClick={() =>
                            setSelectedCotizacion(cotizacion.id)
                          }
                          className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                          title="Editar cotización"
                        >
                          <Pencil size={18} />
                        </button>

                        {/* ELIMINAR */}
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Eliminar cotización ${cotizacion.id}?`
                              )
                            ) {
                              deleteCotizacion(cotizacion.id);

                              if (user) {
                                addNotification({
                                  title: "Cotización eliminada",
                                  description: `Cotización ${cotizacion.id} eliminada por ${user.role.toLowerCase()}.`,
                                  type: "warning",
                                  icon: "CheckCircle",
                                  route: "/cotizaciones",
                                  targetRole: "SUPERADMIN",
                                });
                              }
                            }
                          }}
                          className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition"
                          title="Eliminar cotización"
                        >
                          <Trash2 size={18} />
                        </button>

                        {/* GENERAR OC */}
                        <button
                          onClick={() => {
                            navigate(
                              `/ordenes-compra/nueva?cotizacion=${cotizacion.id}`
                            );

                            addNotification({
                              title: "Orden de compra generada",
                              description: `OC creada desde cotización ${cotizacion.id}`,
                              type: "success",
                              icon: "CheckCircle",
                              route: "/ordenes-compra",
                              targetRole: "SUPERADMIN",
                            });
                          }}
                          className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition"
                          title="Generar Orden de Compra"
                        >
                          <ShoppingCart size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}