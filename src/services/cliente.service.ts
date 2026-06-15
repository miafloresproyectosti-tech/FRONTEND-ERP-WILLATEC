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

// Tu backend devuelve respuesta paginada con array en data
export const getClientes = async (page = 1, search = "", perPage = 10) => {
  const response = await api.get("/clientes", {
    params: {
      page,
      search,
      per_page: perPage,
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
