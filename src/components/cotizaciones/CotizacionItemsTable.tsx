import type { ReactNode } from "react";
import { useState } from "react";
import type { CotizacionItem, } from "../../types/cotizaciones.type";
import { CheckCircle, Trash2, Plus, Pencil, Eye, GripVertical } from "lucide-react";
import { formatMoney } from "../../utils/formatNumber";
import { resolveItemImageUrl } from "../../utils/storageImage";
import { sanitizeLimitedRichText } from "../../utils/richText";
interface Props{
  items: CotizacionItem[];
  modoDistribucion: "POR_ITEM" | "POR_CANTIDAD";
  simboloMoneda: string;
  monedaId: number;
  tipoCambioSolesADolar: number;

  readOnly: boolean;

  estadoCotizacionId: number;
  setEstadoCotizacionId: (id: number) => void;

  onDeleteItem: (id: number) => void;
  onDeleteItems?: (ids: number[]) => void;
  onOpenEdit: (item: CotizacionItem) => void;
  onReorderItems?: (items: CotizacionItem[]) => void;
  onToggleAplicaCostosAdicionales?: (id: number, checked: boolean) => void;
  entregaMultidestino?: boolean;
  destinos?: string[];
  onDestinoChange?: (id: number, destino: string) => void;

  onApproveAll?: () => void;
  todosItemsAprobados?: boolean;
  onAddItem: () => void;
  isOwnCotizacion?: boolean;
  isAlquiler?: boolean;
}

export function CotizacionItemsTable ({ 
  items, 
  modoDistribucion,
  simboloMoneda, 
  monedaId,
  tipoCambioSolesADolar,
  estadoCotizacionId, 
  setEstadoCotizacionId,
  onDeleteItem,
  onDeleteItems,
  onOpenEdit, 
  onReorderItems,
  onToggleAplicaCostosAdicionales,
  entregaMultidestino = false,
  destinos = [],
  onDestinoChange,
  onApproveAll,
  todosItemsAprobados,
  onAddItem,
  readOnly,
  isOwnCotizacion = true,
  isAlquiler = false
}: Props){
const showCostosAdicionalesToggle = modoDistribucion !== "POR_CANTIDAD";
const canReorder = !readOnly && Boolean(onReorderItems) && items.length > 1;
const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
const selectedIdsSet = new Set(selectedItemIds);
const emptyColSpan =
  5 +
  (entregaMultidestino ? 1 : 0) +
  (showCostosAdicionalesToggle ? 1 : 0) +
  (estadoCotizacionId === 3 ? 2 : 0) +
  (isOwnCotizacion ? 4 : 3) +
  (isOwnCotizacion ? 1 : 0) +
  2 +
  (!readOnly ? 1 : 0) +
  (canReorder ? 1 : 0);
const formatGananciaSoles = (ganancia: number) => {
  const tipoCambio = tipoCambioSolesADolar || 1;
  return formatMoney(Number((ganancia * tipoCambio).toFixed(2)), "S/");
};
const hasItemDestinos = (item: CotizacionItem) => Boolean(item.destinos_entrega?.length);
const getItemDestinos = (item: CotizacionItem) => item.destinos_entrega || [];
const getNumber = (value: unknown) => Number(value || 0);
const renderDestinoStack = (
  item: CotizacionItem,
  renderValue: (destino: NonNullable<CotizacionItem["destinos_entrega"]>[number], index: number) => ReactNode,
  fallback: ReactNode,
  className = "text-gray-700"
) => {
  const itemDestinos = getItemDestinos(item);

  if (itemDestinos.length === 0) {
    return fallback;
  }

  return (
    <div className={`space-y-1 text-[10px] leading-tight ${className}`}>
      {itemDestinos.map((destino, destinoIndex) => (
        <div
          key={`${destino.destino_entrega}-${destinoIndex}`}
          className="min-h-[18px] border-b border-gray-100 pb-1 last:border-b-0 last:pb-0"
        >
          {renderValue(destino, destinoIndex)}
        </div>
      ))}
    </div>
  );
};
const moveItem = (sourceIndex: number, targetIndex: number) => {
  if (!canReorder || sourceIndex === targetIndex) return;
  if (!Number.isInteger(sourceIndex) || !Number.isInteger(targetIndex)) return;
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex >= items.length || targetIndex >= items.length) return;

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);
  onReorderItems?.(nextItems.map((item, index) => ({ ...item, orden: index + 1 })));
};
const toggleSelectedItem = (itemId: number, checked: boolean) => {
  setSelectedItemIds((prev) =>
    checked ? Array.from(new Set([...prev, itemId])) : prev.filter((id) => id !== itemId)
  );
};
const deleteSelectedItems = () => {
  if (selectedItemIds.length === 0) return;
  onDeleteItems?.(selectedItemIds);
  setSelectedItemIds([]);
};

