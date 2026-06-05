import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSearch,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import {
  getAuditoria,
  type AuditoriaFilters,
  type AuditoriaItem,
  type AuditoriaPagination,
} from "../services/auditoria.service";

const eventOptions = [
  { value: "", label: "Todas las acciones" },
  { value: "created", label: "Creado" },
  { value: "updated", label: "Actualizado" },
  { value: "deleted", label: "Eliminado" },
];

const tipoOptions = [
  { value: "", label: "Todas las entidades" },
  { value: "cliente", label: "Cliente" },
  { value: "cotizacion", label: "Cotizacion" },
  { value: "cotizacion_item", label: "Item de cotizacion" },
  { value: "cotizacion_costo", label: "Costo adicional" },
];

const perPageOptions = [15, 25, 50, 100];

const emptyMeta: AuditoriaPagination = {
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
  from: null,
  to: null,
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const getEventLabel = (event: string) => {
  const option = eventOptions.find((item) => item.value === event);
  return option?.label ?? event;
};

const getEventBadgeClass = (event: string) => {
  if (event === "created") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (event === "updated") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (event === "deleted") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-gray-50 text-gray-700 border-gray-200";
};

const getTipoLabel = (tipo: string) => {
  const option = tipoOptions.find((item) => item.value === tipo);
  return option?.label ?? tipo;
};

export default function Auditoria() {
  const [logs, setLogs] = useState<AuditoriaItem[]>([]);
  const [meta, setMeta] = useState<AuditoriaPagination>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filters, setFilters] = useState<AuditoriaFilters>({
    page: 1,
    per_page: 15,
    search: "",
    event: "",
    tipo: "",
    subject_id: "",
    causer_id: "",
    date_from: "",
    date_to: "",
  });

  const queryFilters = useMemo(
    () => ({
      ...filters,
      per_page: filters.per_page ?? 15,
      page: filters.page ?? 1,
    }),
    [filters],
  );

  const loadAuditoria = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getAuditoria(queryFilters);
      setLogs(response.data);
      setMeta(response.meta);
    } catch (requestError) {
      console.error("Error al cargar auditoria:", requestError);
      setError("No se pudo cargar la auditoria. Verifica tu sesion o permisos.");
      setLogs([]);
      setMeta(emptyMeta);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAuditoria();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [queryFilters]);

  const updateFilter = (key: keyof AuditoriaFilters, value: string | number) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === "page" ? Number(value) : 1,
    }));
  };

  const exportCSV = () => {
    const header = [
      "ID",
      "Accion",
      "Descripcion",
      "Entidad",
      "Entidad ID",
      "Usuario",
      "Email",
      "Cambios",
      "Fecha",
    ];

    const rows = logs.map((log) => [
      log.id,
      getEventLabel(log.accion),
      log.descripcion,
      getTipoLabel(log.entidad.tipo),
      log.entidad.id ?? "",
      log.usuario?.nombre ?? "Sistema",
      log.usuario?.email ?? "",
      log.cambios
        .map(
          (change) =>
            `${change.campo}: ${formatValue(change.antes)} -> ${formatValue(
              change.despues,
            )}`,
        )
        .join(" | "),
      formatDate(log.created_at),
    ]);

    const escapeCell = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;
    const csvContent = [header, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "auditoria.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FileSearch className="h-8 w-8 text-slate-900" />
            <h1 className="text-3xl font-bold text-slate-900">
              Auditoria del Sistema
            </h1>
          </div>
          <p className="mt-1 text-slate-500">
            Acciones registradas por el backend en clientes, cotizaciones, items
            y costos adicionales.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void loadAuditoria()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={17} />
            Actualizar
          </button>
          <button
            onClick={exportCSV}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={17} />
            Exportar vista
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search size={18} className="text-slate-500" />
            <input
              value={filters.search ?? ""}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Buscar texto"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Filter size={18} className="text-slate-500" />
            <select
              value={filters.event ?? ""}
              onChange={(event) => updateFilter("event", event.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            >
              {eventOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <select
            value={filters.tipo ?? ""}
            onChange={(event) => updateFilter("tipo", event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
          >
            {tipoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.per_page ?? 15}
            onChange={(event) => updateFilter("per_page", Number(event.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
          >
            {perPageOptions.map((option) => (
              <option key={option} value={option}>
                {option} por pagina
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={filters.subject_id ?? ""}
            onChange={(event) => updateFilter("subject_id", event.target.value)}
            placeholder="ID de entidad"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
          />
          <input
            value={filters.causer_id ?? ""}
            onChange={(event) => updateFilter("causer_id", event.target.value)}
            placeholder="ID de usuario"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
          />
          <input
            type="date"
            value={filters.date_from ?? ""}
            onChange={(event) => updateFilter("date_from", event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
          />
          <input
            type="date"
            value={filters.date_to ?? ""}
            onChange={(event) => updateFilter("date_to", event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Accion</th>
                <th className="px-4 py-3">Entidad</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Descripcion</th>
                <th className="px-4 py-3">Cambios</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" />
                    Cargando auditoria...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No hay registros para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <tr key={log.id} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getEventBadgeClass(
                            log.accion,
                          )}`}
                        >
                          {getEventLabel(log.accion)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {getTipoLabel(log.entidad.tipo)}
                        </p>
                        <p className="text-sm text-slate-500">
                          {log.entidad.nombre ?? `ID ${log.entidad.id ?? "-"}`}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2">
                          <User size={16} className="mt-0.5 text-slate-400" />
                          <div>
                            <p className="font-medium text-slate-900">
                              {log.usuario?.nombre ?? "Sistema"}
                            </p>
                            <p className="text-sm text-slate-500">
                              {log.usuario?.email ?? `Usuario #${log.usuario?.id ?? "-"}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {log.descripcion}
                      </td>
                      <td className="px-4 py-4">
                        {log.cambios.length === 0 ? (
                          <span className="text-sm text-slate-500">Sin campos</span>
                        ) : (
                          <div className="space-y-2">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}
                              className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                            >
                              {isExpanded
                                ? "Ocultar cambios"
                                : `Ver ${log.cambios.length} cambio${
                                    log.cambios.length === 1 ? "" : "s"
                                  }`}
                            </button>

                            {isExpanded && (
                              <div className="max-w-xl space-y-2">
                                {log.cambios.map((change) => (
                                  <div
                                    key={`${log.id}-${change.campo}`}
                                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                                  >
                                    <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                                      {change.campo}
                                    </p>
                                    <div className="grid gap-2 text-sm md:grid-cols-2">
                                      <div>
                                        <p className="text-xs text-slate-500">Antes</p>
                                        <p className="break-words text-slate-800">
                                          {formatValue(change.antes)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-slate-500">
                                          Despues
                                        </p>
                                        <p className="break-words font-medium text-slate-900">
                                          {formatValue(change.despues)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(log.created_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Mostrando {meta.from ?? 0} a {meta.to ?? 0} de {meta.total} registros
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateFilter("page", Math.max(1, meta.current_page - 1))}
            disabled={loading || meta.current_page <= 1}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>
          <span className="px-2">
            Pagina {meta.current_page} de {meta.last_page}
          </span>
          <button
            onClick={() =>
              updateFilter("page", Math.min(meta.last_page, meta.current_page + 1))
            }
            disabled={loading || meta.current_page >= meta.last_page}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
