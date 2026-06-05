import api from "./api";

export type AuditEvent = "created" | "updated" | "deleted";
export type AuditTipo =
  | "cliente"
  | "cotizacion"
  | "cotizacion_item"
  | "cotizacion_costo";

export interface AuditoriaCambio {
  campo: string;
  antes: unknown;
  despues: unknown;
}

export interface AuditoriaItem {
  id: number;
  accion: AuditEvent | string;
  descripcion: string;
  entidad: {
    tipo: AuditTipo | string;
    id: number | string | null;
    nombre: string | null;
  };
  usuario: {
    id: number | null;
    nombre: string | null;
    email: string | null;
  } | null;
  cambios: AuditoriaCambio[];
  created_at: string;
}

export interface AuditoriaFilters {
  page?: number;
  per_page?: number;
  event?: string;
  tipo?: string;
  subject_id?: string;
  causer_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface AuditoriaPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface AuditoriaResponse {
  data: AuditoriaItem[];
  meta: AuditoriaPagination;
}

type LaravelPaginator = {
  data?: AuditoriaItem[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  from?: number | null;
  to?: number | null;
  meta?: Partial<AuditoriaPagination>;
};

const defaultMeta: AuditoriaPagination = {
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
  from: null,
  to: null,
};

const normalizeAuditoriaResponse = (payload: LaravelPaginator): AuditoriaResponse => {
  const source = payload.data && !Array.isArray(payload.data) ? payload.data : payload;
  const data = Array.isArray(payload.data) ? payload.data : [];
  const metaSource = payload.meta ?? source;

  return {
    data,
    meta: {
      current_page: Number(metaSource.current_page ?? defaultMeta.current_page),
      last_page: Number(metaSource.last_page ?? defaultMeta.last_page),
      per_page: Number(metaSource.per_page ?? defaultMeta.per_page),
      total: Number(metaSource.total ?? data.length),
      from: metaSource.from ?? (data.length ? 1 : null),
      to: metaSource.to ?? (data.length ? data.length : null),
    },
  };
};

export const getAuditoria = async (
  filters: AuditoriaFilters = {},
): Promise<AuditoriaResponse> => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ""),
  );

  const response = await api.get<LaravelPaginator>("/auditoria", { params });
  return normalizeAuditoriaResponse(response.data);
};
