import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  PackageCheck,
  List,
  Upload,
  Download,
} from "lucide-react";

import { getProductos, getProductosPaginated, getExternalItems, createProducto, updateProducto, deleteProducto, updateCotizacionItem, convertirProductoExternoAInterno, type Producto, type ProductoPayload, type CotizacionItem, type ProductoSerie } from "../services/producto.service";
import {
  getCotizacion,
  getCotizacionesPaginated,
  updateCotizacion,
  type Cotizacion,
} from "../services/cotizacion.service";
import { useNotifications } from "../NotificationContext";
import { useAuth } from "../AuthContext";
import { normalizeStorageImageUrl, resolveItemImageUrl } from "../utils/storageImage";
import { getPaginationItems } from "../utils/pagination";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import PageSizeSelect from "../components/ui/PageSizeSelect";
import { formatMoney } from "../utils/formatNumber";
// import { Plus as PlusIcon } from "lucide-react";

/*
const categoriaOptions = [
  { id: 1, label: "Tecnologia" },
  { id: 2, label: "Hogar" },
  { id: 3, label: "Deportes" },
  { id: 4, label: "Salud" },
  { id: 5, label: "Alimentos y Bebidas" },
  { id: 6, label: "Estanterías/Racks" },
  { id: 7, label: "Repuestos impresoras" },
  { id: 8, label: "Otros" },
];

*/
const unidadMedidaOptions = [
  { value: "unidad", label: "Unidad" },
  { value: "kg", label: "Kg" },
  { value: "m", label: "Metro" },
  { value: "l", label: "Litro" },
];

const productoCategoriaOptions = [
  { id: 1, label: "LAPTOPS" },
  { id: 2, label: "ACCESORIOS" },
  { id: 3, label: "PERIFÉRICOS" },
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

const monedaOptions = [
  { id: 1, label: "Soles", symbol: "S/" },
  { id: 2, label: "Dolares", symbol: "$" },
];

interface ProductoForm {
  id?: number;
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  serie: string;
  series_text: string;
  factura_numero: string;
  categoria_id: number;
  stock: string;
  precio_referencial: string;
  moneda_id: string;
  descripcion: string;
  imagen: string;
  activo: "true" | "false";
  estado: "nuevo" | "usado";
  unidad_medida: string;
}

type ProductoUI = ProductoForm & {
  id: number;
  categoria_label: string;
  precio_referencial: string;
  activo: "true" | "false";
  imagen?: string;
  stock_actual?: number | string | null;
  stock_reservado?: number | string | null;
  stock_disponible?: number | string | null;
  series?: ProductoSerie[];
  moneda?: Producto["moneda"];
};

type ExternalItem = CotizacionItem;

const getProductoCategoriaLabel = (producto: Producto) => {
  const optionLabel = productoCategoriaOptions.find((option) => option.id === Number(producto.categoria_id))?.label;

  return producto.categoria?.nombre || optionLabel || String(producto.categoria_id || "-");
};

const mapProducto = (producto: Producto): ProductoUI => ({

  id: producto.id,
  codigo: producto.codigo || producto.sku || "",
  nombre: producto.nombre,
  marca: producto.marca ?? "",
  modelo: producto.modelo ?? "",
  serie: producto.serie ?? "",
  series_text: (producto.series ?? [])
    .map((serie) => serie.serie)
    .filter(Boolean)
    .join("\n") || producto.serie || "",
  factura_numero: producto.factura_numero ?? "",
  categoria_id: Number(producto.categoria_id || 0),
  categoria_label: getProductoCategoriaLabel(producto),
  stock: String(producto.stock),
  stock_actual: producto.stock_actual ?? producto.stock,
  stock_reservado: producto.stock_reservado ?? 0,
  stock_disponible: producto.stock_disponible ?? producto.stock,
  precio_referencial: String(producto.precio_referencial),
  moneda_id: String(producto.moneda_id || 2),
  moneda: producto.moneda ?? null,
  descripcion: producto.descripcion ?? "",
  imagen: normalizeStorageImageUrl(producto.imagen_url || producto.imagen || producto.imagen_path),
  activo: producto.activo ? "true" : "false",
  estado: producto.estado ?? "nuevo",
  unidad_medida: producto.unidad_medida ?? "unidad",
  series: producto.series ?? [],
});

const getExternalItemCurrencySymbol = (item: ExternalItem) => {
  if (item.moneda?.simbolo) return item.moneda.simbolo;

  const codigo = String(item.moneda?.codigo || "").toUpperCase();
  const monedaId = Number(item.moneda_id || 1);

  if (monedaId === 2 || codigo.includes("USD") || codigo.includes("DOLAR")) {
    return "$";
  }

  return "S/.";
};

const getProductoCurrencySymbol = (item: ProductoUI | Producto) => {
  if (item.moneda?.simbolo) return item.moneda.simbolo;

  const codigo = String(item.moneda?.codigo || "").toUpperCase();
  const monedaId = Number(item.moneda_id || 2);

  if (monedaId === 2 || codigo.includes("USD") || codigo.includes("DOLAR")) {
    return "$";
  }

  return "S/.";
};

const formatProductoMoney = (
  item: ProductoUI | Producto,
  value: number | string | null | undefined
) => formatMoney(value, getProductoCurrencySymbol(item));

const getSerieEstadoBadge = (estado?: string | null) => {
  const normalized = String(estado || "sin_estado").toLowerCase();

  if (normalized === "disponible") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["vendido", "entregado"].includes(normalized)) return "border-blue-200 bg-blue-50 text-blue-700";
  if (["reservado", "en_reserva"].includes(normalized)) return "border-amber-200 bg-amber-50 text-amber-700";
  if (["en_uso", "prestado"].includes(normalized)) return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (["garantia", "en_garantia"].includes(normalized)) return "border-purple-200 bg-purple-50 text-purple-700";
  if (["devuelto", "devolucion"].includes(normalized)) return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (["baja", "merma", "danado", "dañado", "no_disponible", "otro"].includes(normalized)) return "border-red-200 bg-red-50 text-red-700";

  return "border-gray-200 bg-gray-50 text-gray-700";
};

