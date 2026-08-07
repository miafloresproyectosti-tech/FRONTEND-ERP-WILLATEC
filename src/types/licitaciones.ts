export type OportunidadTipo = "licitacion" | "privado" | "wherex";

export type OportunidadEstado =
  | "sin_atender"
  | "en_atencion"
  | "atendido"
  | "cotizacion_generada"
  | "ganada"
  | "perdida"
  | "no_se_realizara"
  | "vencida";

export type OportunidadPayment =
  | "credito_15"
  | "credito_30"
  | "al_contado";

export interface OportunidadArchivo {
  id: string;
  nombre: string;
  tipo: string;
  tamanio: number;
  dataUrl: string;
  creadoEn: string;
  creadoPor: string;
}

export interface OportunidadComentario {
  id: string;
  usuario: string;
  fecha: string;
  comentario: string;
}

export interface OportunidadHistorial {
  id: string;
  fecha: string;
  usuario: string;
  tipo: "creacion" | "estado" | "responsable" | "comentario" | "archivo" | "cotizacion" | "cierre";
  descripcion: string;
}

export interface OportunidadPerdida {
  motivo: string;
  observacionesCliente?: string;
  documento?: OportunidadArchivo;
  fecha?: string;
  usuario?: string;
}

export interface CotizacionRelacionada {
  id: string;
  numero: string;
  fecha: string;
  estado: "borrador" | "generada";
}

export interface EjecutivoAsignado {
  id: number;
  nombre: string;
  email?: string;
}

export interface Oportunidad {
  id: string;
  tipo: OportunidadTipo;
  empresa: string;
  requerimiento: string;
  vigencia: string;
  ejecutivo: EjecutivoAsignado;
  asignadoA?: number | null;
  asignadoEn?: string | null;
  asignadoPor?: string | null;
  esNueva?: boolean;
  categoria: string;
  estado: OportunidadEstado;
  observacion: string;
  creadoEn: string;
  creadoPor: string;
  modificadoEn?: string;
  modificadoPor?: string;
  motivoCierre?: string;
  comentarioCierre?: string;
  perdidaInfo?: OportunidadPerdida;
  leccionesAprendidas?: string[];
  garantia?: string;
  plazo?: string;
  carpetaServidor?: string;
  tdr?: OportunidadArchivo;
  formaPago?: OportunidadPayment;
  destinoEntrega?: string;
  wherexId?: string;
  wherexUrl?: string;
  comentariosGenerales?: string;
  cotizacionId?: string;
  cotizacionNumero?: string;
  comentarios: OportunidadComentario[];
  archivos: OportunidadArchivo[];
  historial: OportunidadHistorial[];
  cotizaciones: CotizacionRelacionada[];
}

export type OportunidadFormData = {
  tipo: OportunidadTipo;
  empresa: string;
  requerimiento: string;
  vigencia: string;
  categoria: string;
  estado: OportunidadEstado;
  observacion: string;
  garantia: string;
  plazo: string;
  carpetaServidor: string;
  tdr?: OportunidadArchivo;
  formaPago: OportunidadPayment | "";
  destinoEntrega: string;
  wherexId: string;
  wherexUrl: string;
  comentariosGenerales: string;
  cotizacionId: string;
  cotizacionNumero: string;
};

export interface OportunidadFilters {
  tipo: "todos" | OportunidadTipo;
  empresa: string;
  ejecutivo: string;
  estado: "todos" | OportunidadEstado;
  categoria: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  requerimiento: string;
  search: string;
}

export type OportunidadSortKey =
  | "empresa"
  | "vigencia"
  | "estado"
  | "ejecutivo"
  | "creadoEn";

export type SortDirection = "asc" | "desc";
