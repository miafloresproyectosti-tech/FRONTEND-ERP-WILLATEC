import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Plus, Search, Trash2, X } from "lucide-react";

import {
  createCompra,
  type Compra,
  type CompraModalidad,
  type CompraPayload,
} from "../../services/compra.service";
import { getOcEmitidas, type OcEmitida } from "../../services/ordenCompra.service";
import { createProveedor, getProveedores, type Proveedor } from "../../services/proveedor.service";

export interface CompraDraftItem {
  key: string;
  requerimiento_compra_item_id?: number | null;
  producto_id?: number | null;
  producto_externo_id?: number | null;
  descripcion: string;
  cantidad: number;
  cantidadMaxima?: number;
  costo_unitario_estimado?: number | null;
  moneda_id?: number | null;
  requerimientoNumero?: string;
}

interface CompraFormModalProps {
  open: boolean;
  title?: string;
  initialItems?: CompraDraftItem[];
  onClose: () => void;
  onCreated: (compra: Compra) => void;
}

const monedaOptions = [
  { id: 1, label: "Soles", symbol: "S/" },
  { id: 2, label: "Dolares", symbol: "$" },
];

const today = new Date().toISOString().slice(0, 10);

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const providerMatchesOc = (proveedor?: Proveedor | null, oc?: OcEmitida | null) => {
  if (!proveedor || !oc?.proveedor) return false;

  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  return normalize(proveedor.nombre) === normalize(oc.proveedor);
};

