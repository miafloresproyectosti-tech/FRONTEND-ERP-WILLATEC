import api from "./api";

export interface EmpresaConfiguracion {
  id?: number;
  nombre?: string | null;
  ruc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
}

export type EmpresaConfiguracionPayload = Omit<EmpresaConfiguracion, "id">;

export const getEmpresaConfiguracion = async (): Promise<EmpresaConfiguracion> => {
  const response = await api.get("/empresa-configuracion");
  return response.data;
};

export const updateEmpresaConfiguracion = async (
  payload: EmpresaConfiguracionPayload
): Promise<EmpresaConfiguracion> => {
  const response = await api.put("/empresa-configuracion", payload);
  return response.data.empresa;
};
