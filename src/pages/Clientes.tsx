import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { getClientes, createCliente, updateCliente, deleteCliente, type Cliente} from "../services/cliente.service";
import { useNotifications } from "../NotificationContext";

// Formulario vacío tipado según la API
interface ClienteForm {
  nombre: string;
  ruc: string;
  correo: string;
  telefono: string;
  estado: 'activo' | 'inactivo';
  tipo_cliente_id?: number;
  moneda_id?: number;
}

const FORM_VACIO: ClienteForm = {
  nombre: '',
  ruc: '',
  correo: '',
  telefono: '',
  estado: 'activo',
  tipo_cliente_id: undefined,
  moneda_id: undefined,
};

const ITEMS_PER_PAGE = 5;

export default function Clientes() {
  const { addNotification } = useNotifications();

  const [clientesData, setClientesData] = useState<Cliente[]>([]);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [openModal, setOpenModal]           = useState(false);
  const [modoEdicion, setModoEdicion]       = useState(false);
  const [editandoId, setEditandoId]         = useState<number | null>(null);
  const [form, setForm]                     = useState<ClienteForm>(FORM_VACIO);
  const [searchTerm, setSearchTerm]         = useState('');
  const [currentPage, setCurrentPage]       = useState(1);

  const [clienteSeleccionado, setClienteSeleccionado] = useState<Partial<Cliente>>({
    nombre: "",
    ruc: "",
    correo: "",
    telefono: "",
    estado: "activo",
  });

  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);

  // Filtrar clientes por búsqueda
  const clientesFiltrados = clientesData.filter(
    (cliente) =>
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.ruc.includes(searchTerm)
  );

  // PAGINACION
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = clientesFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(clientesFiltrados.length / ITEMS_PER_PAGE);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleNuevo = () => {
    setClienteSeleccionado({
      nombre: "",
      ruc: "",
      telefono: "",
      correo: "",
      estado: "activo",
    });
    setModoEdicion(false);
    setOpenModal(true);
  };

  const handleEditar = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setModoEdicion(true);
    setOpenModal(true);
  };

  const handleEliminar = (cliente: Cliente) => {
    setClienteAEliminar(cliente);
  };

  const confirmarEliminar = () => {
    if (clienteAEliminar) {
      setClientesData(clientesData.filter(c => c.id !== clienteAEliminar.id));
      setClienteAEliminar(null);
    }
  };

  const handleGuardar = () => {
    if (!clienteSeleccionado.nombre || !clienteSeleccionado.correo) return;

    if (modoEdicion && 'id' in clienteSeleccionado) {
      // Editar
      setClientesData(
        clientesData.map((c) =>
          c.id === clienteSeleccionado.id ? clienteSeleccionado as Cliente : c
        )
      );
    } else {
      // Nuevo
      const nuevoId = Math.max(...clientesData.map(c => c.id)) + 1;
      const nuevoCliente: Cliente = {
        id: nuevoId,
        nombre: clienteSeleccionado.nombre!,
        ruc: clienteSeleccionado.ruc || "",
        telefono: clienteSeleccionado.telefono || "",
        correo: clienteSeleccionado.correo!,
        estado: clienteSeleccionado.estado || "activo",
        tipo_cliente_id: clienteSeleccionado.tipo_cliente_id || 1,
        moneda_id: clienteSeleccionado.moneda_id || 1,
      };
      setClientesData([nuevoCliente, ...clientesData]);
    }
    setOpenModal(false);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleInputChange = (field: keyof Partial<Cliente>, value: string) => {
    setClienteSeleccionado(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Clientes
          </h1>
          <p className="text-gray-500 mt-1">
            Gestión de clientes del sistema ({clientesData.length} total)
          </p>
        </div>

        <button
          onClick={handleNuevo}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <Plus size={20} />
          Nuevo Cliente
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 bg-gray-100 px-4 py-3 rounded-2xl w-full md:w-96">
          <Search size={18} className="text-gray-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar cliente por nombre, email o teléfono..."
            value={searchTerm}
            onChange={handleSearch}
            className="bg-transparent outline-none w-full text-sm"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Empresa
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                RUC
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Correo
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Teléfono
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Estado
              </th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((cliente) => (
                <tr
                  key={cliente.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-200"
                >
                  <td className="px-6 py-5">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {cliente.nombre}
                      </h3>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-gray-600">
                      {cliente.ruc}
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={16} />
                      <span className="truncate max-w-[200px]">{cliente.correo}</span>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={16} />
                      {cliente.telefono}
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <span
                      className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        ${
                          cliente.estado === "activo"
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-red-100 text-red-700 border border-red-200"
                        }
                      `}
                    >
                      {cliente.estado}
                    </span>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEditar(cliente)}
                        className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-all duration-200 hover:scale-105 shadow-sm"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>

                      <button 
                        onClick={() => setClienteAEliminar(cliente)}
                        className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-all duration-200 hover:scale-105 shadow-sm"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm ? "No se encontraron clientes" : "No hay clientes"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* PAGINACION */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, clientesFiltrados.length)} de {clientesFiltrados.length} clientes
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ChevronLeft size={18} />
                </button>
                
                {pages.map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 font-medium ${
                      currentPage === page
                        ? "bg-blue-600 text-white shadow-md hover:shadow-lg"
                        : "text-gray-600 hover:bg-gray-200 hover:shadow-sm"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CONFIRMAR ELIMINAR */}
      {clienteAEliminar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-gray-200">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                ¿Eliminar cliente?
              </h3>
              <p className="text-gray-600">
                ¿Estás seguro de que deseas eliminar <strong>"{clienteAEliminar.nombre}"</strong>?
              </p>
            </div>
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => setClienteAEliminar(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-2xl transition-all duration-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-2xl transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {openModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white to-gray-50 w-full max-w-2xl rounded-3xl p-8 shadow-2xl border border-white/50 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {modoEdicion ? "Editar Cliente" : "Nuevo Cliente"}
                </h2>
                <p className="text-gray-500 text-sm">
                  Completa la información del cliente
                </p>
              </div>

              <button
                onClick={() => setOpenModal(false)}
                className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-sm"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Formulario */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* NOMBRE EMPRESA */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Nombre de la empresa
                  </label>
                  <input
                    type="text"
                    value={clienteSeleccionado.nombre || ""}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                    placeholder="Ej: Tech Solutions SAC"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* RUC */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    RUC
                  </label>
                  <input
                    type="text"
                    value={clienteSeleccionado.ruc || ""}
                    onChange={(e) => handleInputChange('ruc', e.target.value)}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                    placeholder="20123456789"
                  />
                </div>

                {/* EMAIL */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mail size={16} className="text-blue-500" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={clienteSeleccionado.correo || ""}
                    onChange={(e) => handleInputChange('correo', e.target.value)}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                    placeholder="cliente@empresa.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TELEFONO */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Phone size={16} className="text-blue-500" />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={clienteSeleccionado.telefono || ""}
                    onChange={(e) => handleInputChange('telefono', e.target.value)}
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                    placeholder="987654321"
                  />
                </div>

                {/* ESTADO */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Estado</label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="estado"
                        value="Activo"
                        checked={clienteSeleccionado.estado === "activo"}
                        onChange={() => handleInputChange('estado', "Activo")}
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 rounded-full"
                      />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        Activo
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="estado"
                        value="Inactivo"
                        checked={clienteSeleccionado.estado === "inactivo"}
                        onChange={() => handleInputChange('estado', "Inactivo")}
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 rounded-full"
                      />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        Inactivo
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setOpenModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 px-6 rounded-2xl transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={!clienteSeleccionado.nombre || !clienteSeleccionado.correo}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-6 rounded-2xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
                >
                  {modoEdicion ? "Actualizar Cliente" : "Crear Cliente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}