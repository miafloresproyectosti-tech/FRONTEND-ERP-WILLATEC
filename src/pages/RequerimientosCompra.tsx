import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckSquare,
  Eye,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import { CompraFormModal, type CompraDraftItem } from "../components/compras/CompraFormModal";
import { useAuth } from "../AuthContext";
import {
  getRequerimientoCompra,
  getRequerimientosCompra,
  createRequerimientoCompra,
  sincronizarRequerimientosOcPendientes,
  type RequerimientoCompra,
  type RequerimientoCompraItem,
} from "../services/requerimientoCompra.service";

const perPageOptions = [5, 10, 25, 50, 100];

const estadoOptions = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_gestion", label: "En gestion" },
  { value: "parcialmente_comprado", label: "Parcialmente comprado" },
  { value: "comprado", label: "Comprado" },
  { value: "cancelado", label: "Cancelado" },
];

const origenOptions = [
  { value: "todos", label: "Todos" },
  { value: "oc_cliente", label: "OC cliente" },
  { value: "reposicion_stock", label: "Reposicion stock" },
  { value: "manual", label: "Manual" },
  { value: "licitacion", label: "Licitacion" },
  { value: "otro", label: "Otro" },
];

const estadoClasses: Record<string, string> = {
  pendiente: "border-slate-200 bg-slate-50 text-slate-700",
  en_gestion: "border-blue-200 bg-blue-50 text-blue-700",
  parcialmente_comprado: "border-amber-200 bg-amber-50 text-amber-700",
  comprado: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelado: "border-red-200 bg-red-50 text-red-700",
};

const prioridadClasses: Record<string, string> = {
  baja: "bg-slate-100 text-slate-600",
  normal: "bg-blue-50 text-blue-700",
  alta: "bg-amber-50 text-amber-700",
  urgente: "bg-red-50 text-red-700",
};