export function CompraFormModal({
  open,
  title = "Nueva compra",
  initialItems = [],
  onClose,
  onCreated,
}: CompraFormModalProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorSearch, setProveedorSearch] = useState("");
  const [proveedorRuc, setProveedorRuc] = useState("");
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
  const [showProveedorOptions, setShowProveedorOptions] = useState(false);
  const [modalidad, setModalidad] = useState<CompraModalidad>("directa");
  const [monedaId, setMonedaId] = useState(1);
  const [fechaCompra, setFechaCompra] = useState(today);
  const [observacion, setObservacion] = useState("");
  const [items, setItems] = useState<CompraDraftItem[]>([]);
  const [ocEmitidas, setOcEmitidas] = useState<OcEmitida[]>([]);
  const [selectedOcId, setSelectedOcId] = useState("");
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [loadingOc, setLoadingOc] = useState(false);
  const [creatingProveedor, setCreatingProveedor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setItems(
      initialItems.length
        ? initialItems.map((item) => ({ ...item }))
        : [
            {
              key: `manual-${Date.now()}`,
              descripcion: "",
              cantidad: 1,
              costo_unitario_estimado: null,
              moneda_id: 1,
            },
          ],
    );
    setProveedorSearch("");
    setProveedorRuc("");
    setSelectedProveedor(null);
    setShowProveedorOptions(false);
    setModalidad("directa");
    setMonedaId(Number(initialItems.find((item) => item.moneda_id)?.moneda_id || 1));
    setFechaCompra(today);
    setObservacion("");
    setOcEmitidas([]);
    setSelectedOcId("");
    setError("");
  }, [initialItems, open]);

  useEffect(() => {
    if (!open || !showProveedorOptions) return;

    let cancelled = false;

    const fetchProveedores = async () => {
      setLoadingProveedores(true);
      try {
        const data = await getProveedores({
          search: proveedorSearch,
          activo: true,
          per_page: 20,
        });
        if (!cancelled) setProveedores(data);
      } catch {
        if (!cancelled) setProveedores([]);
      } finally {
        if (!cancelled) setLoadingProveedores(false);
      }
    };

    const timer = window.setTimeout(fetchProveedores, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, proveedorSearch, showProveedorOptions]);

  useEffect(() => {
    if (!open || modalidad !== "oc_proveedor" || !selectedProveedor) {
      setOcEmitidas([]);
      setSelectedOcId("");
      return;
    }

    let cancelled = false;

    const fetchOc = async () => {
      setLoadingOc(true);
      try {
        const data = await getOcEmitidas({
          proveedor: selectedProveedor.nombre,
          perPage: 100,
        });
        const compatibles = data.data.filter((oc) => providerMatchesOc(selectedProveedor, oc));
        if (!cancelled) setOcEmitidas(compatibles);
      } catch {
        if (!cancelled) setOcEmitidas([]);
      } finally {
        if (!cancelled) setLoadingOc(false);
      }
    };

    void fetchOc();

    return () => {
      cancelled = true;
    };
  }, [modalidad, open, selectedProveedor]);

  const totalEstimado = useMemo(
    () =>
      items.reduce((total, item) => {
        const costo = numberValue(item.costo_unitario_estimado);
        return total + numberValue(item.cantidad) * costo;
      }, 0),
    [items],
  );
  const hasRequirementItems = items.some((item) => Boolean(item.requerimiento_compra_item_id));

  if (!open) return null;

  const updateItem = (key: string, field: keyof CompraDraftItem, value: string | number | null) => {
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const addManualItem = () => {
    setItems((current) => [
      ...current,
      {
        key: `manual-${Date.now()}`,
        descripcion: "",
        cantidad: 1,
        costo_unitario_estimado: null,
        moneda_id: monedaId,
      },
    ]);
  };

  const removeItem = (key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  };

  const handleCreateProveedor = async () => {
    const nombre = proveedorSearch.trim();
    if (!nombre) {
      setError("Escribe el nombre del proveedor para registrarlo.");
      return;
    }

    if (!proveedorRuc.trim()) {
      setError("Ingresa el RUC del proveedor para registrarlo desde la compra.");
      return;
    }

    setCreatingProveedor(true);
    setError("");
    try {
      const proveedor = await createProveedor({
        nombre,
        ruc: proveedorRuc.trim(),
        activo: true,
      });
      setSelectedProveedor(proveedor);
      setProveedorSearch(proveedor.nombre);
      setProveedorRuc("");
      setProveedores((current) => [proveedor, ...current.filter((item) => item.id !== proveedor.id)]);
      setShowProveedorOptions(false);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() ||
          "No se pudo registrar el proveedor.",
      );
    } finally {
      setCreatingProveedor(false);
    }
  };

  const handleSubmit = async () => {
    setError("");

    if (!selectedProveedor) {
      setError("Selecciona un proveedor.");
      return;
    }

    if (modalidad === "oc_proveedor" && !selectedOcId) {
      setError("Selecciona una OC proveedor compatible.");
      return;
    }

    const validItems = items
      .map((item) => ({
        ...item,
        descripcion: item.descripcion.trim(),
        cantidad: numberValue(item.cantidad),
        costo_unitario_estimado:
          item.costo_unitario_estimado === null ||
          item.costo_unitario_estimado === undefined ||
          String(item.costo_unitario_estimado).trim() === ""
            ? null
            : numberValue(item.costo_unitario_estimado),
      }))
      .filter((item) => item.descripcion && item.cantidad > 0);

    if (validItems.length === 0) {
      setError("Agrega al menos un item con descripcion y cantidad.");
      return;
    }

    const compraItems = validItems.flatMap((item) => {
      if (
        item.requerimiento_compra_item_id &&
        item.cantidadMaxima !== undefined &&
        item.cantidad > item.cantidadMaxima + 0.00001
      ) {
        const cantidadRequerimiento = item.cantidadMaxima;
        const cantidadExtra = item.cantidad - item.cantidadMaxima;

        return [
          {
            requerimiento_compra_item_id: item.requerimiento_compra_item_id || null,
            producto_id: item.producto_id || null,
            producto_externo_id: item.producto_externo_id || null,
            descripcion: item.descripcion,
            cantidad: cantidadRequerimiento,
            costo_unitario_estimado: item.costo_unitario_estimado,
            moneda_id: item.moneda_id || monedaId,
          },
          {
            requerimiento_compra_item_id: null,
            producto_id: item.producto_id || null,
            producto_externo_id: item.producto_externo_id || null,
            descripcion: `${item.descripcion} - adicional para stock`,
            cantidad: cantidadExtra,
            costo_unitario_estimado: item.costo_unitario_estimado,
            moneda_id: item.moneda_id || monedaId,
          },
        ];
      }

      return [
        {
          requerimiento_compra_item_id: item.requerimiento_compra_item_id || null,
          producto_id: item.producto_id || null,
          producto_externo_id: item.producto_externo_id || null,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          costo_unitario_estimado: item.costo_unitario_estimado,
          moneda_id: item.moneda_id || monedaId,
        },
      ];
    });

    const payload: CompraPayload = {
      proveedor_id: selectedProveedor.id,
      modalidad,
      oc_emitida_id: modalidad === "oc_proveedor" ? Number(selectedOcId) : null,
      fecha_compra: fechaCompra || null,
      moneda_id: monedaId,
      observacion: observacion.trim() || null,
      items: compraItems,
    };

    setSaving(true);
    try {
      const compra = await createCompra(payload);
      onCreated(compra);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          Object.values(err?.response?.data?.errors || {})?.flat()?.[0]?.toString() ||
          "No se pudo registrar la compra.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">La compra queda en borrador y no ingresa inventario.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Mensaje operativo:</strong> una compra confirmada significa pendiente de recepcion. El stock y Kardex se moveran recien en Fase 5 con recepciones.
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-slate-700">Proveedor</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={selectedProveedor ? selectedProveedor.nombre : proveedorSearch}
                  onFocus={() => setShowProveedorOptions(true)}
                  onChange={(event) => {
                    setSelectedProveedor(null);
                    setProveedorSearch(event.target.value);
                    setShowProveedorOptions(true);
                  }}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Buscar proveedor"
                />
              </div>
              {showProveedorOptions && (
                <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {loadingProveedores && <div className="px-3 py-2 text-sm text-slate-500">Buscando...</div>}
                  {!loadingProveedores &&
                    proveedores.map((proveedor) => (
                      <button
                        key={proveedor.id}
                        type="button"
                        onClick={() => {
                          setSelectedProveedor(proveedor);
                          setProveedorSearch(proveedor.nombre);
                          setProveedorRuc("");
                          setShowProveedorOptions(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                      >
                        <span className="font-semibold text-slate-800">{proveedor.nombre}</span>
                        {proveedor.ruc && <span className="ml-2 text-xs text-slate-500">{proveedor.ruc}</span>}
                      </button>
                    ))}
                  {!loadingProveedores &&
                    proveedorSearch.trim() &&
                    !proveedores.some((proveedor) => proveedor.nombre.trim().toLowerCase() === proveedorSearch.trim().toLowerCase()) && (
                      <div className="space-y-2 border-t border-slate-100 px-3 py-2">
                        <p className="text-xs font-semibold text-slate-600">Crear proveedor "{proveedorSearch.trim()}"</p>
                        <input
                          value={proveedorRuc}
                          onChange={(event) => setProveedorRuc(event.target.value)}
                          placeholder="RUC del proveedor"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCreateProveedor}
                          disabled={creatingProveedor}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                        >
                          {creatingProveedor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={16} />}
                          Crear proveedor
                        </button>
                      </div>
                    )}
                  {!loadingProveedores && proveedores.length === 0 && (
                    <div className="px-3 py-2 text-sm text-slate-500">Sin proveedores encontrados</div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Modalidad</label>
              <select
                value={modalidad}
                onChange={(event) => setModalidad(event.target.value as CompraModalidad)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="directa">Compra directa</option>
                <option value="oc_proveedor">Compra con OC proveedor</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Moneda</label>
              <select
                value={monedaId}
                onChange={(event) => setMonedaId(Number(event.target.value))}
                disabled={hasRequirementItems}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              >
                {monedaOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              {hasRequirementItems && (
                <p className="mt-1 text-xs text-slate-400">Referencial desde la cotizacion. Se regulariza despues.</p>
              )}
            </div>

            {modalidad === "oc_proveedor" && (
              <div className="lg:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700">OC proveedor compatible</label>
                <select
                  value={selectedOcId}
                  onChange={(event) => setSelectedOcId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  disabled={!selectedProveedor || loadingOc}
                >
                  <option value="">{loadingOc ? "Cargando OC..." : "Seleccionar OC"}</option>
                  {ocEmitidas.map((oc) => (
                    <option key={oc.id} value={oc.id}>
                      {oc.numero || `OC #${oc.id}`} - {oc.proveedor}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Fecha</label>
              <input
                type="date"
                value={fechaCompra}
                onChange={(event) => setFechaCompra(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="lg:col-span-4">
              <label className="mb-1 block text-sm font-semibold text-slate-700">Observacion</label>
              <textarea
                value={observacion}
                onChange={(event) => setObservacion(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                rows={2}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="font-semibold text-slate-800">Items</h3>
              <button
                type="button"
                onClick={addManualItem}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                <Plus size={16} />
                Item manual
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="bg-white text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Descripcion</th>
                    <th className="px-4 py-3">Req.</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-right">Costo estimado</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.key}>
                      <td className="px-4 py-3">
                        <input
                          value={item.descripcion}
                          onChange={(event) => updateItem(item.key, "descripcion", event.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          disabled={Boolean(item.requerimiento_compra_item_id)}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.requerimientoNumero || "-"}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.cantidad}
                          onChange={(event) => updateItem(item.key, "cantidad", Number(event.target.value))}
                          className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-right focus:border-blue-500 focus:outline-none"
                        />
                        {item.cantidadMaxima !== undefined && (
                          <div className="mt-1 text-right text-xs text-slate-400">Saldo req. {item.cantidadMaxima}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.costo_unitario_estimado ?? ""}
                          onChange={(event) =>
                            updateItem(
                              item.key,
                              "costo_unitario_estimado",
                              event.target.value === "" ? null : Number(event.target.value),
                            )
                          }
                          disabled={Boolean(item.requerimiento_compra_item_id)}
                          className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-right focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                        />
                        {item.requerimiento_compra_item_id && (
                          <div className="mt-1 text-right text-xs text-slate-400">Automatico desde cotizacion</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {monedaOptions.find((option) => option.id === monedaId)?.symbol}{" "}
                        {(numberValue(item.cantidad) * numberValue(item.costo_unitario_estimado)).toLocaleString("es-PE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          title="Quitar item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            Total estimado:{" "}
            <strong className="text-slate-900">
              {monedaOptions.find((option) => option.id === monedaId)?.symbol}{" "}
              {totalEstimado.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar compra
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
