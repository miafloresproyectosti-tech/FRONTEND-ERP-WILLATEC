import type { CotizacionItem } from "../types/cotizaciones.type";

interface CostoAdicional {
  monto: number;
}

type ModoDistribucion = "POR_ITEM" | "POR_CANTIDAD";

export function recalcularItems(
  items: CotizacionItem[],
  costos: CostoAdicional[],
  modoDistribucion: ModoDistribucion,
  includeIgv: boolean = false,
) {
  // ===== TOTAL COSTOS =====
  const costosTotal = costos.reduce((acc, c) => acc + Number(c.monto || 0), 0);

  // ===== TOTAL CANTIDAD =====
  const totalCantidad = items.reduce(
    (acc, item) => acc + Number(item.cantidad || 0),
    0,
  );

  // ===== COSTO DISTRIBUIDO =====
  // Extra UNITARIO según modo
  // POR_ITEM:     se divide entre número de líneas → mismo monto por línea
  // POR_CANTIDAD: se divide entre unidades totales → mismo monto por unidad
  const itemsConCostos =
    modoDistribucion === "POR_CANTIDAD"
      ? items
      : items.filter((item) => item.aplica_costos_adicionales !== false);
  const itemsSeleccionados = itemsConCostos.length > 0 ? itemsConCostos : items;
  const itemsSeleccionadosSet = new Set(itemsSeleccionados);
  const totalCantidadSeleccionada = itemsSeleccionados.reduce(
    (acc, item) => acc + Number(item.cantidad || 0),
    0,
  );
  const divisor =
    modoDistribucion === "POR_CANTIDAD"
      ? totalCantidad > 0 ? totalCantidad : 1
      : totalCantidadSeleccionada > 0 ? totalCantidadSeleccionada : 1;
  const costoExtraUnitario = costosTotal / divisor;

  // ===== ITEMS RECALCULADOS =====
  const itemsRecalculados = items.map((item) => {
    const cantidad = Number(item.cantidad || 0);

    const costoBase = Number(item.costo_base || 0);

    const margen = Number(item.margen || 0);

    const aplicaCostoExtra =
      modoDistribucion === "POR_CANTIDAD" ||
      itemsSeleccionadosSet.has(item);

    // COSTO UNITARIO FINAL
    const costoUnitario = costoBase + (aplicaCostoExtra ? costoExtraUnitario : 0);

    // Precio de venta unitario (fórmula igual en ambos casos)
    // - includeIgv=false: precio SIN IGV
    // - includeIgv=true:  precio CON IGV (porque costo_base ya lo traía)
    const precioVenta =
      margen < 100 ? costoUnitario / (1 - margen / 100) : costoUnitario;

    const precioVentaRedondeado = Number(precioVenta.toFixed(2));
    // Subtotal del ítem = precio_venta × cantidad
    // - includeIgv=false: subtotal SIN IGV
    // - includeIgv=true:  subtotal CON IGV
    const subtotalItem = Number((precioVentaRedondeado * cantidad).toFixed(2));

    // Costo total del ítem = cuánto costó comprarlo
    const costoTotal = Number((costoUnitario * cantidad).toFixed(2));

    // Ganancia por ítem
    // - includeIgv=false: ganancia = subtotalItem - costoTotal
    // - includeIgv=true:  ganancia = (subtotalItem - costoTotal) / 1.18
    const gananciaItem = subtotalItem - costoTotal;
    const ganancia = includeIgv ? gananciaItem / 1.18 : gananciaItem;

      return {
      ...item,
      costo_unitario: Number(costoUnitario.toFixed(2)),
      precio_venta:   precioVentaRedondeado,
      costo_total:    Number(costoTotal.toFixed(2)),
      subtotal:       Number(subtotalItem.toFixed(2)),
      ganancia:       Number(ganancia.toFixed(2)),
    };
  });
// ── 5. Totales de la cotización ──────────────────────────────
  const costoCompraTotal = itemsRecalculados.reduce((acc, i) => acc + i.costo_total, 0);
  const igvCostos       = Number((costoCompraTotal * 0.18).toFixed(2));
  const totalCostos     = Number((costoCompraTotal + igvCostos).toFixed(2));
  const gananciaItems    = itemsRecalculados.reduce((acc, i) => acc + i.ganancia,    0);
  const sumSubtotales    = itemsRecalculados.reduce((acc, i) => acc + i.subtotal,    0);

  // ── CASO incluye_igv = false ─────────────────────────────────
  //
  // subtotal cotización = suma de subtotales de ítems  (sin IGV)
  // igv                 = subtotal × 0.18
  // total               = subtotal + igv
  //
  if (!includeIgv) {
    const subtotal = Number(sumSubtotales.toFixed(2));
    const igv      = Number((subtotal * 0.18).toFixed(2));
    const total    = Number((subtotal + igv).toFixed(2));
    const ganancia = Number(gananciaItems.toFixed(2));

    return {
      items: itemsRecalculados,
      resumen: {
        subtotal,        // suma precios sin IGV × cantidades
        igv,             // subtotal × 0.18
        total,           // subtotal + igv
        costosTotal,
        costoCompraTotal: Number(costoCompraTotal.toFixed(2)),
        igvCostos,
        totalInversion: totalCostos,
        ganancia,
      },
    };
  }

  // ── CASO incluye_igv = true ──────────────────────────────────
  //
  // total               = suma de subtotales de ítems  (YA incluye IGV)
  // igv                 = total - total / 1.18          (IGV extraído)
  // subtotal cotización = total - igv  = total / 1.18   (base sin IGV)
  // ganancia            = suma de ganancias calculadas por item
  //
  const total    = Number(sumSubtotales.toFixed(2));
  const igv      = Number((total - total / 1.18).toFixed(2));
  const subtotal = Number((total / 1.18).toFixed(2));  // = total - igv
  const ganancia = Number((gananciaItems).toFixed(2));

  return {
    items: itemsRecalculados,
    resumen: {
      subtotal,        // total / 1.18  →  base sin IGV
      igv,             // total - total/1.18
      total,           // suma subtotales ítems, ya con IGV
      costosTotal,
      costoCompraTotal: Number(costoCompraTotal.toFixed(2)),
      igvCostos,
      totalInversion: totalCostos,
      ganancia,
    },
  };
}
