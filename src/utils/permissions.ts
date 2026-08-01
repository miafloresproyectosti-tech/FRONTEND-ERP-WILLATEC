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
    "inventario",
    "servicios",
    "soporte_ti",
    "control_pagos"
  ],

  ADMIN: [
    "productos",
    "clientes",
    "cotizaciones",
    "usuarios",
    "auditoria",
    "mensajes",
    "ordenes_compra",
    "servicios",
    "control_pagos"
  ],

  VENTAS: [
    "clientes",
    "cotizaciones",
    "productos",
    "ordenes_compra"
  ],

  SOPORTE: [
    "productos",
    "mensajes",
    "soporte_ti"
  ],

  LOGISTICA: [
    "productos",
    "inventario"
  ],

  CONTABILIDAD: [
    "ordenes_compra"
  ]
};
