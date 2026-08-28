import api from "./api";

export interface WooPedidoItem {
  id: number;
  woo_line_item_id?: number | null;
  woo_product_id?: number | null;
  woo_variation_id?: number | null;
  producto_id?: number | null;
  sku?: string | null;
  nombre?: string | null;
  cantidad: number | string;
  precio_unitario: number | string;
  total: number | string;
  stock_disponible_snapshot?: number | string | null;
  estado_match: string;
  estado_reserva: string;
  mensaje?: string | null;
  producto?: {
    id: number;
    nombre?: string | null;
    sku?: string | null;
    codigo?: string | null;
    stock_actual?: number | string | null;
    stock_reservado?: number | string | null;
    stock_disponible?: number | string | null;
  } | null;
}

export interface WooPedido {
  id: number;
  woo_order_id: number;
  numero?: string | null;
  estado_woo?: string | null;
  estado_erp: string;
  cliente_nombre?: string | null;
  cliente_email?: string | null;
  cliente_telefono?: string | null;
  moneda?: string | null;
  total: number | string;
  fecha_woo?: string | null;
  last_synced_at?: string | null;
  reservado_at?: string | null;
  atendido_at?: string | null;
  items_count?: number;
  items?: WooPedidoItem[];
}

export interface WooPedidoPaginatedResponse {
  data: WooPedido[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export const getWooPedidos = async ({
  page = 1,
  search = "",
  estadoErp = "",
  perPage = 10,
}: {
  page?: number;
  search?: string;
  estadoErp?: string;
  perPage?: number;
} = {}): Promise<WooPedidoPaginatedResponse> => {
  const response = await api.get("/woocommerce/pedidos", {
    params: {
      page,
      search: search.trim() || undefined,
      estado_erp: estadoErp || undefined,
      per_page: perPage,
    },
  });

  return response.data;
};

export const getWooPedido = async (id: number | string): Promise<WooPedido> => {
  const response = await api.get(`/woocommerce/pedidos/${id}`);
  return response.data;
};

export const sincronizarWooPedidos = async (perPage = 25): Promise<{ message?: string; resumen?: unknown }> => {
  const response = await api.post("/woocommerce/pedidos/sincronizar", { per_page: perPage });
  return response.data;
};

export const reservarWooPedido = async (id: number | string): Promise<{ message?: string; pedido: WooPedido }> => {
  const response = await api.post(`/woocommerce/pedidos/${id}/reservar`);
  return response.data;
};
