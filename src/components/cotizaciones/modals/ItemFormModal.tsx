import React from "react";
import type { ItemForm } from "../../../types/cotizaciones.type";
import { ArrowLeftRight, X } from "lucide-react";
import { formatMoney } from "../../../utils/formatNumber";

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

  const readImageFile = (file: File, callback: (dataUrl: string) => void) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageFile = (file: File) => {
    readImageFile(file, (dataUrl) => {
      setItemForm({
        ...itemForm,
        imagen: dataUrl,
      });
    });
  };

  const handleDrop: React.DragEventHandler<HTMLLabelElement> = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handlePaste: React.ClipboardEventHandler<HTMLLabelElement> = (event) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith("image/")
    );
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        handleImageFile(file);
      }
    }
  };

  const inp = "w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-400 outline-none bg-white";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">
              {editingItem ? 'Editar ítem' : 'Agregar ítem'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {itemForm.tipo ?? 'Externo'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 space-y-3 overflow-y-auto flex-1">

          {/* Producto */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Producto</p>
            <div className="space-y-2">
              {field('Descripción',
                <input className={inp} type="text" value={itemForm.descripcion}
                  onChange={e => setItemForm({ ...itemForm, descripcion: e.target.value })}
                  placeholder="Nombre completo del producto" />
              )}

              <div className="space-y-1">
                <label className="block text-[11px] text-gray-500 uppercase mb-1">Imagen</label>
                <label
                  htmlFor="item-imagen"
                  onDragOver={(e: React.DragEvent<HTMLLabelElement>) => e.preventDefault()}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                  className="group cursor-pointer border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-2.5 text-center transition-colors hover:border-blue-400 hover:bg-blue-50 block"
                >
                  <input
                    id="item-imagen"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFile(file);
                    }}
                  />

                  {itemForm.imagen ? (
                    <div className="space-y-2">
                      <img
                        src={itemForm.imagen}
                        alt="Vista previa"
                        className="mx-auto h-24 w-auto object-contain rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setItemForm({
                            ...itemForm,
                            imagen: "",
                          });
                        }}
                        className="text-xs text-red-600 hover:underline w-full"
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs text-gray-500">
                      <p className="font-medium text-gray-700">Imagen del ítem</p>
                      <p className="text-gray-500">Arrastra, pega o haz clic para cargar</p>
                    </div>
                  )}
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {field('Marca',
                  <input className={inp} type="text" value={itemForm.marca || ''}
                    onChange={e => setItemForm({ ...itemForm, marca: e.target.value })}
                    placeholder="Dell" />
                )}
                {field('Código',
                  <input className={inp} type="text" value={itemForm.codigo || ''}
                    onChange={e => setItemForm({ ...itemForm, codigo: e.target.value })}
                    placeholder="XPS-15" />
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

          <hr className="border-gray-200 my-2" />

          {/* Precios */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Precios</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {field('Cantidad',
                <input className={inp} type="number" min={1}
                  value={itemForm.cantidad?.toString() ?? ''}
                  onChange={e => setItemForm({ ...itemForm, cantidad: e.target.value ? parseInt(e.target.value) : 0 })} />
              )}
              {field('Garantía (meses)',
                <input className={inp} type="number"
                  value={itemForm.garantia_meses?.toString() ?? ''}
                  onChange={e => setItemForm({ ...itemForm, garantia_meses: e.target.value ? parseInt(e.target.value) : 0 })} />
              )}
              {field('Días entrega',
                <input className={inp} type="number"
                  value={itemForm.disponibilidad_dias?.toString() ?? ''}
                  onChange={e => setItemForm({ ...itemForm, disponibilidad_dias: e.target.value ? parseInt(e.target.value) : 0 })} />
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {field(`Costo (${monedaId === 1 ? 'S/.' : '$'})`, 
                <div className="flex gap-1">
                  <input className={`${inp} flex-1`} type="number"
                    value={itemForm.costo_base?.toString() ?? ''}
                    onChange={e => setItemForm({ ...itemForm, costo_base: e.target.value ? parseFloat(e.target.value) : 0 })} />
                  <button onClick={handleIntercambiarMoneda}
                    className="px-1.5 border border-gray-200 rounded hover:bg-gray-50 text-gray-500">
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                </div>
              )}
              {field('Margen %',
                <input className={inp} type="number" step="0.1"
                  value={itemForm.margen?.toString() ?? ''}
                  onChange={e => setItemForm({ ...itemForm, margen: e.target.value ? parseFloat(e.target.value) : 0 })} />
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
          {itemForm.tipo === 'externo' && (
            <>
              <hr className="border-gray-200 my-2" />
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Proveedor</p>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-2.5">
                  {field('Proveedor',
                    <input className={inp} type="text" value={itemForm.proveedor || ''}
                      onChange={e => setItemForm({ ...itemForm, proveedor: e.target.value })} />
                  )}
                  {field('Link',
                    <input className={inp} type="text" value={itemForm.link_proveedor || ''}
                      placeholder="https://..."
                      onChange={e => setItemForm({ ...itemForm, link_proveedor: e.target.value })} />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Resumen estimado */}
          <hr className="border-gray-200 my-2" />
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-[9px] text-gray-500 mb-0.5">Precio venta</p>
              <p className="text-xs font-semibold text-gray-800">{formatMoney(itemForm.precio_venta || 0, simboloMoneda)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <p className="text-[9px] text-gray-500 mb-0.5">Ganancia</p>
              <p className="text-xs font-semibold text-green-700">{formatMoney(itemForm.ganancia || 0, simboloMoneda)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-[9px] text-gray-500 mb-0.5">Subtotal</p>
              <p className="text-xs font-semibold text-gray-800">{formatMoney(itemForm.subtotal || 0, simboloMoneda)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-2.5 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={editingItem ? onUpdate : onSave}
            className="flex-1 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {editingItem ? 'Actualizar' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}

        
