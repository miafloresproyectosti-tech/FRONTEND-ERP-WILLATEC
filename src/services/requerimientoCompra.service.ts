import api from "./api";

export type RequerimientoOrigen =
  | "oc_cliente"
  | "reposicion_stock"
  | "manual"
  | "licitacion"
  | "otro";

export type RequerimientoEstado =
  | "pendiente"
  | "en_gestion"
  | "parcialmente_comprado"
  | "comprado"
  | "cancelado";

export type RequerimientoPrioridad = "baja" | "normal" | "alta" | "urgente";

export interface RequerimientoCompraPagination<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
}

export interface RequerimientoCompraItem {
  id: number;
  requerimiento_compra_id: number;
  oc_recibida_item_id?: number | null;
  cotizacion_item_id?: number | null;
  producto_id?: number | null;
  producto_externo_id?: number | null;
  descripcion: string;
  cantidad_requerida: number | string;
  cantidad_comprada: number | string;
  cantidad_recibida: number | string;
  estado: RequerimientoEstado | string;
  producto?: {
    id: number;
    nombre?: string | null;
    sku?: string | null;
    codigo?: string | null;
  } | null;
  producto_externo?: {
    id: number;
    descripcion?: string | null;
    codigo?: string | null;
    marca?: string | null;
    costo_base_referencial?: number | string | null;
    moneda_id?: number | null;
  } | null;
  cotizacion_item?: {
    id: number;
    costo_base?: number | string | null;
    costo_unitario?: number | string | null;
    cotizacion?: {
      id: number;
      moneda_id?: number | null;
    } | null;
  } | null;
}

export interface RequerimientoCompra {
  id: number;
  numero: string;
  origen_tipo: RequerimientoOrigen;
  oc_recibida_id?: number | null;
  oc_recibida?: {
    id: number;
    numero?: string;
    cliente_nombre?: string | null;
    cotizacion_id?: number | null;
  } | null;
  estado: RequerimientoEstado;
  prioridad: RequerimientoPrioridad;
  solicitado_por?: {
    id?: number;
    nombres?: string | null;
    apellidos?: string | null;
    email?: string | null;
  } | null;
  asignado_a?: number | null;
  observacion?: string | null;
  items_count?: number;
  items?: RequerimientoCompraItem[];
  created_at?: string;
  updated_at?: string;
}

export interface RequerimientoCompraFilters {
  page?: number;
  perPage?: number;
  search?: string;
  estado?: string;
  origenTipo?: string;
}

export interface RequerimientoCompraPayload {
  origen_tipo: RequerimientoOrigen;
  oc_recibida_id?: number | null;
  prioridad?: RequerimientoPrioridad;
  observacion?: string | null;
  items: Array<{
    descripcion: string;
    cantidad_requerida: number;
    producto_id?: number | null;
    producto_externo_id?: number | null;
    oc_recibida_item_id?: number | null;
    cotizacion_item_id?: number | null;
  }>;
}

const normalizePagination = <T>(payload: any): RequerimientoCompraPagination<T> => {
  const rows = Array.isArray(payload?.data) ? payload.data : [];

  return {
    data: rows,
    current_page: Number(payload?.current_page || 1),
    last_page: Number(payload?.last_page || 1),
    per_page: Number(payload?.per_page || rows.length || 10),
    total: Number(payload?.total || rows.length),
    from: payload?.from ?? null,
    to: payload?.to ?? null,
  };
};

export async function getRequerimientosCompra(filters: RequerimientoCompraFilters = {}) {
  const response = await api.get("/requerimientos-compra", {
    params: {
      page: filters.page,
      per_page: filters.perPage,
      search: filters.search?.trim() || undefined,
      estado: filters.estado && filters.estado !== "todos" ? filters.estado : undefined,
      origen_tipo: filters.origenTipo && filters.origenTipo !== "todos" ? filters.origenTipo : undefined,
    },
  });

  return normalizePagination<RequerimientoCompra>(response.data);
}

export async function getRequerimientoCompra(id: number | string) {
  const response = await api.get(`/requerimientos-compra/${id}`);
  return (response.data?.requerimiento ?? response.data) as RequerimientoCompra;
}

export async function createRequerimientoCompra(payload: RequerimientoCompraPayload) {
  const response = await api.post("/requerimientos-compra", payload);
  return (response.data?.requerimiento ?? response.data) as RequerimientoCompra;
}

export async function sincronizarRequerimientosOcPendientes() {
  const response = await api.post("/requerimientos-compra/sincronizar-oc-pendientes");
  return response.data as {
    message: string;
    generados: number;
    existentes: number;
    omitidos: number;
  };
}
