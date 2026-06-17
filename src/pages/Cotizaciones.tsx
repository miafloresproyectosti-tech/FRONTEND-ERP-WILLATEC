import { useCallback, useEffect, useState } from "react";
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
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";

import { useAuth } from "../AuthContext";
import { useNotifications } from "../NotificationContext";
import { deleteCotizacion, getCotizacionesPaginated, type Cotizacion as ApiCotizacion } from "../services/cotizacion.service";
import { getUsers, type User as ApiUser } from "../services/usuario.service";
import { formatMoney } from "../utils/formatNumber";

function formatCotizacionDate(value?: string | null): string {
  if (!value) return "N/A";

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  });
}

interface EjecutivoOption {
  id: number;
  nombre: string;
  total: number;
}

type CotizacionListItem = ApiCotizacion & {
  delegadoCotizacionId?: number | null;
  items_count?: number | null;
};

type ApiErrorResponse = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

type EjecutivoCotizacion = {
  id: number;
  nombres?: string;
  name?: string;
  email?: string;
  profile?: {
    nombres?: string;
    apellidos?: string;
  };
};

type EstadoResumenKey =
  | "borrador"
  | "enviada"
  | "parcialmente_aprobada"
  | "aprobada"
  | "rechazada"
  | "oc_registrada";

const ESTADO_FILTER_MAP: Record<EstadoResumenKey, number> = {
  borrador: 1,
  enviada: 2,
  parcialmente_aprobada: 3,
  aprobada: 4,
  rechazada: 5,
  oc_registrada: 6,
};

const EMPTY_TOTAL_POR_ESTADO: Record<EstadoResumenKey, number> = {
  borrador: 0,
  enviada: 0,
  parcialmente_aprobada: 0,
  aprobada: 0,
  rechazada: 0,
  oc_registrada: 0,
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as ApiErrorResponse).response;

    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }
  }

  return fallback;
};

