import type { CotizacionItem } from "../../types/cotizaciones.type";
import { formatMoney } from "../../utils/formatNumber";

interface Resumen {
  subtotal: number;
  costoCompraTotal: number;
  igv: number;
  costosTotal: number;
  total: number;
  ganancia: number;
}

interface Props {
  resumen: Resumen;
  simboloMoneda: string;
  items: CotizacionItem[];
  isOwnCotizacion?: boolean;
}

export function CotizacionResumen({
  resumen,
  simboloMoneda,
  items,
  isOwnCotizacion = true,
}: Props) {
  const costosPorItem = items.length > 0 ? (resumen.costosTotal ?? 0) / items.length : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      {/* RESUMEN */}
            <h2 className="text-xl mb-4">Resumen Aprobado</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                Total Costos Compra: <span>{formatMoney(resumen.costoCompraTotal ?? 0, simboloMoneda)}</span>
              </div>
              <div className="flex justify-between">
                Total Costos Adicionales: <span>{formatMoney(resumen.costosTotal ?? 0, simboloMoneda)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                Distribuido por Item ({items.length} items): <span>{formatMoney(costosPorItem, simboloMoneda)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                {(() => {
                  const totalUnidades = items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
                  return (
                    <>
                      Distribuido por Cantidad ({totalUnidades} unidades):
                      <span>
                        {formatMoney(totalUnidades > 0 ? (resumen.costosTotal ?? 0) / totalUnidades : 0, simboloMoneda)}
                      </span>
                    </>
                  );
                })()}
              </div>
              <div className="flex justify-between">Subtotal: <span className="font-bold">{formatMoney(resumen.subtotal, simboloMoneda)}</span></div>
              <div className="flex justify-between">IGV 18%: <span>{formatMoney(resumen.igv, simboloMoneda)}</span></div>
              
              

              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                Total: <span>{formatMoney(resumen.total, simboloMoneda)}</span>
              </div>
              {isOwnCotizacion && (
              <div className="flex justify-between text-green-600 font-bold">
                Ganancia: <span>{formatMoney(resumen.ganancia ?? 0, simboloMoneda)}</span>
              </div>
              )}
              <div className="flex justify-between pt-2 border-t text-blue-600 font-bold">
                Margen Promedio: <span>{items.length > 0 ? (items.reduce((sum, item) => sum + item.margen, 0) / items.length).toFixed(1) : '0.0'}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-purple-600 font-bold">
                Items Stock: <span>{items.filter(i => i.disponibilidad_tipo === 'stock').length}</span> | 
                Items Importación: <span>{items.filter(i => i.disponibilidad_tipo === 'importacion').length}</span>
              </div>
            </div>  
    </div>
  );
}

