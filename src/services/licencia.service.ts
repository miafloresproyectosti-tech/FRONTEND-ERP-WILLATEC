import api from "./api";

export interface LicenciaApi {
  id: number;
  cliente_id?: number | null;
  empresa: string;
  producto: string;
  cantidad: number;
  suscripcion_meses: number;
  correo_licencia?: string | null;
  fecha_inicio: string;
  fecha_renovacion: string;
  alertas_enviadas_count?: number;
  alertas_enviadas_max_sent_at?: string | null;
  alertas_enviadas?: LicenciaAlertaEnviadaApi[];
  cliente?: {
    id: number;
    nombre: string;
    ruc?: string | null;
    correo?: string | null;
  } | null;
}

export interface LicenciaAlertaEnviadaApi {
  id: number;
  licencia_id: number;
  dias_antes: number;
  correo_destino?: string | null;
  correo_copia?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
}

export interface LicenciaPayload {
  cliente_id?: number | null;
  empresa: string;
  producto: string;
  cantidad: number;
  suscripcion_meses: number;
  correo_licencia?: string | null;
  fecha_inicio: string;
}

export interface LicenciaImportRow {
  cliente_id?: number | null;
  empresa?: string | null;
  producto?: string | null;
  cantidad?: number | string | null;
  suscripcion_meses?: number | string | null;
  correo_licencia?: string | null;
  fecha_inicio?: string | null;
}

export interface LicenciaImportPreviewRow {
  row: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  data: {
    cliente_id?: number | null;
    empresa?: string | null;
    producto?: string | null;
    cantidad?: number | null;
    suscripcion_meses?: number | null;
    correo_licencia?: string | null;
    fecha_inicio?: string | null;
    fecha_renovacion?: string | null;
  };
}

export interface LicenciaImportPreview {
  summary: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
  rows: LicenciaImportPreviewRow[];
}

export interface GetLicenciasParams {
  page?: number;
  search?: string;
  estado?: "VIGENTE" | "POR VENCER" | "VENCIDO";
  suscripcionMeses?: number;
  perPage?: number;
}

export const getLicencias = async (params: GetLicenciasParams = {}) => {
  const response = await api.get("/licencias", {
    params: {
      page: params.page ?? 1,
      search: params.search?.trim() || undefined,
      estado: params.estado,
      suscripcion_meses: params.suscripcionMeses,
      per_page: params.perPage ?? 100,
    },
  });

  return response.data;
};

export const createLicencia = async (
  payload: LicenciaPayload
): Promise<LicenciaApi> => {
  const response = await api.post("/licencias", payload);
  return response.data.licencia;
};

export const updateLicencia = async (
  id: number,
  payload: LicenciaPayload
): Promise<LicenciaApi> => {
  const response = await api.put(`/licencias/${id}`, payload);
  return response.data.licencia;
};

export const deleteLicencia = async (id: number): Promise<void> => {
  await api.delete(`/licencias/${id}`);
};

export const previewLicenciasImport = async (
  rows: LicenciaImportRow[]
): Promise<LicenciaImportPreview> => {
  const response = await api.post("/licencias/import/preview", { rows });
  return response.data;
};

export const confirmLicenciasImport = async (
  rows: LicenciaImportRow[]
): Promise<{ message: string; created: number; licencias: LicenciaApi[] }> => {
  const response = await api.post("/licencias/import/confirm", { rows });
  return response.data;
};
