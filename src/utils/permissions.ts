import type { UserRole } from "../types/roles";

export const normalizeRole = (role?: string | null): UserRole => {
  const normalized = (role ?? "").trim().toUpperCase();

  switch (normalized) {
    case "SUPERADMIN":
    case "ADMIN":
    case "VENTAS":
    case "LICITACIONES":
    case "SOPORTE":
    case "LOGISTICA":
    case "CONTABILIDAD":
      return normalized as UserRole;
    case "ADMINISTRADOR":
      return "ADMIN";
    case "COMERCIAL":
    case "SALES":
      return "VENTAS";
    case "LICITACION":
      return "LICITACIONES";
    default:
      return "VENTAS";
  }
};

export const rolePermissions: Record<UserRole, string[]> = {
  SUPERADMIN: [
    "*",
    "auditoria",
    "dashboard",
    "productos",
    "clientes",
    "cotizaciones",
    "licitaciones",
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
    "licitaciones",
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
    "licitaciones",
    "productos",
    "ordenes_compra"
  ],

  LICITACIONES: [
    "licitaciones",
    "cotizaciones",
    "clientes",
    "productos"
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
