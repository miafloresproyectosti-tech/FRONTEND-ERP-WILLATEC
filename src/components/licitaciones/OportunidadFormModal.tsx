import { useEffect, useState, type ReactNode } from "react";
import { Loader2, Save, Upload, X } from "lucide-react";

import {
  CATEGORIAS_OPORTUNIDAD,
  FORMAS_PAGO,
  OPORTUNIDAD_ESTADOS,
  OPORTUNIDAD_TIPOS,
} from "../../constants/licitaciones";
import type {
  Oportunidad,
  OportunidadFormData,
  OportunidadTipo,
} from "../../types/licitaciones";
import { fileToOpportunityFile, toDatetimeLocalValue, addBusinessDays } from "../../utils/licitaciones";
import { validateOportunidad, type OportunidadValidationErrors } from "../../validators/licitaciones.validator";

interface Props {
  open: boolean;
  opportunity?: Oportunidad | null;
  userName: string;
  onClose: () => void;
  onSubmit: (data: OportunidadFormData) => void;
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

  const title = opportunity ? "Editar oportunidad" : "Nueva oportunidad";

  useEffect(() => {
    if (!open) return;

    if (!opportunity) {
      setForm(emptyForm());
      setErrors({});
      return;
    }

    setForm({
      tipo: opportunity.tipo,
      empresa: opportunity.empresa,
      requerimiento: opportunity.requerimiento,
      vigencia: opportunity.vigencia.slice(0, 16),
      categoria: opportunity.categoria,
      estado: opportunity.estado,
      observacion: opportunity.observacion,
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
  }, [open, opportunity]);

  const selectedTipo = form.tipo;

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
    if (!file) return;
    setLoadingFile(true);
    try {
      const parsed = await fileToOpportunityFile(file, userName);
      update("tdr", parsed);
    } finally {
      setLoadingFile(false);
    }
  };

  const submit = () => {
    const normalized = {
      ...form,
    };
    const validation = validateOportunidad(normalized);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    onSubmit(normalized);
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
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(Object.keys(OPORTUNIDAD_TIPOS) as OportunidadTipo[]).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => handleTipoChange(tipo)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  selectedTipo === tipo
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-950/40 dark:text-blue-200"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                }`}
              >
                {OPORTUNIDAD_TIPOS[tipo]}
              </button>
            ))}
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

            <Field label="Vigencia" error={errors.vigencia}>
              <input type="datetime-local" className={inputClass("vigencia")} value={form.vigencia} onChange={(event) => update("vigencia", event.target.value)} />
            </Field>

            {opportunity && (
              <Field label="Estado" error={errors.estado}>
                <select className={inputClass("estado")} value={form.estado} onChange={(event) => update("estado", event.target.value as OportunidadFormData["estado"])}>
                  {Object.entries(OPORTUNIDAD_ESTADOS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Requerimiento" error={errors.requerimiento} wide>
              <input className={inputClass("requerimiento")} value={form.requerimiento} onChange={(event) => update("requerimiento", event.target.value)} />
            </Field>

            <Field label="ID de cotización asociada">
              <input className={inputClass()} value={form.cotizacionId} onChange={(event) => update("cotizacionId", event.target.value)} placeholder="Ej. COT-001" />
            </Field>

            <Field label="N° de cotización">
              <input className={inputClass()} value={form.cotizacionNumero} onChange={(event) => update("cotizacionNumero", event.target.value)} placeholder="Ej. 2026-0001" />
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
                <Field label="Archivo TDR" error={errors.tdr} wide>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">
                    <span className="truncate">{form.tdr?.nombre || "Subir, reemplazar o actualizar TDR"}</span>
                    <span className="inline-flex items-center gap-2 font-semibold text-blue-600">
                      {loadingFile ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      Archivo
                    </span>
                    <input type="file" className="hidden" onChange={(event) => void handleTdrChange(event.target.files?.[0])} />
                  </label>
                </Field>
              </>
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

            <Field label="Observacion" wide>
              <textarea className={inputClass("observacion")} rows={3} value={form.observacion} onChange={(event) => update("observacion", event.target.value)} />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70 sm:flex-row sm:justify-end sm:p-5">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
            Cancelar
          </button>
          <button type="button" onClick={submit} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
            <Save size={17} />
            Guardar
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
