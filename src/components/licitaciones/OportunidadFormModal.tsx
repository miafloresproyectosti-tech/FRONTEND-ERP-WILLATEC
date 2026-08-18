import { useEffect, useState, type ReactNode } from "react";
import { Building2, Briefcase, Download, Eye, FileText, Globe2, Loader2, Save, Trash2, Upload, X, type LucideIcon } from "lucide-react";

import {
  CATEGORIAS_OPORTUNIDAD,
  FORMAS_PAGO,
  OPORTUNIDAD_TIPOS,
} from "../../constants/licitaciones";
import type {
  Oportunidad,
  OportunidadFormData,
  OportunidadTipo,
} from "../../types/licitaciones";
import { canPreviewFile, downloadFile, fileToOpportunityFile, toDatetimeLocalValue, addBusinessDays } from "../../utils/licitaciones";
import { validateOportunidad, type OportunidadValidationErrors } from "../../validators/licitaciones.validator";

interface Props {
  open: boolean;
  opportunity?: Oportunidad | null;
  userName: string;
  onClose: () => void;
  onSubmit: (data: OportunidadFormData) => void | Promise<void>;
}

const emptyForm = (): OportunidadFormData => ({
  tipo: "licitacion",
  empresa: "",
  requerimiento: "",
  vigencia: toDatetimeLocalValue(addBusinessDays(new Date(), 2)),
  categoria: "",
  estado: "sin_atender",
  observacion: "",
  garantia: "",
  plazo: "",
  carpetaServidor: "",
  formaPago: "",
  destinoEntrega: "",
  wherexId: "",
  wherexUrl: "",
  comentariosGenerales: "",
  cotizacionId: "",
  cotizacionNumero: "",
});

const tipoCardConfig: Record<OportunidadTipo, {
  icon: LucideIcon;
  accent: string;
  active: string;
  description: string;
}> = {
  licitacion: {
    icon: Building2,
    accent: "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900",
    active: "border-blue-500 bg-blue-50 text-blue-800 shadow-sm shadow-blue-100 dark:bg-blue-950/30 dark:text-blue-100 dark:shadow-none",
    description: "Proceso formal con TDR, garantia, plazo y carpeta.",
  },
  privado: {
    icon: Briefcase,
    accent: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900",
    active: "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm shadow-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-100 dark:shadow-none",
    description: "Solicitud directa de cliente con forma de pago y entrega.",
  },
  wherex: {
    icon: Globe2,
    accent: "bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:ring-orange-900",
    active: "border-orange-500 bg-orange-50 text-orange-800 shadow-sm shadow-orange-100 dark:bg-orange-950/30 dark:text-orange-100 dark:shadow-none",
    description: "Oportunidad del portal WHEREX con enlace e ID de proceso.",
  },
};

