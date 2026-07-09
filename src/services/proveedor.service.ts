import api from "./api";

export interface Proveedor {
  id: number;
  nombre: string;
  ruc?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  observaciones?: string | null;
  activo?: boolean;
}

export interface ProveedorPayload {
  nombre: string;
  ruc?: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  observaciones?: string;
  activo?: boolean;
}

export async function getProveedores(params: { search?: string; activo?: boolean; per_page?: number } = {}) {
  const response = await api.get("/proveedores", {
    params: {
      activo: (params.activo ?? true) ? 1 : 0,
      per_page: params.per_page ?? 100,
      search: params.search || undefined,
    },
  });

  return (Array.isArray(response.data?.data) ? response.data.data : response.data) as Proveedor[];
}

export async function createProveedor(payload: ProveedorPayload) {
  const response = await api.post("/proveedores", payload);

  return response.data.proveedor as Proveedor;
}
