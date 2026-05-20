import { FileText, Loader2, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onExportPdf: () => void;
  exportandoPdf: boolean;
}

export function ExportModal({
  open,
  onClose,
  onExportPdf,
  exportandoPdf,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl text-center">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <div />
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* ICONO */}
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>

        {/* TITULO */}
        <h3 className="text-xl font-bold mb-6">Exportar Documento</h3>

        {/* BOTONES */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={onExportPdf}
            disabled={exportandoPdf}
            className="flex items-center justify-center gap-2 p-3 border-2 border-red-100 rounded-xl hover:bg-red-50 text-red-700 font-bold"
          >
            {exportandoPdf ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}

            {exportandoPdf ? "Exportando..." : "Exportar PDF"}
          </button>
        </div>

        {/* CERRAR */}
        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-400 hover:underline"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
