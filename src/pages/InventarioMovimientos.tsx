import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FilePlus2,
  Filter,
  List,
  Loader2,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  getProductosInventario,
  getInventarioMovimientos,
  registrarEntradaKardex,
  registrarSalidaKardex,
  type InventarioMovimiento,
  type InventarioMovimientoFilters,
  type InventarioMovimientoPagination,
  type ProductoInventarioOption,
} from "../services/inventario.service";
import { createProveedor, getProveedores, type Proveedor } from "../services/proveedor.service";
import { createProducto, type ProductoPayload } from "../services/producto.service";
import { normalizeStorageImageUrl } from "../utils/storageImage";

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

const productoCategoriaOptions = [
  { id: 1, label: "LAPTOPS" },
  { id: 2, label: "ACCESORIOS" },
  { id: 3, label: "PERIFERICOS" },
  { id: 4, label: "COMPUTADORAS" },
  { id: 5, label: "LICENCIAS" },
  { id: 6, label: "SERVIDORES" },
  { id: 7, label: "GADGETS" },
  { id: 8, label: "SUMINISTROS" },
  { id: 9, label: "REDES" },
  { id: 10, label: "SEGURIDAD" },
  { id: 11, label: "COMPONENTES" },
  { id: 12, label: "ALMACENAMIENTO" },
  { id: 13, label: "IMPRESORAS" },
];

const estadoProductoOptions = [
  { value: "nuevo", label: "NUEVO" },
  { value: "usado", label: "USADO" },
];

