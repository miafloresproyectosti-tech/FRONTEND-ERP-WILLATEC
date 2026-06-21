import api from "./api";

export type OcRecibidaEstado =
  | "pendiente"
  | "en_proceso"
  | "por_entrega"
  | "atendido";

export type OcEmitidaEstado = "emitida" | "pendiente" | "en_proceso" | "atendido";

export interface OcPagination<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  from?: number;
  to?: number;
}

export interface OcPreviewItem {
  id: number;
  cotizacion_item_id?: number;
  descripcion?: string;
  producto?: string;
  cantidad?: number | string;
  cantidad_disponible?: number | string;
  cantidad_pendiente?: number | string;
  cantidad_recibida?: number | string;
  precio_unitario?: number | string;
  costo_base?: number | string;
  proveedor?: string | null;
  proveedores?: Array<{
    nombre: string;
    precio?: number | string | null;
  }>;
}

export interface OcPreview {
  cotizacion?: {
    id?: number;
    numero?: string;
    cliente_nombre?: string;
    titulo?: string;
    total?: number | string;
    estado?: string;
    estado_nombre?: string;
    estado_cotizacion_id?: number | string;
  };
  items: OcPreviewItem[];
  proveedores?: string[];
}

export interface OcRecibida {
  id: number;
  numero?: string;
  cotizacion_id?: number;
  cotizacion?: {
    id?: number;
    numero?: string;
    cliente_nombre?: string;
    titulo?: string;
    cliente?: {
      nombre?: string;
    };
  };
  fecha_recepcion?: string;
  observaciones?: string | null;
  estado: OcRecibidaEstado | string;
  documentos_completos?: boolean;
  documentos_faltantes?: string[];
  items_count?: number | string;
  total_items?: number | string;
  items?: OcRecibidaItem[];
}

export interface OcRecibidaItem {
  id: number;
  cotizacion_item_id?: number;
  descripcion?: string;
  producto?: string;
  cantidad_recibida?: number | string;
  comprado?: boolean;
  entregado?: boolean;
}

export interface OcEmitida {
  id: number;
  numero?: string;
  cotizacion_id?: number;
  cotizacion?: {
    id?: number;
    numero?: string;
    cliente_nombre?: string;
    titulo?: string;
    cliente?: {
      nombre?: string;
    };
  };
  proveedor?: string;
  fecha_emision?: string;
  observaciones?: string | null;
  estado: OcEmitidaEstado | string;
  subtotal?: number | string;
  igv?: number | string;
  total?: number | string;
  documentos_completos?: boolean;
  documentos_faltantes?: string[];
  pdf_url?: string;
  items?: OcEmitidaItem[];
}

export interface OcEmitidaItem {
  id: number;
  cotizacion_item_id?: number;
  descripcion?: string;
  producto?: string;
  cantidad?: number | string;
  precio_unitario?: number | string;
  subtotal?: number | string;
}

export interface CreateOcRecibidaPayload {
  cotizacion_id: number;
  fecha_recepcion: string;
  observaciones?: string;
  items: Array<{
    cotizacion_item_id: number;
    seleccionado: boolean;
    cantidad_recibida: number;
  }>;
  orden_compra_cliente?: File | null;
  guia_emision?: File | null;
}

export interface CreateOcEmitidaPayload {
  cotizacion_id: number;
  proveedor: string;
  fecha_emision: string;
  observaciones?: string;
  items: Array<{
    cotizacion_item_id: number;
    cantidad: number;
    precio_unitario: number;
  }>;
}

export interface UpdateOcRecibidaItemsPayload {
  items: Array<{
    id: number;
    comprado: boolean;
    entregado: boolean;
  }>;
}

export interface OcListParams {
  page?: number;
  search?: string;
  estado?: string;
  proveedor?: string;
  perPage?: number;
}

const normalizeList = <T>(payload: any): OcPagination<T> => {
  const source = payload?.data?.data ? payload.data : payload;
  const rows = Array.isArray(source?.data)
    ? source.data
    : Array.isArray(source)
      ? source
      : [];

  return {
    data: rows,
    current_page: source?.current_page ?? 1,
    last_page: source?.last_page ?? 1,
    per_page: source?.per_page,
    total: source?.total ?? rows.length,
    from: source?.from ?? (rows.length ? 1 : 0),
    to: source?.to ?? rows.length,
  };
};

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return "";
};

const normalizeProveedorName = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return firstString(row.nombre, row.proveedor, row.razon_social, row.name, row.label);
  }

  return "";
};

const normalizeItemProveedores = (item: any) => {
  const rawProveedores = Array.isArray(item?.proveedores) ? item.proveedores : [];

  return rawProveedores
    .map((proveedor: any) => ({
      ...proveedor,
      nombre: normalizeProveedorName(proveedor),
      precio: proveedor?.precio ?? proveedor?.precio_unitario ?? proveedor?.costo_base ?? null,
    }))
    .filter((proveedor: { nombre: string }) => proveedor.nombre);
};

