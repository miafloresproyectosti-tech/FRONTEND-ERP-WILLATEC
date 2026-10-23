import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, FileUp, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "../AuthContext";
import { createBanco, createCheque, deleteCheque, getBancos, getCheques, updateChequeStatus, uploadChequeEvidence, type Banco, type Cheque } from "../services/contabilidad.service";

const initialForm = { banco_id: "", numero: "", monto: "", cuenta_por_pagar_id: "", fecha_emision: new Date().toISOString().slice(0, 10), fecha_cheque: new Date().toISOString().slice(0, 10), observacion: "" };
const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function Cheques() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const canWrite = ["SUPERADMIN", "ADMIN", "CONTABILIDAD"].includes(user?.role || "");
  const [rows, setRows] = useState<Cheque[]>([]);
  const [banks, setBanks] = useState<Banco[]>([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("todos");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const accountId = searchParams.get("cuenta_por_pagar_id");
    if (accountId) {
      setForm((current) => ({ ...current, cuenta_por_pagar_id: accountId }));
      setOpen(true);
    }
  }, [searchParams]);

  const load = async () => { setLoading(true); try { const [list, catalog] = await Promise.all([getCheques({ search, estado, perPage: 100 }), getBancos()]); setRows(list.data); setBanks(catalog); } catch (e: any) { setError(e?.response?.data?.message || "No se pudieron cargar los cheques."); } finally { setLoading(false); } };
  useEffect(() => { const timer = window.setTimeout(load, 200); return () => window.clearTimeout(timer); }, [search, estado]);

  const save = async () => {
    if (!form.banco_id || !form.numero || !form.monto || !form.fecha_emision || !form.fecha_cheque) return;
    setSaving(true); setError("");
    try { await createCheque({ ...form, banco_id: Number(form.banco_id), monto: Number(form.monto), aplicaciones: form.cuenta_por_pagar_id ? [{ cuenta_por_pagar_id: Number(form.cuenta_por_pagar_id), monto_aplicado: Number(form.monto) }] : [] }); setOpen(false); setForm(initialForm); await load(); }
    catch (e: any) { setError(e?.response?.data?.message || Object.values(e?.response?.data?.errors || {}).flat()?.[0]?.toString() || "No se pudo registrar el cheque."); }
    finally { setSaving(false); }
  };

  const addBank = async () => {
    const nombre = window.prompt("Nombre del banco");
    if (!nombre?.trim()) return;
    try { const bank = await createBanco(nombre.trim()); setBanks((current) => [...current, bank].sort((a, b) => a.nombre.localeCompare(b.nombre))); setForm((current) => ({ ...current, banco_id: String(bank.id) })); }
    catch (e: any) { setError(e?.response?.data?.message || "No se pudo agregar el banco."); }
  };

  const mark = async (row: Cheque, next: Cheque["estado"]) => { setSaving(true); try { const updated = await updateChequeStatus(row.id, { estado: next, fecha_entrega: next === "entregado" ? new Date().toISOString().slice(0, 10) : undefined, fecha_cobro: next === "cobrado" ? new Date().toISOString().slice(0, 10) : undefined }); setRows((current) => current.map((item) => item.id === row.id ? updated : item)); } catch (e: any) { setError(e?.response?.data?.message || "No se pudo actualizar el cheque."); } finally { setSaving(false); } };

  return <div className="min-h-screen bg-slate-50 p-3 sm:p-6"><div className="mx-auto max-w-7xl space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Contabilidad</p><h1 className="text-2xl font-bold text-slate-900">Cheques</h1><p className="mt-1 text-sm text-slate-500">Registra el instrumento físico sin convertirlo automáticamente en un pago.</p></div>{canWrite && <button onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white"><Plus size={18} />Registrar cheque</button>}</div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar número, banco o proveedor" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" /></div><select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="todos">Todos los estados</option>{["registrado", "entregado", "cobrado", "anulado", "devuelto"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-[920px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Cheque</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Importe</th><th className="px-4 py-3">Fecha cheque</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" />Cargando cheques...</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No hay cheques registrados.</td></tr> : rows.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-4 py-3"><strong>{row.numero}</strong><div className="text-xs text-slate-500">{row.banco?.nombre || "-"}</div></td><td className="px-4 py-3">{row.proveedor?.nombre || "Sin proveedor / pendiente de factura"}</td><td className="px-4 py-3 font-semibold">{Number(row.monto).toLocaleString("es-PE", { minimumFractionDigits: 2 })}</td><td className="px-4 py-3">{row.fecha_cheque}</td><td className="px-4 py-3"><span className="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold">{label(row.estado)}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-2">{canWrite && row.estado === "registrado" && <button title="Marcar entregado" onClick={() => mark(row, "entregado")} className="rounded-lg bg-amber-50 p-2 text-amber-700"><CheckCircle2 size={16} /></button>}{canWrite && row.estado === "entregado" && <button title="Marcar cobrado / pagado" onClick={() => mark(row, "cobrado")} className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><CheckCircle2 size={16} /></button>}{canWrite && <label title="Adjuntar evidencia" className="cursor-pointer rounded-lg bg-blue-50 p-2 text-blue-700"><FileUp size={16} /><input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { await uploadChequeEvidence(row.id, file); await load(); } }} /></label>}{canWrite && row.estado !== "cobrado" && <button title="Eliminar" onClick={async () => { if (window.confirm("Eliminar este cheque?")) { await deleteCheque(row.id); await load(); } }} className="rounded-lg bg-red-50 p-2 text-red-700"><Trash2 size={16} /></button>}</div></td></tr>)}</tbody></table></div></div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Registrar cheque físico</h2><button onClick={() => setOpen(false)}>Cerrar</button></div><p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">El registro no paga la CxP. El pago se genera recién al marcar el cheque como cobrado.</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Banco<div className="mt-1 flex gap-2"><select value={form.banco_id} onChange={(e) => setForm({ ...form, banco_id: e.target.value })} className="w-full rounded-xl border p-2.5"><option value="">Selecciona</option>{banks.map((bank) => <option key={bank.id} value={bank.id}>{bank.nombre}</option>)}</select><button type="button" onClick={addBank} className="rounded-xl border border-blue-200 px-3 text-blue-700" title="Agregar banco">+</button></div></label><label className="text-sm">Número<input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label><label className="text-sm">Monto<input type="number" min="0.01" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label><label className="text-sm">Cuenta por pagar (opcional)<input type="number" min="1" value={form.cuenta_por_pagar_id} onChange={(e) => setForm({ ...form, cuenta_por_pagar_id: e.target.value })} placeholder="ID de la CxP" className="mt-1 w-full rounded-xl border p-2.5" /></label><label className="text-sm">Fecha de emisión<input type="date" value={form.fecha_emision} onChange={(e) => setForm({ ...form, fecha_emision: e.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label><label className="text-sm">Fecha del cheque<input type="date" value={form.fecha_cheque} onChange={(e) => setForm({ ...form, fecha_cheque: e.target.value })} className="mt-1 w-full rounded-xl border p-2.5" /></label><label className="text-sm sm:col-span-2">Observación<textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} className="mt-1 w-full rounded-xl border p-2.5" rows={3} /></label></div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2">Cancelar</button><button disabled={saving} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving && <Loader2 className="animate-spin" size={16} />}Guardar cheque</button></div></div></div>}
  </div></div>;
}
