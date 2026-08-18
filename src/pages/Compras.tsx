import { useEffect, useState } from "react";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
} from "lucide-react";

import { CompraFormModal } from "../components/compras/CompraFormModal";
import { useAuth } from "../AuthContext";
import {
  cancelarCompra,
  confirmarCompra,
  getCompra,
  getCompras,
  type Compra,
  type CompraItem,
} from "../services/compra.service";

const perPageOptions = [5, 10, 25, 50, 100];

const estadoOptions = [
  { value: "todos", label: "Todos" },
  { value: "borrador", label: "Borrador" },
  { value: "confirmada", label: "Confirmada" },
  { value: "parcialmente_recibida", label: "Parcialmente recibida" },
  { value: "recibida", label: "Recibida" },
  { value: "cancelada", label: "Cancelada" },
];

const modalidadOptions = [
  { value: "todos", label: "Todas" },
  { value: "directa", label: "Compra directa" },
  { value: "oc_proveedor", label: "OC proveedor" },
];

const estadoClasses: Record<string, string> = {
  borrador: "border-slate-200 bg-slate-50 text-slate-700",
  confirmada: "border-blue-200 bg-blue-50 text-blue-700",
  parcialmente_recibida: "border-amber-200 bg-amber-50 text-amber-700",
  recibida: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelada: "border-red-200 bg-red-50 text-red-700",
};

const monedaOptions = [
  { id: 1, symbol: "S/" },
  { id: 2, symbol: "$" },
];

const labelize = (value?: string | null) =>
  (value || "-").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value?: string | null) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "-";

const getSymbol = (compra?: Compra | null) =>
  compra?.moneda?.simbolo || monedaOptions.find((option) => option.id === Number(compra?.moneda_id || 1))?.symbol || "S/";