export function OportunidadFormModal({
  open,
  opportunity,
  userName,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<OportunidadFormData>(emptyForm());
  const [errors, setErrors] = useState<OportunidadValidationErrors>({});
  const [loadingFile, setLoadingFile] = useState(false);
  const [showTdrPreview, setShowTdrPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationSummary, setValidationSummary] = useState("");

  const title = opportunity ? "Editar oportunidad" : "Nueva oportunidad";

  useEffect(() => {
    if (!open) return;

    if (!opportunity) {
      setForm(emptyForm());
      setErrors({});
      setShowTdrPreview(false);
      setSubmitting(false);
      setValidationSummary("");
      return;
    }

    setForm({
      tipo: opportunity.tipo,
      empresa: opportunity.empresa,
      requerimiento: opportunity.requerimiento,
      vigencia: toDatetimeLocalValue(new Date(opportunity.vigencia)),
      categoria: opportunity.categoria,
      estado: opportunity.estado,
      observacion: opportunity.observacion || "",
      garantia: opportunity.garantia || "",
      plazo: opportunity.plazo || "",
      carpetaServidor: opportunity.carpetaServidor || "",
      tdr: opportunity.tdr,
      formaPago: opportunity.formaPago || "",
      destinoEntrega: opportunity.destinoEntrega || "",
      wherexId: opportunity.wherexId || "",
      wherexUrl: opportunity.wherexUrl || "",
      comentariosGenerales: opportunity.comentariosGenerales || "",
      cotizacionId: opportunity.cotizacionId || "",
      cotizacionNumero: opportunity.cotizacionNumero || "",
    });
    setErrors({});
    setShowTdrPreview(false);
    setSubmitting(false);
    setValidationSummary("");
  }, [open, opportunity]);

  const selectedTipo = form.tipo;
  const showMainAttachment = selectedTipo === "licitacion" || selectedTipo === "privado";
  const attachmentLabels = selectedTipo === "privado"
    ? {
        field: "Guia / solicitud del cliente",
        loaded: "Documento cargado. Puedes previsualizarlo, descargarlo o reemplazarlo.",
        upload: "Subir guia o documento",
      }
    : {
        field: "Archivo TDR",
        loaded: "Archivo cargado. Puedes previsualizarlo, descargarlo o reemplazarlo.",
        upload: "Subir archivo TDR",
      };

  const inputClass = (field?: keyof OportunidadFormData) =>
    `w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 dark:bg-slate-950 dark:text-white ${
      field && errors[field]
        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
        : "border-slate-300 focus:border-blue-500 focus:ring-blue-100 dark:border-slate-700"
    }`;

  const update = <K extends keyof OportunidadFormData>(
    key: K,
    value: OportunidadFormData[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleTipoChange = (tipo: OportunidadTipo) => {
    setForm((current) => ({
      ...current,
      tipo,
      vigencia:
        tipo === "privado" && !opportunity
          ? toDatetimeLocalValue(addBusinessDays(new Date(), 2))
          : current.vigencia,
    }));
  };

  const handleTdrChange = async (file?: File) => {
    if (submitting || !file) return;
    setLoadingFile(true);
    try {
      const parsed = await fileToOpportunityFile(file, userName);
      update("tdr", parsed);
    } finally {
      setLoadingFile(false);
    }
  };

  const submit = async () => {
    if (submitting) return;

    const normalized = {
      ...form,
    };
    const validation = validateOportunidad(normalized, {
      requireTdr: !opportunity,
    });
    setErrors(validation);
    const validationMessages = Object.values(validation).filter(Boolean);
    if (validationMessages.length > 0) {
      setValidationSummary(`Completa antes de guardar: ${validationMessages.join(", ")}.`);
      return;
    }

    setValidationSummary("");
    setSubmitting(true);
    try {
      await onSubmit(normalized);
    } finally {
      setSubmitting(false);
    }
  };

  const setVigenciaAt = (date: Date, hours: number, minutes = 0) => {
    date.setHours(hours, minutes, 0, 0);
    update("vigencia", toDatetimeLocalValue(date));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 px-5 py-4 text-white sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">Seguimiento comercial</p>
              <h2 className="mt-1 text-xl font-bold">{title}</h2>
              <p className="mt-1 text-sm text-blue-100">Registra la oportunidad y vincula su cotización desde un mismo flujo.</p>
            </div>
            <button
              type="button"
              onClick={submitting ? undefined : onClose}
              disabled={submitting}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(Object.keys(OPORTUNIDAD_TIPOS) as OportunidadTipo[]).map((tipo) => {
              const config = tipoCardConfig[tipo];
              const Icon = config.icon;
              const active = selectedTipo === tipo;

              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => handleTipoChange(tipo)}
                  disabled={submitting}
                  className={`min-h-[112px] rounded-2xl border p-4 text-left transition ${
                    active
                      ? config.active
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${config.accent}`}>
                      <Icon size={20} />
                    </span>
                    <span className="text-sm font-bold">{OPORTUNIDAD_TIPOS[tipo]}</span>
                  </span>
                  <span className="mt-3 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {config.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Field label="Entidad / Empresa" error={errors.empresa}>
              <input className={inputClass("empresa")} value={form.empresa} onChange={(event) => update("empresa", event.target.value)} />
            </Field>

            <Field label="Categoria" error={errors.categoria}>
              <select className={inputClass("categoria")} value={form.categoria} onChange={(event) => update("categoria", event.target.value)}>
                <option value="">Seleccionar</option>
                {CATEGORIAS_OPORTUNIDAD.map((categoria) => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </Field>

            <Field label="Fecha y hora de vigencia" error={errors.vigencia}>
              <div className="space-y-2">
                <input type="datetime-local" className={inputClass("vigencia")} value={form.vigencia} onChange={(event) => update("vigencia", event.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setVigenciaAt(new Date(), 17)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    Hoy 5:00 PM
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setVigenciaAt(tomorrow, 10);
                    }}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    Mañana 10:00 AM
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setVigenciaAt(addBusinessDays(new Date(), 2), 18)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    +2 días 6:00 PM
                  </button>
                </div>
              </div>
            </Field>

            <Field label="Requerimiento" error={errors.requerimiento} wide>
              <input className={inputClass("requerimiento")} value={form.requerimiento} onChange={(event) => update("requerimiento", event.target.value)} />
            </Field>

            {selectedTipo === "licitacion" && (
              <>
                <Field label="Garantia" error={errors.garantia}>
                  <input className={inputClass("garantia")} value={form.garantia} onChange={(event) => update("garantia", event.target.value)} />
                </Field>
                <Field label="Plazo" error={errors.plazo}>
                  <input className={inputClass("plazo")} value={form.plazo} onChange={(event) => update("plazo", event.target.value)} />
                </Field>
                <Field label="Numero de carpeta">
                  <input className={inputClass("carpetaServidor")} value={form.carpetaServidor} onChange={(event) => update("carpetaServidor", event.target.value)} />
                </Field>
              </>
            )}

            {showMainAttachment && (
                <Field label={attachmentLabels.field} error={errors.tdr} wide>
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                    {form.tdr ? (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
                              <FileText size={20} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{form.tdr.nombre}</p>
                              <p className="text-xs text-slate-500">{attachmentLabels.loaded}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {canPreviewFile(form.tdr) && form.tdr.dataUrl && (
                              <button
                                type="button"
                                onClick={() => setShowTdrPreview((current) => !current)}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Eye size={15} />
                                {showTdrPreview ? "Ocultar" : "Vista previa"}
                              </button>
                            )}
                            {form.tdr.dataUrl && (
                              <button
                                type="button"
                                onClick={() => downloadFile(form.tdr!)}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                              >
                                <Download size={15} />
                                Descargar
                              </button>
                            )}
                            <label className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 ${submitting ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                              {loadingFile ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                              Reemplazar
                              <input type="file" accept="image/*,application/pdf" className="hidden" disabled={submitting} onChange={(event) => void handleTdrChange(event.target.files?.[0])} />
                            </label>
                            <button
                              type="button"
                              onClick={() => { update("tdr", undefined); setShowTdrPreview(false); }}
                              disabled={submitting}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 size={15} />
                              Quitar
                            </button>
                          </div>
                        </div>
                        {showTdrPreview && form.tdr.dataUrl && (
                          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                            {form.tdr.tipo?.includes("image") ? (
                              <img src={form.tdr.dataUrl} alt={form.tdr.nombre} className="max-h-72 w-full object-contain" />
                            ) : form.tdr.tipo?.includes("pdf") ? (
                              <iframe title={form.tdr.nombre} src={form.tdr.dataUrl} className="h-72 w-full" />
                            ) : (
                              <div className="p-4 text-sm text-slate-500">Este archivo no se puede previsualizar directamente. Usa Descargar para verlo.</div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <label className={`flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 ${submitting ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                        <span className="truncate">{attachmentLabels.upload}</span>
                        <span className="inline-flex items-center gap-2 font-semibold text-blue-600">
                          {loadingFile ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                          Archivo
                        </span>
                        <input type="file" accept="image/*,application/pdf" className="hidden" disabled={submitting} onChange={(event) => void handleTdrChange(event.target.files?.[0])} />
                      </label>
                    )}
                  </div>
                </Field>
            )}

            {(selectedTipo === "privado" || selectedTipo === "wherex") && (
              <Field label="Forma de pago" error={errors.formaPago}>
                <select className={inputClass("formaPago")} value={form.formaPago} onChange={(event) => update("formaPago", event.target.value as OportunidadFormData["formaPago"])}>
                  <option value="">Seleccionar</option>
                  {Object.entries(FORMAS_PAGO).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
            )}

            {selectedTipo === "privado" && (
              <Field label="Destino de entrega">
                <input className={inputClass("destinoEntrega")} value={form.destinoEntrega} onChange={(event) => update("destinoEntrega", event.target.value)} />
              </Field>
            )}

            {selectedTipo === "wherex" && (
              <>
                <Field label="ID WHEREX">
                  <input className={inputClass("wherexId")} value={form.wherexId} onChange={(event) => update("wherexId", event.target.value)} />
                </Field>
                <Field label="Enlace oportunidad" error={errors.wherexUrl} wide>
                  <input className={inputClass("wherexUrl")} value={form.wherexUrl} onChange={(event) => update("wherexUrl", event.target.value)} placeholder="https://..." />
                </Field>
                <Field label="Comentarios generales" wide>
                  <textarea className={inputClass("comentariosGenerales")} rows={3} value={form.comentariosGenerales} onChange={(event) => update("comentariosGenerales", event.target.value)} />
                </Field>
              </>
            )}

            <Field label="Observación (opcional)" wide>
              <textarea className={inputClass("observacion")} rows={3} value={form.observacion} onChange={(event) => update("observacion", event.target.value)} />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70 sm:flex-row sm:justify-end sm:p-5">
          {validationSummary && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 sm:mr-auto dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {validationSummary}
            </div>
          )}
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
            Cancelar
          </button>
          <button type="button" onClick={() => void submit()} disabled={submitting || loadingFile} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 disabled:shadow-none">
            {submitting ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            {submitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  wide = false,
  children,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`block ${wide ? "lg:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}
