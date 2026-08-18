import { useEffect, useState } from "react";
import { Eye, HandCoins, Loader2, Search, XCircle } from "lucide-react";

import {
  getCuentaPorPagar,
  getCuentasPorPagar,
  registrarPago,
  type CuentaPorPagar,
} from "../services/contabilidad.service";

const estados = ["todos", "pendiente", "parcial", "pagada", "vencida", "anulada"];
const perPageOptions = [5, 10, 25, 50, 100];
const labelize = (value?: string | null) => (value || "-").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
const money = (value: unknown, symbol = "S/") => `${symbol} ${Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CuentasPorPagar() {
  const [rows, setRows] = useState<CuentaPorPagar[]>([]);
  const [detail, setDetail] = useState<CuentaPorPagar | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [paying, setPaying] = useState<CuentaPorPagar | null>(null);
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");

  const fetchRows = async () => {
    setLoading(true);
    try {
      const response = await getCuentasPorPagar({ page, perPage, search, estado });
      setRows(response.data);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudieron cargar las cuentas por pagar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchRows, 250);
    return () => window.clearTimeout(timer);
  }, [page, perPage, search, estado]);

  const openDetail = async (row: CuentaPorPagar) => setDetail(await getCuentaPorPagar(row.id));

  const savePayment = async () => {
    if (!paying) return;
    setSaving(true);
    setError("");
    try {
      await registrarPago(paying.id, {
        monto: Number(monto),
        referencia,
        idempotency_key: `pago-ui-${paying.id}-${Date.now()}`,
      });
      setPaying(null);
      setMonto("");
      setReferencia("");
      await fetchRows();
    } catch (err: any) {
      setError(err?.response?.data?.message || Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() || "No se pudo registrar el pago.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase text-blue-700">Contabilidad</p>
          <h1 className="text-2xl font-bold text-slate-900">Cuentas por pagar</h1>
          <p className="text-sm text-slate-500">Control de facturas de proveedor, saldos y pagos parciales.</p>
        </div>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_160px_120px]">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar proveedor o comprobante" className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm" /></div>
          <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} className="rounded-xl border px-3 py-2.5 text-sm">{estados.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="rounded-xl border px-3 py-2.5 text-sm">{perPageOptions.map((item) => <option key={item} value={item}>{item} filas</option>)}</select>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Comprobante</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Pagado</th><th className="px-4 py-3">Saldo</th><th className="px-4 py-3">Estado</th><th className="sticky right-0 bg-slate-100 px-4 py-3 text-right">Acciones</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" />Cargando...</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold">{row.comprobante?.serie}-{row.comprobante?.numero}</td><td className="px-4 py-3">{row.proveedor?.nombre || row.comprobante?.emisor_nombre || "-"}</td><td className="px-4 py-3">{money(row.total, row.moneda?.simbolo || "S/")}</td><td className="px-4 py-3">{money(row.monto_pagado, row.moneda?.simbolo || "S/")}</td><td className="px-4 py-3 font-semibold">{money(row.saldo, row.moneda?.simbolo || "S/")}</td><td className="px-4 py-3">{labelize(row.estado)}</td>
                    <td className="sticky right-0 bg-white px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => openDetail(row)} className="rounded-lg bg-slate-100 p-2"><Eye size={16} /></button>{!["pagada", "anulada"].includes(row.estado) && <button onClick={() => { setPaying(row); setMonto(String(row.saldo || "")); }} className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><HandCoins size={16} /></button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-500"><span>Total: {total}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Anterior</button><span className="px-2 py-1">{page}/{lastPage}</span><button disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Siguiente</button></div></div>
        </div>
      </div>
      {(paying || detail) && <Modal title={paying ? "Registrar pago" : `Detalle CxP #${detail?.id}`} onClose={() => { setPaying(null); setDetail(null); }}>
        {paying ? <div className="space-y-3"><input value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Monto" /><input value={referencia} onChange={(e) => setReferencia(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Referencia" /><button disabled={saving} onClick={savePayment} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Guardar pago</button></div> : <div className="space-y-2">{(detail?.pagos || []).map((p: any) => <div key={p.id} className="rounded-xl border p-3 text-sm">{money(p.monto, detail?.moneda?.simbolo || "S/")} - {p.referencia || "Sin referencia"} - {labelize(p.estado)}</div>)}</div>}
      </Modal>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose}><XCircle /></button></div>{children}</div></div>;
}
