import api from "./api";
import { normalizeStorageImagePath, normalizeStorageImageUrl } from "../utils/storageImage";

// ========================
// INTERFACES
// ========================
export interface CotizacionItem {
  id: number;
  cotizacion_id: number;
  descripcion: string;
  cantidad: number;
  costo_base: number;
  imagen: string;
  imagen_url?: string | null;
  imagen_path?: string | null;
  margen: number;
  nota?: string;
  marca?: string;
  codigo?: string;
  unidad_medida?: string;
  disponibilidad?: string;
  garantia_meses: number;
  disponibilidad_tipo: "stock" | "importacion";
  disponibilidad_dias: number;
  orden: number;
  costo_unitario?: number;
  precio_venta: number;
  subtotal?: number;
  costo_total?: number;
  ganancia?: number;
  producto_id?: number;
  producto_externo_id?: number | null;
  estado_cotizacion_item_id?: number;
  aplica_costos_adicionales?: boolean;
  created_at?: string;
  updated_at?: string;
  tipo?: "catalogo" | "externo"; // Para diferenciar items de catálogo vs personalizados
  proveedor?: string; // Nuevo campo para proveedor
  link_proveedor?: string; // Nuevo campo para link del proveedor
  proveedores?: CotizacionItemProveedor[];
}

export interface CotizacionItemProveedor {
  id?: number;
  cotizacion_item_id?: number;
  nombre: string;
  link?: string | null;
  precio?: number | null;
  notas?: string | null;
  orden?: number;
}

export interface ItemFormState {
  descripcion: string;
  cantidad: number;
  costo_base: number;
  orden: number;
  cotizacion_id: number;
  producto_id?: number;
  producto_externo_id?: number | null;
  estado_cotizacion_item_id?: number;
  tipo: 'catalogo' | 'externo';
  margen: number;
  nota: string;
  marca: string;
  codigo: string;
  unidad_medida: string;
  garantia_meses: number;
  disponibilidad_tipo: 'stock' | 'importacion';
  disponibilidad_dias: number;
  aplica_costos_adicionales?: boolean;
  proveedor?: string;
  link_proveedor?: string;
  proveedores?: CotizacionItemProveedor[];
}

export interface CotizacionCostosAdicional {
  id: number;
  cotizacion_id: number | null;
  tipo: string;
  monto: number;
  descripcion: string;
  created_at?: string;
  updated_at?: string;
}

export interface CotizacionHistorial {
  id: number;
  cotizacion_id: number;
  estado_anterior_id: number | null;
  estado_nuevo_id: number;
  comentario?: string | null;
  user_id: number;
  created_at?: string;
  updated_at?: string;
  user?: {
    id: number;
    nombres?: string;
    email?: string;
  };
  usuario?: {
    id: number;
    nombres?: string;
    name?: string;
    email?: string;
  };
}

export type EstadoModificacion = "borrador" | "en_revision" | "aprobada" | "rechazada";

export interface UserLite {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  ruc: string;
  contacto: string;
  telefono: string;
  correo: string;
  tipo_cliente_id: number;
  moneda_id: number;
}