const normalizePreviewItem = (item: any): OcPreviewItem => {
  const source = item?.cotizacion_item ?? item?.item ?? item?.producto_cotizado ?? item;
  const proveedor = normalizeProveedorName(item?.proveedor ?? source?.proveedor);
  const proveedores = normalizeItemProveedores(source);
  const primaryProveedor = proveedores[0];

  return {
    ...source,
    ...item,
    id: Number(item?.id ?? item?.cotizacion_item_id ?? source?.id ?? 0),
    cotizacion_item_id: Number(item?.cotizacion_item_id ?? source?.cotizacion_item_id ?? source?.id ?? item?.id ?? 0),
    descripcion: firstString(item?.descripcion, source?.descripcion, item?.producto, source?.producto, item?.nombre, source?.nombre, item?.detalle, source?.detalle),
    producto: firstString(item?.producto, source?.producto, item?.descripcion, source?.descripcion, item?.nombre, source?.nombre),
    cantidad: item?.cantidad ?? item?.cantidad_cotizada ?? source?.cantidad,
    cantidad_pendiente: item?.cantidad_pendiente ?? source?.cantidad_pendiente,
    cantidad_disponible: item?.cantidad_disponible ?? source?.cantidad_disponible,
    proveedor: proveedor || primaryProveedor?.nombre || null,
    precio_unitario: item?.precio_unitario ?? item?.precio ?? item?.costo_base ?? primaryProveedor?.precio ?? source?.precio_unitario ?? source?.precio ?? source?.costo_base,
    costo_base: item?.costo_base ?? source?.costo_base,
    proveedores,
  };
};

const normalizePreview = (payload: any): OcPreview => {
  const source = payload?.data ?? payload;
  const rawCotizacion = source?.cotizacion ?? source?.cotizacion_data ?? source;
  const cotizacion = {
    ...rawCotizacion,
    id: rawCotizacion?.id ?? source?.cotizacion_id ?? source?.id,
    numero: rawCotizacion?.numero ?? rawCotizacion?.codigo ?? source?.cotizacion_numero ?? source?.numero,
    cliente_nombre: rawCotizacion?.cliente_nombre ?? rawCotizacion?.cliente?.nombre ?? source?.cliente_nombre,
    titulo: rawCotizacion?.titulo ?? rawCotizacion?.nombre ?? source?.cotizacion_titulo ?? source?.titulo,
    estado: rawCotizacion?.estado ?? rawCotizacion?.estado_nombre ?? source?.estado ?? source?.cotizacion_estado,
    estado_nombre: rawCotizacion?.estado_nombre ?? rawCotizacion?.estado?.nombre ?? source?.estado_nombre,
    estado_cotizacion_id:
      rawCotizacion?.estado_cotizacion_id ??
      rawCotizacion?.estadoCotizacionId ??
      rawCotizacion?.estado_cotizacion?.id ??
      rawCotizacion?.estado?.id ??
      source?.estado_cotizacion_id ??
      source?.estadoCotizacionId ??
      source?.cotizacion_estado_id,
  };
  const items = source?.items ?? cotizacion?.items ?? [];
  const groupedProviderItems = Array.isArray(source?.proveedores)
    ? source.proveedores.flatMap((proveedor: any) => {
      const providerName = normalizeProveedorName(proveedor);
      const providerItems =
        proveedor?.items ??
        proveedor?.cotizacion_items ??
        proveedor?.productos ??
        proveedor?.productos_cotizados ??
        [];

      return Array.isArray(providerItems)
        ? providerItems.map((item: any) => ({
          ...item,
          proveedor: item?.proveedor ?? providerName,
          precio_unitario: item?.precio_unitario ?? item?.precio ?? item?.costo_base,
        }))
        : [];
    })
    : [];
  const rawItems = [
    ...(Array.isArray(items) ? items : []),
    ...groupedProviderItems,
  ];
  const itemRows = Array.from(
    rawItems
      .map(normalizePreviewItem)
      .reduce((acc: Map<string, OcPreviewItem>, item: OcPreviewItem) => {
        const key = `${item.cotizacion_item_id ?? item.id}-${item.proveedor ?? ""}`;
        if (!acc.has(key)) acc.set(key, item);
        return acc;
      }, new Map<string, OcPreviewItem>())
      .values()
  );
  const proveedores = [
    ...(Array.isArray(source?.proveedores) ? source.proveedores.map(normalizeProveedorName) : []),
    ...itemRows.map((item) => item.proveedor || ""),
    ...itemRows.flatMap((item) => item.proveedores?.map((proveedor) => proveedor.nombre) || []),
  ].filter(Boolean);

  return {
    cotizacion,
    items: itemRows,
    proveedores: Array.from(new Set(proveedores)),
  };
};

const appendArrayFields = (
  formData: FormData,
  key: string,
  rows: Array<Record<string, string | number | boolean>>,
) => {
  rows.forEach((row, index) => {
    Object.entries(row).forEach(([field, value]) => {
      formData.append(`${key}[${index}][${field}]`, String(value));
    });
  });
};