const getSerieEstadoLabel = (estado?: string | null) => {
  const normalized = String(estado || "").toLowerCase();

  if (normalized === "en_uso") return "En uso";
  if (normalized === "no_disponible" || normalized === "otro") return "No disponible";

  return String(estado || "Sin estado")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getSerieSalidaMotivoLabel = (estado?: string | null) => {
  const normalized = String(estado || "").toLowerCase();

  if (normalized === "en_uso") return "Uso interno";
  if (normalized === "prestado") return "Prestamo";
  if (normalized === "garantia") return "Garantia";
  if (["baja", "merma"].includes(normalized)) return "Merma / baja";
  if (normalized === "no_disponible" || normalized === "otro") return "Otro";

  return null;
};

const getExternalItemPricingSuffix = (item: ExternalItem) =>
  Number(item.moneda_id || 1) === 1 && item.precio_incluye_igv ? " incl. IGV" : "";

const formatExternalItemMoney = (
  item: ExternalItem,
  value: number | string | null | undefined
) => `${getExternalItemCurrencySymbol(item)} ${Number(value || 0).toLocaleString()}${getExternalItemPricingSuffix(item)}`;

const PLANTILLA_IDS_CON_IGV = new Set([3, 5]);

const roundMoney = (value: number) => Number(value.toFixed(2));

const plantillaIncluyeIgv = (plantillaId?: number | null) =>
  PLANTILLA_IDS_CON_IGV.has(Number(plantillaId || 0));

const convertExternalItemValue = (
  value: number | string | null | undefined,
  item: ExternalItem,
  targetMonedaId?: number | null,
  targetIncluyeIgv?: boolean
) => {
  const sourceValue = Number(value || 0);
  const sourceMonedaId = Number(item.moneda_id || targetMonedaId || 1);
  const sourceIncluyeIgv = item.precio_incluye_igv ?? false;
  const destinationMonedaId = Number(targetMonedaId || sourceMonedaId);

  if (sourceMonedaId === destinationMonedaId) {
    if (sourceMonedaId === 2 || sourceIncluyeIgv === targetIncluyeIgv) {
      return roundMoney(sourceValue);
    }

    return roundMoney(sourceIncluyeIgv ? sourceValue / 1.18 : sourceValue * 1.18);
  }

  const solesSinIgv =
    sourceMonedaId === 2
      ? sourceValue * 3.5
      : sourceIncluyeIgv
        ? sourceValue / 1.18
        : sourceValue;

  if (destinationMonedaId === 2) {
    return roundMoney(solesSinIgv / 3.3);
  }

  return roundMoney(targetIncluyeIgv ? solesSinIgv * 1.18 : solesSinIgv);
};

export default function Productos() {
  const { addNotification, showToast } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [productos, setProductos] = useState<ProductoUI[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"stock" | "externos">("stock");
  const [productosMeta, setProductosMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
    from: 0,
    to: 0,
  });
  const [externalItems, setExternalItems] = useState<ExternalItem[]>([]);
  const [externalPage, setExternalPage] = useState(1);
  const [externalPerPage, setExternalPerPage] = useState(10);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalMeta, setExternalMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  });
  const [showAddToCotizacionModal, setShowAddToCotizacionModal] = useState(false);
  const [selectedExternalItem, setSelectedExternalItem] = useState<ExternalItem | null>(null);
  const [conversionExternalItem, setConversionExternalItem] = useState<ExternalItem | null>(null);
  const [conversionFactura, setConversionFactura] = useState<File | null>(null);
  const [convertingExternal, setConvertingExternal] = useState(false);
  const [conversionForm, setConversionForm] = useState({
    cantidad: "",
    costo_unitario: "",
    moneda_id: "1",
    documento_numero: "",
    categoria_id: 1,
    estado: "nuevo" as "nuevo" | "usado",
    observacion: "",
  });
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [cotizacionSearchTerm, setCotizacionSearchTerm] = useState("");
  const [loadingCotizaciones, setLoadingCotizaciones] = useState(false);
  const [addingToCotizacion, setAddingToCotizacion] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<ProductoForm>({
      codigo: "",
      nombre: "",
      categoria_id: 1,
      stock: "",
      precio_referencial: "",
      descripcion: "",
      imagen: "",
      activo: "true",
      estado: "nuevo",
      marca: "",
      modelo: "",
      serie: "",
      series_text: "",
      factura_numero: "",
      unidad_medida: "unidad",
      moneda_id: "2",
    });

  const [productoAEliminar, setProductoAEliminar] =
    useState<ProductoUI | null>(null);
  const [productoSeriesModal, setProductoSeriesModal] = useState<ProductoUI | null>(null);
  const [productoDetalleModal, setProductoDetalleModal] = useState<ProductoUI | null>(null);

  // Estados para editar items externos
  const [editingExternalItem, setEditingExternalItem] =
    useState<ExternalItem | null>(null);
  const [showExternalEditModal, setShowExternalEditModal] =
    useState(false);
  const [externalItemForm, setExternalItemForm] = useState({
    descripcion: "",
    cantidad: "",
    marca: "",
    codigo: "",
    unidad_medida: "unidad",
    costo_unitario: 0,
    precio_venta: 0,
    margen: 0,
    disponibilidad_tipo: "stock",
    disponibilidad_dias: "",
    garantia_meses: "",
    proveedor: "",
    link_proveedor: "",
    imagen: "",
    imagen_url: "",
    imagen_path: "",
    stock: "",
    producto_id: "",
  });
  const [savingExternal, setSavingExternal] = useState(false);
  const [exportingProductos, setExportingProductos] = useState(false);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);
  const userRole = String(user?.role || "").toUpperCase();
  const canUseExternalProducts = user?.role !== "SOPORTE" && user?.role !== "LOGISTICA";
  const canManageInternalProducts = userRole !== "VENTAS";

  const isStockTab = activeTab === "stock";
  const cotizacionesFiltradas = cotizaciones.filter((cotizacion) => {
    const search = cotizacionSearchTerm.trim().toLowerCase();
    if (!search) return true;

    return [
      cotizacion.numero,
      cotizacion.titulo,
      cotizacion.cliente_nombre,
      cotizacion.cliente?.nombre,
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });
  const externalItemsFiltrados = externalItems.filter((item) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;

    return [
      item.descripcion,
      item.codigo,
      item.marca,
      item.proveedor,
      item.link_proveedor,
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });
  const tableItems = isStockTab ? productos : externalItemsFiltrados;
  const totalItems = isStockTab
    ? productosMeta.total
    : externalMeta.total;
  const pageNumber = isStockTab ? productosMeta.current_page : externalMeta.current_page;
  const pageCount = isStockTab ? productosMeta.last_page : externalMeta.last_page;
  const paginationItems = getPaginationItems(pageNumber, pageCount);
  const showingFrom = totalItems === 0
    ? 0
    : isStockTab
    ? productosMeta.from
    : (externalMeta.current_page - 1) * externalMeta.per_page + 1;
  const showingTo = totalItems === 0
    ? 0
    : isStockTab
    ? productosMeta.to
    : Math.min(externalMeta.current_page * externalMeta.per_page, totalItems);

  // RESETEAR PAGINA EN BUSQUEDA
  useEffect(() => {
    setCurrentPage(1);
    if (activeTab === "externos") {
      setExternalPage(1);
    }
  }, [searchTerm, activeTab]);

  const fetchProductos = useCallback(async (page = currentPage, search = debouncedSearchTerm) => {
    try {
      setLoading(true);
      const response = await getProductosPaginated({
        page,
        search,
        perPage: itemsPerPage,
      });
      setProductos(response.data.map(mapProducto));
      setProductosMeta({
        current_page: response.current_page,
        last_page: response.last_page,
        total: response.total,
        per_page: response.per_page,
        from: response.from,
        to: response.to,
      });
    } catch (error) {
      console.error(error);
      addNotification({
        title: "Error al cargar productos",
        description: "No se pudo obtener la lista de productos.",
        type: "warning",
        icon: "MessageCircle",
        route: "/productos",
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification, currentPage, debouncedSearchTerm, itemsPerPage]);

  useEffect(() => {
    if (activeTab === "stock") {
      void fetchProductos(currentPage, debouncedSearchTerm);
    }
  }, [activeTab, currentPage, debouncedSearchTerm, fetchProductos]);

  const fetchExternalItems = useCallback(async (page = 1, search = searchTerm, perPage = externalPerPage) => {
    try {
      setExternalLoading(true);
      const response = await getExternalItems(page, search, perPage);
      setExternalItems(response.data.map((item) => item));
      setExternalMeta(response.meta);
    } catch (error) {
      console.error(error);
      addNotification({
        title: "Error al cargar productos externos",
        description:
          "No se pudo obtener la lista de productos externos.",
        type: "warning",
        icon: "MessageCircle",
        route: "/productos",
      });
    } finally {
      setExternalLoading(false);
    }
  }, [addNotification, externalPerPage, searchTerm]);

  useEffect(() => {
    if (activeTab === "externos" && canUseExternalProducts) {
      void fetchExternalItems(externalPage, debouncedSearchTerm, externalPerPage);
    }
  }, [activeTab, externalPage, debouncedSearchTerm, canUseExternalProducts, externalPerPage, fetchExternalItems]);

  const handleTabChange = (tab: "stock" | "externos") => {
    if (tab === "externos" && !canUseExternalProducts) return;

    setActiveTab(tab);
    if (tab === "externos") {
      setExternalPage(1);
    }
  };

  // NUEVO
  const handleNuevo = () => {
    if (!canManageInternalProducts) return;

    setProductoSeleccionado({
      codigo: "",
      nombre: "",
      categoria_id: 1,
      stock: "",
      precio_referencial: "",
      descripcion: "",
      imagen: "",
      activo: "true",
      estado: "nuevo",
      marca: "",
      modelo: "",
      serie: "",
      series_text: "",
      factura_numero: "",
      unidad_medida: "unidad",
      moneda_id: "2",
    });

    setModoEdicion(false);
    setOpenModal(true);
  };

  const handleExportProductosInternos = async () => {
    try {
      setExportingProductos(true);
      const rows = await getProductos();
      const ExcelJS = await import("exceljs");

      const headers = [
        "Codigo",
        "Nombre",
        "Marca",
        "Modelo",
        "Categoria",
        "Estado",
        "Unidad",
        "Moneda",
        "Precio",
        "Stock actual",
        "Stock reservado",
        "Stock disponible",
        "Series",
        "Factura numero",
        "Descripcion",
        "Activo",
      ];

      const getLogoBuffer = async () => {
        try {
          const response = await fetch("/logoWILLATEC-black.png");
          return await response.arrayBuffer();
        } catch (error) {
          console.error("No se pudo cargar el logo para Excel:", error);
          return null;
        }
      };

      const exportRows = rows.map((producto) => {
        const productoUI = mapProducto(producto);
        const moneda = producto.moneda?.simbolo || producto.moneda?.codigo || "";
        const series = (producto.series ?? [])
          .map((serie) => serie.serie)
          .filter(Boolean)
          .join(" | ");

        return {
          categoria: productoUI.categoria_label,
          nombre: productoUI.nombre,
          codigo: productoUI.codigo,
          values: [
          productoUI.codigo,
          productoUI.nombre,
          productoUI.marca,
          productoUI.modelo,
          productoUI.categoria_label,
          productoUI.estado === "usado" ? "Usado" : "Nuevo",
          productoUI.unidad_medida,
          moneda,
          productoUI.precio_referencial,
          productoUI.stock_actual ?? productoUI.stock,
          productoUI.stock_reservado ?? 0,
          productoUI.stock_disponible ?? productoUI.stock,
          series || productoUI.serie,
          productoUI.factura_numero,
          productoUI.descripcion,
          productoUI.activo === "true" ? "Activo" : "Inactivo",
          ],
        };
      }).sort((a, b) => {
        return (
          a.categoria.localeCompare(b.categoria, "es") ||
          a.nombre.localeCompare(b.nombre, "es") ||
          a.codigo.localeCompare(b.codigo, "es")
        );
      });

      const today = new Date().toLocaleDateString("es-PE");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Willatec ERP";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Productos Stock", {
        views: [{ state: "frozen", ySplit: 6 }],
      });

      worksheet.mergeCells("A1:P3");

      const logoBuffer = await getLogoBuffer();
      if (logoBuffer) {
        const logoId = workbook.addImage({
          buffer: logoBuffer,
          extension: "png",
        });
        worksheet.addImage(logoId, {
          tl: { col: 6.3, row: 0.2 },
          ext: { width: 190, height: 58 },
        });
      }

      worksheet.mergeCells("A4:P4");
      worksheet.getCell("A4").value = "PRODUCTOS STOCK";
      worksheet.getCell("A4").font = {
        bold: true,
        size: 18,
        color: { argb: "FF0F172A" },
      };
      worksheet.getCell("A4").alignment = { horizontal: "center" };

      worksheet.mergeCells("A5:P5");
      worksheet.getCell("A5").value = `Inventario interno de productos | Exportado: ${today} | Total: ${exportRows.length}`;
      worksheet.getCell("A5").font = { size: 10, color: { argb: "FF64748B" } };
      worksheet.getCell("A5").alignment = { horizontal: "center" };

      worksheet.addRow([]);
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0F172A" },
        };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
      });

      exportRows.forEach((row, index) => {
        const excelRow = worksheet.addRow(row.values);
        excelRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: index % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC" },
          };
          cell.alignment = { vertical: "top", wrapText: true };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        });
      });

      worksheet.columns = [
        { width: 18 },
        { width: 32 },
        { width: 18 },
        { width: 22 },
        { width: 20 },
        { width: 13 },
        { width: 12 },
        { width: 10 },
        { width: 13 },
        { width: 14 },
        { width: 16 },
        { width: 16 },
        { width: 35 },
        { width: 18 },
        { width: 42 },
        { width: 12 },
      ];
      worksheet.autoFilter = "A7:P7";

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `productos_stock_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      addNotification({
        title: "Error al exportar productos",
        description: "No se pudo generar el archivo de productos internos.",
        type: "warning",
        icon: "MessageCircle",
        route: "/productos",
      });
    } finally {
      setExportingProductos(false);
    }
  };

  // EDITAR
  const handleEditar = (producto: any) => {
    if (!canManageInternalProducts) return;

    setProductoSeleccionado({
      id: producto.id,
      codigo: producto.codigo || "",
      nombre: producto.nombre || "",
      categoria_id: producto.categoria_id || 1,
      stock: String(producto.stock || ""),
      precio_referencial: String(producto.precio_referencial || ""),
      descripcion: producto.descripcion || "",
      imagen: producto.imagen || "", 
      activo: producto.activo ? "true" : "false",
      estado: producto.estado || "nuevo",
      marca: producto.marca || "",
      modelo: producto.modelo || "",
      serie: producto.serie || "",
      series_text: (producto.series || [])
        .map((serie: ProductoSerie) => serie.serie)
        .filter(Boolean)
        .join("\n") || producto.serie || "",
      factura_numero: producto.factura_numero || "",
      unidad_medida: producto.unidad_medida || "unidad",
      moneda_id: String(producto.moneda_id || 2),
    });

    setModoEdicion(true);
    setOpenModal(true);
  };

  // ELIMINAR
  const handleEliminar = (producto: any) => {
    if (!canManageInternalProducts) return;

    setProductoAEliminar(producto);
  };

  // CONFIRMAR ELIMINAR
  const confirmarEliminar = async () => {
    if (!productoAEliminar) return;

    try {
      setSaving(true);
      await deleteProducto(productoAEliminar.id);
      await fetchProductos(currentPage, debouncedSearchTerm);
      addNotification({
        title: "Producto eliminado",
        description: `El producto ${productoAEliminar.nombre} se eliminó correctamente.`,
        type: "success",
        icon: "CheckCircle",
        route: "/productos",
      });
    } catch (error) {
      console.error(error);
      addNotification({
        title: "Error al eliminar producto",
        description: "No se pudo eliminar el producto.",
        type: "warning",
        icon: "MessageCircle",
        route: "/productos",
      });
    } finally {
      setSaving(false);
      setProductoAEliminar(null);
    }
  };

  // GUARDAR
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

  const handleProductImageFile = (file: File) => {
    readImageFile(file, (dataUrl) => {
      setProductoSeleccionado((prev) => ({
        ...prev,
        imagen: dataUrl,
      }));
    });
  };

  const handleProductDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleProductImageFile(file);
    }
  };

  const handleProductPaste = (event: React.ClipboardEvent<HTMLLabelElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find(
      (item) => item.type.startsWith("image/")
    );
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        handleProductImageFile(file);
      }
    }
  };

  const handleGuardar = async () => {
    const stockNum = parseInt(productoSeleccionado.stock, 10);
    const precioNum = parseFloat(productoSeleccionado.precio_referencial);
    const series = productoSeleccionado.series_text
      .split(/\r?\n/)
      .map((serie) => serie.trim())
      .filter(Boolean);

    if (series.length > 0 && !Number.isNaN(stockNum) && series.length > stockNum) {
      addNotification({
        title: "Revisa las series",
        description: "No puedes registrar mas series que la cantidad del producto.",
        type: "warning",
        icon: "MessageCircle",
        route: "/productos",
      });
      return;
    }

    const payload: ProductoPayload = {
      sku: productoSeleccionado.codigo,
      nombre: productoSeleccionado.nombre,
      marca: productoSeleccionado.marca,
      modelo: productoSeleccionado.modelo,
      serie: productoSeleccionado.serie || series[0] || "",
      series,
      factura_numero: productoSeleccionado.factura_numero,
      codigo: productoSeleccionado.codigo,
      descripcion: productoSeleccionado.descripcion || "",
      imagen: productoSeleccionado.imagen || undefined,
      precio_referencial: isNaN(precioNum) ? 0 : precioNum,
      moneda_id: Number(productoSeleccionado.moneda_id || 2),
      unidad_medida:
        productoSeleccionado.unidad_medida || "unidad",
      activo: productoSeleccionado.activo === "true",
      estado: productoSeleccionado.estado,
      tipo_producto: "stock",
      controla_stock: true,
      stock_actual: isNaN(stockNum) ? 0 : stockNum,
      stock_minimo: 0,
      costo_unitario: isNaN(precioNum) ? 0 : precioNum,
      precio_venta: isNaN(precioNum) ? 0 : precioNum,
      stock: isNaN(stockNum) ? 0 : stockNum,
      categoria_id: productoSeleccionado.categoria_id,
    };

    try {
      setSaving(true);

      if (modoEdicion && productoSeleccionado.id) {
        const updated = await updateProducto(
          productoSeleccionado.id,
          payload
        );
        await fetchProductos(currentPage, debouncedSearchTerm);
        addNotification({
          title: "Producto actualizado",
          description: `El producto ${updated.nombre} se actualizó correctamente.`,
          type: "success",
          icon: "CheckCircle",
          route: "/productos",
        });
      } else {
        const created = await createProducto(payload);
        setCurrentPage(1);
        await fetchProductos(1, debouncedSearchTerm);
        addNotification({
          title: "Producto creado",
          description: `El producto ${created.nombre} se creó correctamente.`,
          type: "success",
          icon: "CheckCircle",
          route: "/productos",
        });
      }

      setOpenModal(false);
    } catch (error) {
      console.error(error);
      addNotification({
        title: modoEdicion
          ? "Error al actualizar producto"
          : "Error al crear producto",
        description:
          "Hubo un problema al guardar el producto.",
        type: "warning",
        icon: "MessageCircle",
        route: "/productos",
      });
    } finally {
      setSaving(false);
    }
  };

  // ESTADO
  const handleEstadoChange = (estado: "nuevo" | "usado") => {
    setProductoSeleccionado({
      ...productoSeleccionado,
      estado,
    });
  };

  // BUSQUEDA
  const handleSearch = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearchTerm(e.target.value);
  };

  // AGREGAR ITEM EXTERNO A COTIZACIÓN
  const buildExternalItemForCotizacion = (
    externalItem: ExternalItem,
    targetCotizacion?: Pick<Cotizacion, "moneda_id" | "plantilla_id">
  ) => {
    const targetMonedaId = targetCotizacion?.moneda_id ?? externalItem.moneda_id;
    const targetIncluyeIgv = targetCotizacion
      ? plantillaIncluyeIgv(targetCotizacion.plantilla_id)
      : externalItem.precio_incluye_igv ?? false;
    const costoBase = convertExternalItemValue(
      externalItem.costo_base_referencial || externalItem.costo_base || externalItem.costo_unitario || 0,
      externalItem,
      targetMonedaId,
      targetIncluyeIgv
    );
    const proveedores = externalItem.proveedores?.map((proveedor) => ({
      ...proveedor,
      precio: proveedor.precio === null || proveedor.precio === undefined
        ? null
        : convertExternalItemValue(proveedor.precio, externalItem, targetMonedaId, targetIncluyeIgv),
    }));

    return {
      tipo: externalItem.producto_id ? "catalogo" : "externo",
      producto_externo_id: externalItem.producto_id ? undefined : externalItem.producto_externo_id || externalItem.id,
      producto_id: externalItem.producto_id || undefined,
      descripcion: externalItem.descripcion,
      cantidad: 1,
      costo_base: costoBase,
      margen: 0,
      marca: externalItem.marca,
      codigo: externalItem.codigo,
      unidad_medida: externalItem.unidad_medida,
      disponibilidad_tipo: externalItem.disponibilidad_tipo,
      disponibilidad_dias: externalItem.disponibilidad_dias,
      garantia_meses: externalItem.garantia_meses,
      aplica_costos_adicionales: false,
      proveedor: externalItem.proveedor,
      link_proveedor: externalItem.link_proveedor,
      proveedores,
      imagen: externalItem.imagen || externalItem.imagen_url || "",
      imagen_url: externalItem.imagen_url || externalItem.imagen || null,
      imagen_path: externalItem.imagen_path || externalItem.imagen || null,
      moneda_id: externalItem.moneda_id,
      precio_incluye_igv: externalItem.precio_incluye_igv,
      plantilla_origen_id: externalItem.plantilla_origen_id,
      stock: Number(externalItem.stock || 0),
    };
  };

  const loadCotizacionesForExternalItem = async () => {
    if (!user?.id) {
      setCotizaciones([]);
      return;
    }

    try {
      setLoadingCotizaciones(true);
      const perPage = 100;
      const firstPage = await getCotizacionesPaginated({
        page: 1,
        perPage,
        estadoCotizacionId: 1,
        ejecutivoId: user.id,
      });
      const draftCotizaciones = [...(firstPage.data || [])];

      for (let page = 2; page <= Number(firstPage.last_page || 1); page += 1) {
        const response = await getCotizacionesPaginated({
          page,
          perPage,
          estadoCotizacionId: 1,
          ejecutivoId: user.id,
        });
        draftCotizaciones.push(...(response.data || []));
      }

      setCotizaciones(
        draftCotizaciones.filter(
          (cotizacion) =>
            Number(cotizacion.estado_cotizacion_id) === 1 &&
            Number(cotizacion.user_id) === Number(user.id)
        )
      );
    } catch (error) {
      console.error(error);
      addNotification({
        title: "Error al cargar cotizaciones",
        description: "No se pudo obtener la lista de tus cotizaciones en borrador.",
        type: "warning",
        icon: "MessageCircle",
        route: "/productos",
      });
    } finally {
      setLoadingCotizaciones(false);
    }
  };

  const handleExternalItemImageFile = (file: File) => {
    readImageFile(file, (dataUrl) => {
      setExternalItemForm((prev) => ({
        ...prev,
        imagen: dataUrl,
      }));
    });
  };

  const handleAddExternalItem = (externalItem: ExternalItem) => {
    setSelectedExternalItem(externalItem);
    setCotizacionSearchTerm("");
    setShowAddToCotizacionModal(true);
    void loadCotizacionesForExternalItem();
  };

  const handleOpenConvertExternal = (externalItem: ExternalItem) => {
    if (externalItem.producto_id) {
      addNotification({
        title: "Producto ya convertido",
        description: "Este producto externo ya esta asociado a un producto interno.",
        type: "info",
        icon: "MessageCircle",
        route: "/productos",
      });
      return;
    }

    setConversionExternalItem(externalItem);
    setConversionFactura(null);
    setConversionForm({
      cantidad: String(externalItem.stock && Number(externalItem.stock) > 0 ? externalItem.stock : 1),
      costo_unitario: String(externalItem.costo_base_referencial || externalItem.costo_base || externalItem.costo_unitario || 0),
      moneda_id: String(externalItem.moneda_id || 1),
      documento_numero: "",
      categoria_id: 1,
      estado: "nuevo",
      observacion: "",
    });
  };

  const handleCloseConvertExternal = () => {
    if (convertingExternal) return;
    setConversionExternalItem(null);
    setConversionFactura(null);
  };

  const handleConvertExternal = async () => {
    if (!conversionExternalItem) {
      showToast({
        title: "Producto no seleccionado",
        description: "Vuelve a seleccionar el producto externo que deseas convertir.",
        type: "warning",
      });
      return;
    }

    const cantidad = Number(conversionForm.cantidad);
    const costoUnitario = Number(conversionForm.costo_unitario);
    const missingFields = [
      cantidad > 0 ? null : "cantidad comprada",
      costoUnitario >= 0 ? null : "costo unitario",
      conversionForm.documento_numero.trim() ? null : "numero de factura",
      conversionFactura ? null : "archivo de factura",
    ].filter(Boolean);

    if (missingFields.length > 0) {
      showToast({
        title: "Faltan datos para convertir",
        description: `Completa: ${missingFields.join(", ")}.`,
        type: "warning",
      });
      return;
    }

    const factura = conversionFactura;
    if (!factura) return;

    try {
      setConvertingExternal(true);
      const response = await convertirProductoExternoAInterno(Number(conversionExternalItem.producto_externo_id || conversionExternalItem.id), {
        cantidad,
        costo_unitario: costoUnitario,
        moneda_id: Number(conversionForm.moneda_id || 1),
        documento_numero: conversionForm.documento_numero,
        factura,
        categoria_id: conversionForm.categoria_id,
        estado: conversionForm.estado,
        observacion: conversionForm.observacion,
      });

      addNotification({
        title: "Producto convertido",
        description: response.message || "El producto externo ya esta asociado al inventario interno.",
        type: "success",
        icon: "CheckCircle",
        route: "/productos",
      });
      setConversionExternalItem(null);
      setConversionFactura(null);
      await fetchExternalItems(externalMeta.current_page, debouncedSearchTerm);
      await fetchProductos(currentPage, debouncedSearchTerm);
    } catch (error: any) {
      console.error(error);
      addNotification({
        title: "Error al convertir producto",
        description: error?.response?.data?.message || "No se pudo convertir el producto externo.",
        type: "warning",
        icon: "MessageCircle",
        route: "/productos",
      });
    } finally {
      setConvertingExternal(false);
    }
  };

  const handleCreateCotizacionWithExternalItem = () => {
    if (!selectedExternalItem) return;

    const itemData = buildExternalItemForCotizacion(selectedExternalItem);

    localStorage.setItem("itemToAdd", JSON.stringify(itemData));
    
    addNotification({
      title: "Item preparado",
      description: `Item "${selectedExternalItem.descripcion}" listo para agregar a cotización.`,
      type: "success",
      icon: "CheckCircle",
      route: "/productos",
    });
    setShowAddToCotizacionModal(false);
    navigate("/cotizaciones/new");
  };

  const handleAddExternalItemToCotizacion = async (cotizacionId: number) => {
    if (!selectedExternalItem) return;

    try {
      setAddingToCotizacion(true);
      const cotizacion = await getCotizacion(cotizacionId);
      const itemData = buildExternalItemForCotizacion(selectedExternalItem, cotizacion);
      const items = [
        ...(cotizacion.items || []),
        {
          ...itemData,
          orden: (cotizacion.items || []).length + 1,
        },
      ];

      await updateCotizacion(cotizacionId, {
        ...cotizacion,
        cliente_id: cotizacion.cliente_id,
        plantilla_id: cotizacion.plantilla_id,
        plataforma_id: cotizacion.plataforma_id,
        moneda_id: cotizacion.moneda_id,
        estado_cotizacion_id: cotizacion.estado_cotizacion_id,
        items,
        costos: cotizacion.costosAdicionales || (cotizacion as any).costos_adicionales || [],
        costos_adicionales: cotizacion.costosAdicionales || (cotizacion as any).costos_adicionales || [],
      });

      addNotification({
        title: "Item agregado",
        description: `Item "${selectedExternalItem.descripcion}" agregado a la cotización.`,
        type: "success",
        icon: "CheckCircle",
        route: `/cotizaciones/${cotizacionId}/edit`,
      });
      setShowAddToCotizacionModal(false);
      navigate(`/cotizaciones/${cotizacionId}/edit`);
    } catch (error: any) {
      console.error(error);
      addNotification({
        title: "Error al agregar item",
        description: error?.response?.data?.message || "No se pudo agregar el item a la cotización seleccionada.",
        type: "warning",
        icon: "MessageCircle",
        route: "/productos",
      });
    } finally {
      setAddingToCotizacion(false);
    }
  };

  const resetExternalItemForm = () => {
    setExternalItemForm({
      descripcion: "",
      cantidad: "",
      marca: "",
      codigo: "",
      unidad_medida: "unidad",
      costo_unitario: 0,
      precio_venta: 0,
      margen: 0,
      disponibilidad_tipo: "stock",
      disponibilidad_dias: "",
      garantia_meses: "",
      proveedor: "",
      link_proveedor: "",
      imagen: "",
      imagen_url: "",
      imagen_path: "",
      stock: "",
      producto_id: "",
    });
  };

  const handleOpenExternalEditModal = (item: ExternalItem) => {
    addNotification({
      title: "Catálogo externo",
      description: "La edición directa de productos externos aún no está disponible.",
      type: "warning",
      icon: "MessageCircle",
      route: "/productos",
    });
    return;

    setEditingExternalItem(item);
    setExternalItemForm({
      descripcion: item.descripcion || "",
      cantidad: String(item.cantidad || ""),
      marca: item.marca || "",
      codigo: item.codigo || "",
      unidad_medida: item.unidad_medida || "unidad",
      costo_unitario: item.costo_unitario || 0,
      precio_venta: item.precio_venta || 0,
      margen: item.margen || 0,
      disponibilidad_tipo: item.disponibilidad_tipo || "stock",
      disponibilidad_dias: String(item.disponibilidad_dias || ""),
      garantia_meses: String(item.garantia_meses || ""),
      proveedor: item.proveedor || "",
      link_proveedor: item.link_proveedor || "",
      imagen: item.imagen || item.imagen_url || "",
      imagen_url: item.imagen_url || item.imagen || "",
      imagen_path: item.imagen_path || item.imagen || "",
      stock: String(item.stock ?? ""),
      producto_id: item.producto_id ? String(item.producto_id) : "",
    });
    setShowExternalEditModal(true);
  };

  const handleCloseExternalEditModal = () => {
    setShowExternalEditModal(false);
    setEditingExternalItem(null);
    resetExternalItemForm();
  };

  const handleSaveExternalItem = async () => {
    if (!editingExternalItem) return;

    try {
      setSavingExternal(true);
      const payload: Partial<CotizacionItem> = {
        descripcion: externalItemForm.descripcion,
        cantidad: parseInt(externalItemForm.cantidad, 10) || 0,
        costo_base: externalItemForm.costo_unitario || 0,
        margen: externalItemForm.margen || 0,
        disponibilidad_tipo: externalItemForm.disponibilidad_tipo,
        disponibilidad_dias: externalItemForm.disponibilidad_dias
          ? parseInt(externalItemForm.disponibilidad_dias, 10)
          : undefined,
        garantia_meses: externalItemForm.garantia_meses
          ? parseInt(externalItemForm.garantia_meses, 10)
          : undefined,
        producto_id: externalItemForm.producto_id
          ? Number(externalItemForm.producto_id)
          : undefined,
        marca: externalItemForm.marca,
        codigo: externalItemForm.codigo,
        unidad_medida: externalItemForm.unidad_medida,
        proveedor: externalItemForm.proveedor,
        link_proveedor: externalItemForm.link_proveedor,
        imagen: externalItemForm.imagen?.startsWith("data:")
          ? externalItemForm.imagen
          : undefined,
        stock: externalItemForm.stock
          ? parseInt(externalItemForm.stock, 10)
          : undefined,
      };

      await updateCotizacionItem(editingExternalItem.id, payload);
      await fetchExternalItems(externalMeta.current_page);

      addNotification({
        title: "Item externo actualizado",
        description: `El item "${externalItemForm.descripcion}" se actualizó correctamente.`,
        type: "success",
        icon: "CheckCircle",
        route: "/productos",
      });
      handleCloseExternalEditModal();
    } catch (error) {
      console.error(error);
      addNotification({
        title: "Error al actualizar item externo",
        description: "No se pudo actualizar el item externo.",
        type: "warning",
        icon: "MessageCircle",
        route: "/productos",
      });
    } finally {
      setSavingExternal(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4 p-3 sm:space-y-6 sm:p-6">
      {/* HEADER */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <button
              onClick={() => handleTabChange("stock")}
              className={`px-5 py-3 rounded-2xl transition-all duration-200 font-semibold ${
                isStockTab
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Productos Stock
            </button>

            {canUseExternalProducts && (
              <button
                onClick={() => handleTabChange("externos")}
                className={`px-5 py-3 rounded-2xl transition-all duration-200 font-semibold ${
                  !isStockTab
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Productos Externos
              </button>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
            {isStockTab ? "Productos Stock" : "Productos Externos"}
          </h1>

          <p className="text-gray-500 mt-1">
            {isStockTab
              ? `Gestión de productos del sistema (${productosMeta.total} total)`
              : `Catálogo de productos externos (${externalMeta.total} total)`}
          </p>
        </div>

        {isStockTab && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportProductosInternos}
              disabled={exportingProductos}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
              title="Descargar productos internos"
            >
              {exportingProductos ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Download size={20} />
              )}
              <span className="hidden sm:inline">
                {exportingProductos ? "Descargando..." : "Descargar Excel"}
              </span>
            </button>

            {canManageInternalProducts && (
              <button
                onClick={handleNuevo}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
                title="Nuevo Producto"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Nuevo Producto</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* BUSCADOR */}
      {(isStockTab || activeTab === "externos") && (
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-5">
          <div className="flex w-full min-w-0 items-center gap-3 rounded-2xl bg-gray-100 px-4 py-3 md:w-96">
            <Search
              size={18}
              className="text-gray-500 flex-shrink-0"
            />

            <input
              type="text"
              placeholder={
                isStockTab
                  ? "Buscar producto por nombre, código o categoría..."
                  : "Buscar externo por nombre, código, marca o proveedor..."
              }
              value={searchTerm}
              onChange={handleSearch}
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>
        </div>
      )}

      {/* TABLA */}
      <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:rounded-3xl">
        {(isStockTab ? loading : externalLoading) ? (
          <div className="flex items-center justify-center gap-3 px-6 py-12 text-gray-500 xl:hidden">
            <Loader2 className="animate-spin" size={18} />
            Cargando productos...
          </div>
        ) : tableItems.length > 0 ? (
          <div className="grid min-w-0 gap-3 p-3 sm:p-4 xl:hidden">
            {tableItems.map((item: any) => {
              const itemImage = resolveItemImageUrl(item.imagen_url, item.imagen);

              return (
                <div key={item.id ?? item.codigo ?? JSON.stringify(item)} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className="flex items-start gap-3">
                    {itemImage && (
                      <img
                        src={itemImage}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-xl border border-gray-200 bg-white object-contain"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-gray-900">{isStockTab ? item.nombre : item.descripcion}</h3>
                      <p className="truncate text-sm text-gray-500">#{item.codigo || "Sin codigo"}</p>
                      {isStockTab ? (
                        (item.marca || item.modelo) && (
                          <p className="truncate text-xs text-gray-500">{[item.marca, item.modelo].filter(Boolean).join(" / ")}</p>
                        )
                      ) : (
                        <>
                          {item.marca && <p className="truncate text-xs text-gray-500">{item.marca}</p>}
                          {(item.plantilla_ultimo_uso_nombre || item.plantilla_origen_nombre) && (
                            <p className="truncate text-[11px] font-semibold text-blue-700">
                              Ultima plantilla: {item.plantilla_ultimo_uso_nombre || item.plantilla_origen_nombre}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {isStockTab && (
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        item.estado === "usado"
                          ? "border-amber-200 bg-amber-100 text-amber-700"
                          : "border-green-200 bg-green-100 text-green-700"
                      }`}>
                        {item.estado === "usado" ? "Usado" : "Nuevo"}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 text-sm">
                    {isStockTab ? (
                      <>
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-400">Categoria</p>
                          <p className="mt-1 font-medium text-gray-700">{item.categoria_label}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-400">Precio</p>
                          <p className="mt-1 font-bold text-gray-900">{formatProductoMoney(item, item.precio_referencial || "0")}</p>
                        </div>
                        <div className="col-span-2 min-w-0 rounded-xl bg-gray-50 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Stock real</p>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="min-w-0">
                              <p className="text-gray-500">Actual</p>
                              <p className="font-bold text-gray-900">{Number(item.stock_actual ?? item.stock ?? 0).toLocaleString()}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-gray-500">Reservado</p>
                              <p className="font-bold text-amber-700">{Number(item.stock_reservado ?? 0).toLocaleString()}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-gray-500">Disponible</p>
                              <p className="font-bold text-emerald-700">{Number(item.stock_disponible ?? item.stock ?? 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-400">Costo unit.</p>
                          <p className="mt-1 font-bold text-gray-900">
                            {formatExternalItemMoney(item, item.costo_base_referencial || item.costo_base || item.costo_unitario || "0")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-400">Precio venta</p>
                          <p className="mt-1 font-bold text-gray-900">
                            {formatExternalItemMoney(item, item.ultimo_precio_venta || item.precio_venta || "0")}
                          </p>
                        </div>
                        <div className="col-span-2 min-w-0 rounded-xl bg-gray-50 p-3 text-xs">
                          {item.producto_id ? (
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div>
                                <p className="text-gray-500">Actual</p>
                                <p className="font-bold text-gray-900">{Number(item.producto?.stock_actual ?? 0).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Reservado</p>
                                <p className="font-bold text-amber-700">{Number(item.producto?.stock_reservado ?? 0).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Disponible</p>
                                <p className="font-bold text-emerald-700">{Number(item.producto?.stock_disponible ?? 0).toLocaleString()}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="font-medium text-gray-700">Stock: {Number(item.stock || 0).toLocaleString()}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {isStockTab && (item.series?.length || item.serie) && (
                    <button
                      type="button"
                      onClick={() => setProductoSeriesModal(item)}
                      className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <List size={16} />
                      Ver series ({item.series?.length || 1})
                    </button>
                  )}

                  <div className="mt-4 border-t border-gray-100 pt-3">
                    {isStockTab ? (
                      canManageInternalProducts ? (
                        <div className="grid grid-cols-[minmax(0,1fr)_3rem] gap-2 sm:grid-cols-2">
                          <button
                            onClick={() => handleEditar(item)}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-100 text-sm font-semibold text-blue-700 hover:bg-blue-200"
                          >
                            <Pencil size={16} />
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(item)}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-100 text-sm font-semibold text-red-700 hover:bg-red-200"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                            <span className="hidden sm:inline">Eliminar</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setProductoDetalleModal(item)}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                          title="Ver detalle del producto"
                        >
                          <Eye size={16} />
                          Ver detalle
                        </button>
                      )
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleOpenExternalEditModal(item)}
                          className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200"
                          title="Editar Item Externo"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleAddExternalItem(item)}
                          className="inline-flex h-11 items-center justify-center rounded-xl bg-gray-100 text-blue-700 hover:bg-blue-200"
                          title="Agregar item a cotizacion"
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenConvertExternal(item)}
                          disabled={Boolean(item.producto_id)}
                          className={`inline-flex h-11 items-center justify-center rounded-xl ${
                            item.producto_id
                              ? "cursor-not-allowed bg-gray-100 text-gray-400"
                              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          }`}
                          title={item.producto_id ? "Ya convertido a producto interno" : "Convertir a producto interno"}
                        >
                          <PackageCheck size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500 xl:hidden">
            {isStockTab
              ? searchTerm
                ? "No se encontraron productos"
                : "No hay productos"
              : "No hay productos externos"}
          </div>
        )}

        <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[1160px] table-fixed">
          <colgroup>
            {isStockTab ? (
              <>
                <col className="w-[24%]" />
                <col className="w-[11%]" />
                <col className="w-[16%]" />
                <col className="w-[10%]" />
                <col className="w-[19%]" />
                <col className="w-[9%]" />
                <col className="w-[11%]" />
              </>
            ) : (
              <>
                <col className="w-[30%]" />
                <col className="w-[10%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
              </>
            )}
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {isStockTab ? (
                <>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Producto
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Categoría
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Stock real
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Precio
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Descripción
                  </th>
                  <th className="text-left px-4 py-4 text-sm font-semibold text-gray-600">
                    Estado
                  </th>
                  <th className="bg-gray-50 text-center px-3 py-4 text-sm font-semibold text-gray-600">
                    Acciones
                  </th>
                </>
              ) : (
                <>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Descripción
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Marca
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Código
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Stock interno
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Costo Unit.
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Precio Venta
                  </th>
                  <th className="bg-gray-50 text-center px-3 py-4 text-sm font-semibold text-gray-600">
                    Acciones
                  </th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {(isStockTab ? loading : externalLoading) ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="animate-spin" size={18} />
                    Cargando productos...
                  </div>
                </td>
              </tr>
            ) : tableItems.length > 0 ? (
              tableItems.map((item: any) => {
                const itemImage = resolveItemImageUrl(item.imagen_url, item.imagen);

                return (
                  <tr
                    key={item.id ?? item.codigo ?? JSON.stringify(item)}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-200"
                  >
                  {isStockTab ? (
                    <>
                      <td className="px-6 py-5 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          {itemImage && (
                            <img
                              src={itemImage}
                              alt=""
                              className="w-8 h-8 rounded border border-gray-200 object-contain bg-white flex-shrink-0"
                              loading="lazy"
                            />
                          )}
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-800 truncate">
                              {item.nombre}
                            </h3>
                            <p className="text-sm text-gray-500 truncate">
                              #{item.codigo}
                            </p>
                            {(item.marca || item.modelo) && (
                              <p className="text-xs text-gray-500 truncate">
                                {[item.marca, item.modelo].filter(Boolean).join(" / ")}
                              </p>
                            )}
                            {(item.series?.length || item.serie) && (
                              <button
                                type="button"
                                onClick={() => setProductoSeriesModal(item)}
                                className="mt-1 inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                <List size={12} />
                                Series {item.series?.length || 1}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-gray-600">
                        {item.categoria_label}
                      </td>
                      <td className="px-6 py-5 text-gray-600">
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-500">Actual</span>
                            <span className="font-semibold text-gray-900">{Number(item.stock_actual ?? item.stock ?? 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-500">Reservado</span>
                            <span className="font-semibold text-amber-700">{Number(item.stock_reservado ?? 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-500">Disponible</span>
                            <span className="font-semibold text-emerald-700">{Number(item.stock_disponible ?? item.stock ?? 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-semibold text-gray-800">
                        {formatProductoMoney(item, item.precio_referencial || "0")}
                      </td>
                      <td className="px-6 py-5 text-gray-600">
                        {item.descripcion || "Sin descripción"}
                      </td>
                      <td className="px-4 py-5">
                        <span
                          className={`inline-flex whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${
                            item.estado === "usado"
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-green-100 text-green-700 border border-green-200"
                          }`}
                        >
                          {item.estado === "usado" ? "Usado" : "Nuevo"}
                        </span>
                      </td>
                      <td className="bg-white px-3 py-5">
                        {canManageInternalProducts ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() =>
                                handleEditar(item)
                              }
                              className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-all duration-200 hover:scale-105 shadow-sm"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() =>
                                handleEliminar(item)
                              }
                              className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-all duration-200 hover:scale-105 shadow-sm"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setProductoDetalleModal(item)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow-sm transition hover:bg-slate-200 hover:scale-105"
                              title="Ver detalle del producto"
                            >
                              <Eye size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 min-w-0">
                          {itemImage && (
                            <img
                              src={itemImage}
                              alt=""
                              className="w-8 h-8 rounded border border-gray-200 object-contain bg-white flex-shrink-0"
                              loading="lazy"
                            />
                          )}
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-gray-800" title={item.descripcion}>
                              {item.descripcion}
                            </h3>
                            {(item.plantilla_ultimo_uso_nombre || item.plantilla_origen_nombre) && (
                              <p className="truncate text-[11px] font-semibold text-blue-700">
                                Ultima plantilla: {item.plantilla_ultimo_uso_nombre || item.plantilla_origen_nombre}
                              </p>
                            )}
                            {item.producto_id && (
                              <p className="truncate text-[11px] font-semibold text-emerald-700">
                                Asociado a inventario #{item.producto_id}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-gray-600">
                        <span className="block truncate" title={item.marca || "N/A"}>
                          {item.marca || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-gray-600">
                        <span className="block truncate" title={item.codigo}>
                          {item.codigo}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-gray-600">
                        {item.producto_id ? (
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between gap-2">
                              <span className="text-gray-500">Actual</span>
                              <span className="font-semibold text-gray-900">
                                {Number(item.producto?.stock_actual ?? 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-gray-500">Reservado</span>
                              <span className="font-semibold text-amber-700">
                                {Number(item.producto?.stock_reservado ?? 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-gray-500">Disponible</span>
                              <span className="font-semibold text-emerald-700">
                                {Number(item.producto?.stock_disponible ?? 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="font-medium">{Number(item.stock || 0).toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-6 py-5 font-semibold text-gray-800">
                        {formatExternalItemMoney(
                          item,
                          item.costo_base_referencial || item.costo_base || item.costo_unitario || "0"
                        )}
                      </td>
                      <td className="px-6 py-5 font-semibold text-gray-800">
                        <span className="block truncate" title={formatExternalItemMoney(item, item.ultimo_precio_venta || item.precio_venta || "0")}>
                          {formatExternalItemMoney(
                            item,
                            item.ultimo_precio_venta || item.precio_venta || "0"
                          )}
                        </span>
                      </td>
                      <td className="bg-white px-3 py-5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() =>
                              handleOpenExternalEditModal(item)
                            }
                            className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-all duration-200 hover:scale-105 shadow-sm"
                            title="Editar Item Externo"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleAddExternalItem(item)}
                            className="w-9 h-9 rounded-xl bg-gray-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-all duration-200 hover:scale-105 shadow-sm"
                            title="Agregar item a cotización"
                          >
                            <Plus size={18} />
                          </button>
                          <button
                            onClick={() => handleOpenConvertExternal(item)}
                            disabled={Boolean(item.producto_id)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-sm ${
                              item.producto_id
                                ? "cursor-not-allowed bg-gray-100 text-gray-400 hover:scale-100"
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            }`}
                            title={item.producto_id ? "Ya convertido a producto interno" : "Convertir a producto interno"}
                          >
                            <PackageCheck size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {isStockTab
                    ? searchTerm
                      ? "No se encontraron productos"
                      : "No hay productos"
                    : "No hay productos externos"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* PAGINACION */}
        {totalItems > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:gap-4">
                <span>Mostrando {showingFrom} a {showingTo} de {totalItems} productos</span>
                <PageSizeSelect
                  value={isStockTab ? itemsPerPage : externalPerPage}
                  onChange={(value) => {
                    if (isStockTab) {
                      setItemsPerPage(value);
                      setCurrentPage(1);
                    } else {
                      setExternalPerPage(value);
                      setExternalPage(1);
                    }
                  }}
                />
              </div>

              {pageCount > 1 && <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() =>
                    isStockTab
                      ? setCurrentPage((prev) => Math.max(prev - 1, 1))
                      : setExternalPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={pageNumber === 1}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                >
                  <ChevronLeft size={18} />
                </button>

                {paginationItems.map((item) =>
                  typeof item === "number" ? (
                    <button
                      key={item}
                      onClick={() =>
                        isStockTab
                          ? setCurrentPage(item)
                          : setExternalPage(item)
                      }
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-medium ${
                        pageNumber === item
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {item}
                    </button>
                  ) : (
                    <span
                      key={item}
                      className="w-10 h-10 flex items-center justify-center text-gray-400 select-none"
                    >
                      ...
                    </span>
                  )
                )}

                <button
                  onClick={() =>
                    isStockTab
                      ? setCurrentPage((prev) => Math.min(prev + 1, pageCount))
                      : setExternalPage((prev) => Math.min(prev + 1, pageCount))
                  }
                  disabled={pageNumber === pageCount}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>}
            </div>
          </div>
        )}
      </div>

      {/* MODAL ELIMINAR */}
      {productoAEliminar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-gray-200">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Trash2
                  size={32}
                  className="text-red-600"
                />
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-2">
                ¿Eliminar producto?
              </h3>

              <p className="text-gray-600">
                ¿Deseas eliminar{" "}
                <strong>
                  "{productoAEliminar.nombre}"
                </strong>
                ?
              </p>
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() =>
                  setProductoAEliminar(null)
                }
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-2xl"
              >
                Cancelar
              </button>

              <button
                onClick={confirmarEliminar}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-2xl"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {productoDetalleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900">Detalle del producto</h2>
                <p className="truncate text-sm text-gray-500">
                  {productoDetalleModal.nombre} #{productoDetalleModal.codigo || productoDetalleModal.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProductoDetalleModal(null)}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  {productoDetalleModal.imagen ? (
                    <img
                      src={productoDetalleModal.imagen}
                      alt=""
                      className="mx-auto h-32 w-32 rounded-xl border border-gray-200 bg-white object-contain"
                    />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-xs font-semibold text-gray-400">
                      Sin imagen
                    </div>
                  )}
                  <span
                    className={`mt-4 inline-flex w-full justify-center rounded-full border px-3 py-1 text-xs font-semibold ${
                      productoDetalleModal.estado === "usado"
                        ? "border-amber-200 bg-amber-100 text-amber-700"
                        : "border-green-200 bg-green-100 text-green-700"
                    }`}
                  >
                    {productoDetalleModal.estado === "usado" ? "Usado" : "Nuevo"}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase text-gray-400">Stock actual</p>
                      <p className="mt-1 text-lg font-bold text-gray-900">{Number(productoDetalleModal.stock_actual ?? productoDetalleModal.stock ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3">
                      <p className="text-xs font-semibold uppercase text-amber-700">Reservado</p>
                      <p className="mt-1 text-lg font-bold text-amber-800">{Number(productoDetalleModal.stock_reservado ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-xs font-semibold uppercase text-emerald-700">Disponible</p>
                      <p className="mt-1 text-lg font-bold text-emerald-800">{Number(productoDetalleModal.stock_disponible ?? productoDetalleModal.stock ?? 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-100 p-3">
                      <p className="text-xs font-semibold uppercase text-gray-400">Categoria</p>
                      <p className="mt-1 font-semibold text-gray-800">{productoDetalleModal.categoria_label || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-3">
                      <p className="text-xs font-semibold uppercase text-gray-400">Precio</p>
                      <p className="mt-1 font-semibold text-gray-800">
                        {formatProductoMoney(productoDetalleModal, productoDetalleModal.precio_referencial || "0")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-3">
                      <p className="text-xs font-semibold uppercase text-gray-400">Marca / Modelo</p>
                      <p className="mt-1 font-semibold text-gray-800">{[productoDetalleModal.marca, productoDetalleModal.modelo].filter(Boolean).join(" / ") || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-3">
                      <p className="text-xs font-semibold uppercase text-gray-400">Factura</p>
                      <p className="mt-1 font-semibold text-gray-800">{productoDetalleModal.factura_numero || "-"}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs font-semibold uppercase text-gray-400">Descripcion</p>
                    <p className="mt-1 text-sm text-gray-700">{productoDetalleModal.descripcion || "Sin descripcion"}</p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase text-gray-400">Series</p>
                      {(productoDetalleModal.series?.length || productoDetalleModal.serie) && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductoSeriesModal(productoDetalleModal);
                            setProductoDetalleModal(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <List size={13} />
                          Ver series
                        </button>
                      )}
                    </div>
                    {(productoDetalleModal.series?.length || productoDetalleModal.serie) ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(productoDetalleModal.series?.length
                          ? productoDetalleModal.series
                          : [{ id: productoDetalleModal.id, serie: productoDetalleModal.serie, estado: productoDetalleModal.estado }]
                        ).slice(0, 6).map((serie) => (
                          <span
                            key={serie.id}
                            className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${getSerieEstadoBadge(serie.estado)}`}
                          >
                            <span className="max-w-[160px] truncate">{serie.serie || `Serie #${serie.id}`}</span>
                            <span className="text-[10px] opacity-80">{getSerieEstadoLabel(serie.estado)}</span>
                          </span>
                        ))}
                        {Number(productoDetalleModal.series?.length || 0) > 6 && (
                          <span className="rounded-full bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-500">
                            +{Number(productoDetalleModal.series?.length || 0) - 6}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">Sin series registradas</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {productoSeriesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900">Series del producto</h2>
                <p className="truncate text-sm text-gray-500">
                  {productoSeriesModal.nombre} #{productoSeriesModal.codigo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProductoSeriesModal(null)}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-6">
              {(productoSeriesModal.series?.length || productoSeriesModal.serie) ? (
                <div className="max-h-[calc(88vh-132px)] overflow-auto rounded-2xl border border-gray-200">
                  <table className="min-w-[860px] divide-y divide-gray-200 text-sm">
                    <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase text-gray-500 shadow-sm">
                      <tr>
                        <th className="px-4 py-3">Serie</th>
                        <th className="px-4 py-3">Factura</th>
                        <th className="px-4 py-3">Archivo</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Ingreso</th>
                        <th className="px-4 py-3">Salida / Referencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(productoSeriesModal.series?.length
                        ? productoSeriesModal.series
                        : [{
                          id: productoSeriesModal.id,
                          serie: productoSeriesModal.serie,
                          factura_numero: productoSeriesModal.factura_numero,
                          documento_path: null,
                          estado: productoSeriesModal.estado,
                          fecha_ingreso: null,
                          fecha_salida: null,
                          oc_recibida_id: null,
                          cotizacion_item_id: null,
                        }]
                      ).map((serie) => (
                        <tr key={serie.id} className="hover:bg-gray-50">
                          <td className="max-w-[220px] px-4 py-3 font-semibold text-gray-900">
                            <span className="block truncate" title={serie.serie || "Sin serie"}>
                              {serie.serie || "Sin serie"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{serie.factura_numero || "-"}</td>
                          <td className="px-4 py-3">
                            {normalizeStorageImageUrl(serie.documento_path) ? (
                              <a
                                href={normalizeStorageImageUrl(serie.documento_path) || undefined}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Ver factura
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${getSerieEstadoBadge(serie.estado)}`}>
                              {getSerieEstadoLabel(serie.estado || "disponible")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{serie.fecha_ingreso || "-"}</td>
                          <td className="px-4 py-3 text-gray-700">
                            <div>{serie.fecha_salida || "-"}</div>
                            {(serie.oc_recibida_id || serie.cotizacion_item_id) ? (
                              <div className="text-xs text-gray-500">
                                {[serie.oc_recibida_id ? `OC #${serie.oc_recibida_id}` : null, serie.cotizacion_item_id ? `Item #${serie.cotizacion_item_id}` : null]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </div>
                            ) : serie.fecha_salida && getSerieSalidaMotivoLabel(serie.estado) ? (
                              <div className="text-xs text-gray-500">
                                Salida manual: {getSerieSalidaMotivoLabel(serie.estado)}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                  Este producto todavia no tiene series registradas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddToCotizacionModal && selectedExternalItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Agregar a cotización
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedExternalItem.descripcion}
                </p>
              </div>
              <button
                onClick={() => setShowAddToCotizacionModal(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <button
                onClick={handleCreateCotizacionWithExternalItem}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={16} />
                Crear cotización nueva con este item
              </button>

              <div className="flex items-center gap-3 bg-gray-100 px-4 py-3 rounded-2xl">
                <Search size={18} className="text-gray-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar cotización por número, cliente o título..."
                  value={cotizacionSearchTerm}
                  onChange={(e) => setCotizacionSearchTerm(e.target.value)}
                  className="bg-transparent outline-none w-full text-sm"
                />
              </div>

              <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-100">
                {loadingCotizaciones ? (
                  <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
                    <Loader2 className="animate-spin" size={18} />
                    Cargando cotizaciones...
                  </div>
                ) : cotizacionesFiltradas.length > 0 ? (
                  cotizacionesFiltradas.map((cotizacion) => (
                    <button
                      key={cotizacion.id}
                      onClick={() => handleAddExternalItemToCotizacion(cotizacion.id)}
                      disabled={addingToCotizacion}
                      className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-blue-50 disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-800">
                            {cotizacion.numero || `Cotización #${cotizacion.id}`}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {[cotizacion.cliente_nombre || cotizacion.cliente?.nombre, cotizacion.titulo]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
                          {(cotizacion as any).estado_cotizacion?.nombre || `Estado ${cotizacion.estado_cotizacion_id}`}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-10 text-center text-sm text-gray-500">
                    No se encontraron cotizaciones
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {conversionExternalItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {conversionExternalItem.producto_id ? "Registrar entrada de inventario" : "Convertir a producto interno"}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {conversionExternalItem.descripcion}
                </p>
              </div>
              <button
                onClick={handleCloseConvertExternal}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-blue-800">
                El codigo interno se generara automaticamente con la secuencia de productos stock.
              </div>

              <label className="text-xs font-semibold uppercase text-gray-500">
                Categoria
                <select
                  value={conversionForm.categoria_id}
                  onChange={(event) => setConversionForm((current) => ({ ...current, categoria_id: Number(event.target.value) }))}
                  disabled={Boolean(conversionExternalItem.producto_id)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 disabled:bg-gray-100"
                >
                  {productoCategoriaOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold uppercase text-gray-500">
                Cantidad comprada
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={conversionForm.cantidad}
                  onChange={(event) => setConversionForm((current) => ({ ...current, cantidad: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800"
                />
              </label>

              <label className="text-xs font-semibold uppercase text-gray-500">
                Costo unitario
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={conversionForm.costo_unitario}
                  onChange={(event) => setConversionForm((current) => ({ ...current, costo_unitario: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800"
                />
              </label>

              <label className="text-xs font-semibold uppercase text-gray-500">
                Moneda de compra
                <select
                  value={conversionForm.moneda_id}
                  onChange={(event) => setConversionForm((current) => ({ ...current, moneda_id: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800"
                >
                  {monedaOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} ({option.symbol})
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold uppercase text-gray-500">
                Numero de factura
                <input
                  value={conversionForm.documento_numero}
                  onChange={(event) => setConversionForm((current) => ({ ...current, documento_numero: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800"
                />
              </label>

              <label className="text-xs font-semibold uppercase text-gray-500">
                Estado
                <select
                  value={conversionForm.estado}
                  onChange={(event) => setConversionForm((current) => ({ ...current, estado: event.target.value as "nuevo" | "usado" }))}
                  disabled={Boolean(conversionExternalItem.producto_id)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 disabled:bg-gray-100"
                >
                  <option value="nuevo">NUEVO</option>
                  <option value="usado">USADO</option>
                </select>
              </label>

              <label className="text-xs font-semibold uppercase text-gray-500 md:col-span-2">
                Archivo factura
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
                  <Upload size={16} className="text-gray-400" />
                  <input
                    type="file"
                    accept=".pdf,.xml,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(event) => setConversionFactura(event.target.files?.[0] ?? null)}
                    className="w-full text-sm"
                  />
                </div>
              </label>

              <label className="text-xs font-semibold uppercase text-gray-500 md:col-span-2">
                Observacion
                <textarea
                  value={conversionForm.observacion}
                  onChange={(event) => setConversionForm((current) => ({ ...current, observacion: event.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={handleCloseConvertExternal}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConvertExternal}
                disabled={convertingExternal}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {convertingExternal ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                {conversionExternalItem.producto_id ? "Registrar entrada" : "Convertir y registrar entrada"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      {openModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {modoEdicion ? "Editar Producto" : "Agregar Producto"}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Completa los datos para guardar.
                </p>
              </div>
              <button
                onClick={() => setOpenModal(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] text-gray-500 uppercase">Código</label>
                  <input
                    value={productoSeleccionado.codigo || "Automático"}
                    disabled
                    className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-gray-500 uppercase">Nombre del Producto</label>
                  <input
                    value={productoSeleccionado.nombre}
                    onChange={(e) =>
                      setProductoSeleccionado({
                        ...productoSeleccionado,
                        nombre: e.target.value,
                      })
                    }
                    placeholder="Nombre del Producto"
                    className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-gray-500 uppercase">Categoría</label>
                  <select
                    value={productoSeleccionado.categoria_id}
                    onChange={(e) =>
                      setProductoSeleccionado({
                        ...productoSeleccionado,
                        categoria_id: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-200"
                  >
                    {productoCategoriaOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-gray-500 uppercase">Cantidad</label>
                  <input
                    type="number"
                    value={productoSeleccionado.stock}
                    onChange={(e) =>
                      setProductoSeleccionado({
                        ...productoSeleccionado,
                        stock: e.target.value,
                      })
                    }
                    placeholder="Cantidad"
                    className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-gray-500 uppercase">Precio de compra</label>
                  <input
                    type="number"
                    value={productoSeleccionado.precio_referencial}
                    onChange={(e) =>
                      setProductoSeleccionado({
                        ...productoSeleccionado,
                        precio_referencial: e.target.value,
                      })
                    }
                    placeholder="Precio"
                    className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-gray-500 uppercase">Moneda</label>
                  <select
                    value={productoSeleccionado.moneda_id}
                    onChange={(e) =>
                      setProductoSeleccionado({
                        ...productoSeleccionado,
                        moneda_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-200"
                  >
                    {monedaOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.symbol} {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-gray-500 uppercase">Marca</label>
                  <input
                    value={productoSeleccionado.marca}
                    onChange={(e) =>
                      setProductoSeleccionado({
                        ...productoSeleccionado,
                        marca: e.target.value,
                      })
                    }
                    placeholder="Marca"
                    className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-gray-500 uppercase">Modelo</label>
                  <input
                    value={productoSeleccionado.modelo}
                    onChange={(e) =>
                      setProductoSeleccionado({
                        ...productoSeleccionado,
                        modelo: e.target.value,
                      })
                    }
                    placeholder="Modelo"
                    className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-200"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[11px] text-gray-500 uppercase">Series</label>
                  <textarea
                    value={productoSeleccionado.series_text}
                    onChange={(e) =>
                      setProductoSeleccionado({
                        ...productoSeleccionado,
                        series_text: e.target.value,
                        serie: e.target.value
                          .split(/\r?\n/)
                          .map((serie) => serie.trim())
                          .filter(Boolean)[0] || "",
                      })
                    }
                    rows={4}
                    placeholder="Una serie por linea. Ej: ABC123"
                    className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-200"
                  />
                  <p className="text-[11px] text-gray-500">
                    Si compras varias unidades del mismo modelo, escribe una serie por linea. Puede quedar vacio.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-gray-500 uppercase">Numero de factura</label>
                  <input
                    value={productoSeleccionado.factura_numero}
                    onChange={(e) =>
                      setProductoSeleccionado({
                        ...productoSeleccionado,
                        factura_numero: e.target.value,
                      })
                    }
                    placeholder="Factura opcional"
                    className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-gray-500 uppercase">Unidad medida</label>
                  <select
                    value={productoSeleccionado.unidad_medida}
                    onChange={(e) =>
                      setProductoSeleccionado({
                        ...productoSeleccionado,
                        unidad_medida: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-200"
                  >
                    {unidadMedidaOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-gray-500 uppercase">Descripción</label>
                <input
                  value={productoSeleccionado.descripcion}
                  onChange={(e) =>
                    setProductoSeleccionado({
                      ...productoSeleccionado,
                      descripcion: e.target.value,
                    })
                  }
                  placeholder="Descripción"
                  className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-200"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-gray-500 uppercase mb-1">Imagen</label>
                <label
                  htmlFor="producto-imagen"
                  onDragOver={(e: React.DragEvent<HTMLLabelElement>) => e.preventDefault()}
                  onDrop={handleProductDrop}
                  onPaste={handleProductPaste}
                  className="group cursor-pointer border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-2.5 text-center transition-colors hover:border-blue-400 hover:bg-blue-50 block"
                >
                    <input
                      id="producto-imagen"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProductImageFile(file);
                      }}
                    />

                    {productoSeleccionado.imagen ? (
                      <div className="space-y-2">
                        <img
                          src={productoSeleccionado.imagen}
                          alt="Vista previa"
                          className="mx-auto h-24 w-auto object-contain rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setProductoSeleccionado({
                              ...productoSeleccionado,
                              imagen: "",
                            });
                          }}
                          className="text-xs text-red-600 hover:underline w-full"
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-xs text-gray-500">
                        <p className="font-medium text-gray-700">Imagen del producto</p>
                        <p className="text-gray-500">Arrastra, pega o haz clic para cargar</p>
                      </div>
                    )}
                  </label>
                </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-gray-500 uppercase">Estado</label>
                <select
                  value={productoSeleccionado.estado}
                  onChange={(e) => handleEstadoChange(e.target.value as "nuevo" | "usado")}
                  className="w-full px-3 py-2.5 text-xs rounded-lg border border-gray-200"
                >
                  <option value="nuevo">NUEVO</option>
                  <option value="usado">USADO</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 px-6 py-3 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setOpenModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-semibold"
              >
                Cancelar
              </button>

              <button
                onClick={handleGuardar}
                disabled={saving}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white ${
                  saving
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {modoEdicion ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showExternalEditModal && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-6">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-200/80 overflow-hidden">

            {/* Header */}
            <div className="flex items-start justify-between px-7 pt-6 pb-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Editar item externo</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Actualiza los datos del item y guarda los cambios.
                </p>
              </div>
              <button
                onClick={handleCloseExternalEditModal}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="px-7 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* Información general */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Información general
                </p>
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Descripción</label>
                    <input
                      value={externalItemForm.descripcion}
                      onChange={(e) =>
                        setExternalItemForm({ ...externalItemForm, descripcion: e.target.value })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500">Código</label>
                      <input
                        value={externalItemForm.codigo}
                        onChange={(e) =>
                          setExternalItemForm({ ...externalItemForm, codigo: e.target.value })
                        }
                        className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500">Marca</label>
                      <input
                        value={externalItemForm.marca}
                        onChange={(e) =>
                          setExternalItemForm({ ...externalItemForm, marca: e.target.value })
                        }
                        className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500">Unidad de medida</label>
                      <input
                        value={externalItemForm.unidad_medida}
                        onChange={(e) =>
                          setExternalItemForm({ ...externalItemForm, unidad_medida: e.target.value })
                        }
                        className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500">Cantidad</label>
                      <input
                        type="number"
                        value={externalItemForm.cantidad}
                        onChange={(e) =>
                          setExternalItemForm({ ...externalItemForm, cantidad: e.target.value })
                        }
                        className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Imagen
                </p>
                <label
                  htmlFor="external-item-imagen"
                  onDragOver={(e: React.DragEvent<HTMLLabelElement>) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleExternalItemImageFile(file);
                  }}
                  onPaste={(e) => {
                    const imageItem = Array.from(e.clipboardData.items).find((item) =>
                      item.type.startsWith("image/")
                    );
                    const file = imageItem?.getAsFile();
                    if (file) handleExternalItemImageFile(file);
                  }}
                  className="block cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-3 text-center transition-colors hover:border-blue-400 hover:bg-blue-50"
                >
                  <input
                    id="external-item-imagen"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleExternalItemImageFile(file);
                    }}
                  />
                  {externalItemForm.imagen ? (
                    <div className="space-y-2">
                      <img
                        src={externalItemForm.imagen}
                        alt="Imagen del item externo"
                        className="mx-auto h-28 w-auto object-contain rounded-lg border border-gray-200 bg-white"
                      />
                      <p className="text-xs text-gray-500">Haz clic, arrastra o pega para cambiar la imagen</p>
                    </div>
                  ) : (
                    <div className="py-5 text-xs text-gray-500">
                      Haz clic, arrastra o pega una imagen
                    </div>
                  )}
                </label>
              </div>

              <hr className="border-gray-100" />

              {/* Precios */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Precios
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Costo unitario</label>
                    <input
                      type="number"
                      step="0.01"
                      value={externalItemForm.costo_unitario}
                      onChange={(e) =>
                        setExternalItemForm({ ...externalItemForm, costo_unitario: Number(e.target.value) })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Margen %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={externalItemForm.margen}
                      onChange={(e) =>
                        setExternalItemForm({ ...externalItemForm, margen: Number(e.target.value) })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Precio de venta</label>
                    <input
                      type="number"
                      step="0.01"
                      value={externalItemForm.precio_venta}
                      onChange={(e) =>
                        setExternalItemForm({ ...externalItemForm, precio_venta: Number(e.target.value) })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Producto ID</label>
                    <input
                      type="number"
                      value={externalItemForm.producto_id}
                      onChange={(e) =>
                        setExternalItemForm({ ...externalItemForm, producto_id: e.target.value })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Disponibilidad y stock */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Disponibilidad y stock
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Disponibilidad</label>
                    <select
                      value={externalItemForm.disponibilidad_tipo}
                      onChange={(e) =>
                        setExternalItemForm({ ...externalItemForm, disponibilidad_tipo: e.target.value })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors bg-white"
                    >
                      <option value="stock">Stock</option>
                      <option value="importacion">Importación</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Días de disponibilidad</label>
                    <input
                      type="number"
                      value={externalItemForm.disponibilidad_dias}
                      onChange={(e) =>
                        setExternalItemForm({ ...externalItemForm, disponibilidad_dias: e.target.value })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Stock</label>
                    <input
                      type="number"
                      value={externalItemForm.stock}
                      onChange={(e) =>
                        setExternalItemForm({ ...externalItemForm, stock: e.target.value })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Garantía (meses)</label>
                    <input
                      type="number"
                      value={externalItemForm.garantia_meses}
                      onChange={(e) =>
                        setExternalItemForm({ ...externalItemForm, garantia_meses: e.target.value })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Proveedor */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Proveedor
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Proveedor</label>
                    <input
                      value={externalItemForm.proveedor}
                      onChange={(e) =>
                        setExternalItemForm({ ...externalItemForm, proveedor: e.target.value })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Link proveedor</label>
                    <input
                      value={externalItemForm.link_proveedor}
                      onChange={(e) =>
                        setExternalItemForm({ ...externalItemForm, link_proveedor: e.target.value })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-blue-500/8 transition-colors"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex gap-2.5 px-7 pt-4 pb-6">
              <button
                onClick={handleCloseExternalEditModal}
                className="flex-1 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveExternalItem}
                disabled={savingExternal}
                className={`flex-1 h-10 rounded-lg text-sm font-medium text-white transition-colors ${
                  savingExternal
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Guardar cambios
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
