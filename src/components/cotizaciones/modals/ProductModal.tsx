import { X } from "lucide-react"
import type { Producto } from "../../../services/producto.service";

interface Props {
  open: boolean,
  onClose: () => void,
  productos: Producto[],
  simboloMoneda: string,
  onSelect: (producto: Producto) => void
}

export function ProductModal({
  open,
  onClose,
  productos,
  simboloMoneda,
  onSelect
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Seleccionar del Catálogo</h3>
              <button onClick={onClose}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="p-4 overflow-y-auto">
              <div className="space-y-2">
                {productos.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => onSelect(p)}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-blue-50 cursor-pointer group transition-all"
                  >
                    <div>
                      <p className="font-bold text-gray-800 group-hover:text-blue-700">{p.nombre}</p>
                      <p className="text-xs text-gray-500">Sugerido: {simboloMoneda} {p.precio_referencial}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      p.stock === 0 
                      ? 'bg-red-100 text-red-700' 
                      : p.stock > 10 ? 'bg-green-100 text-green-700' 
                      : 'bg-orange-100 text-orange-700'
                      }`}
                      >
                      {p.stock === 0 
                      ? 'Agotado' 
                      : p.stock > 10 
                      ? 'En Stock' 
                      : `Pocas Unidades (${p.stock})`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
  )
}