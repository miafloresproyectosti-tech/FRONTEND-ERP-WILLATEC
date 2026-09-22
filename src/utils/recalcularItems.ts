import type { CotizacionItem } from "../types/cotizaciones.type";

interface CostoAdicional {
  monto: number;
  destino_entrega?: string | null;
}

type ModoDistribucion = "POR_ITEM" | "POR_CANTIDAD";
type TipoCalculo = "VENTA" | "ALQUILER";

export function recalcularItems(
  items: CotizacionItem[],
  costos: CostoAdicional[],
  modoDistribucion: ModoDistribucion,
  includeIgv: boolean = false,
  options: { tipoCalculo?: TipoCalculo; entregaMultidestino?: boolean } = {},
) {
  const tipoCalculo = options.tipoCalculo ?? "VENTA";
  const entregaMultidestino = options.entregaMultidestino ?? false;
  const normalizeDestino = (destino?: string | null) => {
    const value = (destino || "").trim();

    return value || "Lima Metropolitana";
  };
  const getDestinoKey = (item: CotizacionItem) =>
    entregaMultidestino ? normalizeDestino(item.destino_entrega) : "__GLOBAL__";

  const costosTotal = costos.reduce((acc, c) => acc + Number(c.monto || 0), 0);
  const grupos = new Map<string, CotizacionItem[]>();
  const costosPorDestino = new Map<string, number>();

  items.forEach((item) => {
    const key = getDestinoKey(item);
    grupos.set(key, [...(grupos.get(key) || []), item]);
  });

  if (entregaMultidestino) {
    costos.forEach((costo) => {
      const key = normalizeDestino(costo.destino_entrega);
      costosPorDestino.set(key, (costosPorDestino.get(key) || 0) + Number(costo.monto || 0));
    });
  } else {
    costosPorDestino.set("__GLOBAL__", costosTotal);
  }

  const distribucionPorDestino = new Map<string, {
    costoExtraUnitario: number;
    itemsSeleccionados: Set<CotizacionItem>;
  }>();

  grupos.forEach((itemsDestino, key) => {
    const totalCostosDestino = costosPorDestino.get(key) || 0;
    const itemsConCostos =
      modoDistribucion === "POR_CANTIDAD"
        ? itemsDestino
        : itemsDestino.filter((item) => item.aplica_costos_adicionales !== false);
    const itemsSeleccionados = itemsConCostos.length > 0 ? itemsConCostos : itemsDestino;
    const totalCantidadDestino = itemsDestino.reduce(
      (acc, item) => acc + Number(item.cantidad || 0),
      0,
    );
    const totalCantidadSeleccionada = itemsSeleccionados.reduce(
      (acc, item) => acc + Number(item.cantidad || 0),
      0,
    );
    const divisor =
      modoDistribucion === "POR_CANTIDAD"
        ? totalCantidadDestino > 0 ? totalCantidadDestino : 1
        : totalCantidadSeleccionada > 0 ? totalCantidadSeleccionada : 1;

    distribucionPorDestino.set(key, {
      costoExtraUnitario: totalCostosDestino / divisor,
      itemsSeleccionados: new Set(itemsSeleccionados),
    });
  });

  const itemsRecalculados = items.map((item) => {
    const cantidad = Number(item.cantidad || 0);
    const costoBase = Number(item.costo_base || 0);
    const margen = Number(item.margen || 0);
    const periodoMeses = Math.max(0, Number(item.garantia_meses || 0));
    const distribucion = distribucionPorDestino.get(getDestinoKey(item));
    const aplicaCostoExtra =
      modoDistribucion === "POR_CANTIDAD" ||
      Boolean(distribucion?.itemsSeleccionados.has(item));
    const costoUnitario = costoBase + (aplicaCostoExtra ? distribucion?.costoExtraUnitario || 0 : 0);
    const precioVentaBase =
      margen < 100 ? costoUnitario / (1 - margen / 100) : costoUnitario;
    const precioVentaRedondeado = Number(precioVentaBase.toFixed(2));
    const subtotalItem = Number((
      precioVentaRedondeado * cantidad * (tipoCalculo === "ALQUILER" ? periodoMeses : 1)
    ).toFixed(2));
    const costoTotal = Number((costoUnitario * cantidad).toFixed(2));
    const gananciaItem = subtotalItem - costoTotal;
    const ganancia = includeIgv ? gananciaItem / 1.18 : gananciaItem;

    return {
      ...item,
      costo_unitario: Number(costoUnitario.toFixed(2)),
      precio_venta: precioVentaRedondeado,
      costo_total: Number(costoTotal.toFixed(2)),
      subtotal: Number(subtotalItem.toFixed(2)),
      ganancia: Number(ganancia.toFixed(2)),
    };
  });

  const costoCompraTotal = itemsRecalculados.reduce((acc, i) => acc + i.costo_total, 0);
  const igvCostos = Number((costoCompraTotal * 0.18).toFixed(2));
  const totalCostos = Number((costoCompraTotal + igvCostos).toFixed(2));
  const gananciaItems = itemsRecalculados.reduce((acc, i) => acc + i.ganancia, 0);
  const sumSubtotales = itemsRecalculados.reduce((acc, i) => acc + i.subtotal, 0);

  if (!includeIgv) {
    const subtotal = Number(sumSubtotales.toFixed(2));
    const igv = Number((subtotal * 0.18).toFixed(2));
    const total = Number((subtotal + igv).toFixed(2));
    const ganancia = Number(gananciaItems.toFixed(2));

    return {
      items: itemsRecalculados,
      resumen: {
        subtotal,
        igv,
        total,
        costosTotal,
        costoCompraTotal: Number(costoCompraTotal.toFixed(2)),
        igvCostos,
        totalInversion: totalCostos,
        ganancia,
      },
    };
  }

  const total = Number(sumSubtotales.toFixed(2));
  const igv = Number((total - total / 1.18).toFixed(2));
  const subtotal = Number((total / 1.18).toFixed(2));
  const ganancia = Number(gananciaItems.toFixed(2));

  return {
    items: itemsRecalculados,
    resumen: {
      subtotal,
      igv,
      total,
      costosTotal,
      costoCompraTotal: Number(costoCompraTotal.toFixed(2)),
      igvCostos,
      totalInversion: totalCostos,
      ganancia,
    },
  };
}
