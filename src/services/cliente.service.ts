import api from "./api";

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

export const getCliente = async (id: number): Promise<Cliente> => {
  const res = await api.get(`/clientes/${id}`);
  return res.data;
};

export const createCliente = async (
  payload: ClientePayload,
): Promise<Cliente> => {
  const res = await api.post("/clientes", payload);
  return res.data.cliente;
};

export const updateCliente = async (
  id: number,
  payload: ClientePayload,
): Promise<Cliente> => {
  const res = await api.put(`/clientes/${id}`, payload);
  return res.data.cliente;
};

export const deleteCliente = async (id: number): Promise<void> => {
  await api.delete(`/clientes/${id}`);
};
