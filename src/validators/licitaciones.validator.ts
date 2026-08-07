import type { OportunidadFormData } from "../types/licitaciones";

export type OportunidadValidationErrors = Partial<Record<keyof OportunidadFormData, string>>;

export const validateOportunidad = (
  data: OportunidadFormData,
  options: { requireTdr?: boolean } = {}
) => {
  const errors: OportunidadValidationErrors = {};

  if (!data.empresa.trim()) errors.empresa = "Empresa obligatoria";
  if (!data.requerimiento.trim()) errors.requerimiento = "Requerimiento obligatorio";
  if (!data.categoria.trim()) errors.categoria = "Categoria obligatoria";
  if (!data.estado) errors.estado = "Estado obligatorio";
  if (!data.vigencia) errors.vigencia = "Vigencia obligatoria";

  if (data.tipo === "licitacion") {
    if (!data.garantia.trim()) errors.garantia = "Garantia obligatoria";
    if (!data.plazo.trim()) errors.plazo = "Plazo obligatorio";
    if (options.requireTdr !== false && !data.tdr) errors.tdr = "TDR obligatorio";
  }

  if (data.tipo === "privado" && !data.formaPago) {
    errors.formaPago = "Forma de pago obligatoria";
  }

  if (data.tipo === "wherex") {
    if (!data.formaPago) errors.formaPago = "Forma de pago obligatoria";
    if (!data.wherexUrl.trim()) errors.wherexUrl = "Enlace obligatorio";
  }

  return errors;
};
