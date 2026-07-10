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
  serie?: string;
  marca?: string;
  modelo?: string;
  date_from?: string;
  date_to?: string;
}

export interface InventarioMovimiento {
  id: number;
  producto_id: number;
  producto_serie_id?: number | string | null;
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
  proveedor_id?: number | string | null;
  proveedor_catalogo?: {
    id?: number;
    nombre?: string | null;
    ruc?: string | null;
  } | null;
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
    serie?: string | null;
    marca?: string | null;
    modelo?: string | null;
  } | null;
  producto_serie?: {
    id?: number;
    producto_id?: number;
    serie?: string | null;
    factura_numero?: string | null;
    estado?: string | null;
  } | null;
  producto_series?: {
    id?: number;
    producto_id?: number;
    serie?: string | null;
    factura_numero?: string | null;
    estado?: string | null;
  }[];
  garantia_info?: {
    garantia_meses: number;
    fecha_inicio: string;
    fecha_vencimiento: string;
    vigente: boolean;
    dias_restantes: number;
    oc_numero?: string | null;
    cliente_nombre?: string | null;
    cliente_ruc?: string | null;
    cotizacion_numero?: string | null;
  } | null;
  created_at: string;
}

export interface ProductoInventarioOption {
  id: number;
  nombre: string;
  sku?: string | null;
  codigo?: string | null;
  serie?: string | null;
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
  series?: {
    id: number;
    producto_id?: number;
    serie?: string | null;
    factura_numero?: string | null;
    estado?: string | null;
    fecha_ingreso?: string | null;
  }[];
}

export interface RegistrarEntradaKardexPayload {
  producto_id: number;
  cantidad: number;
  costo_unitario: number;
  moneda_id: number;
  proveedor_id?: number | null;
  proveedor?: string;
  documento_tipo?: string;
  documento_numero?: string;
  fecha_documento?: string;
  observacion?: string;
  series?: string[];
  factura?: File | null;
}

export interface RegistrarSalidaKardexPayload {
  producto_id: number;
  cantidad: number;
  motivo: string;
  moneda_id?: number;
  documento_tipo?: string;
  documento_numero?: string;
  fecha_documento?: string;
  observacion?: string;
  producto_serie_ids?: number[];
  documento?: File | null;
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
  if (payload.proveedor_id) formData.append("proveedor_id", String(payload.proveedor_id));
  if (payload.documento_numero) formData.append("documento_numero", payload.documento_numero);
  if (payload.fecha_documento) formData.append("fecha_documento", payload.fecha_documento);
  if (payload.observacion) formData.append("observacion", payload.observacion);
  payload.series?.forEach((serie, index) => {
    if (serie.trim()) formData.append(`series[${index}]`, serie.trim());
  });
  if (payload.factura) formData.append("factura", payload.factura);

  const response = await api.post(
    `/productos/${payload.producto_id}/registrar-entrada`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return response.data;
}

export async function registrarSalidaKardex(payload: RegistrarSalidaKardexPayload) {
  const formData = new FormData();
  formData.append("cantidad", String(payload.cantidad));
  formData.append("motivo", payload.motivo);

  if (payload.moneda_id) formData.append("moneda_id", String(payload.moneda_id));
  if (payload.documento_tipo) formData.append("documento_tipo", payload.documento_tipo);
  if (payload.documento_numero) formData.append("documento_numero", payload.documento_numero);
  if (payload.fecha_documento) formData.append("fecha_documento", payload.fecha_documento);
  if (payload.observacion) formData.append("observacion", payload.observacion);
  payload.producto_serie_ids?.forEach((id, index) => {
    formData.append(`producto_serie_ids[${index}]`, String(id));
  });
  if (payload.documento) formData.append("documento", payload.documento);

  const response = await api.post(
    `/productos/${payload.producto_id}/registrar-salida`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return response.data;
}
