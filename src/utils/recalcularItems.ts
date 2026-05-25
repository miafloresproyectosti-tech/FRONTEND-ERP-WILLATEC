import type { CotizacionItem } from "../types/cotizaciones.type";

interface CostoAdicional {
  monto: number;
}

type ModoDistribucion = "POR_ITEM" | "POR_CANTIDAD";

export function recalcularItems(
  items: CotizacionItem[],
  costos: CostoAdicional[],
  modoDistribucion: ModoDistribucion,
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
  const costoDistribuido =
    modoDistribucion === "POR_ITEM"
      ? items.length > 0 ? costosTotal / items.length : 0
      : totalCantidad > 0 ? costosTotal / totalCantidad  : 0;

  // ===== ITEMS RECALCULADOS =====
  const itemsRecalculados = items.map((item) => {
    const cantidad = Number(item.cantidad || 0);

    const costoBase = Number(item.costo_base || 0);

    const margen = Number(item.margen || 0);

    // // EXTRA
    // const extra =
    //   modoDistribucion === "POR_ITEM"
    //     ? costoDistribuido
    //     : costoDistribuido * cantidad;

    // COSTO UNITARIO FINAL
    const costoUnitario = costoBase + costoDistribuido;

    // PRECIO VENTA
    const precioVenta =
      margen < 100 ? costoUnitario / (1 - margen / 100) : costoUnitario;

    // COSTO TOTAL
    const costoTotal = costoUnitario * cantidad;

    // SUBTOTAL
    const subtotal = precioVenta * cantidad;

    // GANANCIA
    const ganancia = subtotal - costoTotal;

    return {
      ...item,

      costo_unitario: Number(costoUnitario.toFixed(2)),

      precio_venta: Number(precioVenta.toFixed(2)),

      costo_total: Number(costoTotal.toFixed(2)),

      subtotal: Number(subtotal.toFixed(2)),

      ganancia: Number(ganancia.toFixed(2)),
    };
  });

  // ===== RESUMEN =====
  const subtotal = itemsRecalculados.reduce((acc, i) => acc + i.subtotal, 0);

  const costoCompraTotal = itemsRecalculados.reduce((acc, i) => acc + i.costo_total, 0);

  const igv = subtotal * 0.18;

  const ganancia = itemsRecalculados.reduce((acc, i) => acc + i.ganancia, 0);

  return {
    items: itemsRecalculados,

    resumen: {
      subtotal,
      costoCompraTotal,
      costosTotal,
      igv,
      ganancia,
      total: subtotal + igv,
    },
  };
}
