import type { UserRole } from "../types/roles";
import { normalizeRole } from "./permissions";

export const defaultRouteByRole: Record<UserRole, string> = {
  SUPERADMIN: "/",
  ADMIN: "/clientes",
  VENTAS: "/seguimiento-licitaciones",
  LICITACION: "/seguimiento-licitaciones",
  LICITACIONES: "/seguimiento-licitaciones",
  SOPORTE: "/productos",
  LOGISTICA: "/productos",
  CONTABILIDAD: "/ordenes-compra",
};

export const getDefaultRouteByRole = (role?: string | null): string =>
  defaultRouteByRole[normalizeRole(role)] || "/not-authorized";
