import { useEffect, useRef, useState } from "react";
import { Ban, Eye, FileSearch, Loader2, ReceiptText, Search, Upload, XCircle } from "lucide-react";

import {
  createComprobante,
  createManualComprobante,
  generarCuentaPorCobrar,
  generarCuentaPorPagar,
  getComprobante,
  getComprobantes,
  previewXmlComprobante,
  registrarNotaCredito,
  type Comprobante,
} from "../services/contabilidad.service";
import { getCompras, type Compra } from "../services/compra.service";
import { useAuth } from "../AuthContext";
import AlertasOperativasSummary from "../components/contabilidad/AlertasOperativasSummary";

const perPageOptions = [5, 10, 25, 50, 100];
const estados = ["todos", "registrado", "anulado"];
const operaciones = ["compra", "venta", "gasto"];
const centrosCostoSugeridos = ["Administración", "Ventas", "Logística", "Almacén", "Oficina principal", "Uso general"];
const condicionesPago = ["contado", "cheque_30_dias", "credito_15_dias", "credito_30_dias", "credito_45_dias", "credito_60_dias", "efectivo_dev", "tarjeta_dev"];
const labelize = (value?: string | null) => (value || "-").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
const money = (value: unknown, symbol = "S/") =>
  `${symbol} ${Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const addDays = (date: string, days: number) => {
  if (!date || !Number.isFinite(days)) return "";
  const result = new Date(`${date}T00:00:00`);
  result.setDate(result.getDate() + days);
  return result.toLocaleDateString("es-PE");
};
const formatAmountInput = (value: string) => {
  const clean = value.replace(/[^\d.]/g, "");
  if (!clean) return "";
  const [integerPart, ...decimalParts] = clean.split(".");
  const integer = (integerPart || "0").replace(/^0+(?=\d)/, "");
  const formattedInteger = Number(integer || 0).toLocaleString("en-US");
  const decimal = decimalParts.join("").slice(0, 2);
  return clean.includes(".") ? `${formattedInteger}.${decimal}` : formattedInteger;
};
const amountForRequest = (value: string) => value.replace(/,/g, "");

export default function Comprobantes() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("contabilidad.comprobantes") || hasPermission("contabilidad");
  const [rows, setRows] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("todos");
  const [tipoOperacion, setTipoOperacion] = useState("compra");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<Comprobante | null>(null);
  const [xmlPreview, setXmlPreview] = useState<any>(null);
  const [selectedLinkId, setSelectedLinkId] = useState("");
  const [generatedIds, setGeneratedIds] = useState<Set<number>>(new Set());
  const [manualOpen, setManualOpen] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualPurchases, setManualPurchases] = useState<Compra[]>([]);
  const [manualForm, setManualForm] = useState({ compra_id: "", categoria_gasto: "", centro_costo: "", emisor_ruc: "", emisor_nombre: "", receptor_ruc: "", receptor_nombre: "", descripcion: "", tipo_comprobante: "FACTURA", serie: "", numero: "", fecha_emision: new Date().toISOString().slice(0, 10), fecha_vencimiento: "", condicion_pago: "contado", subtotal: "", igv: "", total: "", moneda_id: "", detraccion_porcentaje: "", detraccion_monto_original: "", observacion: "" });
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [xmlHasDueDate, setXmlHasDueDate] = useState<boolean | null>(null);
  const [xmlDueDate, setXmlDueDate] = useState("");
  const [creditNoteTarget, setCreditNoteTarget] = useState<Comprobante | null>(null);
  const [creditNoteForm, setCreditNoteForm] = useState({ tipo_anulacion: "total", monto: "", motivo: "", devolucion_fisica_confirmada: false });
  const [creditNoteXml, setCreditNoteXml] = useState<File | null>(null);
  const [creditNotePdf, setCreditNotePdf] = useState<File | null>(null);
  const [creditNoteItems, setCreditNoteItems] = useState<Record<number, { cantidad: string; monto: string }>>({});
  const selectedManualPurchase = manualPurchases.find((purchase) => String(purchase.id) === manualForm.compra_id);
  const selectedProvider = selectedManualPurchase?.proveedor;
  const creditDays = Number(selectedProvider?.dias_credito || 0);
  const requestId = useRef(0);

  const fetchRows = async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const response = await getComprobantes({ page, perPage, search, estado, tipoOperacion });
      if (currentRequest !== requestId.current) return;
      setRows(response.data);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch (err: any) {
      if (currentRequest !== requestId.current) return;
      setRows([]);
      setError(err?.response?.data?.message || "No se pudieron cargar los comprobantes.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchRows, 250);
    return () => window.clearTimeout(timer);
  }, [page, perPage, search, estado, tipoOperacion]);

  const openManual = async () => {
    setManualOpen(true);
    setManualLoading(true);
    setError("");
    setManualForm((current) => ({ ...current, compra_id: "", categoria_gasto: "", moneda_id: tipoOperacion === "gasto" ? "1" : current.moneda_id }));
    if (tipoOperacion !== "compra") { setManualLoading(false); return; }
    try {
      const response = await getCompras({ perPage: 100 });
      setManualPurchases(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudieron cargar las compras para el comprobante manual.");
    } finally {
      setManualLoading(false);
    }
  };

  const saveManual = async () => {
    if ((tipoOperacion === "compra" && !manualForm.compra_id) || (tipoOperacion === "gasto" && !manualForm.categoria_gasto) || !manualForm.serie || !manualForm.numero || !manualForm.total) {
      setError("Completa el documento, número, total y su vínculo requerido.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = new FormData();
      payload.append("tipo_operacion", tipoOperacion);
      Object.entries(manualForm).forEach(([key, value]) => {
        if (value !== "") payload.append(key, ["subtotal", "igv", "total", "detraccion_porcentaje", "detraccion_monto_original"].includes(key) ? amountForRequest(value) : value);
      });
      if (manualFile) payload.append("archivo", manualFile);
      await createManualComprobante(payload);
      setManualOpen(false);
      setManualFile(null);
      await fetchRows();
    } catch (err: any) {
      setError(err?.response?.data?.message || Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() || "No se pudo registrar el comprobante PDF.");
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewXml = async (file?: File) => {
    if (!file) return;
    if (file.size === 0) {
      setError("El archivo XML está vacío. Vuelve a descargarlo o expórtalo nuevamente.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const preview = await previewXmlComprobante(file);
      setXmlPreview(preview);
      setXmlDueDate(preview.fecha_vencimiento || "");
      setXmlHasDueDate(preview.fecha_vencimiento ? true : null);
      setSelectedLinkId(preview.vinculos_sugeridos?.length === 1 ? String(preview.vinculos_sugeridos[0].id) : "");
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudo leer el XML.");
    } finally {
      setSaving(false);
    }
  };

  const saveFromPreview = async () => {
    if (!xmlPreview || xmlPreview.tipo_operacion_sugerida === "observado") return;
    setSaving(true);
    setError("");
    try {
      await createComprobante({
        tipo_operacion: xmlPreview.tipo_operacion_sugerida,
        ...(xmlPreview.tipo_operacion_sugerida === "compra"
          ? { compra_id: Number(selectedLinkId) }
          : { oc_recibida_id: Number(selectedLinkId) }),
        tipo_comprobante: xmlPreview.tipo_comprobante,
        serie: xmlPreview.serie,
        numero: xmlPreview.numero,
        fecha_emision: xmlPreview.fecha_emision,
        fecha_vencimiento: xmlHasDueDate ? xmlDueDate : xmlPreview.fecha_emision,
        fecha_vencimiento_origen: xmlPreview.fecha_vencimiento ? "xml" : xmlHasDueDate ? "manual" : "contado",
        emisor_ruc: xmlPreview.emisor_ruc,
        emisor_nombre: xmlPreview.emisor_nombre,
        receptor_ruc: xmlPreview.receptor_ruc,
        receptor_nombre: xmlPreview.receptor_nombre,
        subtotal: xmlPreview.subtotal,
        igv: xmlPreview.igv,
        total: xmlPreview.total,
        moneda_id: xmlPreview.moneda_id || null,
        xml_hash: xmlPreview.xml_hash,
        xml_path: xmlPreview.xml_path,
        detraccion_porcentaje: xmlPreview.detraccion_porcentaje,
        detraccion_monto_original: xmlPreview.detraccion_monto_original,
        detraccion_codigo: xmlPreview.detraccion_codigo,
        detraccion_cuenta: xmlPreview.detraccion_cuenta,
        items: xmlPreview.items,
      });
      setXmlPreview(null);
      await fetchRows();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() ||
          "No se pudo guardar el comprobante.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (row: Comprobante) => {
    setError("");
    try { setDetail(await getComprobante(row.id)); }
    catch (err: any) { setError(err?.response?.data?.message || "No se pudo cargar el detalle del comprobante."); }
  };

  const runAction = async (row: Comprobante, action: "cxp" | "cxc") => {
    const question = `¿Generar la ${action === "cxp" ? "cuenta por pagar" : "cuenta por cobrar"} para ${row.serie}-${row.numero}?`;
    if (!window.confirm(question)) return;
    setSaving(true);
    setError("");
    try {
      if (action === "cxp") await generarCuentaPorPagar(row.id);
      if (action === "cxc") await generarCuentaPorCobrar(row.id);
      setGeneratedIds((ids) => new Set(ids).add(row.id));
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

  const saveCreditNote = async () => {
    if (!creditNoteTarget || !creditNoteXml || !creditNoteForm.motivo.trim()) {
      setError("Adjunta el XML de la nota de crédito e indica el motivo."); return;
    }
    setSaving(true); setError("");
    try {
      const payload = new FormData();
      payload.append("tipo_anulacion", creditNoteForm.tipo_anulacion);
      payload.append("motivo", creditNoteForm.motivo);
      payload.append("devolucion_fisica_confirmada", creditNoteForm.devolucion_fisica_confirmada ? "1" : "0");
      if (creditNoteForm.tipo_anulacion === "parcial") payload.append("monto", amountForRequest(creditNoteForm.monto));
      if (creditNoteForm.tipo_anulacion === "parcial") {
        Object.entries(creditNoteItems).filter(([, item]) => Number(item.monto) > 0).forEach(([itemId, item], index) => {
          payload.append(`items[${index}][comprobante_item_id]`, itemId);
          if (item.cantidad) payload.append(`items[${index}][cantidad]`, item.cantidad);
          payload.append(`items[${index}][monto]`, amountForRequest(item.monto));
        });
      }
      payload.append("xml", creditNoteXml);
      if (creditNotePdf) payload.append("pdf", creditNotePdf);
      await registrarNotaCredito(creditNoteTarget.id, payload);
      setCreditNoteTarget(null); setCreditNoteXml(null); setCreditNotePdf(null);
      await fetchRows();
    } catch (err: any) {
      setError(err?.response?.data?.message || Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() || "No se pudo registrar la nota de crédito.");
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-700">Contabilidad</p>
            <h1 className="text-2xl font-bold text-slate-900">Comprobantes y XML</h1>
            <p className="text-sm text-slate-500">Compras, ventas y gastos con trazabilidad tributaria y financiera.</p>
          </div>
          {canWrite && <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={openManual} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Upload size={18} /> Registrar PDF/manual</button>
            {tipoOperacion !== "gasto" && <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              Preview XML
              <input type="file" accept=".xml,text/xml" className="hidden" onChange={(e) => { handlePreviewXml(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            </label>}
          </div>}
        </div>
        <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {operaciones.map((item) => <button key={item} onClick={() => { setTipoOperacion(item); setPage(1); }} className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tipoOperacion === item ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{item === "gasto" ? "Gastos" : labelize(item)}</button>)}
        </div>
        <AlertasOperativasSummary codes={["compra_sin_comprobante", "recepcion_sin_factura_proveedor"]} />

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_150px_120px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar serie, numero, RUC o razon social" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" />
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
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Operacion</th>
                  <th className="px-4 py-3">Emisor</th>
                  <th className="px-4 py-3">Receptor</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="sticky right-0 bg-slate-100 px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" />Cargando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Sin comprobantes.</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold">{row.serie}-{row.numero}</td>
                    <td className="px-4 py-3">{labelize(row.tipo_operacion)}</td>
                    <td className="px-4 py-3">{row.emisor_nombre || "-"}</td>
                    <td className="px-4 py-3">{row.receptor_nombre || "-"}</td>
                    <td className="px-4 py-3">{money(row.total, row.moneda?.simbolo || "S/")}</td>
                    <td className="px-4 py-3"><span className="rounded-full border px-2 py-1 text-xs font-semibold">{labelize(row.estado)}</span></td>
                    <td className="sticky right-0 bg-white px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button aria-label="Ver detalle" onClick={() => openDetail(row)} title="Ver detalle" className="rounded-lg bg-slate-100 p-2 text-slate-700"><Eye size={16} /></button>
                        {canWrite && row.estado !== "anulado" && ["compra", "gasto"].includes(row.tipo_operacion) && !generatedIds.has(row.id) && !row.cuenta_por_pagar_id && !row.cuenta_por_pagar && <button disabled={saving} aria-label="Generar cuenta por pagar" onClick={() => runAction(row, "cxp")} title="Generar CxP" className="rounded-lg bg-amber-50 p-2 text-amber-700 disabled:opacity-40"><ReceiptText size={16} /></button>}
                        {canWrite && row.estado !== "anulado" && row.tipo_operacion === "venta" && !generatedIds.has(row.id) && !row.cuenta_por_cobrar_id && !row.cuenta_por_cobrar && <button disabled={saving} aria-label="Generar cuenta por cobrar" onClick={() => runAction(row, "cxc")} title="Generar CxC" className="rounded-lg bg-emerald-50 p-2 text-emerald-700 disabled:opacity-40"><ReceiptText size={16} /></button>}
                        {canWrite && !["anulado"].includes(row.estado) && <button disabled={saving} aria-label="Registrar nota de crédito" onClick={async () => { const full = await getComprobante(row.id); setCreditNoteTarget(full); setCreditNoteItems({}); setCreditNoteForm({ tipo_anulacion: "total", monto: String(row.total), motivo: "", devolucion_fisica_confirmada: false }); }} title="Anular con nota de crédito" className="rounded-lg bg-red-50 p-2 text-red-700 disabled:opacity-40"><Ban size={16} /></button>}
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

      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Registrar {tipoOperacion === "gasto" ? "gasto" : `comprobante de ${tipoOperacion}`}</h2><p className="text-sm text-slate-500">Registro manual con PDF opcional.</p></div><button type="button" onClick={() => setManualOpen(false)}><XCircle /></button></div>
            {manualLoading ? <div className="flex items-center justify-center gap-2 py-10 text-slate-500"><Loader2 className="animate-spin" /> Cargando compras...</div> : <div className="grid gap-3 sm:grid-cols-2">
              {tipoOperacion === "compra" && <label className="sm:col-span-2 text-sm font-semibold">Compra<select value={manualForm.compra_id} onChange={(e) => setManualForm((current) => ({ ...current, compra_id: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal"><option value="">Selecciona una compra...</option>{manualPurchases.filter((purchase) => !["borrador", "cancelada"].includes(purchase.estado)).map((purchase) => <option key={purchase.id} value={purchase.id}>{purchase.numero} · {purchase.proveedor?.nombre || "Sin proveedor"} · {purchase.total_estimado}</option>)}</select></label>}
              {tipoOperacion === "gasto" && <>
                <label className="text-sm font-semibold">Categoría<select value={manualForm.categoria_gasto} onChange={(e) => setManualForm((current) => ({ ...current, categoria_gasto: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal"><option value="">Selecciona...</option>{["combustible", "servicios", "viaticos", "limpieza", "oficina", "otros"].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></label>
                <label className="text-sm font-semibold">Centro de costo <span className="font-normal text-slate-500">(opcional)</span><input list="centros-costo-sugeridos" value={manualForm.centro_costo} onChange={(e) => setManualForm((current) => ({ ...current, centro_costo: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" placeholder="Selecciona o escribe uno nuevo" /><datalist id="centros-costo-sugeridos">{centrosCostoSugeridos.map((centro) => <option key={centro} value={centro} />)}</datalist><span className="mt-1 block text-xs font-normal text-slate-500">Puedes elegir una sugerencia o escribir libremente.</span></label>
              </>}
              {tipoOperacion !== "compra" && <>
                <label className="text-sm font-semibold">RUC emisor<input value={manualForm.emisor_ruc} onChange={(e) => setManualForm((current) => ({ ...current, emisor_ruc: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>
                <label className="text-sm font-semibold">Nombre emisor<input value={manualForm.emisor_nombre} onChange={(e) => setManualForm((current) => ({ ...current, emisor_nombre: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>
                <label className="sm:col-span-2 text-sm font-semibold">Descripción<input value={manualForm.descripcion} onChange={(e) => setManualForm((current) => ({ ...current, descripcion: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>
              </>}
              <label className="text-sm font-semibold">Tipo<select value={manualForm.tipo_comprobante} onChange={(e) => setManualForm((current) => ({ ...current, tipo_comprobante: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal"><option>FACTURA</option><option>BOLETA</option></select></label>
              <label className="text-sm font-semibold">Moneda<select value={manualForm.moneda_id} onChange={(e) => setManualForm((current) => ({ ...current, moneda_id: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal"><option value="">{tipoOperacion === "compra" ? "Usar moneda de la compra" : "Seleccionar moneda"}</option><option value="1">PEN</option><option value="2">USD</option></select></label>
              <label className="text-sm font-semibold">Serie<input value={manualForm.serie} onChange={(e) => setManualForm((current) => ({ ...current, serie: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" placeholder="F001" /></label>
              <label className="text-sm font-semibold">Número<input value={manualForm.numero} onChange={(e) => setManualForm((current) => ({ ...current, numero: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" placeholder="000123" /></label>
              <label className="text-sm font-semibold">Fecha emisión<input type="date" value={manualForm.fecha_emision} onChange={(e) => setManualForm((current) => ({ ...current, fecha_emision: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>
              <label className="text-sm font-semibold">Fecha vencimiento <span className="font-normal text-slate-500">(opcional)</span><input type="date" value={manualForm.fecha_vencimiento} onChange={(e) => setManualForm((current) => ({ ...current, fecha_vencimiento: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" /><span className="mt-1 block text-xs font-normal text-slate-500">Déjala vacía si el PDF no indica vencimiento.</span></label>
              <label className="text-sm font-semibold">Condición de pago<select value={manualForm.condicion_pago} onChange={(e) => setManualForm((current) => ({ ...current, condicion_pago: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal">{condicionesPago.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></label>
              {selectedManualPurchase && <div className="sm:col-span-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
                {selectedProvider?.tiene_credito
                  ? <>Este proveedor tiene crédito a <strong>{creditDays} días</strong>. Si no indicas una fecha en la factura, la CxP usará como fecha esperada el <strong>{addDays(manualForm.fecha_emision, creditDays)}</strong>.</>
                  : <>Este proveedor está configurado como <strong>pago al contado</strong>. Si no indicas vencimiento, la CxP quedará con vencimiento el mismo día de emisión.</>}
                <span className="mt-1 block text-blue-700">La fecha del cheque se registra aparte y no modifica la fecha de la factura.</span>
              </div>}
              <label className="text-sm font-semibold">Subtotal<input type="text" inputMode="decimal" value={manualForm.subtotal} onChange={(e) => setManualForm((current) => ({ ...current, subtotal: formatAmountInput(e.target.value) }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" placeholder="0.00" /></label>
              <label className="text-sm font-semibold">IGV<input type="text" inputMode="decimal" value={manualForm.igv} onChange={(e) => setManualForm((current) => ({ ...current, igv: formatAmountInput(e.target.value) }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" placeholder="0.00" /></label>
              <label className="text-sm font-semibold">Total<input type="text" inputMode="decimal" value={manualForm.total} onChange={(e) => setManualForm((current) => ({ ...current, total: formatAmountInput(e.target.value) }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" placeholder="0.00" /></label>
              <label className="text-sm font-semibold">PDF <span className="font-normal text-slate-500">(opcional)</span><input type="file" accept="application/pdf,.pdf" onChange={(e) => setManualFile(e.target.files?.[0] || null)} className="mt-1 block w-full rounded-xl border px-3 py-2 text-sm font-normal" /></label>
              <label className="text-sm font-semibold">Monto detracción<input value={manualForm.detraccion_monto_original} onChange={(e) => setManualForm((current) => ({ ...current, detraccion_monto_original: formatAmountInput(e.target.value) }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" placeholder="0.00" /></label>
              <label className="sm:col-span-2 text-sm font-semibold">Observación<textarea value={manualForm.observacion} onChange={(e) => setManualForm((current) => ({ ...current, observacion: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" rows={3} /></label>
            </div>}
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setManualOpen(false)} disabled={saving} className="rounded-xl border px-4 py-2.5 font-semibold text-slate-700">Cancelar</button><button type="button" onClick={saveManual} disabled={saving || manualLoading} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving && <Loader2 size={17} className="animate-spin" />}{saving ? "Registrando..." : "Guardar comprobante"}</button></div>
          </div>
        </div>
      )}

      {xmlPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><FileSearch size={20} /> Preview XML</h2>
              <button onClick={() => setXmlPreview(null)}><XCircle /></button>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p><b>Operacion:</b> {labelize(xmlPreview.tipo_operacion_sugerida)}</p>
              <p><b>Documento:</b> {xmlPreview.serie}-{xmlPreview.numero}</p>
              <p><b>Emisor:</b> {xmlPreview.emisor_ruc} - {xmlPreview.emisor_nombre}</p>
              <p><b>Receptor:</b> {xmlPreview.receptor_ruc} - {xmlPreview.receptor_nombre}</p>
              <p><b>Moneda:</b> {xmlPreview.moneda_codigo || "-"}</p>
              <p><b>Total:</b> {money(xmlPreview.total, xmlPreview.moneda_codigo === "USD" ? "$" : "S/")}</p>
              <p><b>Duplicado:</b> {xmlPreview.duplicado?.existe ? "Si" : "No"}</p>
              <p><b>Detracción:</b> {money(xmlPreview.detraccion_monto_original || 0)}</p>
            </div>
            {!xmlPreview.fecha_vencimiento && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              <p className="font-semibold">El XML no informa fecha de vencimiento. ¿Existe una fecha acordada?</p>
              <div className="mt-2 flex gap-2"><button onClick={() => setXmlHasDueDate(true)} className={`rounded-lg px-3 py-1.5 ${xmlHasDueDate === true ? "bg-blue-700 text-white" : "bg-white"}`}>Sí</button><button onClick={() => { setXmlHasDueDate(false); setXmlDueDate(""); }} className={`rounded-lg px-3 py-1.5 ${xmlHasDueDate === false ? "bg-blue-700 text-white" : "bg-white"}`}>No, al contado</button></div>
              {xmlHasDueDate && <input type="date" value={xmlDueDate} onChange={(e) => setXmlDueDate(e.target.value)} className="mt-2 rounded-lg border px-3 py-2" />}
            </div>}
            {xmlPreview.tipo_operacion_sugerida === "observado" && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                El XML no coincide con COMPANY_RUC como emisor ni receptor. Revisar configuracion antes de registrar.
              </div>
            )}
            {xmlPreview.tipo_operacion_sugerida !== "observado" && (
              <label className="mt-4 block text-sm font-semibold text-slate-700">
                {xmlPreview.tipo_operacion_sugerida === "compra" ? "Vincular a compra" : "Vincular a OC recibida"}
                <select value={selectedLinkId} onChange={(e) => setSelectedLinkId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal">
                  <option value="">Selecciona un documento...</option>
                  {(xmlPreview.vinculos_sugeridos || []).map((item: { id: number; label: string }) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                {(xmlPreview.vinculos_sugeridos || []).length === 0 && <span className="mt-1 block font-normal text-amber-700">No se encontraron documentos compatibles con el RUC del XML.</span>}
              </label>
            )}
            <button disabled={saving || !selectedLinkId || xmlPreview.duplicado?.existe || xmlPreview.tipo_operacion_sugerida === "observado" || (!xmlPreview.fecha_vencimiento && (xmlHasDueDate === null || (xmlHasDueDate && !xmlDueDate)))} onClick={saveFromPreview} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving && <Loader2 size={16} className="animate-spin" />} Guardar comprobante
            </button>
          </div>
        </div>
      )}

      {creditNoteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold">Nota de crédito</h2><p className="text-sm text-slate-500">{creditNoteTarget.serie}-{creditNoteTarget.numero}</p></div><button onClick={() => setCreditNoteTarget(null)}><XCircle /></button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">Tipo<select value={creditNoteForm.tipo_anulacion} onChange={(e) => setCreditNoteForm((f) => ({ ...f, tipo_anulacion: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal"><option value="total">Anulación total</option><option value="parcial">Anulación parcial</option></select></label>
              {creditNoteForm.tipo_anulacion === "parcial" && <label className="text-sm font-semibold">Monto a anular<input value={creditNoteForm.monto} onChange={(e) => setCreditNoteForm((f) => ({ ...f, monto: formatAmountInput(e.target.value) }))} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>}
              {creditNoteForm.tipo_anulacion === "parcial" && (creditNoteTarget.items || []).length > 0 && <div className="sm:col-span-2 space-y-2 rounded-xl border p-3"><p className="text-sm font-semibold">Detalle opcional por producto</p>{(creditNoteTarget.items || []).map((item: any) => <div key={item.id} className="grid grid-cols-[1fr_90px_120px] items-end gap-2 text-sm"><span>{item.descripcion}</span><label className="text-xs">Cantidad<input type="number" min="0" max={item.cantidad} step="0.01" value={creditNoteItems[item.id]?.cantidad || ""} onChange={(e) => setCreditNoteItems((v) => ({ ...v, [item.id]: { cantidad: e.target.value, monto: v[item.id]?.monto || "" } }))} className="mt-1 w-full rounded-lg border px-2 py-1.5" /></label><label className="text-xs">Monto<input type="number" min="0" step="0.01" value={creditNoteItems[item.id]?.monto || ""} onChange={(e) => setCreditNoteItems((v) => ({ ...v, [item.id]: { cantidad: v[item.id]?.cantidad || "", monto: e.target.value } }))} className="mt-1 w-full rounded-lg border px-2 py-1.5" /></label></div>)}</div>}
              <label className="text-sm font-semibold">XML de nota de crédito<input type="file" accept=".xml,text/xml" onChange={(e) => setCreditNoteXml(e.target.files?.[0] || null)} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" /></label>
              <label className="text-sm font-semibold">PDF <span className="font-normal text-slate-500">(opcional)</span><input type="file" accept=".pdf,application/pdf" onChange={(e) => setCreditNotePdf(e.target.files?.[0] || null)} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" /></label>
              <label className="sm:col-span-2 text-sm font-semibold">Justificación<textarea value={creditNoteForm.motivo} onChange={(e) => setCreditNoteForm((f) => ({ ...f, motivo: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border px-3 py-2.5 font-normal" /></label>
              {creditNoteTarget.tipo_operacion === "venta" && <label className="sm:col-span-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><input type="checkbox" checked={creditNoteForm.devolucion_fisica_confirmada} onChange={(e) => setCreditNoteForm((f) => ({ ...f, devolucion_fisica_confirmada: e.target.checked }))} className="mt-1" /><span>Confirmo la devolución física cuando los productos ya fueron entregados. El sistema la exigirá solo si corresponde.</span></label>}
            </div>
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => setCreditNoteTarget(null)} className="rounded-xl border px-4 py-2.5">Cancelar</button><button onClick={saveCreditNote} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />}Registrar nota</button></div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{detail.serie}-{detail.numero}</h2>
              <button onClick={() => setDetail(null)}><XCircle /></button>
            </div>
            <div className="space-y-2">
              {detail.archivo_url && <a href={detail.archivo_url} target="_blank" rel="noreferrer" className="mb-3 inline-flex rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">Ver PDF adjunto</a>}
              {(detail.items || []).map((item) => (
                <div key={item.id} className="rounded-xl border p-3 text-sm">
                  <p className="font-semibold">{item.descripcion}</p>
                  <p className="text-slate-500">Cantidad: {item.cantidad} | Total: {money(item.total, detail.moneda?.simbolo || "S/")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
