import api from "./api";
import type { CompraPayload } from "./compra.service";

export interface SolicitudSobrecompra {
  id: number;
  numero: string;
  estado: "pendiente" | "aprobada" | "rechazada";
  justificacion: string;
  comentario_resolucion?: string | null;
  payload_compra: CompraPayload;
  solicitante?: { nombres?: string; apellidos?: string; email?: string };
  resolvedor?: { nombres?: string; apellidos?: string; email?: string };
  compra?: { id: number; numero: string } | null;
  utilizado_en?: string | null;
  created_at?: string;
}

export async function getSolicitudesSobrecompra(estado = "todos") {
  const response = await api.get("/solicitudes-sobrecompra", { params: { estado, per_page: 100 } });
  return (response.data?.data || []) as SolicitudSobrecompra[];
}

export async function createSolicitudSobrecompra(justificacion: string, payload_compra: CompraPayload) {
  const response = await api.post("/solicitudes-sobrecompra", { justificacion, payload_compra });
  return response.data as SolicitudSobrecompra;
}

export async function resolveSolicitudSobrecompra(id: number, estado: "aprobada" | "rechazada", comentario_resolucion: string) {
  const response = await api.patch(`/solicitudes-sobrecompra/${id}/resolver`, { estado, comentario_resolucion });
  return response.data as SolicitudSobrecompra;
}
