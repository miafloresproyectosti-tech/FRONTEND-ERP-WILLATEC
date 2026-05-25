import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotifications } from '../NotificationContext';
import { useAuth } from '../AuthContext';
import { useLocation } from 'react-router-dom';
import { getClientes, type Cliente } from '../services/cliente.service';
import { getProductos, type Producto} from "../services/producto.service";
import { getPlantillas } from '../services/plantilla.service';
import { getPlataformas } from '../services/plataforma.service';
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
  CheckCircle,
  FileSpreadsheet,
  Loader2,
  DollarSign,
  Check,
  XCircle,
  Send,
} from 'lucide-react';


export function CotizacionDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const isEditing = id !== 'new' && id !== undefined;
  const currentCotizacionId = id ? parseInt(id) : null;
  const [exportandoPdf, setExportandoPdf] = useState(false);

  // ====== STATE MANAGEMENT ======
  const [loading, setLoading] = useState(isEditing);
  const [, setSaving] = useState(false);

  //LOCALIZACIÓN
const location = useLocation();

const isViewMode = location.pathname.includes('/view');

  // Cotización header
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [plantillaId, setPlantillaId] = useState<number>(1);
  const [plataformaId, setPlataformaId] = useState<number>(1);
  const [fecha, setFecha] = useState('');
  const [validezDias, setValidezDias] = useState(30);
  const [plantillas, setPlantillas] = useState<{id:number,nombre:string}[]>([]);
  const [plataformas, setPlataformas] = useState<{id:number,nombre:string}[]>([]);
  const [monedaId, setMonedaId] = useState<number>(1); // 1=PEN, 2=USD
  const [modoDistribucion, setModoDistribucion] = useState<'POR_ITEM' | 'POR_CANTIDAD'>('POR_ITEM');
  const [titulo, setTitulo] = useState('');
  const simboloMoneda = cotizacion?.cliente?.moneda_id === 2 ? '$' : 'S/';

  // Listas
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [items, setItems] = useState<CotizacionItem[]>([]);
  const [costos, setCostos] = useState<CotizacionCostosAdicional[]>([]);
  const [historial, setHistorial] = useState<CotizacionHistorial[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  // UI State
  const [editingItem, setEditingItem] = useState<CotizacionItem | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null> (null);
  const [showItemFormModal, setShowItemFormModal] = useState(false);
  const [showItemTypeModal, setShowItemTypeModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCostosModal, setShowCostosModal] = useState(false);
  const [showRechazoModal, setShowRechazoModal] = useState(false);
  const [comentarioRechazo, setComentarioRechazo] = useState('');

  const [estadoCotizacionId, setEstadoCotizacionId] = useState<number>(1);

  const TIPO_CAMBIO_DOLAR = 3.6; // Ejemplo, en un caso real se debería obtener dinámicamente DE DOLAR A SOLES
  const TIPO_CAMBIO_SOLES = 3.3; // Ejemplo, en un caso real se debería obtener dinámicamente DE SOLES A DOLAR

  useEffect(() => {
    if (!cotizacion) return;

    setEstadoCotizacionId(cotizacion.estado_cotizacion_id);
  }, [cotizacion]);

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
    estado_cotizacion_item_id: undefined,
    tipo: 'personalizado' as 'catalogo' | 'personalizado',
    margen: 20,
    marca: '',
    codigo: '',
    unidad_medida: 'UND',
    garantia_meses: 12,
    disponibilidad_tipo: 'stock' as 'stock' | 'importacion',
    disponibilidad_dias: 4,
    proveedor: '',
    link_proveedor: '',
  });

  useEffect(() => {
  const precioVenta =
    itemForm.costo_base / (1 - itemForm.margen / 100);

  const subtotal =
    precioVenta * itemForm.cantidad;

  const ganancia =
    (precioVenta - itemForm.costo_base) *
    itemForm.cantidad;

  setItemForm(prev => ({
    ...prev,
    precio_venta: Number(precioVenta.toFixed(2)),
    subtotal: Number(subtotal.toFixed(2)),
    ganancia: Number(ganancia.toFixed(2)),
  }));
}, [
  itemForm.costo_base,
  itemForm.margen,
  itemForm.cantidad,
]);

  const [costoForm, setCostoForm] = useState({
    id: 0,
    cotizacion_id: currentCotizacionId || null,
    tipo: 'viaje',
    monto: 0,
    descripcion: '',
  });

  const handleOpenNewItem = () => {
    if (isViewMode) return;

    setEditingItemId(null);

    setEditingItem(null);

    resetItemForm();

    setShowItemFormModal(true);
  };

  const handleOpenEditItem = (item: CotizacionItem) => {
    if (isViewMode) return;

    setEditingItem(item);
  
    setEditingItemId(item.id);

    setItemForm({
      ...item
    });

  setShowItemFormModal(true);
};

  // ====== EFECTOS ======

  // Cargar clientes
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const data = await getClientes();
        setClientes(data);
        if (data.length > 0 && !clienteId) {
          setClienteId(data[0].id);
        }
      } catch (error) {
        addNotification({
          message: 'Error al cargar clientes',
          type: 'error',
          duration: 4000,
        } as any);
      }
    };
    fetchClientes();
  }, []);

  //Cargar Productos:
  useEffect(() => {
    if (isViewMode || !showProductModal || productos.length > 0) return;

    const fetchProductos = async () => {
      try {
        const data = await getProductos();
        setProductos(data);
      } catch (error) {
        addNotification({
          message: 'Error al cargar productos',
          type: 'error',
          duration: 4000,
        } as any);
      }
    };
    fetchProductos();
  }, [isViewMode, showProductModal, productos.length]);

  // Cargar cotización si es edición
  useEffect(() => {
    if (isEditing && currentCotizacionId) {
      loadCotizacion();
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
      setEstadoCotizacionId(data.estado_cotizacion_id);
      setClienteId(data.cliente_id);
      setPlantillaId(data.plantilla_id);
      setPlataformaId(data.plataforma_id);
      setMonedaId(data.cliente?.moneda_id || 1);
      setModoDistribucion(data.modo_distribucion);
      setTitulo(data.titulo);
      setItems(data.items || []);
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
        message: 'Error al cargar cotización',
        type: 'error',
        duration: 4000,
      } as any);
      navigate('/cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobarCotizacion = async () => {
    const cotizacionId = cotizacion?.id || currentCotizacionId;
    if (!cotizacionId) return;

  try {
    const data = await aprobarCotizacion(cotizacionId);
    const historialApi = await getCotizacionHistorial(cotizacionId);

    setEstadoCotizacionId(4);
    setCotizacion(data);
    setHistorial(historialApi);

    addNotification({
      message: 'Cotización aprobada',
      type: 'success',
      duration: 3000,
    } as any);

  } catch (error) {
    addNotification({
      message: 'Error al aprobar',
      type: 'error',
      duration: 4000,
    } as any);
  }
  };

  const handleRechazarCotizacion = async () => {
    const cotizacionId = cotizacion?.id || currentCotizacionId;
    if (!cotizacionId) return;

    const comentario = comentarioRechazo.trim();

    if (!comentario) {
      addNotification({
        message: 'Ingresa un comentario para rechazar',
        type: 'warning',
        duration: 4000,
      } as any);
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

      addNotification({
        message: 'CotizaciÃ³n rechazada',
        type: 'success',
        duration: 3000,
      } as any);
    } catch (error: any) {
      addNotification({
        message: error?.response?.data?.message || 'Error al rechazar',
        type: 'error',
        duration: 4000,
      } as any);
    }
  };

  const buildCotizacionPayload = (estadoId = estadoCotizacionId) => {
    // NO enviar cotizacion_id en items - el backend lo asigna automáticamente del URL
    const itemsLimpios = items.map(({ cotizacion_id, ...item }) => item);

    return {
      id: currentCotizacionId,
      cliente_id: clienteId ?? 0,
      plantilla_id: plantillaId,
      plataforma_id: plataformaId,
      moneda_id: monedaId,
      modo_distribucion: modoDistribucion,
      titulo: titulo,
      validez_dias: validezDias,
      estado_cotizacion_id: estadoId,
      items: itemsLimpios,
      costos,
      costos_adicionales: costos,
    };
  };

  // const handleEnviarAprobacion = async () => {
  //   const cotizacionId = cotizacion?.id || currentCotizacionId;
  //   if (!cotizacionId) return;

  //   try {
  //     await updateCotizacion(cotizacionId, buildCotizacionPayload(estadoCotizacionId));
  //     const data = await enviarCotizacionAprobacion(cotizacionId);
  //     const historialApi = await getCotizacionHistorial(cotizacionId);

  //     setCotizacion(data);
  //     setEstadoCotizacionId(2);
  //     setHistorial(historialApi);

  //     addNotification({
  //       message: 'CotizaciÃ³n enviada a aprobaciÃ³n',
  //       type: 'success',
  //       duration: 3000,
  //     } as any);
  //   } catch (error: any) {
  //     addNotification({
  //       message: error?.response?.data?.message || 'Error al enviar a aprobaciÃ³n',
  //       type: 'error',
  //       duration: 4000,
  //     } as any);
  //   }
  // };

  const handleSaveCotizacion = async () => {
    if (isViewMode) return;

    if (!clienteId || !plantillaId) {
      addNotification({
        message: 'Seleccione cliente y plantilla',
        type: 'warning',
        duration: 4000,
      } as any);
      return;
    }

    const payload = buildCotizacionPayload();

    setSaving(true);
    try {
      if (isEditing && currentCotizacionId ) {
        // Actualizar
        await updateCotizacion(currentCotizacionId, payload);
        addNotification({
          message: 'Cotización actualizada',
          type: 'success',
          duration: 4000,
        } as any);
      } else {
        // Crear
        const newCotizacion = await createCotizacion(payload);
        addNotification({
          message: 'Cotización creada',
          type: 'success',
          duration: 4000,
        } as any);
        setCotizacion(newCotizacion);
      }
      navigate('/cotizaciones');
    } catch (error: any) {
      addNotification({
        message: error?.response?.data?.message || 'Error al guardar',
        type: 'error',
        duration: 4000,
      } as any);
    } finally {
      setSaving(false);
    }
  };

const handleAddItem = async () => {
    if (isViewMode) return;

    if (!itemForm.descripcion || itemForm.cantidad <= 0) {
      addNotification({
        message: 'Completa los datos del item',
        type: 'warning',
        duration: 4000,
      } as any);
    
      return;
    }
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

      proveedor: itemForm.proveedor,

      link_proveedor: itemForm.link_proveedor,

      tipo: itemForm.tipo,

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
    if (isViewMode) return;

    if (!editingItemId) return;

    if (!itemForm.descripcion || itemForm.cantidad <= 0) {
      addNotification({
        message: 'Completa los datos del item',
        type: 'warning',
        duration: 4000,
      } as any);
      return;
    }

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
          proveedor: itemForm.proveedor,
          link_proveedor: itemForm.link_proveedor,
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
    if (isViewMode) return;

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
  const puedeExportar = () => {
    if (!user?.role) return false;
    
    if (user.role === 'SUPERADMIN') return true;
    
    if (user.role === 'VENTAS') {
      return estadoCotizacionId === 4;
    }
    
    return true;
  };

  const handleAddCosto = async () => {
    if (isViewMode) return;

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

  setShowCostosModal(false);
  };


  const handleDeleteCosto = async (id: number) => {
    if (isViewMode) return;

    setCostos((prev) =>
      prev.filter((costo) => costo.id !== id)
    );
  };

  //PRUEBA
  const handleItemTypeSelection = (tipo: 'catalogo' | 'personalizado') => {
    if (isViewMode) return;

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
      estado_cotizacion_item_id: undefined,
      tipo: 'personalizado',
      margen: 20,
      marca: '',
      codigo: '',
      unidad_medida: 'UND',
      garantia_meses: 12,
      disponibilidad_tipo: 'stock',
      disponibilidad_dias: 4,
      proveedor: '',
      link_proveedor: ''
    });

    setShowItemFormModal(true);
  };

  const handleProductSelection = (producto: any) => {
  if (isViewMode) return;

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
    imagen: producto.imagen || '',
    orden: 1,
    cotizacion_id: currentCotizacionId || 0,
    producto_id: producto.id,
    estado_cotizacion_item_id: undefined,
    tipo: 'catalogo',
    margen: Number(margen.toFixed(2)),
    marca: producto.marca || '',
    codigo: producto.codigo || '',
    unidad_medida: producto.unidad_medida || 'UND',
    garantia_meses: producto.garantia_meses || 12,
    disponibilidad_tipo: producto.disponibilidad_tipo || 'stock',
    disponibilidad_dias: producto.disponibilidad_dias || 4,
    proveedor: '',
    link_proveedor: ''
  });

  addNotification({
    message: `Producto "${producto.nombre}" seleccionado`,
    type: 'success',
    duration: 3000,
  } as any);

  setShowItemFormModal(true);
};

