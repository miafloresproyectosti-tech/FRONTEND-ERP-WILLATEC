import api from "./api";

export interface Pagination<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface RecepcionCompra {
  id: number;
  numero: string;
  compra_id: number;
  compra?: any;
  proveedor?: any;
  fecha_recepcion?: string | null;
  estado: "borrador" | "confirmada" | "cancelada";
  observacion?: string | null;
  items_count?: number;
  items?: any[];
}

const normalizePagination = <T>(payload: any): Pagination<T> => ({
  data: Array.isArray(payload?.data) ? payload.data : [],
  current_page: Number(payload?.current_page || 1),
  last_page: Number(payload?.last_page || 1),
  per_page: Number(payload?.per_page || 10),
  total: Number(payload?.total || 0),
});

export async function getRecepcionesCompra(filters: Record<string, any> = {}) {
  const response = await api.get("/recepciones-compra", {
    params: {
      page: filters.page,
      per_page: filters.perPage,
      search: filters.search || undefined,
      estado: filters.estado && filters.estado !== "todos" ? filters.estado : undefined,
      compra_id: filters.compraId || undefined,
    },
  });

  return normalizePagination<RecepcionCompra>(response.data);
}

export async function getRecepcionCompra(id: number | string) {
  const response = await api.get(`/recepciones-compra/${id}`);
  return response.data as RecepcionCompra;
}

export async function createRecepcionCompra(compraId: number | string, payload: any) {
  const response = await api.post(`/compras/${compraId}/recepciones`, payload);
  return response.data as RecepcionCompra;
}

export async function confirmarRecepcionCompra(id: number | string, payload: any = {}) {
  const response = await api.patch(`/recepciones-compra/${id}/confirmar`, payload);
  return response.data as RecepcionCompra;
}

export async function cancelarRecepcionCompra(id: number | string) {
  const response = await api.patch(`/recepciones-compra/${id}/cancelar`);
  return response.data as RecepcionCompra;
}
