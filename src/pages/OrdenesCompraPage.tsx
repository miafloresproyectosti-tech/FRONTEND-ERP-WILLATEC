import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FilePlus2,
  FileText,
  Loader2,
  PackageCheck,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Truck,
  Upload,
  X,
} from "lucide-react";

import { useNotifications } from "../NotificationContext";
import {
  createOcEmitida,
  createOcRecibida,
  downloadOcEmitidaPdf,
  getOcEmitida,
  getOcEmitidaItems,
  getOcEmitidaPreview,
  getOcEmitidas,
  getOcRecibida,
  getOcRecibidaPreview,
  getOcRecibidas,
  updateOcRecibidaItems,
  uploadOcEmitidaDocumentos,
  uploadOcRecibidaDocumentos,
  type OcEmitida,
  type OcPreview,
  type OcPreviewItem,
  type OcRecibida,
  type OcRecibidaItem,
} from "../services/ordenCompra.service";
import { getCotizacion } from "../services/cotizacion.service";
import { formatMoney } from "../utils/formatNumber";
import { getPaginationItems } from "../utils/pagination";

type ActiveTab = "emitidas" | "recibidas";
type ModalMode = "emitir" | "recibir" | null;

interface PaginationState {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
}

interface RecibidaDraftItem {
  cotizacion_item_id: number;
  descripcion: string;
  seleccionado: boolean;
  cantidad_recibida: number;
}

interface EmitidaDraftItem {
  cotizacion_item_id: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

const getQuotedQuantity = (item: OcPreviewItem) =>
  toNumber(item.cantidad ?? (item as any).cantidad_cotizada ?? item.cantidad_disponible ?? item.cantidad_pendiente);

const getProveedorPrecio = (item: OcPreviewItem, proveedor?: string) => {
  const selectedProveedor = proveedor?.trim().toLowerCase();
  const proveedorRow = selectedProveedor
    ? item.proveedores?.find((row) => row.nombre.trim().toLowerCase() === selectedProveedor)
    : item.proveedores?.[0];

  return toNumber(proveedorRow?.precio ?? item.precio_unitario ?? item.costo_base);
};

const itemBelongsToProveedor = (item: OcPreviewItem, proveedor: string) => {
  const selectedProveedor = proveedor.trim().toLowerCase();
  if (!selectedProveedor) return true;

  return (
    item.proveedor?.trim().toLowerCase() === selectedProveedor ||
    Boolean(item.proveedores?.some((row) => row.nombre.trim().toLowerCase() === selectedProveedor))
  );
};

const buildEmitidaDraftItems = (items: OcPreviewItem[], proveedor?: string): EmitidaDraftItem[] =>
  items
    .filter((item) => itemBelongsToProveedor(item, proveedor || ""))
    .map((item) => ({
      cotizacion_item_id: item.cotizacion_item_id ?? item.id,
      descripcion: itemDescription(item),
      cantidad: getQuotedQuantity(item),
      precio_unitario: getProveedorPrecio(item, proveedor),
    }));

const perPage = 10;

const emptyPagination: PaginationState = {
  page: 1,
  totalPages: 1,
  total: 0,
  from: 0,
  to: 0,
};

const today = new Date().toISOString().slice(0, 10);

const estadoRecibidaLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  por_entrega: "Por entrega",
  atendido: "Atendido",
};

const estadoEmitidaLabels: Record<string, string> = {
  emitida: "Emitida",
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  atendido: "Atendido",
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }

  if (typeof error === "object" && error !== null && "request" in error) {
    return "No hubo respuesta del servidor. Verifica que el backend este disponible.";
  }

  return fallback;
};

const toNumber = (value: number | string | null | undefined) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toDisplayText = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value || fallback;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return toDisplayText(row.nombre, "") ||
      toDisplayText(row.proveedor, "") ||
      toDisplayText(row.descripcion, "") ||
      toDisplayText(row.producto, "") ||
      toDisplayText(row.name, "") ||
      fallback;
  }

  return fallback;
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("es-PE", { timeZone: "America/Lima" });
};

const itemDescription = (item: OcPreviewItem | OcRecibidaItem) =>
  toDisplayText(item.descripcion, "") ||
  toDisplayText(item.producto, "") ||
  `Item #${item.cotizacion_item_id ?? item.id}`;

const getCotizacionLabel = (oc: OcEmitida | OcRecibida) =>
  toDisplayText(oc.cotizacion?.numero ?? (oc as any).cotizacion_numero, "") ||
  (oc.cotizacion_id ? `COT-${oc.cotizacion_id}` : "N/A");

const getCotizacionCliente = (oc: OcEmitida | OcRecibida) =>
  toDisplayText(
    oc.cotizacion?.cliente_nombre ??
      oc.cotizacion?.cliente?.nombre ??
      (oc as any).cliente_nombre ??
      (oc as any).cotizacion_cliente_nombre,
    "N/A",
  );

const getCotizacionTitulo = (oc: OcEmitida | OcRecibida) =>
  toDisplayText(
    oc.cotizacion?.titulo ??
      (oc as any).cotizacion_titulo ??
      (oc as any).titulo,
    "Sin titulo",
  );

const getPreviewCotizacionLabel = (preview: OcPreview, fallbackId: number | string) =>
  preview.cotizacion?.numero ||
  (preview.cotizacion?.id ? `Cotizacion #${preview.cotizacion.id}` : `Cotizacion #${fallbackId}`);

const getOcItemsCount = (oc: OcRecibida | OcEmitida) => {
  const raw =
    (oc as any).items_count ??
    (oc as any).total_items ??
    (oc as any).items_total ??
    (oc as any).cantidad_items ??
    oc.items?.length ??
    0;
  const count = Number(raw);
  return Number.isFinite(count) ? count : 0;
};

const isApprovedCotizacion = (preview: OcPreview) => {
  const estadoId = Number(preview.cotizacion?.estado_cotizacion_id ?? 0);

  return estadoId === 4;
};

