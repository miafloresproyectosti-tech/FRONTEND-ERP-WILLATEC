import type { UserRole } from "../types/roles";

export const rolePermissions: Record<UserRole, string[]> = {
  SUPERADMIN: [
    "*",
    "auditoria",
    "dashboard",
    "productos",
    "clientes",
    "cotizaciones",
    "usuarios",
    "configuracion",
    "mensajes",
    "ordenes_compra",
    "inventario"
  ],

  ADMIN: [
    "productos",
    "clientes",
    "cotizaciones",
    "usuarios",
    "auditoria",
    "mensajes",
    "ordenes_compra"
  ],

  VENTAS: [
    "clientes",
    "cotizaciones",
    "productos",
    "ordenes_compra"
  ],

  SOPORTE: [
    "productos",
    "mensajes"
  ],

  LOGISTICA: [
    "productos",
    "inventario"
  ],

  CONTABILIDAD: [
    "ordenes_compra"
  ]
};
