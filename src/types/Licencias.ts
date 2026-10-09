// src/types/licencias.ts
export interface Licencia {
  id: number;
  empresa: string;
  producto: string;
  cantidad: number;
  suscripcion: "ANUAL";
  fechaCompra: string;
  fechaRenovacion: string;
  renovacionProgramada?: boolean;
  estado: "VIGENTE" | "POR VENCER" | "VENCIDO";
}

export interface Hosting {
  id: number;
  empresa: string;
  ruc: string;
  dominio: string;
  plan: string;
  suscripcion: "ANUAL" | "MENSUAL";
  fechaInicio: string;
  fechaRenovacion: string;
  renovacionProgramada?: boolean;
  contacto: string;
  cliente: string;
  estado: "VIGENTE" | "POR VENCER" | "VENCIDO";
}
