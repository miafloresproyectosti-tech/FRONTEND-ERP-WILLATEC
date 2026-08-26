import { useEffect, useState } from "react";
import { CheckCircle2, Eye, Loader2, PackageCheck, Search, XCircle } from "lucide-react";

import { getCompra, getCompras, type Compra } from "../services/compra.service";
import {
  cancelarRecepcionCompra,
  confirmarRecepcionCompra,
  createRecepcionCompra,
  getRecepcionCompra,
  getRecepcionesCompra,
  type RecepcionCompra,
} from "../services/recepcionCompra.service";
import { useAuth } from "../AuthContext";

const perPageOptions = [5, 10, 25, 50, 100];
const estados = ["todos", "borrador", "confirmada", "cancelada"];

const labelize = (value?: string | null) => (value || "-").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
const formatDate = (value?: string | null) =>
  value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("es-PE") : "-";
const money = (value: unknown, symbol = "S/") =>
  `${symbol} ${Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RecepcionesCompra() {
  const { user } = useAuth();
  const canWrite = ["SUPERADMIN", "ADMIN", "LOGISTICA"].includes(user?.role || "");
  const [rows, setRows] = useState<RecepcionCompra[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<RecepcionCompra | null>(null);
  const [detailQuantities, setDetailQuantities] = useState<Record<number, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [compraSearch, setCompraSearch] = useState("");
  const [comprasDisponibles, setComprasDisponibles] = useState<Compra[]>([]);
  const [loadingCompras, setLoadingCompras] = useState(false);
  const [compra, setCompra] = useState<Compra | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getRecepcionesCompra({ page, perPage, search, estado });
      setRows(response.data);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch (err: any) {
      setRows([]);
      setError(err?.response?.data?.message || "No se pudieron cargar las recepciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchRows, 250);
    return () => window.clearTimeout(timer);
  }, [page, perPage, search, estado]);

  const loadDetail = async (id: number) => {
    const row = await getRecepcionCompra(id);
    setDetail(row);
    setDetailQuantities(
      Object.fromEntries((row.items || []).map((item: any) => [Number(item.id), Number(item.cantidad || 0)])),
    );
  };

  const loadComprasDisponibles = async () => {
    if (!modalOpen) return;
    setLoadingCompras(true);
    try {
      const [confirmadas, parciales] = await Promise.all([
        getCompras({ page: 1, perPage: 50, buscar: compraSearch, estado: "confirmada" }),
        getCompras({ page: 1, perPage: 50, buscar: compraSearch, estado: "parcialmente_recibida" }),
      ]);
      setComprasDisponibles([...confirmadas.data, ...parciales.data]);
    } catch (err: any) {
      setComprasDisponibles([]);
      setError(err?.response?.data?.message || "No se pudieron cargar las compras pendientes de recepcion.");
    } finally {
      setLoadingCompras(false);
    }
  };

  useEffect(() => {
    if (!modalOpen) return;
    const timer = window.setTimeout(loadComprasDisponibles, 250);
    return () => window.clearTimeout(timer);
  }, [modalOpen, compraSearch]);

  const selectCompra = async (id: number | string) => {
    setSaving(true);
    setError("");
    try {
      setCompra(await getCompra(id));
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudo cargar la compra.");
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCompra(null);
    setCompraSearch("");
    setComprasDisponibles([]);
  };

  const createDraft = async () => {
    if (!compra?.id) return;
    setSaving(true);
    setError("");
    try {
      await createRecepcionCompra(compra.id, {
        items: (compra.items || [])
          .map((item) => ({
            compra_item_id: item.id,
            producto_id: item.producto_id,
            descripcion: item.descripcion,
            cantidad: Math.max(Number(item.cantidad || 0) - Number(item.cantidad_recibida || 0), 0),
            costo_unitario_provisional: item.costo_unitario_estimado,
            moneda_id: item.moneda_id || compra.moneda_id,
          }))
          .filter((item) => item.cantidad > 0),
      });
      closeModal();
      setCompra(null);
      await fetchRows();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() ||
          "No se pudo crear la recepcion.",
      );
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (row: RecepcionCompra, action: "confirmar" | "cancelar") => {
    if (!window.confirm(action === "confirmar" ? "Confirmar recepcion e ingresar stock?" : "Cancelar recepcion?")) return;
    setSaving(true);
    try {
      action === "confirmar" ? await confirmarRecepcionCompra(row.id) : await cancelarRecepcionCompra(row.id);
      await fetchRows();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() ||
          "No se pudo completar la accion.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDetailReception = async () => {
    if (!detail) return;
    if (!window.confirm("Confirmar recepcion e ingresar stock con las cantidades indicadas?")) return;

    setSaving(true);
    try {
      await confirmarRecepcionCompra(detail.id, {
        items: (detail.items || []).map((item: any) => ({
          recepcion_item_id: item.id,
          cantidad: Number(detailQuantities[Number(item.id)] ?? item.cantidad ?? 0),
        })),
      });
      setDetail(null);
      setDetailQuantities({});
      await fetchRows();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() ||
          "No se pudo confirmar la recepcion.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-700">Logistica</p>
            <h1 className="text-2xl font-bold text-slate-900">Recepciones de compra</h1>
            <p className="text-sm text-slate-500">La confirmacion genera entrada Kardex y stock fisico.</p>
          </div>
          {canWrite && (
            <button onClick={() => { setModalOpen(true); setCompra(null); }} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">
              Nueva recepcion
            </button>
          )}
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_170px_120px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar recepcion o compra" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" />
          </div>
          <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            {estados.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
          </select>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            {perPageOptions.map((item) => <option key={item} value={item}>{item} filas</option>)}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Numero</th>
                  <th className="px-4 py-3">Compra</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="sticky right-0 bg-slate-100 px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" />Cargando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Sin recepciones.</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.numero}</td>
                    <td className="px-4 py-3">{row.compra?.numero || `#${row.compra_id}`}</td>
                    <td className="px-4 py-3">{row.proveedor?.nombre || row.compra?.proveedor?.nombre || "-"}</td>
                    <td className="px-4 py-3">{formatDate(row.fecha_recepcion)}</td>
                    <td className="px-4 py-3"><span className="rounded-full border px-2 py-1 text-xs font-semibold">{labelize(row.estado)}</span></td>
                    <td className="sticky right-0 bg-white px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => loadDetail(row.id)} title="Ver detalle" className="rounded-lg bg-slate-100 p-2 text-slate-700"><Eye size={16} /></button>
                        {canWrite && row.estado === "borrador" && (
                          <>
                            <button onClick={() => loadDetail(row.id)} title="Revisar y confirmar" className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><CheckCircle2 size={16} /></button>
                            <button onClick={() => runAction(row, "cancelar")} title="Cancelar" className="rounded-lg bg-red-50 p-2 text-red-700"><XCircle size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-500">
            <span>Total: {total}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Anterior</button>
              <span className="px-2 py-1">{page}/{lastPage}</span>
              <button disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Nueva recepcion</h2>
                  <p className="mt-1 text-sm text-slate-500">Selecciona una compra confirmada o parcialmente recibida.</p>
                </div>
                <button onClick={closeModal} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" title="Cerrar">
                  <XCircle />
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200">
                <div className="border-b border-slate-100 p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={compraSearch}
                      onChange={(e) => setCompraSearch(e.target.value)}
                      placeholder="Buscar por compra o proveedor"
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-3">
                  {loadingCompras ? (
                    <div className="flex h-40 items-center justify-center text-sm text-slate-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando compras...
                    </div>
                  ) : comprasDisponibles.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                      No hay compras confirmadas pendientes de recepcion.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {comprasDisponibles.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => selectCompra(row.id)}
                          disabled={saving}
                          className={`w-full rounded-2xl border p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60 ${
                            compra?.id === row.id ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900">{row.numero}</p>
                              <p className="mt-1 truncate text-sm text-slate-600">{row.proveedor?.nombre || "-"}</p>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                              {labelize(row.estado)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>{row.items_count || 0} items</span>
                            <span>{money(row.total_estimado, row.moneda?.simbolo || "S/")}</span>
                            <span>{formatDate(row.fecha_compra)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="min-h-0 overflow-auto rounded-2xl border border-slate-200 p-4">
                {!compra ? (
                  <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-500">
                    <PackageCheck className="mb-3 h-8 w-8 text-slate-300" />
                    Selecciona una compra para ver sus saldos pendientes.
                  </div>
                ) : (
                  <div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="font-bold text-slate-900">{compra.numero}</p>
                      <p className="mt-1 text-sm text-slate-600">{compra.proveedor?.nombre || "-"}</p>
                      <p className="mt-1 text-xs text-slate-500">Total estimado: {money(compra.total_estimado, compra.moneda?.simbolo || "S/")}</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      {(compra.items || []).map((item) => {
                        const pendiente = Math.max(Number(item.cantidad || 0) - Number(item.cantidad_recibida || 0), 0);
                        return (
                          <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <span className="font-semibold text-slate-800">{item.descripcion}</span>
                              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                                Pendiente: {pendiente}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              Costo provisional: {money(item.costo_unitario_estimado, compra.moneda?.simbolo || "S/")}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <button disabled={saving} onClick={createDraft} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck size={16} />}
                      Crear borrador con saldos pendientes
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{detail.numero}</h2>
              <button onClick={() => setDetail(null)}><XCircle /></button>
            </div>
            <p className="text-sm text-slate-500">Estado: {labelize(detail.estado)}</p>
            <div className="mt-4 space-y-2">
              {(detail.items || []).map((item: any) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">{item.descripcion}</p>
                      <p className="text-slate-500">
                        Pendiente sugerido: {item.cantidad} | Costo provisional: {money(item.costo_unitario_provisional, item.moneda?.simbolo || detail.compra?.moneda?.simbolo || "S/")}
                      </p>
                    </div>
                    {detail.estado === "borrador" ? (
                      <label className="text-xs font-semibold uppercase text-slate-500">
                        Recibido
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={detailQuantities[Number(item.id)] ?? Number(item.cantidad || 0)}
                          onChange={(event) =>
                            setDetailQuantities((current) => ({
                              ...current,
                              [Number(item.id)]: Number(event.target.value),
                            }))
                          }
                          className="mt-1 w-28 rounded-lg border border-slate-200 px-3 py-2 text-right text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            {detail.estado === "borrador" && (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button onClick={() => runAction(detail, "cancelar")} disabled={saving} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60">
                  Cancelar recepcion
                </button>
                <button onClick={confirmDetailReception} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />}
                  Confirmar cantidades
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
