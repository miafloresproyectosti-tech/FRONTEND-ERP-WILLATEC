import { OPORTUNIDAD_ESTADO_BADGES, OPORTUNIDAD_ESTADOS, OPORTUNIDAD_TIPOS } from "../../constants/licitaciones";
import type { Oportunidad, OportunidadEstado, OportunidadTipo } from "../../types/licitaciones";
import { getVigenciaAlert } from "../../utils/licitaciones";

export function getOportunidadEstadoLabel(opportunity: Pick<Oportunidad, "estado" | "cotizaciones">) {
  if (opportunity.estado !== "cotizacion_generada") {
    return OPORTUNIDAD_ESTADOS[opportunity.estado];
  }

  if (opportunity.cotizaciones.some((quote) => quote.tieneModificacionPendiente)) {
    return "Modificacion de cotizacion";
  }

  if (opportunity.cotizaciones.some((quote) =>
    String(quote.estado || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("aprob")
  )) {
    return "Por subir";
  }

  return "Cotizacion pendiente";
}

export function EstadoBadge({ estado, label }: { estado: OportunidadEstado; label?: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ${OPORTUNIDAD_ESTADO_BADGES[estado]}`}
    >
      {label ?? OPORTUNIDAD_ESTADOS[estado]}
    </span>
  );
}

export function TipoBadge({ tipo }: { tipo: OportunidadTipo }) {
  const className =
    tipo === "licitacion"
      ? "bg-violet-100 text-violet-700 ring-violet-200"
      : tipo === "privado"
      ? "bg-cyan-100 text-cyan-700 ring-cyan-200"
      : "bg-orange-100 text-orange-700 ring-orange-200";

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ${className}`}>
      {OPORTUNIDAD_TIPOS[tipo]}
    </span>
  );
}

export function VigenciaBadge({ vigencia, estado }: { vigencia: string; estado?: OportunidadEstado }) {
  const alert = getVigenciaAlert(vigencia, estado);

  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold ${alert.textClass}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${alert.dotClass}`} />
      {alert.label}
    </span>
  );
}
