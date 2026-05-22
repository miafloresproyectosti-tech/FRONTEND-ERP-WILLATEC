import api from "./api";

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
  margen: number;
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
  estado_cotizacion_item_id?: number;
  created_at?: string;
  updated_at?: string;
  tipo?: "catalogo" | "personalizado"; // Para diferenciar items de catálogo vs personalizados
  proveedor?: string; // Nuevo campo para proveedor
  link_proveedor?: string; // Nuevo campo para link del proveedor
}

export interface ItemFormState {
  descripcion: string;
  cantidad: number;
  costo_base: number;
  orden: number;
  cotizacion_id: number;
  producto_id?: number;
  estado_cotizacion_item_id?: number;
  tipo: 'catalogo' | 'personalizado';
  margen: number;
  marca: string;
  codigo: string;
  unidad_medida: string;
  garantia_meses: number;
  disponibilidad_tipo: 'stock' | 'importacion';
  disponibilidad_dias: number;
  proveedor?: string;
  link_proveedor?: string;
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
  tipo_cambio: number;
  validez_dias: number;
  cliente_id: number;
  plantilla_id: number;
  plataforma_id:number;
  user_id: number;
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
  created_at?: string;
  updated_at?: string;
  // Relaciones opcionales
  cliente?: Cliente;
  items?: CotizacionItem[];
  costosAdicionales?: CotizacionCostosAdicional[];
  // estadoCotizacion?: EstadoCotizacion;
}

export interface CreateCotizacionData {
  cliente_id: number;
  plantilla_id: number;
  plataforma_id: number;
  titulo?: string;
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
}

export interface CreateItemData {
  descripcion: string;
  cantidad: number;
  costo_base: number;
  margen: number;
  marca?: string;
  codigo?: string;
  unidad_medida?: string;
  disponibilidad?: string;
  garantia_meses?: number;
  disponibilidad_tipo: "stock" | "importacion";
  disponibilidad_dias: number;
  proveedor?: string | undefined;
  link_proveedor?: string | undefined;
}

export interface UpdateItemData extends CreateItemData {}

export interface AddCostoData {
  tipo: string;
  monto: number;
}

export interface Plantilla{
  id:number,
  nombre: string,
  incluye_igv: boolean
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

/**
 * Obtener una cotización específica con todos sus detalles
 */
export async function getCotizacion(id: string | number): Promise<Cotizacion> {
  try {
    const response = await api.get(`/cotizaciones/${id}`);
    const data = response.data || response.data.cotizacion;

    // Normalizar strings numéricos que devuelve PostgreSQL
    data.subtotal    = parseFloat(data.subtotal)    || 0;
    data.igv         = parseFloat(data.igv)         || 0;
    data.total       = parseFloat(data.total)       || 0;
    data.ganancia    = parseFloat(data.ganancia)    || 0;
    data.total_gasto = parseFloat(data.total_gasto) || 0;
    data.tipo_cambio = parseFloat(data.tipo_cambio) || 1;

    data.items = (data.items ?? []).map((item: any) => ({
      ...item,
      cantidad:         parseInt(item.cantidad)          || 0,
      costo_base:       parseFloat(item.costo_base)      || 0,
      costo_unitario:   parseFloat(item.costo_unitario)  || 0,
      costo_total:      parseFloat(item.costo_total)     || 0,
      precio_venta:     parseFloat(item.precio_venta)    || 0,
      subtotal:         parseFloat(item.subtotal)        || 0,
      ganancia:         parseFloat(item.ganancia)        || 0,
      margen:           parseFloat(item.margen)          || 0,
    }));

    data.costos_adicionales = (data.costos_adicionales ?? []).map((c: any) => ({
      ...c,
      monto: parseFloat(c.monto) || 0,
    }));

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
    const response = await api.post("/cotizaciones/completa", data);
    return response.data.cotizacion;
  } catch (error) {
    console.error("Error al crear cotización:", error);
    throw error;
  }
}

/**
 * Crear una nueva cotización Completa
 */
export const createCotizacionCompleta = async (data: any) => {

  const response = await api.post(
    '/cotizaciones/completa',
    data
  );

  return response.data.cotizacion;
};

/**
 * Actualizar una cotización existente
 */
export async function updateCotizacion(
  id: number,
  data: UpdateCotizacionData,
): Promise<Cotizacion> {
  try {
    const response = await api.put(`/cotizaciones/${id}`, data);
    return response.data.cotizacion;
  } catch (error) {
    console.error("Error al actualizar cotización:", error);
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

/**
 * Exportar cotización a PDF
 */
export async function exportarCotizacionPdf(id: number): Promise<Blob> {
  try {
    const response = await api.get(`/cotizaciones/${id}/exportar-pdf`, {
      responseType: "blob",
    });
    return response.data;
  } catch (error) {
    console.error("Error al exportar PDF:", error);
    throw error;
  }
}

/**
 * Descargar PDF de cotización
 */
export function descargarPdfCotizacion(
  cotizacionNumero: string,
  blob: Blob,
): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Cotizacion-${cotizacionNumero}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
}

// ========================
// PLANTILLAS
// ========================

export const getPlantillas = async (): Promise<Plantilla[]> => {
  const res = await api.get("/cotizaciones/plantillas");
  return res.data?.data ?? [];
};