export interface Cotizacion {
  id: number;
  numero: string;
  fecha: string;
  titulo: string;
  forma_pago?: string;
  tipo_cambio: number;
  cliente_id: number;
  plantilla_id: number;
  moneda_id?: number;
  validez_dias: number;
  plataforma_id:number;
  user_id: number;
  delegado_id?: number | null;
  delegado_cotizacion_id?: number | null;
  modo_distribucion: "POR_ITEM" | "POR_CANTIDAD";
  subtotal: number;
  igv: number;
  total: number;
  ganancia?: number;
  total_gasto?: number;
  cliente_nombre: string;
  cliente_ruc: string;
  cliente_contacto: string;
  cliente_telefono: string;
  cliente_correo: string;
  estado_cotizacion_id: number;
  modificaciones_pendientes_count?: number | null;
  created_at?: string;
  updated_at?: string;
  // Relaciones opcionales
  cliente?: Cliente;
  items?: CotizacionItem[];
  costosAdicionales?: CotizacionCostosAdicional[];
  costos_adicionales?: CotizacionCostosAdicional[];
  historial?: CotizacionHistorial[];
  cotizacion_historial?: CotizacionHistorial[];
  delegado?: {
    id: number;
    nombres?: string;
    email?: string;
    name?: string;
  };
  delegado_cotizacion?: {
    id: number;
    nombres?: string;
    apellidos?: string;
    email?: string;
    name?: string;
  };
  // estadoCotizacion?: EstadoCotizacion;
  user?: {
    id: number;
    nombres?: string;
    email?: string;
    profile?: {
    nombres?: string;
    apellidos?: string;
  };
  };
  usuario?: {
    id: number;
    nombres?: string;
    name?: string;
    email?: string;
  };

  
};

export type CotizacionEditablePayload = any;

export interface CotizacionVersion {
  id: number;
  cotizacion_id: number;
  version_number: number;
  numero_version: string;
  snapshot: {
    cotizacion: Record<string, unknown>;
    items: Array<Record<string, unknown> & { proveedores?: CotizacionItemProveedor[] }>;
    costos: Array<Record<string, unknown>>;
  };
  created_by: number | null;
  approved_by: number | null;
  approved_at: string | null;
  notas: string | null;
}

export interface CotizacionModificacion {
  id: number;
  cotizacion_id: number;
  original_version_id: number | null;
  version_number: number;
  estado: EstadoModificacion;
  motivo: string;
  propuesta: CotizacionEditablePayload;
  requested_by: number;
  reviewed_by: number | null;
  comentario_revision: string | null;
  comentario_reenvio_revision?: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  cotizacion?: Cotizacion;
  original_version?: CotizacionVersion;
  solicitante?: UserLite;
  revisor?: UserLite;
}

export interface CotizacionVersionesResponse {
  cotizacion_id: number;
  numero: string;
  version_vigente: number;
  versiones: CotizacionVersion[];
  modificaciones: CotizacionModificacion[];
}


export interface CreateCotizacionData {
  cliente_id: number;
  plantilla_id: number;
  plataforma_id: number;
  titulo?: string;
  forma_pago?: string;
  cliente_contacto?: string;
  modo_distribucion?: "POR_ITEM" | "POR_CANTIDAD";
  moneda_id: number;
  estado_cotizacion_id?: number;
  fecha?: string;
  validez_dias?: number;
}

export interface UpdateCotizacionData {
  cliente_id: number;
  plantilla_id: number;
  plataforma_id:number;
  moneda_id: number;
  modo_distribucion: "POR_ITEM" | "POR_CANTIDAD";
  estado_cotizacion_id?: number;
  fecha?: string;
  validez_dias?: number;
  titulo?: string;
  forma_pago?: string;
  cliente_contacto?: string;
  delegado_id?: number | null;
  delegado_cotizacion_id?: number | null;
}

export interface DelegarCotizacionData {
  delegado_cotizacion_id: number;
}

export interface CreateItemData {
  descripcion: string;
  cantidad: number;
  costo_base: number;
  margen: number;
  nota?: string;
  marca?: string;
  codigo?: string;
  unidad_medida?: string;
  disponibilidad?: string;
  garantia_meses?: number;
  disponibilidad_tipo: "stock" | "importacion";
  disponibilidad_dias: number;
  proveedor?: string | undefined;
  link_proveedor?: string | undefined;
  proveedores?: CotizacionItemProveedor[];
  imagen?: string | null;
  imagen_path?: string | null;
  aplica_costos_adicionales?: boolean;
}

export interface UpdateItemData extends CreateItemData {}

function base64ToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(data);
  const array = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  return new File([array], filename, { type: mime });
}

