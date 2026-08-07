import type { CotizacionItem, } from "../../types/cotizaciones.type";
import { CheckCircle, Trash2, Plus, Pencil, Eye, GripVertical } from "lucide-react";
import { formatMoney } from "../../utils/formatNumber";
import { resolveItemImageUrl } from "../../utils/storageImage";
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
  onOpenEdit: (item: CotizacionItem) => void;
  onReorderItems?: (items: CotizacionItem[]) => void;
  onToggleAplicaCostosAdicionales?: (id: number, checked: boolean) => void;

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
  onOpenEdit, 
  onReorderItems,
  onToggleAplicaCostosAdicionales,
  onApproveAll,
  todosItemsAprobados,
  onAddItem,
  readOnly,
  isOwnCotizacion = true,
  isAlquiler = false
}: Props){
const showCostosAdicionalesToggle = modoDistribucion !== "POR_CANTIDAD";
const canReorder = !readOnly && Boolean(onReorderItems) && items.length > 1;
const emptyColSpan =
  5 +
  (showCostosAdicionalesToggle ? 1 : 0) +
  (estadoCotizacionId === 3 ? 2 : 0) +
  4 +
  (isOwnCotizacion ? 1 : 0) +
  2 +
  (canReorder ? 1 : 0);
const formatGananciaSoles = (ganancia: number) => {
  const tipoCambio = tipoCambioSolesADolar || 1;
  return formatMoney(Number((ganancia * tipoCambio).toFixed(2)), "S/");
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

// CotizacionItemsTable.tsx — reemplaza el return completo
return (
  <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 text-gray-900">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-base font-medium text-gray-800">
        Items <span className="text-gray-400 font-normal">({items.length})</span>
      </h2>
      {!readOnly && (
      <button
        onClick={onAddItem}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 sm:py-1.5"
      >
        <Plus className="w-3.5 h-3.5" /> Agregar ítem
      </button>
      )}
    </div>

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
                  {item.nota && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">Nota: {item.nota}</p>
                  )}
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
                <div className="flex items-center justify-between sm:block">
                  <p className="text-gray-500">Margen</p>
                  <p className="font-bold text-gray-900">{(margen ?? 0).toFixed(1)}%</p>
                </div>
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
      <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {canReorder && <col style={{ width: '34px' }} />}
          <col style={{ width: '140px' }} />
          <col style={{ width: '44px' }} />
          <col style={{ width: '52px' }} />
          <col style={{ width: '50px' }} />
          <col style={{ width: '74px' }} />
          {showCostosAdicionalesToggle && <col style={{ width: '76px' }} />}
          {estadoCotizacionId === 3 && <><col style={{ width: '60px' }} /><col style={{ width: '74px' }} /></>}
          <col style={{ width: '76px' }} />
          <col style={{ width: '76px' }} />
          <col style={{ width: '60px' }} />
          <col style={{ width: '76px' }} />
          {isOwnCotizacion && <col style={{ width: monedaId === 2 ? '98px' : '76px' }} />}
          <col style={{ width: '84px' }} />
          <col style={{ width: '64px' }} />
        </colgroup>
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {canReorder && <th className="py-2.5 px-1 text-center font-medium text-gray-500"></th>}
            <th className="py-2.5 px-3 text-left font-medium text-gray-500">Descripción</th>
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
            <th className="py-2.5 px-2 text-center font-medium text-gray-500">Margen</th>
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
                    {item.nota && (
                      <div
                        className="mt-1 text-[10px] leading-snug font-normal text-gray-500 break-words"
                        style={{ whiteSpace: 'pre-line' }}
                      >
                        Nota: {item.nota}
                      </div>
                    )}
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

                  <td className="py-2.5 px-2 text-center tabular-nums text-gray-700">{formatMoney(costoUnitario, simboloMoneda)}</td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-gray-700">{formatMoney(costoTotal, simboloMoneda)}</td>
                  <td className="py-3 px-2 font-medium text-xs">{(margen ?? 0).toFixed(1)} % </td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-gray-700">{formatMoney(precioVenta, simboloMoneda)}</td>
                  {isOwnCotizacion && <td className={`py-2.5 px-2 text-center tabular-nums font-medium ${ganancia > 0 ? 'text-green-700' : 'text-red-700'}`}>
                    <div>{formatMoney(ganancia, simboloMoneda)}</div>
                    {monedaId === 2 && (
                      <div className="mt-0.5 text-[10px] leading-none text-emerald-600">
                        {formatGananciaSoles(ganancia)}
                      </div>
                    )}
                  </td>}
                  <td className="py-2.5 px-2 text-center tabular-nums font-medium text-gray-800">
                    {formatMoney(subtotal, simboloMoneda)}
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
