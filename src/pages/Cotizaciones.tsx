import { useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";

import { useAuth } from "../AuthContext";
import { useNotifications } from "../NotificationContext";
import { getCotizaciones, type Cotizacion as ApiCotizacion } from "../services/cotizacion.service";

export default function Cotizaciones() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { lastSync } = useRefresh();

  const navigate = useNavigate();



  const [cotizaciones, setCotizaciones] = useState<ApiCotizacion[]>([]);


  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");

  // Cargar cotizaciones al montar el componente
  useEffect(() => {
    loadCotizaciones();
  }, []);

  const loadCotizaciones = async () => {
    try {
      setLoading(true);
      const data = await getCotizaciones();
      setCotizaciones(data);
    } catch (error) {
      console.error('Error al cargar cotizaciones:', error);
      addNotification({
        title: 'Error al cargar cotizaciones',
        description: 'Verifica tu conexión e intenta de nuevo',
        type: 'warning',
        icon: 'MessageCircle',
        route: '/cotizaciones',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCotizaciones = cotizaciones.filter((cot) => {
    const matchesSearch =
      cot.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cot.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase());

    const mapEstado = {
      '1': 'borrador',
      '2': 'enviada',
      '3': 'parcialmente_aprobada',
      '4': 'aprobada',
      '5': 'rechazada',
      '6': 'oc_registrada',
    } as Record<string, string>;

    const cotEstado = mapEstado[cot.estado_cotizacion_id?.toString() || '1'] || 'borrador';

    const matchesEstado =
      filterEstado === "todos" || cotEstado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  // ✅ BADGES
  const getEstadoBadge = (estadoId: number) => {
    const styles: Record<number, string> = {
      1: "bg-gray-100 text-gray-700",
      2: "bg-blue-100 text-blue-700",
      3: "bg-green-100 text-green-700",
      4: "bg-yellow-100 text-yellow-700",
      5: "bg-red-100 text-red-700",
    };

    const labels: Record<number, string> = {
      1: "Borrador",
      2: "Enviada",
      3: "Parcialmente aprobada",
      4: "Aprobada",
      5: "Rechazada",
      6: "OC_Registrada",
    };

    return {
      style: styles[estadoId] || styles[1],
      label: labels[estadoId] || labels[1],
    };
  };

  const getEjecutivoNombre = (cotizacion: ApiCotizacion) => {
    const ejecutivo = (cotizacion.user || cotizacion.usuario) as any;
    const nombres = ejecutivo?.profile?.nombres || ejecutivo?.nombres || ejecutivo?.name;
    const apellidos = ejecutivo?.profile?.apellidos;

    if (nombres) {
      return `${nombres}${apellidos ? ` ${apellidos}` : ''}`;
    }

    return cotizacion.user_id ? `Usuario #${cotizacion.user_id}` : 'N/A';
  };

  const totalPorEstado = {
    borrador: cotizaciones.filter((c) => Number(c.estado_cotizacion_id) === 1).length,
    enviada: cotizaciones.filter((c) => Number(c.estado_cotizacion_id) === 2).length,
    parcialmente_aprobada: cotizaciones.filter((c) => Number(c.estado_cotizacion_id) === 3).length,
    aprobada: cotizaciones.filter((c) => Number(c.estado_cotizacion_id) === 4).length,
    rechazada: cotizaciones.filter((c) => Number(c.estado_cotizacion_id) === 5).length,
    oc_registrada: cotizaciones.filter((c) => Number(c.estado_cotizacion_id) === 6).length,
  };

  const porRevisar = cotizaciones.filter(
    (c) => Number(c.estado_cotizacion_id) === 2
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
          Sincronizado: {lastSync ? new Date(lastSync).toLocaleTimeString('es-PE') : '—'}
        </p>
      </div>

      {/* BOTÓN */}
      <button
        onClick={() => navigate("/cotizaciones/new")}
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
            <option value="aprobada">Parcialmente Aprobada</option>
            <option value="aprobada">Aprobada</option>
            <option value="aprobada">OC_Registrada</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Cargando cotizaciones...</span>
            </div>
          ) : (
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
                    Ejecutivo
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
                {filteredCotizaciones.length > 0 ? (
                  filteredCotizaciones.map((cotizacion) => {
                    const estadoBadge = getEstadoBadge(cotizacion.estado_cotizacion_id);
                    const puedeEditar =
                      // user?.role === 'SUPERADMIN' ||
                      cotizacion.user_id === user?.id;

                    return (
                      <tr
                        key={cotizacion.id}
                        className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 transition"
                      >
                        <td className="px-6 py-5">
                          <span className="font-semibold text-blue-600 dark:text-blue-300">
                            {cotizacion.numero}
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
                          {cotizacion.cliente_nombre}
                        </td>

                        <td className="px-6 py-5 text-slate-600 dark:text-slate-300">
                          <div className="text-sm">
                            {getEjecutivoNombre(cotizacion)}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-slate-600 dark:text-slate-300">
                          {(cotizacion as any).items_count ?? 0}
                        </td>

                        <td className="px-6 py-5 font-semibold text-slate-900 dark:text-slate-100">
                          S/. {Number(cotizacion.total).toLocaleString("es-PE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
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
                                navigate(`/cotizaciones/${cotizacion.id}/view`)
                              }

                              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                              title="Ver detalle"
                            >
                              <Eye size={18} />
                            </button>

                            {/* EDITAR */}
                            {puedeEditar && (
                              <button
                              onClick={() =>
                                navigate(`/cotizaciones/${cotizacion.id}/edit`)
                              }
                              className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                              title="Editar cotización"
                            >
                              <Pencil size={18} />
                            </button>
                            )}
                            

                            {/* ELIMINAR */}
                            {puedeEditar && (
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `¿Eliminar cotización ${cotizacion.numero}?`
                                  )
                                ) {
                                  // TODO: Implementar eliminación desde API
                                  addNotification({
                                    title: 'Función no disponible',
                                    description: 'La eliminación de cotizaciones aún no está implementada',
                                    type: 'info',
                                    icon: 'MessageCircle',
                                    route: '/cotizaciones',
                                  });
                                }
                              }}
                              className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition"
                              title="Eliminar cotización"
                            >
                              <Trash2 size={18} />
                            </button>
                            )}
                            

                            {/* GENERAR OC */}
                            {puedeEditar && (
                              <button
                              onClick={() => {
                                navigate(
                                  `/ordenes-compra/nueva?cotizacion=${cotizacion.id}`
                                );

                                addNotification({
                                  title: "Orden de compra generada",
                                  description: `OC creada desde cotización ${cotizacion.numero}`,
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
                            )}
                            
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      {searchTerm || filterEstado !== "todos" ? "No se encontraron cotizaciones" : "No hay cotizaciones"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}