import api from "./api";
import { cachedRequest, clearCache } from "../utils/cache";

const asArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") return Object.values(value) as T[];
  return [];
};

// Interfaces
export interface User {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  activo: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    id: number;
    user_id: number;
    telefono: string;
    dni: string;
    cargo: string;
    created_at: string;
    updated_at: string;
  };
  roles: Array<{
    id: number;
    name: string;
    guard_name: string;
    created_at: string;
    updated_at: string;
    pivot: {
      model_type: string;
      model_id: number;
      role_id: number;
    };
  }>;
}

export interface CreateUserData {
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: number; // Cambiado de role_id a role
  telefono?: string;
  dni?: string;
  cargo?: string;
}

export interface UpdateUserData {
  nombres?: string;
  apellidos?: string;
  email?: string;
  telefono?: string;
  dni?: string;
  cargo?: string;
  role?: string; // Nombre del rol en minúsculas para actualizar
  activo?: boolean;
}

export interface PermissionCatalogItem {
  key: string;
  label: string;
  description: string;
  module?: string;
  parent?: string;
}

export interface RoleWithPermissions {
  id: number;
  name: string;
  permissions: string[];
}

export interface RoleCatalogItem {
  id: number;
  name: string;
}

export interface RolePayload {
  name: string;
}

// Funciones del servicio
export const getUsers = async (): Promise<User[]> => {
  const response = await api.get("/users");
  const payload = response.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.users)) return payload.users;

  return [];
};

export const getUser = async (id: number): Promise<User> => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (userData: CreateUserData): Promise<User> => {
  const response = await api.post("/users", userData);
  return response.data;
};

export const updateUser = async (id: number, userData: UpdateUserData): Promise<User> => {
  const response = await api.put(`/users/${id}`, userData);
  return response.data;
};

export const deleteUser = async (id: number): Promise<void> => {
  await api.delete(`/users/${id}`);
};

export const toggleUserStatus = async (id: number): Promise<User> => {
  const response = await api.patch(`/users/${id}/toggle-status`);
  return response.data;
};

export const getRoles = async (): Promise<RoleCatalogItem[]> => {
  return cachedRequest(
    "catalog:roles",
    async () => {
      const response = await api.get("/roles");
      return asArray(response.data?.roles ?? response.data);
    },
    { ttlMs: 12 * 60 * 60 * 1000 }
  );
};

export const getRolesPermissionsConfig = async (): Promise<{
  roles: RoleWithPermissions[];
  permissions: PermissionCatalogItem[];
}> => {
  const response = await api.get("/roles");
  const payload = response.data;

  return {
    roles: asArray(payload?.roles ?? payload),
    permissions: asArray(payload?.permissions),
  };
};

export const updateRolePermissions = async (
  roleId: number,
  permissions: string[],
): Promise<RoleWithPermissions> => {
  const response = await api.put(`/roles/${roleId}/permissions`, {
    permissions,
  });

  clearCache("catalog:roles");
  return response.data?.role ?? response.data;
};

export const createRole = async (payload: RolePayload): Promise<RoleWithPermissions> => {
  const response = await api.post("/roles", payload);
  clearCache("catalog:roles");
  return response.data?.role ?? response.data;
};

export const updateRole = async (
  roleId: number,
  payload: RolePayload,
): Promise<RoleWithPermissions> => {
  const response = await api.patch(`/roles/${roleId}`, payload);
  clearCache("catalog:roles");
  return response.data?.role ?? response.data;
};

export const deleteRole = async (roleId: number): Promise<void> => {
  await api.delete(`/roles/${roleId}`);
  clearCache("catalog:roles");
};

export const resetPassword = async (id: number) => {
  const response = await api.patch(`/users/${id}/reset-password`);
  return response.data; // espera { tempPassword: string } o { message }
};
