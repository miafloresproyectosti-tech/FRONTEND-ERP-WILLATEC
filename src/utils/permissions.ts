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
    "dashboard",
    "productos",
    "clientes",
    "cotizaciones",
    "mensajes",
    "ordenes_compra"
  ],

  VENTAS: [
    "dashboard",
    "clientes",
    "cotizaciones",
    "productos",
    "ordenes_compra"
  ],

  SOPORTE: [
    "dashboard",
    "productos",
    "mensajes"
  ]
};