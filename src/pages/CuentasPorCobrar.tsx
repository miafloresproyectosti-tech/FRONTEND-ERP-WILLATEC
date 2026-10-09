import { useEffect, useRef, useState } from "react";
import { Eye, HandCoins, Loader2, Search, XCircle } from "lucide-react";
import { useAuth } from "../AuthContext";

import {
  getCuentaPorCobrar,
  getCuentasPorCobrar,
  registrarCobro,
  type CuentaPorCobrar,
} from "../services/contabilidad.service";

const estados = ["todos", "pendiente", "parcial", "cobrada", "vencida", "anulada"];
const perPageOptions = [5, 10, 25, 50, 100];
const labelize = (value?: string | null) => (value || "-").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
const money = (value: unknown, symbol = "S/") => `${symbol} ${Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CuentasPorCobrar() {
  const { user } = useAuth();
  const canWrite = ["SUPERADMIN", "ADMIN", "CONTABILIDAD"].includes(user?.role || "");
  const [rows, setRows] = useState<CuentaPorCobrar[]>([]);
  const [detail, setDetail] = useState<CuentaPorCobrar | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [collecting, setCollecting] = useState<CuentaPorCobrar | null>(null);
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const requestId = useRef(0);

  const fetchRows = async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const response = await getCuentasPorCobrar({ page, perPage, search, estado });
      if (currentRequest !== requestId.current) return;
      setRows(response.data);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch (err: any) {
      if (currentRequest !== requestId.current) return;
      setError(err?.response?.data?.message || "No se pudieron cargar las cuentas por cobrar.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchRows, 250);
    return () => window.clearTimeout(timer);
  }, [page, perPage, search, estado]);

  const saveCollection = async () => {
    if (!collecting) return;
    const amount = Number(monto);
    const balance = Number(collecting.saldo);
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) {
      setError(`Ingresa un monto mayor a 0 y no superior al saldo (${money(balance, collecting.moneda?.simbolo || "S/")}).`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await registrarCobro(collecting.id, {
        monto: Number(monto),
        referencia,
        idempotency_key: idempotencyKey,
      });
      setCollecting(null);
      setMonto("");
      setReferencia("");
      await fetchRows();
    } catch (err: any) {
      setError(err?.response?.data?.message || Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() || "No se pudo registrar el cobro.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div><p className="text-sm font-semibold uppercase text-blue-700">Contabilidad</p><h1 className="text-2xl font-bold text-slate-900">Cuentas por cobrar</h1><p className="text-sm text-slate-500">Control de facturas cliente, saldos y cobros parciales.</p></div>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_160px_120px]">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar cliente o comprobante" className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm" /></div>
          <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} className="rounded-xl border px-3 py-2.5 text-sm">{estados.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="rounded-xl border px-3 py-2.5 text-sm">{perPageOptions.map((item) => <option key={item} value={item}>{item} filas</option>)}</select>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-sm"><thead className="bg-slate-100 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Comprobante</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">OC</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Cobrado</th><th className="px-4 py-3">Saldo</th><th className="px-4 py-3">Estado</th><th className="sticky right-0 bg-slate-100 px-4 py-3 text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" />Cargando...</td></tr> : rows.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No hay cuentas que coincidan con los filtros.</td></tr> : rows.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold">{row.comprobante?.serie}-{row.comprobante?.numero}</td><td className="px-4 py-3">{row.cliente?.nombre || row.comprobante?.receptor_nombre || "-"}</td><td className="px-4 py-3">{row.oc_recibida?.numero || "-"}</td><td className="px-4 py-3">{money(row.total, row.moneda?.simbolo || "S/")}</td><td className="px-4 py-3">{money(row.monto_cobrado, row.moneda?.simbolo || "S/")}</td><td className="px-4 py-3 font-semibold">{money(row.saldo, row.moneda?.simbolo || "S/")}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{labelize(row.estado)}</span></td><td className="sticky right-0 bg-white px-4 py-3"><div className="flex justify-end gap-2"><button aria-label="Ver detalle" title="Ver detalle" onClick={async () => { setError(""); try { setDetail(await getCuentaPorCobrar(row.id)); } catch (err: any) { setError(err?.response?.data?.message || "No se pudo cargar el detalle."); } }} className="rounded-lg bg-slate-100 p-2"><Eye size={16} /></button>{canWrite && !["cobrada", "anulada"].includes(row.estado) && <button aria-label="Registrar cobro" title="Registrar cobro" onClick={() => { setCollecting(row); setMonto(String(row.saldo || "")); setReferencia(""); setIdempotencyKey(`cobro-ui-${row.id}-${crypto.randomUUID()}`); }} className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><HandCoins size={16} /></button>}</div></td></tr>)}</tbody>
          </table></div><div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-500"><span>Total: {total}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Anterior</button><span className="px-2 py-1">{page}/{lastPage}</span><button disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Siguiente</button></div></div>
        </div>
      </div>
      {(collecting || detail) && <Modal title={collecting ? "Registrar cobro" : `Detalle CxC #${detail?.id}`} onClose={() => { setCollecting(null); setDetail(null); }}>{collecting ? <div className="space-y-3"><div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">Saldo disponible</span><p className="text-lg font-bold text-slate-900">{money(collecting.saldo, collecting.moneda?.simbolo || "S/")}</p></div><label className="block text-sm font-medium">Monto<input type="number" min="0.01" step="0.01" max={Number(collecting.saldo)} value={monto} onChange={(e) => setMonto(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label><label className="block text-sm font-medium">Referencia<input value={referencia} onChange={(e) => setReferencia(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="N.° de operación (opcional)" /></label><button disabled={saving || !monto} onClick={saveCollection} className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : "Guardar cobro"}</button></div> : <div className="space-y-2">{(detail?.cobros || []).length === 0 ? <p className="text-sm text-slate-500">Aún no hay cobros registrados.</p> : (detail?.cobros || []).map((p: any) => <div key={p.id} className="rounded-xl border p-3 text-sm">{money(p.monto, detail?.moneda?.simbolo || "S/")} - {p.referencia || "Sin referencia"} - {labelize(p.estado)}</div>)}</div>}</Modal>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose}><XCircle /></button></div>{children}</div></div>;
}
