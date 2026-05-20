import type { CotizacionCostosAdicional } from "../../../services/cotizacion.service";
import { X, DollarSign, Trash2 } from "lucide-react";

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
}

export function CostosModal({ 
  open, 
  onClose, 
  costos, 
  costoForm, 
  setCostoForm, 
  onAddCosto, 
  onDeleteCosto 
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-purple-600" /> Costos Adicionales
      </h3>

      <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400" />
      </button>
    </div>

      {/* LISTA DE COSTOS */}
      <div className="space-y-3 mb-4">
        {costos.map((costo) => (
          <div key={costo.id} className="flex justify-between items-center border p-2 rounded">
            <div>
              <p className="text-sm font-medium">{costo.tipo}</p>
              <p className="text-xs text-gray-500">S/ {costo.monto.toFixed(2)}</p>
            </div>

            <button
              onClick={() => onDeleteCosto(costo.id)}
              className="p-1 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ))}
      </div>

      {/* FORMULARIO AGREGAR */}
      <div className="space-y-2 border-t pt-3">
              <select
                value={costoForm.tipo}
                onChange={(e) => setCostoForm({ ...costoForm, tipo: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="viaje">Viaje</option>
                <option value="viatico">Viatico</option>
                <option value="movilidad">Movilidad</option>
                <option value="estancia">Estancia</option>
                <option value="flete">Flete</option>
                <option value="personal_externo">Personal Externo</option>
              </select>

              <input
                type="number"
                value={costoForm.monto}
                onChange={(e) =>
                  setCostoForm({ ...costoForm, monto: parseFloat(e.target.value) || 0 })
                }
                className="w-full p-2 border rounded"
                placeholder="Monto"
              />

              <button
                onClick={onAddCosto}
                className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold"
              >
                Agregar costo
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-4 text-sm text-gray-500"
            >
              Cerrar
            </button>
          </div> 
  )
}