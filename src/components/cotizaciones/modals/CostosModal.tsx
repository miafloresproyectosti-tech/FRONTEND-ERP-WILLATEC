import type { CotizacionCostosAdicional } from "../../../services/cotizacion.service";
import { useRef, useState, type ClipboardEvent } from "react";
import { X, DollarSign, Trash2, Pencil, Eye, ImagePlus, ClipboardPaste } from "lucide-react";
import { formatMoney } from "../../../utils/formatNumber";

interface Props{
  open: boolean;
  onClose: () => void;

  costos: CotizacionCostosAdicional[]
  
  costoForm:{
    id: number
    cotizacion_id: number | null
    tipo: string
    monto: number
    descripcion: string
    destino_entrega?: string
    imagen_evidencia?: string | null
  }

  setCostoForm: (data: any) => void;

  onAddCosto: () => void;
  onDeleteCosto: (id: number) => void;
  onEditCosto: (costo: CotizacionCostosAdicional) => void;
  onCancelEditCosto: () => void;
  readOnly?: boolean;
  simboloMoneda?: string;
  entregaMultidestino?: boolean;
  destinos?: string[];
}

export function CostosModal({ 
  open, 
  onClose, 
  costos, 
  costoForm, 
  setCostoForm, 
  onAddCosto, 
  onDeleteCosto,
  onEditCosto,
  onCancelEditCosto,
  readOnly = false,
  simboloMoneda = "S/",
  entregaMultidestino = false,
  destinos = [],
}: Props) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  if (!open) return null;

  const readImage = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 4 * 1024 * 1024) {
      window.alert("La imagen no puede superar 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setCostoForm({ ...costoForm, imagen_evidencia: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"))
      || Array.from(event.clipboardData.items)
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();
    if (image) {
      event.preventDefault();
      readImage(image);
    }
  };

  const normalizeDestino = (destino?: string | null) => {
    const value = destino?.trim();

    return value || "Lima Metropolitana";
  };
  const totalCostos = costos.reduce((acc, costo) => acc + Number(costo.monto || 0), 0);
  const costosPorDestino = Array.from(
    costos.reduce((map, costo) => {
      const destino = normalizeDestino(costo.destino_entrega);
      map.set(destino, (map.get(destino) || 0) + Number(costo.monto || 0));

      return map;
    }, new Map<string, number>())
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onPaste={handlePaste}>
    
    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 shadow-2xl">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-purple-600" />
          Costos Adicionales
        </h3>

        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* LISTA DE COSTOS */}
      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
        {costos.map((costo) => (
          <div
            key={costo.id}
            className="flex justify-between items-center gap-3 border border-slate-200 p-3 rounded-xl bg-slate-50"
          >
            <div>
              <p className="text-sm font-medium">
                {costo.tipo}
              </p>

              <p className="text-xs text-gray-500">
                {formatMoney(costo.monto, simboloMoneda)}
              </p>
              {costo.descripcion && (
                <p className="text-xs text-gray-400">
                  {costo.descripcion}
                </p>
              )}
              {entregaMultidestino && (
                <p className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  {costo.destino_entrega || "Lima Metropolitana"}
                </p>
              )}
              {costo.imagen_evidencia && (
                <button type="button" onClick={() => setPreviewImage(costo.imagen_evidencia || null)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900" title="Ver evidencia">
                  <Eye className="h-4 w-4" /> Ver evidencia
                </button>
              )}
            </div>

            {!readOnly && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEditCosto(costo)}
                className="p-1 hover:bg-blue-50 rounded"
                title="Editar costo"
              >
                <Pencil className="w-4 h-4 text-blue-600" />
              </button>
              <button
                onClick={() => onDeleteCosto(costo.id)}
                className="p-1 hover:bg-red-50 rounded"
                title="Eliminar costo"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
            )}
          </div>
        ))}
      </div>

      {costos.length > 0 && (
        <div className="mb-4 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2">
          <div className="flex items-center justify-between text-xs font-semibold text-purple-900">
            <span>{entregaMultidestino ? "Total por destino" : "Total costos adicionales"}</span>
            {!entregaMultidestino && <span>{formatMoney(totalCostos, simboloMoneda)}</span>}
          </div>
          {entregaMultidestino && (
            <div className="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1">
              {costosPorDestino.map(([destino, total]) => (
                <div key={destino} className="flex items-center justify-between gap-3 text-xs text-purple-800">
                  <span className="truncate">{destino}</span>
                  <span className="font-semibold">{formatMoney(total, simboloMoneda)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FORMULARIO */}
      <div className="space-y-3 border-t pt-4">

        {!readOnly && (
        <>
        {costoForm.id ? (
          <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <span className="font-semibold">Editando costo adicional</span>
            <button
              type="button"
              onClick={onCancelEditCosto}
              className="font-semibold hover:text-blue-900"
            >
              Cancelar
            </button>
          </div>
        ) : null}

        <select
          value={costoForm.tipo}
          onChange={(e) =>
            setCostoForm({
              ...costoForm,
              tipo: e.target.value
            })
          }
          className="w-full p-2 border rounded-lg"
        >
          <option value="viaje">Viaje</option>
          <option value="viatico">Viático</option>
          <option value="movilidad">Movilidad</option>
          <option value="estancia">Estancia</option>
          <option value="flete">Flete</option>
          <option value="personal_externo">Personal Externo</option>
        </select>

        <input
          type="number"
          value={costoForm.monto || ''}
          onChange={(e) =>
            setCostoForm({
              ...costoForm,
              monto: e.target.value ? parseFloat(e.target.value) : undefined
            })
          }
          className="w-full p-2 border rounded-lg"
          placeholder="Monto"
        />

        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-700">Evidencia del costo</p>
              <p className="text-xs text-slate-500">Opcional. Puedes subir o pegar una imagen.</p>
            </div>
            <div className="flex items-center gap-2">
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => readImage(event.target.files?.[0])} />
              <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                <ImagePlus className="h-4 w-4" /> Subir
              </button>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500"><ClipboardPaste className="h-4 w-4" /> Pegar</span>
            </div>
          </div>
          {costoForm.imagen_evidencia && (
            <div className="mt-3 flex items-center gap-3">
              <img src={costoForm.imagen_evidencia} alt="Evidencia del costo" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
              <button type="button" onClick={() => setCostoForm({ ...costoForm, imagen_evidencia: null })} className="text-xs font-semibold text-red-600 hover:text-red-700">Quitar imagen</button>
            </div>
          )}
        </div>

        <input
          type="text"
          value={costoForm.descripcion}
          onChange={(e) =>
            setCostoForm({
              ...costoForm,
              descripcion: e.target.value
            })
          }
          className="w-full p-2 border rounded-lg"
          placeholder="Descripción"
        />

        {entregaMultidestino && (
          <>
            <input
              list="costos-destinos"
              type="text"
              value={costoForm.destino_entrega || ''}
              onChange={(e) =>
                setCostoForm({
                  ...costoForm,
                  destino_entrega: e.target.value
                })
              }
              className="w-full p-2 border rounded-lg"
              placeholder="Destino del costo (ej. Lima Metropolitana)"
            />
            <datalist id="costos-destinos">
              {destinos.map((destino) => (
                <option key={destino} value={destino} />
              ))}
            </datalist>
          </>
        )}

        <button
          onClick={onAddCosto}
          className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold"
        >
          {costoForm.id ? "Guardar cambios" : "Agregar costo"}
        </button>
        </>
        )}

        <button
          onClick={onClose}
          className="w-full text-sm text-gray-500 hover:text-gray-700"
        >
          Cerrar
        </button>

      </div>
    </div>
    {previewImage && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewImage(null)}>
        <div className="relative max-h-full max-w-3xl rounded-xl bg-white p-2" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => setPreviewImage(null)} className="absolute right-2 top-2 rounded-full bg-white p-1 shadow" title="Cerrar"><X className="h-5 w-5" /></button>
          <img src={previewImage} alt="Evidencia del costo" className="max-h-[80vh] max-w-full rounded-lg object-contain" />
        </div>
      </div>
    )}
  </div>
);
}
