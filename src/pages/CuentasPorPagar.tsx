import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Eye, HandCoins, Landmark, Loader2, Pencil, Search, XCircle } from "lucide-react";
import { useAuth } from "../AuthContext";
import AlertasOperativasSummary from "../components/contabilidad/AlertasOperativasSummary";

import {
  getCuentaPorPagar,
  getCuentasPorPagar,
  registrarPago,
  actualizarSeguimientoCuentaPorPagar,
  ampliarVencimientoCuentaPorPagar,
  type CuentaPorPagar,
} from "../services/contabilidad.service";

const estados = ["todos", "pendiente", "parcial", "pagada", "vencida", "anulada"];
const perPageOptions = [5, 10, 25, 50, 100];
const condicionesPago = ["contado", "cheque_30_dias", "credito_15_dias", "credito_30_dias", "credito_45_dias", "credito_60_dias", "efectivo_dev", "tarjeta_dev"];
const labelize = (value?: string | null) => (value || "-").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
const money = (value: unknown, symbol = "S/") => `${symbol} ${Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dueSourceLabel: Record<string, string> = {
  comprobante: "Indicado en comprobante",
  credito_proveedor: "Crédito del proveedor",
  contado: "Pago al contado",
  sin_fecha: "Sin fecha definida",
};
const formatDate = (value?: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("es-PE") : "-";

export default function CuentasPorPagar() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const canWrite = hasPermission("contabilidad.cxp.pagos") || hasPermission("contabilidad.cxp") || hasPermission("contabilidad");
  const canManageCheques = hasPermission("contabilidad.cheques") || hasPermission("contabilidad");
  const [rows, setRows] = useState<CuentaPorPagar[]>([]);
  const [detail, setDetail] = useState<CuentaPorPagar | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [paying, setPaying] = useState<CuentaPorPagar | null>(null);
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [pagadoPor, setPagadoPor] = useState("");
  const [montoDesembolsado, setMontoDesembolsado] = useState("");
  const [numeroCuotas, setNumeroCuotas] = useState("1");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [tipoOperacion, setTipoOperacion] = useState("compra");
  const [paymentCurrency, setPaymentCurrency] = useState("1");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [tracking, setTracking] = useState<CuentaPorPagar | null>(null);
  const [trackingForm, setTrackingForm] = useState<{ estado_operativo: string; fecha_estimada_pago: string; condicion_pago?: string; detraccion_monto_programado: string; detraccion_fecha_programada: string }>({ estado_operativo: "registrado", fecha_estimada_pago: "", condicion_pago: "contado", detraccion_monto_programado: "", detraccion_fecha_programada: "" });
  const [extending, setExtending] = useState<CuentaPorPagar | null>(null);
  const [extensionForm, setExtensionForm] = useState({ fecha_nueva: "", motivo: "" });
  const requestId = useRef(0);

  const fetchRows = async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const response = await getCuentasPorPagar({ page, perPage, search, estado, tipoOperacion });
      if (currentRequest !== requestId.current) return;
      setRows(response.data);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch (err: any) {
      if (currentRequest !== requestId.current) return;
      setError(err?.response?.data?.message || "No se pudieron cargar las cuentas por pagar.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchRows, 250);
    return () => window.clearTimeout(timer);
  }, [page, perPage, search, estado, tipoOperacion]);

  useEffect(() => {
    if (tracking) setTrackingForm((current) => ({ ...current, condicion_pago: tracking.condicion_pago || "contado" }));
  }, [tracking]);

  const openDetail = async (row: CuentaPorPagar) => {
    setError("");
    try { setDetail(await getCuentaPorPagar(row.id)); }
    catch (err: any) { setError(err?.response?.data?.message || "No se pudo cargar el detalle."); }
  };

  const openPayment = (row: CuentaPorPagar) => {
    setPaying(row);
    setMonto(Number(row.saldo || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setReferencia("");
    setMetodoPago(["efectivo_dev", "tarjeta_dev"].includes(row.condicion_pago || "") ? String(row.condicion_pago) : "transferencia");
    setPagadoPor("");
    setMontoDesembolsado(String(row.saldo || ""));
    setNumeroCuotas("1");
    setIdempotencyKey(`pago-ui-${row.id}-${crypto.randomUUID()}`);
    setPaymentCurrency(String(row.moneda?.id || 1)); setExchangeRate("1");
  };

  const savePayment = async () => {
    if (!paying) return;
    if (["efectivo_dev", "tarjeta_dev"].includes(metodoPago) && (!pagadoPor.trim() || Number(montoDesembolsado.replace(/,/g, "")) <= 0)) {
      setError("Indica quién realizó el pago y cuánto desembolsó realmente.");
      return;
    }
    const amount = Number(monto.replace(/,/g, ""));
    const balance = Number(paying.saldo);
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) {
      setError(`Ingresa un monto mayor a 0 y no superior al saldo (${money(balance, paying.moneda?.simbolo || "S/")}).`);
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await registrarPago(paying.id, {
        monto: amount,
        metodo_pago: metodoPago,
        pagado_por: ["efectivo_dev", "tarjeta_dev"].includes(metodoPago) ? pagadoPor : undefined,
        monto_desembolsado: ["efectivo_dev", "tarjeta_dev"].includes(metodoPago) ? Number(montoDesembolsado.replace(/,/g, "")) : undefined,
        numero_cuotas: metodoPago === "tarjeta_dev" ? Number(numeroCuotas) : undefined,
        referencia,
        idempotency_key: idempotencyKey,
        moneda_id: Number(paymentCurrency),
        tipo_cambio: Number(paymentCurrency) === Number(paying.moneda?.id) ? 1 : Number(exchangeRate),
      });
      setPaying(null);
      setMonto("");
      setReferencia("");
      setSuccess("Pago registrado correctamente. La CxP fue actualizada.");
      await fetchRows();
    } catch (err: any) {
      setError(err?.response?.data?.message || Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() || "No se pudo registrar el pago.");
    } finally {
      setSaving(false);
    }
  };

  const saveTracking = async () => {
    if (!tracking) return; setSaving(true); setError("");
    try { await actualizarSeguimientoCuentaPorPagar(tracking.id, trackingForm); setTracking(null); await fetchRows(); }
    catch (err: any) { setError(err?.response?.data?.message || "No se pudo actualizar el seguimiento."); }
    finally { setSaving(false); }
  };

  const saveExtension = async () => {
    if (!extending || !extensionForm.fecha_nueva || extensionForm.motivo.trim().length < 5) { setError("Indica la nueva fecha y un motivo de al menos 5 caracteres."); return; }
    setSaving(true); setError("");
    try { await ampliarVencimientoCuentaPorPagar(extending.id, extensionForm); setExtending(null); await fetchRows(); }
    catch (err: any) { setError(err?.response?.data?.message || Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() || "No se pudo ampliar el vencimiento."); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase text-blue-700">Contabilidad</p>
          <h1 className="text-2xl font-bold text-slate-900">Compras</h1>
          <p className="text-sm text-slate-500">Control de facturas de proveedor, saldos y pagos parciales.</p>
        </div>
        <div className="flex gap-2 rounded-2xl border bg-white p-2">{[["compra", "Compras"], ["gasto", "Gastos"]].map(([value, label]) => <button key={value} onClick={() => { setTipoOperacion(value); setPage(1); }} className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold ${tipoOperacion === value ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</button>)}</div>
        <AlertasOperativasSummary codes={["cxp_vencida", "cxp_por_vencer", "compra_sin_comprobante", "recepcion_sin_factura_proveedor", "cheques_por_cobrar", "cheques_sin_entregar"]} />
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_160px_120px]">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar proveedor o comprobante" className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm" /></div>
          <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} className="rounded-xl border px-3 py-2.5 text-sm">{estados.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="rounded-xl border px-3 py-2.5 text-sm">{perPageOptions.map((item) => <option key={item} value={item}>{item} filas</option>)}</select>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Comprobante</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Pagado</th><th className="px-4 py-3">Saldo</th><th className="px-4 py-3">Vencimiento / retraso</th><th className="px-4 py-3">Estado</th><th className="sticky right-0 bg-slate-100 px-4 py-3 text-right">Acciones</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" />Cargando...</td></tr> : rows.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No hay cuentas que coincidan con los filtros.</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold">{row.tipo_cuenta === "devolucion" ? `DEV-${row.id}` : row.comprobante ? `${row.comprobante.serie}-${row.comprobante.numero}` : row.compra?.numero || `CxP #${row.id}`} {row.tipo_cuenta === "devolucion" ? <span className="mt-1 block w-fit rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">Devolución pendiente</span> : !row.comprobante && <span className="mt-1 block w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Sin comprobante</span>}</td><td className="px-4 py-3">{row.beneficiario || row.proveedor?.nombre || row.comprobante?.emisor_nombre || "-"}{row.tipo_cuenta === "devolucion" && <span className="mt-1 block text-[11px] text-slate-500">Comisión: {money(row.comision_origen, row.moneda?.simbolo || "S/")}{row.numero_cuotas ? ` · ${row.numero_cuotas} cuotas` : ""}</span>}</td><td className="px-4 py-3">{money(row.total, row.moneda?.simbolo || "S/")}</td><td className="px-4 py-3">{money(row.monto_pagado, row.moneda?.simbolo || "S/")}</td><td className="px-4 py-3 font-semibold">{money(row.saldo, row.moneda?.simbolo || "S/")}</td><td className="px-4 py-3"><div className="font-medium text-slate-700">{formatDate(row.fecha_estimada_pago || row.fecha_vencimiento)}</div><span className={`text-[11px] ${(row.dias_retraso || 0) > 0 ? "font-semibold text-red-600" : "text-slate-500"}`}>{row.dias_retraso || 0} días de retraso</span></td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{labelize(row.estado)}</span><span className="mt-1 block text-[11px] text-slate-500">{labelize(row.estado_operativo)} · {labelize(row.condicion_pago)}</span></td>
                    <td className="sticky right-0 bg-white px-4 py-3"><div className="flex justify-end gap-2"><button aria-label="Ver detalle" title="Ver detalle" onClick={() => openDetail(row)} className="rounded-lg bg-slate-100 p-2"><Eye size={16} /></button>{canWrite && <button title="Seguimiento" onClick={() => { setTracking(row); setTrackingForm({ estado_operativo: row.estado_operativo || "registrado", fecha_estimada_pago: row.fecha_estimada_pago || "", detraccion_monto_programado: String(row.detraccion_monto_programado || ""), detraccion_fecha_programada: row.detraccion_fecha_programada || "" }); }} className="rounded-lg bg-blue-50 p-2 text-blue-700"><Pencil size={16} /></button>}{canManageCheques && tipoOperacion === "compra" && Boolean(row.proveedor?.tiene_credito) && !["pagada", "anulada"].includes(row.estado) && (row.cheques || []).some((cheque) => !["anulado", "devuelto"].includes(cheque.estado)) ? <button aria-label="Cheque vinculado" title={`Cheque ${(row.cheques || []).find((cheque) => !["anulado", "devuelto"].includes(cheque.estado))?.numero || "vinculado"}`} onClick={() => navigate("/contabilidad/cheques")} className="rounded-lg bg-violet-600 p-2 text-white"><Landmark size={16} /></button> : canManageCheques && tipoOperacion === "compra" && Boolean(row.proveedor?.tiene_credito) && !["pagada", "anulada"].includes(row.estado) && <button aria-label="Enlazar cheque" title="Enlazar cheque opcional" onClick={() => navigate(`/contabilidad/cheques?cuenta_por_pagar_id=${row.id}`)} className="rounded-lg bg-violet-50 p-2 text-violet-700"><Landmark size={16} /></button>}{canWrite && !["pagada", "anulada"].includes(row.estado) && <button aria-label="Registrar pago" title="Registrar pago al contado o transferencia" onClick={() => openPayment(row)} className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><HandCoins size={16} /></button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-500"><span>Total: {total}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Anterior</button><span className="px-2 py-1">{page}/{lastPage}</span><button disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Siguiente</button></div></div>
        </div>
      </div>
      {(paying || detail) && <Modal title={paying ? "Registrar pago" : `Detalle CxP #${detail?.id}`} onClose={() => { setPaying(null); setDetail(null); }}>
        {paying ? <div className="space-y-3"><div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">Saldo disponible</span><p className="text-lg font-bold text-slate-900">{money(paying.saldo, paying.moneda?.simbolo || "S/")}</p></div><label className="block text-sm font-medium">Monto aplicado a la compra<input type="text" inputMode="decimal" value={monto} onChange={(e) => { const value = e.target.value.replace(/[^\d.,]/g, "").replace(/,/g, ""); setMonto(value); if (["efectivo_dev", "tarjeta_dev"].includes(metodoPago)) setMontoDesembolsado(value); }} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Moneda<select value={paymentCurrency} onChange={(e) => setPaymentCurrency(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="1">PEN</option><option value="2">USD</option></select></label>{Number(paymentCurrency) !== Number(paying.moneda?.id) && <label className="block text-sm font-medium">Tipo de cambio<input type="number" min="0.000001" step="0.000001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>}</div><label className="block text-sm font-medium">Método de pago<select value={metodoPago} onChange={(e) => { setMetodoPago(e.target.value); if (["efectivo_dev", "tarjeta_dev"].includes(e.target.value)) setMontoDesembolsado(monto); }} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"><option value="transferencia">Transferencia empresa</option><option value="efectivo">Efectivo empresa</option><option value="deposito">Depósito empresa</option><option value="efectivo_dev">Efectivo - DEV</option><option value="tarjeta_dev">Tarjeta de crédito - DEV</option><option value="otro">Otro</option></select></label>{["efectivo_dev", "tarjeta_dev"].includes(metodoPago) && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-xs text-amber-800">Se generará automáticamente una nueva cuenta por pagar de tipo Devolución.</p><label className="block text-sm font-medium">Persona que realizó el pago<input value={pagadoPor} onChange={(e) => setPagadoPor(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Nombre del dueño del efectivo o tarjeta" /></label><label className="block text-sm font-medium">Monto realmente desembolsado<input type="text" inputMode="decimal" value={montoDesembolsado} onChange={(e) => setMontoDesembolsado(e.target.value.replace(/[^\d.,]/g, "").replace(/,/g, ""))} className="mt-1 w-full rounded-xl border px-3 py-2" /><span className="text-[11px] text-slate-500">Incluye la comisión. Predeterminado: monto requerido.</span></label>{metodoPago === "tarjeta_dev" && <label className="block text-sm font-medium">Número de cuotas<input type="number" min="1" max="120" value={numeroCuotas} onChange={(e) => setNumeroCuotas(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>}</div>}<label className="block text-sm font-medium">Referencia<input value={referencia} onChange={(e) => setReferencia(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label><button disabled={saving || !monto} onClick={savePayment} className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : "Guardar pago"}</button></div> : <div className="space-y-2">{(detail?.pagos || []).length === 0 ? <p className="text-sm text-slate-500">Aún no hay pagos registrados.</p> : (detail?.pagos || []).map((p: any) => <div key={p.id} className="rounded-xl border p-3 text-sm">{money(p.monto, detail?.moneda?.simbolo || "S/")} - {p.referencia || "Sin referencia"} - {labelize(p.metodo_pago)} - {labelize(p.estado)}</div>)}</div>}
      </Modal>}
      {tracking && <Modal title="Seguimiento de compra" onClose={() => setTracking(null)}><div className="space-y-3"><label className="block text-sm font-medium">Estado operativo<select value={trackingForm.estado_operativo} onChange={(e) => setTrackingForm((f) => ({ ...f, estado_operativo: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2">{["registrado", "observado", "programado_para_pago", "reprogramacion_pago", "vencido", "cancelado"].map((v) => <option key={v} value={v}>{labelize(v)}</option>)}</select></label><label className="block text-sm font-medium">Condición de pago<select value={trackingForm.condicion_pago} onChange={(e) => setTrackingForm((f) => ({ ...f, condicion_pago: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2">{condicionesPago.map((v) => <option key={v} value={v}>{labelize(v)}</option>)}</select></label><label className="block text-sm font-medium">Fecha estimada de pago<input type="date" value={trackingForm.fecha_estimada_pago} onChange={(e) => setTrackingForm((f) => ({ ...f, fecha_estimada_pago: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2" /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Detracción programada<input type="number" min="0" step="0.01" value={trackingForm.detraccion_monto_programado} onChange={(e) => setTrackingForm((f) => ({ ...f, detraccion_monto_programado: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2" /></label><label className="text-sm font-medium">Fecha detracción<input type="date" value={trackingForm.detraccion_fecha_programada} onChange={(e) => setTrackingForm((f) => ({ ...f, detraccion_fecha_programada: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2" /></label></div><button type="button" onClick={() => { setExtending(tracking); setExtensionForm({ fecha_nueva: tracking.fecha_estimada_pago || tracking.fecha_vencimiento || "", motivo: "" }); setTracking(null); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 px-4 py-2.5 font-semibold text-violet-700"><CalendarClock size={17} />Ampliar vencimiento</button><button onClick={saveTracking} disabled={saving} className="w-full rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">Guardar seguimiento</button></div></Modal>}
      {extending && <Modal title="Ampliar vencimiento" onClose={() => setExtending(null)}><div className="space-y-3"><div className="rounded-xl bg-slate-50 p-3 text-sm">Vencimiento actual: <strong>{formatDate(extending.fecha_vencimiento)}</strong></div><label className="block text-sm font-medium">Nueva fecha<input type="date" min={new Date().toISOString().slice(0, 10)} value={extensionForm.fecha_nueva} onChange={(e) => setExtensionForm((f) => ({ ...f, fecha_nueva: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2" /></label><label className="block text-sm font-medium">Motivo de la ampliación<textarea value={extensionForm.motivo} onChange={(e) => setExtensionForm((f) => ({ ...f, motivo: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Ej.: proveedor aprobó una ampliación de 15 días" /></label>{(extending.prorrogas || []).length > 0 && <div className="rounded-xl border p-3"><p className="mb-2 text-sm font-semibold">Historial</p>{(extending.prorrogas || []).map((item) => <p key={item.id} className="text-xs text-slate-600">{formatDate(item.fecha_anterior)} → {formatDate(item.fecha_nueva)} · {item.motivo}</p>)}</div>}<button onClick={saveExtension} disabled={saving} className="w-full rounded-xl bg-violet-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? "Guardando..." : "Confirmar ampliación"}</button></div></Modal>}
      {detail && canManageCheques && detail.proveedor?.tiene_credito && !["pagada", "anulada"].includes(detail.estado) && (
        <button
          type="button"
          onClick={() => navigate(`/contabilidad/cheques?cuenta_por_pagar_id=${detail.id}`)}
          className="fixed bottom-5 right-5 z-[60] rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-xl hover:bg-blue-800"
        >
          Registrar cheque para esta CxP
        </button>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose}><XCircle /></button></div>{children}</div></div>;
}