// const actualizarMargenItem = (
//   id: number,
//   nuevoMargen: number
// ) => {
//   setItems(prev =>
//     prev.map(item => {
//       if (item.id !== id) return item;

//       const costo = item.costo_total || 0;

//       const nuevoPrecio =
//         costo / (1 - nuevoMargen / 100);

//       const subtotal =
//         nuevoPrecio * item.cantidad;

//       const ganancia =
//         (nuevoPrecio - costo) * item.cantidad;

//       return {
//         ...item,
//         margen: nuevoMargen,
//         precio_venta: Number(nuevoPrecio.toFixed(2)),
//         subtotal: Number(subtotal.toFixed(2)),
//         ganancia: Number(ganancia.toFixed(2)),
//       };
//     })
//   );
// };

const todosItemsAprobados =   items.every(item => 
    item.estado_cotizacion_item_id === 2 //  = aprobado
);

const handleIntercambiarMoneda = () => {
  if (isViewMode) return;

  const esSoles = monedaId === 1;

  const nuevoCosto = esSoles
    ? itemForm.costo_base / TIPO_CAMBIO_SOLES
    : itemForm.costo_base * TIPO_CAMBIO_DOLAR;

  setItemForm(prev => ({
    ...prev,
    costo_base: Number(nuevoCosto.toFixed(2)),
  }));
};

