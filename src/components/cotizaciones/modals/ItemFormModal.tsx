import type { ItemForm } from "../../../types/cotizaciones.type";
import { ArrowLeftRight } from "lucide-react";

interface Props{
  open: boolean;
  onClose: () => void;

  itemForm: ItemForm;
  setItemForm: React.Dispatch<React.SetStateAction<ItemForm>>;
  
  monedaId: number;
  simboloMoneda: string;
  
  onSave: () => void;
  onUpdate: () => void;
  editingItem?: ItemForm | null;

  handleIntercambiarMoneda: () => void;
}

export function ItemFormModal({
  open, 
  onClose, 
  itemForm, 
  setItemForm, 
  monedaId, 
  simboloMoneda, 
  onSave, 
  onUpdate, 
  editingItem, 
  handleIntercambiarMoneda
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Detalles del Item</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Nombre del Producto</label>
                <input 
                  type="text" 
                  value={itemForm.descripcion} 
                  onChange={e => setItemForm({...itemForm, descripcion: e.target.value})}
                  className="w-full p-2 border rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Cantidad</label>
                <input 
                  type="number" 
                  value={itemForm.cantidad || 1} 
                  onChange={e => setItemForm({...itemForm, cantidad: parseInt(e.target.value) || 1})}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Garantía</label>
                <input 
                  type="number" 
                  value={itemForm.garantia_meses || ""} 
                  onChange={e => setItemForm({...itemForm, garantia_meses: parseInt(e.target.value) || 12})}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              {/* ── NUEVOS CAMPOS ── */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Marca</label>
                <input
                  type="text"
                  value={itemForm.marca || ""}
                  onChange={e => setItemForm({ ...itemForm, marca: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="ej: Dell, HP, Lenovo"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Modelo / Código</label>
                <input
                  type="text"
                  value={itemForm.codigo || ""}
                  onChange={e => setItemForm({ ...itemForm, codigo: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="ej: XPS-15-9500"
                />
              </div>
              {/* ── FIN NUEVOS CAMPOS ── */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Costo Compra ({monedaId === 1 ? 'S/.' : '$'})</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={itemForm.costo_base || ""} 
                    onChange={e => setItemForm({...itemForm, costo_base: parseFloat(e.target.value) || 0})}
                    className="w-full p-2 border rounded-lg"
                  />
                  <button onClick={handleIntercambiarMoneda} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Margen %</label>
                <input 
                  type="number" 
                  value={itemForm.margen || ""} 
                  onChange={e => setItemForm({...itemForm, margen: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Disponibilidad</label>
                <select 
                  value={itemForm.disponibilidad_tipo || ""}
                  onChange={e => setItemForm({...itemForm, disponibilidad_tipo: e.target.value as any, disponibilidad_dias: e.target.value === 'stock' ? 4 : 25})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="stock">Stock</option>
                  <option value="importacion">Importación</option>
                </select>
              </div>
              {itemForm.tipo === 'personalizado' && (
              <>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Proveedor
                  </label>

                  <input
                    type="text"
                    value={itemForm.proveedor}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        proveedor: e.target.value
                      })
                    }
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Link Proveedor
                  </label>

                  <input
                    type="text"
                    value={itemForm.link_proveedor}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        link_proveedor: e.target.value
                      })
                    }
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </>
            )}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Días Entrega</label>
                <input 
                  type="number" 
                  value={itemForm.disponibilidad_dias} 
                  onChange={e => setItemForm({...itemForm, disponibilidad_dias: parseInt(e.target.value) || 0})}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
            {/* BOTONES */}
            <div className="mt-6 flex gap-3">
              <button onClick={onClose} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button 
              onClick={editingItem ? onUpdate : onSave} 
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
              >
                {editingItem ? 'Actualizar' : 'Agregar'}
                </button>
            </div>
            {/* RESUMEN */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm space-y-1">
          <div className="flex justify-between">
            <span>Precio Venta:</span>
            <span className="font-bold">
              {simboloMoneda}{' '}
              {(itemForm.precio_venta ?? 0).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between text-green-600">
            <span>Ganancia:</span>
            <span className="font-bold">
              {simboloMoneda}{' '}
              {(itemForm.ganancia ?? 0).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between font-bold border-t pt-2">
            <span>Subtotal:</span>
            <span>
              {simboloMoneda}{' '}
              {(itemForm.subtotal ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

        