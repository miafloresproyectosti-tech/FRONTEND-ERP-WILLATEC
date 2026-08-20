import { CheckCircle2, ExternalLink, FileDown, FileText, LockOpen, MessageSquare, Paperclip, Plus, Trash2, Unlink, Upload, X } from "lucide-react";
import { useState, type ClipboardEvent } from "react";

import { FORMAS_PAGO, OPORTUNIDAD_ESTADOS, OPORTUNIDAD_TIPOS } from "../../constants/licitaciones";
import type { Oportunidad, OportunidadArchivo, OportunidadEstado } from "../../types/licitaciones";
import {
  canPreviewFile,
  downloadFile,
  formatDateTime,
  formatRemainingTime,
  getVigenciaAlert,
  isClosedOpportunity,
} from "../../utils/licitaciones";
import { EstadoBadge, TipoBadge, VigenciaBadge } from "./OportunidadBadges";

interface Props {
  opportunity: Oportunidad | null;
  onClose: () => void;
  onAddComment: (comment: string) => void;
  onGenerateQuote: () => void;
  canManageOpportunity?: boolean;
  onMarkQuoteDone?: () => void;
  onReleaseOpportunity?: () => void;
  onFinalizeOpportunity?: (estado: OportunidadEstado) => void;
  canDownloadQuotePdf?: boolean;
  downloadingQuoteId?: string | number | null;
  onDownloadQuotePdf?: (cotizacionId: string | number) => void;
  canMarkProposalPresented?: boolean;
  presentingProposal?: boolean;
  onMarkProposalPresented?: (file: File) => void;
  loadingDetails?: boolean;
  canUploadFile?: boolean;
  uploadingFile?: boolean;
  onUploadFile?: (file: File) => void;
  deletingFileId?: string | null;
  canDeleteFile?: (file: OportunidadArchivo) => boolean;
  onDeleteFile?: (file: OportunidadArchivo) => void;
  unlinkingQuoteId?: string | null;
  canUnlinkQuote?: (cotizacionId: string) => boolean;
  onUnlinkQuote?: (cotizacionId: string) => void;
}

