import { useEffect, useState } from "react";
import { Ban, Eye, FileSearch, Loader2, ReceiptText, Search, Upload, XCircle } from "lucide-react";

import {
  anularComprobante,
  createComprobante,
  generarCuentaPorCobrar,
  generarCuentaPorPagar,
  getComprobante,
  getComprobantes,
  previewXmlComprobante,
  type Comprobante,
} from "../services/contabilidad.service";

const perPageOptions = [5, 10, 25, 50, 100];
const estados = ["todos", "registrado", "anulado"];
const operaciones = ["todos", "compra", "venta"];
const labelize = (value?: string | null) => (value || "-").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
const money = (value: unknown, symbol = "S/") =>
  `${symbol} ${Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Comprobantes() {
  const [rows, setRows] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("todos");
  const [tipoOperacion, setTipoOperacion] = useState("todos");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<Comprobante | null>(null);
  const [xmlPreview, setXmlPreview] = useState<any>(null);

  const fetchRows = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getComprobantes({ page, perPage, search, estado, tipoOperacion });
      setRows(response.data);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch (err: any) {
      setRows([]);
      setError(err?.response?.data?.message || "No se pudieron cargar los comprobantes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchRows, 250);
    return () => window.clearTimeout(timer);
  }, [page, perPage, search, estado, tipoOperacion]);

  const handlePreviewXml = async (file?: File) => {
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      setXmlPreview(await previewXmlComprobante(file));
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
        tipo_comprobante: xmlPreview.tipo_comprobante,
        serie: xmlPreview.serie,
        numero: xmlPreview.numero,
        fecha_emision: xmlPreview.fecha_emision,
        fecha_vencimiento: xmlPreview.fecha_vencimiento,
        emisor_ruc: xmlPreview.emisor_ruc,
        emisor_nombre: xmlPreview.emisor_nombre,
        receptor_ruc: xmlPreview.receptor_ruc,
        receptor_nombre: xmlPreview.receptor_nombre,
        subtotal: xmlPreview.subtotal,
        igv: xmlPreview.igv,
        total: xmlPreview.total,
        moneda_id: xmlPreview.moneda_id || null,
        xml_hash: xmlPreview.xml_hash,
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

  const openDetail = async (row: Comprobante) => setDetail(await getComprobante(row.id));

  const runAction = async (row: Comprobante, action: "anular" | "cxp" | "cxc") => {
    setSaving(true);
    setError("");
    try {
      if (action === "anular") await anularComprobante(row.id);
      if (action === "cxp") await generarCuentaPorPagar(row.id);
      if (action === "cxc") await generarCuentaPorCobrar(row.id);
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
            <p className="text-sm font-semibold uppercase text-blue-700">Contabilidad</p>
            <h1 className="text-2xl font-bold text-slate-900">Comprobantes y XML</h1>
            <p className="text-sm text-slate-500">Registra documentos tributarios sin afectar stock ni cuentas hasta generarlas.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            Preview XML
            <input type="file" accept=".xml,text/xml" className="hidden" onChange={(e) => handlePreviewXml(e.target.files?.[0])} />
          </label>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_150px_150px_120px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar serie, numero, RUC o razon social" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" />
          </div>
          <select value={tipoOperacion} onChange={(e) => { setTipoOperacion(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            {operaciones.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
          </select>
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
                        <button onClick={() => openDetail(row)} title="Ver detalle" className="rounded-lg bg-slate-100 p-2 text-slate-700"><Eye size={16} /></button>
                        {row.tipo_operacion === "compra" && <button onClick={() => runAction(row, "cxp")} title="Generar CxP" className="rounded-lg bg-amber-50 p-2 text-amber-700"><ReceiptText size={16} /></button>}
                        {row.tipo_operacion === "venta" && <button onClick={() => runAction(row, "cxc")} title="Generar CxC" className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><ReceiptText size={16} /></button>}
                        {row.estado !== "anulado" && <button onClick={() => runAction(row, "anular")} title="Anular" className="rounded-lg bg-red-50 p-2 text-red-700"><Ban size={16} /></button>}
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
            </div>
            {xmlPreview.tipo_operacion_sugerida === "observado" && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                El XML no coincide con COMPANY_RUC como emisor ni receptor. Revisar configuracion antes de registrar.
              </div>
            )}
            <button disabled={saving || xmlPreview.duplicado?.existe || xmlPreview.tipo_operacion_sugerida === "observado"} onClick={saveFromPreview} className="mt-4 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Guardar comprobante
            </button>
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
