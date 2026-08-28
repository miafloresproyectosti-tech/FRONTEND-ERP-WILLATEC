import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";

import PageSizeSelect from "../components/ui/PageSizeSelect";
import { useNotifications } from "../NotificationContext";
import {
  getWooPedido,
  getWooPedidos,
  reservarWooPedido,
  sincronizarWooPedidos,
  type WooPedido,
  type WooPedidoItem,
  type WooPedidoPaginatedResponse,
} from "../services/woocommercePedido.service";

const emptyMeta: WooPedidoPaginatedResponse = {
  data: [],
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: null,
  to: null,
};

const estados = [
  { value: "", label: "Todos" },
  { value: "listo_reserva", label: "Listos para reservar" },
  { value: "reservado", label: "Reservados" },
  { value: "sin_stock", label: "Sin stock" },
  { value: "revisar", label: "Por revisar" },
  { value: "nuevo", label: "Nuevos" },
  { value: "atendido", label: "Atendidos" },
  { value: "cancelado", label: "Cancelados" },
];

const estadoPedidoStyles: Record<string, string> = {
  nuevo: "bg-blue-50 text-blue-700 ring-blue-100",
  listo_reserva: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  reservado: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  sin_stock: "bg-amber-50 text-amber-700 ring-amber-100",
  revisar: "bg-slate-100 text-slate-700 ring-slate-200",
  atendido: "bg-green-50 text-green-700 ring-green-100",
  cancelado: "bg-red-50 text-red-700 ring-red-100",
};

const estadoItemStyles: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-700",
  sin_stock: "bg-amber-50 text-amber-700",
  stock_parcial: "bg-orange-50 text-orange-700",
  no_encontrado: "bg-red-50 text-red-700",
  sin_sku: "bg-red-50 text-red-700",
  pendiente: "bg-slate-100 text-slate-600",
};

const labelEstado = (value?: string | null) =>
  estados.find((item) => item.value === value)?.label || value?.replaceAll("_", " ") || "-";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  });
};

