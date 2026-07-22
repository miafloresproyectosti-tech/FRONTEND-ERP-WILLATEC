import type { CotizacionCostosAdicional } from "../../../services/cotizacion.service";
import { X, DollarSign, Trash2, Pencil } from "lucide-react";
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
  }

  setCostoForm: (data: any) => void;

  onAddCosto: () => void;
  onDeleteCosto: (id: number) => void;
  onEditCosto: (costo: CotizacionCostosAdicional) => void;
  onCancelEditCosto: () => void;
  readOnly?: boolean;
  simboloMoneda?: string;
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
}: Props) {
  if (!open) return null;

  return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    
    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
      
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
      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
        {costos.map((costo) => (
          <div
            key={costo.id}
            className="flex justify-between items-center border p-2 rounded"
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
  </div>
);
}
