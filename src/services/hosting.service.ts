import api from "./api";

export interface HostingApi {
  id: number;
  cliente_id?: number | null;
  empresa: string;
  ruc?: string | null;
  dominio: string;
  plan: string;
  precio_sin_igv?: number | string | null;
  moneda_id?: number | null;
  moneda?: {
    id: number;
    codigo?: string | null;
    simbolo?: string | null;
  } | null;
  suscripcion: "ANUAL" | "MENSUAL";
  fecha_inicio: string;
  fecha_renovacion: string;
  renovacion_programada?: boolean | number;
  renovacion_modo?: "ANUAL" | "MENSUAL" | null;
  renovacion_meses?: number | null;
  renovacion_programada_para?: string | null;
  contacto?: string | null;
  cliente?: string | null;
  correo_hosting?: string | null;
  documentos?: HostingDocumentoApi[];
  cliente_relacionado?: {
    id: number;
    nombre: string;
    ruc?: string | null;
    correo?: string | null;
  } | null;
}

export interface HostingDocumentoApi {
  id: number;
  hosting_id: number;
  nombre_original?: string | null;
  path?: string | null;
  url?: string | null;
  mime_type?: string | null;
  size?: number | string | null;
  created_at?: string | null;
}

export interface HostingPayload {
  cliente_id?: number | null;
  empresa: string;
  ruc?: string | null;
  dominio: string;
  plan: string;
  precio_sin_igv?: number | null;
  moneda_id?: number | null;
  suscripcion: "ANUAL" | "MENSUAL";
  fecha_inicio: string;
  contacto?: string | null;
  cliente?: string | null;
  correo_hosting?: string | null;
}

export interface RenovacionPayload {
  modo: "ANUAL" | "MENSUAL";
  meses?: number | null;
}

export interface HostingImportRow {
  cliente_id?: number | null;
  empresa?: string | null;
  ruc?: string | null;
  dominio?: string | null;
  plan?: string | null;
  suscripcion?: string | null;
  fecha_inicio?: string | null;
  contacto?: string | null;
  cliente?: string | null;
  correo_hosting?: string | null;
}

export interface HostingImportPreviewRow {
  row: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  data: {
    cliente_id?: number | null;
    empresa?: string | null;
    ruc?: string | null;
    dominio?: string | null;
    plan?: string | null;
    suscripcion?: "ANUAL" | "MENSUAL" | string | null;
    fecha_inicio?: string | null;
    fecha_renovacion?: string | null;
    contacto?: string | null;
    cliente?: string | null;
    correo_hosting?: string | null;
  };
}

export interface HostingImportPreview {
  summary: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
  rows: HostingImportPreviewRow[];
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

export const getAllHostings = async (params: Omit<GetHostingsParams, "page" | "perPage"> = {}) => {
  const all: HostingApi[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const response = await getHostings({ ...params, page, perPage: 100 });
    const data = Array.isArray(response) ? response : response.data || [];
    all.push(...data);
    lastPage = Array.isArray(response) ? 1 : Number(response.last_page || page);
    page += 1;
  } while (page <= lastPage);

  return all;
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

export const renovarHosting = async (
  id: number,
  payload: RenovacionPayload
): Promise<{ message: string; hosting: HostingApi }> => {
  const response = await api.post(`/hostings/${id}/renovar`, payload);
  return response.data;
};

export const uploadHostingDocumentos = async (
  id: number,
  files: File[]
): Promise<HostingApi> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("documentos[]", file));

  const response = await api.post(`/hostings/${id}/documentos`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.hosting;
};

export const deleteHostingDocumento = async (
  hostingId: number,
  documentoId: number
): Promise<HostingApi> => {
  const response = await api.delete(
    `/hostings/${hostingId}/documentos/${documentoId}`
  );

  return response.data.hosting;
};

export const previewHostingsImport = async (
  rows: HostingImportRow[]
): Promise<HostingImportPreview> => {
  const response = await api.post("/hostings/import/preview", { rows });
  return response.data;
};

export const confirmHostingsImport = async (
  rows: HostingImportRow[]
): Promise<{ message: string; created: number; hostings: HostingApi[] }> => {
  const response = await api.post("/hostings/import/confirm", { rows });
  return response.data;
};
