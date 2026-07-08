import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  Filter,
  Loader2,
  PackageSearch,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  getProductosInventario,
  getInventarioMovimientos,
  registrarEntradaKardex,
  type InventarioMovimiento,
  type InventarioMovimientoFilters,
  type InventarioMovimientoPagination,
  type ProductoInventarioOption,
} from "../services/inventario.service";

const tipoOptions = [
  { value: "", label: "Todos los movimientos" },
  { value: "entrada", label: "Entrada" },
  { value: "salida", label: "Salida" },
  { value: "reserva", label: "Reserva" },
  { value: "liberacion_reserva", label: "Liberacion de reserva" },
  { value: "devolucion", label: "Devolucion" },
  { value: "ajuste_manual", label: "Ajuste manual" },
  { value: "sincronizacion_woocommerce", label: "WooCommerce" },
];

const origenOptions = [
  { value: "", label: "Todos los origenes" },
  { value: "erp", label: "ERP" },
  { value: "ajuste_manual", label: "Ajuste manual" },
  { value: "orden_compra", label: "Orden de compra" },
  { value: "woocommerce", label: "WooCommerce" },
];

const perPageOptions = [15, 25, 50, 100];

const monedaOptions = [
  { id: 1, label: "Soles", symbol: "S/" },
  { id: 2, label: "Dolares", symbol: "$" },
];

const emptyMeta: InventarioMovimientoPagination = {
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
  from: null,
  to: null,
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatNumber = (value: number | string | null | undefined) =>
  Number(value ?? 0).toLocaleString("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const getMoneySymbol = (monedaId?: number | string | null, moneda?: InventarioMovimiento["moneda"]) => {
  if (moneda?.simbolo) return moneda.simbolo;

  const id = Number(monedaId || 1);

  return monedaOptions.find((option) => option.id === id)?.symbol || "S/";
};

const formatMoney = (
  value: number | string | null | undefined,
  monedaId?: number | string | null,
  moneda?: InventarioMovimiento["moneda"],
) =>
  `${getMoneySymbol(monedaId, moneda)} ${Number(value ?? 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const today = new Date().toISOString().slice(0, 10);

const getUserName = (movimiento: InventarioMovimiento) => {
  const user = movimiento.created_by;

  if (!user) return "Sistema";

  const fullName = [user.nombres, user.apellidos].filter(Boolean).join(" ").trim();

  return fullName || user.email || `Usuario #${user.id}`;
};

const getProductLabel = (movimiento: InventarioMovimiento) => {
  const product = movimiento.producto;

  if (!product) return `Producto #${movimiento.producto_id}`;

  return product.nombre || product.sku || product.codigo || `Producto #${product.id}`;
};

const getTipoLabel = (tipo: string) =>
  tipoOptions.find((option) => option.value === tipo)?.label || tipo;

