import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useAuth } from "../AuthContext";
import { getSolicitudesSobrecompra, resolveSolicitudSobrecompra, type SolicitudSobrecompra } from "../services/sobrecompra.service";

const label = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function SolicitudesSobrecompra() {
  const { user } = useAuth();
  const canResolve = ["SUPERADMIN", "ADMIN"].includes(user?.role || "");
  const [rows, setRows] = useState<SolicitudSobrecompra[]>([]);
  const [estado, setEstado] = useState("pendiente");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = async () => { setLoading(true); setError(""); try { setRows(await getSolicitudesSobrecompra(estado)); } catch (err: any) { setError(err?.response?.data?.message || "No se pudieron cargar las solicitudes."); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [estado]);

  const resolve = async (row: SolicitudSobrecompra, next: "aprobada" | "rechazada") => {
    const comment = window.prompt(next === "aprobada" ? "Comentario de aprobación (obligatorio):" : "Motivo del rechazo (obligatorio):");
    if (!comment?.trim()) return;
    setActionId(row.id); setError("");
    try { await resolveSolicitudSobrecompra(row.id, next, comment.trim()); await load(); } catch (err: any) { setError(err?.response?.data?.message || "No se pudo resolver la solicitud."); } finally { setActionId(null); }
  };

  return <div className="min-h-screen bg-slate-50 p-3 sm:p-6"><div className="mx-auto max-w-7xl space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase text-amber-700">Compras</p><h1 className="text-2xl font-bold">Solicitudes de sobrecompra</h1><p className="text-sm text-slate-500">El excedente aprobado ingresará como stock adicional al confirmar su recepción.</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/>Actualizar</button></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl border px-3 py-2"><option value="pendiente">Pendientes</option><option value="aprobada">Aprobadas</option><option value="rechazada">Rechazadas</option><option value="todos">Todas</option></select>
    <div className="space-y-3">{loading ? <div className="p-12 text-center text-slate-500"><Loader2 className="mx-auto animate-spin"/>Cargando...</div> : rows.length === 0 ? <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-slate-500">No hay solicitudes.</div> : rows.map((row) => <article key={row.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-3 md:flex-row"><div><div className="flex items-center gap-2"><h2 className="font-bold">{row.numero}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{label(row.estado)}</span></div><p className="mt-1 text-sm text-slate-500">Solicita: {[row.solicitante?.nombres, row.solicitante?.apellidos].filter(Boolean).join(" ") || row.solicitante?.email || "-"}</p><p className="mt-3 text-sm"><strong>Justificación:</strong> {row.justificacion}</p>{row.comentario_resolucion && <p className="mt-2 text-sm"><strong>Resolución:</strong> {row.comentario_resolucion}</p>}</div>{canResolve && row.estado === "pendiente" && <div className="flex shrink-0 gap-2"><button disabled={actionId !== null} onClick={() => void resolve(row, "rechazada")} className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 font-semibold text-red-700"><XCircle size={17}/>Rechazar</button><button disabled={actionId !== null} onClick={() => void resolve(row, "aprobada")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white">{actionId === row.id ? <Loader2 size={17} className="animate-spin"/> : <CheckCircle2 size={17}/>}Aprobar</button></div>}</div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{row.payload_compra.items.map((item, index) => <div key={index} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-semibold">{item.descripcion || `Ítem ${index + 1}`}</p><p className="text-slate-500">Cantidad solicitada: {item.cantidad}</p></div>)}</div></article>)}</div>
  </div></div>;
}
