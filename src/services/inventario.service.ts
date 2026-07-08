import api from "./api";

export interface InventarioMovimientoFilters {
  page?: number;
  per_page?: number;
  search?: string;
  producto_id?: string | number;
  tipo_movimiento?: string;
  origen?: string;
  created_by?: string | number;
  ip_origen?: string;
  date_from?: string;
  date_to?: string;
}

export interface InventarioMovimiento {
  id: number;
  producto_id: number;
  tipo_movimiento: string;
  cantidad: number | string;
  entrada_cantidad?: number | string;
  salida_cantidad?: number | string;
  stock_antes: number | string;
  stock_despues: number | string;
  saldo_cantidad?: number | string;
  costo_unitario?: number | string;
  moneda_id?: number | string | null;
  moneda?: {
    id?: number;
    codigo?: string | null;
    simbolo?: string | null;
    nombre?: string | null;
  } | null;
  costo_promedio_antes?: number | string;
  costo_promedio_despues?: number | string;
  valor_movimiento?: number | string;
  valor_stock_despues?: number | string;
  referencia_tipo?: string | null;
  referencia_id?: number | null;
  origen?: string | null;
  idempotency_key?: string | null;
  observacion?: string | null;
  documento_tipo?: string | null;
  documento_numero?: string | null;
  documento_path?: string | null;
  fecha_documento?: string | null;
  proveedor?: string | null;
  ip_origen?: string | null;
  user_agent?: string | null;
  created_by?: {
    id: number;
    nombres?: string | null;
    apellidos?: string | null;
    email?: string | null;
  } | null;
  producto?: {
    id: number;
    nombre?: string | null;
    sku?: string | null;
    codigo?: string | null;
  } | null;
  created_at: string;
}

export interface ProductoInventarioOption {
  id: number;
  nombre: string;
  sku?: string | null;
  codigo?: string | null;
  stock_actual?: number | string | null;
  stock_reservado?: number | string | null;
  stock_disponible?: number | string | null;
  costo_promedio?: number | string | null;
  valor_stock?: number | string | null;
  moneda_id?: number | string | null;
  moneda?: {
    id?: number;
    codigo?: string | null;
    simbolo?: string | null;
    nombre?: string | null;
  } | null;
}

export interface RegistrarEntradaKardexPayload {
  producto_id: number;
  cantidad: number;
  costo_unitario: number;
  moneda_id: number;
  proveedor?: string;
  documento_tipo?: string;
  documento_numero?: string;
  fecha_documento?: string;
  observacion?: string;
  factura?: File | null;
}

export interface InventarioMovimientoPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

interface LaravelPaginator {
  data: InventarioMovimiento[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export async function getInventarioMovimientos(
  filters: InventarioMovimientoFilters = {},
): Promise<{ data: InventarioMovimiento[]; meta: InventarioMovimientoPagination }> {
  const response = await api.get<LaravelPaginator>("/inventario/movimientos", {
    params: filters,
  });

  const { data, current_page, last_page, per_page, total, from, to } = response.data;

  return {
    data,
    meta: {
      current_page,
      last_page,
      per_page,
      total,
      from,
      to,
    },
  };
}

export async function getProductosInventario(): Promise<ProductoInventarioOption[]> {
  const response = await api.get("/productos", {
    params: {
      activo: 1,
      per_page: 100,
    },
  });

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];

  return rows.map((row: ProductoInventarioOption) => ({
    ...row,
    sku: row.sku || row.codigo || null,
  }));
}

export async function registrarEntradaKardex(payload: RegistrarEntradaKardexPayload) {
  const formData = new FormData();
  formData.append("cantidad", String(payload.cantidad));
  formData.append("costo_unitario", String(payload.costo_unitario));
  formData.append("moneda_id", String(payload.moneda_id));
  formData.append("documento_tipo", payload.documento_tipo || "factura");

  if (payload.proveedor) formData.append("proveedor", payload.proveedor);
  if (payload.documento_numero) formData.append("documento_numero", payload.documento_numero);
  if (payload.fecha_documento) formData.append("fecha_documento", payload.fecha_documento);
  if (payload.observacion) formData.append("observacion", payload.observacion);
  if (payload.factura) formData.append("factura", payload.factura);

  const response = await api.post(
    `/productos/${payload.producto_id}/registrar-entrada`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return response.data;
}