export function OportunidadDetailDrawer({
  opportunity,
  onClose,
  onAddComment,
  onGenerateQuote,
  canManageOpportunity = false,
  onMarkQuoteDone,
  onReleaseOpportunity,
  onFinalizeOpportunity,
  canDownloadQuotePdf = false,
  downloadingQuoteId = null,
  onDownloadQuotePdf,
  canMarkProposalPresented = false,
  presentingProposal = false,
  onMarkProposalPresented,
  loadingDetails = false,
  canUploadFile = false,
  uploadingFile = false,
  onUploadFile,
  deletingFileId = null,
  canDeleteFile,
  onDeleteFile,
  unlinkingQuoteId = null,
  canUnlinkQuote,
  onUnlinkQuote,
}: Props) {
  const [comment, setComment] = useState("");
  const [previewFile, setPreviewFile] = useState<OportunidadArchivo | null>(null);
  const [presentationModalOpen, setPresentationModalOpen] = useState(false);
  const [presentationFile, setPresentationFile] = useState<File | null>(null);
  const [presentationError, setPresentationError] = useState("");

  if (!opportunity) return null;

  const locked = isClosedOpportunity(opportunity.estado);
  const alert = getVigenciaAlert(opportunity.vigencia, opportunity.estado);
  const visiblePreview = previewFile || opportunity.tdr || null;
  const hasLinkedQuote = Boolean(
    opportunity.cotizacionId ||
    opportunity.cotizacionNumero ||
    opportunity.cotizaciones.length > 0 ||
    opportunity.estado === "cotizacion_generada"
  );
  const canShowQuoteDecision = canManageOpportunity && !locked && !hasLinkedQuote;
  const presentationLabel =
    opportunity.tipo === "licitacion"
      ? "Marcar como subido"
      : opportunity.tipo === "privado"
        ? "Marcar como enviado por correo"
        : "Marcar como subido a WHEREX";
  const presentationHelp =
    opportunity.tipo === "licitacion"
      ? "Adjunta una captura o PDF que evidencie que la propuesta fue subida."
      : opportunity.tipo === "privado"
        ? "Adjunta una captura o PDF del correo enviado al cliente."
        : "Adjunta una captura o PDF de la propuesta subida en WHEREX.";
  const mainAttachmentLabel = opportunity.tipo === "privado"
    ? "Guia / documento de solicitud"
    : "Vista previa del TDR";
  const emptyMainAttachmentLabel = opportunity.tipo === "privado"
    ? "No hay guia o documento adjunto."
    : "No hay TDR adjunto.";

  const submitComment = () => {
    const trimmed = comment.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setComment("");
  };

  const handlePresentationPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const pastedImage = Array.from(event.clipboardData.items)
      .find((item) => item.type.startsWith("image/"));

    if (!pastedImage) return;

    const file = pastedImage.getAsFile();
    if (!file) return;

    const extension = file.type.split("/")[1] || "png";
    const namedFile = new File(
      [file],
      `evidencia-presentacion-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`,
      { type: file.type }
    );

    setPresentationFile(namedFile);
    setPresentationError("");
    event.preventDefault();
  };

  const handleFilePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (!canUploadFile || !onUploadFile || uploadingFile) return;

    const pastedImage = Array.from(event.clipboardData.items)
      .find((item) => item.type.startsWith("image/"));

    if (!pastedImage) return;

    const file = pastedImage.getAsFile();
    if (!file) return;

    const extension = file.type.split("/")[1] || "png";
    const namedFile = new File(
      [file],
      `archivo-oportunidad-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`,
      { type: file.type }
    );

    onUploadFile(namedFile);
    event.preventDefault();
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm">
      <aside className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl dark:bg-slate-950">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <TipoBadge tipo={opportunity.tipo} />
                <EstadoBadge estado={opportunity.estado} />
                <VigenciaBadge vigencia={opportunity.vigencia} estado={opportunity.estado} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{opportunity.empresa}</h2>
              <p className="mt-1 text-sm text-slate-500">{opportunity.requerimiento}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-5">
          {loadingDetails && (
            <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
              <FileText className="h-4 w-4 animate-pulse" />
              Cargando archivos, historial y comentarios...
            </div>
          )}

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Info label="Vigencia" value={formatDateTime(opportunity.vigencia)} />
            <Info label="Tiempo restante" value={formatRemainingTime(opportunity.vigencia, opportunity.estado)} className={alert.textClass} />
            <Info label="Ejecutivo" value={opportunity.ejecutivo.nombre} />
            <Info label="Categoria" value={opportunity.categoria} />
            <Info label="Creado por" value={`${opportunity.creadoPor} - ${formatDateTime(opportunity.creadoEn)}`} />
            <Info label="Estado" value={OPORTUNIDAD_ESTADOS[opportunity.estado]} />
          </section>

          {locked && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Registro bloqueado. Solo puede visualizarse por estar cerrado o vencido.
            </div>
          )}

          {(opportunity.cotizacionId || opportunity.cotizacionNumero) && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <h3 className="mb-3 font-bold text-emerald-800 dark:text-emerald-200">Vinculación con cotización</h3>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Info label="ID de cotización" value={opportunity.cotizacionId || "Sin ID"} />
                <Info label="Número de cotización" value={opportunity.cotizacionNumero || "Sin número"} />
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="mb-3 font-bold text-slate-900 dark:text-white">Detalle</h3>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Info label="Tipo" value={OPORTUNIDAD_TIPOS[opportunity.tipo]} />
              <Info label="Observacion" value={opportunity.observacion || "Sin observacion"} />
              {opportunity.tipo === "licitacion" && (
                <>
                  <Info label="Garantia" value={opportunity.garantia || "No definido"} />
                  <Info label="Plazo" value={opportunity.plazo || "No definido"} />
                  <Info label="Carpeta servidor" value={opportunity.carpetaServidor || "No definido"} />
                </>
              )}
              {(opportunity.tipo === "privado" || opportunity.tipo === "wherex") && (
                <Info label="Forma de pago" value={opportunity.formaPago ? FORMAS_PAGO[opportunity.formaPago] : "No definido"} />
              )}
              {opportunity.tipo === "privado" && (
                <Info label="Destino de entrega" value={opportunity.destinoEntrega || "No definido"} />
              )}
              {opportunity.tipo === "wherex" && (
                <>
                  <Info label="ID WHEREX" value={opportunity.wherexId || "No definido"} />
                  <Info label="Comentarios WHEREX" value={opportunity.comentariosGenerales || "Sin comentarios"} />
                  {opportunity.wherexUrl && (
                    <a
                      href={opportunity.wherexUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
                    >
                      <ExternalLink size={16} />
                      Abrir WHEREX
                    </a>
                  )}
                </>
              )}
            </div>
          </section>

          {canShowQuoteDecision && (
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Decisión de cotización</h3>
                <p className="mt-1 text-sm text-slate-500">Puedes generar la cotización o liberar el proceso si ya no se desea continuar.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {opportunity.estado === "en_atencion" && onMarkQuoteDone && (
                  <button
                    type="button"
                    onClick={onMarkQuoteDone}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <CheckCircle2 size={18} />
                    Vincular Cotizacion
                  </button>
                )}
                <button
                  type="button"
                  onClick={onGenerateQuote}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <FileText size={18} />
                  Generar Cotizacion
                </button>
                {onReleaseOpportunity && (
                  <button
                    type="button"
                    onClick={onReleaseOpportunity}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                  >
                    <LockOpen size={18} />
                    Liberar
                  </button>
                )}
                {onFinalizeOpportunity && (
                  <select
                    value=""
                    onChange={(event) => {
                      const value = event.target.value as OportunidadEstado;
                      if (value) onFinalizeOpportunity(value);
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <option value="">Finalizar</option>
                    <option value="ganada">Ganada</option>
                    <option value="perdida">Perdida</option>
                    <option value="no_se_realizara">No se realizara</option>
                  </select>
                )}
              </div>
            </div>
          )}

          {canMarkProposalPresented && ["cotizacion_generada", "vencida"].includes(opportunity.estado) && onMarkProposalPresented && (
            <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900/50 dark:bg-teal-950/20 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-teal-900 dark:text-teal-100">Propuesta lista para presentar</h3>
                <p className="mt-1 text-sm text-teal-700 dark:text-teal-200">
                  {presentationHelp}
                  {opportunity.estado === "vencida" ? " Se registrara como atencion posterior al vencimiento." : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPresentationFile(null);
                  setPresentationError("");
                  setPresentationModalOpen(true);
                }}
                disabled={presentingProposal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-400"
              >
                <CheckCircle2 size={18} />
                {presentingProposal ? "Registrando..." : presentationLabel}
              </button>
            </div>
          )}

          {opportunity.estado === "perdida" && opportunity.perdidaInfo && (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
              <h3 className="mb-3 font-bold text-rose-800 dark:text-rose-200">Resultado: Perdida</h3>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Info label="Motivo" value={opportunity.perdidaInfo.motivo} />
                <Info label="Registrado por" value={opportunity.perdidaInfo.usuario || "Sin información"} />
                <Info label="Observaciones" value={opportunity.perdidaInfo.observacionesCliente || "Sin observaciones"} />
                <Info label="Fecha" value={formatDateTime(opportunity.perdidaInfo.fecha)} />
              </div>
              {opportunity.perdidaInfo.documento && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-white p-3 dark:border-rose-900/50 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Documento adjunto</span>
                    <button type="button" onClick={() => downloadFile(opportunity.perdidaInfo!.documento!)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                      Descargar
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{opportunity.perdidaInfo.documento.nombre}</p>
                  {canPreviewFile(opportunity.perdidaInfo.documento) ? (
                    <div className="mt-3">
                      <FilePreview file={opportunity.perdidaInfo.documento} />
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No es posible previsualizar este tipo de archivo en el navegador.</p>
                  )}
                </div>
              )}
            </section>
          )}

          {opportunity.estado === "no_se_realizara" && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
              <h3 className="mb-3 font-bold text-amber-800 dark:text-amber-200">Resultado: No se realizará</h3>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Info label="Motivo" value={opportunity.motivoCierre || "Sin motivo registrado"} />
                <Info label="Detalle" value={opportunity.comentarioCierre || opportunity.motivoCierre || "Sin detalle registrado"} />
              </div>
            </section>
          )}

          {opportunity.estado === "perdida" && opportunity.leccionesAprendidas && opportunity.leccionesAprendidas.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
              <h3 className="mb-3 font-bold text-amber-800 dark:text-amber-200">Lecciones aprendidas</h3>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {opportunity.leccionesAprendidas.map((item) => (
                  <li key={item} className="rounded-xl border border-amber-200 bg-white px-3 py-2 dark:border-amber-900/50 dark:bg-slate-950">{item}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-900 dark:text-white">{mainAttachmentLabel}</h3>
              {visiblePreview && !locked && (
                <button
                  type="button"
                  onClick={() => downloadFile(visiblePreview)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <FileDown size={16} />
                  Descargar
                </button>
              )}
            </div>

            {visiblePreview ? (
              <FilePreview file={visiblePreview} />
            ) : (
              <p className="text-sm text-slate-500">{emptyMainAttachmentLabel}</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800" onPaste={handleFilePaste}>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Paperclip size={18} />
                Archivos
              </h3>
              {canUploadFile && onUploadFile && (
                <label className={`inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 ${uploadingFile ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                  <Upload size={15} />
                  {uploadingFile ? "Subiendo..." : "Subir archivo"}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={uploadingFile}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onUploadFile(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {canUploadFile && (
              <p className="mb-3 text-xs font-medium text-slate-500">
                Puedes subir un PDF/imagen o pegar una captura con Ctrl+V.
              </p>
            )}
            <div className="space-y-2">
              {[opportunity.tdr, ...opportunity.archivos].filter(Boolean).map((file) => (
                <div
                  key={file!.id}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewFile(file!)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate font-medium text-slate-700 dark:text-slate-200">{file!.nombre}</span>
                    <span className="text-xs text-slate-500">Vista previa</span>
                  </button>
                  {file && canDeleteFile?.(file) && onDeleteFile && (
                    <button
                      type="button"
                      onClick={() => onDeleteFile(file)}
                      disabled={deletingFileId === file.id}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Eliminar archivo"
                    >
                      {deletingFileId === file.id ? <FileText size={15} className="animate-pulse" /> : <Trash2 size={15} />}
                    </button>
                  )}
                </div>
              ))}
              {!opportunity.tdr && opportunity.archivos.length === 0 && (
                <p className="text-sm text-slate-500">Sin archivos adjuntos.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <MessageSquare size={18} />
              Comentarios internos
            </h3>
            {!locked && (
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="Agregar comentario"
                />
                <button
                  type="button"
                  onClick={submitComment}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Agregar
                </button>
              </div>
            )}
            <div className="space-y-3">
              {opportunity.comentarios.map((item) => (
                <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{item.usuario}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(item.fecha)}</p>
                  <p className="mt-2 text-slate-600 dark:text-slate-300">{item.comentario}</p>
                </div>
              ))}
              {opportunity.comentarios.length === 0 && (
                <p className="text-sm text-slate-500">Sin comentarios internos.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white">Historial</h3>
            <div className="space-y-4">
              {opportunity.historial.map((item) => (
                <div key={item.id} className="relative border-l-2 border-blue-200 pl-4">
                  <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-blue-600" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.descripcion}</p>
                  <p className="text-xs text-slate-500">{item.usuario} - {formatDateTime(item.fecha)}</p>
                </div>
              ))}
            </div>
          </section>

          {opportunity.cotizaciones.length > 0 && (
            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="mb-3 font-bold text-slate-900 dark:text-white">Cotizaciones creadas</h3>
              <div className="space-y-2">
                {opportunity.cotizaciones.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <span className="block truncate font-semibold text-slate-800 dark:text-slate-100">{item.numero}</span>
                      <span className="text-slate-500">{formatDateTime(item.fecha)}</span>
                      {item.tieneModificacionPendiente && (
                        <span className="mt-1 block rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                          {item.pdfBloqueoMotivo || "Cotizacion con modificacion pendiente. El PDF se habilitara cuando sea aprobada nuevamente."}
                        </span>
                      )}
                      {!item.tieneModificacionPendiente && !item.puedeDescargarPdf && item.pdfBloqueoMotivo && (
                        <span className="mt-1 block rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                          {item.pdfBloqueoMotivo}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canDownloadQuotePdf && item.cotizacionId && onDownloadQuotePdf && (
                        <button
                          type="button"
                          onClick={() => onDownloadQuotePdf(item.cotizacionId!)}
                          disabled={item.tieneModificacionPendiente || String(downloadingQuoteId) === String(item.cotizacionId)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title={item.tieneModificacionPendiente ? "La cotizacion tiene una modificacion pendiente de aprobacion" : "Descargar PDF de cotizacion"}
                        >
                          <FileDown size={15} />
                          {String(downloadingQuoteId) === String(item.cotizacionId) ? "Descargando..." : "PDF"}
                        </button>
                      )}
                      {canUnlinkQuote?.(item.id) && onUnlinkQuote && (
                        <button
                          type="button"
                          onClick={() => onUnlinkQuote(item.id)}
                          disabled={unlinkingQuoteId === item.id}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Desvincular cotizacion"
                        >
                          <Unlink size={15} />
                          {unlinkingQuoteId === item.id ? "Quitando..." : "Desvincular"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>

      {presentationModalOpen && onMarkProposalPresented && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            onPaste={handlePresentationPaste}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{presentationLabel}</h3>
                <p className="mt-1 text-sm text-slate-500">{presentationHelp}</p>
              </div>
              <button
                type="button"
                onClick={() => setPresentationModalOpen(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                disabled={presentingProposal}
              >
                <X size={18} />
              </button>
            </div>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/50 px-4 py-8 text-center transition hover:bg-teal-50 dark:border-teal-900/60 dark:bg-teal-950/20">
              <Upload className="mb-3 text-teal-700" size={26} />
              <span className="font-semibold text-teal-900 dark:text-teal-100">
                {presentationFile ? presentationFile.name : "Seleccionar evidencia"}
              </span>
              <span className="mt-1 text-xs text-teal-700 dark:text-teal-200">
                Imagen o PDF. Tambien puedes pegar una captura con Ctrl+V.
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={presentingProposal}
                onChange={(event) => {
                  setPresentationFile(event.target.files?.[0] || null);
                  setPresentationError("");
                }}
              />
            </label>

            {presentationError && (
              <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {presentationError}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPresentationModalOpen(false)}
                disabled={presentingProposal}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!presentationFile) {
                    setPresentationError("Adjunta una evidencia antes de continuar.");
                    return;
                  }

                  onMarkProposalPresented(presentationFile);
                  setPresentationModalOpen(false);
                }}
                disabled={presentingProposal}
                className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {presentingProposal ? "Registrando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 break-words text-sm font-medium text-slate-700 dark:text-slate-200 ${className}`}>{value}</p>
    </div>
  );
}

function FilePreview({ file }: { file: OportunidadArchivo }) {
  if (!file.dataUrl) {
    return <p className="text-sm text-slate-500">El archivo se cargara al solicitar la vista previa o descarga.</p>;
  }

  if (!canPreviewFile(file)) {
    return <p className="text-sm text-slate-500">El navegador no puede previsualizar este archivo.</p>;
  }

  if (file.tipo.includes("image")) {
    return <img src={file.dataUrl} alt={file.nombre} className="max-h-[420px] w-full rounded-xl object-contain" />;
  }

  if (file.tipo.includes("pdf")) {
    return <iframe title={file.nombre} src={file.dataUrl} className="h-[420px] w-full rounded-xl border border-slate-200" />;
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
      Vista previa solicitada para {file.nombre}. Si el navegador no lo renderiza, use Descargar.
    </div>
  );
}
