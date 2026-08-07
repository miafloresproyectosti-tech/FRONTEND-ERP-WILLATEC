import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { ChangeEvent } from "react";
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
  Trash2,
  Truck,
  Upload,
  X,
} from "lucide-react";

import { useNotifications } from "../NotificationContext";
import {
  createOcEmitida,
  createOcRecibida,
  deleteOcEmitidaDocumento,
  deleteOcEmitidaDocumentoAdicional,
  deleteOcRecibidaDocumento,
  deleteOcRecibidaDocumentoAdicional,
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
  type OcDocumentoAdicional,
  type OcEmitida,
  type OcPreview,
  type OcPreviewItem,
  type OcRecibida,
  type OcRecibidaItem,
  cancelarOcRecibida,
} from "../services/ordenCompra.service";
import { useAuth } from "../AuthContext";
import { getCotizacion } from "../services/cotizacion.service";
import {
  createProveedor,
  getProveedores,
  type Proveedor,
  type ProveedorPayload,
} from "../services/proveedor.service";
import { formatMoney } from "../utils/formatNumber";
import { getPaginationItems } from "../utils/pagination";
import PageSizeSelect from "../components/ui/PageSizeSelect";

type ActiveTab = "emitidas" | "recibidas";
type ModalMode = "emitir" | "recibir" | null;

const initialNuevoProveedor: ProveedorPayload = {
  nombre: "",
  ruc: "",
  contacto: "",
  telefono: "",
  correo: "",
  direccion: "",
  observaciones: "",
  activo: true,
};

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
  toNumber(
    item.cantidad ??
      (item as any).cantidad_cotizada ??
      item.cantidad_disponible ??
      item.cantidad_pendiente,
  );

const normalizeProveedorKey = (value?: string) =>
  String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

const getProveedorPrecio = (item: OcPreviewItem, proveedor?: string) => {
  const selectedProveedorKey = normalizeProveedorKey(proveedor);
  const proveedorRow = selectedProveedorKey
    ? item.proveedores?.find(
        (row) => normalizeProveedorKey(row.nombre) === selectedProveedorKey,
      )
    : item.proveedores?.[0];

  return toNumber(
    proveedorRow?.precio ?? item.precio_unitario ?? item.costo_base,
  );
};

const itemBelongsToProveedor = (item: OcPreviewItem, proveedor: string) => {
  const selectedProveedorKey = normalizeProveedorKey(proveedor);
  if (!selectedProveedorKey) return true;

  const itemProveedorKey = normalizeProveedorKey(item.proveedor ?? undefined);
  return (
    itemProveedorKey === selectedProveedorKey ||
    Boolean(
      item.proveedores?.some(
        (row) => normalizeProveedorKey(row.nombre) === selectedProveedorKey,
      ),
    )
  );
};

const buildEmitidaDraftItems = (
  items: OcPreviewItem[],
  proveedor?: string,
): EmitidaDraftItem[] =>
  items
    .filter((item) => itemBelongsToProveedor(item, proveedor || ""))
    .map((item) => ({
      cotizacion_item_id: item.cotizacion_item_id ?? item.id,
      descripcion: itemDescription(item),
      cantidad: getQuotedQuantity(item),
      precio_unitario: getProveedorPrecio(item, proveedor),
    }));

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
  cancelado: "Cancelado",
};

const estadoEmitidaLabels: Record<string, string> = {
  emitida: "Emitida",
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  atendido: "Atendido",
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
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
    return (
      toDisplayText(row.nombre, "") ||
      toDisplayText(row.proveedor, "") ||
      toDisplayText(row.descripcion, "") ||
      toDisplayText(row.producto, "") ||
      toDisplayText(row.name, "") ||
      fallback
    );
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

const getItemSeries = (item: OcRecibidaItem) =>
  item.cotizacion_item?.producto?.series || [];

const isSerieAssignedToItem = (
  serie: ReturnType<typeof getItemSeries>[number],
  item: OcRecibidaItem,
  oc?: OcRecibida,
) =>
  Number(serie.oc_recibida_id || 0) === Number(oc?.id || 0) &&
  Number(serie.cotizacion_item_id || 0) ===
    Number(item.cotizacion_item_id || 0);

const getSelectableItemSeries = (item: OcRecibidaItem, oc?: OcRecibida) =>
  getItemSeries(item).filter(
    (serie) =>
      serie.estado === "disponible" || isSerieAssignedToItem(serie, item, oc),
  );

const itemRequiresSeries = (item: OcRecibidaItem) =>
  getItemSeries(item).length > 0;

const getAssignedItemSerieIds = (item: OcRecibidaItem, oc: OcRecibida) =>
  getItemSeries(item)
    .filter((serie) => isSerieAssignedToItem(serie, item, oc))
    .map((serie) => Number(serie.id))
    .filter((id) => Number.isFinite(id) && id > 0);

const hasSoldAssignedSeries = (item: OcRecibidaItem, oc?: OcRecibida) =>
  getItemSeries(item).some(
    (serie) =>
      serie.estado === "vendido" && isSerieAssignedToItem(serie, item, oc),
  );

const getOcSerieSelectionMap = (oc: OcRecibida): Record<number, number[]> =>
  (oc.items || []).reduce<Record<number, number[]>>((acc, item) => {
    const ids = getAssignedItemSerieIds(item, oc);
    if (ids.length > 0) {
      acc[item.id] = ids;
    }

    return acc;
  }, {});

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

const getPreviewCotizacionLabel = (
  preview: OcPreview,
  fallbackId: number | string,
) =>
  preview.cotizacion?.numero ||
  (preview.cotizacion?.id
    ? `Cotizacion #${preview.cotizacion.id}`
    : `Cotizacion #${fallbackId}`);

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
    case "cancelado":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

type DocumentLink = {
  key: string;
  label: string;
  url: string;
  id?: number | string;
  additional?: boolean;
  tipo?: string;
  uploadedBy?: number | string | null;
};

const apiOrigin = String(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
).replace(/\/api\/?$/, "");

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

const pickDocumentUploader = (source: any, key: string) =>
  source?.[`${key}_uploaded_by`] ??
  source?.documentos?.[`${key}_uploaded_by`] ??
  source?.documentos?.[key]?.uploaded_by ??
  source?.documentos?.[key]?.created_by ??
  null;

const getDocumentLinks = (oc: OcEmitida | OcRecibida): DocumentLink[] => {
  const labels =
    "proveedor" in oc
      ? [
          ["factura", "Factura"],
          ["comprobante_pago", "Comprobante de pago"],
        ]
      : [
          ["orden_compra_cliente", "Orden de compra cliente"],
          ["guia_emision", "Guia de emision"],
          ["factura", "Factura"],
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
          label: toDisplayText(
            documento?.label ?? documento?.nombre ?? documento?.tipo,
            `Documento ${index + 1}`,
          ),
          url: toDocumentUrl(
            documento?.url ??
              documento?.path ??
              documento?.archivo ??
              documento?.file,
          ),
        }))
        .filter((document: DocumentLink) => document.url)
    : [];
  const additionalLinks = ((oc as any).documentos_adicionales || [])
    .map((documento: OcDocumentoAdicional, index: number) => ({
      key: `adicional-${documento.id ?? index}`,
      id: documento.id,
      additional: true,
      label: documento.nombre_original || `Documento adicional ${index + 1}`,
      url: toDocumentUrl(documento.url || documento.path),
    }))
    .filter((document: DocumentLink) => document.url);

  const byUrl = new Map<string, DocumentLink>();
  [...directLinks, ...arrayLinks, ...additionalLinks].forEach((document) =>
    byUrl.set(document.url, document),
  );
  return Array.from(byUrl.values());
};

const getManagedDocumentLinks = (
  oc: OcEmitida | OcRecibida,
): DocumentLink[] => {
  const labels =
    "proveedor" in oc
      ? [
          ["factura", "Factura"],
          ["comprobante_pago", "Comprobante de pago"],
        ]
      : [
          ["orden_compra_cliente", "Orden de compra cliente"],
          ["guia_emision", "Guia de emision"],
          ["factura", "Factura"],
        ];

  const fixedLinks = labels
    .map(([key, label]) => ({
      key,
      tipo: key,
      label,
      url: toDocumentUrl(pickDocumentValue(oc as any, key)),
      uploadedBy: pickDocumentUploader(oc as any, key),
    }))
    .filter((document) => document.url);

  const additionalLinks = ((oc as any).documentos_adicionales || [])
    .map((documento: OcDocumentoAdicional, index: number) => ({
      key: `adicional-${documento.id ?? index}`,
      id: documento.id,
      additional: true,
      label: documento.nombre_original || `Documento adicional ${index + 1}`,
      url: toDocumentUrl(documento.url || documento.path),
      uploadedBy: documento.created_by,
    }))
    .filter((document: DocumentLink) => document.url);

  return [...fixedLinks, ...additionalLinks];
};

