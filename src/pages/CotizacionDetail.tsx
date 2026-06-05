import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotifications } from '../NotificationContext';
import { useAuth } from '../AuthContext';
import { useLocation } from 'react-router-dom';
import { getClientes, type Cliente } from '../services/cliente.service';
import { getProductos, type Producto} from "../services/producto.service";
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
  UserCheck,
} from 'lucide-react';


export function CotizacionDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast ,addNotification } = useNotifications();

  const isEditing = id !== 'new' && id !== undefined;
  const currentCotizacionId = id ? parseInt(id) : null;
  const [exportandoPdf, setExportandoPdf] = useState(false);

  // ====== STATE MANAGEMENT ======
  const [loading, setLoading] = useState(isEditing);
  const [, setSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

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
  const [plantillas, setPlantillas] = useState<{id:number,nombre:string, incluye_igv: Boolean}[]>([]);
  const [plataformas, setPlataformas] = useState<{id:number,nombre:string}[]>([]);
  const [monedaId, setMonedaId] = useState<number>(1); // 1=PEN, 2=USD
  const [tipoCambioSolesADolar, setTipoCambioSolesADolar] = useState<number>(3.3);
  const [tipoCambioDolarASoles, setTipoCambioDolarASoles] = useState<number>(3.5);
  const [modoDistribucion, setModoDistribucion] = useState<'POR_ITEM' | 'POR_CANTIDAD'>('POR_ITEM');
  const [titulo, setTitulo] = useState('');
  const simboloMoneda = monedaId === 2 ? '$' : 'S/';

  // Listas
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [items, setItems] = useState<CotizacionItem[]>([]);
  const [costos, setCostos] = useState<CotizacionCostosAdicional[]>([]);
  const [historial, setHistorial] = useState<CotizacionHistorial[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [usuarios, setUsuarios] = useState<ApiUser[]>([]);

  // Estado de delegación
  const [delegadoId, setDelegadoId] = useState<number | null>(null);
  const [delegadoSelectionId, setDelegadoSelectionId] = useState<number | null>(null);
  const [showDelegacionModal, setShowDelegacionModal] = useState(false);

  useEffect(() => {
    if (showDelegacionModal) {
      setDelegadoSelectionId(delegadoId);
    }
  }, [showDelegacionModal, delegadoId]);

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

  // tipoCambio es ahora estado editable por el usuario

  // Verificar si el usuario actual es el propietario de la cotización
  const isOwnCotizacion = cotizacion && user ? cotizacion.user_id === user.id : true;

  useEffect(() => {
    if (!cotizacion) return;

    setEstadoCotizacionId(cotizacion.estado_cotizacion_id);
  }, [cotizacion]);

  const handleSetMonedaId = (id: number) => {
    if (id === monedaId) return;
    if (isViewMode) { setMonedaId(id); return; }

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

    setShowItemTypeModal(true);
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
          title: 'Error',
          description: 'Error al cargar clientes',
          type: 'error',
          duration: 4000,
        } as any);
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
    if (isViewMode || !showProductModal || productos.length > 0) return;

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
      setEstadoCotizacionId(data.estado_cotizacion_id);
      setClienteId(data.cliente_id);
      setPlantillaId(data.plantilla_id);
      setPlataformaId(data.plataforma_id);
      setMonedaId(data.cliente?.moneda_id || 1);
      setModoDistribucion(data.modo_distribucion);
      setTitulo(data.titulo);
      setDelegadoId(data.delegado_id || null);
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
        title: 'Error',
        description: 'Error al cargar cotizacion',
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
    if (isApproving || isRejecting) return; // Prevenir doble click y acciones cruzadas

    // Si la cotización fue delegada, solo el delegado puede aprobarla
    if (cotizacion?.delegado_id && user?.id !== cotizacion.delegado_id) {
      showToast({
        title: 'Error',
        description: 'No estás autorizado: esta cotización fue delegada a otro usuario',
        message: 'No estás autorizado: esta cotización fue delegada a otro usuario',
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
      const approvedAt = new Date().toLocaleString('es-PE');
      const targetUserId = cotizacion?.user?.id || cotizacion?.user_id;

      showToast({
        title: 'Cotización aprobada',
        description: `Aprobada por ${approverName} a las ${approvedAt}`,
        type: 'success',
        icon: 'CheckCircle',
        route: `/cotizaciones/${cotizacionId}/view`,
      } as any);

      if (targetUserId) {
        addNotification({
          title: 'Tu cotización fue aprobada',
          description: `La cotización ${cotizacionId} fue aprobada por ${approverName} a las ${approvedAt}`,
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
    // Si la cotización fue delegada, solo el delegado puede rechazarla
    if (cotizacion?.delegado_id && user?.id !== cotizacion.delegado_id) {
      showToast({
        title: 'Error',
        description: 'No estás autorizado: esta cotización fue delegada a otro usuario',
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
      const rejectedAt = new Date().toLocaleString('es-PE');
      const targetUserId = cotizacion?.user?.id || cotizacion?.user_id;

      showToast({
        title: 'Cotización rechazada',
        description: `Rechazada por ${approverName} a las ${rejectedAt}`,
        type: 'warning',
        icon: 'MessageCircle',
        route: `/cotizaciones/${cotizacionId}/view`,
      } as any);

      if (targetUserId) {
        addNotification({
          title: 'Tu cotización fue rechazada',
          description: `La cotización ${cotizacionId} fue rechazada por ${approverName} a las ${rejectedAt}`,
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

  const buildCotizacionPayload = (estadoId = estadoCotizacionId) => {
    // NO enviar cotizacion_id en items - el backend lo asigna automáticamente del URL
    const itemsLimpios = items.map(({ cotizacion_id, ...item }) => item);

    const payload: any = {
      id: currentCotizacionId,
      cliente_id: clienteId ?? 0,
      plantilla_id: plantillaId,
      plataforma_id: plataformaId,
      moneda_id: monedaId,
      modo_distribucion: modoDistribucion,
      titulo: titulo,
      tipo_cambio_soles_a_usd: tipoCambioSolesADolar,
      tipo_cambio_usd_a_soles: tipoCambioDolarASoles,
      validez_dias: validezDias,
      estado_cotizacion_id: estadoId,
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
    if (isViewMode) return;

    if (!clienteId || !plantillaId) {
      showToast({
        title: 'Datos incompletos',
        description: 'Seleccione cliente y plantilla',
        type: 'warning',
      });
      return;
    }

    const payload = buildCotizacionPayload();

    setSaving(true);
    try {
      if (isEditing && currentCotizacionId ) {
        // Actualizar
        const updated = await updateCotizacion(currentCotizacionId, payload);
        // sincronizar estado local con respuesta del servidor
        setCotizacion(updated);
        setDelegadoId(updated.delegado_id || null);
        showToast({
          title: 'Cotización actualizada',
          description: 'La cotización ha sido actualizada exitosamente.',
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

      stock: 0,

      imagen: itemForm.imagen || null,

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
          stock: 0,
          imagen: itemForm.imagen || null,
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

  // setShowCostosModal(false);
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
      tipo: 'externo',
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


const todosItemsAprobados =   items.every(item => 
    item.estado_cotizacion_item_id === 2 //  = aprobado
);

const handleIntercambiarMoneda = () => {
  if (isViewMode) return;

  const esSoles = monedaId === 1;

  const nuevoCosto = esSoles
    ? itemForm.costo_base / tipoCambioSolesADolar
    : itemForm.costo_base * tipoCambioDolarASoles;

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
      tipo: 'externo' as 'catalogo' | 'externo',
      proveedor: '',
      link_proveedor: ''
    });
  };

//RECALCULO DE ITEMS
const {
  items: itemsCalculados,
  resumen
} = useMemo(() => {
    const plantilla = plantillas.find(p => p.id === plantillaId);
    const includeIgv = Boolean((plantilla as any)?.incluye_igv);

    return recalcularItems(
      items,
      costos,
      modoDistribucion,
      includeIgv
    );
}, [items, costos, modoDistribucion, plantillaId, plantillas]);

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

            monedaId={monedaId}
            setMonedaId={handleSetMonedaId}
            tipoCambioSolesADolar={tipoCambioSolesADolar}
            setTipoCambioSolesADolar={setTipoCambioSolesADolar}
            tipoCambioDolarASoles={tipoCambioDolarASoles}
            setTipoCambioDolarASoles={setTipoCambioDolarASoles}
            
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
            isOwnCotizacion={isOwnCotizacion}
          />

        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-6">

          {/* RESUMEN */}
          <CotizacionResumen
            resumen={resumen}
            simboloMoneda={simboloMoneda}
            items={itemsCalculados}
            isOwnCotizacion={isOwnCotizacion}
          />

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Delegado de aprobación
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              {nombreDelegado}
            </p>

            {user?.role === 'SUPERADMIN' && !isViewMode && (
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

            {user?.role === 'SUPERADMIN' && isViewMode && (
              <p className="text-xs text-gray-500">
                Solo un SUPERADMIN puede cambiar el delegado desde esta vista.
              </p>
            )}
          </div>

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
              {/* Mostrar si es SUPERADMIN O si es VENTAS y es delegado */}
                  {estadoCotizacionId === 2 && ((delegadoId ? delegadoId === user?.id : user?.role === 'SUPERADMIN')) && (
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
              {user?.role === 'SUPERADMIN' && estadoCotizacionId === 2 && (
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
