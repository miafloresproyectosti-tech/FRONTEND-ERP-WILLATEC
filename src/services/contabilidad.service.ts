import api from "./api";

export interface Pagination<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Comprobante {
  id: number;
  tipo_operacion: "compra" | "venta";
  tipo_comprobante: string;
  serie: string;
  numero: string;
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
  emisor_nombre?: string | null;
  receptor_nombre?: string | null;
  total: number | string;
  estado: string;
  items?: any[];
  proveedor?: any;
  cliente?: any;
  compra?: any;
  oc_recibida?: any;
  moneda?: any;
}

export interface CuentaPorPagar {
  id: number;
  comprobante_id: number;
  comprobante?: Comprobante;
  proveedor?: any;
  total: number | string;
  monto_pagado: number | string;
  saldo: number | string;
  estado: string;
  fecha_vencimiento?: string | null;
  pagos?: any[];
  moneda?: any;
}

export interface CuentaPorCobrar {
  id: number;
  comprobante_id: number;
  comprobante?: Comprobante;
  cliente?: any;
  oc_recibida?: any;
  total: number | string;
  monto_cobrado: number | string;
  saldo: number | string;
  estado: string;
  fecha_vencimiento?: string | null;
  cobros?: any[];
  moneda?: any;
}

const normalizePagination = <T>(payload: any): Pagination<T> => ({
  data: Array.isArray(payload?.data) ? payload.data : [],
  current_page: Number(payload?.current_page || 1),
  last_page: Number(payload?.last_page || 1),
  per_page: Number(payload?.per_page || 10),
  total: Number(payload?.total || 0),
});

export async function getComprobantes(filters: Record<string, any> = {}) {
  const response = await api.get("/contabilidad/comprobantes", {
    params: {
      page: filters.page,
      per_page: filters.perPage,
      buscar: filters.search || undefined,
      estado: filters.estado && filters.estado !== "todos" ? filters.estado : undefined,
      tipo_operacion:
        filters.tipoOperacion && filters.tipoOperacion !== "todos" ? filters.tipoOperacion : undefined,
    },
  });

  return normalizePagination<Comprobante>(response.data);
}

export async function getComprobante(id: number | string) {
  const response = await api.get(`/contabilidad/comprobantes/${id}`);
  return response.data as Comprobante;
}

export async function createComprobante(payload: any) {
  const response = await api.post("/contabilidad/comprobantes", payload);
  return response.data as Comprobante;
}

export async function anularComprobante(id: number | string) {
  const response = await api.patch(`/contabilidad/comprobantes/${id}/anular`);
  return response.data as Comprobante;
}

export async function previewXmlComprobante(file: File) {
  const formData = new FormData();
  formData.append("xml", file);

  const response = await api.post("/contabilidad/comprobantes/preview-xml", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}

export async function generarCuentaPorPagar(comprobanteId: number | string, payload: any = {}) {
  const response = await api.post(`/contabilidad/comprobantes/${comprobanteId}/cuenta-por-pagar`, payload);
  return response.data as CuentaPorPagar;
}

export async function generarCuentaPorCobrar(comprobanteId: number | string, payload: any = {}) {
  const response = await api.post(`/contabilidad/comprobantes/${comprobanteId}/cuenta-por-cobrar`, payload);
  return response.data as CuentaPorCobrar;
}

export async function getCuentasPorPagar(filters: Record<string, any> = {}) {
  const response = await api.get("/contabilidad/cuentas-por-pagar", {
    params: {
      page: filters.page,
      per_page: filters.perPage,
      buscar: filters.search || undefined,
      estado: filters.estado && filters.estado !== "todos" ? filters.estado : undefined,
    },
  });

  return normalizePagination<CuentaPorPagar>(response.data);
}

export async function getCuentaPorPagar(id: number | string) {
  const response = await api.get(`/contabilidad/cuentas-por-pagar/${id}`);
  return response.data as CuentaPorPagar;
}

export async function registrarPago(cuentaId: number | string, payload: any) {
  const response = await api.post(`/contabilidad/cuentas-por-pagar/${cuentaId}/pagos`, payload);
  return response.data as CuentaPorPagar;
}

export async function getCuentasPorCobrar(filters: Record<string, any> = {}) {
  const response = await api.get("/contabilidad/cuentas-por-cobrar", {
    params: {
      page: filters.page,
      per_page: filters.perPage,
      buscar: filters.search || undefined,
      estado: filters.estado && filters.estado !== "todos" ? filters.estado : undefined,
    },
  });

  return normalizePagination<CuentaPorCobrar>(response.data);
}

export async function getCuentaPorCobrar(id: number | string) {
  const response = await api.get(`/contabilidad/cuentas-por-cobrar/${id}`);
  return response.data as CuentaPorCobrar;
}

export async function registrarCobro(cuentaId: number | string, payload: any) {
  const response = await api.post(`/contabilidad/cuentas-por-cobrar/${cuentaId}/cobros`, payload);
  return response.data as CuentaPorCobrar;
}

export async function getAlertasOperativas() {
  const response = await api.get("/operaciones/alertas");
  return response.data as {
    data: Array<{ codigo: string; titulo: string; total: number }>;
    total_alertas: number;
  };
}
