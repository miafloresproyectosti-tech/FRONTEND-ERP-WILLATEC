import type { CotizacionItem } from "../../types/cotizaciones.type";

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
}

export function CotizacionResumen({
  resumen,
  simboloMoneda,
  items,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      {/* RESUMEN */}
            <h2 className="text-xl mb-4">Resumen Aprobado</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">Subtotal: <span className="font-bold">{simboloMoneda} {resumen.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between">IGV 18%: <span>{simboloMoneda} {resumen.igv.toFixed(2)}</span></div>
              <div className="flex justify-between">
                Total Costos Adicionales: <span>{simboloMoneda} {(resumen.costosTotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                Total Costos Compra: <span>{simboloMoneda} {(resumen.costoCompraTotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                Distribuido por Item ({items.length} items): <span>{simboloMoneda} {(items.length > 0 ? ((resumen.costosTotal ?? 0) / items.length) : 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                {(() => {
                  const totalUnidades = items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
                  return (
                    <>
                      Distribuido por Cantidad ({totalUnidades} unidades):
                      <span>
                        {simboloMoneda}{' '}
                        {(totalUnidades > 0 ? (resumen.costosTotal ?? 0) / totalUnidades : 0).toFixed(2)}
                      </span>
                    </>
                  );
                })()}
              </div>

              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                Total: <span>{simboloMoneda} {resumen.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600 font-bold">
                Ganancia: <span>{simboloMoneda} {(resumen.ganancia ?? 0).toFixed(2)}</span>
              </div>
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

