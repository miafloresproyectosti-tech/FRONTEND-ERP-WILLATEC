import type { CotizacionItem } from "../../types/cotizaciones.type";
import { formatMoney } from "../../utils/formatNumber";

interface Resumen {
  subtotal: number;
  costoCompraTotal: number;
  igvCostos: number;
  totalInversion: number;
  igv: number;
  costosTotal: number;
  total: number;
  ganancia: number;
}

interface Props {
  resumen: Resumen;
  modoDistribucion: "POR_ITEM" | "POR_CANTIDAD";
  simboloMoneda: string;
  monedaId: number;
  tipoCambioSolesADolar: number;
  items: CotizacionItem[];
  isOwnCotizacion?: boolean;
  includeIgv?: boolean;
}

export function CotizacionResumen({
  resumen,
  modoDistribucion,
  simboloMoneda,
  monedaId,
  tipoCambioSolesADolar,
  items,
  isOwnCotizacion = true,
  includeIgv = false,
}: Props) {
  const totalCostosAdicionales = resumen.costosTotal ?? 0;
  const totalUnidades = items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
  const itemsConCostos = modoDistribucion === "POR_CANTIDAD"
    ? items
    : items.filter((item) => item.aplica_costos_adicionales !== false);
  const itemsSeleccionados = itemsConCostos.length > 0 ? itemsConCostos : items;
  const totalUnidadesSeleccionadas = itemsSeleccionados.reduce(
    (sum, item) => sum + Number(item.cantidad || 0),
    0
  );
  const divisor =
    modoDistribucion === "POR_CANTIDAD"
      ? totalUnidades > 0 ? totalUnidades : 1
      : totalUnidadesSeleccionadas > 0 ? totalUnidadesSeleccionadas : 1;
  const costoExtraUnitario = totalCostosAdicionales / divisor;
  const selectedItemsLabel =
    modoDistribucion === "POR_CANTIDAD"
      ? `${items.length} items`
      : `${itemsSeleccionados.length} de ${items.length} items`;
  const distributionLabel =
    modoDistribucion === "POR_CANTIDAD"
      ? `Distribuido por Cantidad (${totalUnidades} unidades)`
      : `Distribuido por items marcados (${selectedItemsLabel}, ${totalUnidadesSeleccionadas} unidades)`;
  const gananciaSoles =
    monedaId === 2
      ? Number((Number(resumen.ganancia ?? 0) * (tipoCambioSolesADolar || 1)).toFixed(2))
      : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      {/* RESUMEN */}
            <h2 className="text-xl mb-4 pt-3 flex justify-between text-lg font-bold">Resumen de Adicionales</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                Total Costos Adicionales: <span>{formatMoney(totalCostosAdicionales, simboloMoneda)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                {distributionLabel}: <span>{formatMoney(costoExtraUnitario, simboloMoneda)}</span>
              </div>
              {modoDistribucion !== "POR_CANTIDAD" && itemsConCostos.length === 0 && items.length > 0 && (
                <div className="text-xs text-amber-600">
                  Ningun item esta marcado; se distribuye entre todos para mantener el calculo.
                </div>
              )}
              <h2 className="border-t pt-3 text-xl mb-4 flex justify-between font-bold">Resumen de Costos (Inversión)</h2>
              {includeIgv ? (
                <div className="flex justify-between text-lg font-bold">
                  Total Inversión incl. IGV: <span>{formatMoney(resumen.costoCompraTotal ?? 0, simboloMoneda)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    Total Costos Compra sin IGV: <span>{formatMoney(resumen.costoCompraTotal ?? 0, simboloMoneda)}</span>
                  </div>
                  <div className="flex justify-between">IGV 18%: <span>{formatMoney(resumen.igvCostos, simboloMoneda)}</span></div>
                  <div className="flex justify-between text-lg font-bold">
                    Total Inversión: <span>{formatMoney(resumen.totalInversion, simboloMoneda)}</span>
                  </div>
                </>
              )}
              <h2 className="border-t text-xl mb-4 pt-3 flex justify-between text-lg font-bold">Resumen de Venta</h2>
              <div className="flex justify-between ">Subtotal: <span className="font-bold">{formatMoney(resumen.subtotal, simboloMoneda)}</span></div>
              <div className="flex justify-between">IGV 18%: <span>{formatMoney(resumen.igv, simboloMoneda)}</span></div>
              <div className="flex justify-between text-lg font-bold">
                Total Venta: <span>{formatMoney(resumen.total, simboloMoneda)}</span>
              </div>
              {isOwnCotizacion && (
              <div className="flex justify-between text-green-600 font-bold">
                Ganancia:
                <span className="text-right">
                  {formatMoney(resumen.ganancia ?? 0, simboloMoneda)}
                  {gananciaSoles !== null && (
                    <span className="ml-2 text-sm text-emerald-600">
                      {formatMoney(gananciaSoles, "S/")}
                    </span>
                  )}
                </span>
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