const salidaMotivoOptions = [
  { value: "uso_interno", label: "Uso propio" },
  { value: "merma", label: "Merma" },
  { value: "prestamo", label: "Prestamo" },
  { value: "garantia", label: "Garantia" },
  { value: "otro", label: "Otro" },
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

const formatDateOnly = (value?: string | null) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    : "-";

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

const getDocumentoUrl = (path?: string | null) => normalizeStorageImageUrl(path);

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

const getProveedorLabel = (movimiento: InventarioMovimiento) =>
  movimiento.proveedor_catalogo?.nombre || movimiento.proveedor || "";

const getGarantiaBadge = (movimiento: InventarioMovimiento) => {
  const garantia = movimiento.garantia_info;

  if (!garantia) return null;

  const classes = garantia.vigente
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className="space-y-1">
      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${classes}`}>
        {garantia.vigente ? "En garantia" : "Garantia vencida"}
      </span>
      <div className="text-xs text-gray-500">
        Hasta {formatDateOnly(garantia.fecha_vencimiento)}
      </div>
      {garantia.oc_numero && (
        <div className="text-xs text-gray-500">
          OC {garantia.oc_numero}
        </div>
      )}
    </div>
  );
};

const getDocumentoLink = (movimiento: InventarioMovimiento) => {
  const url = getDocumentoUrl(movimiento.documento_path);

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
      title="Ver factura o documento asociado"
    >
      <Download className="h-3.5 w-3.5" />
      {movimiento.documento_tipo === "factura" ? "Ver factura" : "Ver documento"}
    </a>
  );
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
  const facturaInputRef = useRef<HTMLInputElement | null>(null);
  const salidaDocumentoInputRef = useRef<HTMLInputElement | null>(null);
  const [movimientos, setMovimientos] = useState<InventarioMovimiento[]>([]);
  const [productos, setProductos] = useState<ProductoInventarioOption[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [meta, setMeta] = useState<InventarioMovimientoPagination>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [savingEntrada, setSavingEntrada] = useState(false);
  const [savingSalida, setSavingSalida] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entradaModalOpen, setEntradaModalOpen] = useState(false);
  const [salidaModalOpen, setSalidaModalOpen] = useState(false);
  const [proveedoresModalOpen, setProveedoresModalOpen] = useState(false);
  const [entradaForm, setEntradaForm] = useState({
    producto_id: "",
    cantidad: "",
    costo_unitario: "",
    moneda_id: "1",
    proveedor_id: "",
    proveedor: "",
    documento_numero: "",
    fecha_documento: today,
    observacion: "",
    series_text: "",
  });
  const [factura, setFactura] = useState<File | null>(null);
  const [salidaForm, setSalidaForm] = useState({
    producto_id: "",
    cantidad: "",
    motivo: "uso_interno",
    documento_numero: "",
    fecha_documento: today,
    observacion: "",
  });
  const [salidaSerieIds, setSalidaSerieIds] = useState<number[]>([]);
  const [salidaDocumento, setSalidaDocumento] = useState<File | null>(null);
  const [nuevoProveedor, setNuevoProveedor] = useState({
    nombre: "",
    ruc: "",
  });
  const [proveedorSearch, setProveedorSearch] = useState("");
  const [proveedorResultsOpen, setProveedorResultsOpen] = useState(false);
  const [creatingProveedor, setCreatingProveedor] = useState(false);
  const [showNuevoProveedor, setShowNuevoProveedor] = useState(false);
  const [showNuevoProducto, setShowNuevoProducto] = useState(false);
  const [creatingProducto, setCreatingProducto] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    marca: "",
    modelo: "",
    serie: "",
    factura_numero: "",
    categoria_id: "1",
    estado: "nuevo",
    unidad_medida: "unidad",
  });
  const [filters, setFilters] = useState<InventarioMovimientoFilters>({
    page: 1,
    per_page: 15,
    search: "",
    tipo_movimiento: "",
    origen: "",
    created_by: "",
    ip_origen: "",
    serie: "",
    marca: "",
    modelo: "",
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

  const selectedSalidaProducto = useMemo(
    () => productos.find((producto) => producto.id === Number(salidaForm.producto_id)) || null,
    [salidaForm.producto_id, productos],
  );
  const salidaSeriesDisponibles = useMemo(
    () => (selectedSalidaProducto?.series ?? []).filter((serie) => serie.estado === "disponible" && serie.id),
    [selectedSalidaProducto],
  );
  const salidaRequiereSeries = salidaSeriesDisponibles.length > 0;

  const nextProductoCodigo = useMemo(() => {
    const maxCodigo = productos.reduce((max, producto) => {
      const value = parseInt(String(producto.codigo || producto.sku || ""), 10);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);

    return String(maxCodigo + 1).padStart(4, "0");
  }, [productos]);

  const filteredProveedores = useMemo(() => {
    const term = proveedorSearch.trim().toLowerCase();

    if (!term) return proveedores.slice(0, 8);

    return proveedores
      .filter((proveedor) =>
        [proveedor.nombre, proveedor.ruc, proveedor.contacto, proveedor.correo]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)),
      )
      .slice(0, 8);
  }, [proveedorSearch, proveedores]);

  const proveedoresListado = useMemo(() => {
    const term = proveedorSearch.trim().toLowerCase();

    if (!term) return proveedores;

    return proveedores.filter((proveedor) =>
      [proveedor.nombre, proveedor.ruc, proveedor.contacto, proveedor.correo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [proveedorSearch, proveedores]);

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

  useEffect(() => {
    getProveedores()
      .then(setProveedores)
      .catch((requestError) => {
        console.error("Error al cargar proveedores:", requestError);
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
      serie: "",
      marca: "",
      modelo: "",
      date_from: "",
      date_to: "",
    });
  };

  const handleEntradaChange = (key: keyof typeof entradaForm, value: string) => {
    setEntradaForm((current) => ({ ...current, [key]: value }));
  };

  const handleSalidaChange = (key: keyof typeof salidaForm, value: string) => {
    setSalidaForm((current) => ({ ...current, [key]: value }));
  };

  const handleSalidaProductoChange = (productoId: string) => {
    setSalidaForm((current) => ({ ...current, producto_id: productoId }));
    setSalidaSerieIds([]);
  };

  const toggleSalidaSerie = (serieId: number) => {
    setSalidaSerieIds((current) =>
      current.includes(serieId)
        ? current.filter((id) => id !== serieId)
        : [...current, serieId],
    );
  };

  const handleProductoEntradaChange = (productoId: string) => {
    const producto = productos.find((item) => item.id === Number(productoId));

    setEntradaForm((current) => ({
      ...current,
      producto_id: productoId,
      moneda_id: String(producto?.moneda_id || current.moneda_id || 1),
    }));
  };

  const handleProveedorEntradaChange = (proveedorId: string) => {
    const proveedor = proveedores.find((item) => item.id === Number(proveedorId));

    setEntradaForm((current) => ({
      ...current,
      proveedor_id: proveedorId,
      proveedor: proveedor?.nombre || "",
    }));
    setProveedorSearch(proveedor?.nombre || "");
    setProveedorResultsOpen(false);
  };

  const handleCrearProveedor = async () => {
    const nombre = nuevoProveedor.nombre.trim();

    if (!nombre) {
      setError("Ingresa el nombre del proveedor.");
      return;
    }

    try {
      setCreatingProveedor(true);
      setError(null);
      const proveedor = await createProveedor({
        nombre,
        ruc: nuevoProveedor.ruc.trim() || undefined,
        activo: true,
      });

      setProveedores((current) => [...current, proveedor].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setEntradaForm((current) => ({
        ...current,
        proveedor_id: String(proveedor.id),
        proveedor: proveedor.nombre,
      }));
      setProveedorSearch(proveedor.nombre);
      setNuevoProveedor({ nombre: "", ruc: "" });
      setShowNuevoProveedor(false);
    } catch (requestError) {
      console.error("Error al crear proveedor:", requestError);
      setError("No se pudo registrar el proveedor.");
    } finally {
      setCreatingProveedor(false);
    }
  };

  const handleCrearProductoEntrada = async () => {
    const nombre = nuevoProducto.nombre.trim();

    if (!nombre) {
      setError("Ingresa el nombre del producto nuevo.");
      return;
    }

    try {
      setCreatingProducto(true);
      setError(null);
      const costoEntrada = Number(entradaForm.costo_unitario || 0);
      const payload: ProductoPayload = {
        sku: nextProductoCodigo,
        codigo: nextProductoCodigo,
        nombre,
        marca: nuevoProducto.marca.trim(),
        modelo: nuevoProducto.modelo.trim(),
        serie: nuevoProducto.serie.trim() || undefined,
        factura_numero: nuevoProducto.factura_numero.trim() || undefined,
        descripcion: "",
        precio_referencial: Number.isFinite(costoEntrada) ? costoEntrada : 0,
        unidad_medida: nuevoProducto.unidad_medida,
        activo: true,
        estado: nuevoProducto.estado as "nuevo" | "usado",
        tipo_producto: "stock",
        controla_stock: true,
        stock_actual: 0,
        stock_minimo: 0,
        costo_unitario: Number.isFinite(costoEntrada) ? costoEntrada : 0,
        precio_venta: Number.isFinite(costoEntrada) ? costoEntrada : 0,
        stock: 0,
        categoria_id: Number(nuevoProducto.categoria_id || 1),
      };
      const producto = await createProducto(payload);
      const productosActualizados = await getProductosInventario();

      setProductos(productosActualizados);
      setEntradaForm((current) => ({
        ...current,
        producto_id: String(producto.id),
        moneda_id: String(producto.moneda_id || current.moneda_id || 1),
      }));
      setNuevoProducto({
        nombre: "",
        marca: "",
        modelo: "",
        serie: "",
        factura_numero: "",
        categoria_id: "1",
        estado: "nuevo",
        unidad_medida: "unidad",
      });
      setShowNuevoProducto(false);
    } catch (requestError) {
      console.error("Error al crear producto desde Kardex:", requestError);
      setError("No se pudo crear el producto nuevo.");
    } finally {
      setCreatingProducto(false);
    }
  };

  const handleRegistrarEntrada = async () => {
    const productoId = Number(entradaForm.producto_id);
    const cantidad = Number(entradaForm.cantidad);
    const costoUnitario = Number(entradaForm.costo_unitario);

    if (!productoId || cantidad <= 0 || costoUnitario < 0) {
      setError("Selecciona producto, cantidad y costo unitario validos.");
      return;
    }

    const series = entradaForm.series_text
      .split(/\r?\n/)
      .map((serie) => serie.trim())
      .filter(Boolean);

    if (series.length > cantidad) {
      setError("No puedes registrar mas series que la cantidad ingresada.");
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
        proveedor_id: entradaForm.proveedor_id ? Number(entradaForm.proveedor_id) : null,
        proveedor: entradaForm.proveedor,
        documento_tipo: "factura",
        documento_numero: entradaForm.documento_numero,
        fecha_documento: entradaForm.fecha_documento,
        observacion: entradaForm.observacion,
        series,
        factura,
      });
      setEntradaModalOpen(false);
      setEntradaForm({
        producto_id: "",
        cantidad: "",
        costo_unitario: "",
        moneda_id: "1",
        proveedor_id: "",
        proveedor: "",
        documento_numero: "",
        fecha_documento: today,
        observacion: "",
        series_text: "",
      });
      setFactura(null);
      if (facturaInputRef.current) {
        facturaInputRef.current.value = "";
      }
      setProveedorSearch("");
      await loadMovimientos();
      setProductos(await getProductosInventario());
    } catch (requestError) {
      console.error("Error al registrar entrada Kardex:", requestError);
      setError("No se pudo registrar la entrada. Revisa los datos y permisos.");
    } finally {
      setSavingEntrada(false);
    }
  };

  const handleRegistrarSalida = async () => {
    const productoId = Number(salidaForm.producto_id);
    const cantidad = Number(salidaForm.cantidad);

    if (!productoId || cantidad <= 0) {
      setError("Selecciona producto y cantidad validos para la salida.");
      return;
    }

    if (salidaRequiereSeries) {
      if (!Number.isInteger(cantidad)) {
        setError("Para productos con series, la cantidad de salida debe ser entera.");
        return;
      }

      if (salidaSerieIds.length !== cantidad) {
        setError("Selecciona una serie por cada unidad que sale.");
        return;
      }
    }

    try {
      setSavingSalida(true);
      setError(null);
      await registrarSalidaKardex({
        producto_id: productoId,
        cantidad,
        motivo: salidaForm.motivo,
        moneda_id: Number(selectedSalidaProducto?.moneda_id || 1),
        documento_tipo: salidaForm.documento_numero ? "documento" : undefined,
        documento_numero: salidaForm.documento_numero,
        fecha_documento: salidaForm.fecha_documento,
        observacion: salidaForm.observacion,
        producto_serie_ids: salidaRequiereSeries ? salidaSerieIds : [],
        documento: salidaDocumento,
      });
      setSalidaModalOpen(false);
      setSalidaForm({
        producto_id: "",
        cantidad: "",
        motivo: "uso_interno",
        documento_numero: "",
        fecha_documento: today,
        observacion: "",
      });
      setSalidaSerieIds([]);
      setSalidaDocumento(null);
      if (salidaDocumentoInputRef.current) {
        salidaDocumentoInputRef.current.value = "";
      }
      await loadMovimientos();
      setProductos(await getProductosInventario());
    } catch (requestError) {
      console.error("Error al registrar salida Kardex:", requestError);
      setError("No se pudo registrar la salida. Revisa stock disponible y permisos.");
    } finally {
      setSavingSalida(false);
    }
  };

  const handleRemoveFactura = () => {
    setFactura(null);
    if (facturaInputRef.current) {
      facturaInputRef.current.value = "";
    }
  };

  const handleRemoveSalidaDocumento = () => {
    setSalidaDocumento(null);
    if (salidaDocumentoInputRef.current) {
      salidaDocumentoInputRef.current.value = "";
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
            onClick={() => setProveedoresModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <List className="h-4 w-4" />
            Proveedores
          </button>
          <button
            onClick={() => setSalidaModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-4 w-4 rotate-90" />
            Registrar salida
          </button>
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
            Serie
            <input
              value={filters.serie ?? ""}
              onChange={(event) => updateFilter("serie", event.target.value)}
              placeholder="Buscar serie"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
            />
          </label>

          <label className="text-xs font-semibold text-gray-500">
            Marca
            <input
              value={filters.marca ?? ""}
              onChange={(event) => updateFilter("marca", event.target.value)}
              placeholder="Marca"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
            />
          </label>

          <label className="text-xs font-semibold text-gray-500">
            Modelo
            <input
              value={filters.modelo ?? ""}
              onChange={(event) => updateFilter("modelo", event.target.value)}
              placeholder="Modelo"
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

      {proveedoresModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900">Proveedores registrados</h2>
              <button
                type="button"
                onClick={() => setProveedoresModalOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={proveedorSearch}
                  onChange={(event) => setProveedorSearch(event.target.value)}
                  placeholder="Buscar por nombre, RUC, contacto o correo"
                  className="w-full bg-transparent text-sm text-gray-700 outline-none"
                />
              </div>

              <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3">RUC</th>
                      <th className="px-4 py-3">Contacto</th>
                      <th className="px-4 py-3">Correo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {proveedoresListado.map((proveedor) => (
                      <tr key={proveedor.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{proveedor.nombre}</td>
                        <td className="px-4 py-3 text-gray-700">{proveedor.ruc || "-"}</td>
                        <td className="px-4 py-3 text-gray-700">{proveedor.contacto || proveedor.telefono || "-"}</td>
                        <td className="px-4 py-3 text-gray-700">{proveedor.correo || "-"}</td>
                      </tr>
                    ))}
                    {proveedores.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                          Todavia no hay proveedores registrados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center px-4 py-12 text-gray-500 lg:hidden">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
            Cargando movimientos...
          </div>
        ) : movimientos.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500 lg:hidden">
            No se encontraron movimientos
          </div>
        ) : (
          <div className="grid gap-3 p-4 lg:hidden">
            {movimientos.map((movimiento) => (
              <div key={movimiento.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900">{getProductLabel(movimiento)}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {[movimiento.producto?.sku, movimiento.producto?.codigo]
                        .filter(Boolean)
                        .join(" / ") || `ID ${movimiento.producto_id}`}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{formatDate(movimiento.created_at)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${getTipoBadge(movimiento.tipo_movimiento)}`}>
                    {getTipoLabel(movimiento.tipo_movimiento)}
                  </span>
                </div>

                <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs">
                  <p className="mb-2 font-semibold uppercase text-gray-400">Series</p>
                  <p className="font-medium text-gray-700">
                    {[
                      ...(movimiento.producto_series ?? []),
                      ...(movimiento.producto_serie ? [movimiento.producto_serie] : []),
                    ]
                      .map((serie) => serie.serie)
                      .filter(Boolean)
                      .filter((serie, index, series) => series.indexOf(serie) === index)
                      .slice(0, 4)
                      .join(", ") || "-"}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center text-xs">
                  <div>
                    <p className="text-gray-500">Entrada</p>
                    <p className="font-bold text-emerald-700">{formatNumber(movimiento.entrada_cantidad)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Salida</p>
                    <p className="font-bold text-red-700">{formatNumber(movimiento.salida_cantidad)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Saldo</p>
                    <p className="font-bold text-gray-900">{formatNumber(movimiento.saldo_cantidad ?? movimiento.stock_despues)}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-semibold uppercase text-gray-400">Costo</p>
                    <p className="mt-1 font-bold text-gray-800">{formatMoney(movimiento.costo_promedio_despues ?? movimiento.costo_unitario, movimiento.moneda_id, movimiento.moneda)}</p>
                  </div>
                  <div>
                    <p className="font-semibold uppercase text-gray-400">Movimiento</p>
                    <p className="mt-1 font-bold text-gray-800">{formatMoney(movimiento.valor_movimiento, movimiento.moneda_id, movimiento.moneda)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-semibold uppercase text-gray-400">Documento</p>
                    <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2">
                      <span className="min-w-0 truncate font-medium text-gray-700">
                        {movimiento.documento_numero || "-"}
                      </span>
                      {getDocumentoLink(movimiento)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-600">
                  <div className="flex flex-wrap items-center gap-2">
                    {getGarantiaBadge(movimiento) || <span className="text-gray-400">Sin garantia</span>}
                    <span className="font-semibold text-gray-700">{getUserName(movimiento)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2">
                    {[getProveedorLabel(movimiento), movimiento.observacion].filter(Boolean).join(" - ") || "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Serie</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3 text-right">Cantidades</th>
                <th className="px-4 py-3 text-right">Valores</th>
                <th className="px-4 py-3">Garantia</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Observacion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-600" />
                    Cargando movimientos...
                  </td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
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
                    <td className="px-4 py-3 font-semibold text-gray-700">
                      {[
                        ...(movimiento.producto_series ?? []),
                        ...(movimiento.producto_serie ? [movimiento.producto_serie] : []),
                      ]
                        .map((serie) => serie.serie)
                        .filter(Boolean)
                        .filter((serie, index, series) => series.indexOf(serie) === index)
                        .slice(0, 3)
                        .join(", ") || "-"}
                      {Number(movimiento.producto_series?.length || 0) > 3 && (
                        <span className="ml-1 text-xs text-gray-500">
                          +{Number(movimiento.producto_series?.length || 0) - 3}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${getTipoBadge(movimiento.tipo_movimiento)}`}>
                        {getTipoLabel(movimiento.tipo_movimiento)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="flex items-start gap-2">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <div className="font-semibold">{movimiento.documento_numero || "-"}</div>
                          <div className="text-xs text-gray-500">
                            {[movimiento.documento_tipo, movimiento.fecha_documento].filter(Boolean).join(" / ")}
                          </div>
                          <div className="mt-1">{getDocumentoLink(movimiento)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-end gap-2">
                          <span className="text-gray-500">Entrada</span>
                          <span className="font-semibold text-emerald-700">{formatNumber(movimiento.entrada_cantidad)}</span>
                        </div>
                        <div className="flex justify-end gap-2">
                          <span className="text-gray-500">Salida</span>
                          <span className="font-semibold text-red-700">{formatNumber(movimiento.salida_cantidad)}</span>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-gray-100 pt-1">
                          <span className="text-gray-500">Saldo</span>
                          <span className="font-bold text-gray-900">{formatNumber(movimiento.saldo_cantidad ?? movimiento.stock_despues)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-end gap-2">
                          <span className="text-gray-500">Costo</span>
                          <span className="font-semibold text-gray-700">
                            {formatMoney(movimiento.costo_promedio_despues ?? movimiento.costo_unitario, movimiento.moneda_id, movimiento.moneda)}
                          </span>
                        </div>
                        <div className="flex justify-end gap-2">
                          <span className="text-gray-500">Mov.</span>
                          <span className="font-semibold text-gray-700">
                            {formatMoney(movimiento.valor_movimiento, movimiento.moneda_id, movimiento.moneda)}
                          </span>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-gray-100 pt-1">
                          <span className="text-gray-500">Stock</span>
                          <span className="font-bold text-gray-900">
                            {formatMoney(movimiento.valor_stock_despues, movimiento.moneda_id, movimiento.moneda)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {getGarantiaBadge(movimiento) || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-semibold">{getUserName(movimiento)}</div>
                      {movimiento.created_by?.email && (
                        <div className="text-xs text-gray-500">{movimiento.created_by.email}</div>
                      )}
                    </td>
                    <td className="max-w-[260px] px-4 py-3 text-gray-600">
                      <span className="line-clamp-2" title={movimiento.observacion || ""}>
                        {[getProveedorLabel(movimiento), movimiento.observacion].filter(Boolean).join(" - ") || "-"}
                      </span>
                      <div className="mt-1 text-xs text-gray-400">
                        {[movimiento.origen, movimiento.referencia_tipo, movimiento.referencia_id].filter(Boolean).join(" / ")}
                      </div>
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
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-2xl">
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

            <div className="grid grid-cols-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
              <label className="text-sm font-semibold text-gray-600 md:col-span-2">
                Producto
                <div className="mt-1 flex gap-2">
                  <select
                    value={entradaForm.producto_id}
                    onChange={(event) => handleProductoEntradaChange(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                  >
                    <option value="">Selecciona producto</option>
                    {productos.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} {producto.sku ? `- ${producto.sku}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNuevoProducto((current) => !current)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nuevo
                  </button>
                </div>
              </label>

              {showNuevoProducto && (
                <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-bold text-emerald-900">Nuevo producto interno</h3>
                      <p className="text-xs text-emerald-700">Se crea con stock inicial 0 y luego se registra esta entrada.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      {nextProductoCodigo}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-6">
                    <label className="text-xs font-semibold text-gray-600 sm:col-span-4">
                    Nombre producto
                    <input
                      value={nuevoProducto.nombre}
                      onChange={(event) => setNuevoProducto((current) => ({ ...current, nombre: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
                    />
                    </label>
                    <label className="text-xs font-semibold text-gray-600 sm:col-span-2">
                    Codigo
                    <input
                      value={nextProductoCodigo}
                      disabled
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 outline-none"
                    />
                    </label>
                    <label className="text-xs font-semibold text-gray-600 sm:col-span-3">
                    Categoria
                    <select
                      value={nuevoProducto.categoria_id}
                      onChange={(event) => setNuevoProducto((current) => ({ ...current, categoria_id: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
                    >
                      {productoCategoriaOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    </label>
                    <label className="text-xs font-semibold text-gray-600 sm:col-span-3">
                    Estado
                    <select
                      value={nuevoProducto.estado}
                      onChange={(event) => setNuevoProducto((current) => ({ ...current, estado: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
                    >
                      {estadoProductoOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    </label>
                    <label className="text-xs font-semibold text-gray-600 sm:col-span-3">
                    Marca
                    <input
                      value={nuevoProducto.marca}
                      onChange={(event) => setNuevoProducto((current) => ({ ...current, marca: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
                    />
                    </label>
                    <label className="text-xs font-semibold text-gray-600 sm:col-span-3">
                    Modelo
                    <input
                      value={nuevoProducto.modelo}
                      onChange={(event) => setNuevoProducto((current) => ({ ...current, modelo: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
                    />
                    </label>
                    <label className="text-xs font-semibold text-gray-600 sm:col-span-3">
                    Serie
                    <input
                      value={nuevoProducto.serie}
                      onChange={(event) => setNuevoProducto((current) => ({ ...current, serie: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
                    />
                    </label>
                    <label className="text-xs font-semibold text-gray-600 sm:col-span-3">
                    Numero factura
                    <input
                      value={nuevoProducto.factura_numero}
                      onChange={(event) => setNuevoProducto((current) => ({ ...current, factura_numero: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
                    />
                    </label>
                  </div>

                  <div className="flex justify-end border-t border-gray-100 px-4 py-3">
                    <button
                      type="button"
                      onClick={handleCrearProductoEntrada}
                      disabled={creatingProducto}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {creatingProducto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Crear y seleccionar producto
                    </button>
                  </div>
                </div>
              )}

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
                Costo unitario (sin IGV)
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
                <div className="mt-1 flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      value={proveedorSearch}
                      onChange={(event) => {
                        setProveedorSearch(event.target.value);
                        setEntradaForm((current) => ({
                          ...current,
                          proveedor_id: "",
                          proveedor: event.target.value,
                        }));
                        setProveedorResultsOpen(true);
                      }}
                      onFocus={() => setProveedorResultsOpen(true)}
                      placeholder="Buscar proveedor"
                      className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-700 outline-none"
                    />
                    {proveedorResultsOpen && proveedorSearch.trim() && (
                      <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {filteredProveedores.length > 0 ? (
                          filteredProveedores.map((proveedor) => (
                            <button
                              key={proveedor.id}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                handleProveedorEntradaChange(String(proveedor.id));
                              }}
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              <span className="font-semibold text-gray-800">{proveedor.nombre}</span>
                              {proveedor.ruc && <span className="ml-2 text-xs text-gray-500">{proveedor.ruc}</span>}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">No hay proveedores con esa busqueda</div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNuevoProveedor((current) => !current)}
                    className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Nuevo
                  </button>
                </div>
              </label>

              {showNuevoProveedor && (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 md:col-span-2 sm:grid-cols-[1fr_180px_auto]">
                  <label className="text-xs font-semibold text-gray-600">
                    Nombre proveedor
                    <input
                      value={nuevoProveedor.nombre}
                      onChange={(event) => setNuevoProveedor((current) => ({ ...current, nombre: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
                    />
                  </label>
                  <label className="text-xs font-semibold text-gray-600">
                    RUC
                    <input
                      value={nuevoProveedor.ruc}
                      onChange={(event) => setNuevoProveedor((current) => ({ ...current, ruc: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleCrearProveedor}
                      disabled={creatingProveedor}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                    >
                      {creatingProveedor && <Loader2 className="h-4 w-4 animate-spin" />}
                      Guardar
                    </button>
                  </div>
                </div>
              )}

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
                    ref={facturaInputRef}
                    type="file"
                    accept=".pdf,.xml,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(event) => setFactura(event.target.files?.[0] ?? null)}
                    className="w-full text-sm"
                  />
                </div>
                {factura && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate font-semibold">{factura.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFactura}
                      className="shrink-0 rounded-md p-1 text-blue-700 hover:bg-blue-100"
                      title="Quitar archivo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </label>

              <label className="text-sm font-semibold text-gray-600 md:col-span-2">
                Series ingresadas
                <textarea
                  value={entradaForm.series_text}
                  onChange={(event) => handleEntradaChange("series_text", event.target.value)}
                  rows={4}
                  placeholder="Una serie por linea. Ej: ABC123"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                />
                <span className="mt-1 block text-xs font-normal text-gray-500">
                  Si son varias unidades iguales, registra aqui cada serie fisica. Puede quedar vacio si aun no la tienes.
                </span>
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

      {salidaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Registrar salida Kardex</h2>
                <p className="text-xs text-gray-500">Registra la salida y, si aplica, selecciona las series exactas.</p>
              </div>
              <button
                type="button"
                onClick={() => setSalidaModalOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto px-5 py-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-gray-600 md:col-span-2">
                Producto
                <select
                  value={salidaForm.producto_id}
                  onChange={(event) => handleSalidaProductoChange(event.target.value)}
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

              {selectedSalidaProducto && (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:col-span-2 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Stock actual</p>
                    <p className="text-lg font-bold text-gray-900">{formatNumber(selectedSalidaProducto.stock_actual)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Reservado</p>
                    <p className="text-lg font-bold text-amber-700">{formatNumber(selectedSalidaProducto.stock_reservado)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Disponible</p>
                    <p className="text-lg font-bold text-emerald-700">{formatNumber(selectedSalidaProducto.stock_disponible)}</p>
                  </div>
                </div>
              )}

              {selectedSalidaProducto && salidaRequiereSeries && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3 md:col-span-2">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-blue-900">Series que salen</p>
                      <p className="text-xs text-blue-700">
                        Selecciona {formatNumber(salidaForm.cantidad || 0)} serie(s). Estas series quedaran asociadas al movimiento.
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                      {salidaSerieIds.length}/{Number(salidaForm.cantidad || 0)}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-blue-100 bg-white p-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {salidaSeriesDisponibles.map((serie) => (
                      <label
                        key={serie.id}
                        className="flex min-w-0 cursor-pointer items-start gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm text-gray-700 transition hover:border-blue-200 hover:bg-blue-50"
                      >
                        <input
                          type="checkbox"
                          checked={salidaSerieIds.includes(Number(serie.id))}
                          onChange={() => toggleSalidaSerie(Number(serie.id))}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{serie.serie || `Serie #${serie.id}`}</span>
                          <span className="block truncate text-xs text-gray-500">
                            {[serie.factura_numero ? `Factura ${serie.factura_numero}` : null, serie.fecha_ingreso ? `Ingreso ${formatDateOnly(serie.fecha_ingreso)}` : null]
                              .filter(Boolean)
                              .join(" / ") || "Disponible"}
                          </span>
                        </span>
                      </label>
                    ))}
                    </div>
                    {salidaSeriesDisponibles.length === 0 && (
                      <div className="rounded-lg border border-dashed border-blue-100 bg-blue-50/60 px-3 py-4 text-center text-xs font-semibold text-blue-700">
                        No hay series disponibles para este producto.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <label className="text-sm font-semibold text-gray-600">
                Motivo
                <select
                  value={salidaForm.motivo}
                  onChange={(event) => handleSalidaChange("motivo", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                >
                  {salidaMotivoOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-gray-600">
                Cantidad
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salidaForm.cantidad}
                  onChange={(event) => handleSalidaChange("cantidad", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                />
              </label>

              <label className="text-sm font-semibold text-gray-600">
                Numero documento
                <input
                  value={salidaForm.documento_numero}
                  onChange={(event) => handleSalidaChange("documento_numero", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                />
              </label>

              <label className="text-sm font-semibold text-gray-600">
                Fecha documento
                <input
                  type="date"
                  value={salidaForm.fecha_documento}
                  onChange={(event) => handleSalidaChange("fecha_documento", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                />
              </label>

              <label className="text-sm font-semibold text-gray-600 md:col-span-2">
                Archivo documento
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <Upload className="h-4 w-4 text-gray-400" />
                  <input
                    ref={salidaDocumentoInputRef}
                    type="file"
                    accept=".pdf,.xml,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(event) => setSalidaDocumento(event.target.files?.[0] ?? null)}
                    className="w-full text-sm"
                  />
                </div>
                {salidaDocumento && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate font-semibold">{salidaDocumento.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveSalidaDocumento}
                      className="shrink-0 rounded-md p-1 text-blue-700 hover:bg-blue-100"
                      title="Quitar archivo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </label>

              <label className="text-sm font-semibold text-gray-600 md:col-span-2">
                Observacion
                <textarea
                  value={salidaForm.observacion}
                  onChange={(event) => handleSalidaChange("observacion", event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                />
              </label>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => setSalidaModalOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRegistrarSalida}
                disabled={savingSalida}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {savingSalida ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 rotate-90" />}
                Guardar salida
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
