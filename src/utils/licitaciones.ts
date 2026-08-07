import { ESTADOS_BLOQUEADOS } from "../constants/licitaciones";
import type {
  Oportunidad,
  OportunidadArchivo,
  OportunidadEstado,
  OportunidadPayment,
} from "../types/licitaciones";

export const createId = (prefix = "op") =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const isClosedOpportunity = (estado: OportunidadEstado) =>
  ESTADOS_BLOQUEADOS.includes(estado);

export const isExpired = (vigencia: string) => {
  const date = new Date(vigencia);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
};

export const addBusinessDays = (baseDate: Date, days: number) => {
  const result = new Date(baseDate);
  let addedDays = 0;

  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) addedDays += 1;
  }

  return result;
};

export const toDatetimeLocalValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export const formatDateTime = (value?: string) => {
  if (!value) return "No definido";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No definido";

  return date.toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Lima",
  });
};

export const getRemainingMs = (vigencia: string) => {
  const date = new Date(vigencia);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getTime() - Date.now();
};

export const formatRemainingTime = (vigencia: string) => {
  const remainingMs = getRemainingMs(vigencia);
  if (remainingMs <= 0) return "Vencida";

  const totalMinutes = Math.floor(remainingMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const getVigenciaAlert = (vigencia: string) => {
  const remainingMs = getRemainingMs(vigencia);
  const dayMs = 24 * 60 * 60 * 1000;

  if (remainingMs <= 0) {
    return {
      label: "Vencida",
      dotClass: "bg-neutral-900",
      textClass: "text-neutral-800",
      rowClass: "border-l-neutral-900",
    };
  }

  if (remainingMs < dayMs) {
    return {
      label: "Menos de 24 horas",
      dotClass: "bg-red-500",
      textClass: "text-red-700",
      rowClass: "border-l-red-500",
    };
  }

  if (remainingMs <= dayMs * 3) {
    return {
      label: "Entre 1 y 3 dias",
      dotClass: "bg-amber-400",
      textClass: "text-amber-700",
      rowClass: "border-l-amber-400",
    };
  }

  return {
    label: "Mas de 3 dias",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700",
    rowClass: "border-l-emerald-500",
  };
};

export const paymentLabel = (
  formaPago: OportunidadPayment | undefined,
  labels: Record<OportunidadPayment, string>
) => (formaPago ? labels[formaPago] : "No definido");

export const fileToOpportunityFile = (file: File, userName: string) =>
  new Promise<OportunidadArchivo>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        id: createId("file"),
        nombre: file.name,
        tipo: file.type || "application/octet-stream",
        tamanio: file.size,
        dataUrl: String(reader.result || ""),
        creadoEn: new Date().toISOString(),
        creadoPor: userName,
      });
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const canPreviewFile = (file?: OportunidadArchivo) => {
  if (!file) return false;
  return (
    file.tipo.includes("pdf") ||
    file.tipo.includes("image") ||
    file.tipo.includes("text") ||
    file.tipo.includes("word") ||
    file.tipo.includes("spreadsheet") ||
    file.nombre.endsWith(".docx") ||
    file.nombre.endsWith(".xlsx")
  );
};

export const downloadFile = (file: OportunidadArchivo) => {
  const link = document.createElement("a");
  link.href = file.dataUrl;
  link.download = file.nombre;
  link.click();
};

export const applyExpiredState = (opportunity: Oportunidad): Oportunidad => {
  if (opportunity.estado === "vencida" || isClosedOpportunity(opportunity.estado)) {
    return opportunity;
  }

  if (!isExpired(opportunity.vigencia)) return opportunity;

  const fecha = new Date().toISOString();

  return {
    ...opportunity,
    estado: "vencida",
    motivoCierre: opportunity.motivoCierre || "Se vencio el plazo.",
    modificadoEn: fecha,
    modificadoPor: "Sistema",
    historial: [
      {
        id: createId("hist"),
        fecha,
        usuario: "Sistema",
        tipo: "cierre",
        descripcion: "La oportunidad paso a Vencida automaticamente por fin de vigencia.",
      },
      ...opportunity.historial,
    ],
  };
};

export const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
