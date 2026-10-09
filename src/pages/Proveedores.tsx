import { useEffect, useState } from "react";
import { CreditCard, Loader2, Pencil, Plus, Search, X } from "lucide-react";
import { useAuth } from "../AuthContext";
import { createProveedor, getProveedores, updateProveedor, type Proveedor, type ProveedorPayload } from "../services/proveedor.service";

const emptyForm: ProveedorPayload = { nombre: "", ruc: "", contacto: "", telefono: "", correo: "", activo: true, tiene_credito: false, dias_credito: 30, limite_credito: null, moneda_credito_id: 1 };

export default function Proveedores() {
  const { user } = useAuth();
  const canManageTerms = ["SUPERADMIN", "ADMIN", "CONTABILIDAD"].includes(user?.role || "");
  const [rows, setRows] = useState<Proveedor[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Proveedor | null | undefined>(undefined);
  const [form, setForm] = useState<ProveedorPayload>(emptyForm);

  const load = async () => {
    setLoading(true); setError("");
    try { setRows(await getProveedores({ search, activo: true, per_page: 500 })); }
    catch { setError("No se pudieron cargar los proveedores."); }
    finally { setLoading(false); }
  };

  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer); }, [search]);

  const openForm = (row?: Proveedor) => {
    setEditing(row || null);
    setForm(row ? { nombre: row.nombre, ruc: row.ruc || "", contacto: row.contacto || "", telefono: row.telefono || "", correo: row.correo || "", activo: row.activo, tiene_credito: row.tiene_credito, dias_credito: row.dias_credito || 30, limite_credito: row.limite_credito ? Number(row.limite_credito) : null, moneda_credito_id: row.moneda_credito_id || 1 } : { ...emptyForm });
  };

  const save = async () => {
    if (!form.nombre.trim()) return setError("El nombre es obligatorio.");
    setSaving(true); setError("");
    try {
      if (editing) await updateProveedor(editing.id, form); else await createProveedor(form);
      setEditing(undefined); await load();
    } catch (err: any) { setError(err?.response?.data?.message || Object.values(err?.response?.data?.errors || {}).flat()?.[0]?.toString() || "No se pudo guardar."); }
    finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-slate-50 p-3 sm:p-6"><div className="mx-auto max-w-7xl space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase text-blue-700">Compras</p><h1 className="text-2xl font-bold text-slate-900">Maestro de proveedores</h1><p className="text-sm text-slate-500">Consulta proveedores y administra sus condiciones de crédito.</p></div><button onClick={() => openForm()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={18}/>Nuevo proveedor</button></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="relative rounded-2xl border bg-white p-4 shadow-sm"><Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, RUC o contacto" className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm"/></div>
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-100 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">RUC</th><th className="px-4 py-3">Contacto</th><th className="px-4 py-3">Condición</th><th className="px-4 py-3">Límite</th><th className="px-4 py-3 text-right">Acción</th></tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan={6} className="p-10 text-center"><Loader2 className="mx-auto animate-spin"/></td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-slate-500">Sin proveedores.</td></tr> : rows.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold">{row.nombre}</td><td className="px-4 py-3">{row.ruc || "-"}</td><td className="px-4 py-3">{row.contacto || row.correo || "-"}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${row.tiene_credito ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}><CreditCard size={14}/>{row.tiene_credito ? `Crédito · ${row.dias_credito || 0} días` : "Contado"}</span></td><td className="px-4 py-3">{row.limite_credito ? `S/ ${Number(row.limite_credito).toLocaleString("es-PE", { minimumFractionDigits: 2 })}` : "-"}</td><td className="px-4 py-3 text-right"><button onClick={() => openForm(row)} title="Editar" className="rounded-lg bg-blue-50 p-2 text-blue-700"><Pencil size={16}/></button></td></tr>)}</tbody></table></div></div>
  </div>
  {editing !== undefined && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{editing ? "Editar proveedor" : "Nuevo proveedor"}</h2><button onClick={() => setEditing(undefined)}><X/></button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Nombre<input value={form.nombre} onChange={(e) => setForm({...form,nombre:e.target.value})} className="mt-1 w-full rounded-xl border px-3 py-2"/></label><label className="text-sm font-medium">RUC<input value={form.ruc || ""} onChange={(e) => setForm({...form,ruc:e.target.value})} className="mt-1 w-full rounded-xl border px-3 py-2"/></label><label className="text-sm font-medium">Contacto<input value={form.contacto || ""} onChange={(e) => setForm({...form,contacto:e.target.value})} className="mt-1 w-full rounded-xl border px-3 py-2"/></label><label className="text-sm font-medium">Teléfono<input value={form.telefono || ""} onChange={(e) => setForm({...form,telefono:e.target.value})} className="mt-1 w-full rounded-xl border px-3 py-2"/></label></div><div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(form.tiene_credito)} onChange={(e) => setForm({...form,tiene_credito:e.target.checked})}/>Tenemos crédito con este proveedor</label>{form.tiene_credito && <div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-sm">Días<input disabled={!canManageTerms} type="number" min="0" max="365" value={form.dias_credito || 0} onChange={(e) => setForm({...form,dias_credito:Number(e.target.value)})} className="mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-50"/></label><label className="text-sm">Límite<input disabled={!canManageTerms} type="number" min="0" value={form.limite_credito ?? ""} onChange={(e) => setForm({...form,limite_credito:e.target.value ? Number(e.target.value):null})} className="mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-50"/></label><label className="text-sm">Moneda<select disabled={!canManageTerms} value={form.moneda_credito_id || 1} onChange={(e) => setForm({...form,moneda_credito_id:Number(e.target.value)})} className="mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-50"><option value={1}>PEN</option><option value={2}>USD</option></select></label></div>} {!canManageTerms && form.tiene_credito && <p className="mt-2 text-xs text-emerald-800">Ventas puede indicar que existe crédito; Contabilidad o Administración define las condiciones.</p>}</div><button disabled={saving} onClick={save} className="mt-4 w-full rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : "Guardar proveedor"}</button></div></div>}
  </div>;
}
