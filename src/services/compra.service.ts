import api from "./api";

export type CompraModalidad = "directa" | "oc_proveedor";
export type CompraEstado =
  | "borrador"
  | "confirmada"
  | "parcialmente_recibida"
  | "recibida"
  | "cancelada";

export interface CompraPagination<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
}

export interface CompraItem {
  id: number;
  compra_id?: number;
  requerimiento_compra_item_id?: number | null;
  oc_emitida_item_id?: number | null;
  producto_id?: number | null;
  producto_externo_id?: number | null;
  descripcion: string;
  cantidad: number | string;
  cantidad_recibida?: number | string;
  costo_unitario_estimado?: number | string | null;
  moneda_id?: number | null;
  estado?: string;
  requerimiento_compra_item?: {
    id: number;
    requerimiento_compra_id?: number;
    descripcion?: string;
    cantidad_requerida?: number | string;
    cantidad_comprada?: number | string;
    cantidad_recibida?: number | string;
    requerimiento?: {
      id: number;
      numero?: string;
    };
  } | null;
}

export interface Compra {
  id: number;
  numero: string;
  proveedor_id: number;
  proveedor?: {
    id: number;
    nombre: string;
    ruc?: string | null;
  } | null;
  oc_emitida_id?: number | null;
  oc_emitida?: {
    id: number;
    numero?: string;
    proveedor?: string;
  } | null;
  modalidad: CompraModalidad;
  estado: CompraEstado;
  fecha_compra?: string | null;
  moneda_id?: number | null;
  moneda?: {
    id: number;
    codigo?: string | null;
    simbolo?: string | null;
  } | null;
  subtotal_estimado?: number | string | null;
  total_estimado?: number | string | null;
  observacion?: string | null;
  creado_por?: number | null;
  creado_por_user?: {
    id: number;
    nombres?: string | null;
    apellidos?: string | null;
    email?: string | null;
  } | null;
  creado_por_relation?: unknown;
  creado_por_nombre?: string;
  creadoPor?: unknown;
  items_count?: number;
  items?: CompraItem[];
  created_at?: string;
  updated_at?: string;
}

export interface CompraFilters {
  page?: number;
  perPage?: number;
  buscar?: string;
  estado?: string;
  modalidad?: string;
  proveedorId?: number | string | null;
}

export interface CompraPayload {
  proveedor_id: number;
  modalidad: CompraModalidad;
  oc_emitida_id?: number | null;
  fecha_compra?: string | null;
  moneda_id?: number | null;
  observacion?: string | null;
  items: Array<{
    requerimiento_compra_item_id?: number | null;
    oc_emitida_item_id?: number | null;
    producto_id?: number | null;
    producto_externo_id?: number | null;
    descripcion?: string | null;
    cantidad: number;
    costo_unitario_estimado?: number | null;
    moneda_id?: number | null;
  }>;
}

const normalizePagination = <T>(payload: any): CompraPagination<T> => {
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

export async function getCompras(filters: CompraFilters = {}) {
  const response = await api.get("/compras", {
    params: {
      page: filters.page,
      per_page: filters.perPage,
      buscar: filters.buscar?.trim() || undefined,
      estado: filters.estado && filters.estado !== "todos" ? filters.estado : undefined,
      modalidad: filters.modalidad && filters.modalidad !== "todos" ? filters.modalidad : undefined,
      proveedor_id: filters.proveedorId || undefined,
    },
  });

  return normalizePagination<Compra>(response.data);
}

export async function getCompra(id: number | string) {
  const response = await api.get(`/compras/${id}`);
  return response.data as Compra;
}

export async function createCompra(payload: CompraPayload) {
  const response = await api.post("/compras", payload);
  return response.data as Compra;
}

export async function confirmarCompra(id: number | string) {
  const response = await api.patch(`/compras/${id}/confirmar`);
  return response.data as Compra;
}

export async function cancelarCompra(id: number | string) {
  const response = await api.patch(`/compras/${id}/cancelar`);
  return response.data as Compra;
}
