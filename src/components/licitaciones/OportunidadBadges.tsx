import { OPORTUNIDAD_ESTADO_BADGES, OPORTUNIDAD_ESTADOS, OPORTUNIDAD_TIPOS } from "../../constants/licitaciones";
import type { OportunidadEstado, OportunidadTipo } from "../../types/licitaciones";
import { getVigenciaAlert } from "../../utils/licitaciones";

export function EstadoBadge({ estado }: { estado: OportunidadEstado }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ${OPORTUNIDAD_ESTADO_BADGES[estado]}`}
    >
      {OPORTUNIDAD_ESTADOS[estado]}
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

export function VigenciaBadge({ vigencia }: { vigencia: string }) {
  const alert = getVigenciaAlert(vigencia);

  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold ${alert.textClass}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${alert.dotClass}`} />
      {alert.label}
    </span>
  );
}