function buildItemFormData(data: CreateItemData | UpdateItemData): FormData {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (key === "imagen" || value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        Object.entries(item ?? {}).forEach(([childKey, childValue]) => {
          if (childValue !== undefined && childValue !== null) {
            formData.append(
              `${key}[${index}][${childKey}]`,
              typeof childValue === "boolean" ? (childValue ? "1" : "0") : String(childValue),
            );
          }
        });
      });
      return;
    }

    formData.append(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  });

  if (data.imagen?.startsWith("data:")) {
    formData.append("imagen", base64ToFile(data.imagen, "cotizacion-item.jpg"));
  }

  return formData;
}

function toBackendBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "si", "sí", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }

  return fallback;
}

function hasNewItemImage(data: CreateItemData | UpdateItemData): boolean {
  return Boolean(data.imagen?.startsWith("data:"));
}

function appendCotizacionFormValue(formData: FormData, key: string, value: any): void {
  if (value === undefined || value === null) return;

  if (key.endsWith("[imagen]")) {
    if (typeof value === "string" && value.startsWith("data:")) {
      formData.append(key, base64ToFile(value, "cotizacion-item.jpg"));
    } else if (typeof value === "string" && value.trim()) {
      formData.append(key, normalizeStorageImagePath(value) || value);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      Object.entries(item ?? {}).forEach(([childKey, childValue]) => {
        appendCotizacionFormValue(formData, `${key}[${index}][${childKey}]`, childValue);
      });
    });
    return;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) => {
      appendCotizacionFormValue(formData, `${key}[${childKey}]`, childValue);
    });
    return;
  }

  formData.append(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
}

function hasNewCotizacionItemImage(data: any): boolean {
  return (data.items ?? []).some((item: any) => typeof item?.imagen === "string" && item.imagen.startsWith("data:"));
}

function buildCotizacionFormData(data: any): FormData {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    appendCotizacionFormValue(formData, key, value);
  });

  return formData;
}

function prepareCotizacionData(data: any): any {
  if (!Array.isArray(data.items)) return data;

  return {
    ...data,
    items: data.items.map((item: any) => {
      const imageSource = item.imagen || item.imagen_path || item.imagen_url;
      const imagePathSource = item.imagen_path || imageSource;

      return {
        ...item,
        producto_externo_id: item.tipo === "externo" ? item.producto_externo_id : undefined,
        aplica_costos_adicionales: toBackendBoolean(item.aplica_costos_adicionales, true),
        imagen: normalizeStorageImagePath(imageSource),
        imagen_path:
          typeof imagePathSource === "string" && imagePathSource.startsWith("data:")
            ? item.imagen_path || null
            : normalizeStorageImagePath(imagePathSource),
      };
    }),
  };
}

export interface AddCostoData {
  tipo: string;
  monto: number;
}

export interface Plantilla{
  id:number,
  nombre: string,
  incluye_igv: boolean
}

