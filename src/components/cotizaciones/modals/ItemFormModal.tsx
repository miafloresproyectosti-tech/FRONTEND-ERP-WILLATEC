import React from "react";
import type { ImportacionCalculoTipo, ItemForm } from "../../../types/cotizaciones.type";
import { Calculator, Copy, Plus, Trash2, X } from "lucide-react";
import { formatMoney } from "../../../utils/formatNumber";
import { resolveItemImageUrl } from "../../../utils/storageImage";
import api from "../../../services/api";

interface Props {
  open: boolean;
  onClose: () => void;

  itemForm: ItemForm;
  setItemForm: React.Dispatch<React.SetStateAction<ItemForm>>;

  monedaId: number;
  simboloMoneda: string;
  tipoCambioSolesADolar: number;
  tipoCambioDolarASoles: number;
  canViewGanancia?: boolean;

  onSave: () => void;
  onUpdate: () => void;
  editingItem?: ItemForm | null;

  handleIntercambiarMoneda: () => void;
  readOnly?: boolean;
  externalItemSuggestions?: ItemForm[];
  onSelectExternalSuggestion?: (item: ItemForm) => void;
  isAlquiler?: boolean;
  costoSinIgv?: boolean;
}

export function ItemFormModal({
  open,
  onClose,
  itemForm,
  setItemForm,
  monedaId,
  simboloMoneda,
  tipoCambioSolesADolar,
  tipoCambioDolarASoles,
  canViewGanancia = true,
  onSave,
  onUpdate,
  editingItem,
  readOnly = false,
  externalItemSuggestions = [],
  onSelectExternalSuggestion,
  isAlquiler = false,
  costoSinIgv = false
}: Props) {
  const [importCalcOpen, setImportCalcOpen] = React.useState(false);
  const [importCalcType, setImportCalcType] = React.useState<'under200' | 'from201to1999' | 'from2000up'>('under200');
  const [importCalcForm, setImportCalcForm] = React.useState({
    precioProducto: itemForm.costo_base ? String(itemForm.costo_base) : '',
    unidades: itemForm.cantidad ? String(itemForm.cantidad) : '1',
    pesoTotal: '',
  });

  if (!open) return null;

  const importCalc = itemForm.importacion_calculo ?? null;
  const hasImportCalc = Boolean(importCalc);
  const showImportCalcControls = itemForm.disponibilidad_tipo === 'importacion';
  const isImportCalcReadOnly = readOnly && hasImportCalc;

  const periodoMeses = Math.max(0, Number(itemForm.garantia_meses || 0));
  const costoBaseUnitario = Number(itemForm.costo_base || 0);
  const costoUnitarioCalculado = Number(itemForm.costo_unitario ?? itemForm.costo_base ?? 0);
  const costoAdicionalUnitario = Math.max(0, Number((costoUnitarioCalculado - costoBaseUnitario).toFixed(2)));
  const muestraCostoConAdicionales = costoAdicionalUnitario > 0.009;
  const precioUnitMensual = Number(itemForm.precio_venta || 0);
  const precioCantidadMensual = Number((precioUnitMensual * Number(itemForm.cantidad || 0)).toFixed(2));
  const precioTotalMeses = Number(itemForm.subtotal || 0);
  const costoLabel = `Costo${costoSinIgv ? ' (SIN IGV)' : ''} (${monedaId === 1 ? 'S/.' : '$'})`;

  const field = (label: string, children: React.ReactNode) => (
    <div>
      <label className="block text-[11px] text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );

  const readImageFile = (file: File, callback: (dataUrl: string) => void) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageFile = async (file: File) => {
    // Preview local inmediato
    readImageFile(file, (dataUrl) => {
      setItemForm(prev => ({ ...prev, imagen: dataUrl }));
    });

    // Subir al servidor en segundo plano
    try {
      const formData = new FormData();
      formData.append("imagen", file);
      const res = await api.post("/upload-imagen", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Reemplazar base64 con la URL del servidor
      setItemForm(prev => ({ ...prev, imagen: res.data.url }));
    } catch (error) {
      console.error("Error al subir imagen", error);
      // Si falla, se queda con el base64 como fallback
    }
  };

  const handleDrop: React.DragEventHandler<HTMLLabelElement> = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handlePaste: React.ClipboardEventHandler<HTMLLabelElement> = (event) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith("image/")
    );
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        handleImageFile(file);
      }
    }
  };

  const inp = "w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-400 outline-none bg-white";
  const calcNumber = (value: string | number | null | undefined) => Number(value || 0);
  const calcConfig = {
    under200: {
      label: 'IMPORTACIÓN MENOS DE $200',
      desaduanaje: 25,
      agenteAduanero: 0,
      impuestoRate: 0,
    },
    from201to1999: {
      label: 'IMPORTACIÓN VALOR DE $201 A $1999',
      desaduanaje: 30,
      agenteAduanero: 0,
      impuestoRate: 0.25,
    },
    from2000up: {
      label: 'IMPORTACIÓN VALOR DE $2000 A +',
      desaduanaje: 40,
      agenteAduanero: 300,
      impuestoRate: 0.25,
    },
  }[importCalcType];
  const importCalcValues = (() => {
    const precioProducto = calcNumber(importCalcForm.precioProducto);
    const unidades = Math.max(0, calcNumber(importCalcForm.unidades));
    const pesoTotal = calcNumber(importCalcForm.pesoTotal);
    const totalProducto = precioProducto * unidades;
    const totalPeso = 10 * pesoTotal;
    const totalDesaduanaje = calcConfig.desaduanaje;
    const totalAgente = calcConfig.agenteAduanero;
    const subTotal = totalProducto + totalPeso + totalDesaduanaje + totalAgente;
    const impuesto = subTotal * calcConfig.impuestoRate;
    const total = subTotal + impuesto;
    const precioUnitario = unidades > 0 ? total / unidades : 0;
    const costoAplicable = monedaId === 1
      ? precioUnitario * (tipoCambioDolarASoles || 3.5)
      : precioUnitario;

    return {
      precioProducto,
      unidades,
      pesoTotal,
      totalProducto,
      totalPeso,
      totalDesaduanaje,
      totalAgente,
      subTotal,
      impuesto,
      total,
      precioUnitario,
      costoAplicable,
    };
  })();
  const formatUsd = (value: number) =>
    `$ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const handleOpenImportCalculation = () => {
    if (importCalc) {
      setImportCalcType(importCalc.tipo as ImportacionCalculoTipo);
      setImportCalcForm({
        precioProducto: String(importCalc.precio_producto ?? ''),
        unidades: String(importCalc.unidades ?? itemForm.cantidad ?? 1),
        pesoTotal: String(importCalc.peso_total ?? ''),
      });
    } else {
      setImportCalcForm({
        precioProducto: itemForm.costo_base ? String(itemForm.costo_base) : '',
        unidades: itemForm.cantidad ? String(itemForm.cantidad) : '1',
        pesoTotal: '',
      });
    }

    setImportCalcOpen(true);
  };
  const handleApplyImportCalculation = () => {
    if (readOnly || importCalcValues.precioUnitario <= 0) return;

    const importacionCalculo = {
      tipo: importCalcType,
      label: calcConfig.label,
      precio_producto: Number(importCalcValues.precioProducto.toFixed(2)),
      unidades: importCalcValues.unidades,
      peso_total: Number(importCalcValues.pesoTotal.toFixed(2)),
      costo_peso_kg: 10,
      desaduanaje: calcConfig.desaduanaje,
      agente_aduanero: calcConfig.agenteAduanero,
      impuesto_rate: calcConfig.impuestoRate,
      total_producto: Number(importCalcValues.totalProducto.toFixed(2)),
      total_peso: Number(importCalcValues.totalPeso.toFixed(2)),
      subtotal_importacion: Number(importCalcValues.subTotal.toFixed(2)),
      impuesto: Number(importCalcValues.impuesto.toFixed(2)),
      total_importacion: Number(importCalcValues.total.toFixed(2)),
      precio_unitario_usd: Number(importCalcValues.precioUnitario.toFixed(2)),
      costo_aplicado: Number(importCalcValues.costoAplicable.toFixed(2)),
      moneda_id: monedaId,
      tipo_cambio_usd_soles: monedaId === 1 ? tipoCambioDolarASoles : undefined,
      created_at: new Date().toISOString(),
    };

    setItemForm({
      ...itemForm,
      costo_base: Number(importCalcValues.costoAplicable.toFixed(2)),
      cantidad: importCalcValues.unidades > 0 ? importCalcValues.unidades : itemForm.cantidad,
      disponibilidad_tipo: 'importacion',
      disponibilidad_dias: itemForm.disponibilidad_dias || 25,
      importacion_calculo: importacionCalculo,
    });
    setImportCalcOpen(false);
  };
  const filteredExternalSuggestions = !readOnly && itemForm.tipo === "externo" && itemForm.descripcion.trim()
    ? externalItemSuggestions
      .filter((suggestion) => {
        const search = itemForm.descripcion.trim().toLowerCase();
        return [
          suggestion.descripcion,
          suggestion.codigo,
          suggestion.marca,
          suggestion.proveedor,
        ].some((value) => String(value || "").toLowerCase().includes(search));
      })
      .slice(0, 5)
    : [];
  const proveedores = itemForm.proveedores?.length
    ? itemForm.proveedores
    : [{ nombre: itemForm.proveedor || "", link: itemForm.link_proveedor || "", precio: null, notas: "" }];
  const selectedExternalPlantilla =
    itemForm.plantilla_ultimo_uso_nombre ||
    itemForm.plantilla_origen_nombre ||
    null;
  const solesEquivalent = (value: number) =>
    monedaId === 2 ? Number((Number(value || 0) * (tipoCambioSolesADolar || 1)).toFixed(2)) : null;
  const moneyValue = (
    value: number,
    primaryClass = "text-xs font-semibold text-gray-800",
    secondaryClass = "mt-0.5 text-[10px] leading-none font-semibold text-emerald-600",
  ) => {
    const secondary = solesEquivalent(value);

    return (
      <>
        <p className={primaryClass}>{formatMoney(value, simboloMoneda)}</p>
        {secondary !== null && (
          <p className={secondaryClass}>
            {formatMoney(secondary, "S/")}
          </p>
        )}
      </>
    );
  };
  const summaryEstimado = (
    <div className="space-y-2 border-t border-gray-100 bg-white px-5 py-2.5 shadow-[0_-8px_18px_rgba(15,23,42,0.04)]">
      {muestraCostoConAdicionales && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <span className="font-semibold">Costo usado para margen:</span>{" "}
          {formatMoney(costoUnitarioCalculado, simboloMoneda)} por unidad
          {solesEquivalent(costoUnitarioCalculado) !== null && (
            <span className="font-semibold text-emerald-700"> / {formatMoney(solesEquivalent(costoUnitarioCalculado)!, "S/")}</span>
          )}
          <span className="text-amber-700">
            {" "}({formatMoney(costoBaseUnitario, simboloMoneda)}
            {solesEquivalent(costoBaseUnitario) !== null && ` / ${formatMoney(solesEquivalent(costoBaseUnitario)!, "S/")}`} base + {formatMoney(costoAdicionalUnitario, simboloMoneda)}
            {solesEquivalent(costoAdicionalUnitario) !== null && ` / ${formatMoney(solesEquivalent(costoAdicionalUnitario)!, "S/")}`} adicionales)
          </span>
        </div>
      )}
      {isAlquiler ? (
        <div className={`grid gap-2 ${canViewGanancia ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-[9px] text-gray-500 mb-0.5">Precio Unit Mensual</p>
              {moneyValue(precioUnitMensual)}
            </div>
            <div className="bg-sky-50 rounded-lg p-2">
              <p className="text-[9px] text-gray-500 mb-0.5">Precio Cantidad Mensual</p>
              {moneyValue(precioCantidadMensual)}
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-[9px] text-gray-500 mb-0.5">Precio Total x Meses</p>
              {moneyValue(precioTotalMeses)}
              <p className="mt-0.5 text-[9px] text-gray-500">{periodoMeses || 0} meses</p>
            </div>
          </div>
          {canViewGanancia && (
            <div className="bg-green-50 rounded-lg p-2">
              <p className="text-[9px] text-gray-500 mb-0.5">Ganancia</p>
              {moneyValue(itemForm.ganancia || 0, "text-xs font-semibold text-green-700")}
            </div>
          )}
        </div>
      ) : (
        <div className={`grid gap-2 ${canViewGanancia ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
          <div className="bg-amber-50 rounded-lg p-2">
            <p className="text-[9px] text-gray-500 mb-0.5">Costo unit.</p>
            {moneyValue(costoUnitarioCalculado, "text-xs font-semibold text-amber-800")}
          </div>
          <div className="bg-blue-50 rounded-lg p-2">
            <p className="text-[9px] text-gray-500 mb-0.5">Precio venta</p>
            {moneyValue(itemForm.precio_venta || 0)}
          </div>
          {canViewGanancia && (
            <div className="bg-green-50 rounded-lg p-2">
              <p className="text-[9px] text-gray-500 mb-0.5">Ganancia</p>
              {moneyValue(itemForm.ganancia || 0, "text-xs font-semibold text-green-700")}
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-[9px] text-gray-500 mb-0.5">Subtotal</p>
            {moneyValue(itemForm.subtotal || 0)}
          </div>
        </div>
      )}
    </div>
  );

  const updateProveedor = (
    index: number,
    fieldName: "nombre" | "link" | "precio" | "notas",
    value: string | number | null,
  ) => {
    if (readOnly) return;

    const nextProveedores = proveedores.map((proveedor, proveedorIndex) =>
      proveedorIndex === index
        ? { ...proveedor, [fieldName]: value }
        : proveedor
    );
    const firstProveedor = nextProveedores[0];

    setItemForm({
      ...itemForm,
      proveedores: nextProveedores,
      proveedor: firstProveedor?.nombre || "",
      link_proveedor: firstProveedor?.link || "",
    });
  };

  const addProveedor = () => {
    if (readOnly) return;

    setItemForm({
      ...itemForm,
      proveedores: [...proveedores, { nombre: "", link: "", precio: null, notas: "" }],
    });
  };

  const removeProveedor = (index: number) => {
    if (readOnly) return;

    const nextProveedores = proveedores.filter((_, proveedorIndex) => proveedorIndex !== index);
    const normalizedProveedores = nextProveedores.length
      ? nextProveedores
      : [{ nombre: "", link: "", precio: null, notas: "" }];
    const firstProveedor = normalizedProveedores[0];

    setItemForm({
      ...itemForm,
      proveedores: normalizedProveedores,
      proveedor: firstProveedor?.nombre || "",
      link_proveedor: firstProveedor?.link || "",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">
              {readOnly ? 'Ver ítem' : editingItem ? 'Editar ítem' : 'Agregar ítem'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {itemForm.tipo ?? 'Externo'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 space-y-3 overflow-y-auto flex-1">

          {/* Producto */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Producto</p>
            <div className="space-y-2">
              {field('Descripción',
                <div className="space-y-1">
                  <input className={inp} type="text" value={itemForm.descripcion}
                    disabled={readOnly}
                    onChange={e => setItemForm({ ...itemForm, descripcion: e.target.value })}
                    placeholder="Nombre completo del producto" />
                  {filteredExternalSuggestions.length > 0 && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/60 overflow-hidden">
                      {filteredExternalSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.id}-${suggestion.descripcion}`}
                          type="button"
                          onClick={() => onSelectExternalSuggestion?.(suggestion)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-white transition-colors"
                        >
                          {(suggestion.imagen || suggestion.imagen_url) && (
                            <img
                              src={resolveItemImageUrl(suggestion.imagen_url, suggestion.imagen)}
                              alt=""
                              className="h-8 w-8 rounded border border-gray-200 object-contain bg-white flex-shrink-0"
                            />
                          )}
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-gray-800 truncate">
                              {suggestion.descripcion}
                            </span>
                            <span className="block text-[10px] text-gray-500 truncate">
                              {[suggestion.marca, suggestion.codigo, suggestion.proveedor].filter(Boolean).join(' · ')}
                            </span>
                            {(suggestion.plantilla_ultimo_uso_nombre || suggestion.plantilla_origen_nombre) && (
                              <span className="block text-[10px] font-semibold text-blue-700 truncate">
                                Ultima plantilla: {suggestion.plantilla_ultimo_uso_nombre || suggestion.plantilla_origen_nombre}
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {itemForm.tipo === "externo" && selectedExternalPlantilla && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700">
                  Ultima plantilla: {selectedExternalPlantilla}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[11px] text-gray-500 uppercase mb-1">Imagen</label>
                <label
                  htmlFor="item-imagen"
                  onDragOver={(e: React.DragEvent<HTMLLabelElement>) => e.preventDefault()}
                  onDrop={readOnly ? undefined : handleDrop}
                  onPaste={readOnly ? undefined : handlePaste}
                  className={`group border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-2.5 text-center transition-colors block ${readOnly ? 'cursor-default' : 'cursor-pointer hover:border-blue-400 hover:bg-blue-50'}`}
                >
                  <input
                    id="item-imagen"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={readOnly}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFile(file);
                    }}
                  />

                  {itemForm.imagen ? (
                    <div className="space-y-2">
                      <img
                        src={itemForm.imagen}
                        alt="Vista previa"
                        className="mx-auto h-24 w-auto object-contain rounded-lg border border-gray-200"
                      />
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setItemForm({
                              ...itemForm,
                              imagen: "",
                            });
                          }}
                          className="text-xs text-red-600 hover:underline w-full"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs text-gray-500">
                      <p className="font-medium text-gray-700">Imagen del ítem</p>
                      <p className="text-gray-500">Arrastra, pega o haz clic para cargar</p>
                    </div>
                  )}
                </label>
              </div>
              {field('Nota',
                <textarea className={`${inp} min-h-16 resize-y`} value={itemForm.nota || ''}
                  disabled={readOnly}
                  onChange={e => setItemForm({ ...itemForm, nota: e.target.value })}
                  placeholder="Información adicional opcional para mostrar en la cotización" />
              )}
              <div className="grid grid-cols-3 gap-2">
                {field('Marca',
                  <input className={inp} type="text" value={itemForm.marca || ''}
                    disabled={readOnly}
                    onChange={e => setItemForm({ ...itemForm, marca: e.target.value })}
                    placeholder="Dell" />
                )}
                {field('Código',
                  <input className={inp} type="text" value={itemForm.codigo || ''}
                    disabled={readOnly}
                    onChange={e => setItemForm({ ...itemForm, codigo: e.target.value })}
                    placeholder="XPS-15" />
                )}
                {field('Unidad',
                  <select className={inp} value={itemForm.unidad_medida || 'UND'}
                    disabled={readOnly}
                    onChange={e => setItemForm({ ...itemForm, unidad_medida: e.target.value })}>
                    <option value="UND">UND</option>
                    <option value="KIT">KIT</option>
                    <option value="PAR">PAR</option>
                    <option value="PZA">PZA</option>
                    <option value="SET">SET</option>
                    <option value="CAJA">CAJA</option>
                    <option value="PAQ">PAQ</option>
                    <option value="BOLSA">BOLSA</option>
                    <option value="ROLLO">ROLLO</option>
                    <option value="MTS">MTS</option>
                    <option value="CM">CM</option>
                    <option value="MM">MM</option>
                    <option value="SRV">SRV</option>
                    <option value="HORA">HORA</option>
                    <option value="DIA">DIA</option>
                    <option value="KG">KG</option>
                    <option value="GR">GR</option>
                    <option value="LT">LT</option>
                    <option value="ML">ML</option>
                    <option value="CIENTO">CIENTO</option>
                    <option value="MILES">MILES</option>
                    <option value="DOC">DOC</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          <hr className="border-gray-200 my-2" />

          {/* Precios */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Precios</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {field('Cantidad',
                <input className={inp} type="number" min={1}
                  disabled={readOnly}
                  value={itemForm.cantidad?.toString() ?? ''}
                  onChange={e => setItemForm({ ...itemForm, cantidad: e.target.value ? parseInt(e.target.value) : 0 })} />
              )}
              {field(isAlquiler ? 'Periodo (meses)' : 'Garantía (meses)',
                <input className={inp} type="number" min={0} max={255} step={1}
                  disabled={readOnly}
                  value={itemForm.garantia_meses?.toString() ?? ''}
                  onChange={e => setItemForm({
                    ...itemForm,
                    garantia_meses: e.target.value ? parseInt(e.target.value, 10) : 0
                  })} />
              )}
              {field('Días entrega',
                <input className={inp} type="number"
                  disabled={readOnly}
                  value={itemForm.disponibilidad_dias?.toString() ?? ''}
                  onChange={e => setItemForm({ ...itemForm, disponibilidad_dias: e.target.value ? parseInt(e.target.value) : 0 })} />
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {field(costoLabel,
                <div className="flex gap-1">
                  <input className={`${inp} flex-1`} type="number"
                    disabled={readOnly}
                    value={itemForm.costo_base?.toString() ?? ''}
                    onChange={e => setItemForm({ ...itemForm, costo_base: e.target.value ? parseFloat(e.target.value) : 0 })} />
                  {showImportCalcControls && (
                    <button
                      type="button"
                      onClick={handleOpenImportCalculation}
                      disabled={readOnly && !hasImportCalc}
                      className={`px-1.5 border border-gray-200 rounded text-gray-500 ${hasImportCalc ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'hover:bg-gray-50'} disabled:cursor-not-allowed disabled:opacity-50`}
                      title="Cálculo de importación"
                    >
                      <Calculator className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              {field('Margen %',
                <input className={inp} type="number" step="0.1"
                  disabled={readOnly}
                  value={itemForm.margen?.toString() ?? ''}
                  onChange={e => setItemForm({ ...itemForm, margen: e.target.value ? parseFloat(e.target.value) : 0 })} />
              )}
              {field('Disponibilidad',
                <select className={inp} value={itemForm.disponibilidad_tipo || 'stock'}
                  disabled={readOnly}
                  onChange={e => setItemForm({
                    ...itemForm,
                    disponibilidad_tipo: e.target.value as any,
                    disponibilidad_dias: e.target.value === 'stock' ? 4 : 25,
                  })}>
                  <option value="stock">Stock</option>
                  <option value="importacion">Importación</option>
                </select>
              )}
            </div>
            {showImportCalcControls && hasImportCalc && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Este ítem fue calculado con la calculadora de importación.
              </div>
            )}
          </div>

          {/* Proveedores - solo si es personalizado */}
          {itemForm.tipo === 'externo' && (
            <>
              <hr className="border-gray-200 my-2" />
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Proveedores</p>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={addProveedor}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                      title="Agregar proveedor"
                    >
                      <Plus className="w-3 h-3" />
                      Agregar
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {proveedores.map((proveedor, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-gray-500">Proveedor {index + 1}</span>
                        {!readOnly && proveedores.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeProveedor(index)}
                            className="p-1 rounded-md text-red-500 hover:bg-red-50"
                            title="Quitar proveedor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {field('Proveedor',
                          <input
                            className={inp}
                            type="text"
                            disabled={readOnly}
                            value={proveedor.nombre || ''}
                            onChange={e => updateProveedor(index, "nombre", e.target.value)}
                          />
                        )}
                        {field('Link',
                          <div className="flex gap-1">
                            <input
                              className={`${inp} flex-1`}
                              type="text"
                              disabled={readOnly}
                              value={proveedor.link || ''}
                              placeholder="https://..."
                              onChange={e => updateProveedor(index, "link", e.target.value)}
                            />
                            {proveedor.link && (
                              <button
                                type="button"
                                onClick={() => void navigator.clipboard?.writeText(proveedor.link || '')}
                                className="px-2 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-500"
                                title="Copiar link"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {field(`Precio (${monedaId === 1 ? 'S/.' : '$'})`,
                          <input
                            className={inp}
                            type="number"
                            step="0.01"
                            disabled={readOnly}
                            value={proveedor.precio?.toString() ?? ''}
                            onChange={e => updateProveedor(index, "precio", e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        )}
                        {field('Notas',
                          <input
                            className={inp}
                            type="text"
                            disabled={readOnly}
                            value={proveedor.notas || ''}
                            placeholder="Entrega, stock, contacto..."
                            onChange={e => updateProveedor(index, "notas", e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>

        {summaryEstimado}

        {/* Footer */}
        <div className="flex gap-2 px-5 py-2.5 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            {readOnly ? 'Cerrar' : 'Cancelar'}
          </button>
          {!readOnly && (
            <button onClick={editingItem ? onUpdate : onSave}
              className="flex-1 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {editingItem ? 'Actualizar' : 'Agregar'}
            </button>
          )}
        </div>
      </div>

      {importCalcOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Cálculo de importación</h3>
                <p className="text-xs text-gray-500">
                  {isImportCalcReadOnly ? 'Detalle del cálculo usado en este ítem.' : 'Calcula el costo unitario y aplícalo al ítem.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportCalcOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Tipo de importación
                <select
                  value={importCalcType}
                  onChange={(event) => setImportCalcType(event.target.value as typeof importCalcType)}
                  disabled={isImportCalcReadOnly}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="under200">IMPORTACIÓN MENOS DE $200</option>
                  <option value="from201to1999">IMPORTACIÓN VALOR DE $201 A $1999</option>
                  <option value="from2000up">IMPORTACIÓN VALOR DE $2000 A +</option>
                </select>
              </label>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[34%]" />
                    <col className="w-[22%]" />
                    <col className="w-[22%]" />
                    <col className="w-[22%]" />
                  </colgroup>
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Descripción</th>
                      <th className="px-3 py-2 text-right">Precio</th>
                      <th className="px-3 py-2 text-right">Unitario</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-3 py-2 font-semibold text-gray-700">Precio de producto</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={importCalcForm.precioProducto}
                          disabled={isImportCalcReadOnly}
                          onChange={(event) => setImportCalcForm((current) => ({ ...current, precioProducto: event.target.value }))}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={importCalcForm.unidades}
                          disabled={isImportCalcReadOnly}
                          onChange={(event) => setImportCalcForm((current) => ({ ...current, unidades: event.target.value }))}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatUsd(importCalcValues.totalProducto)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold text-gray-700">Peso x kilo</td>
                      <td className="px-3 py-2 text-right text-gray-700">$ 10.00</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={importCalcForm.pesoTotal}
                          disabled={isImportCalcReadOnly}
                          onChange={(event) => setImportCalcForm((current) => ({ ...current, pesoTotal: event.target.value }))}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatUsd(importCalcValues.totalPeso)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold text-gray-700">Desaduanaje</td>
                      <td className="px-3 py-2 text-right text-gray-700">{formatUsd(calcConfig.desaduanaje)}</td>
                      <td className="px-3 py-2 text-right text-gray-700">1</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatUsd(importCalcValues.totalDesaduanaje)}</td>
                    </tr>
                    {calcConfig.agenteAduanero > 0 && (
                      <tr>
                        <td className="px-3 py-2 font-semibold text-gray-700">Agente aduanero</td>
                        <td className="px-3 py-2 text-right text-gray-700">{formatUsd(calcConfig.agenteAduanero)}</td>
                        <td className="px-3 py-2 text-right text-gray-700">1</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatUsd(importCalcValues.totalAgente)}</td>
                      </tr>
                    )}
                    {calcConfig.impuestoRate > 0 && (
                      <>
                        <tr className="bg-gray-50">
                          <td className="px-3 py-2 font-semibold text-gray-700" colSpan={3}>Sub total</td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">{formatUsd(importCalcValues.subTotal)}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-semibold text-gray-700" colSpan={3}>Impuestos 25%</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatUsd(importCalcValues.impuesto)}</td>
                        </tr>
                      </>
                    )}
                    <tr className="bg-blue-50">
                      <td className="px-3 py-2 font-bold text-blue-900" colSpan={3}>Total importación</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-900">{formatUsd(importCalcValues.total)}</td>
                    </tr>
                    <tr className="bg-emerald-50">
                      <td className="px-3 py-2 font-bold text-emerald-900" colSpan={3}>Precio por unidad</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-900">{formatUsd(importCalcValues.precioUnitario)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-bold text-gray-900" colSpan={3}>Costo a aplicar ({monedaId === 1 ? 'Soles' : 'Dólares'})</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900">
                        {formatMoney(importCalcValues.costoAplicable, simboloMoneda)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                <span>{calcConfig.label}</span>
                <span>{isImportCalcReadOnly ? 'Vista solo lectura.' : 'El resultado se aplicará al costo del ítem.'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setImportCalcOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {isImportCalcReadOnly ? 'Cerrar' : 'Cancelar'}
              </button>
              {!isImportCalcReadOnly && (
                <button
                  type="button"
                  onClick={handleApplyImportCalculation}
                  disabled={importCalcValues.precioUnitario <= 0}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Aplicar al costo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
