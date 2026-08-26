import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Upload,
  RefreshCw,
} from "lucide-react";

import {
  getActiveClientesSearchCached,
  type Cliente,
} from "../../services/cliente.service";
import {
  createLicencia,
  confirmLicenciasImport,
  deleteLicencia,
  deleteLicenciaDocumento,
  getAllLicencias,
  previewLicenciasImport,
  renovarLicencia,
  updateLicencia,
  uploadLicenciaDocumentos,
  type LicenciaApi,
  type LicenciaDocumentoApi,
  type LicenciaImportPreview,
  type LicenciaImportRow,
  type LicenciaPayload,
} from "../../services/licencia.service";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { exportExcelFile } from "../../utils/exportExcel";

interface Licencia {
  id: number;
  cliente_id?: number | null;
  empresa: string;
  producto: string;
  cantidad: number;
  precioSinIgv: number | null;
  monedaId: number | null;
  monedaCodigo: string;
  monedaSimbolo: string;
  suscripcionMeses: number;
  correoLicencia: string;
  fechaInicio: string;
  fechaRenovacion: string;
  renovacionProgramada: boolean;
  renovacionModo: "ANUAL" | "MENSUAL" | null;
  renovacionMeses: number | null;
  renovacionProgramadaPara: string | null;
  estado: "VIGENTE" | "POR VENCER" | "VENCIDO";
  alertasCount: number;
  ultimaAlerta: string | null;
  documentos: LicenciaDocumentoApi[];
  alertas: {
    id: number;
    diasAntes: number;
    correoDestino: string;
    correoCopia: string;
    sentAt: string | null;
  }[];
}

