import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotifications } from '../NotificationContext';
import { useAuth } from '../AuthContext';
import { getClientes, type Cliente } from '../services/cliente.service';
import { getProductos, type Producto} from "../services/producto.service";
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
  const [plantillaId, setPlantillaId] = useState<number>(1);
  const [fecha, setFecha] = useState('');
  const [validezDias, setValidezDias] = useState(30);
  const [plantillas, setPlantillas] = useState<{id:number,nombre:string}[]>([]);
  const [monedaId, setMonedaId] = useState<number>(1); // 1=PEN, 2=USD
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

  const [estado_cotizacion_id, setEstadoCotizacionId] = useState('');

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
    id: 1,
    cotizacion_id: currentCotizacionId || null,
    tipo: '',
    monto: 0,
    descripcion: 'string',
  });

  const handleUpdateWrapper = () => {
  if (!editingItem) return;
  handleUpdateItem(editingItem.id);
};

  const mapItemToForm = (item: CotizacionItem): ItemForm => {
  return {
    id: item.id,
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    costo_base: item.costo_base,
    precio_venta: item.precio_venta || 0,
    costo_unitario: item.costo_unitario || 0,
    costo_total: item.costo_total || 0,
    ganancia: item.ganancia || 0,
    subtotal: item.subtotal || 0,
    imagen: '',
    orden: item.orden,
    cotizacion_id: Number(item.cotizacion_id),
    producto_id: item.producto_id,
    estado_cotizacion_item_id: item.estado_cotizacion_item_id,
    tipo: item.tipo || 'personalizado',
    margen: item.margen,
    marca: item.marca || '',
    codigo: item.codigo || '',
    unidad_medida: item.unidad_medida || 'UND',
    garantia_meses: item.garantia_meses || 12,
    disponibilidad_tipo: item.disponibilidad_tipo,
    disponibilidad_dias: item.disponibilidad_dias,
    proveedor: '',
    link_proveedor: '',
  };
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
      setMonedaId(data.cliente?.moneda_id || 1);
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
        garantia_meses: itemForm.garantia_meses,
        proveedor: itemForm.proveedor,
        link_proveedor: itemForm.link_proveedor
      }
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
      setCostoForm({ 
        id: 1,
        cotizacion_id: currentCotizacionId,
        tipo: '',
        monto: 0,
        descripcion: '',
      });
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
  setMonedaId(data.cliente?.moneda_id || 1);
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

  const openEditItem = (item: CotizacionItem) => {
    setEditingItem(item);
    setItemForm(mapItemToForm(item));
    setShowItemFormModal(true);
  };

  const resumen = useMemo(() => {
  const subtotal = items.reduce(
    (acc, i) => acc + (i.subtotal || 0),
    0
  );

  const costosTotal = costos.reduce(
    (acc, c) => acc + (c.monto || 0),
    0
  );

  const igv = subtotal * 0.18;

  const ganancia = items.reduce(
    (acc, i) => acc + (i.ganancia || 0),
    0
  );

  return {
    subtotal,
    costosTotal,
    igv,
    ganancia,
    total: subtotal + igv + costosTotal,
  };
}, [items, costos]);

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
          <CotizacionGeneralForm
            clienteId={clienteId}
            setClienteId={setClienteId}
            clientes={clientes}
            cotizacion={cotizacion}

            plantillaId={plantillaId}
            setPlantillaId={setPlantillaId}

            monedaId={monedaId}
            setMonedaId={setMonedaId}

            estado_cotizacion_id={cotizacion?.estado_cotizacion_id || 1}
            setEstadoCotizacionId={(value) =>
              setCotizacion((prev: any) => ({
                ...prev,
                estado_cotizacion_id: value,
              }))
            }

            modoDistribucion={modoDistribucion}
            setModoDistribucion={setModoDistribucion}

            fecha={fecha}
            setFecha={setFecha}

            validezDias={validezDias}
            setValidezDias={setValidezDias}

            plantillas={plantillas}
          />

          {/* TABLA CON DISPONIBILIDAD */}
          <CotizacionItemsTable
            items={items}
            simboloMoneda={simboloMoneda}
            estadoCotizacionId={cotizacion?.estado_cotizacion_id || 1}
            setEstadoCotizacionId={setEstado}
            onDeleteItem={handleDeleteItem}
            onOpenEdit={openEditItem}
            actualizarMargenItem={actualizarMargenItem}
            todosItemsAprobados={todosItemsAprobados}
            onApproveAll={() => setEstado('aprobada')}

            onAddItem={() => setShowItemTypeModal(true)} // 🔥 AQUÍ
          />

        </div>

          {/* RESUMEN */}
          <CotizacionResumen
            resumen={resumen}
            simboloMoneda={simboloMoneda}
            items={items}
            />

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
            
      {/* --- MODALES --- */}

      {/* 1. Modal Selección de Tipo de Item */}
      <ItemTypeModal 
        open={showItemTypeModal} 
        onClose={() => setShowItemTypeModal(false)} 
        onSelect={handleItemTypeSelection} 
      />

      {/* 2. Modal Catálogo de Productos */}
      <ProductModal
        open={showProductModal}
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
        monedaId={monedaId}
        simboloMoneda={simboloMoneda}
        onSave={handleAddItem}
        onUpdate={handleUpdateWrapper}
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
        />

      {/* 5. Modal Exportación */}
      <ExportModal
        open={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        onExportPdf={handleExportarPdf} 
        exportandoPdf={exportandoPdf}  
        />
        
    </div>
  );
}
