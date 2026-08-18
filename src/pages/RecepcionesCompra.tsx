import { useEffect, useState } from "react";
import { CheckCircle2, Eye, Loader2, PackageCheck, RefreshCw, Search, XCircle } from "lucide-react";

import { getCompra, type Compra } from "../services/compra.service";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [compraId, setCompraId] = useState("");
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

  const loadDetail = async (id: number) => setDetail(await getRecepcionCompra(id));

  const loadCompra = async () => {
    if (!compraId) return;
    setSaving(true);
    setError("");
    try {
      setCompra(await getCompra(compraId));
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudo cargar la compra.");
    } finally {
      setSaving(false);
    }
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
      setModalOpen(false);
      setCompra(null);
      setCompraId("");
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
            <button onClick={() => setModalOpen(true)} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">
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
                            <button onClick={() => runAction(row, "confirmar")} title="Confirmar" className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><CheckCircle2 size={16} /></button>
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
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Nueva recepcion</h2>
              <button onClick={() => setModalOpen(false)}><XCircle /></button>
            </div>
            <div className="flex gap-2">
              <input value={compraId} onChange={(e) => setCompraId(e.target.value)} placeholder="ID de compra confirmada" className="flex-1 rounded-xl border px-3 py-2 text-sm" />
              <button disabled={saving} onClick={loadCompra} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><RefreshCw size={16} /></button>
            </div>
            {compra && (
              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <p className="font-semibold">{compra.numero} - {compra.proveedor?.nombre}</p>
                <div className="mt-3 space-y-2">
                  {(compra.items || []).map((item) => {
                    const pendiente = Math.max(Number(item.cantidad || 0) - Number(item.cantidad_recibida || 0), 0);
                    return (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span>{item.descripcion}</span>
                        <span>Pendiente: {pendiente} | {money(item.costo_unitario_estimado, compra.moneda?.simbolo || "S/")}</span>
                      </div>
                    );
                  })}
                </div>
                <button disabled={saving} onClick={createDraft} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
                  <PackageCheck size={16} /> Crear borrador con saldos pendientes
                </button>
              </div>
            )}
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
              {(detail.items || []).map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <p className="font-semibold">{item.descripcion}</p>
                  <p className="text-slate-500">Cantidad: {item.cantidad} | Costo provisional: {money(item.costo_unitario_provisional, item.moneda?.simbolo || detail.compra?.moneda?.simbolo || "S/")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
