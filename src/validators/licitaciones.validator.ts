import type { OportunidadFormData } from "../types/licitaciones";

export type OportunidadValidationErrors = Partial<Record<keyof OportunidadFormData, string>>;

export const validateOportunidad = (
  data: OportunidadFormData,
  options: { requireTdr?: boolean; requireFutureVigencia?: boolean } = {}
) => {
  const errors: OportunidadValidationErrors = {};
  const text = (value: unknown) => String(value ?? "").trim();

  if (!text(data.empresa)) errors.empresa = "Empresa obligatoria";
  if (!text(data.requerimiento)) errors.requerimiento = "Requerimiento obligatorio";
  if (!text(data.categoria)) errors.categoria = "Categoria obligatoria";
  if (!data.estado) errors.estado = "Estado obligatorio";
  if (!text(data.vigencia)) errors.vigencia = "Vigencia obligatoria";
  else if (
    options.requireFutureVigencia &&
    (!Number.isFinite(new Date(text(data.vigencia)).getTime()) ||
      new Date(text(data.vigencia)).getTime() <= Date.now())
  ) {
    errors.vigencia = "La vigencia debe ser posterior a la fecha y hora actual";
  }

  if (data.tipo === "licitacion") {
    if (!text(data.garantia)) errors.garantia = "Garantia obligatoria";
    if (!text(data.plazo)) errors.plazo = "Plazo obligatorio";
    if (options.requireTdr !== false && !data.tdr) errors.tdr = "TDR obligatorio";
  }

  if (data.tipo === "privado" && !data.formaPago) {
    errors.formaPago = "Forma de pago obligatoria";
  }

  if (data.tipo === "wherex") {
    if (!data.formaPago) errors.formaPago = "Forma de pago obligatoria";
    if (!text(data.wherexUrl)) errors.wherexUrl = "Enlace obligatorio";
  }

  return errors;
};