const labelize = (value?: string | null) =>
  (value || "-").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("es-PE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "-";

const userName = (user?: { nombres?: string | null; apellidos?: string | null; email?: string | null } | null) => {
  if (!user) return "Sistema";
  return [user.nombres, user.apellidos].filter(Boolean).join(" ").trim() || user.email || "Sistema";
};

const itemSaldoCompra = (item: RequerimientoCompraItem) =>
  Math.max(0, numberValue(item.cantidad_requerida) - numberValue(item.cantidad_comprada));

const itemKey = (requerimiento: RequerimientoCompra, item: RequerimientoCompraItem) => `${requerimiento.id}-${item.id}`;

const itemToCompraDraft = (requerimiento: RequerimientoCompra, item: RequerimientoCompraItem): CompraDraftItem => {
  const saldo = itemSaldoCompra(item);
  const costoEstimado = numberValue(
    item.cotizacion_item?.costo_base ??
      item.cotizacion_item?.costo_unitario ??
      item.producto_externo?.costo_base_referencial ??
      null,
  );
  const monedaId = item.cotizacion_item?.cotizacion?.moneda_id ?? item.producto_externo?.moneda_id ?? null;

  return {
    key: itemKey(requerimiento, item),
    requerimiento_compra_item_id: item.id,
    producto_id: item.producto_id || null,
    producto_externo_id: item.producto_externo_id || null,
    descripcion: item.descripcion,
    cantidad: saldo,
    cantidadMaxima: saldo,
    costo_unitario_estimado: costoEstimado > 0 ? costoEstimado : null,
    moneda_id: monedaId,
    requerimientoNumero: requerimiento.numero,
  };
};

export default function RequerimientosCompra() {
  const { user } = useAuth();
  const canWrite = ["SUPERADMIN", "ADMIN", "LOGISTICA"].includes(user?.role || "");

  const [rows, setRows] = useState<RequerimientoCompra[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("todos");
  const [origen, setOrigen] = useState("todos");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedDetail, setSelectedDetail] = useState<RequerimientoCompra | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, CompraDraftItem>>({});
  const [compraModalOpen, setCompraModalOpen] = useState(false);
  const [compraInitialItems, setCompraInitialItems] = useState<CompraDraftItem[]>([]);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);
  const [syncingOc, setSyncingOc] = useState(false);
  const [manualForm, setManualForm] = useState({
    origen_tipo: "manual",
    prioridad: "normal",
    observacion: "",
    items: [{ descripcion: "", cantidad_requerida: 1 }],
  });

  const selectedList = useMemo(() => Object.values(selectedItems), [selectedItems]);

  const fetchRows = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getRequerimientosCompra({
        page,
        perPage,
        search,
        estado,
        origenTipo: origen,
      });
      setRows(response.data);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudieron cargar los requerimientos.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchRows, 250);
    return () => window.clearTimeout(timer);
  }, [estado, origen, page, perPage, search]);

  useEffect(() => {
    if (!canWrite) return;

    let active = true;
    setSyncingOc(true);

    sincronizarRequerimientosOcPendientes()
      .then(() => {
        if (active) void fetchRows();
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setSyncingOc(false);
      });

    return () => {
      active = false;
    };
  }, [canWrite]);

  const openDetail = async (requerimiento: RequerimientoCompra) => {
    setDetailLoadingId(requerimiento.id);
    try {
      const detail = await getRequerimientoCompra(requerimiento.id);
      setSelectedDetail(detail);
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudo cargar el detalle.");
    } finally {
      setDetailLoadingId(null);
    }
  };

  const toggleItem = (requerimiento: RequerimientoCompra, item: RequerimientoCompraItem) => {
    const saldo = itemSaldoCompra(item);
    if (saldo <= 0) return;

    const key = itemKey(requerimiento, item);
    setSelectedItems((current) => {
      if (current[key]) {
        const next = { ...current };
        delete next[key];
        return next;
      }

      return {
        ...current,
        [key]: itemToCompraDraft(requerimiento, item),
      };
    });
  };

  const selectPendingItemsFromDetail = (requerimiento: RequerimientoCompra) => {
    const pendingItems = (requerimiento.items || []).filter((item) => itemSaldoCompra(item) > 0 && item.estado !== "cancelado");

    setSelectedItems((current) => {
      const next = { ...current };
      pendingItems.forEach((item) => {
        next[itemKey(requerimiento, item)] = itemToCompraDraft(requerimiento, item);
      });
      return next;
    });
  };

  const clearDetailSelection = (requerimiento: RequerimientoCompra) => {
    setSelectedItems((current) => {
      const next = { ...current };
      (requerimiento.items || []).forEach((item) => {
        delete next[itemKey(requerimiento, item)];
      });
      return next;
    });
  };

  const openCompraWithItems = (items: CompraDraftItem[]) => {
    setCompraInitialItems(items);
    setCompraModalOpen(true);
  };

  const createPurchaseFromAllDetail = (requerimiento: RequerimientoCompra) => {
    const pendingItems = (requerimiento.items || []).filter((item) => itemSaldoCompra(item) > 0 && item.estado !== "cancelado");
    if (pendingItems.length === 0) return;

    openCompraWithItems(pendingItems.map((item) => itemToCompraDraft(requerimiento, item)));
  };

  const createPurchaseFromDetailSelection = (requerimiento: RequerimientoCompra) => {
    const detailItems = (requerimiento.items || [])
      .map((item) => selectedItems[itemKey(requerimiento, item)])
      .filter(Boolean);

    if (detailItems.length === 0) return;

    openCompraWithItems(detailItems);
  };

  const detailSelectedCount = (requerimiento: RequerimientoCompra | null) =>
    requerimiento
      ? (requerimiento.items || []).filter((item) => Boolean(selectedItems[itemKey(requerimiento, item)])).length
      : 0;

  const detailPendingCount = (requerimiento: RequerimientoCompra | null) =>
    requerimiento
      ? (requerimiento.items || []).filter((item) => itemSaldoCompra(item) > 0 && item.estado !== "cancelado").length
      : 0;

  const clearSelectionAndRefresh = () => {
    setSelectedItems({});
    setCompraInitialItems([]);
    setCompraModalOpen(false);
    void fetchRows();
  };

  const saveManualRequest = async () => {
    const items = manualForm.items
      .map((item) => ({
        descripcion: item.descripcion.trim(),
        cantidad_requerida: numberValue(item.cantidad_requerida),
      }))
      .filter((item) => item.descripcion && item.cantidad_requerida > 0);

    if (items.length === 0) {
      setError("Agrega al menos un item con descripcion y cantidad.");
      return;
    }

    setSavingRequest(true);
    setError("");
    try {
      await createRequerimientoCompra({
        origen_tipo: manualForm.origen_tipo as any,
        prioridad: manualForm.prioridad as any,
        observacion: manualForm.observacion || null,
        items,
      });
      setManualModalOpen(false);
      setManualForm({
        origen_tipo: "manual",
        prioridad: "normal",
        observacion: "",
        items: [{ descripcion: "", cantidad_requerida: 1 }],
      });
      await fetchRows();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() ||
          "No se pudo crear el requerimiento.",
      );
    } finally {
      setSavingRequest(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Compras</p>
            <h1 className="text-2xl font-bold text-slate-900">Requerimientos de compra</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Gestiona faltantes reales y agrupa items pendientes en compras sin mover stock.
            </p>
            {syncingOc && (
              <p className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-blue-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sincronizando faltantes de OC pendientes...
              </p>
            )}
          </div>

          {canWrite && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setManualModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Plus size={18} />
                Nuevo requerimiento
              </button>
              <button
                type="button"
                onClick={() => openCompraWithItems(selectedList)}
                disabled={selectedList.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <PackagePlus size={18} />
                Crear compra ({selectedList.length})
              </button>
            </div>
          )}
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
              placeholder="Buscar por numero, OC, cliente o item"
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
            value={origen}
            onChange={(event) => {
              setOrigen(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            {origenOptions.map((option) => (
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
            <table className="min-w-[1120px] w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Numero</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Solicitado por</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3 text-right">Cant. requerida</th>
                  <th className="px-4 py-3 text-right">Comprada</th>
                  <th className="px-4 py-3 text-right">Recibida</th>
                  <th className="px-4 py-3 text-right">Saldo compra</th>
                  <th className="sticky right-0 bg-slate-50 px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-slate-500">
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                      Cargando requerimientos...
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((row) => {
                    const items = row.items || [];
                    const requerida = items.reduce((sum, item) => sum + numberValue(item.cantidad_requerida), 0);
                    const comprada = items.reduce((sum, item) => sum + numberValue(item.cantidad_comprada), 0);
                    const recibida = items.reduce((sum, item) => sum + numberValue(item.cantidad_recibida), 0);
                    const saldo = Math.max(0, requerida - comprada);

                    return (
                      <tr key={row.id} className="align-top hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.numero}</td>
                        <td className="px-4 py-3">{labelize(row.origen_tipo)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${prioridadClasses[row.prioridad] || prioridadClasses.normal}`}>
                            {labelize(row.prioridad)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${estadoClasses[row.estado] || estadoClasses.pendiente}`}>
                            {labelize(row.estado)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(row.created_at)}</td>
                        <td className="px-4 py-3 text-slate-600">{userName(row.solicitado_por as any)}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            {items.slice(0, 3).map((item) => {
                              const saldoItem = itemSaldoCompra(item);
                              const key = `${row.id}-${item.id}`;
                              return (
                                <label key={item.id} className="flex items-start gap-2">
                                  {canWrite && (
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selectedItems[key])}
                                      disabled={saldoItem <= 0 || row.estado === "cancelado"}
                                      onChange={() => toggleItem(row, item)}
                                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                                    />
                                  )}
                                  <span className="min-w-0">
                                    <span className="block truncate font-medium text-slate-800" title={item.descripcion}>
                                      {item.descripcion}
                                    </span>
                                    <span className="text-xs text-slate-500">Saldo compra: {saldoItem}</span>
                                  </span>
                                </label>
                              );
                            })}
                            {items.length > 3 && (
                              <button
                                type="button"
                                onClick={() => openDetail(row)}
                                className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                              >
                                Ver {items.length - 3} item(s) mas en detalle
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{requerida}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{comprada}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{recibida}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{saldo}</td>
                        <td className="sticky right-0 bg-white px-4 py-3 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]">
                          <button
                            type="button"
                            onClick={() => openDetail(row)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                            title="Ver detalle"
                          >
                            {detailLoadingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye size={16} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-slate-500">
                      No se encontraron requerimientos.
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

      {selectedList.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 rounded-2xl border border-blue-200 bg-white p-3 shadow-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <CheckSquare className="h-5 w-5 text-blue-700" />
              {selectedList.length} item(s) seleccionados para compra
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedItems({})}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Limpiar
              </button>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => openCompraWithItems(selectedList)}
                  className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Crear compra
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDetail && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedDetail.numero}</h2>
                <p className="text-sm text-slate-500">
                  {labelize(selectedDetail.origen_tipo)} - {labelize(selectedDetail.estado)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canWrite && detailPendingCount(selectedDetail) > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => clearDetailSelection(selectedDetail)}
                      className="hidden rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:inline-flex"
                    >
                      Limpiar items
                    </button>
                    <button
                      type="button"
                      onClick={() => selectPendingItemsFromDetail(selectedDetail)}
                      className="hidden rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 sm:inline-flex"
                    >
                      Seleccionar pendientes
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDetail(null)}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">OC cliente</p>
                  <p className="mt-1 font-semibold text-slate-800">{selectedDetail.oc_recibida?.numero || "-"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Prioridad</p>
                  <p className="mt-1 font-semibold text-slate-800">{labelize(selectedDetail.prioridad)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Solicitado por</p>
                  <p className="mt-1 font-semibold text-slate-800">{userName(selectedDetail.solicitado_por as any)}</p>
                </div>
              </div>
              <div className="space-y-3">
                {(selectedDetail.items || []).map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        {canWrite && (
                          <input
                            type="checkbox"
                            checked={Boolean(selectedItems[itemKey(selectedDetail, item)])}
                            disabled={itemSaldoCompra(item) <= 0 || item.estado === "cancelado"}
                            onChange={() => toggleItem(selectedDetail, item)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                            title="Seleccionar para compra"
                          />
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900">{item.descripcion}</h3>
                          <p className="text-sm text-slate-500">
                            {item.producto?.sku || item.producto?.codigo || item.producto_externo?.codigo || "Sin codigo"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.producto_externo_id && !item.producto_id && (
                          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                            Producto externo
                          </span>
                        )}
                        <span className={`w-fit rounded-full border px-2 py-1 text-xs font-semibold ${estadoClasses[item.estado] || estadoClasses.pendiente}`}>
                          {labelize(item.estado)}
                        </span>
                      </div>
                    </div>
                    {item.producto_externo_id && !item.producto_id && (
                      <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                        Al recepcionar la compra, el sistema lo enlazara automaticamente al inventario interno.
                      </p>
                    )}
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase text-slate-400">Requerida</p>
                        <p className="font-semibold">{numberValue(item.cantidad_requerida)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-400">Comprada</p>
                        <p className="font-semibold">{numberValue(item.cantidad_comprada)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-400">Recibida</p>
                        <p className="font-semibold">{numberValue(item.cantidad_recibida)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-slate-400">Saldo compra</p>
                        <p className="font-semibold">{itemSaldoCompra(item)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {canWrite && (
              <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-600">
                  {detailSelectedCount(selectedDetail)} de {detailPendingCount(selectedDetail)} item(s) pendientes seleccionados
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => selectPendingItemsFromDetail(selectedDetail)}
                    disabled={detailPendingCount(selectedDetail) === 0}
                    className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Seleccionar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => createPurchaseFromDetailSelection(selectedDetail)}
                    disabled={detailSelectedCount(selectedDetail) === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <PackagePlus size={16} />
                    Crear compra seleccionada
                  </button>
                  <button
                    type="button"
                    onClick={() => createPurchaseFromAllDetail(selectedDetail)}
                    disabled={detailPendingCount(selectedDetail) === 0}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Comprar todos
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <CompraFormModal
        open={compraModalOpen}
        title="Crear compra desde requerimientos"
        initialItems={compraInitialItems}
        onClose={() => setCompraModalOpen(false)}
        onCreated={clearSelectionAndRefresh}
      />

      {manualModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Nuevo requerimiento</h2>
                <p className="text-sm text-slate-500">No modifica stock ni Kardex.</p>
              </div>
              <button onClick={() => setManualModalOpen(false)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Cerrar
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-700">Origen</label>
                <select
                  value={manualForm.origen_tipo}
                  onChange={(event) => setManualForm((current) => ({ ...current, origen_tipo: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  {origenOptions.filter((option) => option.value !== "todos").map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Prioridad</label>
                <select
                  value={manualForm.prioridad}
                  onChange={(event) => setManualForm((current) => ({ ...current, prioridad: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  {["baja", "normal", "alta", "urgente"].map((option) => (
                    <option key={option} value={option}>
                      {labelize(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-slate-700">Observacion</label>
              <textarea
                value={manualForm.observacion}
                onChange={(event) => setManualForm((current) => ({ ...current, observacion: event.target.value }))}
                className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Items</h3>
                <button
                  type="button"
                  onClick={() =>
                    setManualForm((current) => ({
                      ...current,
                      items: [...current.items, { descripcion: "", cantidad_requerida: 1 }],
                    }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
                >
                  Agregar item
                </button>
              </div>
              {manualForm.items.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_120px_auto]">
                  <input
                    value={item.descripcion}
                    onChange={(event) =>
                      setManualForm((current) => ({
                        ...current,
                        items: current.items.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, descripcion: event.target.value } : row,
                        ),
                      }))
                    }
                    placeholder="Descripcion"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={item.cantidad_requerida}
                    onChange={(event) =>
                      setManualForm((current) => ({
                        ...current,
                        items: current.items.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, cantidad_requerida: Number(event.target.value) } : row,
                        ),
                      }))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setManualForm((current) => ({
                        ...current,
                        items: current.items.filter((_, rowIndex) => rowIndex !== index),
                      }))
                    }
                    disabled={manualForm.items.length === 1}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-40"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={savingRequest}
              onClick={saveManualRequest}
              className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingRequest ? "Guardando..." : "Guardar requerimiento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
