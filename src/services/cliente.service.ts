import api from "./api";

export interface Cliente {
  id: number;
  nombre: string;
  ruc: string;
  correo: string | null;
  telefono: string | null;
  estado: "activo" | "inactivo";
  tipo_cliente_id: number;
  moneda_id: number;
}

export interface ClientePayload {
  nombre: string;
  ruc?: string;
  correo?: string;
  telefono?: string;
  estado?: "activo" | "inactivo";
  tipo_cliente_id?: number;
  moneda_id?: number;
}

// Tu backend devuelve array directo (no paginado)
export const getClientes = async (): Promise<Cliente[]> => {
  const res = await api.get("/clientes");
  return res.data;
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
