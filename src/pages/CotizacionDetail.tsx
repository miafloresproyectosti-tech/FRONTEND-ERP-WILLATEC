import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotifications } from '../NotificationContext';
import { useAuth } from '../AuthContext';
import { useLocation } from 'react-router-dom';
import { getClientes, type Cliente } from '../services/cliente.service';
import { getExternalItems, getProductos, type Producto } from "../services/producto.service";
import { getPlantillas } from '../services/plantilla.service';
import { getPlataformas } from '../services/plataforma.service';
import { getUsers, type User as ApiUser } from '../services/usuario.service';
import { recalcularItems } from "../utils/recalcularItems";
import { CotizacionResumen } from '../components/cotizaciones/CotizacionResumen';
import { CotizacionGeneralForm } from '../components/cotizaciones/CotizacionGeneralForm';
import { CotizacionItemsTable } from '../components/cotizaciones/CotizacionItemsTable';
import type { ItemForm } from '../types/cotizaciones.type';
import { ExportModal } from '../components/cotizaciones/modals/ExportModal';
import { ItemTypeModal } from '../components/cotizaciones/modals/ItemTypeModal';
import { ProductModal } from '../components/cotizaciones/modals/ProductModal';
import { ItemFormModal } from '../components/cotizaciones/modals/ItemFormModal';
import { CostosModal } from '../components/cotizaciones/modals/CostosModal';
import {
  getCotizacion,
  createCotizacion,
  updateCotizacion,
  enviarCotizacionRevision,
  aprobarCotizacion,
  rechazarCotizacion,
  getCotizacionHistorial,
  // deleteItem,
  exportarCotizacionPdf,
  descargarPdfCotizacion,
  type Cotizacion,
  type CotizacionItem,
  type CotizacionCostosAdicional,
  type CotizacionHistorial,
} from '../services/cotizacion.service';
import {
  ArrowLeft,
  Save,
  Send,
  CheckCircle,
  FileSpreadsheet,
  Loader2,
  DollarSign,
  Check,
  XCircle,
  UserCheck,
} from 'lucide-react';

const getLocalDateString = (value?: string | null) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('en-CA');
  }

  return date.toLocaleDateString('en-CA');
};

const detectPlantillaMonedaId = (plantilla?: {
  nombre?: string;
  formato_pdf?: string;
  moneda_id?: number;
  codigo_moneda?: string;
}): number | null => {
  if (!plantilla) return null;
  if (plantilla.moneda_id === 1 || plantilla.moneda_id === 2) return plantilla.moneda_id;

  const descriptor = [
    plantilla.nombre,
    plantilla.formato_pdf,
    plantilla.codigo_moneda,
  ]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (descriptor.includes('DOLAR') || descriptor.includes('USD')) return 2;
  if (descriptor.includes('SOLES') || descriptor.includes('PEN') || descriptor.includes('S/')) return 1;

  return null;
};

const PLANTILLA_IDS_CON_IGV = new Set([3, 5]);
const PLANTILLA_IDS_CON_REGLA_IGV = new Set([1, 2, 3, 4, 5]);

const plantillaIncluyeIgv = (plantillaId: number, plantilla?: { incluye_igv?: boolean }) => {
  const id = Number(plantillaId);

  if (PLANTILLA_IDS_CON_REGLA_IGV.has(id)) {
    return PLANTILLA_IDS_CON_IGV.has(id);
  }

  return Boolean(plantilla?.incluye_igv);
};