const formatMoney = (value: number | string | null | undefined, currency?: string | null) =>
  `${currency || ""} ${Number(value || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim();

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
  const errors = err.response?.data?.errors;
  const firstError = errors ? Object.values(errors).flat()[0] : null;

  return firstError || err.response?.data?.message || fallback;
};

export default function WooCommercePedidos() {
  const { showToast } = useNotifications();
  const [meta, setMeta] = useState<WooPedidoPaginatedResponse>(emptyMeta);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reservingId, setReservingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<WooPedido | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const resumen = useMemo(() => {
    const rows = meta.data;
    return {
      total: meta.total,
      listo: rows.filter((item) => item.estado_erp === "listo_reserva").length,
      revisar: rows.filter((item) => ["revisar", "sin_stock"].includes(item.estado_erp)).length,
      reservado: rows.filter((item) => item.estado_erp === "reservado").length,
    };
  }, [meta.data, meta.total]);

  const fetchPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getWooPedidos({
        page,
        search,
        estadoErp: estado,
        perPage,
      });
      setMeta(response);
    } catch (error) {
      showToast({
        title: "No se pudieron cargar pedidos WooCommerce",
        description: getApiErrorMessage(error, "Verifica la conexion o permisos."),
        type: "warning",
      });
    } finally {
      setLoading(false);
    }
  }, [estado, page, perPage, search, showToast]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchPedidos();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [fetchPedidos]);

  const handleSync = async () => {
    if (syncing) return;

    try {
      setSyncing(true);
      const response = await sincronizarWooPedidos(25);
      showToast({
        title: "Pedidos sincronizados",
        description: response.message || "WooCommerce fue consultado correctamente.",
        type: "success",
      });
      await fetchPedidos();
    } catch (error) {
      showToast({
        title: "No se pudo sincronizar WooCommerce",
        description: getApiErrorMessage(error, "Revisa credenciales o disponibilidad de WooCommerce."),
        type: "warning",
      });
    } finally {
      setSyncing(false);
    }
  };

  const openDetail = async (pedido: WooPedido) => {
    try {
      setDetailLoading(true);
      setSelected(pedido);
      setSelected(await getWooPedido(pedido.id));
    } catch (error) {
      showToast({
        title: "No se pudo abrir el pedido",
        description: getApiErrorMessage(error, "Intenta nuevamente."),
        type: "warning",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReservar = async (pedido: WooPedido) => {
    if (reservingId) return;

    try {
      setReservingId(pedido.id);
      const response = await reservarWooPedido(pedido.id);
      showToast({
        title: "Stock reservado",
        description: response.message || "El pedido WooCommerce quedo reservado en ERP.",
        type: "success",
      });
      setSelected(response.pedido);
      await fetchPedidos();
    } catch (error) {
      showToast({
        title: "No se pudo reservar",
        description: getApiErrorMessage(error, "Revisa stock y SKU asociados."),
        type: "warning",
      });
    } finally {
      setReservingId(null);
    }
  };

  const canReserve = (pedido: WooPedido) => pedido.estado_erp === "listo_reserva";

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ShoppingBag size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Pedidos WooCommerce</h1>
                <p className="text-sm text-slate-500">Cruce por SKU, stock disponible y reserva logística.</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {syncing ? "Sincronizando..." : "Sincronizar Woo"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard title="Pedidos" value={resumen.total} tone="blue" />
          <MetricCard title="Listos para reservar" value={resumen.listo} tone="green" />
          <MetricCard title="Requieren revision" value={resumen.revisar} tone="amber" />
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Buscar por pedido, cliente, correo, SKU o producto"
              />
            </label>

            <select
              value={estado}
              onChange={(event) => {
                setPage(1);
                setEstado(event.target.value);
              }}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {estados.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <PageSizeSelect
              value={perPage}
              onChange={(value) => {
                setPage(1);
                setPerPage(value);
              }}
              className="justify-start lg:justify-end"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={20} />
              Cargando pedidos...
            </div>
          ) : meta.data.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-slate-500">
              <ShoppingBag size={30} />
              <p className="font-semibold text-slate-700">No hay pedidos sincronizados</p>
              <p className="max-w-md text-sm">Sincroniza WooCommerce para traer los pedidos recientes y validar stock por SKU.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-[1080px] w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Pedido</th>
                      <th className="px-5 py-3">Cliente</th>
                      <th className="px-5 py-3">Fecha</th>
                      <th className="px-5 py-3">Total</th>
                      <th className="px-5 py-3">Woo</th>
                      <th className="px-5 py-3">ERP</th>
                      <th className="sticky right-0 bg-slate-50 px-5 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {meta.data.map((pedido) => (
                      <tr key={pedido.id} className="bg-white">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">#{pedido.numero || pedido.woo_order_id}</p>
                          <p className="text-xs text-slate-500">{pedido.items_count || pedido.items?.length || 0} items</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="max-w-[220px] truncate font-semibold text-slate-800">{pedido.cliente_nombre || "Sin cliente"}</p>
                          <p className="max-w-[220px] truncate text-xs text-slate-500">{pedido.cliente_email || "-"}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(pedido.fecha_woo)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-800">{formatMoney(pedido.total, pedido.moneda)}</td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {pedido.estado_woo || "-"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <EstadoPedido estado={pedido.estado_erp} />
                        </td>
                        <td className="sticky right-0 bg-white px-5 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => void openDetail(pedido)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                              title="Ver detalle"
                            >
                              <Eye size={17} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleReservar(pedido)}
                              disabled={!canReserve(pedido) || reservingId === pedido.id}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Reservar stock"
                            >
                              {reservingId === pedido.id ? <Loader2 size={17} className="animate-spin" /> : <PackageCheck size={17} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 lg:hidden">
                {meta.data.map((pedido) => (
                  <div key={pedido.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">Pedido #{pedido.numero || pedido.woo_order_id}</p>
                        <p className="truncate text-sm text-slate-500">{pedido.cliente_nombre || "Sin cliente"}</p>
                      </div>
                      <EstadoPedido estado={pedido.estado_erp} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <Info label="Fecha" value={formatDate(pedido.fecha_woo)} />
                      <Info label="Total" value={formatMoney(pedido.total, pedido.moneda)} />
                      <Info label="Woo" value={pedido.estado_woo || "-"} />
                      <Info label="Items" value={String(pedido.items_count || pedido.items?.length || 0)} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void openDetail(pedido)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-50 text-sm font-semibold text-blue-700"
                      >
                        <Eye size={16} />
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReservar(pedido)}
                        disabled={!canReserve(pedido) || reservingId === pedido.id}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-700 disabled:opacity-40"
                      >
                        {reservingId === pedido.id ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                        Reservar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-3xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Mostrando {meta.from || 0} a {meta.to || 0} de {meta.total} pedidos
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 disabled:opacity-40"
            >
              <ChevronLeft size={17} />
            </button>
            <span className="font-semibold text-slate-700">
              {meta.current_page} / {meta.last_page}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(meta.last_page, current + 1))}
              disabled={page >= meta.last_page}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 disabled:opacity-40"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <PedidoDetailModal
          pedido={selected}
          loading={detailLoading}
          reserving={reservingId === selected.id}
          onClose={() => setSelected(null)}
          onReservar={() => void handleReservar(selected)}
        />
      )}
    </div>
  );
}

function MetricCard({ title, value, tone }: { title: string; value: number; tone: "blue" | "green" | "amber" }) {
  const styles = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className={`mt-3 inline-flex rounded-2xl px-3 py-1 text-2xl font-bold ${styles}`}>{value}</p>
    </div>
  );
}

function EstadoPedido({ estado }: { estado?: string | null }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${estadoPedidoStyles[estado || ""] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      {labelEstado(estado)}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 truncate font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function PedidoDetailModal({
  pedido,
  loading,
  reserving,
  onClose,
  onReservar,
}: {
  pedido: WooPedido;
  loading: boolean;
  reserving: boolean;
  onClose: () => void;
  onReservar: () => void;
}) {
  const canReserve = pedido.estado_erp === "listo_reserva";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <p className="text-sm font-semibold text-blue-700">Pedido WooCommerce</p>
            <h2 className="text-xl font-bold text-slate-900">#{pedido.numero || pedido.woo_order_id}</h2>
            <p className="mt-1 text-sm text-slate-500">{pedido.cliente_nombre || "Sin cliente"} · {formatMoney(pedido.total, pedido.moneda)}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={20} />
              Cargando detalle...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <Info label="Estado ERP" value={labelEstado(pedido.estado_erp)} />
                <Info label="Estado Woo" value={pedido.estado_woo || "-"} />
                <Info label="Fecha" value={formatDate(pedido.fecha_woo)} />
                <Info label="Sincronizado" value={formatDate(pedido.last_synced_at)} />
              </div>

              <div className="rounded-2xl border border-slate-100">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h3 className="font-bold text-slate-800">Items del pedido</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {(pedido.items || []).map((item) => (
                    <PedidoItemRow key={item.id} item={item} />
                  ))}
                </div>
              </div>

              {pedido.estado_erp !== "listo_reserva" && pedido.estado_erp !== "reservado" && (
                <div className="flex gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                  <AlertTriangle className="shrink-0" size={18} />
                  <p>Antes de reservar, todos los items deben tener SKU asociado a un producto ERP y stock disponible suficiente.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-600">
            Cerrar
          </button>
          <button
            type="button"
            onClick={onReservar}
            disabled={!canReserve || reserving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reserving ? <Loader2 size={18} className="animate-spin" /> : <PackageCheck size={18} />}
            Reservar stock
          </button>
        </div>
      </div>
    </div>
  );
}

function PedidoItemRow({ item }: { item: WooPedidoItem }) {
  const matchStyle = estadoItemStyles[item.estado_match] || estadoItemStyles.pendiente;
  const ok = item.estado_match === "ok";

  return (
    <div className="grid gap-3 p-4 lg:grid-cols-[1fr_120px_140px_160px] lg:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {ok ? <CheckCircle2 size={17} className="text-emerald-600" /> : <AlertTriangle size={17} className="text-amber-600" />}
          <p className="truncate font-bold text-slate-900">{item.nombre || "Item sin nombre"}</p>
        </div>
        <p className="mt-1 text-xs text-slate-500">SKU: <span className="font-semibold text-slate-700">{item.sku || "-"}</span></p>
        {item.producto && (
          <p className="mt-1 truncate text-xs text-blue-700">
            ERP: {item.producto.nombre} · {item.producto.codigo}
          </p>
        )}
        {item.mensaje && <p className="mt-1 text-xs text-amber-700">{item.mensaje}</p>}
      </div>
      <Info label="Cantidad" value={String(Number(item.cantidad || 0))} />
      <Info label="Disponible" value={String(item.producto?.stock_disponible ?? item.stock_disponible_snapshot ?? "-")} />
      <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-bold ${matchStyle}`}>
        {item.estado_match.replaceAll("_", " ")}
      </span>
    </div>
  );
}