// CotizacionItemsTable.tsx — reemplaza el return completo
return (
  <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 text-gray-900">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-base font-medium text-gray-800">
        Items <span className="text-gray-400 font-normal">({items.length})</span>
      </h2>
      {!readOnly && selectedItemIds.length > 0 && (
        <button
          onClick={deleteSelectedItems}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 sm:py-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" /> Eliminar ({selectedItemIds.length})
        </button>
      )}
      {!readOnly && (
      <button
        onClick={onAddItem}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 sm:py-1.5"
      >
        <Plus className="w-3.5 h-3.5" /> Agregar ítem
      </button>
      )}
    </div>

    {entregaMultidestino && (
      <datalist id="cotizacion-destinos">
        {destinos.map((destino) => (
          <option key={destino} value={destino} />
        ))}
      </datalist>
    )}

    <div className="grid gap-3 xl:hidden">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center text-sm text-gray-400">
          Sin items - agrega el primero
        </div>
      ) : (
        items.map((item, index) => {
          const precioVenta = parseFloat(item.precio_venta as any) || 0;
          const costoUnitario = parseFloat(item.costo_unitario as any) || 0;
          const costoTotal = parseFloat(item.costo_total as any) || 0;
          const ganancia = parseFloat(item.ganancia as any) || 0;
          const subtotal = parseFloat(item.subtotal as any) || 0;
          const margen = parseFloat(item.margen as any) || 0;
          const itemImage = resolveItemImageUrl(item.imagen_url, item.imagen);

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm"
              draggable={canReorder}
              onDragStart={(event) => {
                if (!canReorder) return;
                event.dataTransfer.setData("text/plain", String(index));
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                if (canReorder) event.preventDefault();
              }}
              onDrop={(event) => {
                if (!canReorder) return;
                event.preventDefault();
                const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
                moveItem(sourceIndex, index);
              }}
            >
              <div className="flex items-start gap-3">
                {canReorder && (
                  <button
                    type="button"
                    className="mt-1 inline-flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 active:cursor-grabbing"
                    title="Arrastrar para ordenar"
                    aria-label="Arrastrar item para ordenar"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                )}
                {!readOnly && (
                  <input
                    type="checkbox"
                    checked={selectedIdsSet.has(item.id)}
                    onChange={(event) => toggleSelectedItem(item.id, event.target.checked)}
                    className="mt-3 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600"
                    title="Seleccionar item"
                  />
                )}
                {itemImage && (
                  <img
                    src={itemImage}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-xl border border-gray-200 bg-white object-contain"
                    loading="lazy"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900">{item.descripcion}</p>
                  {item.nota && <RichTextNote value={item.nota} compact />}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                  item.tipo === 'catalogo' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {item.tipo === 'catalogo' ? 'Cat' : 'Ext'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl bg-gray-50 p-3 text-xs sm:grid-cols-3 sm:text-center">
                <div className="flex items-center justify-between sm:block">
                  <p className="text-gray-500">Cant.</p>
                  <p className="font-bold text-gray-900">{item.cantidad}</p>
                </div>
                <div className="flex items-center justify-between sm:block">
                  <p className="text-gray-500">{isAlquiler ? "Periodo" : "Garantia"}</p>
                  <p className="font-bold text-amber-700">{item.garantia_meses}m</p>
                </div>
                {isOwnCotizacion && (
                  <div className="flex items-center justify-between sm:block">
                    <p className="text-gray-500">Margen</p>
                    <p className="font-bold text-gray-900">{(margen ?? 0).toFixed(1)}%</p>
                  </div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                <div>
                  <p className="font-semibold uppercase text-gray-400">Costo un.</p>
                  <p className="mt-1 font-bold text-gray-800">{formatMoney(costoUnitario, simboloMoneda)}</p>
                </div>
                <div>
                  <p className="font-semibold uppercase text-gray-400">Costo total</p>
                  <p className="mt-1 font-bold text-gray-800">{formatMoney(costoTotal, simboloMoneda)}</p>
                </div>
                <div>
                  <p className="font-semibold uppercase text-gray-400">{isAlquiler ? "P. unit. mensual" : "P. venta"}</p>
                  <p className="mt-1 font-bold text-gray-800">{formatMoney(precioVenta, simboloMoneda)}</p>
                </div>
                <div>
                  <p className="font-semibold uppercase text-gray-400">{isAlquiler ? "Total x meses" : "Subtotal"}</p>
                  <p className="mt-1 font-bold text-gray-900">{formatMoney(subtotal, simboloMoneda)}</p>
                </div>
                {isOwnCotizacion && (
                  <div className="col-span-2 rounded-xl bg-gray-50 px-3 py-2">
                    <p className="font-semibold uppercase text-gray-400">Ganancia</p>
                    <p className={`mt-1 font-bold ${ganancia > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatMoney(ganancia, simboloMoneda)}
                      {monedaId === 2 && <span className="ml-2 text-emerald-600">{formatGananciaSoles(ganancia)}</span>}
                    </p>
                  </div>
                )}
              </div>

              {showCostosAdicionalesToggle && (
                <label className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                  Costos adicionales
                  <input
                    type="checkbox"
                    checked={item.aplica_costos_adicionales !== false}
                    disabled={readOnly}
                    onChange={(event) => onToggleAplicaCostosAdicionales?.(item.id, event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 disabled:opacity-50"
                  />
                </label>
              )}

              {entregaMultidestino && (
                <label className="mt-3 block rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
                  Destinos
                  {hasItemDestinos(item) ? (
                    <div className="mt-1 space-y-1">
                      {item.destinos_entrega!.map((destino, destinoIndex) => (
                        <div key={`${destino.destino_entrega}-${destinoIndex}`} className="rounded-lg bg-white px-2 py-1 text-[11px] text-blue-900">
                          <div className="flex justify-between gap-2">
                            <span className="truncate">{destino.destino_entrega}</span>
                            <span className="font-bold">x{destino.cantidad}</span>
                          </div>
                          {destino.detalle_variante && (
                            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
                              {destino.detalle_variante}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <input
                      list="cotizacion-destinos"
                      value={item.destino_entrega || ""}
                      disabled={readOnly}
                      onChange={(event) => onDestinoChange?.(item.id, event.target.value)}
                      placeholder="Lima Metropolitana"
                      className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  )}
                </label>
              )}

              <div className="mt-4 border-t border-gray-100 pt-3">
                {readOnly ? (
                  <button
                    onClick={() => onOpenEdit(item)}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <Eye className="h-4 w-4" />
                    Ver detalle
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                    <button
                      onClick={() => onOpenEdit(item)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>

    <div className="hidden overflow-x-auto rounded-lg border border-gray-100 xl:block">
      <table className="min-w-[1320px] w-full text-xs" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {canReorder && <col style={{ width: '34px' }} />}
          {!readOnly && <col style={{ width: '34px' }} />}
          <col style={{ width: '170px' }} />
          {entregaMultidestino && <col style={{ width: '180px' }} />}
          <col style={{ width: '44px' }} />
          <col style={{ width: '52px' }} />
          <col style={{ width: '50px' }} />
          <col style={{ width: '74px' }} />
          {showCostosAdicionalesToggle && <col style={{ width: '76px' }} />}
          {estadoCotizacionId === 3 && <><col style={{ width: '60px' }} /><col style={{ width: '74px' }} /></>}
          <col style={{ width: '90px' }} />
          <col style={{ width: '90px' }} />
          {isOwnCotizacion && <col style={{ width: '60px' }} />}
          <col style={{ width: '90px' }} />
          {isOwnCotizacion && <col style={{ width: monedaId === 2 ? '116px' : '90px' }} />}
          <col style={{ width: '96px' }} />
          <col style={{ width: '64px' }} />
        </colgroup>
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {canReorder && <th className="py-2.5 px-1 text-center font-medium text-gray-500"></th>}
            {!readOnly && <th className="py-2.5 px-1 text-center font-medium text-gray-500"></th>}
            <th className="py-2.5 px-3 text-left font-medium text-gray-500">Descripción</th>
            {entregaMultidestino && (
              <th className="py-2.5 px-2 text-center font-medium text-gray-500">Destino</th>
            )}
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Cant.</th>
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Tipo</th>
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Días</th>
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">{isAlquiler ? "Periodo" : "Garantía"}</th>
            {showCostosAdicionalesToggle && (
              <th className="py-2.5 px-2 text-center font-medium text-gray-500">Costos add.</th>
            )}
            {estadoCotizacionId === 3 && (
              <>
                <th className="py-2.5 px-2 text-center font-medium text-gray-500">Aprobada</th>
                <th className="py-2.5 px-2 text-center font-medium text-gray-500">Estado</th>
              </>
            )}
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Costo un.</th>
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Costo tot.</th>
            {isOwnCotizacion && <th className="py-2.5 px-2 text-center font-medium text-gray-500">Margen</th>}
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">{isAlquiler ? "P. unit. mensual" : "P. venta"}</th>
            {isOwnCotizacion && <th className="py-2.5 px-2 text-center font-medium text-gray-500">Ganancia</th>}
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">{isAlquiler ? "Total x meses" : "Subtotal"}</th>
            <th className="sticky right-0 z-20 bg-gray-50 py-2.5 px-2 text-center font-medium text-gray-500 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]">Acc.</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={emptyColSpan} className="py-10 text-center text-gray-400">
                Sin ítems — agrega el primero
              </td>
            </tr>
          ) : (
            items.map((item, index) => {
              const precioVenta   = parseFloat(item.precio_venta as any)   || 0;
              const costoUnitario = parseFloat(item.costo_unitario as any) || 0;
              const costoTotal    = parseFloat(item.costo_total as any)    || 0;
              const ganancia      = parseFloat(item.ganancia as any)       || 0;
              const subtotal      = parseFloat(item.subtotal as any)       || 0;
              const margen        = parseFloat(item.margen as any)         || 0;
              const itemImage     = resolveItemImageUrl(item.imagen_url, item.imagen);

              return (
                <tr
                  key={item.id}
                  className="group border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  draggable={canReorder}
                  onDragStart={(event) => {
                    if (!canReorder) return;
                    event.dataTransfer.setData("text/plain", String(index));
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => {
                    if (canReorder) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    if (!canReorder) return;
                    event.preventDefault();
                    const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
                    moveItem(sourceIndex, index);
                  }}
                >
                  {canReorder && (
                    <td className="py-2.5 px-1 text-center">
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing"
                        title="Arrastrar para ordenar"
                        aria-label="Arrastrar item para ordenar"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                  {!readOnly && (
                    <td className="py-2.5 px-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIdsSet.has(item.id)}
                        onChange={(event) => toggleSelectedItem(item.id, event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        title="Seleccionar item"
                      />
                    </td>
                  )}
                  <td
                    className="py-2.5 px-3 font-medium text-gray-800 overflow-hidden"
                    style={{ maxWidth: 140, textOverflow: 'ellipsis' }}
                    title={item.descripcion}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {itemImage && (
                        <img
                          src={itemImage}
                          alt=""
                          className="w-8 h-8 rounded border border-gray-200 object-contain bg-white flex-shrink-0"
                          loading="lazy"
                        />
                      )}
                      <span className="truncate">{item.descripcion}</span>
                    </div>
                    {item.nota && <RichTextNote value={item.nota} />}
                  </td>
                  {entregaMultidestino && (
                    <td className="py-2.5 px-2 text-center">
                      {hasItemDestinos(item) ? (
                        <div className="space-y-1 text-left text-[10px] font-semibold text-blue-800">
                          {item.destinos_entrega!.map((destino, destinoIndex) => (
                            <div
                              key={`${destino.destino_entrega}-${destinoIndex}`}
                              className="flex min-h-[18px] items-center justify-between gap-2 rounded-md bg-blue-50 px-2 py-1 last:mb-0"
                            >
                              <span className="min-w-0">
                                <span className="block truncate" title={destino.destino_entrega}>{destino.destino_entrega}</span>
                                {destino.detalle_variante && (
                                  <span className="block truncate text-[9px] font-medium text-slate-500" title={destino.detalle_variante}>
                                    {destino.detalle_variante}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-blue-700">x{destino.cantidad}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <input
                          list="cotizacion-destinos"
                          value={item.destino_entrega || ""}
                          disabled={readOnly}
                          onChange={(event) => onDestinoChange?.(item.id, event.target.value)}
                          placeholder="Lima Metropolitana"
                          className="w-full rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-800 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                          title={item.destino_entrega || "Lima Metropolitana"}
                        />
                      )}
                    </td>
                  )}
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

                  {showCostosAdicionalesToggle && (
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={item.aplica_costos_adicionales !== false}
                        disabled={readOnly}
                        onChange={(event) =>
                          onToggleAplicaCostosAdicionales?.(item.id, event.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Aplicar costos adicionales"
                      />
                    </td>
                  )}

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

                  <td className="py-2.5 px-2 text-center tabular-nums text-gray-700">
                    {renderDestinoStack(
                      item,
                      (destino) => formatMoney(getNumber(destino.costo_unitario), simboloMoneda),
                      formatMoney(costoUnitario, simboloMoneda)
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-gray-700">
                    {renderDestinoStack(
                      item,
                      (destino) => formatMoney(getNumber(destino.costo_total), simboloMoneda),
                      formatMoney(costoTotal, simboloMoneda)
                    )}
                  </td>
                  {isOwnCotizacion && (
                    <td className="py-2.5 px-2 text-center tabular-nums font-medium text-gray-800">
                      {renderDestinoStack(
                        item,
                        (destino) => `${getNumber(destino.margen ?? margen).toFixed(1)} %`,
                        `${(margen ?? 0).toFixed(1)} %`
                      )}
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-center tabular-nums text-gray-700">
                    {renderDestinoStack(
                      item,
                      (destino) => formatMoney(getNumber(destino.precio_venta), simboloMoneda),
                      formatMoney(precioVenta, simboloMoneda)
                    )}
                  </td>
                  {isOwnCotizacion && (
                    <td className="py-2.5 px-2 text-center tabular-nums font-medium">
                      {hasItemDestinos(item) ? (
                        renderDestinoStack(
                          item,
                          (destino) => {
                            const gananciaDestino = getNumber(destino.ganancia);

                            return (
                              <div className={gananciaDestino > 0 ? "text-green-700" : "text-red-700"}>
                                <div>{formatMoney(gananciaDestino, simboloMoneda)}</div>
                                {monedaId === 2 && (
                                  <div className="mt-0.5 text-[10px] leading-none text-emerald-600">
                                    {formatGananciaSoles(gananciaDestino)}
                                  </div>
                                )}
                              </div>
                            );
                          },
                          null
                        )
                      ) : (
                        <div className={ganancia > 0 ? 'text-green-700' : 'text-red-700'}>
                          <div>{formatMoney(ganancia, simboloMoneda)}</div>
                          {monedaId === 2 && (
                            <div className="mt-0.5 text-[10px] leading-none text-emerald-600">
                              {formatGananciaSoles(ganancia)}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-center tabular-nums font-medium text-gray-800">
                    {renderDestinoStack(
                      item,
                      (destino) => formatMoney(getNumber(destino.subtotal), simboloMoneda),
                      formatMoney(subtotal, simboloMoneda)
                    )}
                  </td>
                  <td className="sticky right-0 z-10 bg-white py-2.5 px-2 text-gray-900 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)] group-hover:bg-gray-50">
                    {readOnly ? (
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => onOpenEdit(item)}
                          className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
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

function RichTextNote({
  value,
  compact = false,
}: {
  value: string;
  compact?: boolean;
}) {
  const html = sanitizeLimitedRichText(value);

  if (!html) return null;

  return (
    <div
      className={
        compact
          ? "mt-1 line-clamp-2 text-xs font-normal text-gray-500"
          : "mt-1 break-words text-[10px] font-normal leading-snug text-gray-500"
      }
    >
      <span>Nota: </span>
      <span
        className="whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