export function CotizacionDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast, addNotification } = useNotifications();

  const isEditing = id !== 'new' && id !== undefined;
  const currentCotizacionId = id ? parseInt(id) : null;
  const [exportandoPdf, setExportandoPdf] = useState(false);

  // ====== STATE MANAGEMENT ======
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSendingReview, setIsSendingReview] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  //LOCALIZACIÓN
  const location = useLocation();

  const isViewMode = location.pathname.includes('/view');

  // Cotización header
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [plantillaId, setPlantillaId] = useState<number>(1);
  const [plataformaId, setPlataformaId] = useState<number>(1);
  const [fecha, setFecha] = useState('');
  const [validezDias, setValidezDias] = useState<number | undefined>(30);
  const [plantillas, setPlantillas] = useState<{
    id: number;
    nombre: string;
    incluye_igv: boolean;
    formato_pdf?: string;
    moneda_id?: number;
    codigo_moneda?: string;
  }[]>([]);
  const [plataformas, setPlataformas] = useState<{ id: number, nombre: string }[]>([]);
  const [monedaId, setMonedaId] = useState<number>(1); // 1=PEN, 2=USD
  const [tipoCambioSolesADolar, setTipoCambioSolesADolar] = useState<number>(3.3);
  const [tipoCambioDolarASoles, setTipoCambioDolarASoles] = useState<number>(3.5);
  const [modoDistribucion, setModoDistribucion] = useState<'POR_ITEM' | 'POR_CANTIDAD'>('POR_ITEM');
  const [titulo, setTitulo] = useState('');
  const [formaPago, setFormaPago] = useState('AL CONTADO');
  const [clienteContacto, setClienteContacto] = useState('');
  const selectedPlantilla = plantillas.find((plantilla) => Number(plantilla.id) === Number(plantillaId));
  const plantillaMonedaId = detectPlantillaMonedaId(selectedPlantilla);
  const currentMonedaId = plantillaMonedaId ?? monedaId;
  const currentIncludeIgv = plantillaIncluyeIgv(plantillaId, selectedPlantilla);
  const simboloMoneda = currentMonedaId === 2 ? '$' : 'S/';

  // Listas
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [items, setItems] = useState<CotizacionItem[]>([]);
  const [costos, setCostos] = useState<CotizacionCostosAdicional[]>([]);
  const [historial, setHistorial] = useState<CotizacionHistorial[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [usuarios, setUsuarios] = useState<ApiUser[]>([]);
  const [externalItemSuggestions, setExternalItemSuggestions] = useState<CotizacionItem[]>([]);

  // Estado de delegación
  const [delegadoId, setDelegadoId] = useState<number | null>(null);
  const [delegadoSelectionId, setDelegadoSelectionId] = useState<number | null>(null);
  const [showDelegacionModal, setShowDelegacionModal] = useState(false);
  const [delegadoCotizacionId, setDelegadoCotizacionId] = useState<number | null>(null);
  const [delegadoCotizacionSelectionId, setDelegadoCotizacionSelectionId] = useState<number | null>(null);
  const [showDelegacionEdicionModal, setShowDelegacionEdicionModal] = useState(false);

  useEffect(() => {
    if (showDelegacionModal) {
      setDelegadoSelectionId(delegadoId);
    }
  }, [showDelegacionModal, delegadoId]);

  useEffect(() => {
    if (showDelegacionEdicionModal) {
      setDelegadoCotizacionSelectionId(delegadoCotizacionId);
    }
  }, [showDelegacionEdicionModal, delegadoCotizacionId]);

  // UI State
  const [editingItem, setEditingItem] = useState<CotizacionItem | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [showItemFormModal, setShowItemFormModal] = useState(false);
  const [showItemTypeModal, setShowItemTypeModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCostosModal, setShowCostosModal] = useState(false);
  const [showRechazoModal, setShowRechazoModal] = useState(false);
  const [comentarioRechazo, setComentarioRechazo] = useState('');

  const [estadoCotizacionId, setEstadoCotizacionId] = useState<number>(1);

  // tipoCambio es ahora estado editable por el usuario

  // Verificar permisos del usuario actual sobre la cotización
  const userRole = user?.role?.toUpperCase();
  const isSuperAdmin = userRole === 'SUPERADMIN';
  const currentEstadoCotizacionId = Number(estadoCotizacionId);
  const currentDelegadoId = delegadoId === null || delegadoId === undefined ? null : Number(delegadoId);
  const currentDelegadoCotizacionId =
    cotizacion?.delegado_cotizacion_id ?? (cotizacion as any)?.delegadoCotizacionId ?? delegadoCotizacionId;
  const currentDelegadoCotizacionIdNumber =
    currentDelegadoCotizacionId === null || currentDelegadoCotizacionId === undefined
      ? null
      : Number(currentDelegadoCotizacionId);
  const isCotizacionCreator = Boolean(cotizacion && user && Number(cotizacion.user_id) === Number(user.id));
  const isCotizacionEditDelegate = Boolean(cotizacion && user && currentDelegadoCotizacionIdNumber === Number(user.id));
  const canViewGanancia = !cotizacion || isCotizacionCreator || isSuperAdmin;
  const canEditCotizacion = !cotizacion || isCotizacionCreator || isCotizacionEditDelegate;
  const canDelegateCotizacionEdit = Boolean(currentCotizacionId && cotizacion && isCotizacionCreator);
  const canSendCotizacionToReview = Boolean(
    currentCotizacionId &&
    currentEstadoCotizacionId === 1 &&
    canEditCotizacion
  );
  const canReviewCotizacion = Boolean(
    currentEstadoCotizacionId === 2 &&
    user &&
    (isSuperAdmin || currentDelegadoId === Number(user.id))
  );
  const canChangeReviewEstado = Boolean(
    user && (isSuperAdmin || currentDelegadoId === Number(user.id))
  );
  const isCotizacionReadOnly = isViewMode || !canEditCotizacion;

  useEffect(() => {
    if (!cotizacion) return;

    setEstadoCotizacionId(Number(cotizacion.estado_cotizacion_id));
  }, [cotizacion]);

  const handleSetMonedaId = (id: number) => {
    if (id === monedaId) return;
    // Durante la carga inicial, solo cambiar el id sin convertir precios
    if (isInitialLoad) {
      setMonedaId(id);
      return;
    }
    if (isCotizacionReadOnly) { setMonedaId(id); return; }

    // convertir todos los montos usando el tipo de cambio correcto según dirección
    const convertirMultiplicador = (() => {
      // de PEN(1) a USD(2) => dividir por tipoCambioSolesADolar
      if (monedaId === 1 && id === 2) return 1 / tipoCambioSolesADolar;
      // de USD(2) a PEN(1) => multiplicar por tipoCambioDolarASoles
      if (monedaId === 2 && id === 1) return tipoCambioDolarASoles;
      return 1;
    })();

    setItems(prev => prev.map(item => ({
      ...item,
      costo_base: Number((Number(item.costo_base || 0) * convertirMultiplicador).toFixed(2)),
      costo_unitario: Number((Number(item.costo_unitario || 0) * convertirMultiplicador).toFixed(2)),
      costo_total: Number((Number(item.costo_total || 0) * convertirMultiplicador).toFixed(2)),
      precio_venta: Number((Number(item.precio_venta || 0) * convertirMultiplicador).toFixed(2)),
      subtotal: Number((Number(item.subtotal || 0) * convertirMultiplicador).toFixed(2)),
      ganancia: Number((Number(item.ganancia || 0) * convertirMultiplicador).toFixed(2)),
    })));

    setCostos(prev => prev.map(c => ({
      ...c,
      monto: Number((Number(c.monto || 0) * convertirMultiplicador).toFixed(2)),
    })));

    setMonedaId(id);
  };

  const normalizeItemProveedores = (item: {
    proveedores?: ItemForm['proveedores'];
    proveedor?: string | null;
    link_proveedor?: string | null;
  } = {}) => {
    const proveedores = Array.isArray(item.proveedores) && item.proveedores.length > 0
      ? item.proveedores
      : [{ nombre: item.proveedor || '', link: item.link_proveedor || '', precio: null, notas: '' }];

    return proveedores.map((proveedor, index) => ({
      ...proveedor,
      nombre: proveedor.nombre || '',
      link: proveedor.link || '',
      precio: proveedor.precio ?? null,
      notas: proveedor.notas || '',
      orden: proveedor.orden ?? index + 1,
    }));
  };

  const getPrimaryProveedor = (proveedores: ItemForm['proveedores'] = []) => {
    const primary = proveedores[0];

    return {
      proveedor: primary?.nombre || '',
      link_proveedor: primary?.link || '',
    };
  };

  const buildItemFromExternalSource = (source: Partial<CotizacionItem>): CotizacionItem => {
    const proveedores = normalizeItemProveedores(source);
    const primaryProveedor = getPrimaryProveedor(proveedores);
    const image = source.imagen || source.imagen_url || source.imagen_path || '';

    return {
      id: Date.now(),
      cotizacion_id: currentCotizacionId || 0,
      descripcion: source.descripcion || '',
      cantidad: 1,
      costo_base: Number(source.costo_base ?? source.costo_unitario ?? 0),
      costo_unitario: Number(source.costo_unitario ?? source.costo_base ?? 0),
      costo_total: Number(source.costo_unitario ?? source.costo_base ?? 0),
      precio_venta: Number(source.precio_venta || 0),
      subtotal: Number(source.precio_venta || 0),
      ganancia: Number(source.ganancia || 0),
      margen: Number(source.margen || 0),
      marca: source.marca || '',
      codigo: source.codigo || '',
      unidad_medida: source.unidad_medida || 'UND',
      garantia_meses: Number(source.garantia_meses || 12),
      disponibilidad_tipo: source.disponibilidad_tipo || 'stock',
      disponibilidad_dias: Number(source.disponibilidad_dias || 4),
      orden: items.length + 1,
      producto_id: source.producto_id,
      producto_externo_id: source.producto_externo_id,
      estado_cotizacion_item_id: undefined,
      aplica_costos_adicionales: source.aplica_costos_adicionales ?? true,
      tipo: 'externo',
      ...primaryProveedor,
      proveedores,
      imagen: image,
      imagen_url: source.imagen_url || image || null,
      imagen_path: source.imagen_path || image || null,
    };
  };

  // Formularios
  const [itemForm, setItemForm] = useState<ItemForm>({
    id: 1,
    descripcion: '',
    cantidad: 1,
    costo_base: 0,
    precio_venta: 0,
    costo_unitario: 0,
    costo_total: 0,
    ganancia: 0,
    subtotal: 0,
    imagen: '',
    orden: 1,
    cotizacion_id: currentCotizacionId || 0,
    producto_id: undefined,
    producto_externo_id: undefined,
    estado_cotizacion_item_id: undefined,
    aplica_costos_adicionales: true,
    tipo: 'externo' as 'catalogo' | 'externo',
    margen: 20,
    marca: '',
    codigo: '',
    unidad_medida: 'UND',
    garantia_meses: 12,
    disponibilidad_tipo: 'stock' as 'stock' | 'importacion',
    disponibilidad_dias: 4,
    proveedor: '',
    link_proveedor: '',
    proveedores: [{ nombre: '', link: '', precio: null, notas: '' }],
  });

  useEffect(() => {
    const cantidad = Number(itemForm.cantidad || 0);
    const costoBase = Number(itemForm.costo_base || 0);
    const margen = Number(itemForm.margen || 0);
    const costosTotal = costos.reduce((acc, costo) => acc + Number(costo.monto || 0), 0);
    const previewItems = showItemFormModal
      ? editingItemId
        ? items.map(item =>
          item.id === editingItemId ? { ...item, cantidad, aplica_costos_adicionales: itemForm.aplica_costos_adicionales ?? true } : item
        )
        : [...items, { cantidad, aplica_costos_adicionales: itemForm.aplica_costos_adicionales ?? true } as CotizacionItem]
      : items;
    const totalCantidad = previewItems.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
    const itemsConCostos =
      modoDistribucion === 'POR_CANTIDAD'
        ? previewItems
        : previewItems.filter((item) => item.aplica_costos_adicionales !== false);
    const itemsSeleccionados = itemsConCostos.length > 0 ? itemsConCostos : previewItems;
    const totalCantidadSeleccionada = itemsSeleccionados.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
    const divisor =
      modoDistribucion === 'POR_CANTIDAD'
        ? totalCantidad > 0 ? totalCantidad : 1
        : totalCantidadSeleccionada > 0 ? totalCantidadSeleccionada : 1;
    const costoExtraUnitario = costosTotal / divisor;
    const aplicaCostoExtra =
      modoDistribucion === 'POR_CANTIDAD' ||
      (itemForm.aplica_costos_adicionales ?? true) ||
      itemsConCostos.length === 0;
    const costoUnitario = costoBase + (aplicaCostoExtra ? costoExtraUnitario : 0);
    const precioVenta = margen < 100 ? costoUnitario / (1 - margen / 100) : costoUnitario;
    const subtotal = precioVenta * cantidad;
    const costoTotal = costoUnitario * cantidad;
    const gananciaItem = subtotal - costoTotal;
    const ganancia = currentIncludeIgv ? gananciaItem / 1.18 : gananciaItem;

    setItemForm(prev => ({
      ...prev,
      costo_unitario: Number(costoUnitario.toFixed(2)),
      costo_total: Number(costoTotal.toFixed(2)),
      precio_venta: Number(precioVenta.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      ganancia: Number(ganancia.toFixed(2)),
    }));
  }, [
    itemForm.costo_base,
    itemForm.margen,
    itemForm.cantidad,
    itemForm.aplica_costos_adicionales,
    costos,
    items,
    editingItemId,
    showItemFormModal,
    modoDistribucion,
    currentIncludeIgv,
  ]);

  const [costoForm, setCostoForm] = useState({
    id: 0,
    cotizacion_id: currentCotizacionId || null,
    tipo: 'viaje',
    monto: 0,
    descripcion: '',
  });

  const handleOpenNewItem = () => {
    if (isCotizacionReadOnly) return;

    setEditingItemId(null);

    setEditingItem(null);

    resetItemForm();

    setShowItemTypeModal(true);
  };

  const handleOpenEditItem = (item: CotizacionItem) => {
    const proveedores = normalizeItemProveedores(item);
    const primaryProveedor = getPrimaryProveedor(proveedores);
    setEditingItem(item);

    setEditingItemId(item.id);

    setItemForm({
      ...item,
      ...primaryProveedor,
      proveedores,
      imagen: item.imagen || item.imagen_url || '',
      imagen_url: item.imagen_url,
      imagen_path: item.imagen_path,
      aplica_costos_adicionales: item.aplica_costos_adicionales ?? true,
    });

    setShowItemFormModal(true);
  };

  // ====== EFECTOS ======
  // Cargar clientes
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchAllActiveClientes = async () => {
      const perPage = 100;
      const firstPage = await getClientes({
        page: 1,
        perPage,
        estado: "activo",
      });

      const allClientes = Array.isArray(firstPage) ? firstPage : firstPage.data || [];
      const lastPage = Array.isArray(firstPage) ? 1 : Number(firstPage.last_page || 1);

      for (let page = 2; page <= lastPage; page += 1) {
        const response = await getClientes({
          page,
          perPage,
          estado: "activo",
        });

        allClientes.push(...(Array.isArray(response) ? response : response.data || []));
      }

      return allClientes;
    };

    const fetchClientes = async () => {
      try {
        const data = await fetchAllActiveClientes();
        setClientes(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchClientes();
  }, []);

  // Cargar usuarios (para delegación)
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const data = await getUsers();
        setUsuarios(data);
      } catch (error) {
        console.warn('Error al cargar usuarios:', error);
      }
    };
    fetchUsuarios();
  }, []);

  //Cargar Productos:
  useEffect(() => {
    if (isCotizacionReadOnly || !showProductModal || productos.length > 0) return;

    const fetchProductos = async () => {
      try {
        const data = await getProductos();
        setProductos(data);
      } catch (error) {
        addNotification({
          title: 'Error',
          description: 'Error al cargar productos',
          message: 'Error al cargar productos',
          type: 'error',
          duration: 4000,
        } as any);
      }
    };
    fetchProductos();
  }, [isViewMode, showProductModal, productos.length]);

  useEffect(() => {
    if (isCotizacionReadOnly || !showItemFormModal || itemForm.tipo !== 'externo') return;

    const fetchExternalSuggestions = async () => {
      try {
        const response = await getExternalItems(1, itemForm.descripcion);
        setExternalItemSuggestions(response.data as unknown as CotizacionItem[]);
      } catch (error) {
        console.warn('Error al cargar sugerencias de items externos:', error);
      }
    };

    const timeout = window.setTimeout(fetchExternalSuggestions, 250);

    return () => window.clearTimeout(timeout);
  }, [isCotizacionReadOnly, showItemFormModal, itemForm.tipo, itemForm.descripcion]);

  useEffect(() => {
    if (isCotizacionReadOnly) return;

    const fetchExternalSuggestions = async () => {
      try {
        const response = await getExternalItems(1);
        setExternalItemSuggestions(response.data as unknown as CotizacionItem[]);
      } catch (error) {
        console.warn('Error al cargar sugerencias de items externos:', error);
      }
    };

    fetchExternalSuggestions();
  }, [isCotizacionReadOnly]);

  useEffect(() => {
    if (isEditing || isCotizacionReadOnly) return;

    const storedItem = localStorage.getItem('itemToAdd');
    if (!storedItem) return;

    try {
      const parsedItem = JSON.parse(storedItem);
      const newItem = buildItemFromExternalSource(parsedItem);

      setItems((prev) => [...prev, { ...newItem, orden: prev.length + 1 }]);
      localStorage.removeItem('itemToAdd');
      showToast({
        title: 'Item agregado',
        description: `Se agregó "${newItem.descripcion}" a la cotización.`,
        type: 'success',
        duration: 3000,
      } as any);
    } catch (error) {
      console.error('Error al recuperar item externo para cotización:', error);
      localStorage.removeItem('itemToAdd');
      showToast({
        title: 'No se pudo agregar el item',
        description: 'El item externo preparado no tenía un formato válido.',
        type: 'warning',
        duration: 4000,
      } as any);
    }
  }, [isEditing, isCotizacionReadOnly]);

  // Cargar cotización si es edición
  useEffect(() => {
    if (isEditing && currentCotizacionId) {
      loadCotizacion();
    } else {
      setIsInitialLoad(false);
    }
  }, [isEditing, currentCotizacionId]);

  //Cargar plataformas
  useEffect(() => {
    const fetchPlataformas = async () => {
      try {
        const data = await getPlataformas();

        setPlataformas(data);

        if (data.length > 0 && !plataformaId) {
          setPlataformaId(data[0].id);
        }

      } catch (error) {
        addNotification({
          title: 'Error',
          description: 'Error al cargar plataformas',
          message: 'Error al cargar plataformas',
          type: 'error',
          duration: 4000,
        } as any);
      }
    };

    fetchPlataformas();
  }, []);

  //Cargar plantillas
  useEffect(() => {
    const fetchPlantillas = async () => {
      try {
        const data = await getPlantillas();

        setPlantillas(data);

        if (data.length > 0 && !plantillaId) {
          setPlantillaId(data[0].id);
        }

      } catch (error) {
        addNotification({
          title: 'Error',
          description: 'Error al cargar plantillas',
          message: 'Error al cargar plantillas',
          type: 'error',
          duration: 4000,
        } as any);
      }
    };

    fetchPlantillas();
  }, []);

  // ====== FUNCIONES API ======

  const loadCotizacion = async () => {
    if (!currentCotizacionId) return;
    try {
      setLoading(true);
      const data = await getCotizacion(currentCotizacionId);
      setCotizacion(data);
      setEstadoCotizacionId(Number(data.estado_cotizacion_id));
      setClienteId(Number(data.cliente_id));
      setPlantillaId(Number(data.plantilla_id));
      setPlataformaId(Number(data.plataforma_id));
      setFecha(getLocalDateString(data.fecha || data.created_at));
      setValidezDias(Number(data.validez_dias) || 30);
      setMonedaId(Number(data.moneda_id || 1));
      setModoDistribucion(data.modo_distribucion);
      setTitulo(data.titulo);
      setFormaPago(data.forma_pago || 'AL CONTADO');
      setClienteContacto(data.cliente_contacto || data.cliente?.contacto || '');
      setDelegadoId(data.delegado_id || null);
      setDelegadoCotizacionId(data.delegado_cotizacion_id ?? (data as any).delegadoCotizacionId ?? null);
      setItems((data.items || []).map((item) => ({
        ...item,
        aplica_costos_adicionales: item.aplica_costos_adicionales ?? true,
      })));
      setCostos(data.costosAdicionales || data.costos_adicionales || []);
      const historialData = data.historial || data.cotizacion_historial || [];
      setHistorial(historialData);
      setLoading(false);

      if (historialData.length === 0) {
        try {
          const historialApi = await Promise.resolve([]).then(() => getCotizacionHistorial(currentCotizacionId));
          setHistorial(historialApi);
        } catch (historialError) {
          console.warn('No se pudo cargar el historial de la cotizaciÃ³n', historialError);
        }
      }
    } catch (error) {
      addNotification({
        title: 'Error',
        description: 'Error al cargar cotizacion',
        message: 'Error al cargar cotización',
        type: 'error',
        duration: 4000,
      } as any);
      navigate('/cotizaciones');
    } finally {
      setLoading(false);
      setIsInitialLoad(false); // ← aquí se habilita la conversión para cambios manuales
    }
  };

  const handleEnviarRevision = async () => {
    const cotizacionId = cotizacion?.id || currentCotizacionId;
    if (!cotizacionId || !canSendCotizacionToReview || isSendingReview) return;

    if (itemsCalculados.length === 0) {
      showToast({
        title: 'Datos incompletos',
        description: 'Agregue al menos un ítem antes de enviar la cotización a aprobación',
        type: 'warning',
        duration: 4000,
      } as any);
      return;
    }

    setIsSendingReview(true);
    try {
      const data = await enviarCotizacionRevision(cotizacionId);
      const historialApi = await getCotizacionHistorial(cotizacionId);

      setCotizacion(data);
      setEstadoCotizacionId(Number(data.estado_cotizacion_id || 2));
      setDelegadoId(data.delegado_id || null);
      setDelegadoCotizacionId(data.delegado_cotizacion_id ?? (data as any).delegadoCotizacionId ?? null);
      setHistorial(historialApi);

      showToast({
        title: 'Cotización enviada',
        description: 'La cotización fue enviada para aprobación.',
        message: 'Cotización enviada para aprobación',
        type: 'success',
        duration: 4000,
      } as any);
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error?.response?.data?.message || 'No se pudo enviar la cotización a aprobación',
        message: error?.response?.data?.message || 'No se pudo enviar la cotización a aprobación',
        type: 'error',
        duration: 4000,
      } as any);
    } finally {
      setIsSendingReview(false);
    }
  };

  const handleAprobarCotizacion = async () => {
    const cotizacionId = cotizacion?.id || currentCotizacionId;
    if (!cotizacionId) return;
    if (isApproving || isRejecting) return; // Prevenir doble click y acciones cruzadas

    if (!canReviewCotizacion) {
      showToast({
        title: 'Error',
        description: 'Solo SUPERADMIN o el delegado de aprobación puede aprobar esta cotización',
        message: 'Solo SUPERADMIN o el delegado de aprobación puede aprobar esta cotización',
        type: 'warning',
        duration: 4000,
      } as any);
      return;
    }

    setIsApproving(true);
    await new Promise(r => setTimeout(r, 0)); // 🔥 fuerza un re-render antes del await pesado
    try {
      const data = await aprobarCotizacion(cotizacionId);
      const historialApi = await getCotizacionHistorial(cotizacionId);

      setEstadoCotizacionId(4);
      setCotizacion(data);
      setHistorial(historialApi);

      const approverName = user?.name || 'Superadministrador';
      const targetUserId = cotizacion?.user?.id || cotizacion?.user_id;

      showToast({
        title: 'Cotización aprobada',
        description: `Aprobada por ${approverName}`,
        type: 'success',
        icon: 'CheckCircle',
        route: `/cotizaciones/${cotizacionId}/view`,
      } as any);

      if (targetUserId) {
        addNotification({
          title: 'Tu cotización fue aprobada',
          description: `La cotización ${cotizacionId} fue aprobada por ${approverName}`,
          type: 'success',
          icon: 'CheckCircle',
          route: `/cotizaciones/${cotizacionId}/view`,
          targetUserId,
        } as any);
      }
    } catch (error: any) {
      showToast({
        title: 'Error al aprobar la cotización',
        description: error?.response?.data?.message || 'Error al aprobar la cotización',
        type: 'error',
        duration: 4000,
      } as any);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRechazarCotizacion = async () => {
    const cotizacionId = cotizacion?.id || currentCotizacionId;
    if (!cotizacionId) return;
    if (isRejecting || isApproving) return; // Prevenir doble click y acciones cruzadas

    const comentario = comentarioRechazo.trim();

    if (!comentario) {
      showToast({
        title: 'Comentario requerido',
        description: 'Ingresa un comentario para rechazar',
        type: 'warning',
        duration: 4000,
      } as any);
      return;
    }

    setIsRejecting(true);
    if (!canReviewCotizacion) {
      showToast({
        title: 'Error',
        description: 'Solo SUPERADMIN o el delegado de aprobación puede rechazar esta cotización',
        type: 'warning',
        duration: 4000,
      } as any);
      setIsRejecting(false);
      return;
    }
    try {
      const data = await rechazarCotizacion(cotizacionId, comentario);
      const historialApi = await getCotizacionHistorial(cotizacionId);

      setEstadoCotizacionId(5);
      setCotizacion(data);
      setHistorial(historialApi);
      setShowRechazoModal(false);
      setComentarioRechazo('');

      const approverName = user?.name || 'Superadministrador';
      const targetUserId = cotizacion?.user?.id || cotizacion?.user_id;

      showToast({
        title: 'Cotización rechazada',
        description: `Rechazada por ${approverName}`,
        type: 'warning',
        icon: 'MessageCircle',
        route: `/cotizaciones/${cotizacionId}/view`,
      } as any);

      if (targetUserId) {
        addNotification({
          title: 'Tu cotización fue rechazada',
          description: `La cotización ${cotizacionId} fue rechazada por ${approverName}`,
          type: 'warning',
          icon: 'MessageCircle',
          route: `/cotizaciones/${cotizacionId}/view`,
          targetUserId,
        } as any);
      }
    } catch (error: any) {
      showToast({
        title: 'Error al rechazar la cotización',
        description: error?.response?.data?.message || 'Error al rechazar la cotización',
        type: 'error',
        duration: 4000,
      } as any);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleAsignarDelegado = async () => {
    if (!currentCotizacionId) return;
    if (!delegadoSelectionId) {
      showToast({
        title: 'Selecciona un delegado',
        description: 'Selecciona un delegado antes de guardar',
        type: 'warning',
        duration: 4000,
      } as any);
      return;
    }

    try {
      setSaving(true);
      const payload = buildCotizacionPayload(estadoCotizacionId);
      const data = await updateCotizacion(currentCotizacionId, {
        ...payload,
        delegado_id: delegadoSelectionId,
      });

      setCotizacion(data);
      setDelegadoId(data.delegado_id || delegadoSelectionId);
      setShowDelegacionModal(false);
      showToast({
        title: 'Delegado asignado correctamente',
        description: 'El delegado ha sido asignado exitosamente.',
        type: 'success',
      });
      // Volver a la lista de cotizaciones después de delegar
      navigate('/cotizaciones');
    } catch (error: any) {
      showToast({
        title: 'Error al asignar delegado',
        description: error?.response?.data?.message || 'Error al asignar delegado',
        type: 'warning',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelegarEdicionCotizacion = async () => {
    if (!currentCotizacionId) return;
    if (!canDelegateCotizacionEdit) {
      showToast({
        title: 'Acción no permitida',
        description: 'Solo el creador puede delegar la edición de esta cotización',
        type: 'warning',
        duration: 4000,
      } as any);
      return;
    }
    if (!delegadoCotizacionSelectionId) {
      showToast({
        title: 'Selecciona un delegado',
        description: 'Selecciona un usuario de ventas para delegar la edición',
        type: 'warning',
        duration: 4000,
      } as any);
      return;
    }

    try {
      setSaving(true);
      const payload = buildCotizacionPayload(estadoCotizacionId);
      const data = await updateCotizacion(currentCotizacionId, {
        ...payload,
        delegado_cotizacion_id: delegadoCotizacionSelectionId,
      });
      setCotizacion(data);
      setDelegadoCotizacionId(data.delegado_cotizacion_id ?? (data as any).delegadoCotizacionId ?? delegadoCotizacionSelectionId);
      setShowDelegacionEdicionModal(false);
      showToast({
        title: 'Edición delegada',
        description: 'La cotización fue delegada para que otro usuario de ventas pueda terminarla.',
        type: 'success',
      });
    } catch (error: any) {
      showToast({
        title: 'Error al delegar edición',
        description: error?.response?.data?.message || 'Error al delegar la edición de la cotización',
        type: 'warning',
        duration: 4000,
      } as any);
    } finally {
      setSaving(false);
    }
  };

  const getGananciaGuardable = (ganancia: number | string | null | undefined) => {
    const valor = Number(ganancia || 0);
    const tipoCambio = tipoCambioSolesADolar || 1;

    return Number((currentMonedaId === 2 ? valor * tipoCambio : valor).toFixed(2));
  };

  const toMoneyValue = (value: number | string | null | undefined) =>
    Number(Number(value || 0).toFixed(2));

  const getCotizacionSaveErrorMessage = (error: any) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const backendMessage = data?.message;
    const validationErrors = data?.errors && typeof data.errors === 'object'
      ? Object.values(data.errors)
        .flat()
        .filter(Boolean)
        .map(String)
      : [];

    if (validationErrors.length > 0) {
      const visibleErrors = validationErrors.slice(0, 3).join(' ');
      return `${visibleErrors}${validationErrors.length > 3 ? ' Revise los demás campos marcados por el backend.' : ''}`;
    }

    if (status === 413) {
      return 'El archivo o una imagen es demasiado pesada. Revisa las imágenes de los ítems e intenta nuevamente.';
    }

    if (status === 422) {
      return backendMessage || 'Hay datos inválidos en la cotización. Revisa los ítems, proveedores, precios e imágenes.';
    }

    if (backendMessage) {
      return backendMessage;
    }

    if (error?.request && !error?.response) {
      return 'No hubo respuesta del servidor. Revisa tu conexión o intenta nuevamente en unos segundos.';
    }

    return 'No se pudo guardar la cotización. Revisa las imágenes de los ítems y vuelve a intentarlo.';
  };

  const buildCotizacionPayload = (estadoId = estadoCotizacionId) => {
    const requestedEstadoId = Number(estadoId);
    const estadoGuardable =
      !canChangeReviewEstado && [3, 4, 5, 6].includes(requestedEstadoId)
        ? Number(cotizacion?.estado_cotizacion_id || 2)
        : requestedEstadoId;

    // NO enviar cotizacion_id en items - el backend lo asigna automáticamente del URL
    const itemsLimpios = itemsCalculados.map(({ cotizacion_id, ...item }) => {
      const proveedores = item.tipo === 'externo' ? normalizeItemProveedores(item) : [];
      const primaryProveedor = getPrimaryProveedor(proveedores);

      return {
        ...item,
        ...primaryProveedor,
        proveedores,
        costo_unitario: toMoneyValue(item.costo_unitario),
        precio_venta: toMoneyValue(item.precio_venta),
        costo_total: toMoneyValue(item.costo_total),
        subtotal: toMoneyValue(item.subtotal),
        ganancia: getGananciaGuardable(item.ganancia),
        aplica_costos_adicionales: item.aplica_costos_adicionales ?? true,
      };
    });
    const clienteContactoValue = clienteContacto.trim();

    const payload: any = {
      id: currentCotizacionId,
      cliente_id: clienteId ?? 0,
      plantilla_id: plantillaId,
      plataforma_id: plataformaId,
      moneda_id: currentMonedaId,
      modo_distribucion: modoDistribucion,
      fecha: fecha || getLocalDateString(),
      titulo: titulo,
      forma_pago: formaPago,
      cliente_contacto: clienteContactoValue,
      tipo_cambio_soles_a_usd: tipoCambioSolesADolar,
      tipo_cambio_usd_a_soles: tipoCambioDolarASoles,
      validez_dias: Number(validezDias) || 30,
      estado_cotizacion_id: estadoGuardable,
      subtotal: toMoneyValue(resumen.subtotal),
      igv: toMoneyValue(resumen.igv),
      total: toMoneyValue(resumen.total),
      total_gasto: toMoneyValue(resumen.costoCompraTotal),
      ganancia: getGananciaGuardable(resumen.ganancia),
      items: itemsLimpios,
      costos,
      costos_adicionales: costos,
    };

    // Incluir delegado_id solo si el usuario es SUPERADMIN
    if (user?.role === 'SUPERADMIN' && delegadoId) {
      payload.delegado_id = delegadoId;
    }

    return payload;
  };

  const handleSaveCotizacion = async () => {
    if (isCotizacionReadOnly) return;
    if (saving) return;

    if (!clienteId || !plantillaId) {
      showToast({
        title: 'Datos incompletos',
        description: 'Seleccione cliente y plantilla',
        type: 'warning',
      });
      return;
    }

    if (!titulo.trim()) {
      showToast({
        title: 'Datos incompletos',
        description: 'Ingrese un título para la cotización',
        type: 'warning',
      });
      return;
    }

    if (items.length === 0) {
      showToast({
        title: 'Datos incompletos',
        description: 'Agregue al menos un ítem antes de guardar la cotización',
        type: 'warning',
      });
      return;
    }

    const shouldSendRejectedToReview =
      isEditing && currentCotizacionId && currentEstadoCotizacionId === 5 && canEditCotizacion;
    const payload = buildCotizacionPayload();

    setSaving(true);
    try {
      if (isEditing && currentCotizacionId) {
        // Actualizar
        const updated = await updateCotizacion(currentCotizacionId, payload);
        const finalCotizacion = shouldSendRejectedToReview
          ? await enviarCotizacionRevision(currentCotizacionId)
          : updated;
        const historialApi = shouldSendRejectedToReview
          ? await getCotizacionHistorial(currentCotizacionId)
          : null;

        // sincronizar estado local con respuesta del servidor
        setCotizacion(finalCotizacion);
        setEstadoCotizacionId(Number(finalCotizacion.estado_cotizacion_id || estadoCotizacionId));
        setDelegadoId(finalCotizacion.delegado_id || null);
        setDelegadoCotizacionId(finalCotizacion.delegado_cotizacion_id ?? (finalCotizacion as any).delegadoCotizacionId ?? null);
        if (historialApi) {
          setHistorial(historialApi);
        }
        showToast({
          title: shouldSendRejectedToReview ? 'Cotización enviada' : 'Cotización actualizada',
          description: shouldSendRejectedToReview
            ? 'La cotización fue corregida y enviada nuevamente a aprobación.'
            : 'La cotización ha sido actualizada exitosamente.',
          message: shouldSendRejectedToReview ? 'Cotización enviada' : 'Cotización actualizada',
          type: 'success',
          duration: 4000,
        } as any);
      } else {
        // Crear
        const newCotizacion = await createCotizacion(payload);
        showToast({
          title: 'Cotización creada',
          description: 'La cotización fue guardada correctamente como borrador.',
          type: 'success',
          duration: 4000,
        } as any);
        setCotizacion(newCotizacion);
      }
      navigate('/cotizaciones');
    } catch (error: any) {
      console.error('Error al guardar cotización:', error);
      showToast({
        title: 'Error al guardar cotización',
        description: getCotizacionSaveErrorMessage(error),
        type: 'error',
        duration: 6000,
      } as any);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (isCotizacionReadOnly) return;

    if (!itemForm.descripcion || itemForm.cantidad <= 0) {
      addNotification({
        message: 'Completa los datos del item',
        type: 'warning',
        duration: 4000,
      } as any);

      return;
    }
    const proveedores = itemForm.tipo === 'externo' ? normalizeItemProveedores(itemForm) : [];
    const primaryProveedor = getPrimaryProveedor(proveedores);

    // ===== NUEVO ITEM =====
    const nuevoItem: any = {
      id: Date.now(),
      descripcion: itemForm.descripcion,

      cantidad: Number(itemForm.cantidad),

      costo_base: Number(itemForm.costo_base),

      margen: Number(itemForm.margen),

      marca: itemForm.marca,

      codigo: itemForm.codigo,

      unidad_medida: itemForm.unidad_medida,

      disponibilidad_tipo: itemForm.disponibilidad_tipo,

      disponibilidad_dias: itemForm.disponibilidad_dias,

      garantia_meses: itemForm.garantia_meses,

      producto_externo_id: itemForm.tipo === 'externo' ? itemForm.producto_externo_id : undefined,

      proveedor: primaryProveedor.proveedor,

      link_proveedor: primaryProveedor.link_proveedor,
      proveedores,

      tipo: itemForm.tipo,
      aplica_costos_adicionales: itemForm.aplica_costos_adicionales ?? true,

      stock: 0,

      imagen: itemForm.imagen || null,
      imagen_url: itemForm.imagen_url,
      imagen_path: itemForm.imagen_path,

    };

    // ===== AGREGAR AL STATE =====
    setItems((prev) => [...prev, nuevoItem]);

    setEditingItem(null);
    setEditingItemId(null);

    // ===== UI =====
    setShowItemFormModal(false);

    resetItemForm();

    addNotification({
      message: 'Item agregado',
      type: 'success',
      duration: 4000,
    } as any);
  };

  const handleUpdateItem = () => {
    if (isCotizacionReadOnly) return;

    if (!editingItemId) return;

    if (!itemForm.descripcion || itemForm.cantidad <= 0) {
      addNotification({
        message: 'Completa los datos del item',
        type: 'warning',
        duration: 4000,
      } as any);
      return;
    }

    const proveedores = itemForm.tipo === 'externo' ? normalizeItemProveedores(itemForm) : [];
    const primaryProveedor = getPrimaryProveedor(proveedores);

    setItems((prev) =>
      prev.map((item) =>
        item.id === editingItemId
          ? {
            ...item,
            descripcion: itemForm.descripcion,
            cantidad: Number(itemForm.cantidad),
            costo_base: Number(itemForm.costo_base),
            margen: Number(itemForm.margen),
            marca: itemForm.marca,
            codigo: itemForm.codigo,
            unidad_medida: itemForm.unidad_medida ?? 'UND',
            disponibilidad_tipo: itemForm.disponibilidad_tipo,
            disponibilidad_dias: itemForm.disponibilidad_dias,
            garantia_meses: itemForm.garantia_meses ?? 12,
            producto_externo_id: itemForm.tipo === 'externo' ? itemForm.producto_externo_id : undefined,
            proveedor: primaryProveedor.proveedor,
            link_proveedor: primaryProveedor.link_proveedor,
            proveedores,
            aplica_costos_adicionales: itemForm.aplica_costos_adicionales ?? true,
            stock: 0,
            imagen: itemForm.imagen || "",
            imagen_url: itemForm.imagen_url,
            imagen_path: itemForm.imagen_path,
          }
          : item
      )
    );
    setShowItemFormModal(false);

    setEditingItem(null);

    setEditingItemId(null);

    resetItemForm();

    addNotification({
      message: 'Item actualizado',
      type: 'success',
      duration: 4000,
    } as any);
  };

  const handleDeleteItem = async (itemId: number) => {
    if (isCotizacionReadOnly) return;

    if (!confirm('¿Eliminar item?')) return;

    try {
      setItems(prev =>
        prev.filter(item => item.id !== itemId)
      );
      addNotification({
        message: 'Item eliminado',
        type: 'success',
        duration: 4000,
      } as any);
    } catch (error: any) {
      addNotification({
        message: error?.response?.data?.message || 'Error al eliminar item',
        type: 'error',
        duration: 4000,
      } as any);
    }
  };

  // 🆕 CONTROL DE EXPORTACIÓN
  const handleToggleAplicaCostosAdicionales = (itemId: number, checked: boolean) => {
    if (isCotizacionReadOnly || modoDistribucion === 'POR_CANTIDAD') return;

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, aplica_costos_adicionales: checked }
          : item
      )
    );
  };

  const puedeExportar = () => {
    if (!user?.role) return false;

    return currentEstadoCotizacionId === 4;
  };

  const handleAddCosto = async () => {
    if (isCotizacionReadOnly) return;

    if (!costoForm.descripcion || costoForm.monto <= 0 || !costoForm.tipo) {
      addNotification({
        message: 'Ingresa un monto válido',
        type: 'warning',
        duration: 4000,
      } as any);

      return;
    }

    const nuevoCosto = {
      id: Date.now(),

      tipo: costoForm.tipo,

      cotizacion_id: currentCotizacionId,

      monto: Number(costoForm.monto),

      descripcion: costoForm.descripcion || '',
    };

    setCostos((prev) => [...prev, nuevoCosto]);

    addNotification({
      message: 'Costo agregado',
      type: 'success',
      duration: 4000,
    } as any);

    setCostoForm({
      id: 0,
      cotizacion_id: null,
      tipo: 'viaje',
      monto: 0,
      descripcion: '',
    });

    // setShowCostosModal(false);
  };


  const handleDeleteCosto = async (id: number) => {
    if (isCotizacionReadOnly) return;

    setCostos((prev) =>
      prev.filter((costo) => costo.id !== id)
    );
  };

  //PRUEBA
  const handleItemTypeSelection = (tipo: 'catalogo' | 'personalizado') => {
    if (isCotizacionReadOnly) return;

    setShowItemTypeModal(false);

    if (tipo === 'catalogo') {
      // Abrir selector de productos
      setShowProductModal(true);
      return;
    }

    // PERSONALIZADO
    setItemForm({
      id: 1,
      descripcion: '',
      cantidad: 1,
      costo_base: 0,
      precio_venta: 0,
      costo_unitario: 0,
      costo_total: 0,
      ganancia: 0,
      subtotal: 0,
      imagen: '',
      orden: 1,
      cotizacion_id: currentCotizacionId || 0,
      producto_id: undefined,
      producto_externo_id: undefined,
      estado_cotizacion_item_id: undefined,
      aplica_costos_adicionales: true,
      tipo: 'externo',
      margen: 20,
      marca: '',
      codigo: '',
      unidad_medida: 'UND',
      garantia_meses: 12,
      disponibilidad_tipo: 'stock',
      disponibilidad_dias: 4,
      proveedor: '',
      link_proveedor: '',
      proveedores: [{ nombre: '', link: '', precio: null, notas: '' }],
    });

    setShowItemFormModal(true);
  };

  const handleProductSelection = (producto: any) => {
    if (isCotizacionReadOnly) return;

    setShowProductModal(false);

    const margen =
      producto.precio > 0
        ? ((producto.precio - producto.costo) / producto.precio) * 100
        : 0;

    setItemForm({
      id: 1,
      descripcion: producto.nombre || '',
      cantidad: 1,
      costo_base: producto.costo || 0,
      precio_venta: producto.precio || 0,
      costo_unitario: producto.costo || 0,
      costo_total: producto.costo || 0,
      ganancia: (producto.precio || 0) - (producto.costo || 0),
      subtotal: producto.precio || 0,
      imagen: producto.imagen || producto.imagen_url || '',
      imagen_url: producto.imagen_url || producto.imagen || null,
      imagen_path: producto.imagen_path || producto.imagen || null,
      orden: 1,
      cotizacion_id: currentCotizacionId || 0,
      producto_id: producto.id,
      producto_externo_id: undefined,
      estado_cotizacion_item_id: undefined,
      aplica_costos_adicionales: true,
      tipo: 'catalogo',
      margen: Number(margen.toFixed(2)),
      marca: producto.marca || '',
      codigo: producto.codigo || '',
      unidad_medida: producto.unidad_medida || 'UND',
      garantia_meses: producto.garantia_meses || 12,
      disponibilidad_tipo: producto.disponibilidad_tipo || 'stock',
      disponibilidad_dias: producto.disponibilidad_dias || 4,
      proveedor: '',
      link_proveedor: '',
      proveedores: [],
    });

    addNotification({
      message: `Producto "${producto.nombre}" seleccionado`,
      type: 'success',
      duration: 3000,
    } as any);

    setShowItemFormModal(true);
  };

  const handleExternalSuggestionSelection = (suggestion: ItemForm) => {
    const proveedores = normalizeItemProveedores(suggestion);
    const primaryProveedor = getPrimaryProveedor(proveedores);
    const image = suggestion.imagen || suggestion.imagen_url || suggestion.imagen_path || '';

    setItemForm((prev) => ({
      ...prev,
      descripcion: suggestion.descripcion || prev.descripcion,
      marca: suggestion.marca || '',
      codigo: suggestion.codigo || '',
      costo_base: Number(suggestion.costo_base ?? suggestion.costo_unitario ?? prev.costo_base ?? 0),
      margen: Number(suggestion.margen ?? prev.margen ?? 0),
      producto_id: undefined,
      producto_externo_id: suggestion.producto_externo_id,
      proveedor: primaryProveedor.proveedor,
      link_proveedor: primaryProveedor.link_proveedor,
      proveedores,
      imagen: image,
      imagen_url: suggestion.imagen_url || image || null,
      imagen_path: suggestion.imagen_path || image || null,
      tipo: 'externo',
      aplica_costos_adicionales: suggestion.aplica_costos_adicionales ?? true,
    }));
  };


  const todosItemsAprobados = items.every(item =>
    item.estado_cotizacion_item_id === 2 //  = aprobado
  );

  const handleIntercambiarMoneda = () => {
    if (isCotizacionReadOnly) return;

    const esSoles = currentMonedaId === 1;

    const nuevoCosto = esSoles
      ? itemForm.costo_base / tipoCambioSolesADolar
      : itemForm.costo_base * tipoCambioDolarASoles;

    setItemForm(prev => ({
      ...prev,
      costo_base: Number(nuevoCosto.toFixed(2)),
    }));
  };

  const handleExportarPdf = async () => {
    if (!puedeExportar()) return;

    if (!cotizacion?.id) return;

    setExportandoPdf(true);

    try {
      const { blob, filename } = await exportarCotizacionPdf(cotizacion.id);

      const descargado = await descargarPdfCotizacion(
        filename || 'cotizacion.pdf',
        blob
      );

      if (!descargado) {
        showToast({
          title: 'Descarga cancelada',
          description: 'No se guardó el PDF porque se canceló la selección de ubicación.',
          type: 'info',
          duration: 3000,
        } as any);
        return;
      }

      showToast({
        title: 'PDF exportado correctamente',
        description: 'El documento fue generado con el nombre enviado por el backend.',
        type: 'success',
        duration: 3000,
      } as any);

      setShowExportModal(false);

    } catch (error: any) {
      showToast({
        title: 'Error al exportar PDF',
        description: error?.response?.data?.message || 'No se pudo generar o descargar el PDF.',
        type: 'error',
        duration: 4000,
      } as any);

      console.error(error);
    } finally {
      setExportandoPdf(false);
    }
  };

  // ====== HELPERS ======

  const nombreUsuario = (() => {
    const ejecutivo = (cotizacion?.user || cotizacion?.usuario) as any;
    const nombres = ejecutivo?.profile?.nombres || ejecutivo?.nombres || ejecutivo?.name;
    const apellidos = ejecutivo?.profile?.apellidos || ejecutivo?.apellidos;

    if (nombres) {
      return `${nombres}${apellidos ? ` ${apellidos}` : ''}`;
    }

    return 'Sin asignar';
  })();

  const ventasUsuarios = usuarios.filter((u) =>
    u.roles?.some((role) => role.name?.toUpperCase() === 'VENTAS')
  );

  const nombreDelegado = (() => {
    const delegado = cotizacion?.delegado || usuarios.find((u) => u.id === delegadoId);
    if (!delegado) return 'No delegado';
    const nombres = (delegado as any).nombres || (delegado as any).name || '';
    const apellidos = (delegado as any).apellidos || '';
    const nombreCompleto = `${nombres}${apellidos ? ` ${apellidos}` : ''}`.trim();
    return nombreCompleto || 'Delegado desconocido';
  })();

  const nombreDelegadoCotizacion = (() => {
    const delegado = cotizacion?.delegado_cotizacion || (cotizacion as any)?.delegadoCotizacion || usuarios.find((u) => u.id === currentDelegadoCotizacionId);
    if (!delegado) return 'Sin delegado de edición';
    const nombres = (delegado as any).nombres || (delegado as any).name || '';
    const apellidos = (delegado as any).apellidos || '';
    const nombreCompleto = `${nombres}${apellidos ? ` ${apellidos}` : ''}`.trim();
    return nombreCompleto || 'Delegado desconocido';
  })();

  const resetItemForm = () => {
    setItemForm({
      id: 1,
      descripcion: '',
      cantidad: 1,
      costo_base: 0,
      margen: 20,
      marca: '',
      codigo: '',
      unidad_medida: 'UND',
      garantia_meses: 12,
      disponibilidad_tipo: 'stock',
      disponibilidad_dias: 4,
      precio_venta: 0,
      costo_unitario: 0,
      costo_total: 0,
      ganancia: 0,
      subtotal: 0,
      imagen: '',
      orden: 1,
      cotizacion_id: currentCotizacionId || 0,
      producto_id: undefined,
      producto_externo_id: undefined,
      estado_cotizacion_item_id: undefined,
      aplica_costos_adicionales: true,
      tipo: 'externo' as 'catalogo' | 'externo',
      proveedor: '',
      link_proveedor: '',
      proveedores: [{ nombre: '', link: '', precio: null, notas: '' }],
    });
  };

  //RECALCULO DE ITEMS
  const {
    items: itemsCalculados,
    resumen
  } = useMemo(() => {
    return recalcularItems(
      items,
      costos,
      modoDistribucion,
      currentIncludeIgv
    );
  }, [items, costos, modoDistribucion, currentIncludeIgv]);

  const estadoLabels: Record<number, string> = {
    1: 'Borrador',
    2: 'Enviada',
    3: 'Parcialmente aprobada',
    4: 'Aprobada',
    5: 'Rechazada',
    6: 'OC registrada',
  };

  const comentariosRevision = historial
    .filter((h) => h.comentario?.trim())
    .slice()
    .sort((a, b) => {
      const fechaA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const fechaB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return fechaB - fechaA;
    });

  const getNombreUsuarioHistorial = (movimiento: CotizacionHistorial) => {
    const usuario = movimiento.usuario || movimiento.user;
    return usuario?.nombres || usuario?.email || 'Usuario no identificado';
  };

  // ====== RENDER ======

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // const selectedCliente = clientes.find(c => c.id === clienteId);

  return (
    <div className="p-8 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {cotizacion?.estado_cotizacion_id === 1 && (
              <CheckCircle className="text-green-500 w-6 h-6" />
            )}

            {isEditing ? 'Editar Cotización' : 'Nueva Cotización'}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* FORM INFO GENERAL */}
          <CotizacionGeneralForm
            usuarioNombre={nombreUsuario}
            clienteId={clienteId}
            setClienteId={setClienteId}
            clientes={clientes}
            cotizacion={cotizacion}

            plantillaId={plantillaId}
            setPlantillaId={setPlantillaId}

            monedaId={currentMonedaId}
            setMonedaId={handleSetMonedaId}
            tipoCambioSolesADolar={tipoCambioSolesADolar}
            setTipoCambioSolesADolar={setTipoCambioSolesADolar}
            tipoCambioDolarASoles={tipoCambioDolarASoles}
            setTipoCambioDolarASoles={setTipoCambioDolarASoles}

            titulo={titulo}
            setTitulo={setTitulo}

            formaPago={formaPago}
            setFormaPago={setFormaPago}
            clienteContacto={clienteContacto}
            setClienteContacto={setClienteContacto}

            plataformaId={plataformaId}
            setPlataformaId={setPlataformaId}

            estado_cotizacion_id={estadoCotizacionId}

            modoDistribucion={modoDistribucion}
            setModoDistribucion={setModoDistribucion}

            fecha={fecha}
            setFecha={setFecha}

            validezDias={validezDias}
            setValidezDias={setValidezDias}

            plantillas={plantillas}
            plataformas={plataformas}

            disabled={isCotizacionReadOnly}
          />

          {/* TABLA CON DISPONIBILIDAD */}
          <CotizacionItemsTable
            items={itemsCalculados}
            modoDistribucion={modoDistribucion}
            simboloMoneda={simboloMoneda}
            monedaId={currentMonedaId}
            tipoCambioSolesADolar={tipoCambioSolesADolar}
            estadoCotizacionId={estadoCotizacionId}
            setEstadoCotizacionId={setEstadoCotizacionId}
            onDeleteItem={handleDeleteItem}
            onOpenEdit={handleOpenEditItem}
            onToggleAplicaCostosAdicionales={handleToggleAplicaCostosAdicionales}
            todosItemsAprobados={todosItemsAprobados}
            onApproveAll={() => setEstadoCotizacionId(4)}

            onAddItem={handleOpenNewItem} // 🔥 AQUÍ

            readOnly={isCotizacionReadOnly}
            isOwnCotizacion={canViewGanancia}
          />

        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-6">

          {/* RESUMEN */}
          <CotizacionResumen
            resumen={resumen}
            modoDistribucion={modoDistribucion}
            simboloMoneda={simboloMoneda}
            monedaId={currentMonedaId}
            tipoCambioSolesADolar={tipoCambioSolesADolar}
            items={itemsCalculados}
            isOwnCotizacion={canViewGanancia}
            includeIgv={currentIncludeIgv}
          />

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Delegado de aprobación
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              {nombreDelegado}
            </p>

            {isSuperAdmin && !isViewMode && (
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Seleccionar delegado
                </label>
                <select
                  value={delegadoId ?? ''}
                  onChange={(e) => setDelegadoId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin delegado</option>
                  {ventasUsuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {`${usuario.nombres || (usuario as any).name || 'Usuario'} ${(usuario as any).apellidos || ''}`.trim()}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  El delegado se aplicará al guardar la cotización.
                </p>
              </div>
            )}

            {isSuperAdmin && isViewMode && (
              <p className="text-xs text-gray-500">
                Solo un SUPERADMIN puede cambiar el delegado desde esta vista.
              </p>
            )}
          </div>

          {isEditing && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-3">
                Delegado de edición
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                {nombreDelegadoCotizacion}
              </p>

              {canDelegateCotizacionEdit && (
                <button
                  type="button"
                  onClick={() => setShowDelegacionEdicionModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <UserCheck className="w-5 h-5" /> Delegar edición
                </button>
              )}

              {isCotizacionEditDelegate && (
                <p className="text-xs text-indigo-600 mt-3">
                  Puedes editar esta cotización porque fue delegada a tu usuario.
                </p>
              )}
            </div>
          )}

          {comentariosRevision.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="text-base font-semibold text-amber-900 mb-3">
                Comentarios de revision
              </h2>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {comentariosRevision.map((movimiento) => (
                  <div
                    key={movimiento.id}
                    className="bg-white border border-amber-100 rounded-lg p-3"
                  >
                    <p className="text-xs font-medium text-amber-800">
                      {estadoLabels[movimiento.estado_anterior_id || 0] || 'Sin estado'} {'->'} {estadoLabels[movimiento.estado_nuevo_id] || 'Estado actualizado'}
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2">
                      {movimiento.comentario}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs text-gray-400">
                      <span>Por: {getNombreUsuarioHistorial(movimiento)}</span>
                      {movimiento.created_at && (
                        <span>{new Date(movimiento.created_at).toLocaleString('es-PE')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOTONES */}
          {isViewMode && (
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
              {canSendCotizacionToReview && (
                <button
                  onClick={handleEnviarRevision}
                  disabled={isSendingReview || itemsCalculados.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSendingReview ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" /> Enviar para aprobación
                    </>
                  )}
                </button>
              )}

              {/* Mostrar si es SUPERADMIN O si es VENTAS y es delegado */}
              {canReviewCotizacion && (
                <>
                  <button
                    onClick={handleAprobarCotizacion}
                    disabled={isApproving || isRejecting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Aprobando...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" /> Aprobar Cotizacion
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowRechazoModal(true)}
                    disabled={isApproving || isRejecting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isRejecting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Rechazando...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" /> Rechazar Cotizacion
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Botón para asignar delegado - solo SUPERADMIN */}
              {isSuperAdmin && currentEstadoCotizacionId === 2 && (
                <button
                  onClick={() => setShowDelegacionModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <UserCheck className="w-5 h-5" /> Delegar Aprobación
                </button>
              )}

              <button
                onClick={() => setShowCostosModal(true)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <DollarSign className="w-5 h-5" /> Costos Adicionales
              </button>

              {puedeExportar() && (
                <button
                  onClick={() => setShowExportModal(true)}
                  disabled={itemsCalculados.length === 0}
                  className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${itemsCalculados.length > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  <FileSpreadsheet className="w-5 h-5" /> Exportar Documento
                </button>
              )}
            </div>
          )}
          {!isCotizacionReadOnly && (
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
              <button
                onClick={handleSaveCotizacion}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> Guardar
                  </>
                )}
              </button>

              {canSendCotizacionToReview && (
                <button
                  onClick={handleEnviarRevision}
                  disabled={isSendingReview || saving || itemsCalculados.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSendingReview ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" /> Enviar para aprobación
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setShowCostosModal(true)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <DollarSign className="w-5 h-5" /> Costos Adicionales
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                disabled={!puedeExportar() || itemsCalculados.length === 0}
                className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${puedeExportar()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                <FileSpreadsheet className="w-5 h-5" /> Exportar Documento
              </button>
            </div>
          )}


        </div>
      </div>

      {/* --- MODALES --- */}

      {/* 1. Modal Selección de Tipo de Item */}
      <ItemTypeModal
        open={!isCotizacionReadOnly && showItemTypeModal}
        onClose={() => setShowItemTypeModal(false)}
        onSelect={handleItemTypeSelection}
      />

      {/* 2. Modal Catálogo de Productos */}
      <ProductModal
        open={!isCotizacionReadOnly && showProductModal}
        onClose={() => setShowProductModal(false)}
        productos={productos}
        simboloMoneda={simboloMoneda}
        onSelect={handleProductSelection}
      />

      {/* 3. Modal Formulario de Item */}
      <ItemFormModal
        open={showItemFormModal}
        onClose={() => setShowItemFormModal(false)}
        itemForm={itemForm}
        setItemForm={setItemForm}
        monedaId={currentMonedaId}
        simboloMoneda={simboloMoneda}
        tipoCambioSolesADolar={tipoCambioSolesADolar}
        canViewGanancia={canViewGanancia}
        onSave={handleAddItem}
        onUpdate={() => editingItem && handleUpdateItem()} // 🔥 AQUÍ
        editingItem={editingItem}
        handleIntercambiarMoneda={handleIntercambiarMoneda}
        readOnly={isCotizacionReadOnly}
        externalItemSuggestions={externalItemSuggestions as unknown as ItemForm[]}
        onSelectExternalSuggestion={handleExternalSuggestionSelection}
      />

      {/* 4. Modal Costos Adicionales */}
      <CostosModal
        open={showCostosModal}
        onClose={() => setShowCostosModal(false)}
        costos={costos}
        costoForm={costoForm}
        setCostoForm={setCostoForm}
        onAddCosto={handleAddCosto}
        onDeleteCosto={handleDeleteCosto}
        readOnly={isCotizacionReadOnly}
        simboloMoneda={simboloMoneda}
      />

      {showRechazoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Rechazar cotizacion</h3>
            <textarea
              value={comentarioRechazo}
              onChange={(e) => setComentarioRechazo(e.target.value)}
              className="w-full min-h-28 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-red-500 outline-none"
              placeholder="Comentario del rechazo"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRechazoModal(false);
                  setComentarioRechazo('');
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRechazarCotizacion}
                disabled={isRejecting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Rechazando...
                  </>
                ) : (
                  'Rechazar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Delegación */}
      {showDelegacionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Delegar aprobación</h3>
            <p className="text-sm text-gray-600 mb-4">
              Selecciona el usuario de ventas que será responsable de aprobar esta cotización.
            </p>
            <select
              value={delegadoSelectionId ?? ''}
              onChange={(e) => setDelegadoSelectionId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
            >
              <option value="">Seleccionar delegado</option>
              {ventasUsuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {`${usuario.nombres || (usuario as any).name || 'Usuario'} ${(usuario as any).apellidos || ''}`.trim()}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelegacionModal(false)}
                className="flex-1 px-4 py-3 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignarDelegado}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Asignar delegado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Delegación de Edición */}
      {showDelegacionEdicionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Delegar edición</h3>
            <p className="text-sm text-gray-600 mb-4">
              Selecciona el usuario de ventas que podrá editar y terminar esta cotización.
            </p>
            <select
              value={delegadoCotizacionSelectionId ?? ''}
              onChange={(e) => setDelegadoCotizacionSelectionId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 mb-4"
            >
              <option value="">Seleccionar delegado de edición</option>
              {ventasUsuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {`${usuario.nombres || (usuario as any).name || 'Usuario'} ${(usuario as any).apellidos || ''}`.trim()}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelegacionEdicionModal(false)}
                className="flex-1 px-4 py-3 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelegarEdicionCotizacion}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Delegar edición
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Exportación */}
      <ExportModal
        open={puedeExportar() && showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportPdf={handleExportarPdf}
        exportandoPdf={exportandoPdf}
      />

    </div>
  );
}
