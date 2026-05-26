import type { CotizacionItem, } from "../../types/cotizaciones.type";
import { CheckCircle, Trash2, Plus, Pencil } from "lucide-react";
interface Props{
  items: CotizacionItem[];
  simboloMoneda: string;

  readOnly: boolean;

  estadoCotizacionId: number;
  setEstadoCotizacionId: (id: number) => void;

  onDeleteItem: (id: number) => void;
  onOpenEdit: (item: CotizacionItem) => void;

  onApproveAll?: () => void;
  todosItemsAprobados?: boolean;
  onAddItem: () => void;
  isOwnCotizacion?: boolean;
}

export function CotizacionItemsTable ({ 
  items, 
  simboloMoneda, 
  estadoCotizacionId, 
  setEstadoCotizacionId,
  onDeleteItem, 
  onOpenEdit, 
  onApproveAll,
  todosItemsAprobados,
  onAddItem,
  readOnly,
  isOwnCotizacion = true
}: Props){
// CotizacionItemsTable.tsx — reemplaza el return completo
return (
  <div className="bg-white rounded-xl shadow-sm border p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-medium text-gray-800">
        Items <span className="text-gray-400 font-normal">({items.length})</span>
      </h2>
      {!readOnly && (
      <button
        onClick={onAddItem}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
      >
        <Plus className="w-3.5 h-3.5" /> Agregar ítem
      </button>
      )}
    </div>

    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '140px' }} />
          <col style={{ width: '44px' }} />
          <col style={{ width: '52px' }} />
          <col style={{ width: '50px' }} />
          <col style={{ width: '74px' }} />
          {estadoCotizacionId === 3 && <><col style={{ width: '60px' }} /><col style={{ width: '74px' }} /></>}
          <col style={{ width: '76px' }} />
          <col style={{ width: '76px' }} />
          <col style={{ width: '60px' }} />
          <col style={{ width: '76px' }} />
          {isOwnCotizacion && <col style={{ width: '76px' }} />}
          <col style={{ width: '84px' }} />
          <col style={{ width: '56px' }} />
        </colgroup>
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="py-2.5 px-3 text-left font-medium text-gray-500">Descripción</th>
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Cant.</th>
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Tipo</th>
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Días</th>
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Garantía</th>
            {estadoCotizacionId === 3 && (
              <>
                <th className="py-2.5 px-2 text-center font-medium text-gray-500">Aprobada</th>
                <th className="py-2.5 px-2 text-center font-medium text-gray-500">Estado</th>
              </>
            )}
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Costo un.</th>
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Costo tot.</th>
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Margen</th>
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">P. venta</th>
            {isOwnCotizacion && <th className="py-2.5 px-2 text-center font-medium text-gray-500">Ganancia</th>}
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Subtotal</th>
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Acc.</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={isOwnCotizacion ? 14 : 13} className="py-10 text-center text-gray-400">
                Sin ítems — agrega el primero
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const precioVenta   = parseFloat(item.precio_venta as any)   || 0;
              const costoUnitario = parseFloat(item.costo_unitario as any) || 0;
              const costoTotal    = parseFloat(item.costo_total as any)    || 0;
              const ganancia      = parseFloat(item.ganancia as any)       || 0;
              const subtotal      = parseFloat(item.subtotal as any)       || 0;
              const margen        = parseFloat(item.margen as any)         || 0;

              return (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td
                    className="py-2.5 px-3 font-medium text-gray-800 overflow-hidden"
                    style={{ maxWidth: 140, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={item.descripcion}
                  >
                    {item.descripcion}
                  </td>
                  <td className="py-2.5 px-2 text-center text-gray-700">{item.cantidad}</td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      item.tipo === 'catalogo'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.tipo === 'catalogo' ? 'Cat' : 'Ext'}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center text-gray-700">{item.disponibilidad_dias}</td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
                      {item.garantia_meses}m
                    </span>
                  </td>

                  {estadoCotizacionId === 3 && (
                    <>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          defaultValue={item.cantidad || 0}
                          min={0}
                          max={item.cantidad}
                          disabled={readOnly}
                          className="w-12 px-1 py-0.5 text-center border border-yellow-300 bg-yellow-50 rounded text-xs focus:ring-1 focus:ring-yellow-400 outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <select
                          defaultValue={item.estado_cotizacion_item_id ?? 1}
                          disabled={readOnly}
                          className="px-1 py-0.5 border border-yellow-300 bg-yellow-50 rounded text-[10px] focus:ring-1 focus:ring-yellow-400 outline-none"
                        >
                          <option value={1}>⏳ Pend.</option>
                          <option value={2}>✅ Aprob.</option>
                          <option value={3}>❌ Rech.</option>
                        </select>
                        {!readOnly && todosItemsAprobados && (
                          <button
                            onClick={() => {
                              if (onApproveAll) {
                                onApproveAll();
                                return;
                              }

                              setEstadoCotizacionId(4);
                            }}
                            className="mt-1 flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-[10px] hover:bg-green-700"
                          >
                            <CheckCircle className="w-3 h-3" /> Aprobar
                          </button>
                        )}
                      </td>
                    </>
                  )}

                  <td className="py-2.5 px-2 text-center tabular-nums text-gray-700">{simboloMoneda} {costoUnitario.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-gray-700">{simboloMoneda} {costoTotal.toFixed(2)}</td>
                  <td className="py-3 px-2 font-medium text-xs">{(margen ?? 0).toFixed(1)} % </td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-gray-700">{simboloMoneda} {precioVenta.toFixed(2)}</td>
                  {isOwnCotizacion && <td className={`py-2.5 px-2 text-center tabular-nums font-medium ${ganancia > 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {simboloMoneda} {ganancia.toFixed(2)}
                  </td>}
                  <td className="py-2.5 px-2 text-center tabular-nums font-medium text-gray-800">
                    {simboloMoneda} {subtotal.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2">
                    {!readOnly && (
                      <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onOpenEdit(item)}
                        className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);
}
