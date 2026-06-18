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
    "ordenes_compra"
  ],

  ADMIN: [
    "productos",
    "clientes",
    "cotizaciones",
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
  ]
};