export default function Licencias() {
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadingLicencias, setLoadingLicencias] = useState(false);
  const [savingLicencia, setSavingLicencia] = useState(false);
  const [documentModal, setDocumentModal] = useState<Licencia | null>(null);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<LicenciaImportRow[]>([]);
  const [importPreview, setImportPreview] = useState<LicenciaImportPreview | null>(null);

  const [search, setSearch] = useState("");
  const [filterSus, setFilterSus] = useState("TODOS");
  const [filterEstado, setFilterEstado] = useState("TODOS");

  const [openModal, setOpenModal] = useState(false);
  const [viewModal, setViewModal] = useState<Licencia | null>(null);
  const [renewModal, setRenewModal] = useState<Licencia | null>(null);
  const [renewMode, setRenewMode] = useState<"ANUAL" | "MENSUAL">("ANUAL");
  const [renewMonths, setRenewMonths] = useState("1");
  const [renewing, setRenewing] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const debouncedClienteSearch = useDebouncedValue(clienteSearch, 300);

  const [form, setForm] = useState({
    cliente_id: "",
    empresa: "",
    producto: "",
    cantidad: "",
    precioSinIgv: "",
    monedaId: "1",
    suscripcionMeses: "12",
    correoLicencia: "",
    fechaInicio: "",
    fechaRenovacion: "",
  });

  const mapLicencia = (licencia: LicenciaApi): Licencia => ({
    id: licencia.id,
    cliente_id: licencia.cliente_id ?? null,
    empresa: licencia.empresa,
    producto: licencia.producto,
    cantidad: Number(licencia.cantidad || 0),
    precioSinIgv: licencia.precio_sin_igv === null || licencia.precio_sin_igv === undefined
      ? null
      : Number(licencia.precio_sin_igv),
    monedaId: licencia.moneda_id ?? null,
    monedaCodigo: licencia.moneda?.codigo || "",
    monedaSimbolo: licencia.moneda?.simbolo || (Number(licencia.moneda_id) === 2 ? "$" : "S/"),
    suscripcionMeses: Number(licencia.suscripcion_meses || 0),
    correoLicencia: licencia.correo_licencia || "",
    fechaInicio: licencia.fecha_inicio,
    fechaRenovacion: licencia.fecha_renovacion,
    renovacionProgramada: Boolean(licencia.renovacion_programada),
    renovacionModo: licencia.renovacion_modo || null,
    renovacionMeses: licencia.renovacion_meses ?? null,
    renovacionProgramadaPara: licencia.renovacion_programada_para || null,
    estado: getEstado(licencia.fecha_renovacion),
    alertasCount: Number(licencia.alertas_enviadas_count || 0),
    ultimaAlerta: licencia.alertas_enviadas_max_sent_at || null,
    documentos: licencia.documentos || [],
    alertas: (licencia.alertas_enviadas || []).map((alerta) => ({
      id: alerta.id,
      diasAntes: Number(alerta.dias_antes),
      correoDestino: alerta.correo_destino || "",
      correoCopia: alerta.correo_copia || "",
      sentAt: alerta.sent_at || alerta.created_at || null,
    })),
  });

  const daysInMonth = (year: number, monthIndex: number) =>
    new Date(year, monthIndex + 1, 0).getDate();

  const addMonthsNoOverflow = (date: Date, months: number) => {
    const targetMonthIndex = date.getMonth() + months;
    const targetYear = date.getFullYear() + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
    const targetDay = Math.min(date.getDate(), daysInMonth(targetYear, normalizedMonth));

    return new Date(targetYear, normalizedMonth, targetDay);
  };

  const calculateFechaRenovacion = (fechaInicio: string, mesesValue: string) => {
    const meses = Number(mesesValue);

    if (!fechaInicio || !Number.isFinite(meses) || meses <= 0) {
      return "";
    }

    const [year, month, day] = fechaInicio.split("-").map(Number);
    const fecha = addMonthsNoOverflow(new Date(year, month - 1, day), meses);
    fecha.setDate(fecha.getDate() - 1);

    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const dd = String(fecha.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;

    let newForm = { ...form, [name]: value };

    if (name === "fechaInicio" || name === "suscripcionMeses") {
      newForm.fechaRenovacion = calculateFechaRenovacion(
        name === "fechaInicio" ? value : form.fechaInicio,
        name === "suscripcionMeses" ? value : form.suscripcionMeses
      );
    }

    setForm(newForm);
  };

  useEffect(() => {
    if (!openModal || !showClienteDropdown) return;

    let cancelled = false;

    const fetchClientes = async () => {
      try {
        setClientesLoading(true);
        const data = await getActiveClientesSearchCached(debouncedClienteSearch);

        if (!cancelled) {
          setClientes(data);
        }
      } catch (error) {
        console.error("Error al buscar clientes:", error);
        if (!cancelled) setClientes([]);
      } finally {
        if (!cancelled) setClientesLoading(false);
      }
    };

    void fetchClientes();

    return () => {
      cancelled = true;
    };
  }, [debouncedClienteSearch, openModal, showClienteDropdown]);

  const handleClienteSelect = (cliente: Cliente) => {
    setForm((currentForm) => ({
      ...currentForm,
      cliente_id: String(cliente.id),
      empresa: cliente.nombre,
      correoLicencia: currentForm.correoLicencia || cliente.correo || "",
    }));
    setClienteSearch(cliente.nombre);
    setShowClienteDropdown(false);
  };

  const diasRestantes = (fecha: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    return Math.ceil((vencimiento.getTime() - hoy.getTime()) / 86400000);
  };

  const getEstado = (fecha: string): Licencia["estado"] => {
    const dias = diasRestantes(fecha);
    if (dias < 0) return "VENCIDO";
    if (dias <= 30) return "POR VENCER";
    return "VIGENTE";
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseDateOnly = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDateOnly = (date: Date | null) => {
    if (!date || Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatPrecioLicencia = (licencia: Licencia) => {
    if (licencia.precioSinIgv === null || Number.isNaN(licencia.precioSinIgv)) {
      return "-";
    }

    return `${licencia.monedaSimbolo || ""} ${Number(licencia.precioSinIgv).toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const alertDaysFor = (suscripcionMeses: number) =>
    suscripcionMeses >= 12 ? [90, 60, 30, 15, 3, 2, 1, 0] : [7, 4, 3, 2, 1, 0];

  const alertLegendText = (suscripcionMeses: number) =>
    suscripcionMeses >= 12
      ? "Periodo anual: se enviará faltando 90, 60, 30, 15, 3, 2, 1 día y el mismo día del vencimiento."
      : "Periodo menor a 12 meses: se enviará faltando 7, 4, 3, 2, 1 día y el mismo día del vencimiento.";

  const getNextAlert = (licencia: Licencia) => {
    const vencimiento = parseDateOnly(licencia.fechaRenovacion);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(vencimiento.getTime()) || vencimiento < today) {
      return null;
    }

    const sentDays = new Set(licencia.alertas.map((alerta) => alerta.diasAntes));

    for (const daysBefore of alertDaysFor(licencia.suscripcionMeses)) {
      const alertDate = new Date(vencimiento);
      alertDate.setDate(alertDate.getDate() - daysBefore);

      if (alertDate >= today && !sentDays.has(daysBefore)) {
        return {
          date: alertDate,
          daysBefore,
        };
      }
    }

    return null;
  };

  const loadLicencias = async () => {
    try {
      setLoadingLicencias(true);
      const data = await getAllLicencias();
      setLicencias(data.map(mapLicencia));
    } catch (error) {
      console.error("Error al cargar licencias:", error);
      alert("No se pudieron cargar las licencias.");
    } finally {
      setLoadingLicencias(false);
    }
  };

  useEffect(() => {
    void loadLicencias();
  }, []);

  const handleGuardar = async () => {
    const payload: LicenciaPayload = {
      cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
      empresa: form.empresa,
      producto: form.producto,
      cantidad: Number(form.cantidad),
      precio_sin_igv: form.precioSinIgv ? Number(form.precioSinIgv) : null,
      moneda_id: form.precioSinIgv ? Number(form.monedaId || 1) : null,
      suscripcion_meses: Number(form.suscripcionMeses),
      correo_licencia: form.correoLicencia.trim() || null,
      fecha_inicio: form.fechaInicio,
    };

    try {
      setSavingLicencia(true);
      const saved = editingId
        ? await updateLicencia(editingId, payload)
        : await createLicencia(payload);
      const mapped = mapLicencia(saved);

      if (editingId) {
        setLicencias((current) =>
          current.map((licencia) =>
            licencia.id === editingId ? mapped : licencia
          )
        );
        setEditingId(null);
      } else {
        setLicencias((current) => [mapped, ...current]);
      }

      setOpenModal(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar licencia:", error);
      alert("No se pudo guardar la licencia. Revisa los datos ingresados.");
    } finally {
      setSavingLicencia(false);
    }
  };

  const handleEditar = (licencia: Licencia) => {
    setForm({
      cliente_id: licencia.cliente_id ? String(licencia.cliente_id) : "",
      empresa: licencia.empresa,
      producto: licencia.producto,
      cantidad: licencia.cantidad.toString(),
      precioSinIgv: licencia.precioSinIgv === null ? "" : String(licencia.precioSinIgv),
      monedaId: String(licencia.monedaId || 1),
      suscripcionMeses: String(licencia.suscripcionMeses),
      correoLicencia: licencia.correoLicencia,
      fechaInicio: licencia.fechaInicio,
      fechaRenovacion: licencia.fechaRenovacion,
    });
    setClienteSearch(licencia.empresa);
    setEditingId(licencia.id);
    setOpenModal(true);
  };

  const handleEliminar = async (id: number) => {
    try {
      await deleteLicencia(id);
      setLicencias((current) => current.filter(l => l.id !== id));
    } catch (error) {
      console.error("Error al eliminar licencia:", error);
      alert("No se pudo eliminar la licencia.");
    }
  };

  const resetForm = () => {
    setForm({
      cliente_id: "",
      empresa: "",
      producto: "",
      cantidad: "",
      precioSinIgv: "",
      monedaId: "1",
      suscripcionMeses: "12",
      correoLicencia: "",
      fechaInicio: "",
      fechaRenovacion: "",
    });
    setClienteSearch("");
    setShowClienteDropdown(false);
  };

  const updateLicenciaEnLista = (licencia: LicenciaApi) => {
    const mapped = mapLicencia(licencia);
    setLicencias((current) =>
      current.map((item) => (item.id === mapped.id ? mapped : item))
    );
    setDocumentModal((current) => (current?.id === mapped.id ? mapped : current));
    setViewModal((current) => (current?.id === mapped.id ? mapped : current));
  };

  const openRenewModal = (licencia: Licencia) => {
    setRenewModal(licencia);
    setRenewMode("ANUAL");
    setRenewMonths("1");
  };

  const handleRenovar = async () => {
    if (!renewModal) return;

    const meses = renewMode === "MENSUAL" ? Number(renewMonths) : null;
    if (renewMode === "MENSUAL" && (!Number.isFinite(meses) || Number(meses) <= 0)) {
      alert("Ingresa una cantidad de meses valida.");
      return;
    }

    try {
      setRenewing(true);
      const result = await renovarLicencia(renewModal.id, {
        modo: renewMode,
        meses: renewMode === "MENSUAL" ? Number(meses) : null,
      });

      updateLicenciaEnLista(result.licencia);
      setRenewModal(null);
      alert(result.message || "Renovacion procesada correctamente.");
    } catch (error) {
      console.error("Error al renovar licencia:", error);
      alert("No se pudo renovar la licencia.");
    } finally {
      setRenewing(false);
    }
  };

  const handleUploadDocumentos = async (files: FileList | null) => {
    if (!documentModal || !files || files.length === 0) return;

    const pdfs = Array.from(files).filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length !== files.length) {
      alert("Solo se permiten archivos PDF.");
      return;
    }

    try {
      setUploadingDocuments(true);
      const updated = await uploadLicenciaDocumentos(documentModal.id, pdfs);
      updateLicenciaEnLista(updated);
    } catch (error) {
      console.error("Error al subir documentos:", error);
      alert("No se pudieron subir los PDFs referenciales.");
    } finally {
      setUploadingDocuments(false);
    }
  };

  const handleDeleteDocumento = async (documentoId: number) => {
    if (!documentModal) return;

    try {
      setDeletingDocumentId(documentoId);
      const updated = await deleteLicenciaDocumento(documentModal.id, documentoId);
      updateLicenciaEnLista(updated);
    } catch (error) {
      console.error("Error al eliminar documento:", error);
      alert("No se pudo eliminar el PDF.");
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const normalizeHeader = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const headerMap: Record<string, keyof LicenciaImportRow> = {
    cliente_id: "cliente_id",
    id_cliente: "cliente_id",
    empresa: "empresa",
    nombre_empresa: "empresa",
    nombre_de_empresa: "empresa",
    cliente: "empresa",
    producto: "producto",
    licencia: "producto",
    producto_licencia: "producto",
    cantidad: "cantidad",
    cantidad_licencias: "cantidad",
    cantidad_de_licencias: "cantidad",
    suscripcion_meses: "suscripcion_meses",
    suscripcion_en_meses: "suscripcion_meses",
    meses: "suscripcion_meses",
    correo_licencia: "correo_licencia",
    correo_para_alertas: "correo_licencia",
    correo_alertas: "correo_licencia",
    correo: "correo_licencia",
    fecha_inicio: "fecha_inicio",
    inicio: "fecha_inicio",
  };

  const formatExcelDate = (value: unknown): string => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }

    if (typeof value === "number") {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      excelEpoch.setUTCDate(excelEpoch.getUTCDate() + Math.floor(value));
      return excelEpoch.toISOString().slice(0, 10);
    }

    return String(value ?? "").trim();
  };

  const cellToText = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return formatExcelDate(value);
    if (typeof value === "object") {
      const maybeRichText = value as { text?: string; result?: unknown; hyperlink?: string; richText?: { text: string }[] };
      if (maybeRichText.text) return maybeRichText.text;
      if (maybeRichText.result !== undefined) return String(maybeRichText.result);
      if (maybeRichText.richText) return maybeRichText.richText.map((part) => part.text).join("");
      if (maybeRichText.hyperlink) return maybeRichText.hyperlink;
    }

    return String(value).trim();
  };

  const parseLicenciasExcel = async (file: File): Promise<LicenciaImportRow[]> => {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("El archivo no tiene hojas para importar.");
    }

    let headerRowNumber = 0;
    const columns: Array<keyof LicenciaImportRow | null> = [];
    const requiredColumns: Array<keyof LicenciaImportRow> = [
      "empresa",
      "producto",
      "cantidad",
      "suscripcion_meses",
      "correo_licencia",
      "fecha_inicio",
    ];

    const maxHeaderSearchRows = Math.min(10, worksheet.rowCount);

    for (let rowNumber = 1; rowNumber <= maxHeaderSearchRows; rowNumber += 1) {
      const candidateColumns: Array<keyof LicenciaImportRow | null> = [];
      const row = worksheet.getRow(rowNumber);

      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        const normalized = normalizeHeader(cellToText(cell.value));
        candidateColumns[columnNumber] = headerMap[normalized] ?? null;
      });

      const matchedRequired = requiredColumns.filter((column) => candidateColumns.includes(column));

      if (matchedRequired.length >= 4) {
        headerRowNumber = rowNumber;
        candidateColumns.forEach((column, index) => {
          columns[index] = column;
        });
        break;
      }
    }

    if (headerRowNumber === 0) {
      throw new Error(
        `No se encontró una fila de encabezados válida. Usa columnas: ${requiredColumns.join(", ")}.`
      );
    }

    const missing = requiredColumns.filter((column) => !columns.includes(column));

    if (missing.length > 0) {
      throw new Error(`Faltan columnas obligatorias: ${missing.join(", ")}.`);
    }

    const rows: LicenciaImportRow[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return;

      const item: LicenciaImportRow = {};
      let hasValue = false;

      columns.forEach((key, columnNumber) => {
        if (!key) return;
        const rawValue = row.getCell(columnNumber).value;
        const value = key === "fecha_inicio" ? formatExcelDate(rawValue) : cellToText(rawValue);

        if (String(value).trim() !== "") {
          hasValue = true;
        }

        (item as Record<string, string>)[key] = value;
      });

      if (hasValue) rows.push(item);
    });

    if (rows.length === 0) {
      throw new Error("No se encontraron filas con datos para importar.");
    }

    return rows;
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      alert("Sube un archivo Excel en formato .xlsx.");
      return;
    }

    try {
      setImportingExcel(true);
      setImportFileName(file.name);
      const rows = await parseLicenciasExcel(file);
      const preview = await previewLicenciasImport(rows);
      setImportRows(rows);
      setImportPreview(preview);
    } catch (error) {
      console.error("Error al previsualizar importacion:", error);
      alert(error instanceof Error ? error.message : "No se pudo leer o validar el archivo Excel.");
      setImportRows([]);
      setImportPreview(null);
    } finally {
      setImportingExcel(false);
    }
  };

  const resetImport = () => {
    setImportFileName("");
    setImportRows([]);
    setImportPreview(null);
  };

  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.summary.invalid > 0) return;

    try {
      setConfirmingImport(true);
      await confirmLicenciasImport(importPreview.rows.filter((row) => row.valid).map((row) => row.data));
      await loadLicencias();
      setImportModalOpen(false);
      resetImport();
      alert("Licencias importadas correctamente.");
    } catch (error) {
      console.error("Error al importar licencias:", error);
      alert("No se pudo confirmar la importación. Revisa la previsualización.");
    } finally {
      setConfirmingImport(false);
    }
  };

  const exportToExcel = async () => {
    const data = filtradas.length > 0 ? filtradas : licencias;

    try {
      setExportingExcel(true);
      await exportExcelFile({
        filename: `licencias_${new Date().toISOString().split("T")[0]}.xlsx`,
        title: "LICENCIAS",
        columns: [
          { header: "Empresa", key: "empresa", width: 34 },
          { header: "Producto", key: "producto", width: 28 },
          { header: "Cantidad", key: "cantidad", width: 12 },
          { header: "Precio sin IGV", key: "precioSinIgv", width: 18 },
          { header: "Moneda", key: "moneda", width: 12 },
          { header: "Suscripcion meses", key: "suscripcionMeses", width: 20 },
          { header: "Correo licencia", key: "correoLicencia", width: 32 },
          { header: "Fecha inicio", key: "fechaInicio", width: 16 },
          { header: "Fecha renovacion", key: "fechaRenovacion", width: 18 },
          { header: "Estado", key: "estado", width: 16 },
        ],
        rows: data.map((licencia) => ({
          empresa: licencia.empresa,
          producto: licencia.producto,
          cantidad: licencia.cantidad,
          precioSinIgv: licencia.precioSinIgv ?? "",
          moneda: licencia.monedaCodigo || licencia.monedaSimbolo || "",
          suscripcionMeses: licencia.suscripcionMeses,
          correoLicencia: licencia.correoLicencia,
          fechaInicio: licencia.fechaInicio,
          fechaRenovacion: licencia.fechaRenovacion,
          estado: licencia.estado,
        })),
      });
    } catch (error) {
      console.error("Error al exportar licencias:", error);
      alert("No se pudo descargar el Excel de licencias.");
    } finally {
      setExportingExcel(false);
    }
  };

  const confirmDelete = (id: number) => {
    if (confirm('Â¿EstÃ¡s seguro de eliminar esta licencia?')) {
      void handleEliminar(id);
    }
  };

  const filtradas = licencias.filter((l) => {
    const matchSearch =
      `${l.empresa} ${l.producto}`.toLowerCase().includes(search.toLowerCase());

    return (
      matchSearch &&
      (filterSus === "TODOS" || String(l.suscripcionMeses) === filterSus) &&
      (filterEstado === "TODOS" || l.estado === filterEstado)
    );
  });

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Licencias</h1>
          <p className="text-sm text-gray-500">Control de renovaciones y vencimientos</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
          >
            <Upload size={16} /> Importar Excel
          </button>
          <button
            onClick={() => void exportToExcel()}
            disabled={exportingExcel}
            className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            <Download size={16} /> {exportingExcel ? "Descargando..." : "Excel"}
          </button>
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setOpenModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={16} /> Nueva Licencia
          </button>
        </div>
      </div>

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Importar licencias desde Excel</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Usa columnas: empresa, producto, cantidad, suscripcion_meses, correo_licencia y fecha_inicio.
                </p>
              </div>
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  resetImport();
                }}
                className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-6">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-6 py-8 text-center transition hover:bg-blue-50">
                <Upload className="mb-3 text-blue-600" size={28} />
                <span className="font-semibold text-blue-800">
                  {importFileName || "Seleccionar archivo .xlsx"}
                </span>
                <span className="mt-1 text-sm text-blue-600">
                  El sistema validará el archivo antes de guardar.
                </span>
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)}
                  disabled={importingExcel || confirmingImport}
                />
              </label>

              {importingExcel && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                  Leyendo y validando archivo...
                </div>
              )}

              {importPreview && (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">Filas</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">{importPreview.summary.total}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase text-emerald-700">Válidas</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-800">{importPreview.summary.valid}</p>
                    </div>
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                      <p className="text-xs font-semibold uppercase text-red-700">Errores</p>
                      <p className="mt-1 text-2xl font-bold text-red-800">{importPreview.summary.invalid}</p>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-xs font-semibold uppercase text-amber-700">Advertencias</p>
                      <p className="mt-1 text-2xl font-bold text-amber-800">{importPreview.summary.warnings}</p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-gray-200">
                    <div className="max-h-[360px] overflow-auto">
                      <table className="min-w-[920px] w-full text-sm">
                        <thead className="sticky top-0 bg-gray-100">
                          <tr>
                            <th className="p-3 text-left font-semibold">Fila</th>
                            <th className="p-3 text-left font-semibold">Empresa</th>
                            <th className="p-3 text-left font-semibold">Producto</th>
                            <th className="p-3 text-left font-semibold">Cantidad</th>
                            <th className="p-3 text-left font-semibold">Periodo</th>
                            <th className="p-3 text-left font-semibold">Inicio</th>
                            <th className="p-3 text-left font-semibold">Renovación</th>
                            <th className="p-3 text-left font-semibold">Estado</th>
                            <th className="p-3 text-left font-semibold">Observaciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.rows.map((row) => (
                            <tr key={row.row} className="border-t align-top">
                              <td className="p-3 font-semibold">{row.row}</td>
                              <td className="p-3">{row.data.empresa || "-"}</td>
                              <td className="p-3">{row.data.producto || "-"}</td>
                              <td className="p-3">{row.data.cantidad ?? "-"}</td>
                              <td className="p-3">
                                {row.data.suscripcion_meses ? `${row.data.suscripcion_meses} meses` : "-"}
                              </td>
                              <td className="p-3">{row.data.fecha_inicio || "-"}</td>
                              <td className="p-3">{row.data.fecha_renovacion || "-"}</td>
                              <td className="p-3">
                                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  row.valid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                                }`}>
                                  {row.valid ? "Válida" : "Error"}
                                </span>
                              </td>
                              <td className="max-w-[280px] p-3">
                                {row.errors.length > 0 && (
                                  <div className="space-y-1 text-xs text-red-700">
                                    {row.errors.map((error) => (
                                      <p key={error}>• {error}</p>
                                    ))}
                                  </div>
                                )}
                                {row.warnings.length > 0 && (
                                  <div className="mt-1 space-y-1 text-xs text-amber-700">
                                    {row.warnings.map((warning) => (
                                      <p key={warning}>• {warning}</p>
                                    ))}
                                  </div>
                                )}
                                {row.errors.length === 0 && row.warnings.length === 0 && (
                                  <span className="text-xs text-gray-400">Sin observaciones</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetImport}
                disabled={importingExcel || confirmingImport || !importPreview}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={!importPreview || importPreview.summary.invalid > 0 || confirmingImport || importingExcel || importRows.length === 0}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirmingImport ? "Importando..." : "Confirmar importación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-800 shadow-sm">
          <div className="flex justify-between">
            <XCircle />
            <span>Vencidas</span>
          </div>
          <h2 className="text-3xl font-bold mt-2">
            {licencias.filter(l => l.estado === "VENCIDO").length}
          </h2>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-amber-800 shadow-sm">
          <div className="flex justify-between">
            <AlertCircle />
            <span>Por vencer</span>
          </div>
          <h2 className="text-3xl font-bold mt-2">
            {licencias.filter(l => l.estado === "POR VENCER").length}
          </h2>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-800 shadow-sm">
          <div className="flex justify-between">
            <CheckCircle2 />
            <span>Vigentes</span>
          </div>
          <h2 className="text-3xl font-bold mt-2">
            {licencias.filter(l => l.estado === "VIGENTE").length}
          </h2>
        </div>

      </div>

      {/* FILTERS */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row">

        <select 
          value={filterSus}
          onChange={(e) => setFilterSus(e.target.value)} 
          className="rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option>TODOS</option>
          <option value="12">12 meses</option>
          <option value="6">6 meses</option>
          <option value="3">3 meses</option>
          <option value="1">1 mes</option>
        </select>

        <select 
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)} 
          className="rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option>TODOS</option>
          <option>VIGENTE</option>
          <option>POR VENCER</option>
          <option>VENCIDO</option>
        </select>

        <div className="flex w-full items-center gap-2 rounded-xl border border-gray-200 p-2.5 focus-within:ring-2 focus-within:ring-blue-500">
          <Search size={16} />
          <input
            className="w-full outline-none"
            placeholder="Buscar empresa o producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="min-w-[1340px] w-full text-sm">

          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left font-semibold">Empresa</th>
              <th className="p-3 text-left font-semibold">Producto</th>
              <th className="p-3 text-left font-semibold">Cantidad</th>
              <th className="p-3 text-left font-semibold">Precio (sin IGV)</th>
              <th className="p-3 text-left font-semibold">Suscripción</th>
              <th className="p-3 text-left font-semibold">Correo licencia</th>
              <th className="p-3 text-left font-semibold">Fecha inicio</th>
              <th className="p-3 text-left font-semibold">Fecha renovación</th>
              <th className="p-3 text-left font-semibold">Estado</th>
              <th className="p-3 text-left font-semibold">Alertas</th>
              <th className="sticky right-0 z-10 bg-gray-100 p-3 text-left font-semibold shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loadingLicencias ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-gray-500">
                  Cargando licencias...
                </td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-gray-500">
                  No hay licencias que mostrar
                </td>
              </tr>
            ) : (
              filtradas.map((l) => {
                const nextAlert = getNextAlert(l);

                return (
              <tr key={l.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-medium">{l.empresa}</td>
                  <td className="p-3">{l.producto}</td>
                  <td className="sticky right-0 z-10 bg-white p-3 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {Number(l.cantidad || 0).toLocaleString()} licencia{Number(l.cantidad || 0) === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-gray-700">{formatPrecioLicencia(l)}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {l.suscripcionMeses} meses
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">{l.correoLicencia || "-"}</td>
                  <td className="p-3 text-gray-600">{l.fechaInicio}</td>
                  <td className="p-3 text-gray-600">{l.fechaRenovacion}</td>

                  <td className="p-3">
                    <div className="space-y-1 max-w-[100px]">
                      <span className={`px-2 py-1 text-xs rounded block w-full text-center font-medium ${
                        l.estado === 'VIGENTE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        l.estado === 'POR VENCER' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {l.estado}
                      </span>
                      <span className={`text-xs font-bold text-center block ${
                        l.estado === 'VENCIDO' ? 'text-red-600' :
                        l.estado === 'POR VENCER' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {diasRestantes(l.fechaRenovacion) >= 0 
                          ? `${diasRestantes(l.fechaRenovacion)} días` 
                          : 'Vencido'
                        }
                      </span>
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="min-w-[120px] space-y-1">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        l.alertasCount > 0
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-gray-50 text-gray-500 border border-gray-100"
                      }`}>
                        {l.alertasCount} enviada{l.alertasCount === 1 ? "" : "s"}
                      </span>
                      <p className="text-xs text-gray-500">
                        Última: {formatDateTime(l.ultimaAlerta)}
                      </p>
                      <p className="text-xs font-medium text-blue-700">
                        Próxima: {nextAlert ? formatDateOnly(nextAlert.date) : "Sin pendiente"}
                      </p>
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="flex gap-1 whitespace-nowrap">
                    <button
                      onClick={() => setViewModal(l)}
                      className="bg-gray-100 p-2 rounded hover:bg-gray-200 transition-colors"
                      title="Ver detalle"
                    >
                      <Eye size={14} />
                    </button>

                    <button 
                      onClick={() => handleEditar(l)}
                      className="rounded-lg bg-blue-50 p-2 text-blue-700 transition-colors hover:bg-blue-100"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>

                    <button 
                      onClick={() => confirmDelete(l.id)}
                      className="rounded-lg bg-red-50 p-2 text-red-700 transition-colors hover:bg-red-100"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>

                    <button
                      onClick={() => setDocumentModal(l)}
                      className="relative rounded-lg bg-violet-50 p-2 text-violet-700 transition-colors hover:bg-violet-100"
                      title="Subir/ver PDFs referenciales"
                    >
                      <Upload size={14} />
                      {l.documentos.length > 0 && (
                        <span className="absolute -right-1 -top-1 rounded-full bg-violet-600 px-1.5 text-[10px] font-bold text-white">
                          {l.documentos.length}
                        </span>
                      )}
                    </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>

        </table>
        </div>
      </div>

      {/* MODAL NUEVA/EDITAR LICENCIA */}
      {openModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Editar Licencia' : 'Nueva Licencia'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Registra el cliente, producto y vigencia para controlar renovaciones.
              </p>
            </div>

            <div className="space-y-6 overflow-y-auto p-6">

              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <div className="relative">
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Nombre de empresa
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-gray-300 p-3 focus-within:border-transparent focus-within:ring-2 focus-within:ring-blue-500">
                  <Search size={16} className="text-gray-400" />
                  <input
                    placeholder="Buscar cliente..."
                    className="w-full outline-none"
                    value={clienteSearch || form.empresa}
                    onChange={(event) => {
                      setClienteSearch(event.target.value);
                      setForm((currentForm) => ({
                        ...currentForm,
                        cliente_id: "",
                        empresa: event.target.value,
                      }));
                      setShowClienteDropdown(true);
                    }}
                    onFocus={() => setShowClienteDropdown(true)}
                  />
                </div>

                {showClienteDropdown && (
                  <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                    {clientesLoading ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        Buscando clientes...
                      </div>
                    ) : clientes.length > 0 ? (
                      clientes.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() => handleClienteSelect(cliente)}
                          className="w-full px-4 py-3 text-left text-sm transition hover:bg-blue-50"
                        >
                          <span className="block font-semibold text-gray-800">
                            {cliente.nombre}
                          </span>
                          <span className="block text-xs text-gray-500">
                            RUC {cliente.ruc || "-"} - {cliente.correo || "Sin correo"}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No se encontraron clientes
                      </div>
                    )}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Busca entre los clientes activos registrados en el sistema.
                </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Producto o licencia
                  </label>
                  <input
                    name="producto"
                    placeholder="Ej. Microsoft 365 Business Standard"
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    value={form.producto}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Cantidad de licencias
                  </label>
                  <input
                    name="cantidad"
                    placeholder="Ej. 10"
                    type="number"
                    min="1"
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    value={form.cantidad}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Precio (sin IGV)
                  </label>
                  <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
                    <select
                      name="monedaId"
                      className="rounded-lg border border-gray-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      value={form.monedaId}
                      onChange={handleChange}
                    >
                      <option value="1">S/</option>
                      <option value="2">$</option>
                    </select>
                    <input
                      name="precioSinIgv"
                      placeholder="0.00"
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      value={form.precioSinIgv}
                      onChange={handleChange}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Dato referencial. No altera cálculos ni alertas.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Suscripción en meses
                  </label>
                  <input
                    name="suscripcionMeses"
                    placeholder="Ej. 12"
                    type="number"
                    min="1"
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    value={form.suscripcionMeses}
                    onChange={handleChange}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Correo para alertas de licencia
                  </label>
                  <input
                    name="correoLicencia"
                    placeholder="licencias@cliente.com"
                    type="email"
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    value={form.correoLicencia}
                    onChange={handleChange}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Puedes usar un correo distinto al correo principal del cliente.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      name="fechaInicio"
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      value={form.fechaInicio}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Fecha Renovación
                    </label>
                    <input
                      type="date"
                      value={form.fechaRenovacion}
                      className="w-full cursor-not-allowed rounded-lg border border-blue-100 bg-white p-3 text-gray-600"
                      readOnly
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-blue-700">
                  La fecha de renovación se calcula automáticamente con la suscripción indicada.
                </p>
              </div>

            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
              <button 
                onClick={() => {
                  setOpenModal(false);
                  setEditingId(null);
                  resetForm();
                }} 
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancelar
              </button>

              <button 
                onClick={handleGuardar} 
                disabled={savingLicencia || !form.empresa || !form.producto || !form.cantidad || !form.suscripcionMeses || !form.fechaInicio || !form.fechaRenovacion}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {savingLicencia ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden">

            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold">Detalle de Licencia</h2>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50 w-1/3">Empresa</td>
                    <td className="p-3">{viewModal.empresa}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Producto</td>
                    <td className="p-3">{viewModal.producto}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Cantidad</td>
                    <td className="p-3 font-bold text-lg">{viewModal.cantidad}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Precio (sin IGV)</td>
                    <td className="p-3 font-bold">{formatPrecioLicencia(viewModal)}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Suscripción</td>
                    <td className="p-3">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {viewModal.suscripcionMeses} meses
                      </span>
                    </td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Cotizaciones referenciales</td>
                    <td className="p-3">
                      {viewModal.documentos.length > 0 ? (
                        <div className="space-y-2">
                          {viewModal.documentos.map((documento) => (
                            <a
                              key={documento.id}
                              href={documento.url || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                            >
                              <FileText size={15} />
                              {documento.nombre_original || `PDF #${documento.id}`}
                            </a>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Correo licencia</td>
                    <td className="p-3">{viewModal.correoLicencia || "-"}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Fecha Inicio</td>
                    <td className="p-3">{viewModal.fechaInicio}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Fecha Renovación</td>
                    <td className="p-3 font-bold">{viewModal.fechaRenovacion}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Renovación programada</td>
                    <td className="p-3">
                      {viewModal.renovacionProgramada ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                          {viewModal.renovacionModo} - {viewModal.renovacionMeses} meses desde {viewModal.renovacionProgramadaPara}
                        </span>
                      ) : (
                        <span className="text-gray-500">Sin programación</span>
                      )}
                    </td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Estado</td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <span className={`px-3 py-1 text-sm rounded block w-full text-center font-semibold ${
                          viewModal.estado === 'VIGENTE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          viewModal.estado === 'POR VENCER' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {viewModal.estado}
                        </span>
                        <span className={`text-sm font-bold text-center block pt-1 ${
                          viewModal.estado === 'VENCIDO' ? 'text-red-600' :
                          viewModal.estado === 'POR VENCER' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {diasRestantes(viewModal.fechaRenovacion) >= 0 
                            ? `${diasRestantes(viewModal.fechaRenovacion)} días restantes` 
                            : 'Vencido'
                          }
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {(() => {
                const nextAlert = getNextAlert(viewModal);

                return (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-amber-950">Leyenda de alertas automáticas</h3>
                        <p className="mt-1 text-sm leading-relaxed text-amber-800">
                          {alertLegendText(viewModal.suscripcionMeses)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm shadow-sm sm:min-w-[210px]">
                        <p className="text-xs font-semibold uppercase text-amber-700">Próxima alerta</p>
                        {nextAlert ? (
                          <>
                            <p className="mt-1 font-bold text-amber-950">{formatDateOnly(nextAlert.date)}</p>
                            <p className="text-xs text-amber-700">
                              {nextAlert.daysBefore === 0
                                ? "El mismo día del vencimiento"
                                : `Faltando ${nextAlert.daysBefore} días`}
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 font-semibold text-gray-500">Sin alertas pendientes</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-950">Historial de alertas</h3>
                    <p className="text-xs text-blue-700">
                      Registro visual de correos automáticos enviados para esta licencia.
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                    {viewModal.alertasCount} envío{viewModal.alertasCount === 1 ? "" : "s"}
                  </span>
                </div>

                {viewModal.alertas.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-blue-100 bg-white">
                    <table className="w-full min-w-[620px] text-sm">
                      <thead className="bg-blue-50 text-blue-900">
                        <tr>
                          <th className="p-3 text-left font-semibold">Fecha envío</th>
                          <th className="p-3 text-left font-semibold">Días antes</th>
                          <th className="p-3 text-left font-semibold">Destino</th>
                          <th className="p-3 text-left font-semibold">Copia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewModal.alertas.map((alerta) => (
                          <tr key={alerta.id} className="border-t border-blue-50">
                            <td className="p-3 text-gray-700">{formatDateTime(alerta.sentAt)}</td>
                            <td className="p-3">
                              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                                {alerta.diasAntes === 0 ? "Vencimiento" : `${alerta.diasAntes} días`}
                              </span>
                            </td>
                            <td className="p-3 text-gray-600">{alerta.correoDestino || "-"}</td>
                            <td className="p-3 text-gray-600">{alerta.correoCopia || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-blue-200 bg-white px-4 py-5 text-sm text-gray-500">
                    Todavía no hay alertas automáticas enviadas para esta licencia.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 px-6 py-4 bg-gray-50 sm:flex-row sm:justify-end">
              <button
                onClick={() => openRenewModal(viewModal)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <RefreshCw size={16} />
                RENOVAR
              </button>
              <button
                onClick={() => setViewModal(null)}
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {renewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold">Renovar licencia</h2>
              <p className="mt-1 text-sm text-gray-500">
                {renewModal.empresa} - {renewModal.producto}
              </p>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Modo de suscripción
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["ANUAL", "MENSUAL"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRenewMode(mode)}
                      className={`rounded-lg border px-4 py-3 text-sm font-bold transition ${
                        renewMode === mode
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {renewMode === "MENSUAL" && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Meses renovados
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="240"
                    value={renewMonths}
                    onChange={(event) => setRenewMonths(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Si la licencia aún no vence, la renovación quedará programada para el día siguiente al vencimiento actual.
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setRenewModal(null)}
                className="rounded-lg bg-gray-200 px-5 py-2 font-medium text-gray-800 hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleRenovar()}
                disabled={renewing}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-700 disabled:bg-gray-400"
              >
                <RefreshCw size={16} />
                {renewing ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {documentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Cotizaciones referenciales</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {documentModal.empresa} - {documentModal.producto}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDocumentModal(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                title="Cerrar"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-6">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 px-4 py-8 text-center transition hover:bg-violet-50">
                <Upload className="mb-2 text-violet-700" size={28} />
                <span className="text-sm font-semibold text-violet-800">
                  {uploadingDocuments ? "Subiendo PDFs..." : "Subir PDFs de cotización referencial"}
                </span>
                <span className="mt-1 text-xs text-violet-600">
                  Puedes seleccionar uno o varios archivos PDF.
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  disabled={uploadingDocuments}
                  onChange={(event) => {
                    void handleUploadDocumentos(event.target.files);
                    event.target.value = "";
                  }}
                  className="hidden"
                />
              </label>

              <div className="rounded-2xl border border-gray-200">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h3 className="text-sm font-bold text-gray-800">
                    Documentos subidos ({documentModal.documentos.length})
                  </h3>
                </div>

                {documentModal.documentos.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {documentModal.documentos.map((documento) => (
                      <div key={documento.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {documento.nombre_original || `PDF #${documento.id}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {documento.created_at ? formatDateTime(documento.created_at) : "Sin fecha"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={documento.url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <Eye size={14} />
                            Ver
                          </a>
                          <button
                            type="button"
                            onClick={() => void handleDeleteDocumento(documento.id)}
                            disabled={deletingDocumentId === documento.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            <Trash2 size={14} />
                            {deletingDocumentId === documento.id ? "Eliminando..." : "Eliminar"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    Todavía no hay PDFs referenciales subidos.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


