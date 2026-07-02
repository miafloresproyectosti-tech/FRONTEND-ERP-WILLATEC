import api from "./api";
import { cachedRequest, clearCacheByPrefix } from "../utils/cache";

export interface Cliente {
  id: number;
  nombre: string;
  ruc: string;
  contacto?: string | null;
  correo: string | null;
  telefono: string | null;
  estado: "activo" | "inactivo";
  tipo_cliente_id: number;
  moneda_id: number;
}

export interface ClientePayload {
  nombre: string;
  ruc?: string;
  contacto?: string;
  correo?: string | null;
  telefono?: string | null;
  estado?: "activo" | "inactivo";
  tipo_cliente_id?: number;
  moneda_id?: number;
}

export interface GetClientesParams {
  page?: number;
  search?: string;
  perPage?: number;
  estado?: "activo" | "inactivo";
  tipoClienteId?: number;
}

const ACTIVE_CLIENTES_CACHE_KEY = "clientes:activos:all";
const ACTIVE_CLIENTES_SEARCH_CACHE_PREFIX = "clientes:activos:search:";
const ACTIVE_CLIENTES_TTL_MS = 5 * 60 * 1000;

// Tu backend devuelve respuesta paginada con array en data
export const getClientes = async (
  pageOrParams: number | GetClientesParams = 1,
  search = "",
  perPage = 10,
) => {
  const params =
    typeof pageOrParams === "object"
      ? pageOrParams
      : {
          page: pageOrParams,
          search,
          perPage,
        };

  const response = await api.get("/clientes", {
    params: {
      page: params.page ?? 1,
      search: params.search?.trim() || undefined,
      per_page: params.perPage ?? 10,
      estado: params.estado,
      tipo_cliente_id: params.tipoClienteId,
    },
  });

  return response.data;
};

export const getActiveClientesCached = async (): Promise<Cliente[]> => {
  return cachedRequest(
    ACTIVE_CLIENTES_CACHE_KEY,
    async () => {
      const perPage = 100;
      const firstPage = await getClientes({
        page: 1,
        perPage,
        estado: "activo",
      });
      const allClientes = Array.isArray(firstPage) ? firstPage : firstPage.data || [];
      const lastPage = Array.isArray(firstPage) ? 1 : Number(firstPage.last_page || 1);

      for (let page = 2; page <= lastPage; page += 1) {
        const response = await getClientes({
          page,
          perPage,
          estado: "activo",
        });

        allClientes.push(...(Array.isArray(response) ? response : response.data || []));
      }

      return allClientes;
    },
    { ttlMs: ACTIVE_CLIENTES_TTL_MS }
  );
};

export const getActiveClientesSearchCached = async (
  search = "",
  perPage = 25
): Promise<Cliente[]> => {
  const normalizedSearch = search.trim();
  const cacheKey = `${ACTIVE_CLIENTES_SEARCH_CACHE_PREFIX}${perPage}:${normalizedSearch.toLowerCase()}`;

  return cachedRequest(
    cacheKey,
    async () => {
      const response = await getClientes({
        page: 1,
        perPage,
        search: normalizedSearch,
        estado: "activo",
      });

      return Array.isArray(response) ? response : response.data || [];
    },
    { ttlMs: ACTIVE_CLIENTES_TTL_MS }
  );
};

export const getCliente = async (id: number): Promise<Cliente> => {
  const res = await api.get(`/clientes/${id}`);
  return res.data;
};

export const createCliente = async (
  payload: ClientePayload,
): Promise<Cliente> => {
  const res = await api.post("/clientes", payload);
  clearCacheByPrefix("clientes:");
  return res.data.cliente;
};

export const updateCliente = async (
  id: number,
  payload: ClientePayload,
): Promise<Cliente> => {
  const res = await api.put(`/clientes/${id}`, payload);
  clearCacheByPrefix("clientes:");
  return res.data.cliente;
};

export const deleteCliente = async (id: number): Promise<void> => {
  await api.delete(`/clientes/${id}`);
  clearCacheByPrefix("clientes:");
};