const hasOcDocument = (oc: OcEmitida | OcRecibida, key: string) =>
  Boolean(toDocumentUrl(pickDocumentValue(oc as any, key)));

export default function OrdenesCompraPage() {
  const { user } = useAuth();
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
  const [emitidasPagination, setEmitidasPagination] =
    useState<PaginationState>(emptyPagination);
  const [recibidasPagination, setRecibidasPagination] =
    useState<PaginationState>(emptyPagination);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [preview, setPreview] = useState<OcPreview | null>(null);
  const [emitidaBasePreview, setEmitidaBasePreview] =
    useState<OcPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cotizacionId, setCotizacionId] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [fecha, setFecha] = useState(today);
  const [observaciones, setObservaciones] = useState("");
  const [recibidaItems, setRecibidaItems] = useState<RecibidaDraftItem[]>([]);
  const [emitidaItems, setEmitidaItems] = useState<EmitidaDraftItem[]>([]);
  const [ordenCompraCliente, setOrdenCompraCliente] = useState<File | null>(
    null,
  );
  const [guiaEmision, setGuiaEmision] = useState<File | null>(null);
  const [selectedOc, setSelectedOc] = useState<OcEmitida | OcRecibida | null>(
    null,
  );
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [documentTarget, setDocumentTarget] = useState<
    OcEmitida | OcRecibida | null
  >(null);
  const [factura, setFactura] = useState<File | null>(null);
  const [facturaNumero, setFacturaNumero] = useState("");
  const [comprobantePago, setComprobantePago] = useState<File | null>(null);
  const [documentosAdicionales, setDocumentosAdicionales] = useState<File[]>(
    [],
  );
  const [proveedoresCatalog, setProveedoresCatalog] = useState<Proveedor[]>([]);
  const [showNuevoProveedorForm, setShowNuevoProveedorForm] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState<ProveedorPayload>(
    initialNuevoProveedor,
  );
  const [creatingProveedor, setCreatingProveedor] = useState(false);
  const [updatingItemOc, setUpdatingItemOc] = useState<number | null>(null);
  const [ocItemSeries, setOcItemSeries] = useState<Record<number, number[]>>(
    {},
  );

  const debouncedCotizacionId = useDebouncedValue(cotizacionId, 600);

  const currentPagination =
    activeTab === "emitidas" ? emitidasPagination : recibidasPagination;
  const paginationItems = getPaginationItems(
    currentPagination.page,
    currentPagination.totalPages,
  );
  const canEditOc = useCallback(
    (oc: OcEmitida | OcRecibida) => {
      if (!user) return false;
      if (user.role === "SUPERADMIN") return true;

      return Number(oc.user_id) === Number(user.id);
    },
    [user],
  );
  const canUploadOcDocuments = useCallback(
    (oc: OcEmitida | OcRecibida) => {
      if (!user) return false;
      if (["SUPERADMIN", "ADMIN", "CONTABILIDAD"].includes(user.role))
        return true;

      return Number(oc.user_id) === Number(user.id);
    },
    [user],
  );
  const canCancelRecibida = useCallback(
    (oc: OcRecibida) =>
      canEditOc(oc) && !["atendido", "cancelado"].includes(String(oc.estado)),
    [canEditOc],
  );
  const canCreateOc = user
    ? ["SUPERADMIN", "VENTAS"].includes(user.role)
    : false;
  const canDeleteOcDocument = useCallback(
    (oc: OcEmitida | OcRecibida, document: DocumentLink) => {
      if (!user) return false;
      if (["ADMIN", "CONTABILIDAD"].includes(user.role)) {
        return (
          Boolean(document.uploadedBy) &&
          Number(document.uploadedBy) === Number(user.id)
        );
      }
      if (canEditOc(oc)) return true;

      return false;
    },
    [canEditOc, user],
  );

  const normalizeProveedorKey = (value?: string) =>
    String(value ?? "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();

  const findProveedorCatalog = (nombre?: string) => {
    const key = normalizeProveedorKey(nombre);
    if (!key) return undefined;
    return proveedoresCatalog.find(
      (proveedor) => normalizeProveedorKey(proveedor.nombre) === key,
    );
  };

  const findSimilarProveedor = (nombre?: string) => {
    const normalized = normalizeProveedorKey(nombre);
    if (!normalized) return undefined;

    return proveedoresCatalog.find((item) => {
      const itemKey = normalizeProveedorKey(item.nombre);
      const searchValue = normalized;
      const itemValue = normalizeProveedorKey(item.nombre);

      return (
        itemKey === normalized ||
        itemKey.includes(normalized) ||
        normalized.includes(itemKey) ||
        itemValue.includes(searchValue) ||
        searchValue.includes(itemValue)
      );
    });
  };

  const proveedorOptions = useMemo(() => {
    const fromPreview = preview?.proveedores || [];
    const fromItems = (preview?.items || [])
      .map((item) => item.proveedor)
      .filter(
        (value): value is string =>
          typeof value === "string" && Boolean(value.trim()),
      );
    const fromCatalog = proveedoresCatalog.map((item) => item.nombre || "");

    const dedup = new Map<string, { value: string; label: string }>();
    [...fromPreview, ...fromItems, ...fromCatalog].forEach((value) => {
      const trimmed = value.trim();
      const key = normalizeProveedorKey(trimmed);
      if (!key) return;
      const catalog = findProveedorCatalog(trimmed);
      const label = catalog?.ruc ? `${trimmed} (RUC ${catalog.ruc})` : trimmed;

      const existing = dedup.get(key);
      if (!existing || (!existing.label.includes("RUC") && catalog?.ruc)) {
        dedup.set(key, { value: trimmed, label });
      }
    });

    return Array.from(dedup.values()).sort((a, b) =>
      a.value.localeCompare(b.value),
    );
  }, [preview, proveedoresCatalog]);

  const selectedModalProviderRuc = findProveedorCatalog(proveedor)?.ruc || "";
  const selectedProveedorCatalog = findProveedorCatalog(proveedor);
  const selectedOcProviderRuc =
    selectedOc && "proveedor" in selectedOc
      ? findProveedorCatalog(selectedOc.proveedor)?.ruc || ""
      : "";

  const similarProveedor = useMemo(() => {
    if (!proveedor.trim() || selectedProveedorCatalog) return null;

    const result = findSimilarProveedor(proveedor);
    if (!result) return null;

    const exactMatch =
      normalizeProveedorKey(result.nombre) === normalizeProveedorKey(proveedor);
    return exactMatch ? null : result;
  }, [proveedor, proveedoresCatalog, selectedProveedorCatalog]);

  const resetNuevoProveedorForm = () => {
    setNuevoProveedor(initialNuevoProveedor);
    setShowNuevoProveedorForm(false);
  };

  const handleNuevoProveedorChange = (
    field: keyof ProveedorPayload,
    value: string,
  ) => {
    setNuevoProveedor((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreateProveedor = async () => {
    const nombre = nuevoProveedor.nombre.trim();
    if (!nombre) {
      showToast({
        title: "Nombre requerido",
        description: "Ingresa el nombre del proveedor.",
        type: "warning",
      });
      return;
    }

    if (!nuevoProveedor.ruc?.trim()) {
      showToast({
        title: "RUC requerido",
        description: "Ingresa el RUC del proveedor para poder emitir la OC.",
        type: "warning",
      });
      return;
    }

    const existingProveedor = proveedoresCatalog.find(
      (item) =>
        normalizeProveedorKey(item.nombre) === normalizeProveedorKey(nombre),
    );
    if (existingProveedor) {
      setProveedor(existingProveedor.nombre);
      setShowNuevoProveedorForm(false);
      showToast({
        title: "Proveedor existente",
        description: `Proveedor ${existingProveedor.nombre} ya existe y fue seleccionado.`,
        type: "info",
      });
      return;
    }

    try {
      setCreatingProveedor(true);
      const proveedorCreado = await createProveedor({
        ...nuevoProveedor,
        nombre,
        ruc: nuevoProveedor.ruc?.trim() || undefined,
      });
      setProveedoresCatalog((current) =>
        [...current, proveedorCreado].sort((a, b) =>
          a.nombre.localeCompare(b.nombre),
        ),
      );
      setProveedor(proveedorCreado.nombre);
      setShowNuevoProveedorForm(false);
      setNuevoProveedor(initialNuevoProveedor);
      showToast({
        title: "Proveedor creado",
        description: `Proveedor ${proveedorCreado.nombre} agregado y seleccionado.`,
        type: "success",
      });
      if (preview) {
        void handleProveedorChange(proveedorCreado.nombre);
      }
    } catch (error) {
      showToast({
        title: "Error al crear proveedor",
        description: getErrorMessage(error, "No se pudo crear el proveedor."),
        type: "error",
      });
    } finally {
      setCreatingProveedor(false);
    }
  };

  const loadEmitidas = useCallback(
    async (page = emitidasPagination.page) => {
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
          description: getErrorMessage(
            error,
            "No se pudo obtener la lista de OC emitidas.",
          ),
          type: "warning",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      emitidasPagination.page,
      estadoFilter,
      perPage,
      proveedorFilter,
      searchTerm,
      showToast,
    ],
  );

  const loadRecibidas = useCallback(
    async (page = recibidasPagination.page) => {
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
          description: getErrorMessage(
            error,
            "No se pudo obtener la lista de OC recibidas.",
          ),
          type: "warning",
        });
      } finally {
        setLoading(false);
      }
    },
    [estadoFilter, perPage, recibidasPagination.page, searchTerm, showToast],
  );

  useEffect(() => {
    let cancelled = false;

    const loadProveedores = async () => {
      try {
        const proveedores = await getProveedores({ per_page: 200 });
        if (!cancelled) setProveedoresCatalog(proveedores);
      } catch (error) {
        console.error("Error al cargar proveedores:", error);
      }
    };

    void loadProveedores();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshActiveTab = useCallback(() => {
    if (activeTab === "emitidas") {
      void loadEmitidas(emitidasPagination.page);
    } else {
      void loadRecibidas(recibidasPagination.page);
    }
  }, [
    activeTab,
    emitidasPagination.page,
    loadEmitidas,
    loadRecibidas,
    recibidasPagination.page,
  ]);

  useEffect(() => {
    if (activeTab === "emitidas") {
      void loadEmitidas(1);
    } else {
      void loadRecibidas(1);
    }
  }, [activeTab, estadoFilter, perPage, proveedorFilter, searchTerm]);

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
    if (!modalMode || !debouncedCotizacionId) return;
    const id = Number(debouncedCotizacionId);
    if (!id || id <= 0) return;

    void handleLoadPreview();
  }, [modalMode, debouncedCotizacionId]);

  useEffect(() => {
    if (!ocId) return;

    const isRecibidaRoute = location.pathname.includes(
      "/ordenes-compra/recibidas/",
    );
    const isEmitidaRoute = location.pathname.includes(
      "/ordenes-compra/emitidas/",
    );
    if (!isRecibidaRoute && !isEmitidaRoute) return;

    let cancelled = false;

    const loadDeepLinkedOc = async () => {
      try {
        setLoadingDetail(true);
        setSelectedOc(null);

        if (isRecibidaRoute) {
          setActiveTab("recibidas");
          const oc = await getOcRecibida(ocId);
          if (!cancelled) {
            setOcItemSeries(getOcSerieSelectionMap(oc));
            setSelectedOc(oc);
          }
          return;
        }

        setActiveTab("emitidas");
        const oc = await getOcEmitida(ocId);
        if (!cancelled) setSelectedOc(oc);
      } catch (error) {
        if (!cancelled) {
          showToast({
            title: "Error al abrir notificacion",
            description: getErrorMessage(
              error,
              "No se pudo cargar la orden de compra asociada.",
            ),
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
    setFactura(null);
    setFacturaNumero("");
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
      showToast({
        title: "Cotizacion requerida",
        description: "Ingresa el ID de cotizacion.",
        type: "warning",
      });
      return;
    }

    try {
      setPreviewLoading(true);
      const data =
        modalMode === "recibir"
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
          cliente_nombre:
            cotizacionData.cliente_nombre ?? data.cotizacion?.cliente_nombre,
          titulo: cotizacionData.titulo ?? data.cotizacion?.titulo,
          estado_cotizacion_id:
            cotizacionData.estado_cotizacion_id ??
            data.cotizacion?.estado_cotizacion_id,
        },
      };

      if (!isApprovedCotizacion(dataWithCotizacion)) {
        setPreview(dataWithCotizacion);
        setRecibidaItems([]);
        setEmitidaItems([]);
        const estadoRecibido =
          previewEstadoId(dataWithCotizacion) || "sin estado_cotizacion_id";
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
          cantidad_recibida: toNumber(
            item.cantidad_recibida ?? item.cantidad_pendiente ?? item.cantidad,
          ),
        })),
      );
      setEmitidaItems(
        buildEmitidaDraftItems(
          dataWithCotizacion.items,
          modalMode === "emitir" ? proveedor : undefined,
        ),
      );

      if (
        modalMode === "emitir" &&
        !proveedor &&
        dataWithCotizacion.proveedores?.[0]
      ) {
        const firstProveedor = dataWithCotizacion.proveedores[0];
        setProveedor(firstProveedor);
        setEmitidaItems(
          buildEmitidaDraftItems(dataWithCotizacion.items, firstProveedor),
        );
        void handleProveedorChange(firstProveedor);
      }
    } catch (error) {
      showToast({
        title: "No se pudo cargar el preview",
        description: getErrorMessage(
          error,
          "Verifica que la cotizacion exista y este disponible para OC.",
        ),
        type: "warning",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleProveedorChange = async (value: string) => {
    const cleaned = String(value ?? "").trim();
    const matchedProveedor = findProveedorCatalog(cleaned);
    const nextProveedor = matchedProveedor ? matchedProveedor.nombre : cleaned;
    setProveedor(nextProveedor);

    const id = Number(cotizacionId);
    if (!id || !nextProveedor) return;

    const fallbackPreview = emitidaBasePreview ?? preview;
    if (fallbackPreview) {
      setEmitidaItems(
        buildEmitidaDraftItems(fallbackPreview.items, nextProveedor),
      );
    }

    try {
      setPreviewLoading(true);
      const data = await getOcEmitidaItems(id, nextProveedor);
      const nextItems =
        data.items.length > 0 ? data.items : fallbackPreview?.items || [];
      const filteredItems =
        data.items.length > 0
          ? buildEmitidaDraftItems(nextItems)
          : buildEmitidaDraftItems(nextItems, nextProveedor);
      setPreview((current) => ({
        ...data,
        cotizacion: current?.cotizacion ?? fallbackPreview?.cotizacion,
        items: nextItems,
        proveedores:
          current?.proveedores ??
          fallbackPreview?.proveedores ??
          data.proveedores,
      }));
      setEmitidaItems(filteredItems);
    } catch (error) {
      if (!fallbackPreview) {
        showToast({
          title: "Error al filtrar proveedor",
          description: getErrorMessage(
            error,
            "No se pudieron obtener los items del proveedor.",
          ),
          type: "warning",
        });
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveRecibida = async () => {
    const id = Number(cotizacionId);
    const items = recibidaItems.filter(
      (item) => item.seleccionado && item.cantidad_recibida > 0,
    );

    if (!preview || !isApprovedCotizacion(preview)) {
      showToast({
        title: "Cotizacion no aprobada",
        description:
          "Carga una cotizacion aprobada antes de registrar la OC recibida.",
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
        description: getErrorMessage(
          error,
          "No se pudo registrar la OC recibida.",
        ),
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

    if (!selectedProveedorCatalog) {
      showToast({
        title: "Proveedor no registrado",
        description:
          "Debes seleccionar un proveedor registrado en la base de datos o crearlo antes de emitir la OC.",
        type: "warning",
      });
      return;
    }

    if (!selectedProveedorCatalog.ruc?.trim()) {
      showToast({
        title: "RUC faltante",
        description:
          "El proveedor seleccionado debe tener un RUC registrado para emitir la OC.",
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
        description: response?.pdf_url
          ? "PDF generado por el backend. Iniciando descarga..."
          : "La orden fue emitida correctamente.",
        type: "success",
      });
      const ocEmitidaId =
        response?.oc_emitida?.id ??
        response?.data?.oc_emitida?.id ??
        response?.id;

      if (ocEmitidaId) {
        try {
          await downloadOcEmitidaPdf(
            ocEmitidaId,
            `oc-emitida-${ocEmitidaId}.pdf`,
          );
        } catch (downloadError) {
          showToast({
            title: "OC emitida, PDF no descargado",
            description: getErrorMessage(
              downloadError,
              "Usa el boton de descarga en la tabla de OC emitidas.",
            ),
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
        description: getErrorMessage(
          error,
          "No se pudo emitir la orden de compra.",
        ),
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
        await uploadOcEmitidaDocumentos(documentTarget.id, {
          factura,
          comprobante_pago: comprobantePago,
          documentos_adicionales: documentosAdicionales,
        });
        setSelectedOc(await getOcEmitida(documentTarget.id));
      } else {
        await uploadOcRecibidaDocumentos(documentTarget.id, {
          orden_compra_cliente: ordenCompraCliente,
          guia_emision: guiaEmision,
          factura_numero: facturaNumero,
          factura,
          documentos_adicionales: documentosAdicionales,
        });
        const detail = await getOcRecibida(documentTarget.id);
        setOcItemSeries(getOcSerieSelectionMap(detail));
        setSelectedOc(detail);
      }

      showToast({
        title: "Documentos actualizados",
        description: "Los archivos fueron enviados al backend.",
        type: "success",
      });
      closeDocumentModal(true);
      refreshActiveTab();
    } catch (error) {
      showToast({
        title: "Error al subir documentos",
        description: getErrorMessage(
          error,
          "No se pudieron guardar los documentos.",
        ),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (
    tipo: string,
    additionalId?: number | string,
  ) => {
    if (!documentTarget) return;

    const confirmed = window.confirm(
      "Se eliminara el documento seleccionado. Deseas continuar?",
    );
    if (!confirmed) return;

    const isEmitida = "proveedor" in documentTarget;

    try {
      setSaving(true);
      if (isEmitida) {
        if (additionalId) {
          await deleteOcEmitidaDocumentoAdicional(
            documentTarget.id,
            additionalId,
          );
        } else {
          await deleteOcEmitidaDocumento(documentTarget.id, tipo);
        }
        const detail = await getOcEmitida(documentTarget.id);
        setDocumentTarget(detail);
        setSelectedOc(detail);
      } else {
        if (additionalId) {
          await deleteOcRecibidaDocumentoAdicional(
            documentTarget.id,
            additionalId,
          );
        } else {
          await deleteOcRecibidaDocumento(documentTarget.id, tipo);
        }
        const detail = await getOcRecibida(documentTarget.id);
        setDocumentTarget(detail);
        setOcItemSeries(getOcSerieSelectionMap(detail));
        setSelectedOc(detail);
      }

      showToast({
        title: "Documento eliminado",
        description: "El archivo fue retirado de la orden de compra.",
        type: "success",
      });
      refreshActiveTab();
    } catch (error) {
      showToast({
        title: "No se pudo eliminar el documento",
        description: getErrorMessage(error, "Verifica tu sesion o permisos."),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleViewRecibida = async (oc: OcRecibida) => {
    setSelectedOc(oc);
    setOcItemSeries({});
    try {
      setLoadingDetail(true);
      const detail = await getOcRecibida(oc.id);
      setOcItemSeries(getOcSerieSelectionMap(detail));
      setSelectedOc(detail);
    } catch (error) {
      showToast({
        title: "Error al cargar detalle",
        description: getErrorMessage(
          error,
          "No se pudo obtener el detalle de la OC recibida.",
        ),
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
        description: getErrorMessage(
          error,
          "No se pudo obtener el detalle de la OC emitida.",
        ),
        type: "warning",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const getAvailableItemSeries = (item: OcRecibidaItem, oc?: OcRecibida) =>
    getSelectableItemSeries(item, oc);

  const handleSelectOcItemSeries = (itemId: number, serieId: number) => {
    setOcItemSeries((current) => {
      const selected = current[itemId] || [];

      return {
        ...current,
        [itemId]: selected.includes(serieId)
          ? selected.filter((id) => id !== serieId)
          : [...selected, serieId],
      };
    });
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
        description: getErrorMessage(
          error,
          "Verifica que el PDF exista y que tu sesion siga activa.",
        ),
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
    if (field === "comprado") {
      showToast({
        title: "Comprado automatico",
        description:
          "Este estado se marca segun conversion o stock interno reservado.",
        type: "warning",
      });
      return;
    }
    if (field === "entregado" && checked && !item.comprado) {
      showToast({
        title: "Item no comprado",
        description:
          "Primero debe estar comprado con stock interno reservado para poder marcarlo como entregado.",
        type: "warning",
      });
      return;
    }
    const availableSeries = getAvailableItemSeries(item, oc);
    const selectedSeries =
      ocItemSeries[item.id] || getAssignedItemSerieIds(item, oc);

    if (field === "entregado" && checked && itemRequiresSeries(item)) {
      const cantidad = Number(item.cantidad_recibida || 0);

      if (!Number.isInteger(cantidad)) {
        showToast({
          title: "Cantidad no valida",
          description:
            "Para productos con series, la cantidad entregada debe ser entera.",
          type: "warning",
        });
        return;
      }

      if (selectedSeries.length !== cantidad) {
        showToast({
          title: "Selecciona las series",
          description: `Debes seleccionar ${cantidad} serie(s) para este item antes de marcarlo como entregado.`,
          type: "warning",
        });
        return;
      }
    }

    const nextItems = oc.items.map((row) => ({
      id: row.id,
      comprado: Boolean(row.comprado),
      entregado:
        row.id === item.id && field === "entregado"
          ? checked
          : Boolean(row.entregado),
      producto_serie_ids:
        row.id === item.id ? selectedSeries : ocItemSeries[row.id] || [],
    }));
    try {
      setUpdatingItemOc(oc.id);
      await updateOcRecibidaItems(oc.id, { items: nextItems });
      const detail = await getOcRecibida(oc.id);
      setOcItemSeries(getOcSerieSelectionMap(detail));
      setSelectedOc(detail);
      showToast({
        title: "Items actualizados",
        description:
          "Entregado fue sincronizado y comprado se recalculo con inventario.",
        type: "success",
      });
      void loadRecibidas(recibidasPagination.page);
    } catch (error) {
      showToast({
        title: "Error al actualizar items",
        description: getErrorMessage(
          error,
          "No se pudo actualizar el estado de los items.",
        ),
        type: "error",
      });
    } finally {
      setUpdatingItemOc(null);
    }
  };

  const resetDocumentFiles = () => {
    setFactura(null);
    setFacturaNumero("");
    setComprobantePago(null);
    setOrdenCompraCliente(null);
    setGuiaEmision(null);
    setDocumentosAdicionales([]);
  };

  const handleCancelRecibida = async (oc: OcRecibida) => {
    if (!canCancelRecibida(oc)) return;

    const confirmed = window.confirm(
      `Se cancelara ${getOcLabel(oc)} y se liberaran sus reservas de inventario. Deseas continuar?`,
    );

    if (!confirmed) return;

    try {
      setUpdatingItemOc(oc.id);
      await cancelarOcRecibida(oc.id);
      showToast({
        title: "OC cancelada",
        description: "Las reservas asociadas fueron liberadas.",
        type: "success",
      });

      if (
        selectedOc &&
        "fecha_recepcion" in selectedOc &&
        Number(selectedOc.id) === Number(oc.id)
      ) {
        const detail = await getOcRecibida(oc.id);
        setOcItemSeries(getOcSerieSelectionMap(detail));
        setSelectedOc(detail);
      }

      void loadRecibidas(recibidasPagination.page);
    } catch (error) {
      showToast({
        title: "No se pudo cancelar la OC",
        description: getErrorMessage(
          error,
          "Revisa si la OC ya fue atendida o si tiene salidas de inventario.",
        ),
        type: "error",
      });
    } finally {
      setUpdatingItemOc(null);
    }
  };

  const openDocumentModal = (oc: OcEmitida | OcRecibida) => {
    resetDocumentFiles();
    setDocumentTarget(oc);
  };

  const closeDocumentModal = (force = false) => {
    if (saving && !force) return;
    setDocumentTarget(null);
    resetDocumentFiles();
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

        {canCreateOc && (
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
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard
          icon={<Send size={22} />}
          label="OC emitidas"
          value={emitidasPagination.total}
          tone="blue"
        />
        <SummaryCard
          icon={<ClipboardCheck size={22} />}
          label="OC recibidas"
          value={recibidasPagination.total}
          tone="emerald"
        />
        <SummaryCard
          icon={<AlertTriangle size={22} />}
          label="Doc. pendientes"
          value={
            [...emitidas, ...recibidas].filter(
              (oc) => oc.documentos_completos === false,
            ).length
          }
          tone="amber"
        />
        <SummaryCard
          icon={<CheckCircle size={22} />}
          label="Atendidas"
          value={
            [...emitidas, ...recibidas].filter((oc) => oc.estado === "atendido")
              .length
          }
          tone="slate"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-gray-200 p-2 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-950 sm:w-[420px]">
            <TabButton
              active={activeTab === "recibidas"}
              onClick={() => setActiveTab("recibidas")}
              icon={<ClipboardCheck size={16} />}
              label="OC recibidas"
            />
            <TabButton
              active={activeTab === "emitidas"}
              onClick={() => setActiveTab("emitidas")}
              icon={<Send size={16} />}
              label="OC emitidas"
            />
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
              {(activeTab === "emitidas"
                ? Object.keys(estadoEmitidaLabels)
                : Object.keys(estadoRecibidaLabels)
              ).map((estado) => (
                <option key={estado} value={estado}>
                  {
                    (activeTab === "emitidas"
                      ? estadoEmitidaLabels
                      : estadoRecibidaLabels)[estado]
                  }
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
              onDocuments={openDocumentModal}
              onDownloadPdf={handleDownloadEmitidaPdf}
              canEditOc={canEditOc}
              canUploadDocuments={canUploadOcDocuments}
            />
          ) : (
            <RecibidasTable
              rows={recibidas}
              onView={handleViewRecibida}
              onDocuments={openDocumentModal}
              onCancel={handleCancelRecibida}
              onToggleItem={handleToggleRecibidaItem}
              updatingItemOc={updatingItemOc}
              canEditOc={canEditOc}
              canUploadDocuments={canUploadOcDocuments}
              canCancelOc={canCancelRecibida}
            />
          )}
        </div>

        {currentPagination.total > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:gap-4">
              <span>
                Mostrando {currentPagination.from} a {currentPagination.to} de{" "}
                {currentPagination.total}
              </span>
              <PageSizeSelect
                value={perPage}
                onChange={(value) => {
                  setPerPage(value);
                  setEmitidasPagination((prev) => ({ ...prev, page: 1 }));
                  setRecibidasPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>
            {currentPagination.totalPages > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <PageButton
                  disabled={currentPagination.page <= 1}
                  onClick={() =>
                    activeTab === "emitidas"
                      ? loadEmitidas(currentPagination.page - 1)
                      : loadRecibidas(currentPagination.page - 1)
                  }
                >
                  <ChevronLeft size={17} />
                </PageButton>
                {paginationItems.map((item) =>
                  typeof item === "number" ? (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        activeTab === "emitidas"
                          ? loadEmitidas(item)
                          : loadRecibidas(item)
                      }
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        currentPagination.page === item
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {item}
                    </button>
                  ) : (
                    <span key={item} className="px-1 text-slate-400">
                      ...
                    </span>
                  ),
                )}
                <PageButton
                  disabled={
                    currentPagination.page >= currentPagination.totalPages
                  }
                  onClick={() =>
                    activeTab === "emitidas"
                      ? loadEmitidas(currentPagination.page + 1)
                      : loadRecibidas(currentPagination.page + 1)
                  }
                >
                  <ChevronRight size={17} />
                </PageButton>
              </div>
            )}
          </div>
        )}
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[30px] bg-white shadow-2xl dark:bg-slate-950">
            <ModalHeader
              title={
                modalMode === "emitir"
                  ? "Emitir OC a proveedor"
                  : "Registrar OC recibida"
              }
              onClose={closeCreateModal}
            />
            <div className="space-y-5 p-6">
              <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Preview automático
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Ingresa el ID de cotizaci&oacute;n y el preview se
                  actualizar&aacute; autom&aacute;ticamente. Si necesitas forzar
                  una recarga, usa el bot&oacute;n de actualizar.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.3fr_0.9fr_0.8fr]">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    ID cotizacion
                  </span>
                  <input
                    type="number"
                    value={cotizacionId}
                    onChange={(event) => setCotizacionId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {modalMode === "emitir"
                      ? "Fecha emision"
                      : "Fecha recepcion"}
                  </span>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(event) => setFecha(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleLoadPreview}
                    disabled={previewLoading}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {previewLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Eye size={16} />
                    )}
                    Actualizar
                  </button>
                </div>
              </div>

              {modalMode === "emitir" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Proveedor
                    </span>
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <input
                        list="proveedor-list"
                        value={proveedor}
                        onChange={(event) =>
                          void handleProveedorChange(event.target.value)
                        }
                        placeholder="Escribe o selecciona proveedor"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowNuevoProveedorForm((current) => !current)
                        }
                        className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        {showNuevoProveedorForm
                          ? "Cancelar"
                          : "Nuevo proveedor"}
                      </button>
                    </div>
                    <datalist id="proveedor-list">
                      {proveedorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {selectedModalProviderRuc ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-200">
                        <span>Proveedor registrado</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-700/30 dark:text-emerald-100">
                          RUC: {selectedModalProviderRuc}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold">
                          Proveedor no seleccionado o no registrado
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Escribe un proveedor válido y el sistema te mostrará
                          coincidencias con los proveedores registrados.
                        </p>
                      </div>
                    )}
                  </div>

                  {similarProveedor &&
                    !selectedProveedorCatalog &&
                    proveedor.trim() && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-200">
                        <p className="font-semibold">
                          ¿Tu proveedor es{" "}
                          <span className="text-slate-900 dark:text-white">
                            {similarProveedor.nombre}
                          </span>
                          ?
                        </p>
                        {similarProveedor.ruc && (
                          <p className="text-xs">RUC: {similarProveedor.ruc}</p>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            void handleProveedorChange(similarProveedor.nombre)
                          }
                          className="mt-2 inline-flex items-center justify-center rounded-2xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                          Sí, usar proveedor registrado
                        </button>
                      </div>
                    )}

                  {showNuevoProveedorForm && (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase text-slate-500">
                            Nombre del proveedor
                          </span>
                          <input
                            value={nuevoProveedor.nombre}
                            onChange={(event) =>
                              handleNuevoProveedorChange(
                                "nombre",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase text-slate-500">
                            RUC
                          </span>
                          <input
                            value={nuevoProveedor.ruc || ""}
                            onChange={(event) =>
                              handleNuevoProveedorChange(
                                "ruc",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={resetNuevoProveedorForm}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateProveedor}
                          disabled={
                            creatingProveedor || !nuevoProveedor.nombre.trim()
                          }
                          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {creatingProveedor
                            ? "Guardando..."
                            : "Crear proveedor"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {preview?.cotizacion && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                  <span className="font-semibold">
                    {getPreviewCotizacionLabel(preview, cotizacionId)}
                  </span>
                  {preview.cotizacion.cliente_nombre
                    ? ` - ${preview.cotizacion.cliente_nombre}`
                    : ""}
                </div>
              )}

              {modalMode === "recibir" ? (
                <RecibidaDraftTable
                  rows={recibidaItems}
                  setRows={setRecibidaItems}
                />
              ) : (
                <EmitidaDraftTable
                  rows={emitidaItems}
                  setRows={setEmitidaItems}
                />
              )}

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Observaciones
                </span>
                <textarea
                  value={observaciones}
                  onChange={(event) => setObservaciones(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              {modalMode === "recibir" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FileInput
                    label="Orden de compra cliente"
                    file={ordenCompraCliente}
                    onFileChange={setOrdenCompraCliente}
                  />
                  <FileInput
                    label="Guia de emision"
                    file={guiaEmision}
                    onFileChange={setGuiaEmision}
                  />
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
                onClick={
                  modalMode === "emitir"
                    ? handleSaveEmitida
                    : handleSaveRecibida
                }
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <FilePlus2 size={17} />
                )}
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
          canEditOc={canEditOc(selectedOc)}
          onClose={() => setSelectedOc(null)}
          onToggleItem={handleToggleRecibidaItem}
          selectedSeries={ocItemSeries}
          selectedOcProviderRuc={selectedOcProviderRuc}
          onSelectSerie={handleSelectOcItemSeries}
        />
      )}

      {documentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
            <ModalHeader
              title={`Subir documentos - ${getOcLabel(documentTarget)}`}
              onClose={closeDocumentModal}
            />
            <div className="space-y-4 p-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Documentos subidos
                  </h3>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-950">
                    {getManagedDocumentLinks(documentTarget).length}
                  </span>
                </div>
                {getManagedDocumentLinks(documentTarget).length > 0 ? (
                  <div className="space-y-2">
                    {getManagedDocumentLinks(documentTarget).map((document) => (
                      <div
                        key={`${document.key}-${document.url}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                            {document.label}
                          </p>
                          <p className="text-xs text-slate-500">
                            {document.additional
                              ? "Documento adicional"
                              : "Documento unico"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <a
                            href={document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                            title="Ver documento"
                          >
                            <Eye size={15} />
                          </a>
                          {canDeleteOcDocument(documentTarget, document) && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteDocument(
                                  document.tipo || "",
                                  document.id,
                                )
                              }
                              disabled={saving}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Eliminar documento"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Aun no hay documentos subidos para esta orden.
                  </p>
                )}
              </div>
              {"proveedor" in documentTarget ? (
                <>
                  {!hasOcDocument(documentTarget, "factura") && (
                    <FileInput
                      label="Factura"
                      file={factura}
                      onFileChange={setFactura}
                    />
                  )}
                  {!hasOcDocument(documentTarget, "comprobante_pago") && (
                    <FileInput
                      label="Comprobante de pago"
                      file={comprobantePago}
                      onFileChange={setComprobantePago}
                    />
                  )}
                </>
              ) : (
                <>
                  {!hasOcDocument(documentTarget, "orden_compra_cliente") && (
                    <FileInput
                      label="Orden de compra cliente"
                      file={ordenCompraCliente}
                      onFileChange={setOrdenCompraCliente}
                    />
                  )}
                  {!hasOcDocument(documentTarget, "guia_emision") && (
                    <FileInput
                      label="Guia de emision"
                      file={guiaEmision}
                      onFileChange={setGuiaEmision}
                    />
                  )}
                  {(!hasOcDocument(documentTarget, "factura") ||
                    !(documentTarget as OcRecibida).factura_numero) && (
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Numero de factura
                      <input
                        value={facturaNumero}
                        onChange={(event) =>
                          setFacturaNumero(event.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </label>
                  )}
                  {!hasOcDocument(documentTarget, "factura") && (
                    <FileInput
                      label="Factura"
                      file={factura}
                      onFileChange={setFactura}
                    />
                  )}
                </>
              )}
              <MultipleFileInput
                label="Documentos adicionales"
                files={documentosAdicionales}
                onFilesChange={setDocumentosAdicionales}
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-slate-800">
              <button
                type="button"
                onClick={() => closeDocumentModal()}
                disabled={saving}
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
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Upload size={17} />
                )}
                Subir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "blue" | "emerald" | "amber" | "slate";
}) {
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
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-200"
          : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-slate-800">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
        {title}
      </h2>
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

function FileInput({
  label,
  file,
  onFileChange,
}: {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleRemove = () => {
    onFileChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Paperclip size={16} /> {label}
      </span>
      <input
        ref={inputRef}
        type="file"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        className="w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700"
      />
      {file && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate font-semibold">{file.name}</span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="shrink-0 rounded-md p-1 text-blue-700 hover:bg-blue-100 dark:text-blue-100 dark:hover:bg-blue-900/60"
            title="Quitar archivo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function MultipleFileInput({
  label,
  files,
  onFilesChange,
}: {
  label: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files || []);
    if (nextFiles.length > 0) {
      onFilesChange([...files, ...nextFiles]);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
  };

  return (
    <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Paperclip size={16} /> {label}
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleChange}
        className="w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-blue-700"
      />
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs text-blue-800 dark:border-blue-900/60 dark:bg-slate-950 dark:text-blue-100"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate font-semibold">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="shrink-0 rounded-md p-1 text-blue-700 hover:bg-blue-100 dark:text-blue-100 dark:hover:bg-blue-900/60"
                title="Quitar archivo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmitidasTable({
  rows,
  onView,
  onDocuments,
  onDownloadPdf,
  canEditOc,
  canUploadDocuments,
}: {
  rows: OcEmitida[];
  onView: (oc: OcEmitida) => void;
  onDocuments: (oc: OcEmitida) => void;
  onDownloadPdf: (oc: OcEmitida) => void;
  canEditOc: (oc: OcEmitida) => boolean;
  canUploadDocuments: (oc: OcEmitida) => boolean;
}) {
  return (
    <>
      <div className="grid gap-3 p-4 lg:hidden">
        {rows.length ? (
          rows.map((oc) => (
            <div
              key={oc.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-blue-600">
                    {getOcLabel(oc)}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {getCotizacionLabel(oc)}
                  </p>
                </div>
                <EstadoBadge estado={oc.estado} labels={estadoEmitidaLabels} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Proveedor
                  </p>
                  <p className="mt-1 truncate font-medium text-slate-700 dark:text-slate-200">
                    {oc.proveedor || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Fecha
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <Calendar size={14} />
                    {formatDate(oc.fecha_emision)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Total
                  </p>
                  <p className="mt-1 font-bold text-slate-900 dark:text-slate-100">
                    {formatMoney(oc.total, "S/")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Documentos
                  </p>
                  <div className="mt-1">
                    <DocumentStatus oc={oc} />
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-slate-800">
                <IconButton
                  title="Ver detalle"
                  onClick={() => onView(oc)}
                  icon={<Eye size={17} />}
                />
                <IconButton
                  title={
                    canUploadDocuments(oc)
                      ? "Subir documentos"
                      : "No tienes permisos para subir documentos"
                  }
                  onClick={() => onDocuments(oc)}
                  icon={<Upload size={17} />}
                  disabled={!canUploadDocuments(oc)}
                />
                <button
                  type="button"
                  onClick={() => onDownloadPdf(oc)}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                  title="Descargar PDF"
                >
                  <Download size={17} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
            No hay registros
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto lg:block">
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
              <th className="sticky right-0 z-10 bg-gray-50 px-5 py-4 text-center shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)] dark:bg-slate-950">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((oc) => (
                <tr
                  key={oc.id}
                  className="border-t border-gray-100 text-sm dark:border-slate-800"
                >
                  <td className="px-5 py-4 font-semibold text-blue-600">
                    {getOcLabel(oc)}
                  </td>
                  <td className="px-5 py-4">{getCotizacionLabel(oc)}</td>
                  <td className="px-5 py-4">{oc.proveedor || "N/A"}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2">
                      <Calendar size={15} />
                      {formatDate(oc.fecha_emision)}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {formatMoney(oc.total, "S/")}
                  </td>
                  <td className="px-5 py-4">
                    <DocumentStatus oc={oc} />
                  </td>
                  <td className="px-5 py-4">
                    <EstadoBadge
                      estado={oc.estado}
                      labels={estadoEmitidaLabels}
                    />
                  </td>
                  <td className="sticky right-0 bg-white px-5 py-4 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)] dark:bg-slate-950">
                    <div className="flex justify-center gap-2">
                      <IconButton
                        title="Ver detalle"
                        onClick={() => onView(oc)}
                        icon={<Eye size={17} />}
                      />
                      <IconButton
                        title={
                          canUploadDocuments(oc)
                            ? "Subir documentos"
                            : "No tienes permisos para subir documentos"
                        }
                        onClick={() => onDocuments(oc)}
                        icon={<Upload size={17} />}
                        disabled={!canUploadDocuments(oc)}
                      />
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
              ))
            ) : (
              <EmptyRow colSpan={8} />
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RecibidasTable({
  rows,
  onView,
  onDocuments,
  onCancel,
  onToggleItem,
  updatingItemOc,
  canEditOc,
  canUploadDocuments,
  canCancelOc,
}: {
  rows: OcRecibida[];
  onView: (oc: OcRecibida) => void;
  onDocuments: (oc: OcRecibida) => void;
  onCancel: (oc: OcRecibida) => void;
  onToggleItem: (
    oc: OcRecibida,
    item: OcRecibidaItem,
    field: "comprado" | "entregado",
    checked: boolean,
  ) => void;
  updatingItemOc: number | null;
  canEditOc: (oc: OcRecibida) => boolean;
  canUploadDocuments: (oc: OcRecibida) => boolean;
  canCancelOc: (oc: OcRecibida) => boolean;
}) {
  return (
    <>
      <div className="grid gap-3 p-4 lg:hidden">
        {rows.length ? (
          rows.map((oc) => (
            <div
              key={oc.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-emerald-600">
                    {getOcLabel(oc)}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {getCotizacionLabel(oc)}
                  </p>
                </div>
                <EstadoBadge estado={oc.estado} labels={estadoRecibidaLabels} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Fecha
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <Calendar size={14} />
                    {formatDate(oc.fecha_recepcion)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Documentos
                  </p>
                  <div className="mt-1">
                    <DocumentStatus oc={oc} />
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {(oc.items || []).length > 0 ? (
                  (oc.items || []).slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900"
                    >
                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                        {itemDescription(item)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-slate-500">
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={Boolean(item.comprado)}
                            disabled
                            onChange={(event) =>
                              onToggleItem(
                                oc,
                                item,
                                "comprado",
                                event.target.checked,
                              )
                            }
                          />
                          Comprado
                        </label>
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={Boolean(item.entregado)}
                            disabled={
                              updatingItemOc === oc.id ||
                              !canEditOc(oc) ||
                              !item.comprado
                            }
                            onChange={(event) =>
                              onToggleItem(
                                oc,
                                item,
                                "entregado",
                                event.target.checked,
                              )
                            }
                          />
                          Entregado
                        </label>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {getOcItemsCount(oc)} items
                  </span>
                )}
                {(oc.items || []).length > 2 && (
                  <p className="text-xs text-slate-400">
                    +{(oc.items || []).length - 2} items mas
                  </p>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-slate-800">
                <IconButton
                  title="Ver detalle"
                  onClick={() => onView(oc)}
                  icon={<Eye size={17} />}
                />
                <IconButton
                  title={
                    canUploadDocuments(oc)
                      ? "Subir documentos"
                      : "No tienes permisos para subir documentos"
                  }
                  onClick={() => onDocuments(oc)}
                  icon={<Upload size={17} />}
                  disabled={!canUploadDocuments(oc)}
                />
                <IconButton
                  title={
                    canCancelOc(oc)
                      ? "Cancelar OC y liberar reservas"
                      : "Solo se puede cancelar antes de atender"
                  }
                  onClick={() => onCancel(oc)}
                  icon={<X size={17} />}
                  disabled={!canCancelOc(oc) || updatingItemOc === oc.id}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
            No hay registros
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1080px]">
          <thead className="bg-gray-50 text-left text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            <tr>
              <th className="px-5 py-4">OC</th>
              <th className="px-5 py-4">Cotizacion</th>
              <th className="px-5 py-4">Fecha</th>
              <th className="px-5 py-4">Items</th>
              <th className="px-5 py-4">Documentos</th>
              <th className="px-5 py-4">Estado</th>
              <th className="sticky right-0 z-10 bg-gray-50 px-5 py-4 text-center shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)] dark:bg-slate-950">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((oc) => (
                <tr
                  key={oc.id}
                  className="border-t border-gray-100 align-top text-sm dark:border-slate-800"
                >
                  <td className="px-5 py-4 font-semibold text-emerald-600">
                    {getOcLabel(oc)}
                  </td>
                  <td className="px-5 py-4">{getCotizacionLabel(oc)}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2">
                      <Calendar size={15} />
                      {formatDate(oc.fecha_recepcion)}
                    </span>
                  </td>
                  <td className="sticky right-0 bg-white px-5 py-4 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.35)] dark:bg-slate-950">
                    <div className="space-y-2">
                      {(oc.items || []).length > 0 ? (
                        (oc.items || []).slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950"
                          >
                            <span className="min-w-[180px] text-slate-700 dark:text-slate-200">
                              {itemDescription(item)}
                            </span>
                            <label className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <input
                                type="checkbox"
                                checked={Boolean(item.comprado)}
                                disabled
                                onChange={(event) =>
                                  onToggleItem(
                                    oc,
                                    item,
                                    "comprado",
                                    event.target.checked,
                                  )
                                }
                                title="Se marca automaticamente cuando el item tiene producto interno reservado con stock suficiente"
                              />
                              Comprado
                            </label>
                            <label className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <input
                                type="checkbox"
                                checked={Boolean(item.entregado)}
                                disabled={
                                  updatingItemOc === oc.id ||
                                  !canEditOc(oc) ||
                                  !item.comprado
                                }
                                onChange={(event) =>
                                  onToggleItem(
                                    oc,
                                    item,
                                    "entregado",
                                    event.target.checked,
                                  )
                                }
                                title={
                                  !item.comprado
                                    ? "Primero debe estar comprado"
                                    : canEditOc(oc)
                                      ? "Marcar entregado"
                                      : "Solo el usuario que registro esta OC puede editarla"
                                }
                              />
                              Entregado
                            </label>
                          </div>
                        ))
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {getOcItemsCount(oc)} items
                        </span>
                      )}
                      {(oc.items || []).length > 3 && (
                        <p className="text-xs text-slate-400">
                          +{(oc.items || []).length - 3} items mas
                        </p>
                      )}
                      {updatingItemOc === oc.id && (
                        <p className="inline-flex items-center gap-2 text-xs text-blue-600">
                          <Loader2 size={13} className="animate-spin" />{" "}
                          Sincronizando
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <DocumentStatus oc={oc} />
                  </td>
                  <td className="px-5 py-4">
                    <EstadoBadge
                      estado={oc.estado}
                      labels={estadoRecibidaLabels}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-center gap-2">
                      <IconButton
                        title="Ver detalle"
                        onClick={() => onView(oc)}
                        icon={<Eye size={17} />}
                      />
                      <IconButton
                        title={
                          canUploadDocuments(oc)
                            ? "Subir documentos"
                            : "No tienes permisos para subir documentos"
                        }
                        onClick={() => onDocuments(oc)}
                        icon={<Upload size={17} />}
                        disabled={!canUploadDocuments(oc)}
                      />
                      <IconButton
                        title={
                          canCancelOc(oc)
                            ? "Cancelar OC y liberar reservas"
                            : "Solo se puede cancelar antes de atender"
                        }
                        onClick={() => onCancel(oc)}
                        icon={<X size={17} />}
                        disabled={!canCancelOc(oc) || updatingItemOc === oc.id}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={7} />
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RecibidaDraftTable({
  rows,
  setRows,
}: {
  rows: RecibidaDraftItem[];
  setRows: React.Dispatch<React.SetStateAction<RecibidaDraftItem[]>>;
}) {
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
            <tr
              key={item.cotizacion_item_id}
              className="border-t border-gray-100 dark:border-slate-800"
            >
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={item.seleccionado}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, seleccionado: event.target.checked }
                          : row,
                      ),
                    )
                  }
                />
              </td>
              <td className="px-4 py-3">{item.descripcion}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  value={item.cantidad_recibida}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? {
                              ...row,
                              cantidad_recibida: Number(event.target.value),
                            }
                          : row,
                      ),
                    )
                  }
                  className="w-32 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </td>
            </tr>
          ))}
          {!rows.length && (
            <EmptyRow colSpan={3} message="No hay items para mostrar." />
          )}
        </tbody>
      </table>
    </div>
  );
}

function EmitidaDraftTable({
  rows,
  setRows,
}: {
  rows: EmitidaDraftItem[];
  setRows: React.Dispatch<React.SetStateAction<EmitidaDraftItem[]>>;
}) {
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
            <tr
              key={item.cotizacion_item_id}
              className="border-t border-gray-100 dark:border-slate-800"
            >
              <td className="px-4 py-3">{item.descripcion}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  value={item.cantidad}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, cantidad: Number(event.target.value) }
                          : row,
                      ),
                    )
                  }
                  className="w-28 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.precio_unitario}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? {
                              ...row,
                              precio_unitario: Number(event.target.value),
                            }
                          : row,
                      ),
                    )
                  }
                  className="w-32 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                />
              </td>
              <td className="px-4 py-3 font-semibold">
                {formatMoney(item.cantidad * item.precio_unitario, "S/")}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <EmptyRow
              colSpan={4}
              message="Selecciona un proveedor para ver los items de la cotizacion."
            />
          )}
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
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            oc.documentos_completos
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          <CheckCircle size={13} />{" "}
          {oc.documentos_completos ? "Completos" : "Con archivos"}
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
          <p className="max-w-[220px] text-xs text-slate-500">
            Faltan: {oc.documentos_faltantes.join(", ")}
          </p>
        )}
      </div>
    );
  }

  if (oc.documentos_completos) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle size={13} /> Completos
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        <AlertTriangle size={13} /> Pendientes
      </span>
      {!!oc.documentos_faltantes?.length && (
        <p className="max-w-[220px] text-xs text-slate-500">
          {oc.documentos_faltantes.join(", ")}
        </p>
      )}
    </div>
  );
}

function EstadoBadge({
  estado,
  labels,
}: {
  estado?: string;
  labels: Record<string, string>;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(estado)}`}
    >
      {labels[estado || ""] || estado || "N/A"}
    </span>
  );
}

function IconButton({
  title,
  onClick,
  icon,
  disabled = false,
}: {
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-slate-800 dark:text-slate-200"
      title={title}
    >
      {icon}
    </button>
  );
}

function EmptyRow({
  colSpan,
  message = "No hay ordenes de compra para mostrar.",
}: {
  colSpan: number;
  message?: string;
}) {
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
  canEditOc,
  onClose,
  onToggleItem,
  selectedSeries,
  selectedOcProviderRuc,
  onSelectSerie,
}: {
  oc: OcEmitida | OcRecibida;
  loading: boolean;
  updatingItemOc: number | null;
  canEditOc: boolean;
  onClose: () => void;
  onToggleItem: (
    oc: OcRecibida,
    item: OcRecibidaItem,
    field: "comprado" | "entregado",
    checked: boolean,
  ) => void;
  selectedSeries: Record<number, number[]>;
  selectedOcProviderRuc: string;
  onSelectSerie: (itemId: number, serieId: number) => void;
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
            <InfoTile
              icon={<FileText size={18} />}
              label="Cotizacion"
              value={getCotizacionLabel(oc)}
            />
            <InfoTile
              icon={<FileText size={18} />}
              label="Cliente"
              value={getCotizacionCliente(oc)}
            />
            <InfoTile
              icon={<FileText size={18} />}
              label="Titulo"
              value={getCotizacionTitulo(oc)}
            />
            <InfoTile
              icon={<Calendar size={18} />}
              label={isEmitida ? "Fecha emision" : "Fecha recepcion"}
              value={formatDate(
                isEmitida
                  ? (oc as OcEmitida).fecha_emision
                  : (oc as OcRecibida).fecha_recepcion,
              )}
            />
            <InfoTile
              icon={
                isEmitida ? <Truck size={18} /> : <PackageCheck size={18} />
              }
              label="Estado"
              value={
                isEmitida
                  ? estadoEmitidaLabels[oc.estado] || oc.estado
                  : estadoRecibidaLabels[oc.estado] || oc.estado
              }
            />
          </div>
          {isEmitida && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <InfoTile
                icon={<Truck size={18} />}
                label="Proveedor"
                value={(oc as OcEmitida).proveedor || "N/A"}
              />
              <InfoTile
                icon={<FileText size={18} />}
                label="RUC proveedor"
                value={selectedOcProviderRuc || "N/A"}
              />
              <InfoTile
                icon={<FileText size={18} />}
                label="Subtotal"
                value={formatMoney((oc as OcEmitida).subtotal, "S/")}
              />
              <InfoTile
                icon={<FileText size={18} />}
                label="IGV"
                value={formatMoney((oc as OcEmitida).igv, "S/")}
              />
              <InfoTile
                icon={<FileText size={18} />}
                label="Total"
                value={formatMoney((oc as OcEmitida).total, "S/")}
              />
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
            <div className="border-b border-gray-200 p-4 font-semibold text-slate-800 dark:border-slate-800 dark:text-white">
              Items
            </div>
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
                  {items.map((item: any) => {
                    const availableSeries = getSelectableItemSeries(
                      item as OcRecibidaItem,
                      oc as OcRecibida,
                    );
                    const currentSeries =
                      selectedSeries[item.id] ||
                      getAssignedItemSerieIds(
                        item as OcRecibidaItem,
                        oc as OcRecibida,
                      );
                    const cantidadRecibida = Number(
                      item.cantidad_recibida || 0,
                    );
                    const itemHasSoldSeries = hasSoldAssignedSeries(
                      item as OcRecibidaItem,
                      oc as OcRecibida,
                    );

                    return (
                      <tr
                        key={item.id}
                        className="border-t border-gray-100 dark:border-slate-800"
                      >
                        <td className="px-4 py-3">
                          <div>{itemDescription(item)}</div>
                          {!isEmitida && availableSeries.length > 0 && (
                            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-blue-900">
                                  Series a entregar
                                </span>
                                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-blue-700">
                                  {currentSeries.length}/{cantidadRecibida}
                                </span>
                              </div>
                              <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                                {availableSeries.map((serie: any) => (
                                  <label
                                    key={serie.id}
                                    className="flex cursor-pointer items-start gap-2 rounded-md border border-blue-100 bg-white px-2 py-1.5 text-xs text-slate-700 hover:bg-blue-50"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={currentSeries.includes(
                                        Number(serie.id),
                                      )}
                                      onChange={() =>
                                        onSelectSerie(
                                          Number(item.id),
                                          Number(serie.id),
                                        )
                                      }
                                      disabled={!canEditOc || itemHasSoldSeries}
                                      className="mt-0.5"
                                    />
                                    <span className="min-w-0">
                                      <span className="block font-semibold">
                                        {serie.serie || `Serie #${serie.id}`}
                                      </span>
                                      <span className="block text-[11px] text-slate-500">
                                        {[
                                          serie.factura_numero
                                            ? `Factura ${serie.factura_numero}`
                                            : null,
                                          serie.fecha_ingreso
                                            ? `Ingreso ${formatDate(serie.fecha_ingreso)}`
                                            : null,
                                        ]
                                          .filter(Boolean)
                                          .join(" / ") || "Sin datos"}
                                        {serie.estado && ` / ${serie.estado}`}
                                      </span>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.cantidad ?? item.cantidad_recibida ?? "N/A"}
                        </td>
                        {isEmitida ? (
                          <td className="px-4 py-3">
                            {formatMoney(item.precio_unitario, "S/")}
                          </td>
                        ) : (
                          <>
                            <td className="px-4 py-3">
                              <label className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.comprado)}
                                  disabled
                                  onChange={(event) =>
                                    onToggleItem(
                                      oc as OcRecibida,
                                      item as OcRecibidaItem,
                                      "comprado",
                                      event.target.checked,
                                    )
                                  }
                                  title="Se marca automaticamente cuando el item tiene producto interno reservado con stock suficiente"
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
                                  disabled={
                                    updatingItemOc === oc.id ||
                                    !canEditOc ||
                                    !item.comprado ||
                                    itemHasSoldSeries
                                  }
                                  onChange={(event) =>
                                    onToggleItem(
                                      oc as OcRecibida,
                                      item as OcRecibidaItem,
                                      "entregado",
                                      event.target.checked,
                                    )
                                  }
                                  title={
                                    itemHasSoldSeries
                                      ? "Este item ya registro salida de series vendidas"
                                      : !item.comprado
                                        ? "Primero debe estar comprado"
                                        : canEditOc
                                          ? "Marcar entregado"
                                          : "Solo el usuario que registro esta OC puede editarla"
                                  }
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                {item.entregado ? "Si" : "No"}
                              </label>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {!items.length && (
                    <EmptyRow
                      colSpan={isEmitida ? 3 : 4}
                      message="No hay items registrados en esta orden."
                    />
                  )}
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

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
      <p className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-2 font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
