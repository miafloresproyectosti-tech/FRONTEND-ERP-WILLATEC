import type { CotizacionItem } from "../types/cotizaciones.type";

interface CostoAdicional {
  monto: number;
  destino_entrega?: string | null;
}

type ModoDistribucion = "POR_ITEM" | "POR_CANTIDAD";
type TipoCalculo = "VENTA" | "ALQUILER";
type DestinoCalculo = {
  destino_entrega: string;
  detalle_variante?: string | null;
  cantidad: number;
  margen?: number;
  id?: number;
  cotizacion_item_id?: number;
  costo_unitario?: number;
  precio_venta?: number;
  subtotal?: number;
  costo_total?: number;
  ganancia?: number;
};

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
  const getItemDestinos = (item: CotizacionItem): DestinoCalculo[] => {
    if (entregaMultidestino && item.destinos_entrega?.length) {
      return item.destinos_entrega
        .map((destino) => ({
          ...destino,
          destino_entrega: normalizeDestino(destino.destino_entrega),
          detalle_variante: destino.detalle_variante,
          cantidad: Number(destino.cantidad || 0),
          margen: destino.margen === null || destino.margen === undefined ? undefined : Number(destino.margen),
        }))
        .filter((destino) => destino.cantidad > 0);
    }

    return [{
      destino_entrega: getDestinoKey(item),
      cantidad: Number(item.cantidad || 0),
    }];
  };

  const costosTotal = costos.reduce((acc, c) => acc + Number(c.monto || 0), 0);
  const grupos = new Map<string, Array<{ item: CotizacionItem; cantidad: number }>>();
  const costosPorDestino = new Map<string, number>();

  items.forEach((item) => {
    getItemDestinos(item).forEach((destino) => {
      const key = entregaMultidestino ? normalizeDestino(destino.destino_entrega) : "__GLOBAL__";
      grupos.set(key, [...(grupos.get(key) || []), { item, cantidad: Number(destino.cantidad || 0) }]);
    });
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
    itemIdsSeleccionados: Set<number>;
  }>();

  grupos.forEach((lineasDestino, key) => {
    const totalCostosDestino = costosPorDestino.get(key) || 0;
    const itemsConCostos =
      modoDistribucion === "POR_CANTIDAD"
        ? lineasDestino
        : lineasDestino.filter((linea) => linea.item.aplica_costos_adicionales !== false);
    const itemsSeleccionados = itemsConCostos.length > 0 ? itemsConCostos : lineasDestino;
    const totalCantidadDestino = lineasDestino.reduce(
      (acc, linea) => acc + Number(linea.cantidad || 0),
      0,
    );
    const totalCantidadSeleccionada = itemsSeleccionados.reduce(
      (acc, linea) => acc + Number(linea.cantidad || 0),
      0,
    );
    const divisor =
      modoDistribucion === "POR_CANTIDAD"
        ? totalCantidadDestino > 0 ? totalCantidadDestino : 1
        : totalCantidadSeleccionada > 0 ? totalCantidadSeleccionada : 1;

    distribucionPorDestino.set(key, {
      costoExtraUnitario: totalCostosDestino / divisor,
      itemIdsSeleccionados: new Set(itemsSeleccionados.map((linea) => linea.item.id)),
    });
  });

  const itemsRecalculados = items.map((item) => {
    const cantidad = Number(item.cantidad || 0);
    const costoBase = Number(item.costo_base || 0);
    const margen = Number(item.margen || 0);
    const periodoMeses = Math.max(0, Number(item.garantia_meses || 0));
    let subtotalItem = 0;
    let costoTotal = 0;
    let gananciaItemTotal = 0;
    let precioVentaPonderado = 0;
    let costoUnitarioPonderado = 0;
    const destinosCalculados = getItemDestinos(item).map((destino) => {
      const key = entregaMultidestino ? normalizeDestino(destino.destino_entrega) : "__GLOBAL__";
      const cantidadDestino = Number(destino.cantidad || 0);
      const distribucion = distribucionPorDestino.get(key);
      const aplicaCostoExtra =
        modoDistribucion === "POR_CANTIDAD" ||
        Boolean(distribucion?.itemIdsSeleccionados.has(item.id));
      const costoUnitario = costoBase + (aplicaCostoExtra ? distribucion?.costoExtraUnitario || 0 : 0);
      const margenDestino = destino.margen === null || destino.margen === undefined
        ? margen
        : Number(destino.margen || 0);
      const precioVentaBase =
        margenDestino < 100 ? costoUnitario / (1 - margenDestino / 100) : costoUnitario;
      const precioVentaRedondeado = Number(precioVentaBase.toFixed(2));
      const subtotalDestino = Number((
        precioVentaRedondeado * cantidadDestino * (tipoCalculo === "ALQUILER" ? periodoMeses : 1)
      ).toFixed(2));
      const costoTotalDestino = Number((costoUnitario * cantidadDestino).toFixed(2));
      const gananciaDestino = includeIgv
        ? (subtotalDestino - costoTotalDestino) / 1.18
        : subtotalDestino - costoTotalDestino;

      subtotalItem += subtotalDestino;
      costoTotal += costoTotalDestino;
      gananciaItemTotal += gananciaDestino;
      precioVentaPonderado += precioVentaRedondeado * cantidadDestino;
      costoUnitarioPonderado += costoUnitario * cantidadDestino;

      return {
        ...destino,
        margen: margenDestino,
        costo_unitario: Number(costoUnitario.toFixed(2)),
        precio_venta: precioVentaRedondeado,
        subtotal: subtotalDestino,
        costo_total: costoTotalDestino,
        ganancia: Number(gananciaDestino.toFixed(2)),
      };
    });
    const divisorItem = cantidad > 0 ? cantidad : 1;
    const precioVentaRedondeado = Number((precioVentaPonderado / divisorItem).toFixed(2));
    const costoUnitario = Number((costoUnitarioPonderado / divisorItem).toFixed(2));
    const ganancia = gananciaItemTotal;

    return {
      ...item,
      destinos_entrega: item.destinos_entrega?.length ? destinosCalculados : item.destinos_entrega,
      costo_unitario: costoUnitario,
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