export async function getOcRecibidas(params: OcListParams = {}) {
  const response = await api.get("/oc-recibidas", {
    params: {
      page: params.page,
      search: params.search || undefined,
      estado: params.estado && params.estado !== "todos" ? params.estado : undefined,
      per_page: params.perPage,
    },
  });

  return normalizeList<OcRecibida>(response.data);
}

export async function getOcRecibida(id: number | string) {
  const response = await api.get(`/oc-recibidas/${id}`);
  return (response.data?.oc_recibida ?? response.data?.data ?? response.data) as OcRecibida;
}

export async function getOcRecibidaPreview(cotizacionId: number) {
  const response = await api.get(`/cotizaciones/${cotizacionId}/oc-recibida/preview`);
  return normalizePreview(response.data);
}

export async function createOcRecibida(payload: CreateOcRecibidaPayload) {
  const hasFiles = Boolean(payload.orden_compra_cliente || payload.guia_emision);

  if (hasFiles) {
    const formData = new FormData();
    formData.append("cotizacion_id", String(payload.cotizacion_id));
    formData.append("fecha_recepcion", payload.fecha_recepcion);
    if (payload.observaciones) formData.append("observaciones", payload.observaciones);
    appendArrayFields(formData, "items", payload.items);
    if (payload.orden_compra_cliente) {
      formData.append("orden_compra_cliente", payload.orden_compra_cliente);
    }
    if (payload.guia_emision) {
      formData.append("guia_emision", payload.guia_emision);
    }

    const response = await api.post("/oc-recibidas", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  const response = await api.post("/oc-recibidas", {
    cotizacion_id: payload.cotizacion_id,
    fecha_recepcion: payload.fecha_recepcion,
    observaciones: payload.observaciones,
    items: payload.items,
  });

  return response.data;
}

export async function updateOcRecibidaItems(
  id: number | string,
  payload: UpdateOcRecibidaItemsPayload,
) {
  const response = await api.patch(`/oc-recibidas/${id}/items`, payload);
  return response.data;
}

export async function uploadOcRecibidaDocumentos(
  id: number | string,
  files: { orden_compra_cliente?: File | null; guia_emision?: File | null },
) {
  const formData = new FormData();
  if (files.orden_compra_cliente) {
    formData.append("orden_compra_cliente", files.orden_compra_cliente);
  }
  if (files.guia_emision) {
    formData.append("guia_emision", files.guia_emision);
  }

  const response = await api.post(`/oc-recibidas/${id}/documentos`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getOcEmitidas(params: OcListParams = {}) {
  const response = await api.get("/oc-emitidas", {
    params: {
      page: params.page,
      search: params.search || undefined,
      proveedor: params.proveedor || undefined,
      estado: params.estado && params.estado !== "todos" ? params.estado : undefined,
      per_page: params.perPage,
    },
  });

  return normalizeList<OcEmitida>(response.data);
}

export async function getOcEmitida(id: number | string) {
  const response = await api.get(`/oc-emitidas/${id}`);
  return (response.data?.oc_emitida ?? response.data?.data ?? response.data) as OcEmitida;
}

export async function getOcEmitidaPreview(cotizacionId: number) {
  const response = await api.get(`/cotizaciones/${cotizacionId}/oc-emitida/preview`);
  return normalizePreview(response.data);
}

export async function getOcEmitidaItems(cotizacionId: number, proveedor: string) {
  const response = await api.get(`/cotizaciones/${cotizacionId}/oc-emitida/items`, {
    params: { proveedor },
  });
  return normalizePreview(response.data);
}

export async function createOcEmitida(payload: CreateOcEmitidaPayload) {
  const response = await api.post("/oc-emitidas", payload);
  return response.data;
}

function getFilenameFromContentDisposition(value?: string): string | null {
  if (!value) return null;

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ""));

  const filenameMatch = value.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] || null;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
}

export async function downloadOcEmitidaPdf(id: number | string, fallbackFilename?: string) {
  const response = await api.get(`/oc-emitidas/${id}/pdf`, {
    responseType: "blob",
  });
  const filename =
    response.headers["x-suggested-filename"] ||
    getFilenameFromContentDisposition(response.headers["content-disposition"]) ||
    fallbackFilename ||
    `oc-emitida-${id}.pdf`;

  triggerBlobDownload(response.data, filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export async function uploadOcEmitidaDocumentos(
  id: number | string,
  files: { factura?: File | null; comprobante_pago?: File | null },
) {
  const formData = new FormData();
  if (files.factura) formData.append("factura", files.factura);
  if (files.comprobante_pago) formData.append("comprobante_pago", files.comprobante_pago);

  const response = await api.post(`/oc-emitidas/${id}/documentos`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export function getOcEmitidaPdfUrl(id: number | string) {
  return `${api.defaults.baseURL}/oc-emitidas/${id}/pdf`;
}