const getTipoBadge = (tipo: string) => {
  if (["entrada", "devolucion", "sincronizacion_woocommerce"].includes(tipo)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (["salida", "reserva"].includes(tipo)) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (tipo === "ajuste_manual") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  return "bg-gray-50 text-gray-700 border-gray-200";
};

export default function InventarioMovimientos() {
  const [movimientos, setMovimientos] = useState<InventarioMovimiento[]>([]);
  const [productos, setProductos] = useState<ProductoInventarioOption[]>([]);
  const [meta, setMeta] = useState<InventarioMovimientoPagination>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [savingEntrada, setSavingEntrada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entradaModalOpen, setEntradaModalOpen] = useState(false);
  const [entradaForm, setEntradaForm] = useState({
    producto_id: "",
    cantidad: "",
    costo_unitario: "",
    moneda_id: "1",
    proveedor: "",
    documento_numero: "",
    fecha_documento: today,
    observacion: "",
  });
  const [factura, setFactura] = useState<File | null>(null);
  const [filters, setFilters] = useState<InventarioMovimientoFilters>({
    page: 1,
    per_page: 15,
    search: "",
    tipo_movimiento: "",
    origen: "",
    created_by: "",
    ip_origen: "",
    date_from: "",
    date_to: "",
  });

  const queryFilters = useMemo(
    () => ({
      ...filters,
      page: filters.page ?? 1,
      per_page: filters.per_page ?? 15,
    }),
    [filters],
  );

  const selectedProducto = useMemo(
    () => productos.find((producto) => producto.id === Number(entradaForm.producto_id)) || null,
    [entradaForm.producto_id, productos],
  );

  const loadMovimientos = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getInventarioMovimientos(queryFilters);
      setMovimientos(response.data);
      setMeta(response.meta);
    } catch (requestError) {
      console.error("Error al cargar movimientos de inventario:", requestError);
      setError("No se pudo cargar movimientos de inventario. Verifica tu sesion o permisos.");
      setMovimientos([]);
      setMeta(emptyMeta);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadMovimientos();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [queryFilters]);

  useEffect(() => {
    getProductosInventario()
      .then(setProductos)
      .catch((requestError) => {
        console.error("Error al cargar productos para Kardex:", requestError);
      });
  }, []);

  const updateFilter = (key: keyof InventarioMovimientoFilters, value: string | number) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === "page" ? Number(value) : 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      per_page: filters.per_page ?? 15,
      search: "",
      tipo_movimiento: "",
      origen: "",
      created_by: "",
      ip_origen: "",
      date_from: "",
      date_to: "",
    });
  };

  const handleEntradaChange = (key: keyof typeof entradaForm, value: string) => {
    setEntradaForm((current) => ({ ...current, [key]: value }));
  };

  const handleProductoEntradaChange = (productoId: string) => {
    const producto = productos.find((item) => item.id === Number(productoId));

    setEntradaForm((current) => ({
      ...current,
      producto_id: productoId,
      moneda_id: String(producto?.moneda_id || current.moneda_id || 1),
    }));
  };

  const handleRegistrarEntrada = async () => {
    const productoId = Number(entradaForm.producto_id);
    const cantidad = Number(entradaForm.cantidad);
    const costoUnitario = Number(entradaForm.costo_unitario);

    if (!productoId || cantidad <= 0 || costoUnitario < 0) {
      setError("Selecciona producto, cantidad y costo unitario validos.");
      return;
    }

    try {
      setSavingEntrada(true);
      setError(null);
      await registrarEntradaKardex({
        producto_id: productoId,
        cantidad,
        costo_unitario: costoUnitario,
        moneda_id: Number(entradaForm.moneda_id || 1),
        proveedor: entradaForm.proveedor,
        documento_tipo: "factura",
        documento_numero: entradaForm.documento_numero,
        fecha_documento: entradaForm.fecha_documento,
        observacion: entradaForm.observacion,
        factura,
      });
      setEntradaModalOpen(false);
      setEntradaForm({
        producto_id: "",
        cantidad: "",
        costo_unitario: "",
        moneda_id: "1",
        proveedor: "",
        documento_numero: "",
        fecha_documento: today,
        observacion: "",
      });
      setFactura(null);
      await loadMovimientos();
      setProductos(await getProductosInventario());
    } catch (requestError) {
      console.error("Error al registrar entrada Kardex:", requestError);
      setError("No se pudo registrar la entrada. Revisa los datos y permisos.");
    } finally {
      setSavingEntrada(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <PackageSearch className="h-8 w-8 text-slate-900" />
            <h1 className="text-3xl font-bold text-slate-900">
              KARDEX
            </h1>
          </div>
          <p className="mt-1 text-slate-500">
            Control valorizado por producto: entradas, salidas, saldo, costo promedio y documentos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEntradaModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <FilePlus2 className="h-4 w-4" />
            Registrar entrada
          </button>
          <button
            onClick={() => void loadMovimientos()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter className="h-4 w-4" />
          Filtros
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-semibold text-gray-500">
            Busqueda
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={filters.search ?? ""}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Producto, SKU, observacion..."
                className="w-full bg-transparent text-sm text-gray-700 outline-none"
              />
            </div>
          </label>

          <label className="text-xs font-semibold text-gray-500">
            Tipo
            <select
              value={filters.tipo_movimiento ?? ""}
              onChange={(event) => updateFilter("tipo_movimiento", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
            >
              {tipoOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-gray-500">
            Origen
            <select
              value={filters.origen ?? ""}
              onChange={(event) => updateFilter("origen", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
            >
              {origenOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-gray-500">
            IP origen
            <input
              value={filters.ip_origen ?? ""}
              onChange={(event) => updateFilter("ip_origen", event.target.value)}
              placeholder="192.168..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
            />
          </label>

          <label className="text-xs font-semibold text-gray-500">
            Usuario ID
            <input
              value={filters.created_by ?? ""}
              onChange={(event) => updateFilter("created_by", event.target.value)}
              placeholder="ID"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
            />
          </label>

          <label className="text-xs font-semibold text-gray-500">
            Desde
            <input
              type="date"
              value={filters.date_from ?? ""}
              onChange={(event) => updateFilter("date_from", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
            />
          </label>

          <label className="text-xs font-semibold text-gray-500">
            Hasta
            <input
              type="date"
              value={filters.date_to ?? ""}
              onChange={(event) => updateFilter("date_to", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
            />
          </label>

          <label className="text-xs font-semibold text-gray-500">
            Filas
            <select
              value={filters.per_page ?? 15}
              onChange={(event) => updateFilter("per_page", Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
            >
              {perPageOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3 text-right">Entrada</th>
                <th className="px-4 py-3 text-right">Salida</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3 text-right">Costo prom.</th>
                <th className="px-4 py-3 text-right">Valor mov.</th>
                <th className="px-4 py-3 text-right">Valor stock</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Observacion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-gray-500">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-600" />
                    Cargando movimientos...
                  </td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-gray-500">
                    No se encontraron movimientos
                  </td>
                </tr>
              ) : (
                movimientos.map((movimiento) => (
                  <tr key={movimiento.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatDate(movimiento.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{getProductLabel(movimiento)}</div>
                      <div className="text-xs text-gray-500">
                        {[movimiento.producto?.sku, movimiento.producto?.codigo]
                          .filter(Boolean)
                          .join(" / ") || `ID ${movimiento.producto_id}`}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${getTipoBadge(movimiento.tipo_movimiento)}`}>
                        {getTipoLabel(movimiento.tipo_movimiento)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-semibold">{movimiento.documento_numero || "-"}</div>
                      <div className="text-xs text-gray-500">
                        {[movimiento.documento_tipo, movimiento.fecha_documento].filter(Boolean).join(" / ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {formatNumber(movimiento.entrada_cantidad)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-700">
                      {formatNumber(movimiento.salida_cantidad)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatNumber(movimiento.saldo_cantidad ?? movimiento.stock_despues)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatMoney(movimiento.costo_promedio_despues ?? movimiento.costo_unitario, movimiento.moneda_id, movimiento.moneda)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatMoney(movimiento.valor_movimiento, movimiento.moneda_id, movimiento.moneda)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatMoney(movimiento.valor_stock_despues, movimiento.moneda_id, movimiento.moneda)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-semibold">{getUserName(movimiento)}</div>
                      {movimiento.created_by?.email && (
                        <div className="text-xs text-gray-500">{movimiento.created_by.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-semibold">{movimiento.origen || "-"}</div>
                      {(movimiento.referencia_tipo || movimiento.referencia_id) && (
                        <div className="text-xs text-gray-500">
                          {[movimiento.referencia_tipo, movimiento.referencia_id].filter(Boolean).join(" #")}
                        </div>
                      )}
                    </td>
                    <td className="max-w-[260px] px-4 py-3 text-gray-600">
                      <span className="line-clamp-2" title={movimiento.observacion || ""}>
                        {[movimiento.proveedor, movimiento.observacion].filter(Boolean).join(" - ") || "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {meta.from ?? 0}-{meta.to ?? 0} de {meta.total}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={meta.current_page <= 1 || loading}
              onClick={() => updateFilter("page", meta.current_page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <span className="text-sm font-semibold text-gray-700">
              {meta.current_page} / {meta.last_page}
            </span>
            <button
              disabled={meta.current_page >= meta.last_page || loading}
              onClick={() => updateFilter("page", meta.current_page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {entradaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900">Registrar entrada Kardex</h2>
              <button
                type="button"
                onClick={() => setEntradaModalOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <label className="text-sm font-semibold text-gray-600 md:col-span-2">
                Producto
                <select
                  value={entradaForm.producto_id}
                  onChange={(event) => handleProductoEntradaChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                >
                  <option value="">Selecciona producto</option>
                  {productos.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre} {producto.sku ? `- ${producto.sku}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedProducto && (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:col-span-2 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Stock actual</p>
                    <p className="text-lg font-bold text-gray-900">{formatNumber(selectedProducto.stock_actual)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Reservado</p>
                    <p className="text-lg font-bold text-amber-700">{formatNumber(selectedProducto.stock_reservado)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Disponible</p>
                    <p className="text-lg font-bold text-emerald-700">{formatNumber(selectedProducto.stock_disponible)}</p>
                  </div>
                </div>
              )}

              <label className="text-sm font-semibold text-gray-600">
                Cantidad
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entradaForm.cantidad}
                  onChange={(event) => handleEntradaChange("cantidad", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                />
              </label>

              <label className="text-sm font-semibold text-gray-600">
                Costo unitario
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entradaForm.costo_unitario}
                  onChange={(event) => handleEntradaChange("costo_unitario", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                />
              </label>

              <label className="text-sm font-semibold text-gray-600">
                Moneda de compra
                <select
                  value={entradaForm.moneda_id}
                  onChange={(event) => handleEntradaChange("moneda_id", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                >
                  {monedaOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} ({option.symbol})
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-gray-600">
                Proveedor
                <input
                  value={entradaForm.proveedor}
                  onChange={(event) => handleEntradaChange("proveedor", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                />
              </label>

              <label className="text-sm font-semibold text-gray-600">
                Numero de factura
                <input
                  value={entradaForm.documento_numero}
                  onChange={(event) => handleEntradaChange("documento_numero", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                />
              </label>

              <label className="text-sm font-semibold text-gray-600">
                Fecha factura
                <input
                  type="date"
                  value={entradaForm.fecha_documento}
                  onChange={(event) => handleEntradaChange("fecha_documento", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                />
              </label>

              <label className="text-sm font-semibold text-gray-600">
                Archivo factura
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <Upload className="h-4 w-4 text-gray-400" />
                  <input
                    type="file"
                    accept=".pdf,.xml,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(event) => setFactura(event.target.files?.[0] ?? null)}
                    className="w-full text-sm"
                  />
                </div>
              </label>

              <label className="text-sm font-semibold text-gray-600 md:col-span-2">
                Observacion
                <textarea
                  value={entradaForm.observacion}
                  onChange={(event) => handleEntradaChange("observacion", event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 p-5">
              <button
                type="button"
                onClick={() => setEntradaModalOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRegistrarEntrada}
                disabled={savingEntrada}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {savingEntrada ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
                Guardar entrada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
