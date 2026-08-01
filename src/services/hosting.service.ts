import api from "./api";

export interface HostingApi {
  id: number;
  cliente_id?: number | null;
  empresa: string;
  ruc?: string | null;
  dominio: string;
  plan: string;
  suscripcion: "ANUAL" | "MENSUAL";
  fecha_inicio: string;
  fecha_renovacion: string;
  contacto?: string | null;
  cliente?: string | null;
  correo_hosting?: string | null;
  cliente_relacionado?: {
    id: number;
    nombre: string;
    ruc?: string | null;
    correo?: string | null;
  } | null;
}

export interface HostingPayload {
  cliente_id?: number | null;
  empresa: string;
  ruc?: string | null;
  dominio: string;
  plan: string;
  suscripcion: "ANUAL" | "MENSUAL";
  fecha_inicio: string;
  contacto?: string | null;
  cliente?: string | null;
  correo_hosting?: string | null;
}

export interface GetHostingsParams {
  page?: number;
  search?: string;
  estado?: "VIGENTE" | "POR VENCER" | "VENCIDO";
  suscripcion?: "ANUAL" | "MENSUAL";
  perPage?: number;
}

export const getHostings = async (params: GetHostingsParams = {}) => {
  const response = await api.get("/hostings", {
    params: {
      page: params.page ?? 1,
      search: params.search?.trim() || undefined,
      estado: params.estado,
      suscripcion: params.suscripcion,
      per_page: params.perPage ?? 100,
    },
  });

  return response.data;
};

export const createHosting = async (
  payload: HostingPayload
): Promise<HostingApi> => {
  const response = await api.post("/hostings", payload);
  return response.data.hosting;
};

export const updateHosting = async (
  id: number,
  payload: HostingPayload
): Promise<HostingApi> => {
  const response = await api.put(`/hostings/${id}`, payload);
  return response.data.hosting;
};

export const deleteHosting = async (id: number): Promise<void> => {
  await api.delete(`/hostings/${id}`);
};
