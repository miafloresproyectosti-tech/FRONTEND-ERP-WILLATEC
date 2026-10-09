import {
  Bell,
  Briefcase,
  ClipboardList,
  FileText,
  Package,
  Server,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

import type { DatabaseNotification } from "../services/notification.service";

export type NotificationSectionKey =
  | "cotizaciones"
  | "oportunidades"
  | "ordenes"
  | "inventario"
  | "servicios"
  | "usuarios"
  | "general";

export interface NotificationSection {
  key: NotificationSectionKey;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  items: DatabaseNotification[];
}

export function getNotificationSearchText(notification: DatabaseNotification) {
  return [
    notification.type,
    notification.data.title,
    notification.data.description,
    notification.data.message,
    notification.data.action_url,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getNotificationSectionKey(notification: DatabaseNotification): NotificationSectionKey {
  const text = getNotificationSearchText(notification);

  if (
    notification.data.cotizacion_id ||
    text.includes("/cotizaciones") ||
    text.includes("cotizacion") ||
    text.includes("cotización") ||
    text.includes("cotizaciÃ³n") ||
    text.includes("modificacion") ||
    text.includes("modificación") ||
    text.includes("modificaciÃ³n")
  ) {
    return "cotizaciones";
  }

  if (
    text.includes("oportunidad") ||
    text.includes("licitacion") ||
    text.includes("licitación") ||
    text.includes("licitaciÃ³n") ||
    text.includes("wherex") ||
    text.includes("/seguimiento-licitaciones")
  ) {
    return "oportunidades";
  }

  if (
    text.includes("orden") ||
    text.includes("oc ") ||
    text.includes("oc-") ||
    text.includes("/oc-recibidas") ||
    text.includes("/oc-emitidas") ||
    text.includes("/ordenes-compra") ||
    text.includes("woocommerce")
  ) {
    return "ordenes";
  }

  if (
    text.includes("inventario") ||
    text.includes("kardex") ||
    text.includes("stock") ||
    text.includes("producto")
  ) {
    return "inventario";
  }

  if (
    text.includes("licencia") ||
    text.includes("hosting") ||
    text.includes("/servicios")
  ) {
    return "servicios";
  }

  if (
    text.includes("usuario") ||
    text.includes("cliente") ||
    text.includes("auditoria") ||
    text.includes("auditoría") ||
    text.includes("auditorÃ­a")
  ) {
    return "usuarios";
  }

  return "general";
}

export const NOTIFICATION_SECTION_META: Record<NotificationSectionKey, Omit<NotificationSection, "items">> = {
  cotizaciones: {
    key: "cotizaciones",
    label: "Cotizaciones",
    description: "Aprobaciones, rechazos y modificaciones",
    icon: FileText,
    accent: "bg-blue-50 text-blue-700 border-blue-200",
  },
  oportunidades: {
    key: "oportunidades",
    label: "Oportunidades",
    description: "Licitaciones, privados y WHEREX",
    icon: Briefcase,
    accent: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  ordenes: {
    key: "ordenes",
    label: "Ordenes de compra",
    description: "OC recibidas, emitidas y documentos",
    icon: ShoppingCart,
    accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  inventario: {
    key: "inventario",
    label: "Inventario / Kardex",
    description: "Stock, productos y movimientos",
    icon: Package,
    accent: "bg-amber-50 text-amber-700 border-amber-200",
  },
  servicios: {
    key: "servicios",
    label: "Servicios",
    description: "Licencias, hosting y renovaciones",
    icon: Server,
    accent: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  usuarios: {
    key: "usuarios",
    label: "Administracion",
    description: "Usuarios, clientes y auditoria",
    icon: ClipboardList,
    accent: "bg-slate-50 text-slate-700 border-slate-200",
  },
  general: {
    key: "general",
    label: "General",
    description: "Otros avisos del sistema",
    icon: Bell,
    accent: "bg-orange-50 text-orange-700 border-orange-200",
  },
};

export const NOTIFICATION_SECTION_ORDER: NotificationSectionKey[] = [
  "cotizaciones",
  "oportunidades",
  "ordenes",
  "inventario",
  "servicios",
  "usuarios",
  "general",
];
