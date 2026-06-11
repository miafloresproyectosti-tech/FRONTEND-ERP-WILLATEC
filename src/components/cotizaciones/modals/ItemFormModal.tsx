import React from "react";
import type { ItemForm } from "../../../types/cotizaciones.type";
import { ArrowLeftRight, Copy, Plus, Trash2, X } from "lucide-react";
import { formatMoney } from "../../../utils/formatNumber";
import { resolveItemImageUrl } from "../../../utils/storageImage";

interface Props{
  open: boolean;
  onClose: () => void;

  itemForm: ItemForm;
  setItemForm: React.Dispatch<React.SetStateAction<ItemForm>>;
  
  monedaId: number;
  simboloMoneda: string;
  tipoCambioSolesADolar: number;
  canViewGanancia?: boolean;
  
  onSave: () => void;
  onUpdate: () => void;
  editingItem?: ItemForm | null;

  handleIntercambiarMoneda: () => void;
  readOnly?: boolean;
  externalItemSuggestions?: ItemForm[];
  onSelectExternalSuggestion?: (item: ItemForm) => void;
}

export function ItemFormModal({
  open, 
  onClose, 
  itemForm, 
  setItemForm, 
  monedaId, 
  simboloMoneda, 
  tipoCambioSolesADolar,
  canViewGanancia = true,
  onSave, 
  onUpdate, 
  editingItem, 
  handleIntercambiarMoneda,
  readOnly = false,
  externalItemSuggestions = [],
  onSelectExternalSuggestion
}: Props) {
  if (!open) return null;

  const gananciaSoles =
    monedaId === 2
      ? Number((Number(itemForm.ganancia || 0) * (tipoCambioSolesADolar || 1)).toFixed(2))
      : null;

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
  const filteredExternalSuggestions = !readOnly && itemForm.tipo === "externo" && itemForm.descripcion.trim()
    ? externalItemSuggestions
      .filter((suggestion) => {
        const search = itemForm.descripcion.trim().toLowerCase();
        return [
          suggestion.descripcion,
          suggestion.codigo,
          suggestion.marca,
          suggestion.proveedor,
        ].some((value) => String(value || "").toLowerCase().includes(search));
      })
      .slice(0, 5)
    : [];
  const proveedores = itemForm.proveedores?.length
    ? itemForm.proveedores
    : [{ nombre: itemForm.proveedor || "", link: itemForm.link_proveedor || "", precio: null, notas: "" }];

  const updateProveedor = (
    index: number,
    fieldName: "nombre" | "link" | "precio" | "notas",
    value: string | number | null,
  ) => {
    if (readOnly) return;

    const nextProveedores = proveedores.map((proveedor, proveedorIndex) =>
      proveedorIndex === index
        ? { ...proveedor, [fieldName]: value }
        : proveedor
    );
    const firstProveedor = nextProveedores[0];

    setItemForm({
      ...itemForm,
      proveedores: nextProveedores,
      proveedor: firstProveedor?.nombre || "",
      link_proveedor: firstProveedor?.link || "",
    });
  };

  const addProveedor = () => {
    if (readOnly) return;

    setItemForm({
      ...itemForm,
      proveedores: [...proveedores, { nombre: "", link: "", precio: null, notas: "" }],
    });
  };

  const removeProveedor = (index: number) => {
    if (readOnly) return;

    const nextProveedores = proveedores.filter((_, proveedorIndex) => proveedorIndex !== index);
    const normalizedProveedores = nextProveedores.length
      ? nextProveedores
      : [{ nombre: "", link: "", precio: null, notas: "" }];
    const firstProveedor = normalizedProveedores[0];

    setItemForm({
      ...itemForm,
      proveedores: normalizedProveedores,
      proveedor: firstProveedor?.nombre || "",
      link_proveedor: firstProveedor?.link || "",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">
              {readOnly ? 'Ver ítem' : editingItem ? 'Editar ítem' : 'Agregar ítem'}
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
                <div className="space-y-1">
                  <input className={inp} type="text" value={itemForm.descripcion}
                    disabled={readOnly}
                    onChange={e => setItemForm({ ...itemForm, descripcion: e.target.value })}
                    placeholder="Nombre completo del producto" />
                  {filteredExternalSuggestions.length > 0 && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/60 overflow-hidden">
                      {filteredExternalSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.id}-${suggestion.descripcion}`}
                          type="button"
                          onClick={() => onSelectExternalSuggestion?.(suggestion)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-white transition-colors"
                        >
                          {(suggestion.imagen || suggestion.imagen_url) && (
                            <img
                              src={resolveItemImageUrl(suggestion.imagen_url, suggestion.imagen)}
                              alt=""
                              className="h-8 w-8 rounded border border-gray-200 object-contain bg-white flex-shrink-0"
                            />
                          )}
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-gray-800 truncate">
                              {suggestion.descripcion}
                            </span>
                            <span className="block text-[10px] text-gray-500 truncate">
                              {[suggestion.marca, suggestion.codigo, suggestion.proveedor].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[11px] text-gray-500 uppercase mb-1">Imagen</label>
                <label
                  htmlFor="item-imagen"
                  onDragOver={(e: React.DragEvent<HTMLLabelElement>) => e.preventDefault()}
                  onDrop={readOnly ? undefined : handleDrop}
                  onPaste={readOnly ? undefined : handlePaste}
                  className={`group border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-2.5 text-center transition-colors block ${readOnly ? 'cursor-default' : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50'}`}
                >
                  <input
                    id="item-imagen"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={readOnly}
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
                      {!readOnly && (
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
                      )}
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
                    disabled={readOnly}
                    onChange={e => setItemForm({ ...itemForm, marca: e.target.value })}
                    placeholder="Dell" />
                )}
                {field('Código',
                  <input className={inp} type="text" value={itemForm.codigo || ''}
                    disabled={readOnly}
                    onChange={e => setItemForm({ ...itemForm, codigo: e.target.value })}
                    placeholder="XPS-15" />
                )}
                {field('Unidad',
                  <select className={inp} value={itemForm.unidad_medida || 'UND'}
                    disabled={readOnly}
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
                  disabled={readOnly}
                  value={itemForm.cantidad?.toString() ?? ''}
                  onChange={e => setItemForm({ ...itemForm, cantidad: e.target.value ? parseInt(e.target.value) : 0 })} />
              )}
              {field('Garantía (meses)',
                <input className={inp} type="number"
                  disabled={readOnly}
                  value={itemForm.garantia_meses?.toString() ?? ''}
                  onChange={e => setItemForm({ ...itemForm, garantia_meses: e.target.value ? parseInt(e.target.value) : 0 })} />
              )}
              {field('Días entrega',
                <input className={inp} type="number"
                  disabled={readOnly}
                  value={itemForm.disponibilidad_dias?.toString() ?? ''}
                  onChange={e => setItemForm({ ...itemForm, disponibilidad_dias: e.target.value ? parseInt(e.target.value) : 0 })} />
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {field(`Costo (${monedaId === 1 ? 'S/.' : '$'})`, 
                <div className="flex gap-1">
                  <input className={`${inp} flex-1`} type="number"
                    disabled={readOnly}
                    value={itemForm.costo_base?.toString() ?? ''}
                    onChange={e => setItemForm({ ...itemForm, costo_base: e.target.value ? parseFloat(e.target.value) : 0 })} />
                  <button onClick={handleIntercambiarMoneda}
                    disabled={readOnly}
                    className="px-1.5 border border-gray-200 rounded hover:bg-gray-50 text-gray-500">
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                </div>
              )}
              {field('Margen %',
                <input className={inp} type="number" step="0.1"
                  disabled={readOnly}
                  value={itemForm.margen?.toString() ?? ''}
                  onChange={e => setItemForm({ ...itemForm, margen: e.target.value ? parseFloat(e.target.value) : 0 })} />
              )}
              {field('Disponibilidad',
                <select className={inp} value={itemForm.disponibilidad_tipo || 'stock'}
                  disabled={readOnly}
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

          {/* Proveedores - solo si es personalizado */}
          {itemForm.tipo === 'externo' && (
            <>
              <hr className="border-gray-200 my-2" />
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Proveedores</p>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={addProveedor}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                      title="Agregar proveedor"
                    >
                      <Plus className="w-3 h-3" />
                      Agregar
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {proveedores.map((proveedor, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-gray-500">Proveedor {index + 1}</span>
                        {!readOnly && proveedores.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeProveedor(index)}
                            className="p-1 rounded-md text-red-500 hover:bg-red-50"
                            title="Quitar proveedor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {field('Proveedor',
                          <input
                            className={inp}
                            type="text"
                            disabled={readOnly}
                            value={proveedor.nombre || ''}
                            onChange={e => updateProveedor(index, "nombre", e.target.value)}
                          />
                        )}
                        {field('Link',
                          <div className="flex gap-1">
                            <input
                              className={`${inp} flex-1`}
                              type="text"
                              disabled={readOnly}
                              value={proveedor.link || ''}
                              placeholder="https://..."
                              onChange={e => updateProveedor(index, "link", e.target.value)}
                            />
                            {proveedor.link && (
                              <button
                                type="button"
                                onClick={() => void navigator.clipboard?.writeText(proveedor.link || '')}
                                className="px-2 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-500"
                                title="Copiar link"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {field(`Precio (${monedaId === 1 ? 'S/.' : '$'})`,
                          <input
                            className={inp}
                            type="number"
                            step="0.01"
                            disabled={readOnly}
                            value={proveedor.precio?.toString() ?? ''}
                            onChange={e => updateProveedor(index, "precio", e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        )}
                        {field('Notas',
                          <input
                            className={inp}
                            type="text"
                            disabled={readOnly}
                            value={proveedor.notas || ''}
                            placeholder="Entrega, stock, contacto..."
                            onChange={e => updateProveedor(index, "notas", e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Resumen estimado */}
          <hr className="border-gray-200 my-2" />
          <div className={`grid gap-2 ${canViewGanancia ? "grid-cols-3" : "grid-cols-2"}`}>
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-[9px] text-gray-500 mb-0.5">Precio venta</p>
              <p className="text-xs font-semibold text-gray-800">{formatMoney(itemForm.precio_venta || 0, simboloMoneda)}</p>
            </div>
            {canViewGanancia && (
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-[9px] text-gray-500 mb-0.5">Ganancia</p>
                <p className="text-xs font-semibold text-green-700">{formatMoney(itemForm.ganancia || 0, simboloMoneda)}</p>
                {gananciaSoles !== null && (
                  <p className="mt-0.5 text-[10px] leading-none font-semibold text-emerald-600">
                    {formatMoney(gananciaSoles, "S/")}
                  </p>
                )}
              </div>
              )}
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
            {readOnly ? 'Cerrar' : 'Cancelar'}
          </button>
          {!readOnly && (
            <button onClick={editingItem ? onUpdate : onSave}
              className="flex-1 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {editingItem ? 'Actualizar' : 'Agregar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

        