export default function Cotizaciones() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { lastSync } = useRefresh();

  const navigate = useNavigate();



  const [cotizaciones, setCotizaciones] = useState<ApiCotizacion[]>([]);


  const [loading, setLoading] = useState(true);
  const [loadingEjecutivos, setLoadingEjecutivos] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterEjecutivo, setFilterEjecutivo] = useState("todos");
  const [ejecutivoOptions, setEjecutivoOptions] = useState<EjecutivoOption[]>([]);
  const [totalPorEstado, setTotalPorEstado] = useState<Record<EstadoResumenKey, number>>(EMPTY_TOTAL_POR_ESTADO);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCotizaciones, setTotalCotizaciones] = useState(0);
  const [paginationFrom, setPaginationFrom] = useState(0);
  const [paginationTo, setPaginationTo] = useState(0);
  const [cotizacionToDelete, setCotizacionToDelete] = useState<ApiCotizacion | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deletingCotizacionId, setDeletingCotizacionId] = useState<number | null>(null);
  const itemsPerPage = 10;

  const loadCotizaciones = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCotizacionesPaginated({
        page: currentPage,
        search: searchTerm,
        perPage: itemsPerPage,
        estadoCotizacionId: ESTADO_FILTER_MAP[filterEstado as EstadoResumenKey],
        ejecutivoId: filterEjecutivo === "todos" ? undefined : Number(filterEjecutivo),
      });
      setCotizaciones(response.data || []);
      setTotalPages(response.last_page || 1);
      setTotalCotizaciones(response.total || 0);
      setPaginationFrom(response.from || 0);
      setPaginationTo(response.to || 0);
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
  }, [addNotification, currentPage, filterEjecutivo, filterEstado, searchTerm]);

  const paginatedCotizaciones = cotizaciones;

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

  const getEjecutivoNombre = useCallback((cotizacion: ApiCotizacion) => {
    const ejecutivo = (cotizacion.user || cotizacion.usuario) as EjecutivoCotizacion | undefined;
    const nombres = ejecutivo?.profile?.nombres || ejecutivo?.nombres || ejecutivo?.name;
    const apellidos = ejecutivo?.profile?.apellidos;

    if (nombres) {
      return `${nombres}${apellidos ? ` ${apellidos}` : ''}`;
    }

    return cotizacion.user_id ? `Usuario #${cotizacion.user_id}` : 'N/A';
  }, []);

  const getApiUserNombre = useCallback((apiUser: ApiUser) => {
    const nombres = apiUser.nombres || "";
    const apellidos = apiUser.apellidos || "";
    const nombreCompleto = `${nombres} ${apellidos}`.trim();

    return nombreCompleto || apiUser.email || `Usuario #${apiUser.id}`;
  }, []);

  const isVentasUser = useCallback((apiUser: ApiUser) => {
    const roleNames = (apiUser.roles || []).map((role) => role.name.toUpperCase());

    return roleNames.length === 0 || roleNames.includes("VENTAS");
  }, []);

  const loadEjecutivosResumen = useCallback(async () => {
    try {
      setLoadingEjecutivos(true);
      const users = await getUsers();
      const ventasUsers = users.filter((apiUser) => apiUser.activo !== false && isVentasUser(apiUser));

      const resumen = await Promise.all(
        ventasUsers.map(async (apiUser) => {
          const response = await getCotizacionesPaginated({
            page: 1,
            perPage: 1,
            search: searchTerm,
            estadoCotizacionId: ESTADO_FILTER_MAP[filterEstado as EstadoResumenKey],
            ejecutivoId: apiUser.id,
          });

          return {
            id: apiUser.id,
            nombre: getApiUserNombre(apiUser),
            total: response.total || 0,
          };
        })
      );

      setEjecutivoOptions(
        resumen
          .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre))
      );
    } catch (error) {
      console.warn("Error al cargar resumen de ejecutivos:", error);
      setEjecutivoOptions([]);
    } finally {
      setLoadingEjecutivos(false);
    }
  }, [filterEstado, getApiUserNombre, isVentasUser, searchTerm]);

  const loadResumenEstados = useCallback(async () => {
    try {
      const ejecutivoId = filterEjecutivo === "todos" ? undefined : Number(filterEjecutivo);
      const resumen = await Promise.all(
        Object.entries(ESTADO_FILTER_MAP).map(async ([key, estadoCotizacionId]) => {
          const response = await getCotizacionesPaginated({
            page: 1,
            perPage: 1,
            search: searchTerm,
            estadoCotizacionId,
            ejecutivoId,
          });

          return [key, response.total || 0] as const;
        })
      );

      setTotalPorEstado({
        ...EMPTY_TOTAL_POR_ESTADO,
        ...Object.fromEntries(resumen),
      });
    } catch (error) {
      console.error("Error al cargar resumen de cotizaciones por estado:", error);
    }
  }, [filterEjecutivo, searchTerm]);

  // Cargar cotizaciones al montar el componente
  useEffect(() => {
    void Promise.resolve().then(() => loadCotizaciones());
  }, [loadCotizaciones]);

  useEffect(() => {
    void Promise.resolve().then(() => loadResumenEstados());
  }, [loadResumenEstados]);

  useEffect(() => {
    void Promise.resolve().then(() => loadEjecutivosResumen());
  }, [loadEjecutivosResumen]);

  const getSimboloMoneda = (cotizacion: ApiCotizacion) => {
    return Number(cotizacion.moneda_id) === 2 ? "$" : "S/";
  };

  const porRevisar = totalPorEstado.enviada;

  const selectedEjecutivo = ejecutivoOptions.find((ejecutivo) => String(ejecutivo.id) === filterEjecutivo);

  const closeDeleteModal = () => {
    if (deletingCotizacionId) return;
    setCotizacionToDelete(null);
    setDeleteConfirmationText("");
  };

  const handleDeleteCotizacion = async () => {
    if (!cotizacionToDelete) return;

    const cotizacionId = Number(cotizacionToDelete.id);
    setDeletingCotizacionId(cotizacionId);

    try {
      await deleteCotizacion(cotizacionId);
      setCotizaciones((prev) => prev.filter((cotizacion) => Number(cotizacion.id) !== cotizacionId));
      addNotification({
        title: "Cotización eliminada",
        description: `La cotización ${cotizacionToDelete.numero} fue eliminada correctamente`,
        type: "success",
        icon: "CheckCircle",
        route: "/cotizaciones",
      });
      setCotizacionToDelete(null);
      setDeleteConfirmationText("");
    } catch (error: unknown) {
      addNotification({
        title: "Error al eliminar cotización",
        description: getApiErrorMessage(error, "No se pudo eliminar la cotización"),
        type: "warning",
        icon: "MessageCircle",
        route: "/cotizaciones",
      });
    } finally {
      setDeletingCotizacionId(null);
    }
  };


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

      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200 dark:border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-2xl">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-200" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cotizaciones por ejecutivo
              </p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {filterEjecutivo === "todos"
                  ? `${totalCotizaciones} en total`
                  : `${totalCotizaciones} de ${selectedEjecutivo?.nombre || "este ejecutivo"}`}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {loadingEjecutivos ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <Loader2 size={14} className="animate-spin" /> Calculando...
              </span>
            ) : ejecutivoOptions.length > 0 ? (
              ejecutivoOptions.slice(0, 6).map((ejecutivo) => (
                <button
                  key={ejecutivo.id}
                  type="button"
                  onClick={() => {
                    setFilterEjecutivo(String(ejecutivo.id));
                    setCurrentPage(1);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    filterEjecutivo === String(ejecutivo.id)
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {ejecutivo.nombre}: {ejecutivo.total}
                </button>
              ))
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                Sin datos de ejecutivos
              </span>
            )}
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
        {/* FILTROS */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />

            <input
              type="text"
              placeholder="Buscar por código o cliente..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <select
              value={filterEjecutivo}
              onChange={(e) => {
                setFilterEjecutivo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white sm:w-64"
            >
              <option value="todos">Todos los ejecutivos</option>
              {ejecutivoOptions.map((ejecutivo) => (
                <option key={ejecutivo.id} value={ejecutivo.id}>
                  {ejecutivo.nombre} ({ejecutivo.total})
                </option>
              ))}
            </select>

            <select
              value={filterEstado}
              onChange={(e) => {
                setFilterEstado(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white sm:w-56"
            >
              <option value="todos">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="enviada">Enviada</option>
              <option value="parcialmente_aprobada">Parcialmente Aprobada</option>
              <option value="aprobada">Aprobada</option>
              <option value="oc_registrada">OC_Registrada</option>
            </select>
          </div>
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
                {paginatedCotizaciones.length > 0 ? (
                  paginatedCotizaciones.map((cotizacion) => {
                    const cotizacionListItem = cotizacion as CotizacionListItem;
                    const estadoBadge = getEstadoBadge(cotizacion.estado_cotizacion_id);
                    const userId = Number(user?.id);
                    const cotizacionUserId = Number(cotizacion.user_id);
                    const delegadoCotizacionId = Number(
                      cotizacionListItem.delegado_cotizacion_id ?? cotizacionListItem.delegadoCotizacionId ?? 0
                    );
                    const puedeEditar =
                      Boolean(user?.id) &&
                      (cotizacionUserId === userId || delegadoCotizacionId === userId);

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

                            {formatCotizacionDate(cotizacion.fecha)}
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
                          {cotizacionListItem.items_count ?? 0}
                        </td>

                        <td className="px-6 py-5 font-semibold text-slate-900 dark:text-slate-100">
                          {formatMoney(cotizacion.total, getSimboloMoneda(cotizacion))}
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
                                setCotizacionToDelete(cotizacion);
                                setDeleteConfirmationText("");
                              }}
                              disabled={deletingCotizacionId === Number(cotizacion.id)}
                              className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
                              title="Eliminar cotización"
                            >
                              {deletingCotizacionId === Number(cotizacion.id) ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Trash2 size={18} />
                              )}
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
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      {searchTerm || filterEstado !== "todos" || filterEjecutivo !== "todos" ? "No se encontraron cotizaciones" : "No hay cotizaciones"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINACIÓN */}
        {totalCotizaciones > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Mostrando {paginationFrom} a {paginationTo} de {totalCotizaciones} cotizaciones
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Página anterior"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg font-medium transition ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-900"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Página siguiente"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {cotizacionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-6 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-red-100 p-2 text-red-600">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Eliminar cotización
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Esta acción eliminará la cotización y sus datos asociados.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingCotizacionId)}
                className="rounded-lg p-2 text-slate-400 hover:bg-gray-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-900"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                <p className="font-semibold">{cotizacionToDelete.numero}</p>
                <p>{cotizacionToDelete.cliente_nombre || "Cliente no disponible"}</p>
                <p>{formatMoney(cotizacionToDelete.total, getSimboloMoneda(cotizacionToDelete))}</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Escribe ELIMINAR para confirmar
                </label>
                <input
                  value={deleteConfirmationText}
                  onChange={(event) => setDeleteConfirmationText(event.target.value)}
                  disabled={Boolean(deletingCotizacionId)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder="ELIMINAR"
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-200 p-6 dark:border-slate-800">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingCotizacionId)}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-gray-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCotizacion}
                disabled={deleteConfirmationText.trim().toUpperCase() !== "ELIMINAR" || Boolean(deletingCotizacionId)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingCotizacionId ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Eliminando...
                  </span>
                ) : (
                  "Eliminar definitivamente"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
