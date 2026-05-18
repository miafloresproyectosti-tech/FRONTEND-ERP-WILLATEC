import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotifications } from '../NotificationContext';
import { useAuth } from '../AuthContext';
import { getClientes, type Cliente } from '../services/cliente.service';;
import { getProductos, type Producto} from "../services/producto.service";
import {
  getCotizacion,
  createCotizacion,
  updateCotizacion,
  addItem,
  updateItem,
  deleteItem,
  addCosto,
  deleteCosto,
  recalcularCotizacion,
  exportarCotizacionPdf,
  descargarPdfCotizacion,
  type Cotizacion,
  type CotizacionItem,
  type CotizacionCostosAdicional,
} from '../services/cotizacion.service';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  X,
  Loader2,
  DollarSign,
  Package,
  ArrowLeftRight,
  Truck,
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
  const [saving, setSaving] = useState(false);

  // Cotización header
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [plantillaId, setPlantillaId] = useState<number | null>(1);
  const [monedaId, setMonedaId] = useState<string>('1'); // 1=PEN, 2=USD
  const [modoDistribucion, setModoDistribucion] = useState<'POR_ITEM' | 'POR_CANTIDAD'>('POR_ITEM');
  const [titulo, setTitulo] = useState('');
  const simboloMoneda = cotizacion?.cliente?.moneda_id === 2 ? '$' : 'S/';

  // Listas
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [items, setItems] = useState<CotizacionItem[]>([]);
  const [costos, setCostos] = useState<CotizacionCostosAdicional[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  // UI State
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCostoForm, setShowCostoForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CotizacionItem | null>(null);
  const [showItemFormModal, setShowItemFormModal] = useState(false);
  const [showItemTypeModal, setShowItemTypeModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCostosModal, setShowCostosModal] = useState(false);

  const [estado, setEstado] = useState('');

  const TIPO_CAMBIO_DOLAR = 3.6; // Ejemplo, en un caso real se debería obtener dinámicamente DE DOLAR A SOLES
  const TIPO_CAMBIO_SOLES = 3.3; // Ejemplo, en un caso real se debería obtener dinámicamente DE SOLES A DOLAR

  useEffect(() => {
    if (!cotizacion) return;

    const nuevoEstado =
      cotizacion?.estado_cotizacion_id === 1
      ? 'borrador'
      : cotizacion?.estado_cotizacion_id === 2
      ? 'enviada'
      : cotizacion?.estado_cotizacion_id === 3
      ? 'parcialmente_aprobada'
      : cotizacion?.estado_cotizacion_id === 4
      ? 'aprobada'
      : cotizacion?.estado_cotizacion_id === 5
      ? 'oc_registrada'
      : '';
    setEstado(nuevoEstado);
  }, [cotizacion]);

  // Formularios
  const [itemForm, setItemForm] = useState({
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
    tipo: 'flete',
    monto: 0,
  });

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
  }, []);

  // Cargar cotización si es edición
  useEffect(() => {
    if (isEditing && currentCotizacionId) {
      loadCotizacion();
    }
  }, [isEditing, currentCotizacionId]);

  // ====== FUNCIONES API ======

  const loadCotizacion = async () => {
    if (!currentCotizacionId) return;
    try {
      setLoading(true);
      const data = await getCotizacion(currentCotizacionId);
      setCotizacion(data);
      setClienteId(data.cliente_id);
      setPlantillaId(data.plantilla_id);
      setMonedaId(data.cliente?.moneda_id?.toString() || '1');
      setModoDistribucion(data.modo_distribucion);
      setTitulo(data.titulo);
      setItems(data.items || []);
      setCostos(data.costosAdicionales || []);
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

  const handleSaveCotizacion = async () => {
    if (!clienteId || !plantillaId) {
      addNotification({
        message: 'Seleccione cliente y plantilla',
        type: 'warning',
        duration: 4000,
      } as any);
      return;
    }

    setSaving(true);
    try {
      if (isEditing && currentCotizacionId && cotizacion) {
        // Actualizar
        await updateCotizacion(currentCotizacionId, {
          cliente_id: clienteId,
          plantilla_id: plantillaId,
          moneda_id: monedaId,
          modo_distribucion: modoDistribucion,
        });
        addNotification({
          message: 'Cotización actualizada',
          type: 'success',
          duration: 4000,
        } as any);
      } else {
        // Crear
        const newCotizacion = await createCotizacion({
          cliente_id: clienteId,
          plantilla_id: plantillaId,
          titulo: titulo || `Cotización ${new Date().toLocaleDateString()}`,
          modo_distribucion: modoDistribucion,
          moneda_id: Number(monedaId),
        });
        addNotification({
          message: 'Cotización creada',
          type: 'success',
          duration: 4000,
        } as any);
        setCotizacion(newCotizacion);
      }
      navigate(`/cotizaciones/${currentCotizacionId || cotizacion?.id}`);
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
    if (!cotizacion || !itemForm.descripcion || itemForm.cantidad <= 0) {
      addNotification({
        message: 'Completa los datos del item',
        type: 'warning',
        duration: 4000,
      } as any);
      return;
    }

    try {
      await addItem(cotizacion.id, {
        descripcion: itemForm.descripcion,
        cantidad: itemForm.cantidad,
        costo_base: itemForm.costo_base,
        margen: itemForm.margen,
        marca: itemForm.marca,
        codigo: itemForm.codigo,
        unidad_medida: itemForm.unidad_medida,
        disponibilidad_tipo: itemForm.disponibilidad_tipo,
        disponibilidad_dias: itemForm.disponibilidad_dias,
        garantia_meses: itemForm.garantia_meses,}
      );
      addNotification({
        message: 'Item agregado',
        type: 'success',
        duration: 4000,
      } as any);

      setShowItemForm(false);

      resetItemForm();

      await refreshCotizacion();

      await loadCotizacion(); // Recargar

    } catch (error: any) {
      addNotification({
        message: error?.response?.data?.message || 'Error al agregar item',
        type: 'error',
        duration: 4000,
      } as any);
    }
  };

  const handleUpdateItem = async (itemId: number) => {
    if (!cotizacion) return;
    try {
      await updateItem(itemId, itemForm as any);
      addNotification({
        message: 'Item actualizado',
        type: 'success',
        duration: 4000,
      } as any);
      setShowItemForm(false);
      setEditingItem(null);
      resetItemForm();
      await loadCotizacion();
    } catch (error: any) {
      addNotification({
        message: error?.response?.data?.message || 'Error al actualizar item',
        type: 'error',
        duration: 4000,
      } as any);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!cotizacion) return;
    if (!confirm('¿Eliminar item?')) return;

    try {
      await deleteItem(itemId);
      addNotification({
        message: 'Item eliminado',
        type: 'success',
        duration: 4000,
      } as any);
      await loadCotizacion();
    } catch (error: any) {
      addNotification({
        message: error?.response?.data?.message || 'Error al eliminar item',
        type: 'error',
        duration: 4000,
      } as any);
    }
  };

  // 🆕 FUNCIÓN PARA ICONO DE DISPONIBILIDAD
  const IconoDisponibilidad = ({ tipo }: { tipo: 'stock' | 'importacion' }) => {
    return tipo === 'stock' ? (
      <Package className="w-4 h-4 text-green-600" />
    ) : (
      <Truck className="w-4 h-4 text-orange-600" />
    );
  };

  // 🆕 CONTROL DE EXPORTACIÓN
  const puedeExportar = () => {
    if (!user?.role) return false;
    
    if (user.role === 'SUPERADMIN') return true;
    
    if (user.role === 'VENTAS') {
      return estado === 'aprobada';
    }
    
    return true;
  };

  const handleAddCosto = async () => {
    // Este handler no se usa actualmente desde la UI.
    // Los costos adicionales se gestionan por backend en el modal de "Costos Adicionales".
    // Se conserva para futuras mejoras.
    if (!cotizacion || costoForm.monto <= 0) {
      addNotification({
        message: 'Ingresa un monto válido',
        type: 'warning',
        duration: 4000,
      } as any);
      return;
    }

    try {
      await addCosto(cotizacion.id, costoForm);
      addNotification({
        message: 'Costo agregado',
        type: 'success',
        duration: 4000,
      } as any);
      setShowCostoForm(false);
      setCostoForm({ tipo: 'flete', monto: 0 });
      await loadCotizacion();
    } catch (error: any) {
      addNotification({
        message: error?.response?.data?.message || 'Error al agregar costo',
        type: 'error',
        duration: 4000,
      } as any);
    }
  };


  const handleDeleteCosto = async (costoId: number) => {
    if (!cotizacion) return;
    if (!confirm('¿Eliminar costo?')) return;

    try {
      await deleteCosto(costoId);
      addNotification({
        message: 'Costo eliminado',
        type: 'success',
        duration: 4000,
      } as any);
      await loadCotizacion();
    } catch (error: any) {
      addNotification({
        message: error?.response?.data?.message || 'Error al eliminar costo',
        type: 'error',
        duration: 4000,
      } as any);
    }
  };

  //PRUEBA
  const handleItemTypeSelection = (tipo: 'catalogo' | 'personalizado') => {
    setShowItemTypeModal(false);

    if (tipo === 'catalogo') {
      // Abrir selector de productos
      setShowProductModal(true);
      return;
    }

    // PERSONALIZADO
    setItemForm({
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
    });

    setShowItemFormModal(true);
  };

  const handleProductSelection = (producto: any) => {
  setShowProductModal(false);

  const margen =
    producto.precio > 0
      ? ((producto.precio - producto.costo) / producto.precio) * 100
      : 0;

  setItemForm({
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
  });

  addNotification({
    message: `Producto "${producto.nombre}" seleccionado`,
    type: 'success',
    duration: 3000,
  } as any);

  setShowItemFormModal(true);
};

const actualizarMargenItem = (
  id: number,
  nuevoMargen: number
) => {
  setItems(prev =>
    prev.map(item => {
      if (item.id !== id) return item;

      const costo = item.costo_total || 0;

      const nuevoPrecio =
        costo / (1 - nuevoMargen / 100);

      const subtotal =
        nuevoPrecio * item.cantidad;

      const ganancia =
        (nuevoPrecio - costo) * item.cantidad;

      return {
        ...item,
        margen: nuevoMargen,
        precio_venta: Number(nuevoPrecio.toFixed(2)),
        subtotal: Number(subtotal.toFixed(2)),
        ganancia: Number(ganancia.toFixed(2)),
      };
    })
  );
};

const todosItemsAprobados =   items.every(item => 
    item.estado_cotizacion_item_id === 2 //  = aprobado
);

const handleIntercambiarMoneda = () => {
  const esSoles = monedaId === '1';

  const nuevoCosto = esSoles
    ? itemForm.costo_base / TIPO_CAMBIO_SOLES
    : itemForm.costo_base * TIPO_CAMBIO_DOLAR;

  setItemForm(prev => ({
    ...prev,
    costo_base: Number(nuevoCosto.toFixed(2)),
  }));
};

const handleExportarPdf = async () => {
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

const refreshCotizacion = async () => {
  if (!currentCotizacionId) return;

  const data = await getCotizacion(currentCotizacionId);
  setCotizacion(data);
  setItems(data.items || []);
  setCostos(data.costosAdicionales || []);
  // 🔥 sincronizar header
  setClienteId(data.cliente_id);
  setPlantillaId(data.plantilla_id);
  setMonedaId(data.cliente?.moneda_id?.toString() || '1');
  setModoDistribucion(data.modo_distribucion);
  setTitulo(data.titulo);

  // 🔥 sincronizar estado UI
  const nuevoEstado =
    data.estado_cotizacion_id === 1
      ? 'borrador'
      : data.estado_cotizacion_id === 2
      ? 'enviada'
      : data.estado_cotizacion_id === 3
      ? 'parcialmente_aprobada'
      : data.estado_cotizacion_id === 4
      ? 'aprobada'
      : data.estado_cotizacion_id === 5
      ? 'oc_registrada'
      : '';

  setEstado(nuevoEstado);
};

// ====== HELPERS ======

  const resetItemForm = () => {
    setItemForm({
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
    });
  };

  const openEditItem = (item: CotizacionItem) => {
    setEditingItem(item);
    setItemForm({
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      costo_base: item.costo_base,
      margen: item.margen,
      marca: item.marca || '',
      codigo: item.codigo || '',
      unidad_medida: item.unidad_medida || 'UND',
      garantia_meses: item.garantia_meses || 12,
      disponibilidad_tipo: item.disponibilidad_tipo,
      disponibilidad_dias: item.disponibilidad_dias,
      precio_venta: item.precio_venta || 0,
      costo_unitario: item.costo_unitario || 0,
      costo_total: item.costo_total || 0,
      ganancia: item.ganancia || 0,
      subtotal: item.subtotal || 0,
      imagen: '',
      orden: 1,
      cotizacion_id: currentCotizacionId || 0,
      producto_id: undefined,
      estado_cotizacion_item_id: undefined,
      tipo: 'personalizado' as 'catalogo' | 'personalizado',
    });
    setShowItemFormModal(true);
  };

  // ====== RENDER ======

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const selectedCliente = clientes.find(c => c.id === clienteId);

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
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl text-gray-800 mb-4">Información General</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2 text-gray-700">Cliente</label>
                <select
                  value={clienteId ?? ''}
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    const selectedCliente = clientes.find((c) => c.id === selectedId);
                    setClienteId(selectedId);
                    if (selectedCliente?.moneda_id) {
                    setMonedaId(selectedCliente.moneda_id.toString());
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Seleccione un cliente
                  </option>
                  {clientes.map((clienteOption) => (
                    <option key={clienteOption.id} value={clienteOption.id}>
                      {clienteOption.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Fecha</label>
                <input
                  type="date"
                  value={cotizacion?.fecha ? new Date(cotizacion.fecha).toISOString().split('T')[0] : ''}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Validez (días)</label>
                <input
                  type="number"
                  value={cotizacion?.validez_dias || 0}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Plantilla</label>
                <select
                  value={plantillaId ?? ''}
                  onChange={(e) => setPlantillaId(Number(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Soles</option>
                  <option value={2}>Dólares</option>
                  <option value={3}>Soles Estándar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Moneda</label>
                <select
                  value={monedaId}
                  onChange={(e) => setMonedaId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">PEN (S/)</option>
                  <option value="2">USD ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Estado</label>
                <select
                  value={cotizacion?.estado_cotizacion_id === 1 ? 'borrador' : cotizacion?.estado_cotizacion_id === 2 ? 'enviada' : cotizacion?.estado_cotizacion_id === 3 ? 'parcialmente_aprobada' : cotizacion?.estado_cotizacion_id === 4 ? 'aprobada' : cotizacion?.estado_cotizacion_id === 5 ? 'oc_registrada' : ''}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="borrador">Borrador</option>
                  <option value="enviada">Enviada</option>
                  <option value="parcialmente_aprobada">Parcialmente Aprobada</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="aprobada">OC_Registrada</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLA CON DISPONIBILIDAD */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl text-gray-800">Items ({items.length})</h2>
              <button onClick={() => setShowItemTypeModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                <Plus className="w-4 h-4" /> Agregar Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left py-3 px-2 text-xs">Producto</th>
                    <th className="text-left py-3 px-2 text-xs">Tipo</th>
                    <th className="text-left py-3 px-2 text-xs">📦 Disp.</th>
                    <th className="text-left py-3 px-2 text-xs">⏱️ Días</th>
                    <th className="text-left py-3 px-2 text-xs">Garantía</th>
                    <th className="text-left py-3 px-2 text-xs">Cant.</th>
                    {estado === 'parcialmente_aprobada' && (
                      <>
                        <th className="text-left py-3 px-2 text-xs">Aprobada</th>
                        <th className="text-left py-3 px-2 text-xs">Estado</th>
                      </>
                    )}
                    <th className="text-left py-3 px-2 text-xs">Precio</th>
                    <th className="text-left py-3 px-2 text-xs">Costo</th>
                    <th className="text-left py-3 px-2 text-xs">Margen</th>
                    <th className="text-left py-3 px-2 text-xs">Ganancia</th>
                    <th className="text-left py-3 px-2 text-xs">Subtotal</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const costoFinal = item.costo_total || 0;
                    return (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 max-w-[200px] truncate" title='descripcion'>
                          {item.descripcion}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${item.tipo === 'catalogo' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {item.tipo === 'catalogo' ? 'Cat' : 'Ext'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <IconoDisponibilidad tipo={item.disponibilidad_tipo} />
                            <span className={`text-xs font-medium ${
                              item.disponibilidad_tipo === 'stock' 
                                ? 'text-green-700 bg-green-100' 
                                : 'text-orange-700 bg-orange-100'
                            } px-2 py-1 rounded-full`}>
                              {item.disponibilidad_tipo === 'stock' ? 'Stock' : 'Imp'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-medium text-xs">{item.disponibilidad_dias}</td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            {item.garantia_meses} meses
                          </span>
                        </td>
                        <td className="py-3 px-2 font-medium">{item.cantidad}</td>
                        
                        {estado === 'parcialmente_aprobada' && (
                          <>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                value={item.cantidad || 0}
                                min="0" max={item.cantidad}
                                className="w-16 px-2 py-1 border border-yellow-300 bg-yellow-50 rounded focus:ring-2 focus:ring-yellow-500 text-xs"
                              />
                            </td>
                            <td className="py-3 px-2">
                              <select
                                value={item.estado_cotizacion_item_id === 1 ? 'pendiente' : item.estado_cotizacion_item_id === 2 ? 'aprobado' : 'rechazado'}
                                className="px-2 py-1 border border-yellow-300 bg-yellow-50 rounded text-xs focus:ring-2 focus:ring-yellow-500"
                              >
                                <option value="pendiente">⏳ Pend.</option>
                                <option value="aprobado">✅ Aprob.</option>
                                <option value="rechazado">❌ Rech.</option>
                              </select>
                            </td>
                          </>
                        )}
                        
                        <td>{simboloMoneda} {(item.precio_venta || 0).toFixed(2)}</td>
                        <td>{simboloMoneda} {(costoFinal ?? 0).toFixed(2)}</td>
                        <td>
                          <input 
                            type="number" 
                            value={(item.margen ?? 0).toFixed(1)} 
                            onChange={(e) => actualizarMargenItem(item.id, parseFloat(e.target.value) || 0)}
                            className="w-14 px-1 py-1 border rounded text-xs" 
                            step="0.1" 
                          />
                        </td>
                        <td className={((item.ganancia ?? 0) > 0) ? 'text-green-600' : 'text-red-600'}>
                          {simboloMoneda} {(item.ganancia|| 0).toFixed(2)}
                        </td>
                        <td className="font-medium">{simboloMoneda} {(item.subtotal || 0).toFixed(2)}</td>
                        <td>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-1 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {estado === 'parcialmente_aprobada' && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex gap-6 text-sm">
                    <span>⏳ Pendientes: {items.filter(i => i.estado_cotizacion_item_id === 1).length}</span>
                    <span>✅ Aprobados: {items.filter(i => i.estado_cotizacion_item_id === 2).length}</span>
                    <span>❌ Rechazados: {items.filter(i => i.estado_cotizacion_item_id === 3).length}</span>
                  </div>
                  {todosItemsAprobados && (
                    <button 
                      onClick={() => setEstado('aprobada')} 
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Aprobar Completa
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* RESUMEN */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl mb-4">Resumen Aprobado</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">Subtotal: <span className="font-bold">{simboloMoneda} {cotizacion?.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between">IGV 18%: <span>{simboloMoneda} {cotizacion?.igv.toFixed(2)}</span></div>
              <div className="flex justify-between">
                Total Costos Adicionales: <span>{simboloMoneda} {(cotizacion?.total_gasto ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                Distribuido por Item ({items.length} items): <span>{simboloMoneda} {(items.length > 0 ? ((cotizacion?.total_gasto ?? 0) / items.length) : 0).toFixed(2)}</span>
              </div>

              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                Total: <span>{simboloMoneda} {cotizacion?.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600 font-bold">
                Ganancia: <span>{simboloMoneda} {(cotizacion?.ganancia ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-blue-600 font-bold">
                Margen Promedio: <span>{items.length > 0 ? (items.reduce((sum, item) => sum + item.margen, 0) / items.length).toFixed(1) : '0.0'}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-purple-600 font-bold">
                Items Stock: <span>{items.filter(i => i.disponibilidad_tipo === 'stock').length}</span> | 
                Items Importación: <span>{items.filter(i => i.disponibilidad_tipo === 'importacion').length}</span>
              </div>
            </div>
          </div>

          {/* BOTONES */}
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
            <button onClick={handleSaveCotizacion} 
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              <Save className="w-5 h-5" /> Guardar
            </button>
            <button onClick={() => setShowCostosModal(true)} 
              className="w-full flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
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
        </div>
      </div>

      {/* --- MODALES --- */}

      {/* 1. Modal Selección de Tipo de Item */}
      {showItemTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Agregar nuevo item</h3>
              <button onClick={() => setShowItemFormModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleItemTypeSelection('catalogo')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Package className="w-8 h-8 text-blue-600" />
                <span className="font-semibold text-blue-700">Catálogo Local</span>
              </button>
              <button 
                onClick={() => handleItemTypeSelection('personalizado')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors"
              >
                <ArrowLeftRight className="w-8 h-8 text-purple-600" />
                <span className="font-semibold text-purple-700">Producto Externo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Catálogo de Productos */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Seleccionar del Catálogo</h3>
              <button onClick={() => setShowProductModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="p-4 overflow-y-auto">
              <div className="space-y-2">
                {productos.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => handleProductSelection(p)}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-blue-50 cursor-pointer group transition-all"
                  >
                    <div>
                      <p className="font-bold text-gray-800 group-hover:text-blue-700">{p.nombre}</p>
                      <p className="text-xs text-gray-500">Sugerido: {simboloMoneda} {p.precio_referencial}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${p.stock === 0 ? 'bg-red-100 text-red-700' : p.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {p.stock === 0 ? 'Agotado' : p.stock > 10 ? 'En Stock' : `Pocas Unidades (${p.stock})`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Formulario de Item */}
      {showItemFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Detalles del Item</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Nombre del Producto</label>
                <input 
                  type="text" 
                  value={itemForm.descripcion} 
                  onChange={e => setItemForm({...itemForm, descripcion: e.target.value})}
                  className="w-full p-2 border rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Cantidad</label>
                <input 
                  type="number" 
                  value={itemForm.cantidad} 
                  onChange={e => setItemForm({...itemForm, cantidad: parseInt(e.target.value) || 1})}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Garantía</label>
                <input 
                  type="number" 
                  value={itemForm.garantia_meses} 
                  onChange={e => setItemForm({...itemForm, garantia_meses: parseInt(e.target.value) || 0})}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Costo Compra ({monedaId === '1' ? 'S/.' : '$'})</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={itemForm.costo_base} 
                    onChange={e => setItemForm({...itemForm, costo_base: parseFloat(e.target.value) || 0})}
                    className="w-full p-2 border rounded-lg"
                  />
                  <button onClick={handleIntercambiarMoneda} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Precio Venta Unit.</label>
                <input 
                  type="number" 
                  value={itemForm.precio_venta} 
                  onChange={e => setItemForm({...itemForm, precio_venta: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 border rounded-lg bg-blue-50 font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Disponibilidad</label>
                <select 
                  value={itemForm.disponibilidad_tipo}
                  onChange={e => setItemForm({...itemForm, disponibilidad_tipo: e.target.value as any, disponibilidad_dias: e.target.value === 'stock' ? 4 : 25})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="stock">Stock</option>
                  <option value="importacion">Importación</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Días Entrega</label>
                <input 
                  type="number" 
                  value={itemForm.disponibilidad_dias} 
                  onChange={e => setItemForm({...itemForm, disponibilidad_dias: parseInt(e.target.value) || 0})}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowItemFormModal(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Precio Venta:</span>
                  <span className="font-bold">
                    {simboloMoneda} {itemForm.precio_venta.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-green-600">
                  <span>Ganancia:</span>
                  <span className="font-bold">
                    {simboloMoneda} {itemForm.ganancia.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Subtotal:</span>
                  <span>
                    {simboloMoneda} {itemForm.subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
              <button onClick={editingItem ? () => handleUpdateItem(editingItem.id) : handleAddItem} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">Agregar al listado</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Costos Adicionales */}
      {showCostosModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-purple-600" /> Costos Adicionales
      </h3>

      {/* LISTA DE COSTOS */}
      <div className="space-y-3 mb-4">
        {costos.map((costo) => (
          <div key={costo.id} className="flex justify-between items-center border p-2 rounded">
            <div>
              <p className="text-sm font-medium">{costo.tipo}</p>
              <p className="text-xs text-gray-500">S/ {costo.monto.toFixed(2)}</p>
            </div>

            <button
              onClick={() => handleDeleteCosto(costo.id)}
              className="p-1 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ))}
      </div>

      {/* FORM AGREGAR */}
      <div className="space-y-2 border-t pt-3">
              <select
                value={costoForm.tipo}
                onChange={(e) => setCostoForm({ ...costoForm, tipo: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="viaje">Viaje</option>
                <option value="viatico">Viatico</option>
                <option value="movilidad">Movilidad</option>
                <option value="estancia">Estancia</option>
                <option value="flete">Flete</option>
                <option value="personal_externo">Personal Externo</option>
              </select>

              <input
                type="number"
                value={costoForm.monto}
                onChange={(e) =>
                  setCostoForm({ ...costoForm, monto: parseFloat(e.target.value) || 0 })
                }
                className="w-full p-2 border rounded"
                placeholder="Monto"
              />

              <button
                onClick={handleAddCosto}
                className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold"
              >
                Agregar costo
              </button>
            </div>

            <button
              onClick={() => setShowCostosModal(false)}
              className="w-full mt-4 text-sm text-gray-500"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* 5. Modal Exportación */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Exportar Documento</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleExportarPdf} className="flex items-center justify-center gap-2 p-3 border-2 border-red-100 rounded-xl hover:bg-red-50 text-red-700 font-bold">
                {exportandoPdf ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}

                  {exportandoPdf ? 'Exportando...' : 'PDF'}
              </button>
              {/* <button onClick={() => handleExportarPdf('excel')} className="flex items-center justify-center gap-2 p-3 border-2 border-green-100 rounded-xl hover:bg-green-50 text-green-700 font-bold">
                <FileSpreadsheet className="w-5 h-5" /> Excel
              </button> */}
            </div>
            <button onClick={() => setShowExportModal(false)} className="mt-4 text-sm text-gray-400 hover:underline">Cerrar</button>
          </div>
        </div>
      )}
    </div>
      );
    }
