import type { ItemForm } from "../../../types/cotizaciones.type";
import { ArrowLeftRight, X } from "lucide-react";

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

  const field = (label: string, children: React.ReactNode) => (
    <div>
      <label className="block text-[11px] text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );

  const inp = "w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-400 outline-none bg-white";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">
              {editingItem ? 'Editar ítem' : 'Agregar ítem'}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {itemForm.tipo ?? 'Externo'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Producto */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Producto</p>
            <div className="space-y-2.5">
              {field('Descripción',
                <input className={inp} type="text" value={itemForm.descripcion}
                  onChange={e => setItemForm({ ...itemForm, descripcion: e.target.value })}
                  placeholder="Nombre completo del producto" />
              )}
              <div className="grid grid-cols-3 gap-2.5">
                {field('Marca',
                  <input className={inp} type="text" value={itemForm.marca || ''}
                    onChange={e => setItemForm({ ...itemForm, marca: e.target.value })}
                    placeholder="ej: Dell" />
                )}
                {field('Modelo / código',
                  <input className={inp} type="text" value={itemForm.codigo || ''}
                    onChange={e => setItemForm({ ...itemForm, codigo: e.target.value })}
                    placeholder="ej: XPS-15" />
                )}
                {field('Unidad',
                  <select className={inp} value={itemForm.unidad_medida || 'UND'}
                    onChange={e => setItemForm({ ...itemForm, unidad_medida: e.target.value })}>
                    <option value="UND">UND</option>
                    <option value="KIT">KIT</option>
                    <option value="PAR">PAR</option>
                    <option value="SRV">SRV</option>
                    <option value="KG">KG</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Precios */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Precios y disponibilidad</p>
            <div className="grid grid-cols-3 gap-2.5 mb-2.5">
              {field('Cantidad',
                <input className={inp} type="number" min={1}
                  value={itemForm.cantidad || ''}
                  onChange={e => setItemForm({ ...itemForm, cantidad: e.target.value ? parseInt(e.target.value) : undefined })} />
              )}
              {field('Garantía (meses)',
                <input className={inp} type="number"
                  value={itemForm.garantia_meses || ''}
                  onChange={e => setItemForm({ ...itemForm, garantia_meses: e.target.value ? parseInt(e.target.value) : undefined })} />
              )}
              {field('Días entrega',
                <input className={inp} type="number"
                  value={itemForm.disponibilidad_dias || ''}
                  onChange={e => setItemForm({ ...itemForm, disponibilidad_dias: e.target.value ? parseInt(e.target.value) : undefined })} />
              )}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {field(`Costo compra (${monedaId === 1 ? 'S/.' : '$'})`,
                <div className="flex gap-1.5">
                  <input className={`${inp} flex-1`} type="number"
                    value={itemForm.costo_base || ''}
                    onChange={e => setItemForm({ ...itemForm, costo_base: e.target.value ? parseFloat(e.target.value) : undefined })} />
                  <button onClick={handleIntercambiarMoneda}
                    className="px-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {field('Margen %',
                <input className={inp} type="number" step="0.1"
                  value={itemForm.margen || ''}
                  onChange={e => setItemForm({ ...itemForm, margen: e.target.value ? parseFloat(e.target.value) : undefined })} />
              )}
              {field('Disponibilidad',
                <select className={inp} value={itemForm.disponibilidad_tipo || 'stock'}
                  onChange={e => setItemForm({
                    ...itemForm,
                    disponibilidad_tipo: e.target.value as any,
                    disponibilidad_dias: e.target.value === 'stock' ? 4 : 25,
                  })}>
                  <option value="stock">Stock</option>
                  <option value="importacion">Importación</option>
                </select>
              )}
            </div>
          </div>

          {/* Proveedor — solo si es personalizado */}
          {itemForm.tipo === 'personalizado' && (
            <>
              <hr className="border-gray-100" />
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Proveedor</p>
                <div className="grid grid-cols-2 gap-2.5 bg-gray-50 rounded-lg p-3">
                  {field('Proveedor',
                    <input className={inp} type="text" value={itemForm.proveedor || ''}
                      onChange={e => setItemForm({ ...itemForm, proveedor: e.target.value })} />
                  )}
                  {field('Link proveedor',
                    <input className={inp} type="text" value={itemForm.link_proveedor || ''}
                      placeholder="https://..."
                      onChange={e => setItemForm({ ...itemForm, link_proveedor: e.target.value })} />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Resumen estimado */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-[10px] text-gray-500 mb-0.5">Precio venta *</p>
              <p className="text-sm font-semibold text-gray-800">{simboloMoneda} {(itemForm.precio_venta || 0).toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-[10px] text-gray-500 mb-0.5">Ganancia *</p>
              <p className="text-sm font-semibold text-green-700">{simboloMoneda} {(itemForm.ganancia || 0).toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-[10px] text-gray-500 mb-0.5">Subtotal *</p>
              <p className="text-sm font-semibold text-gray-800">{simboloMoneda} {(itemForm.subtotal || 0).toFixed(2)}</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 -mt-2">* Precios NO incluyen IGV y costos adicionales</p>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 py-3 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={editingItem ? onUpdate : onSave}
            className="flex-1 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {editingItem ? 'Actualizar ítem' : 'Agregar ítem'}
          </button>
        </div>
      </div>
    </div>
  );
}

        