const formatMoney = (value: unknown, compra?: Compra | null) =>
  `${getSymbol(compra)} ${numberValue(value).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const itemSubtotal = (item: CompraItem) =>
  numberValue(item.cantidad) * numberValue(item.costo_unitario_estimado);

export default function Compras() {
  const { user } = useAuth();
  const canWrite = ["SUPERADMIN", "ADMIN", "LOGISTICA"].includes(user?.role || "");

  const [rows, setRows] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("todos");
  const [modalidad, setModalidad] = useState("todos");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedDetail, setSelectedDetail] = useState<Compra | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getCompras({
        page,
        perPage,
        buscar: search,
        estado,
        modalidad,
      });
      setRows(response.data);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudieron cargar las compras.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchRows, 250);
    return () => window.clearTimeout(timer);
  }, [estado, modalidad, page, perPage, search]);

  const openDetail = async (compra: Compra) => {
    setDetailLoadingId(compra.id);
    try {
      const detail = await getCompra(compra.id);
      setSelectedDetail(detail);
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudo cargar el detalle.");
    } finally {
      setDetailLoadingId(null);
    }
  };

  const runAction = async (compra: Compra, action: "confirmar" | "cancelar") => {
    const message =
      action === "confirmar"
        ? "Confirmar esta compra? Esto no ingresara stock; quedara pendiente de recepcion."
        : "Cancelar esta compra?";

    if (!window.confirm(message)) return;

    setActionLoading(`${action}-${compra.id}`);
    setError("");
    try {
      const updated = action === "confirmar" ? await confirmarCompra(compra.id) : await cancelarCompra(compra.id);
      setRows((current) => current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
      if (selectedDetail?.id === updated.id) setSelectedDetail(await getCompra(updated.id));
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() ||
          "No se pudo completar la accion.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Compras</p>
            <h1 className="text-2xl font-bold text-slate-900">Bandeja de compras</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Controla compras en borrador, confirmadas y pendientes de recepcion.
            </p>
          </div>

          {canWrite && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              <Plus size={18} />
              Nueva compra
            </button>
          )}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>COMPRA CONFIRMADA:</strong> pendiente de recepcion. No significa producto recibido ni stock actualizado.
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px_120px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por numero o proveedor"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={estado}
            onChange={(event) => {
              setEstado(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            {estadoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={modalidad}
            onChange={(event) => {
              setModalidad(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            {modalidadOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={fetchRows}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refrescar
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Numero</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Modalidad</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Moneda</th>
                  <th className="px-4 py-3 text-right">Total estimado</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="sticky right-0 bg-slate-50 px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                      Cargando compras...
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((compra) => (
                    <tr key={compra.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-semibold text-slate-900">{compra.numero}</td>
                      <td className="px-4 py-3">{compra.proveedor?.nombre || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(compra.fecha_compra)}</td>
                      <td className="px-4 py-3">{labelize(compra.modalidad)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${estadoClasses[compra.estado] || estadoClasses.borrador}`}>
                          {labelize(compra.estado)}
                        </span>
                        {compra.estado === "confirmada" && (
                          <span className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            Pendiente recepcion
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{compra.moneda?.codigo || (Number(compra.moneda_id) === 2 ? "USD" : "PEN")}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMoney(compra.total_estimado, compra)}</td>
                      <td className="px-4 py-3 text-center">{compra.items_count || compra.items?.length || 0}</td>
                      <td className="sticky right-0 bg-white px-4 py-3 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openDetail(compra)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                            title="Ver detalle"
                          >
                            {detailLoadingId === compra.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye size={16} />}
                          </button>
                          {canWrite && compra.estado === "borrador" && (
                            <button
                              type="button"
                              onClick={() => runAction(compra, "confirmar")}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                              title="Confirmar compra"
                            >
                              {actionLoading === `confirmar-${compra.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />}
                            </button>
                          )}
                          {canWrite && !["cancelada", "recibida", "parcialmente_recibida"].includes(compra.estado) && (
                            <button
                              type="button"
                              onClick={() => runAction(compra, "cancelar")}
                              className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                              title="Cancelar compra"
                            >
                              {actionLoading === `cancelar-${compra.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban size={16} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                      No se encontraron compras.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Total: <strong>{total}</strong>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={perPage}
              onChange={(event) => {
                setPerPage(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 px-2 py-1.5"
            >
              {perPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option} por pagina
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>
              Pagina {page} de {lastPage}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
              disabled={page >= lastPage}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {selectedDetail && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedDetail.numero}</h2>
                <p className="text-sm text-slate-500">
                  {selectedDetail.proveedor?.nombre || "-"} - {labelize(selectedDetail.estado)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              <div className="mb-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Modalidad</p>
                  <p className="mt-1 font-semibold text-slate-800">{labelize(selectedDetail.modalidad)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">OC proveedor</p>
                  <p className="mt-1 font-semibold text-slate-800">{selectedDetail.oc_emitida?.numero || "-"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Fecha</p>
                  <p className="mt-1 font-semibold text-slate-800">{formatDate(selectedDetail.fecha_compra)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Total estimado</p>
                  <p className="mt-1 font-semibold text-slate-800">{formatMoney(selectedDetail.total_estimado, selectedDetail)}</p>
                </div>
              </div>

              {selectedDetail.estado === "confirmada" && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <ShoppingBag size={18} />
                  Compra confirmada. Pendiente de recepcion fisica; stock y Kardex aun no cambian.
                </div>
              )}

              {selectedDetail.observacion && (
                <div className="mb-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Observacion</p>
                  {selectedDetail.observacion}
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-[760px] w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Descripcion</th>
                        <th className="px-4 py-3">Requerimiento</th>
                        <th className="px-4 py-3 text-right">Cantidad</th>
                        <th className="px-4 py-3 text-right">Costo estimado</th>
                        <th className="px-4 py-3 text-right">Subtotal</th>
                        <th className="px-4 py-3 text-right">Recibida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedDetail.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-medium text-slate-800">{item.descripcion}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.requerimiento_compra_item?.requerimiento?.numero || "-"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{numberValue(item.cantidad)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatMoney(item.costo_unitario_estimado, selectedDetail)}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(itemSubtotal(item), selectedDetail)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{numberValue(item.cantidad_recibida)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {canWrite && selectedDetail.estado === "borrador" && (
              <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => runAction(selectedDetail, "cancelar")}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => runAction(selectedDetail, "confirmar")}
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Confirmar compra
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <CompraFormModal
        open={modalOpen}
        title="Nueva compra manual"
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          void fetchRows();
        }}
      />
    </div>
  );
}