const handleExportarPdf = async () => {
  if (isViewMode) return;

  if (!cotizacion?.id) return;

  setExportandoPdf(true);

  try {
    const blob = await exportarCotizacionPdf(cotizacion.id);

  descargarPdfCotizacion(
    cotizacion.numero || cotizacion.id.toString(),
    blob
  );

  addNotification({
    message: 'PDF exportado correctamente',
    type: 'success',
    duration: 3000,
  } as any);

  setShowExportModal(false);

  } catch (error: any) {
    addNotification({
      message: 'Error al exportar PDF',
      type: 'error',
      duration: 4000,
  } as any);

  console.error(error);
  }finally {
    setExportandoPdf(false);
  }
};

// const refreshCotizacion = async () => {
//   if (!currentCotizacionId) return;

//   const data = await getCotizacion(currentCotizacionId);
//   setCotizacion(data);
//   setItems(data.items || []);
//   setCostos(data.costosAdicionales || []);
//   // 🔥 sincronizar header
//   setClienteId(data.cliente_id);
//   setPlantillaId(data.plantilla_id);
//   setPlataformaId(data.plataforma_id);
//   setMonedaId(data.cliente?.moneda_id || 1);
//   setModoDistribucion(data.modo_distribucion);
//   setTitulo(data.titulo);

