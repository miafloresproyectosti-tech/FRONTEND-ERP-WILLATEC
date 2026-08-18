import api from "./api";
import type {
  CotizacionRelacionada,
  Oportunidad,
  OportunidadComentario,
} from "../types/licitaciones";
import { applyExpiredState } from "../utils/licitaciones";

const normalizeOpportunity = (item: any): Oportunidad => ({
  id: item.id,
  tipo: item.tipo,
  empresa: item.empresa,
  requerimiento: item.requerimiento,
  vigencia: item.vigencia,
  ejecutivo: {
    id: item.ejecutivo?.id ?? item.ejecutivo_id ?? 0,
    nombre: item.ejecutivo?.nombre ?? item.ejecutivo_nombre ?? "Sin ejecutivo",
    email: item.ejecutivo?.email ?? item.ejecutivo_email ?? "",
  },
  asignadoA: item.asignado_a ?? item.asignadoA ?? null,
  asignadoEn: item.asignado_en ?? item.asignadoEn ?? null,
  asignadoPor: item.asignado_por ?? item.asignadoPor ?? null,
  esNueva: Boolean(item.es_nueva ?? item.esNueva ?? false),
  categoria: item.categoria,
  estado: item.estado,
  observacion: item.observacion ?? "",
  creadoEn: item.creado_en ?? item.creadoEn,
  creadoPorId: item.created_by ?? item.creadoPorId ?? null,
  creadoPor: item.creado_por ?? item.creadoPor ?? "Sistema",
  modificadoEn: item.modificado_en ?? item.modificadoEn,
  modificadoPor: item.modificado_por ?? item.modificadoPor,
  garantia: item.garantia ?? "",
  plazo: item.plazo ?? "",
  carpetaServidor: item.carpeta_servidor ?? item.carpetaServidor ?? "",
  tdr: item.tdr ?? undefined,
  formaPago: item.forma_pago ?? item.formaPago,
  destinoEntrega: item.destino_entrega ?? item.destinoEntrega ?? "",
  wherexId: item.wherex_id ?? item.wherexId ?? "",
  wherexUrl: item.wherex_url ?? item.wherexUrl ?? "",
  comentariosGenerales: item.comentarios_generales ?? item.comentariosGenerales ?? "",
  cotizacionId: item.cotizacion_id ?? item.cotizacionId ?? "",
  cotizacionNumero: item.cotizacion_numero ?? item.cotizacionNumero ?? "",
  comentarios: Array.isArray(item.comentarios) ? item.comentarios : [],
  archivos: Array.isArray(item.archivos) ? item.archivos : [],
  historial: Array.isArray(item.historial) ? item.historial : [],
  cotizaciones: Array.isArray(item.cotizaciones)
    ? item.cotizaciones.map((cotizacion: any) => ({
        ...cotizacion,
        cotizacionId: cotizacion.cotizacionId ?? cotizacion.cotizacion_id ?? null,
        origen: cotizacion.origen ?? "vinculada",
        creadoPorId: cotizacion.creadoPorId ?? cotizacion.creado_por_id ?? null,
        creadoPor: cotizacion.creadoPor ?? cotizacion.creado_por,
        tieneModificacionPendiente: Boolean(cotizacion.tieneModificacionPendiente ?? cotizacion.tiene_modificacion_pendiente ?? false),
        modificacionPendiente: cotizacion.modificacionPendiente ?? cotizacion.modificacion_pendiente ?? null,
      }))
    : [],
});

const normalizeList = (items: any[]): Oportunidad[] => items.map(normalizeOpportunity).map(applyExpiredState);

export const getOportunidades = async (): Promise<Oportunidad[]> => {
  const { data } = await api.get<any[] | { data?: any[] }>("/licitaciones", {
    params: { lite: 1 },
  });
  return normalizeList(Array.isArray(data) ? data : data.data || []);
};

export const getOportunidad = async (id: string): Promise<Oportunidad> => {
  const { data } = await api.get<any>(`/licitaciones/${id}`);
  return applyExpiredState(normalizeOpportunity(data));
};

export const saveOportunidad = async (opportunity: Oportunidad) => {
  const payload = {
    ...opportunity,
    ejecutivo: opportunity.ejecutivo,
    ejecutivo_id: opportunity.ejecutivo?.id,
    ejecutivo_nombre: opportunity.ejecutivo?.nombre,
    ejecutivo_email: opportunity.ejecutivo?.email,
    creadoEn: opportunity.creadoEn,
    created_by: opportunity.creadoPorId,
    creadoPor: opportunity.creadoPor,
    modificadoEn: opportunity.modificadoEn,
    modificadoPor: opportunity.modificadoPor,
    carpetaServidor: opportunity.carpetaServidor,
    comentariosGenerales: opportunity.comentariosGenerales,
    cotizacionId: opportunity.cotizacionId,
    cotizacionNumero: opportunity.cotizacionNumero,
    formaPago: opportunity.formaPago,
    destinoEntrega: opportunity.destinoEntrega,
    wherexId: opportunity.wherexId,
    wherexUrl: opportunity.wherexUrl,
    esNueva: opportunity.esNueva,
  };

  const isPersisted = Boolean(opportunity.id) && !opportunity.id.startsWith("op-");

  if (isPersisted) {
    const { data } = await api.put<any>(`/licitaciones/${opportunity.id}`, payload);
    return normalizeOpportunity(data);
  }

  const { id: _localId, ...createPayload } = payload;
  const { data } = await api.post<any>("/licitaciones", createPayload);
  return normalizeOpportunity(data);
};

export const deleteOportunidad = async (id: string) => {
  await api.delete(`/licitaciones/${id}`);
};

export const addComentarioOportunidad = async (
  id: string,
  comentario: OportunidadComentario
) => {
  const { data } = await api.post<any>(`/licitaciones/${id}/comentarios`, comentario);
  return data;
};

export const addArchivoOportunidad = async (
  oportunidadId: string,
  archivo: any
): Promise<Oportunidad> => {
  const { data } = await api.post<any>(`/licitaciones/${oportunidadId}/archivos`, { archivo });
  return applyExpiredState(normalizeOpportunity(data));
};

export const addCotizacionRelacionada = async (
  id: string,
  userName: string,
  cotizacion?: {
    cotizacion_id: number;
    numero?: string;
    estado?: string;
    monto?: number;
    moneda?: string;
    origen?: "vinculada" | "generada";
  }
): Promise<CotizacionRelacionada> => {
  const { data } = await api.post<any>(`/licitaciones/${id}/cotizaciones`, {
    userName,
    ...cotizacion,
  });
  return data;
};

export const deleteArchivoOportunidad = async (
  oportunidadId: string,
  archivoId: string
): Promise<Oportunidad> => {
  const { data } = await api.delete<any>(`/licitaciones/${oportunidadId}/archivos/${archivoId}`);
  return applyExpiredState(normalizeOpportunity(data));
};

export const deleteCotizacionRelacionada = async (
  oportunidadId: string,
  relacionId: string
): Promise<Oportunidad> => {
  const { data } = await api.delete<any>(`/licitaciones/${oportunidadId}/cotizaciones/${relacionId}`);
  return applyExpiredState(normalizeOpportunity(data));
};
