import type { CotizacionItem, } from "../../types/cotizaciones.type";
import { CheckCircle, Trash2, Plus } from "lucide-react";
interface Props{
  items: CotizacionItem[];
  simboloMoneda: string;

  estadoCotizacionId: number;
  setEstadoCotizacionId: (id: number) => void;

  onDeleteItem: (id: number) => void;
  onOpenEdit: (item: CotizacionItem) => void;

  onApproveAll?: () => void;
  todosItemsAprobados?: boolean;
  onAddItem: () => void;
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
  onAddItem
}: Props){
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl text-gray-800">Items ({items.length})</h2>

              <button onClick={onAddItem} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                <Plus className="w-4 h-4" /> Agregar Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left py-3 px-2 text-xs">Desc.</th>
                    <th className="text-left py-3 px-2 text-xs">Tipo</th>
                    <th className="text-left py-3 px-2 text-xs">Días Entrega</th>
                    <th className="text-left py-3 px-2 text-xs">Garantía</th>
                    <th className="text-left py-3 px-2 text-xs">Cant.</th>
                    {estadoCotizacionId === 3 && (
                      <>
                        <th className="text-left py-3 px-2 text-xs">Aprobada</th>
                        <th className="text-left py-3 px-2 text-xs">Estado</th>
                      </>
                    )}
                    <th className="text-left py-3 px-2 text-xs">Precio</th>
                    <th className="text-left py-3 px-2 text-xs">Costo</th>
                    <th className="text-left py-3 px-2 text-xs">Margen</th>
                    <th className="text-left py-3 px-2 text-xs">Ganancia</th>
                    <th className="text-left py-3 px-2 text-xs">Subtotal</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                      // Parsear todos los números que vienen como string desde la API
                      const precioVenta    = parseFloat(item.precio_venta as any) || 0;
                      const costoUnitario  = parseFloat(item.costo_unitario as any) || 0;
                      const costoTotal     = parseFloat(item.costo_total as any) || 0;
                      const ganancia       = parseFloat(item.ganancia as any) || 0;
                      const subtotal       = parseFloat(item.subtotal as any) || 0;
                      const margen         = parseFloat(item.margen as any) || 0;
                      const costoFinal = item.costo_total || 0;
                    return (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 max-w-[200px] truncate" title='descripcion'>
                          {item.descripcion}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${item.tipo === 'catalogo' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {item.tipo === 'catalogo' ? 'Cat' : 'Ext'}
                          </span>
                        </td>
                        {/* <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <IconoDisponibilidad tipo={item.disponibilidad_tipo} />
                            <span className={`text-xs font-medium ${
                              item.disponibilidad_tipo === 'stock' 
                                ? 'text-green-700 bg-green-100' 
                                : 'text-orange-700 bg-orange-100'
                            } px-2 py-1 rounded-full`}>
                              {item.disponibilidad_tipo === 'stock' ? 'Stock' : 'Imp'}
                            </span>
                          </div>
                        </td> */}
                        
                        <td className="py-3 px-2 font-medium text-xs">{item.disponibilidad_dias}</td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            {item.garantia_meses} meses
                          </span>
                        </td>
                        <td className="py-3 px-2 font-medium">{item.cantidad}</td>
                        
                        {estadoCotizacionId === 3 && (
                          <>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                value={item.cantidad || 0}
                                min="0" max={item.cantidad}
                                className="w-16 px-2 py-1 border border-yellow-300 bg-yellow-50 rounded focus:ring-2 focus:ring-yellow-500 text-xs"
                              />
                            </td>
                            <td className="py-3 px-2">
                              <select
                                value={ item.estado_cotizacion_item_id === 1 ? 'pendiente' : 
                                        item.estado_cotizacion_item_id === 2 ? 'aprobado' : 'rechazado'}
                                className="px-2 py-1 border border-yellow-300 bg-yellow-50 rounded text-xs focus:ring-2 focus:ring-yellow-500"
                              >
                                <option value={1}>⏳ Pend.</option>
                                <option value={2}>✅ Aprob.</option>
                                <option value={3}>❌ Rech.</option>
                              </select>

                              {todosItemsAprobados && (
                            <button 
                              onClick={() => setEstadoCotizacionId(4)} 
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" /> Aprobar Completa
                            </button>
                          )}
                            </td>
                          </>
                        )}
                        
                        <td>{simboloMoneda} {(precioVenta || 0).toFixed(2)}</td>
                        <td>{simboloMoneda} {(costoFinal ?? 0).toFixed(2)}</td>
                        <td className="py-3 px-2 font-medium text-xs">{(margen ?? 0).toFixed(1)} % </td>
                        <td className={((ganancia ?? 0) > 0) ? 'text-green-600' : 'text-red-600'}>
                          {simboloMoneda} {(ganancia|| 0).toFixed(2)}
                        </td>
                        <td className="font-medium">{simboloMoneda} {(subtotal || 0).toFixed(2)}</td>
                        <td>
                          <button onClick={() => onDeleteItem(item.id)} className="p-1 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                          <button
                            onClick={() => onOpenEdit(item)}
                            className="p-1 hover:bg-blue-50 rounded ml-2"
                          >
                            ✏️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
  )
}
          