export interface CotizacionesPaginatedResponse {
  data: Cotizacion[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
}

export interface GetCotizacionesParams {
  clienteId?: number;
  ejecutivoId?: number;
  page?: number;
  search?: string;
  perPage?: number;
  estadoCotizacionId?: number;
}

// ========================
// FUNCIONES API
// ========================

/**
 * Obtener todas las cotizaciones (con paginación)
 * @param clienteId - ID del cliente (opcional para filtrar)
 */
export async function getCotizaciones(
  clienteId?: number,
): Promise<Cotizacion[]> {
  try {
    const params = clienteId ? { cliente_id: clienteId } : {};
    const response = await api.get("/cotizaciones", { params });
    return response.data.data || response.data;
  } catch (error) {
    console.error("Error al obtener cotizaciones:", error);
    throw error;
  }
}

export async function getCotizacionesPaginated({
  clienteId,
  ejecutivoId,
  page = 1,
  search = "",
  perPage = 10,
  estadoCotizacionId,
}: GetCotizacionesParams = {}): Promise<CotizacionesPaginatedResponse> {
  try {
    const response = await api.get("/cotizaciones", {
      params: {
        page,
        search: search.trim() || undefined,
        per_page: perPage,
        cliente_id: clienteId,
        user_id: ejecutivoId,
        estado_cotizacion_id: estadoCotizacionId,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error al obtener cotizaciones paginadas:", error);
    throw error;
  }
}

/**
 * Obtener una cotización específica con todos sus detalles
 */
export async function getCotizacion(id: string | number): Promise<Cotizacion> {
  try {
    const response = await api.get(`/cotizaciones/${id}`);
    const data = response.data?.cotizacion || response.data?.data || response.data;

    // Normalizar strings numéricos que devuelve PostgreSQL
    data.subtotal    = parseFloat(data.subtotal)    || 0;
    data.igv         = parseFloat(data.igv)         || 0;
    data.total       = parseFloat(data.total)       || 0;
    data.ganancia    = parseFloat(data.ganancia)    || 0;
    data.total_gasto = parseFloat(data.total_gasto) || 0;
    data.tipo_cambio = parseFloat(data.tipo_cambio) || 1;

    data.items = (data.items ?? []).map((item: any) => {
      const rawImage = item.imagen_url || item.imagen || item.imagen_path || "";
      const imageForPreview = normalizeStorageImageUrl(rawImage);

      return {
        ...item,
        imagen: imageForPreview,
        imagen_url: imageForPreview || null,
        imagen_path: item.imagen_path || item.imagen || null,
        cantidad:         parseInt(item.cantidad)          || 0,
        costo_base:       parseFloat(item.costo_base)      || 0,
        costo_unitario:   parseFloat(item.costo_unitario)  || 0,
        costo_total:      parseFloat(item.costo_total)     || 0,
        precio_venta:     parseFloat(item.precio_venta)    || 0,
        subtotal:         parseFloat(item.subtotal)        || 0,
        ganancia:         parseFloat(item.ganancia)        || 0,
        margen:           parseFloat(item.margen)          || 0,
      };
    });

    const costos = (data.costosAdicionales ?? data.costos_adicionales ?? []).map((c: any) => ({
      ...c,
      monto: parseFloat(c.monto) || 0,
    }));
    data.costosAdicionales = costos;
    data.costos_adicionales = costos;

    const historial = (
      data.historial ??
      data.cotizacion_historial ??
      data.historialEstados ??
      []
    ).map((h: any) => ({
      ...h,
      estado_anterior_id:
        h.estado_anterior_id === null || h.estado_anterior_id === undefined
          ? null
          : Number(h.estado_anterior_id),
      estado_nuevo_id: Number(h.estado_nuevo_id),
      user_id: Number(h.user_id),
    }));
    data.historial = historial;
    data.cotizacion_historial = historial;

  return data;
  } catch (error) {
    console.error("Error al obtener cotización:", error);
    throw error;
  }
}

/**
 * Crear una nueva cotización
 */
export async function createCotizacion(
  data: CreateCotizacionData,
): Promise<Cotizacion> {
  try {
    const payload = prepareCotizacionData(data);

    if (hasNewCotizacionItemImage(data)) {
      const response = await api.post("/cotizaciones/completa", buildCotizacionFormData(payload), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data?.cotizacion || response.data?.data || response.data;
    }

    const response = await api.post("/cotizaciones/completa", payload);
    return response.data?.cotizacion || response.data?.data || response.data;
  } catch (error) {
    console.error("Error al crear cotización:", error);
    throw error;
  }
}

/**
 * Actualizar una cotización existente
 */
export async function updateCotizacion(
  id: number,
  data: any,
): Promise<Cotizacion> {
  try {
    const payload = prepareCotizacionData(data);

    if (hasNewCotizacionItemImage(data)) {
      const formData = buildCotizacionFormData(payload);
      formData.append("_method", "PUT");

      const response = await api.post(`/cotizaciones/${id}/completa`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data?.cotizacion || response.data?.data || response.data;
    }

    const response = await api.put(`/cotizaciones/${id}/completa`, payload);
    return response.data?.cotizacion || response.data?.data || response.data;
  } catch (error) {
    console.error("Error al actualizar cotización:", error);
    throw error;
  }
}

export async function enviarCotizacionRevision(id: number, comentario?: string): Promise<Cotizacion> {
  try {
    const response = await api.patch(`/cotizaciones/${id}/enviar-revision`, {
      ...(comentario?.trim() ? { comentario: comentario.trim() } : {}),
    });
    return response.data?.cotizacion || response.data?.data || response.data;
  } catch (error) {
    console.error("Error al enviar cotización a revisión:", error);
    throw error;
  }
}

export async function aprobarCotizacion(id: number): Promise<Cotizacion> {
  try {
    const response = await api.patch(`/cotizaciones/${id}/aprobar`, {
      cotizacion_id: id,
    });
    return response.data?.cotizacion || response.data?.data || response.data;
  } catch (error) {
    console.error("Error al aprobar cotizaciÃ³n:", error);
    throw error;
  }
}

// export async function enviarCotizacionAprobacion(id: number): Promise<Cotizacion> {
//   try {
//     const response = await api.patch(`/cotizaciones/${id}/enviar-aprobacion`, {
//       cotizacion_id: id,
//     });
//     return response.data?.cotizacion || response.data?.data || response.data;
//   } catch (error) {
//     console.error("Error al enviar cotizaciÃ³n a aprobaciÃ³n:", error);
//     throw error;
//   }
// }

export async function rechazarCotizacion(
  id: number,
  comentario: string,
): Promise<Cotizacion> {
  try {
    const response = await api.patch(`/cotizaciones/${id}/rechazar`, {
      cotizacion_id: id,
      comentario_rechazo: comentario,
    });
    return response.data?.cotizacion || response.data?.data || response.data;
  } catch (error) {
    console.error("Error al rechazar cotizaciÃ³n:", error);
    throw error;
  }
}

export async function deleteCotizacion(id: number): Promise<void> {
  try {
    await api.delete(`/cotizaciones/${id}`);
  } catch (error) {
    console.error("Error al eliminar cotización:", error);
    throw error;
  }
}

export async function delegarCotizacion(
  id: number,
  delegadoCotizacionId: number,
): Promise<Cotizacion> {
  try {
    const response = await api.patch(`/cotizaciones/${id}/delegar`, {
      delegado_cotizacion_id: delegadoCotizacionId,
    });
    return response.data?.cotizacion || response.data?.data || response.data;
  } catch (error) {
    console.error("Error al delegar cotización:", error);
    throw error;
  }
}

export async function getCotizacionVersiones(
  cotizacionId: number,
): Promise<CotizacionVersionesResponse> {
  try {
    const response = await api.get(`/cotizaciones/${cotizacionId}/versiones`);
    return response.data?.data || response.data;
  } catch (error) {
    console.error("Error al obtener versiones de cotizacion:", error);
    throw error;
  }
}

export async function solicitarModificacionCotizacion(
  cotizacionId: number,
  motivo: string,
): Promise<CotizacionModificacion> {
  try {
    const response = await api.post(`/cotizaciones/${cotizacionId}/solicitar-modificacion`, {
      motivo,
    });
    return response.data?.modificacion || response.data?.data || response.data;
  } catch (error) {
    console.error("Error al solicitar modificacion de cotizacion:", error);
    throw error;
  }
}

export async function getCotizacionModificacion(
  modificacionId: number,
): Promise<CotizacionModificacion> {
  try {
    const response = await api.get(`/cotizaciones/modificaciones/${modificacionId}`);
    return response.data?.modificacion || response.data?.data || response.data;
  } catch (error) {
    console.error("Error al obtener modificacion de cotizacion:", error);
    throw error;
  }
}

export async function updateCotizacionModificacion(
  modificacionId: number,
  propuesta: CotizacionEditablePayload,
  comentarioReenvioRevision?: string,
): Promise<CotizacionModificacion> {
  try {
    const payload = {
      ...prepareCotizacionData(propuesta),
      ...(comentarioReenvioRevision?.trim()
        ? { comentario_reenvio_revision: comentarioReenvioRevision.trim() }
        : {}),
    };

    if (hasNewCotizacionItemImage(propuesta)) {
      const formData = buildCotizacionFormData(payload);
      formData.append("_method", "PUT");

      const response = await api.post(`/cotizaciones/modificaciones/${modificacionId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data?.modificacion || response.data?.data || response.data;
    }

    const response = await api.put(`/cotizaciones/modificaciones/${modificacionId}`, payload);
    return response.data?.modificacion || response.data?.data || response.data;
  } catch (error) {
    console.error("Error al guardar modificacion de cotizacion:", error);
    throw error;
  }
}

export async function enviarModificacionRevision(
  modificacionId: number,
  comentarioReenvioRevision?: string,
): Promise<CotizacionModificacion> {
  try {
    const response = await api.patch(`/cotizaciones/modificaciones/${modificacionId}/enviar-revision`, {
      ...(comentarioReenvioRevision?.trim()
        ? { comentario_reenvio_revision: comentarioReenvioRevision.trim() }
        : {}),
    });
    return response.data?.modificacion || response.data?.data || response.data;
  } catch (error) {
    console.error("Error al enviar modificacion a revision:", error);
    throw error;
  }
}

export async function aprobarModificacionCotizacion(
  modificacionId: number,
  comentario_revision?: string,
): Promise<{ version: CotizacionVersion; cotizacion: Cotizacion; message?: string }> {
  try {
    const response = await api.patch(`/cotizaciones/modificaciones/${modificacionId}/aprobar`, {
      comentario_revision,
    });
    return response.data?.data || response.data;
  } catch (error) {
    console.error("Error al aprobar modificacion de cotizacion:", error);
    throw error;
  }
}

export async function rechazarModificacionCotizacion(
  modificacionId: number,
  comentario_revision: string,
): Promise<CotizacionModificacion> {
  try {
    const response = await api.patch(`/cotizaciones/modificaciones/${modificacionId}/rechazar`, {
      comentario_revision,
    });
    return response.data?.modificacion || response.data?.data || response.data;
  } catch (error) {
    console.error("Error al rechazar modificacion de cotizacion:", error);
    throw error;
  }
}

export async function getCotizacionHistorial(
  id: number,
): Promise<CotizacionHistorial[]> {
  try {
    const response = await api.get(`/cotizaciones/${id}/historial`);
    const historial =
      response.data?.historial?.data ||
      response.data?.historial ||
      response.data?.data ||
      response.data ||
      [];
    return historial.map((h: any) => ({
      ...h,
      estado_anterior_id:
        h.estado_anterior_id === null || h.estado_anterior_id === undefined
          ? null
          : Number(h.estado_anterior_id),
      estado_nuevo_id: Number(h.estado_nuevo_id),
      user_id: Number(h.user_id),
    }));
  } catch (error) {
    console.error("Error al obtener historial de cotizaciÃ³n:", error);
    throw error;
  }
}

// ========================
// ITEMS
// ========================

/**
 * Agregar un item a la cotización
 */
export async function addItem(
  cotizacionId: number,
  data: CreateItemData,
): Promise<void> {
  try {
    if (hasNewItemImage(data)) {
      await api.post(`/cotizaciones/${cotizacionId}/items`, buildItemFormData(data), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return;
    }

    await api.post(`/cotizaciones/${cotizacionId}/items`, data);
  } catch (error) {
    console.error("Error al agregar item:", error);
    throw error;
  }
}

/**
 * Actualizar un item de la cotización
 */
export async function updateItem(
  itemId: number,
  data: UpdateItemData,
): Promise<void> {
  try {
    if (hasNewItemImage(data)) {
      const formData = buildItemFormData(data);
      formData.append("_method", "PUT");

      await api.post(`/cotizaciones/items/${itemId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return;
    }

    await api.put(`/cotizaciones/items/${itemId}`, data);
  } catch (error) {
    console.error("Error al actualizar item:", error);
    throw error;
  }
}

/**
 * Eliminar un item de la cotización
 */
export async function deleteItem(itemId: number): Promise<void> {
  try {
    await api.delete(`/cotizaciones/items/${itemId}`);
  } catch (error) {
    console.error("Error al eliminar item:", error);
    throw error;
  }
}

/**
 * Desactivar un item (sin eliminar)
 */
export async function desactivarItem(itemId: number): Promise<void> {
  try {
    await api.patch(`/cotizaciones/items/${itemId}/desactivar`);
  } catch (error) {
    console.error("Error al desactivar item:", error);
    throw error;
  }
}

/**
 * Activar un item desactivado
 */
export async function activarItem(itemId: number): Promise<void> {
  try {
    await api.patch(`/cotizaciones/items/${itemId}/activar`);
  } catch (error) {
    console.error("Error al activar item:", error);
    throw error;
  }
}

// ========================
// COSTOS ADICIONALES
// ========================

/**
 * Agregar un costo adicional a la cotización
 */
export async function addCosto(
  cotizacionId: number,
  data: AddCostoData,
): Promise<void> {
  try {
    await api.post(`/cotizaciones/${cotizacionId}/costos`, data);
  } catch (error) {
    console.error("Error al agregar costo adicional:", error);
    throw error;
  }
}

/**
 * Eliminar un costo adicional
 */
export async function deleteCosto(costoId: number): Promise<void> {
  try {
    await api.delete(`/cotizaciones/costos/${costoId}`);
  } catch (error) {
    console.error("Error al eliminar costo:", error);
    throw error;
  }
}

// ========================
// ACCIONES
// ========================

/**
 * Recalcular la cotización
 */
export async function recalcularCotizacion(id: number): Promise<Cotizacion> {
  try {
    const response = await api.patch(`/cotizaciones/${id}/recalcular`);
    return response.data.cotizacion;
  } catch (error) {
    console.error("Error al recalcular cotización:", error);
    throw error;
  }
}

export interface CotizacionPdfExport {
  blob: Blob;
  filename: string | null;
}

declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  }
}

function getFilenameFromContentDisposition(value?: string): string | null {
  if (!value) return null;

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ""));
  }

  const filenameMatch = value.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] || null;
}

/**
 * Exportar cotización a PDF
 */
export async function exportarCotizacionPdf(id: number): Promise<CotizacionPdfExport> {
  try {
    const response = await api.get(`/cotizaciones/${id}/exportar-pdf`, {
      responseType: "blob",
    });

    return {
      blob: response.data,
      filename:
        response.headers["x-suggested-filename"] ||
        getFilenameFromContentDisposition(response.headers["content-disposition"]) ||
        null,
    };
  } catch (error) {
    console.error("Error al exportar PDF:", error);
    throw error;
  }
}

/**
 * Descargar PDF de cotización
 */
export async function descargarPdfCotizacion(
  nombreArchivo: string,
  blob: Blob,
): Promise<boolean> {
  const filename = nombreArchivo.toLowerCase().endsWith(".pdf")
    ? nombreArchivo
    : `${nombreArchivo}.pdf`;

  if (window.showSaveFilePicker) {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "Documento PDF",
            accept: { "application/pdf": [".pdf"] },
          },
        ],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return false;
      }

      console.warn("No se pudo usar el selector de archivos. Se usará la descarga normal.", error);
    }
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
  return true;
}

// ========================
// PLANTILLAS
// ========================

export const getPlantillas = async (): Promise<Plantilla[]> => {
  const res = await api.get("/cotizaciones/plantillas");
  return res.data?.data ?? [];
};
