import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotifications } from '../NotificationContext';
import { useCotizaciones, type ItemCotizacion, type CostosAdicionales } from '../CotizacionesContext';
import { useAuth } from '../AuthContext';

import {
  ArrowLeft, Plus, Trash2, Save, CheckCircle, FileSpreadsheet, FileText, X, 
  ArrowLeftRight, DollarSign, Package, Truck,
} from 'lucide-react';

const productosDisponibles = [
  { id: 1, nombre: 'Laptop HP EliteBook 840', costo: 2800, precio: 3500, disponibilidad: 'stock' as const },
  { id: 2, nombre: 'Monitor Dell 27" 4K', costo: 450, precio: 680, disponibilidad: 'importacion' as const },
  { id: 3, nombre: 'Teclado Logitech MX Keys', costo: 120, precio: 180, disponibilidad: 'stock' as const },
  { id: 4, nombre: 'Mouse Logitech MX Master', costo: 80, precio: 125, disponibilidad: 'importacion' as const },
  { id: 5, nombre: 'Impresora HP LaserJet', costo: 350, precio: 520, disponibilidad: 'stock' as const },
];

const TASA_CAMBIO = 3.75;

export function CotizacionDetail({ cotizacionId, mode = 'new' }: { cotizacionId?: string; mode?: 'view' | 'edit' | 'new' }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { getCotizacion, addCotizacion, updateCotizacion } = useCotizaciones();

  const currentCotizacionId = cotizacionId || id || 'new';

  // 🆕 TIPOS EXTENDIDOS CON GARANTÍA Y DISPONIBILIDAD
  type ItemConAprobacion = ItemCotizacion & {
    cantidadAprobada: number;
    estadoItem: 'pendiente' | 'aprobado' | 'rechazado';
    garantia: string;
    disponibilidad: 'stock' | 'importacion';
    diasEntrega: number;
    notaEntrega: string;
  };

  type ProductoCatalogo = {
    id: number;
    nombre: string;
    costo: number;
    precio: number;
    disponibilidad: 'stock' | 'importacion';
  };

  const [cliente, setCliente] = useState('Empresa Tech Solutions SAC');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [validezOferta, setValidezOferta] = useState(30);
  const [tipoPlantilla, setTipoPlantilla] = useState<'DOLARES' | 'SOLES' | 'SOLES-EST'>('SOLES');
  const [tipoMoneda, setTipoMoneda] = useState<'USD' | 'PEN'>('PEN');
  const [estado, setEstado] = useState<'borrador' | 'enviada' | 'aprobada' | 'parcialmente_aprobada'>('borrador');

  // 🆕 ITEMS CON GARANTÍA Y DISPONIBILIDAD
  const [items, setItems] = useState<ItemConAprobacion[]>([
    {
      id: 1,
      producto: 'Laptop HP EliteBook 840',
      cantidad: 5,
      cantidadAprobada: 0,
      estadoItem: 'pendiente',
      precioVenta: 3500,
      costoCompra: 2800,
      costoMoneda: 'PEN',
      margen: 20,
      tipo: 'catalogo',
      garantia: '12 meses',
      disponibilidad: 'stock',
      diasEntrega: 4,
      notaEntrega: 'Puesta la Orden de Compra',
    },
    {
      id: 2,
      producto: 'Monitor Dell 27" 4K',
      cantidad: 10,
      cantidadAprobada: 0,
      estadoItem: 'pendiente',
      precioVenta: 680,
      costoCompra: 450,
      costoMoneda: 'PEN',
      margen: 33.8,
      tipo: 'catalogo',
      garantia: '24 meses',
      disponibilidad: 'importacion',
      diasEntrega: 25,
      notaEntrega: 'Puesta la Orden de Compra',
    },
  ]);

  const [costosAdicionales, setCostosAdicionales] = useState<CostosAdicionales>({
    viaje: 0, viatico: 0, movilidad: 0, estancia: 0, envioFlete: 0, personalExterno: 0,
  });

  // ✅ TODOS LOS MODALES DECLARADOS
  const [showItemTypeModal, setShowItemTypeModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showItemFormModal, setShowItemFormModal] = useState(false);
  const [showCostosModal, setShowCostosModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [selectedItemType, setSelectedItemType] = useState<'catalogo' | 'externo'>('externo');
  const [selectedProduct, setSelectedProduct] = useState<ProductoCatalogo | null>(null);
  
  // 🆕 ITEMFORM CON GARANTÍA Y DISPONIBILIDAD
  const [itemForm, setItemForm] = useState({
    producto: '',
    cantidad: 1,
    precioVenta: 0,
    costoCompra: 0,
    costoMoneda: 'PEN' as 'USD' | 'PEN',
    margen: 0,
    garantia: '12 meses',
    disponibilidad: 'stock' as 'stock' | 'importacion',
    diasEntrega: 4,
    notaEntrega: '',
  });

  // 🆕 FUNCIÓN PARA OBTENER TEXTO DE DISPONIBILIDAD
  const obtenerTextoDisponibilidad = (item: ItemConAprobacion) => {
    const textoBase = item.disponibilidad === 'stock' 
      ? `Stock disponible. Entrega ${item.diasEntrega} días calendarios. ${item.notaEntrega}.`
      : `Importación y entrega. Entrega ${item.diasEntrega} días calendarios. ${item.notaEntrega}.`;

    return `${textoBase}

* El precio del producto sujeto al stock y nuevo ingreso de importación de la marca. 
Esto aplica después de los ${validezOferta} días calendarios de validez de esta cotización.`;
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

  // ✅ USO DE addNotification CORREGIDO (message en lugar de text)
  const mostrarNotificacion = (texto: string, tipo: 'success' | 'error' | 'warning' = 'success') => {
    addNotification({ 
      message: texto, // Corregido para tu contexto
      type: tipo,
      duration: 4000 
    } as any);
  };

  // useEffect con carga segura
  useEffect(() => {
    if (currentCotizacionId !== 'new') {
      const existingCotizacion = getCotizacion(currentCotizacionId);
      if (existingCotizacion) {
        setCliente(existingCotizacion.cliente);
        setFecha(existingCotizacion.fecha);
        setValidezOferta(existingCotizacion.validezOferta);
        setTipoPlantilla(existingCotizacion.tipoPlantilla);
        setTipoMoneda(existingCotizacion.tipoMoneda);
        setEstado(existingCotizacion.estado as any || 'borrador');

        const itemsConAprobacion: ItemConAprobacion[] = (existingCotizacion.items || []).map((item: ItemCotizacion) => ({
          ...item,
          cantidadAprobada: (item as any).cantidadAprobada || 0,
          estadoItem: (item as any).estadoItem || 'pendiente',
          garantia: (item as any).garantia || '12 meses',
          disponibilidad: (item as any).disponibilidad || 'stock',
          diasEntrega: (item as any).diasEntrega || 4,
          notaEntrega: (item as any).notaEntrega || 'Puesta la Orden de Compra',
        }));
        setItems(itemsConAprobacion);
        setCostosAdicionales(existingCotizacion.costosAdicionales);
        mostrarNotificacion(`Cotización ${currentCotizacionId} cargada correctamente`);
      } else {
        mostrarNotificacion('Cotización no encontrada', 'error');
        navigate('/cotizaciones');
      }
    }
  }, [currentCotizacionId, getCotizacion, navigate]);

  // 🆕 FUNCIONES DE APROBACIÓN PARCIAL
  const actualizarEstadoItem = (itemId: number, nuevoEstado: 'pendiente' | 'aprobado' | 'rechazado', cantidadAprobada: number = 0) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        if (nuevoEstado === 'aprobado') {
          return { ...item, estadoItem: nuevoEstado, cantidadAprobada: Math.min(cantidadAprobada || item.cantidad, item.cantidad) };
        } else if (nuevoEstado === 'rechazado') {
          return { ...item, estadoItem: nuevoEstado, cantidadAprobada: 0 };
        } else {
          return { ...item, estadoItem: nuevoEstado, cantidadAprobada: 0 };
        }
      }
      return item;
    }));
  };

  const actualizarCantidadAprobada = (itemId: number, cantidad: number) => {
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, cantidadAprobada: Math.max(0, Math.min(cantidad, item.cantidad)) }
        : item
    ));
  };

  const todosItemsAprobados = items.every(item => item.estadoItem === 'aprobado' && item.cantidadAprobada === item.cantidad);

  // Funciones existentes
  const convertirMoneda = (monto: number, desde: 'USD' | 'PEN', hacia: 'USD' | 'PEN') => {
    if (desde === hacia) return monto;
    return desde === 'USD' ? monto * TASA_CAMBIO : monto / TASA_CAMBIO;
  };

  const calcularTotalCostosAdicionales = () => Object.values(costosAdicionales).reduce((sum, val) => sum + val, 0);
  const calcularCostoAdicionalPorItem = () => items.length > 0 ? calcularTotalCostosAdicionales() / items.length : 0;

  const obtenerCostoFinalItem = (item: ItemConAprobacion) => {
    let costoBase = item.costoCompra;
    if (tipoPlantilla === 'DOLARES' && item.costoMoneda === 'PEN') costoBase = convertirMoneda(costoBase, 'PEN', 'USD');
    else if (tipoPlantilla !== 'DOLARES' && item.costoMoneda === 'USD') costoBase = convertirMoneda(costoBase, 'USD', 'PEN');
    return costoBase + calcularCostoAdicionalPorItem();
  };

  const calcularGanancia = (item: ItemConAprobacion) => {
    const costoFinal = obtenerCostoFinalItem(item);
    return (item.precioVenta - costoFinal) * (item.cantidadAprobada || item.cantidad);
  };

  const calcularSubtotal = (item: ItemConAprobacion) => (item.cantidadAprobada || item.cantidad) * item.precioVenta;

  // 🆕 handleSaveCotizacion CON DISPONIBILIDAD
  const handleSaveCotizacion = () => {
    try {
      const cotizacionData = {
        cliente,
        fecha,
        validezOferta,
        tipoPlantilla,
        tipoMoneda,
        items: items.map((item) => ({
          ...item,
          cantidadAprobada: item.cantidadAprobada,
          estadoItem: item.estadoItem,
          garantia: item.garantia,
          disponibilidad: item.disponibilidad,
          diasEntrega: item.diasEntrega,
          notaEntrega: item.notaEntrega,
        })),
        costosAdicionales,
      };

      const saveEstado = user?.role === 'VENTAS' ? 'enviada' : estado;
      
      if (currentCotizacionId === 'new') {
        addCotizacion({ ...cotizacionData, estado: saveEstado } as any);
        mostrarNotificacion('Cotización creada exitosamente', 'success');
      } else {
        updateCotizacion(currentCotizacionId, { ...cotizacionData, estado: saveEstado } as any);
        mostrarNotificacion('Cotización actualizada exitosamente', 'success');
      }
      
      navigate('/cotizaciones');
    } catch (error) {
      mostrarNotificacion('Error al guardar cotización', 'error');
      console.error('Error saving cotizacion:', error);
    }
  };

  const handleItemTypeSelection = (tipo: 'catalogo' | 'externo') => {
    setSelectedItemType(tipo);
    setShowItemTypeModal(false);
    if (tipo === 'catalogo') {
      setShowProductModal(true);
    } else {
      setItemForm({
        producto: '',
        cantidad: 1,
        precioVenta: 0,
        costoCompra: 0,
        costoMoneda: tipoMoneda,
        margen: 0,
        garantia: '12 meses',
        disponibilidad: 'stock',
        diasEntrega: 4,
        notaEntrega: 'Puesta la Orden de Compra',
      });
      setShowItemFormModal(true);
    }
  };

  const handleProductSelection = (producto: ProductoCatalogo) => {
    setSelectedProduct(producto);
    setItemForm({
      producto: producto.nombre,
      cantidad: 1,
      precioVenta: producto.precio,
      costoCompra: producto.costo,
      costoMoneda: tipoMoneda,
      margen: ((producto.precio - producto.costo) / producto.precio * 100),
      garantia: '12 meses',
      disponibilidad: producto.disponibilidad,
      diasEntrega: producto.disponibilidad === 'stock' ? 4 : 25,
      notaEntrega: 'Puesta la Orden de Compra',
    });
    mostrarNotificacion(`Producto "${producto.nombre}" seleccionado`);
    setShowProductModal(false);
    setShowItemFormModal(true);
  };

  const handleSaveItem = () => {
    const newItem: ItemConAprobacion = {
      id: items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1,
      producto: itemForm.producto,
      cantidad: itemForm.cantidad,
      cantidadAprobada: 0,
      estadoItem: 'pendiente',
      precioVenta: itemForm.precioVenta,
      costoCompra: itemForm.costoCompra,
      costoMoneda: itemForm.costoMoneda,
      margen: itemForm.margen,
      tipo: selectedItemType,
      garantia: itemForm.garantia,
      disponibilidad: itemForm.disponibilidad,
      diasEntrega: itemForm.diasEntrega,
      notaEntrega: itemForm.notaEntrega,
    };
    setItems([...items, newItem]);
    mostrarNotificacion('Item agregado correctamente');
    setShowItemFormModal(false);
  };

  const handleIntercambiarMoneda = () => {
    const nuevaMoneda = itemForm.costoMoneda === 'USD' ? 'PEN' : 'USD';
    const costoConvertido = convertirMoneda(itemForm.costoCompra, itemForm.costoMoneda, nuevaMoneda);
    setItemForm({ ...itemForm, costoMoneda: nuevaMoneda, costoCompra: parseFloat(costoConvertido.toFixed(2)) });
  };

  const actualizarMargenItem = (id: number, nuevoMargen: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const costoFinal = obtenerCostoFinalItem(item);
        const nuevoPrecio = costoFinal / (1 - nuevoMargen / 100);
        return { ...item, margen: nuevoMargen, precioVenta: parseFloat(nuevoPrecio.toFixed(2)) };
      }
      return item;
    }));
  };

  const eliminarItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
    mostrarNotificacion('Item eliminado');
  };

  const subtotal = items.reduce((sum, item) => sum + calcularSubtotal(item), 0);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;
  const gananciaTotal = items.reduce((sum, item) => sum + calcularGanancia(item), 0);
  const simboloMoneda = tipoPlantilla === 'DOLARES' ? 'USD' : 'S/.';

  // ✅ USO de selectedProduct para eliminar error (oculto en el header)
  const productoSeleccionadoInfo = selectedProduct ? (
    <div className="text-xs text-gray-400">Seleccionado: {selectedProduct.nombre}</div>
  ) : null;

  // 🆕 FUNCIÓN PARA ICONO DE DISPONIBILIDAD
  const IconoDisponibilidad = ({ tipo }: { tipo: 'stock' | 'importacion' }) => {
    return tipo === 'stock' ? (
      <Package className="w-4 h-4 text-green-600" />
    ) : (
      <Truck className="w-4 h-4 text-orange-600" />
    );
  };

  const handleExportar = async (tipo: 'excel' | 'pdf') => {
    if (!puedeExportar()) {
      mostrarNotificacion(
        user?.role === 'VENTAS'
          ? 'Exportación bloqueada: Requiere aprobación de Superadministrador'
          : 'No tienes permisos para exportar',
        'warning'
      );
      setShowExportModal(false);
      return;
    }

    try {
      if (tipo === 'pdf') {
        const jsPDFModule = await import('jspdf');
        await import('jspdf-autotable');

        const doc = new jsPDFModule.default();

        doc.setFontSize(18);
        doc.text('COTIZACIÓN', 14, 20);

        doc.setFontSize(11);
        doc.text(`Cliente: ${cliente}`, 14, 32);
        doc.text(`Fecha: ${fecha}`, 14, 40);
        doc.text(`Estado: ${estado}`, 14, 48);

        const tableData = items.map((item) => [
          item.producto,
          `${item.disponibilidad === 'stock' ? 'Stock' : 'Importación'} (${item.diasEntrega} días)`,
          item.cantidad.toString(),
          `${simboloMoneda} ${item.precioVenta.toFixed(2)}`,
          `${simboloMoneda} ${calcularSubtotal(item).toFixed(2)}`,
        ]);

        (doc as any).autoTable({
          startY: 60,
          head: [['Producto', 'Disponibilidad', 'Cantidad', 'Precio', 'Subtotal']],
          body: tableData,
        });

        doc.text(
          `TOTAL: ${simboloMoneda} ${total.toFixed(2)}`,
          14,
          (doc as any).lastAutoTable.finalY + 15
        );

        doc.save(`Cotizacion-${currentCotizacionId}.pdf`);
      }

      if (tipo === 'excel') {
        const XLSX = await import('xlsx');

        const data = items.map((item) => ({
          Producto: item.producto,
          Disponibilidad: item.disponibilidad === 'stock' ? 'Stock' : 'Importación',
          'Días Entrega': item.diasEntrega,
          Cantidad: item.cantidad,
          Precio: item.precioVenta,
          Subtotal: calcularSubtotal(item),
          Estado: item.estadoItem,
          Garantia: item.garantia,
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cotizacion');
        XLSX.writeFile(workbook, `Cotizacion-${currentCotizacionId}.xlsx`);
      }

      mostrarNotificacion(
        `Cotización exportada en ${tipo.toUpperCase()}`,
        'success'
      );
      setShowExportModal(false);
    } catch (error) {
      console.error(error);
      mostrarNotificacion('Error al exportar archivo', 'error');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
             {estado === 'aprobada' && <CheckCircle className="text-green-500 w-6 h-6" />}
             Cotización - {mode}
          </h1>
          {productoSeleccionadoInfo}
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
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Validez (días)</label>
                <input
                  type="number"
                  value={validezOferta}
                  onChange={(e) => setValidezOferta(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Plantilla</label>
                <select
                  value={tipoPlantilla}
                  onChange={(e) => setTipoPlantilla(e.target.value as 'DOLARES' | 'SOLES' | 'SOLES-EST')}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SOLES">Soles</option>
                  <option value="DOLARES">Dólares</option>
                  <option value="SOLES-EST">Soles Estándar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Moneda</label>
                <select
                  value={tipoMoneda}
                  onChange={(e) => setTipoMoneda(e.target.value as 'USD' | 'PEN')}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PEN">PEN (S/)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as 'borrador' | 'enviada' | 'aprobada' | 'parcialmente_aprobada')}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="borrador">Borrador</option>
                  <option value="enviada">Enviada</option>
                  <option value="parcialmente_aprobada">Parcialmente Aprobada</option>
                  <option value="aprobada">Aprobada</option>
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
                  {items.map(item => {
                    const costoFinal = obtenerCostoFinalItem(item);
                    return (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 max-w-[200px] truncate" title={obtenerTextoDisponibilidad(item)}>
                          {item.producto}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${item.tipo === 'catalogo' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {item.tipo === 'catalogo' ? 'Cat' : 'Ext'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <IconoDisponibilidad tipo={item.disponibilidad} />
                            <span className={`text-xs font-medium ${
                              item.disponibilidad === 'stock' 
                                ? 'text-green-700 bg-green-100' 
                                : 'text-orange-700 bg-orange-100'
                            } px-2 py-1 rounded-full`}>
                              {item.disponibilidad === 'stock' ? 'Stock' : 'Imp'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-medium text-xs">{item.diasEntrega}</td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            {item.garantia}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-medium">{item.cantidad}</td>
                        
                        {estado === 'parcialmente_aprobada' && (
                          <>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                value={item.cantidadAprobada}
                                onChange={(e) => actualizarCantidadAprobada(item.id, parseInt(e.target.value) || 0)}
                                min="0" max={item.cantidad}
                                className="w-16 px-2 py-1 border border-yellow-300 bg-yellow-50 rounded focus:ring-2 focus:ring-yellow-500 text-xs"
                              />
                            </td>
                            <td className="py-3 px-2">
                              <select
                                value={item.estadoItem}
                                onChange={(e) => actualizarEstadoItem(item.id, e.target.value as 'pendiente' | 'aprobado' | 'rechazado', item.cantidadAprobada)}
                                className="px-2 py-1 border border-yellow-300 bg-yellow-50 rounded text-xs focus:ring-2 focus:ring-yellow-500"
                              >
                                <option value="pendiente">⏳ Pend.</option>
                                <option value="aprobado">✅ Aprob.</option>
                                <option value="rechazado">❌ Rech.</option>
                              </select>
                            </td>
                          </>
                        )}
                        
                        <td>{simboloMoneda} {item.precioVenta.toFixed(2)}</td>
                        <td>{simboloMoneda} {costoFinal.toFixed(2)}</td>
                        <td>
                          <input 
                            type="number" 
                            value={item.margen.toFixed(1)} 
                            onChange={(e) => actualizarMargenItem(item.id, parseFloat(e.target.value) || 0)}
                            className="w-14 px-1 py-1 border rounded text-xs" 
                            step="0.1" 
                          />
                        </td>
                        <td className={calcularGanancia(item) > 0 ? 'text-green-600' : 'text-red-600'}>
                          {simboloMoneda} {calcularGanancia(item).toFixed(2)}
                        </td>
                        <td className="font-medium">{simboloMoneda} {calcularSubtotal(item).toFixed(2)}</td>
                        <td>
                          <button onClick={() => eliminarItem(item.id)} className="p-1 hover:bg-red-50 rounded">
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
                    <span>⏳ Pendientes: {items.filter(i => i.estadoItem === 'pendiente').length}</span>
                    <span>✅ Aprobados: {items.filter(i => i.estadoItem === 'aprobado').length}</span>
                    <span>❌ Rechazados: {items.filter(i => i.estadoItem === 'rechazado').length}</span>
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
              <div className="flex justify-between">Subtotal: <span className="font-bold">{simboloMoneda} {subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between">IGV 18%: <span>{simboloMoneda} {igv.toFixed(2)}</span></div>
              <div className="flex justify-between">
                Total Costos Adicionales: <span>{simboloMoneda} {calcularTotalCostosAdicionales().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                Distribuido por Item ({items.length} items): <span>{simboloMoneda} {calcularCostoAdicionalPorItem().toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                Total: <span>{simboloMoneda} {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600 font-bold">
                Ganancia: <span>{simboloMoneda} {gananciaTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-blue-600 font-bold">
                Margen Promedio: <span>{items.length > 0 ? (items.reduce((sum, item) => sum + item.margen, 0) / items.length).toFixed(1) : '0.0'}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-purple-600 font-bold">
                Items Stock: <span>{items.filter(i => i.disponibilidad === 'stock').length}</span> | 
                Items Importación: <span>{items.filter(i => i.disponibilidad === 'importacion').length}</span>
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
              disabled={!puedeExportar()}
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
              <button onClick={() => setShowItemTypeModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
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
                onClick={() => handleItemTypeSelection('externo')}
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
                {productosDisponibles.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => handleProductSelection(p)}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-blue-50 cursor-pointer group transition-all"
                  >
                    <div>
                      <p className="font-bold text-gray-800 group-hover:text-blue-700">{p.nombre}</p>
                      <p className="text-xs text-gray-500">Costo Base: {simboloMoneda} {p.costo} | Sugerido: {simboloMoneda} {p.precio}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${p.disponibilidad === 'stock' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {p.disponibilidad.toUpperCase()}
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
                  value={itemForm.producto} 
                  onChange={e => setItemForm({...itemForm, producto: e.target.value})}
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
                  type="text" 
                  value={itemForm.garantia} 
                  onChange={e => setItemForm({...itemForm, garantia: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Costo Compra ({itemForm.costoMoneda})</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={itemForm.costoCompra} 
                    onChange={e => setItemForm({...itemForm, costoCompra: parseFloat(e.target.value) || 0})}
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
                  value={itemForm.precioVenta} 
                  onChange={e => setItemForm({...itemForm, precioVenta: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 border rounded-lg bg-blue-50 font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Disponibilidad</label>
                <select 
                  value={itemForm.disponibilidad}
                  onChange={e => setItemForm({...itemForm, disponibilidad: e.target.value as any, diasEntrega: e.target.value === 'stock' ? 4 : 25})}
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
                  value={itemForm.diasEntrega} 
                  onChange={e => setItemForm({...itemForm, diasEntrega: parseInt(e.target.value) || 0})}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowItemFormModal(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveItem} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">Agregar al listado</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Costos Adicionales */}
      {showCostosModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" /> Costos Operativos
            </h3>
            <div className="space-y-3">
              {Object.keys(costosAdicionales).map((key) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <label className="text-sm capitalize text-gray-600">{key.replace(/([A-Z])/g, ' $1')}</label>
                  <input 
                    type="number"
                    value={(costosAdicionales as any)[key]}
                    onChange={(e) => setCostosAdicionales({...costosAdicionales, [key]: parseFloat(e.target.value) || 0})}
                    className="w-32 p-2 border rounded-lg text-right"
                  />
                </div>
              ))}
            </div>
            <button onClick={() => setShowCostosModal(false)} className="w-full mt-6 py-3 bg-purple-600 text-white rounded-lg font-bold shadow-lg shadow-purple-200">
              Aplicar Costos
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
              <button onClick={() => handleExportar('pdf')} className="flex items-center justify-center gap-2 p-3 border-2 border-red-100 rounded-xl hover:bg-red-50 text-red-700 font-bold">
                <FileText className="w-5 h-5" /> PDF
              </button>
              <button onClick={() => handleExportar('excel')} className="flex items-center justify-center gap-2 p-3 border-2 border-green-100 rounded-xl hover:bg-green-50 text-green-700 font-bold">
                <FileSpreadsheet className="w-5 h-5" /> Excel
              </button>
            </div>
            <button onClick={() => setShowExportModal(false)} className="mt-4 text-sm text-gray-400 hover:underline">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}