//   // 🔥 sincronizar estado UI
//   setEstadoCotizacionId(data.estado_cotizacion_id || 1);
// };

// ====== HELPERS ======

const nombreUsuario =
  cotizacion?.user?.profile
    ? `${cotizacion.user.profile.nombres} ${cotizacion.user.profile.apellidos}`
    : cotizacion?.user?.name || 'Sin asignar';

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
      estado_cotizacion_item_id: undefined,
      tipo: 'personalizado' as 'catalogo' | 'personalizado',
      proveedor: '',
      link_proveedor: ''
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
      modoDistribucion
    );
}, [items, costos, modoDistribucion]);

const estadoLabels: Record<number, string> = {
  1: 'Borrador',
  2: 'Enviada',
  3: 'Parcialmente aprobada',
  4: 'Aprobada',
  5: 'Rechazada',
  6: 'OC registrada',
};

const comentariosRevision = historial.filter((h) => h.comentario?.trim());

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
            // usuarioNombre={nombreUsuario}
            clienteId={clienteId}
            setClienteId={setClienteId}
            clientes={clientes}
            cotizacion={cotizacion}

            plantillaId={plantillaId}
            setPlantillaId={setPlantillaId}

            monedaId={monedaId}
            setMonedaId={setMonedaId}
            
            titulo={titulo}
            setTitulo={setTitulo}

            plataformaId={plataformaId}
            setPlataformaId={setPlataformaId}

            estado_cotizacion_id={estadoCotizacionId}
            setEstadoCotizacionId={setEstadoCotizacionId}

            modoDistribucion={modoDistribucion}
            setModoDistribucion={setModoDistribucion}

            fecha={fecha}
            setFecha={setFecha}

            validezDias={validezDias}
            setValidezDias={setValidezDias}

            plantillas={plantillas}
            plataformas={plataformas}

            disabled={isViewMode}
          />

          {/* TABLA CON DISPONIBILIDAD */}
          <CotizacionItemsTable
            items={itemsCalculados}
            simboloMoneda={simboloMoneda}
            estadoCotizacionId={estadoCotizacionId}
            setEstadoCotizacionId={setEstadoCotizacionId}
            onDeleteItem={handleDeleteItem}
            onOpenEdit={handleOpenEditItem}
            todosItemsAprobados={todosItemsAprobados}
            onApproveAll={() => setEstadoCotizacionId(4)}

            onAddItem={handleOpenNewItem} // 🔥 AQUÍ

            readOnly={isViewMode}
          />

        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-6">

          {/* RESUMEN */}
          <CotizacionResumen
            resumen={resumen}
            simboloMoneda={simboloMoneda}
            items={itemsCalculados}
          />

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
              {user?.role === 'SUPERADMIN' && estadoCotizacionId === 2 && (
                <button
                  onClick={handleAprobarCotizacion}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Check className="w-5 h-5" /> Aprobar Cotizacion
                </button>
              )}
              {user?.role === 'SUPERADMIN' && estadoCotizacionId === 2 && (
                <button
                  onClick={() => setShowRechazoModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <XCircle className="w-5 h-5" /> Rechazar Cotizacion
                </button>
              )}

              <button
                onClick={() => setShowCostosModal(true)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <DollarSign className="w-5 h-5" /> Costos Adicionales
              </button>
            </div>
          )}
          {!isViewMode && (
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
            <button
              onClick={handleSaveCotizacion}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Save className="w-5 h-5" /> Guardar
            </button>

            {/* {[1, 5].includes(estadoCotizacionId) && currentCotizacionId && (
              <button
                onClick={handleEnviarAprobacion}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Send className="w-5 h-5" />
                {estadoCotizacionId === 5 ? 'Reenviar a aprobacion' : 'Enviar a aprobacion'}
              </button>
            )} */}

            <button
              onClick={() => setShowCostosModal(true)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <DollarSign className="w-5 h-5" /> Costos Adicionales
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              disabled={!puedeExportar() || items.length === 0}
              className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
                puedeExportar()
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
        open={!isViewMode && showItemTypeModal}
        onClose={() => setShowItemTypeModal(false)}
        onSelect={handleItemTypeSelection}
      />

      {/* 2. Modal Catálogo de Productos */}
      <ProductModal
        open={!isViewMode && showProductModal}
        onClose={() => setShowProductModal(false)}
        productos={productos}
        simboloMoneda={simboloMoneda}
        onSelect={handleProductSelection}
      />

      {/* 3. Modal Formulario de Item */}
      <ItemFormModal
        open={!isViewMode && showItemFormModal}
        onClose={() => setShowItemFormModal(false)}
        itemForm={itemForm}
        setItemForm={setItemForm}
        monedaId={monedaId}
        simboloMoneda={simboloMoneda}
        onSave={handleAddItem}
        onUpdate={() =>editingItem && handleUpdateItem()} // 🔥 AQUÍ
        editingItem={editingItem}
        handleIntercambiarMoneda={handleIntercambiarMoneda}
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
        readOnly={isViewMode}
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
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Exportación */}
      <ExportModal
        open={!isViewMode && showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportPdf={handleExportarPdf}
        exportandoPdf={exportandoPdf}
        />
        
    </div>
  );
}
