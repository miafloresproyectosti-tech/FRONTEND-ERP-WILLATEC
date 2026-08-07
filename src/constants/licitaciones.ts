import type {
  OportunidadEstado,
  OportunidadPayment,
  OportunidadTipo,
} from "../types/licitaciones";

export const OPORTUNIDAD_TIPOS: Record<OportunidadTipo, string> = {
  licitacion: "Licitacion",
  privado: "Privado",
  wherex: "WHEREX",
};

export const OPORTUNIDAD_ESTADOS: Record<OportunidadEstado, string> = {
  sin_atender: "Sin atender",
  en_atencion: "En atencion",
  atendido: "Atendido",
  cotizacion_generada: "Cotizacion generada",
  ganada: "Ganada",
  perdida: "Perdida",
  no_se_realizara: "No se realizara",
  vencida: "Vencida",
};

export const ESTADOS_CIERRE: OportunidadEstado[] = [
  "ganada",
  "perdida",
  "no_se_realizara",
  "vencida",
];

export const ESTADOS_BLOQUEADOS: OportunidadEstado[] = [
  "ganada",
  "perdida",
  "no_se_realizara",
  "vencida",
];

export const OPORTUNIDAD_ESTADO_BADGES: Record<OportunidadEstado, string> = {
  sin_atender: "bg-slate-100 text-slate-700 ring-slate-200",
  en_atencion: "bg-sky-100 text-sky-700 ring-sky-200",
  atendido: "bg-teal-100 text-teal-700 ring-teal-200",
  cotizacion_generada: "bg-indigo-100 text-indigo-700 ring-indigo-200",
  ganada: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  perdida: "bg-rose-100 text-rose-700 ring-rose-200",
  no_se_realizara: "bg-amber-100 text-amber-800 ring-amber-200",
  vencida: "bg-red-100 text-red-700 ring-red-200",
};

export const FORMAS_PAGO: Record<OportunidadPayment, string> = {
  credito_15: "Credito 15 dias",
  credito_30: "Credito 30 dias",
  al_contado: "Al contado",
};

export const CATEGORIAS_OPORTUNIDAD = [
  "Hardware",
  "Software",
  "Servicios TI",
  "Licencias",
  "Soporte",
  "Infraestructura",
  "Consultoria",
  "Otros",
];

export const MOTIVOS_VENCIMIENTO = [
  "Se vencio el plazo.",
  "No se presento la propuesta.",
  "Cliente cancelo.",
  "Publicacion tardia.",
  "Otro.",
];

export const MOTIVOS_NO_CONTINUAR = [
  "No cumple requisitos.",
  "No es rentable.",
  "Cliente cancelo.",
  "Falta de stock.",
  "Decision de Gerencia.",
  "Otro.",
];

export const MOTIVOS_PERDIDA = [
  "Precio no competitivo.",
  "No cumplió las especificaciones técnicas.",
  "Documentación incompleta.",
  "Plazo de entrega no aceptado.",
  "Se seleccionó otro proveedor.",
  "Otro.",
];

export const OPORTUNIDADES_STORAGE_KEY = "erp_seguimiento_licitaciones";