const previewEstadoId = (preview: OcPreview) =>
  preview.cotizacion?.estado_cotizacion_id ?? "";

const getOcLabel = (oc: OcEmitida | OcRecibida) => oc.numero || `OC-${oc.id}`;

const getBadgeClass = (estado?: string) => {
  switch (estado) {
    case "atendido":
      return "bg-emerald-100 text-emerald-700";
    case "por_entrega":
      return "bg-amber-100 text-amber-700";
    case "en_proceso":
      return "bg-blue-100 text-blue-700";
    case "emitida":
      return "bg-indigo-100 text-indigo-700";
    case "pendiente":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

type DocumentLink = {
  key: string;
  label: string;
  url: string;
};

const apiOrigin = String(import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

const toDocumentUrl = (value: unknown) => {
  const raw = toDisplayText(value, "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("blob:")) return raw;
  if (raw.startsWith("/")) return `${apiOrigin}${raw}`;
  if (raw.startsWith("storage/")) return `${apiOrigin}/${raw}`;
  return `${apiOrigin}/storage/${raw}`;
};

const pickDocumentValue = (source: any, key: string) =>
  source?.[`${key}_url`] ??
  source?.[`${key}_path`] ??
  source?.[key] ??
  source?.documentos?.[`${key}_url`] ??
  source?.documentos?.[`${key}_path`] ??
  source?.documentos?.[key]?.url ??
  source?.documentos?.[key]?.path ??
  source?.documentos?.[key];

const getDocumentLinks = (oc: OcEmitida | OcRecibida): DocumentLink[] => {
  const labels = "proveedor" in oc
    ? [
      ["factura", "Factura"],
      ["comprobante_pago", "Comprobante de pago"],
    ]
    : [
      ["orden_compra_cliente", "Orden de compra cliente"],
      ["guia_emision", "Guia de emision"],
    ];

  const directLinks = labels
    .map(([key, label]) => ({
      key,
      label,
      url: toDocumentUrl(pickDocumentValue(oc as any, key)),
    }))
    .filter((document) => document.url);

  const arrayLinks = Array.isArray((oc as any).documentos)
    ? (oc as any).documentos
      .map((documento: any, index: number) => ({
        key: String(documento?.tipo ?? documento?.key ?? index),
        label: toDisplayText(documento?.label ?? documento?.nombre ?? documento?.tipo, `Documento ${index + 1}`),
        url: toDocumentUrl(documento?.url ?? documento?.path ?? documento?.archivo ?? documento?.file),
      }))
      .filter((document: DocumentLink) => document.url)
    : [];

  const byUrl = new Map<string, DocumentLink>();
  [...directLinks, ...arrayLinks].forEach((document) => byUrl.set(document.url, document));
  return Array.from(byUrl.values());
};

export default function OrdenesCompraPage() {
  const { addNotification, showToast } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const { ocId } = useParams();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<ActiveTab>("recibidas");
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [proveedorFilter, setProveedorFilter] = useState("");
  const [emitidas, setEmitidas] = useState<OcEmitida[]>([]);
  const [recibidas, setRecibidas] = useState<OcRecibida[]>([]);
  const [emitidasPagination, setEmitidasPagination] = useState<PaginationState>(emptyPagination);
  const [recibidasPagination, setRecibidasPagination] = useState<PaginationState>(emptyPagination);
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [preview, setPreview] = useState<OcPreview | null>(null);
  const [emitidaBasePreview, setEmitidaBasePreview] = useState<OcPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cotizacionId, setCotizacionId] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [fecha, setFecha] = useState(today);
  const [observaciones, setObservaciones] = useState("");
  const [recibidaItems, setRecibidaItems] = useState<RecibidaDraftItem[]>([]);
  const [emitidaItems, setEmitidaItems] = useState<EmitidaDraftItem[]>([]);
  const [ordenCompraCliente, setOrdenCompraCliente] = useState<File | null>(null);
  const [guiaEmision, setGuiaEmision] = useState<File | null>(null);
  const [selectedOc, setSelectedOc] = useState<OcEmitida | OcRecibida | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [documentTarget, setDocumentTarget] = useState<OcEmitida | OcRecibida | null>(null);
  const [factura, setFactura] = useState<File | null>(null);
  const [comprobantePago, setComprobantePago] = useState<File | null>(null);
  const [updatingItemOc, setUpdatingItemOc] = useState<number | null>(null);

  const currentPagination = activeTab === "emitidas" ? emitidasPagination : recibidasPagination;
  const paginationItems = getPaginationItems(currentPagination.page, currentPagination.totalPages);

  const proveedorOptions = useMemo(() => {
    const fromPreview = preview?.proveedores || [];
    const fromItems = (preview?.items || [])
      .map((item) => item.proveedor)
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()));
    return Array.from(new Set([...fromPreview, ...fromItems]));
  }, [preview]);

  const loadEmitidas = useCallback(async (page = emitidasPagination.page) => {
    try {
      setLoading(true);
      const response = await getOcEmitidas({
        page,
        search: searchTerm,
        estado: estadoFilter,
        proveedor: proveedorFilter,
        perPage,
      });
      setEmitidas(response.data);
      setEmitidasPagination({
        page: response.current_page || page,
        totalPages: response.last_page || 1,
        total: response.total || 0,
        from: response.from || 0,
        to: response.to || 0,
      });
    } catch (error) {
      showToast({
        title: "Error al cargar OC emitidas",
        description: getErrorMessage(error, "No se pudo obtener la lista de OC emitidas."),
        type: "warning",
      });
    } finally {
      setLoading(false);
    }
  }, [emitidasPagination.page, estadoFilter, proveedorFilter, searchTerm, showToast]);

  const loadRecibidas = useCallback(async (page = recibidasPagination.page) => {
    try {
      setLoading(true);
      const response = await getOcRecibidas({
        page,
        search: searchTerm,
        estado: estadoFilter,
        perPage,
      });
      setRecibidas(response.data);
      setRecibidasPagination({
        page: response.current_page || page,
        totalPages: response.last_page || 1,
        total: response.total || 0,
        from: response.from || 0,
        to: response.to || 0,
      });
    } catch (error) {
      showToast({
        title: "Error al cargar OC recibidas",
        description: getErrorMessage(error, "No se pudo obtener la lista de OC recibidas."),
        type: "warning",
      });
    } finally {
      setLoading(false);
    }
  }, [estadoFilter, recibidasPagination.page, searchTerm, showToast]);

  const refreshActiveTab = useCallback(() => {
    if (activeTab === "emitidas") {
      void loadEmitidas(emitidasPagination.page);
    } else {
      void loadRecibidas(recibidasPagination.page);
    }
  }, [activeTab, emitidasPagination.page, loadEmitidas, loadRecibidas, recibidasPagination.page]);

  useEffect(() => {
    if (activeTab === "emitidas") {
      void loadEmitidas(1);
    } else {
      void loadRecibidas(1);
    }
  }, [activeTab, estadoFilter, proveedorFilter, searchTerm]);

  useEffect(() => {
    const queryCotizacionId = searchParams.get("cotizacion");
    if (!queryCotizacionId) return;

    const mode = searchParams.get("modo") === "emitir" ? "emitir" : "recibir";
    resetForm();
    setCotizacionId(queryCotizacionId);
    setModalMode(mode);
    setActiveTab(mode === "emitir" ? "emitidas" : "recibidas");
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!ocId) return;

    const isRecibidaRoute = location.pathname.includes("/ordenes-compra/recibidas/");
    const isEmitidaRoute = location.pathname.includes("/ordenes-compra/emitidas/");
    if (!isRecibidaRoute && !isEmitidaRoute) return;

    let cancelled = false;

    const loadDeepLinkedOc = async () => {
      try {
        setLoadingDetail(true);
        setSelectedOc(null);

        if (isRecibidaRoute) {
          setActiveTab("recibidas");
          const oc = await getOcRecibida(ocId);
          if (!cancelled) setSelectedOc(oc);
          return;
        }

        setActiveTab("emitidas");
        const oc = await getOcEmitida(ocId);
        if (!cancelled) setSelectedOc(oc);
      } catch (error) {
        if (!cancelled) {
          showToast({
            title: "Error al abrir notificacion",
            description: getErrorMessage(error, "No se pudo cargar la orden de compra asociada."),
            type: "warning",
          });
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };

    void loadDeepLinkedOc();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, ocId, showToast]);

  const resetForm = () => {
    setPreview(null);
    setEmitidaBasePreview(null);
    setCotizacionId("");
    setProveedor("");
    setFecha(today);
    setObservaciones("");
    setRecibidaItems([]);
    setEmitidaItems([]);
    setOrdenCompraCliente(null);
    setGuiaEmision(null);
  };

  const openCreateModal = (mode: Exclude<ModalMode, null>) => {
    resetForm();
    setModalMode(mode);
  };

  const closeCreateModal = () => {
    if (saving) return;
    setModalMode(null);
    resetForm();
  };

  const handleLoadPreview = async () => {
    const id = Number(cotizacionId);
    if (!id) {
      showToast({ title: "Cotizacion requerida", description: "Ingresa el ID de cotizacion.", type: "warning" });
      return;
    }

    try {
      setPreviewLoading(true);
      const data = modalMode === "recibir"
        ? await getOcRecibidaPreview(id)
        : await getOcEmitidaPreview(id);
      const cotizacionData = await getCotizacion(id);
      const dataWithCotizacion: OcPreview = {
        ...data,
        cotizacion: {
          ...data.cotizacion,
          ...cotizacionData,
          id: cotizacionData.id ?? data.cotizacion?.id ?? id,
          numero: cotizacionData.numero ?? data.cotizacion?.numero,
          cliente_nombre: cotizacionData.cliente_nombre ?? data.cotizacion?.cliente_nombre,
          titulo: cotizacionData.titulo ?? data.cotizacion?.titulo,
          estado_cotizacion_id: cotizacionData.estado_cotizacion_id ?? data.cotizacion?.estado_cotizacion_id,
        },
      };

      if (!isApprovedCotizacion(dataWithCotizacion)) {
        setPreview(dataWithCotizacion);
        setRecibidaItems([]);
        setEmitidaItems([]);
        const estadoRecibido = previewEstadoId(dataWithCotizacion) || "sin estado_cotizacion_id";
        showToast({
          title: "Cotizacion no aprobada",
          description: `Solo se puede registrar o emitir OC cuando estado_cotizacion_id es 4. Recibido: ${estadoRecibido}.`,
          type: "warning",
        });
        return;
      }

      setPreview(dataWithCotizacion);
      if (modalMode === "emitir") {
        setEmitidaBasePreview(dataWithCotizacion);
      }
      setRecibidaItems(
        dataWithCotizacion.items.map((item) => ({
          cotizacion_item_id: item.cotizacion_item_id ?? item.id,
          descripcion: itemDescription(item),
          seleccionado: true,
          cantidad_recibida: toNumber(item.cantidad_recibida ?? item.cantidad_pendiente ?? item.cantidad),
        }))
      );
      setEmitidaItems(buildEmitidaDraftItems(dataWithCotizacion.items, modalMode === "emitir" ? proveedor : undefined));

      if (modalMode === "emitir" && !proveedor && dataWithCotizacion.proveedores?.[0]) {
        const firstProveedor = dataWithCotizacion.proveedores[0];
        setProveedor(firstProveedor);
        setEmitidaItems(buildEmitidaDraftItems(dataWithCotizacion.items, firstProveedor));
        void handleProveedorChange(firstProveedor);
      }
    } catch (error) {
      showToast({
        title: "No se pudo cargar el preview",
        description: getErrorMessage(error, "Verifica que la cotizacion exista y este disponible para OC."),
        type: "warning",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleProveedorChange = async (value: string) => {
    setProveedor(value);
    const id = Number(cotizacionId);
    if (!id || !value) return;

    const fallbackPreview = emitidaBasePreview ?? preview;
    if (fallbackPreview) {
      setEmitidaItems(buildEmitidaDraftItems(fallbackPreview.items, value));
    }

    try {
      setPreviewLoading(true);
      const data = await getOcEmitidaItems(id, value);
      const nextItems = data.items.length > 0 ? data.items : fallbackPreview?.items || [];
      const filteredItems = data.items.length > 0
        ? buildEmitidaDraftItems(nextItems)
        : buildEmitidaDraftItems(nextItems, value);
      setPreview((current) => ({
        ...data,
        cotizacion: current?.cotizacion ?? fallbackPreview?.cotizacion,
        items: nextItems,
        proveedores: current?.proveedores ?? fallbackPreview?.proveedores ?? data.proveedores,
      }));
      setEmitidaItems(filteredItems);
    } catch (error) {
      if (!fallbackPreview) {
        showToast({
          title: "Error al filtrar proveedor",
          description: getErrorMessage(error, "No se pudieron obtener los items del proveedor."),
          type: "warning",
        });
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveRecibida = async () => {
    const id = Number(cotizacionId);
    const items = recibidaItems.filter((item) => item.seleccionado && item.cantidad_recibida > 0);

    if (!preview || !isApprovedCotizacion(preview)) {
      showToast({
        title: "Cotizacion no aprobada",
        description: "Carga una cotizacion aprobada antes de registrar la OC recibida.",
        type: "warning",
      });
      return;
    }

    if (!id || !fecha || items.length === 0) {
      showToast({
        title: "Datos incompletos",
        description: "Selecciona al menos un item con cantidad recibida.",
        type: "warning",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await createOcRecibida({
        cotizacion_id: id,
        fecha_recepcion: fecha,
        observaciones,
        items,
        orden_compra_cliente: ordenCompraCliente,
        guia_emision: guiaEmision,
      });

      showToast({
        title: response?.message || "OC recibida guardada",
        description: `Estado de cotizacion: ${response?.cotizacion?.estado || "actualizado"}`,
        type: "success",
      });
      addNotification({
        title: "OC recibida registrada",
        description: `Cotizacion #${id} actualizada desde ordenes de compra`,
        type: "success",
        icon: "ShoppingCart",
        route: "/ordenes-compra",
      });
      closeCreateModal();
      setActiveTab("recibidas");
      void loadRecibidas(1);
    } catch (error) {
      showToast({
        title: "Error al guardar OC recibida",
        description: getErrorMessage(error, "No se pudo registrar la OC recibida."),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmitida = async () => {
    const id = Number(cotizacionId);
    const items = emitidaItems.filter((item) => item.cantidad > 0);

    if (!preview || !isApprovedCotizacion(preview)) {
      showToast({
        title: "Cotizacion no aprobada",
        description: "Carga una cotizacion aprobada antes de emitir la OC.",
        type: "warning",
      });
      return;
    }

    if (!id || !proveedor.trim() || !fecha || items.length === 0) {
      showToast({
        title: "Datos incompletos",
        description: "Selecciona proveedor y al menos un item con cantidad.",
        type: "warning",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await createOcEmitida({
        cotizacion_id: id,
        proveedor,
        fecha_emision: fecha,
        observaciones,
        items,
      });

      showToast({
        title: response?.message || "OC emitida",
        description: response?.pdf_url ? "PDF generado por el backend. Iniciando descarga..." : "La orden fue emitida correctamente.",
        type: "success",
      });
      const ocEmitidaId = response?.oc_emitida?.id ?? response?.data?.oc_emitida?.id ?? response?.id;

      if (ocEmitidaId) {
        try {
          await downloadOcEmitidaPdf(ocEmitidaId, `oc-emitida-${ocEmitidaId}.pdf`);
        } catch (downloadError) {
          showToast({
            title: "OC emitida, PDF no descargado",
            description: getErrorMessage(downloadError, "Usa el boton de descarga en la tabla de OC emitidas."),
            type: "warning",
          });
        }
      }
      closeCreateModal();
      setActiveTab("emitidas");
      void loadEmitidas(1);
    } catch (error) {
      showToast({
        title: "Error al emitir OC",
        description: getErrorMessage(error, "No se pudo emitir la orden de compra."),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocuments = async () => {
    if (!documentTarget) return;
    const isEmitida = "proveedor" in documentTarget;

    try {
      setSaving(true);
      if (isEmitida) {
        await uploadOcEmitidaDocumentos(documentTarget.id, { factura, comprobante_pago: comprobantePago });
        setSelectedOc(await getOcEmitida(documentTarget.id));
      } else {
        await uploadOcRecibidaDocumentos(documentTarget.id, {
          orden_compra_cliente: ordenCompraCliente,
          guia_emision: guiaEmision,
        });
        setSelectedOc(await getOcRecibida(documentTarget.id));
      }

      showToast({ title: "Documentos actualizados", description: "Los archivos fueron enviados al backend.", type: "success" });
      setDocumentTarget(null);
      setFactura(null);
      setComprobantePago(null);
      setOrdenCompraCliente(null);
      setGuiaEmision(null);
      refreshActiveTab();
    } catch (error) {
      showToast({
        title: "Error al subir documentos",
        description: getErrorMessage(error, "No se pudieron guardar los documentos."),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleViewRecibida = async (oc: OcRecibida) => {
    setSelectedOc(oc);
    try {
      setLoadingDetail(true);
      setSelectedOc(await getOcRecibida(oc.id));
    } catch (error) {
      showToast({
        title: "Error al cargar detalle",
        description: getErrorMessage(error, "No se pudo obtener el detalle de la OC recibida."),
        type: "warning",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleViewEmitida = async (oc: OcEmitida) => {
    setSelectedOc(oc);
    try {
      setLoadingDetail(true);
      setSelectedOc(await getOcEmitida(oc.id));
    } catch (error) {
      showToast({
        title: "Error al cargar detalle",
        description: getErrorMessage(error, "No se pudo obtener el detalle de la OC emitida."),
        type: "warning",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownloadEmitidaPdf = async (oc: OcEmitida) => {
    try {
      await downloadOcEmitidaPdf(oc.id, `${getOcLabel(oc)}.pdf`);
      showToast({
        title: "PDF descargado",
        description: `Se descargó ${getOcLabel(oc)} correctamente.`,
        type: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo descargar el PDF",
        description: getErrorMessage(error, "Verifica que el PDF exista y que tu sesion siga activa."),
        type: "error",
      });
    }
  };

  const handleToggleRecibidaItem = async (
    oc: OcRecibida,
    item: OcRecibidaItem,
    field: "comprado" | "entregado",
    checked: boolean,
  ) => {
    if (!oc.items) return;
    const nextItems = oc.items.map((row) => ({
      id: row.id,
      comprado: row.id === item.id && field === "comprado" ? checked : Boolean(row.comprado),
      entregado: row.id === item.id && field === "entregado" ? checked : Boolean(row.entregado),
    }));
    const nextOc = {
      ...oc,
      items: oc.items.map((row) =>
        row.id === item.id ? { ...row, [field]: checked } : row
      ),
    };

    try {
      setUpdatingItemOc(oc.id);
      setSelectedOc((current) => current?.id === oc.id ? nextOc : current);
      await updateOcRecibidaItems(oc.id, { items: nextItems });
      showToast({ title: "Items actualizados", description: "Comprado/entregado fue sincronizado.", type: "success" });
      void loadRecibidas(recibidasPagination.page);
    } catch (error) {
      showToast({
        title: "Error al actualizar items",
        description: getErrorMessage(error, "No se pudo actualizar el estado de los items."),
        type: "error",
      });
    } finally {
      setUpdatingItemOc(null);
    }
  };

  const handleFile = (setter: (file: File | null) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(event.target.files?.[0] ?? null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Ordenes de Compra
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Emision a proveedores y registro de ordenes recibidas de clientes.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => openCreateModal("recibir")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <ClipboardCheck size={18} /> Registrar OC recibida
          </button>
          <button
            type="button"
            onClick={() => openCreateModal("emitir")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Send size={18} /> Emitir OC
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard icon={<Send size={22} />} label="OC emitidas" value={emitidasPagination.total} tone="blue" />
        <SummaryCard icon={<ClipboardCheck size={22} />} label="OC recibidas" value={recibidasPagination.total} tone="emerald" />
        <SummaryCard
          icon={<AlertTriangle size={22} />}
          label="Doc. pendientes"
          value={[...emitidas, ...recibidas].filter((oc) => oc.documentos_completos === false).length}
          tone="amber"
        />
        <SummaryCard
          icon={<CheckCircle size={22} />}
          label="Atendidas"
          value={[...emitidas, ...recibidas].filter((oc) => oc.estado === "atendido").length}
          tone="slate"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-gray-200 p-2 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-950 sm:w-[420px]">
            <TabButton active={activeTab === "recibidas"} onClick={() => setActiveTab("recibidas")} icon={<ClipboardCheck size={16} />} label="OC recibidas" />
            <TabButton active={activeTab === "emitidas"} onClick={() => setActiveTab("emitidas")} icon={<Send size={16} />} label="OC emitidas" />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 dark:border-slate-800 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:w-96">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por OC, cotizacion, cliente..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {activeTab === "emitidas" && (
              <input
                value={proveedorFilter}
                onChange={(event) => setProveedorFilter(event.target.value)}
                placeholder="Proveedor"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:w-56"
              />
            )}
            <select
              value={estadoFilter}
              onChange={(event) => setEstadoFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:w-56"
            >
              <option value="todos">Todos los estados</option>
              {(activeTab === "emitidas" ? Object.keys(estadoEmitidaLabels) : Object.keys(estadoRecibidaLabels)).map((estado) => (
                <option key={estado} value={estado}>
                  {(activeTab === "emitidas" ? estadoEmitidaLabels : estadoRecibidaLabels)[estado]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={refreshActiveTab}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-950"
            >
              <RefreshCw size={16} /> Actualizar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-14 text-slate-500">
              <Loader2 className="mr-3 h-7 w-7 animate-spin text-blue-600" />
              Cargando ordenes de compra...
            </div>
          ) : activeTab === "emitidas" ? (
            <EmitidasTable
              rows={emitidas}
              onView={handleViewEmitida}
              onDocuments={setDocumentTarget}
              onDownloadPdf={handleDownloadEmitidaPdf}
            />
          ) : (
            <RecibidasTable
              rows={recibidas}
              onView={handleViewRecibida}
              onDocuments={setDocumentTarget}
              onToggleItem={handleToggleRecibidaItem}
              updatingItemOc={updatingItemOc}
            />
          )}
        </div>

        {currentPagination.total > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Mostrando {currentPagination.from} a {currentPagination.to} de {currentPagination.total}
            </p>
            <div className="flex items-center gap-2">
              <PageButton
                disabled={currentPagination.page <= 1}
                onClick={() => activeTab === "emitidas" ? loadEmitidas(currentPagination.page - 1) : loadRecibidas(currentPagination.page - 1)}
              >
                <ChevronLeft size={17} />
              </PageButton>
              {paginationItems.map((item) =>
                typeof item === "number" ? (
                  <button
                    key={item}
                    type="button"
                    onClick={() => activeTab === "emitidas" ? loadEmitidas(item) : loadRecibidas(item)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      currentPagination.page === item
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={item} className="px-1 text-slate-400">...</span>
                )
              )}
              <PageButton
                disabled={currentPagination.page >= currentPagination.totalPages}
                onClick={() => activeTab === "emitidas" ? loadEmitidas(currentPagination.page + 1) : loadRecibidas(currentPagination.page + 1)}
              >
                <ChevronRight size={17} />
              </PageButton>
            </div>
          </div>
        )}
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
            <ModalHeader
              title={modalMode === "emitir" ? "Emitir OC a proveedor" : "Registrar OC recibida"}
              onClose={closeCreateModal}
            />
            <div className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">ID cotizacion</span>
                  <input
                    type="number"
                    value={cotizacionId}
                    onChange={(event) => setCotizacionId(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {modalMode === "emitir" ? "Fecha emision" : "Fecha recepcion"}
                  </span>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(event) => setFecha(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleLoadPreview}
                    disabled={previewLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {previewLoading ? <Loader2 size={17} className="animate-spin" /> : <Eye size={17} />}
                    Cargar preview
                  </button>
                </div>
                {modalMode === "emitir" && (
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Proveedor</span>
                    {proveedorOptions.length > 0 ? (
                      <select
                        value={proveedor}
                        onChange={(event) => void handleProveedorChange(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="">Seleccionar</option>
                        {proveedorOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={proveedor}
                        onChange={(event) => setProveedor(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    )}
                  </label>
                )}
              </div>

              {preview?.cotizacion && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                  <span className="font-semibold">{getPreviewCotizacionLabel(preview, cotizacionId)}</span>
                  {preview.cotizacion.cliente_nombre ? ` - ${preview.cotizacion.cliente_nombre}` : ""}
                </div>
              )}

              {modalMode === "recibir" ? (
                <RecibidaDraftTable rows={recibidaItems} setRows={setRecibidaItems} />
              ) : (
                <EmitidaDraftTable rows={emitidaItems} setRows={setEmitidaItems} />
              )}

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Observaciones</span>
                <textarea
                  value={observaciones}
                  onChange={(event) => setObservaciones(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              {modalMode === "recibir" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FileInput label="Orden de compra cliente" onChange={handleFile(setOrdenCompraCliente)} />
                  <FileInput label="Guia de emision" onChange={handleFile(setGuiaEmision)} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-slate-800">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={modalMode === "emitir" ? handleSaveEmitida : handleSaveRecibida}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={17} className="animate-spin" /> : <FilePlus2 size={17} />}
                {modalMode === "emitir" ? "Emitir OC" : "Guardar OC recibida"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOc && (
        <DetailModal
          oc={selectedOc}
          loading={loadingDetail}
          updatingItemOc={updatingItemOc}
          onClose={() => setSelectedOc(null)}
          onToggleItem={handleToggleRecibidaItem}
        />
      )}

      {documentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
            <ModalHeader title={`Subir documentos - ${getOcLabel(documentTarget)}`} onClose={() => setDocumentTarget(null)} />
            <div className="space-y-4 p-6">
              {"proveedor" in documentTarget ? (
                <>
                  <FileInput label="Factura" onChange={handleFile(setFactura)} />
                  <FileInput label="Comprobante de pago" onChange={handleFile(setComprobantePago)} />
                </>
              ) : (
                <>
                  <FileInput label="Orden de compra cliente" onChange={handleFile(setOrdenCompraCliente)} />
                  <FileInput label="Guia de emision" onChange={handleFile(setGuiaEmision)} />
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDocumentTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUploadDocuments}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
                Subir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "blue" | "emerald" | "amber" | "slate" }) {
  const tones = {
    blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-4">
        <div className={`rounded-xl p-3 ${tones[tone]}`}>{icon}</div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-200" : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function PageButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
    >
      {children}
    </button>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-slate-800">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
        title="Cerrar"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function FileInput({ label, onChange }: { label: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="block rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Paperclip size={16} /> {label}
      </span>
      <input type="file" onChange={onChange} className="w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700" />
    </label>
  );
}

function EmitidasTable({
  rows,
  onView,
  onDocuments,
  onDownloadPdf,
}: {
  rows: OcEmitida[];
  onView: (oc: OcEmitida) => void;
  onDocuments: (oc: OcEmitida) => void;
  onDownloadPdf: (oc: OcEmitida) => void;
}) {
  return (
    <table className="w-full min-w-[980px]">
      <thead className="bg-gray-50 text-left text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <tr>
          <th className="px-5 py-4">OC</th>
          <th className="px-5 py-4">Cotizacion</th>
          <th className="px-5 py-4">Proveedor</th>
          <th className="px-5 py-4">Fecha</th>
          <th className="px-5 py-4">Total</th>
          <th className="px-5 py-4">Documentos</th>
          <th className="px-5 py-4">Estado</th>
          <th className="px-5 py-4 text-center">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {rows.length ? rows.map((oc) => (
          <tr key={oc.id} className="border-t border-gray-100 text-sm dark:border-slate-800">
            <td className="px-5 py-4 font-semibold text-blue-600">{getOcLabel(oc)}</td>
            <td className="px-5 py-4">{getCotizacionLabel(oc)}</td>
            <td className="px-5 py-4">{oc.proveedor || "N/A"}</td>
            <td className="px-5 py-4"><span className="inline-flex items-center gap-2"><Calendar size={15} />{formatDate(oc.fecha_emision)}</span></td>
            <td className="px-5 py-4 font-semibold">{formatMoney(oc.total, "S/")}</td>
            <td className="px-5 py-4"><DocumentStatus oc={oc} /></td>
            <td className="px-5 py-4"><EstadoBadge estado={oc.estado} labels={estadoEmitidaLabels} /></td>
            <td className="px-5 py-4">
              <div className="flex justify-center gap-2">
                <IconButton title="Ver detalle" onClick={() => onView(oc)} icon={<Eye size={17} />} />
                <IconButton title="Subir documentos" onClick={() => onDocuments(oc)} icon={<Upload size={17} />} />
                <button
                  type="button"
                  onClick={() => onDownloadPdf(oc)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                  title="Descargar PDF"
                >
                  <Download size={17} />
                </button>
              </div>
            </td>
          </tr>
        )) : (
          <EmptyRow colSpan={8} />
        )}
      </tbody>
    </table>
  );
}

function RecibidasTable({
  rows,
  onView,
  onDocuments,
  onToggleItem,
  updatingItemOc,
}: {
  rows: OcRecibida[];
  onView: (oc: OcRecibida) => void;
  onDocuments: (oc: OcRecibida) => void;
  onToggleItem: (oc: OcRecibida, item: OcRecibidaItem, field: "comprado" | "entregado", checked: boolean) => void;
  updatingItemOc: number | null;
}) {
  return (
    <table className="w-full min-w-[1080px]">
      <thead className="bg-gray-50 text-left text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <tr>
          <th className="px-5 py-4">OC</th>
          <th className="px-5 py-4">Cotizacion</th>
          <th className="px-5 py-4">Fecha</th>
          <th className="px-5 py-4">Items</th>
          <th className="px-5 py-4">Documentos</th>
          <th className="px-5 py-4">Estado</th>
          <th className="px-5 py-4 text-center">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {rows.length ? rows.map((oc) => (
          <tr key={oc.id} className="border-t border-gray-100 align-top text-sm dark:border-slate-800">
            <td className="px-5 py-4 font-semibold text-emerald-600">{getOcLabel(oc)}</td>
            <td className="px-5 py-4">{getCotizacionLabel(oc)}</td>
            <td className="px-5 py-4"><span className="inline-flex items-center gap-2"><Calendar size={15} />{formatDate(oc.fecha_recepcion)}</span></td>
            <td className="px-5 py-4">
              <div className="space-y-2">
                {(oc.items || []).length > 0 ? (oc.items || []).slice(0, 3).map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950">
                      <span className="min-w-[180px] text-slate-700 dark:text-slate-200">{itemDescription(item)}</span>
                      <label className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={Boolean(item.comprado)}
                          disabled={updatingItemOc === oc.id}
                          onChange={(event) => onToggleItem(oc, item, "comprado", event.target.checked)}
                        />
                        Comprado
                      </label>
                      <label className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={Boolean(item.entregado)}
                          disabled={updatingItemOc === oc.id}
                          onChange={(event) => onToggleItem(oc, item, "entregado", event.target.checked)}
                        />
                        Entregado
                      </label>
                    </div>
                  )) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {getOcItemsCount(oc)} items
                    </span>
                  )}
                {(oc.items || []).length > 3 && <p className="text-xs text-slate-400">+{(oc.items || []).length - 3} items mas</p>}
                {updatingItemOc === oc.id && <p className="inline-flex items-center gap-2 text-xs text-blue-600"><Loader2 size={13} className="animate-spin" /> Sincronizando</p>}
              </div>
            </td>
            <td className="px-5 py-4"><DocumentStatus oc={oc} /></td>
            <td className="px-5 py-4"><EstadoBadge estado={oc.estado} labels={estadoRecibidaLabels} /></td>
            <td className="px-5 py-4">
              <div className="flex justify-center gap-2">
                <IconButton title="Ver detalle" onClick={() => onView(oc)} icon={<Eye size={17} />} />
                <IconButton title="Subir documentos" onClick={() => onDocuments(oc)} icon={<Upload size={17} />} />
              </div>
            </td>
          </tr>
        )) : (
          <EmptyRow colSpan={7} />
        )}
      </tbody>
    </table>
  );
}

function RecibidaDraftTable({ rows, setRows }: { rows: RecibidaDraftItem[]; setRows: React.Dispatch<React.SetStateAction<RecibidaDraftItem[]>> }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <tr>
            <th className="px-4 py-3">Incluir</th>
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3">Cantidad recibida</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => (
            <tr key={item.cotizacion_item_id} className="border-t border-gray-100 dark:border-slate-800">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={item.seleccionado}
                  onChange={(event) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, seleccionado: event.target.checked } : row))}
                />
              </td>
              <td className="px-4 py-3">{item.descripcion}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  value={item.cantidad_recibida}
                  onChange={(event) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, cantidad_recibida: Number(event.target.value) } : row))}
                  className="w-32 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </td>
            </tr>
          ))}
          {!rows.length && <EmptyRow colSpan={3} message="No hay items para mostrar." />}
        </tbody>
      </table>
    </div>
  );
}

function EmitidaDraftTable({ rows, setRows }: { rows: EmitidaDraftItem[]; setRows: React.Dispatch<React.SetStateAction<EmitidaDraftItem[]>> }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <tr>
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3">Cantidad</th>
            <th className="px-4 py-3">Precio unitario</th>
            <th className="px-4 py-3">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => (
            <tr key={item.cotizacion_item_id} className="border-t border-gray-100 dark:border-slate-800">
              <td className="px-4 py-3">{item.descripcion}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  value={item.cantidad}
                  onChange={(event) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, cantidad: Number(event.target.value) } : row))}
                  className="w-28 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.precio_unitario}
                  onChange={(event) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, precio_unitario: Number(event.target.value) } : row))}
                  className="w-32 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </td>
              <td className="px-4 py-3 font-semibold">{formatMoney(item.cantidad * item.precio_unitario, "S/")}</td>
            </tr>
          ))}
          {!rows.length && <EmptyRow colSpan={4} message="Selecciona un proveedor para ver los items de la cotizacion." />}
        </tbody>
      </table>
    </div>
  );
}

function DocumentStatus({ oc }: { oc: OcEmitida | OcRecibida }) {
  const documents = getDocumentLinks(oc);

  if (documents.length > 0) {
    return (
      <div className="space-y-1">
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
          oc.documentos_completos ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
        }`}>
          <CheckCircle size={13} /> {oc.documentos_completos ? "Completos" : "Con archivos"}
        </span>
        <div className="flex flex-col gap-1">
          {documents.map((document) => (
            <a
              key={`${document.key}-${document.url}`}
              href={document.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              <Download size={12} /> {document.label}
            </a>
          ))}
        </div>
        {!!oc.documentos_faltantes?.length && (
          <p className="max-w-[220px] text-xs text-slate-500">Faltan: {oc.documentos_faltantes.join(", ")}</p>
        )}
      </div>
    );
  }

  if (oc.documentos_completos) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle size={13} /> Completos</span>;
  }

  return (
    <div className="space-y-1">
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        <AlertTriangle size={13} /> Pendientes
      </span>
      {!!oc.documentos_faltantes?.length && (
        <p className="max-w-[220px] text-xs text-slate-500">{oc.documentos_faltantes.join(", ")}</p>
      )}
    </div>
  );
}

function EstadoBadge({ estado, labels }: { estado?: string; labels: Record<string, string> }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(estado)}`}>
      {labels[estado || ""] || estado || "N/A"}
    </span>
  );
}

function IconButton({ title, onClick, icon }: { title: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
      title={title}
    >
      {icon}
    </button>
  );
}

function EmptyRow({ colSpan, message = "No hay ordenes de compra para mostrar." }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center text-slate-500">
        {message}
      </td>
    </tr>
  );
}

function DetailModal({
  oc,
  loading,
  updatingItemOc,
  onClose,
  onToggleItem,
}: {
  oc: OcEmitida | OcRecibida;
  loading: boolean;
  updatingItemOc: number | null;
  onClose: () => void;
  onToggleItem: (oc: OcRecibida, item: OcRecibidaItem, field: "comprado" | "entregado", checked: boolean) => void;
}) {
  const isEmitida = "proveedor" in oc;
  const items = oc.items || [];
  const documents = getDocumentLinks(oc);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
        <ModalHeader title={`Detalle ${getOcLabel(oc)}`} onClose={onClose} />
        <div className="space-y-5 p-6">
          {loading && (
            <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
              <Loader2 size={16} className="animate-spin" />
              Cargando detalle completo...
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <InfoTile icon={<FileText size={18} />} label="Cotizacion" value={getCotizacionLabel(oc)} />
            <InfoTile icon={<FileText size={18} />} label="Cliente" value={getCotizacionCliente(oc)} />
            <InfoTile icon={<FileText size={18} />} label="Titulo" value={getCotizacionTitulo(oc)} />
            <InfoTile icon={<Calendar size={18} />} label={isEmitida ? "Fecha emision" : "Fecha recepcion"} value={formatDate(isEmitida ? (oc as OcEmitida).fecha_emision : (oc as OcRecibida).fecha_recepcion)} />
            <InfoTile icon={isEmitida ? <Truck size={18} /> : <PackageCheck size={18} />} label="Estado" value={isEmitida ? estadoEmitidaLabels[oc.estado] || oc.estado : estadoRecibidaLabels[oc.estado] || oc.estado} />
          </div>
          {isEmitida && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <InfoTile icon={<Truck size={18} />} label="Proveedor" value={(oc as OcEmitida).proveedor || "N/A"} />
              <InfoTile icon={<FileText size={18} />} label="Subtotal" value={formatMoney((oc as OcEmitida).subtotal, "S/")} />
              <InfoTile icon={<FileText size={18} />} label="IGV" value={formatMoney((oc as OcEmitida).igv, "S/")} />
              <InfoTile icon={<FileText size={18} />} label="Total" value={formatMoney((oc as OcEmitida).total, "S/")} />
            </div>
          )}
          <div className="rounded-xl border border-gray-200 dark:border-slate-800">
            <div className="border-b border-gray-200 p-4 font-semibold text-slate-800 dark:border-slate-800 dark:text-white">
              Documentos
            </div>
            <div className="p-4">
              {documents.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {documents.map((document) => (
                    <a
                      key={`${document.key}-${document.url}`}
                      href={document.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      <span className="inline-flex items-center gap-2">
                        <FileText size={16} /> {document.label}
                      </span>
                      <Download size={16} />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No hay documentos subidos para esta orden.
                </p>
              )}
              {!!oc.documentos_faltantes?.length && (
                <p className="mt-3 text-xs text-amber-700">
                  Documentos faltantes: {oc.documentos_faltantes.join(", ")}
                </p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-slate-800">
            <div className="border-b border-gray-200 p-4 font-semibold text-slate-800 dark:border-slate-800 dark:text-white">Items</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Descripcion</th>
                    <th className="px-4 py-3">Cantidad</th>
                    {isEmitida ? (
                      <th className="px-4 py-3">Precio</th>
                    ) : (
                      <>
                        <th className="px-4 py-3">Comprado</th>
                        <th className="px-4 py-3">Entregado</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id} className="border-t border-gray-100 dark:border-slate-800">
                      <td className="px-4 py-3">{itemDescription(item)}</td>
                      <td className="px-4 py-3">{item.cantidad ?? item.cantidad_recibida ?? "N/A"}</td>
                      {isEmitida ? (
                        <td className="px-4 py-3">{formatMoney(item.precio_unitario, "S/")}</td>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <label className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                              <input
                                type="checkbox"
                                checked={Boolean(item.comprado)}
                                disabled={updatingItemOc === oc.id}
                                onChange={(event) =>
                                  onToggleItem(oc as OcRecibida, item as OcRecibidaItem, "comprado", event.target.checked)
                                }
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              {item.comprado ? "Si" : "No"}
                            </label>
                          </td>
                          <td className="px-4 py-3">
                            <label className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                              <input
                                type="checkbox"
                                checked={Boolean(item.entregado)}
                                disabled={updatingItemOc === oc.id}
                                onChange={(event) =>
                                  onToggleItem(oc as OcRecibida, item as OcRecibidaItem, "entregado", event.target.checked)
                                }
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              {item.entregado ? "Si" : "No"}
                            </label>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {!items.length && <EmptyRow colSpan={isEmitida ? 3 : 4} message="No hay items registrados en esta orden." />}
                </tbody>
              </table>
            </div>
          </div>
          {oc.observaciones && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {oc.observaciones}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
      <p className="flex items-center gap-2 text-sm text-slate-500">{icon}{label}</p>
      <p className="mt-2 font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
