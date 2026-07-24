import { useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Download,
  Mail,
} from "lucide-react";

interface Licencia {
  id: number;
  empresa: string;
  producto: string;
  cantidad: number;
  suscripcion: "ANUAL";
  fechaCompra: string;
  fechaRenovacion: string;
  estado: "VIGENTE" | "POR VENCER" | "VENCIDO";
}

export default function Licencias() {
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [outlookRedirecting, setOutlookRedirecting] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [filterSus, setFilterSus] = useState("TODOS");
  const [filterEstado, setFilterEstado] = useState("TODOS");

  const [openModal, setOpenModal] = useState(false);
  const [viewModal, setViewModal] = useState<Licencia | null>(null);

  const [form, setForm] = useState({
    empresa: "",
    producto: "",
    cantidad: "",
    suscripcion: "ANUAL",
    fechaCompra: "",
    fechaRenovacion: "",
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;

    let newForm = { ...form, [name]: value };

    if (name === "fechaCompra") {
      const d = new Date(value);
      d.setFullYear(d.getFullYear() + 1);
      newForm.fechaRenovacion = d.toISOString().split("T")[0];
    }

    setForm(newForm);
  };

  const diasRestantes = (fecha: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    return Math.ceil((vencimiento.getTime() - hoy.getTime()) / 86400000);
  };

  const getEstado = (fecha: string): Licencia["estado"] => {
    const dias = diasRestantes(fecha);
    if (dias < 0) return "VENCIDO";
    if (dias <= 30) return "POR VENCER";
    return "VIGENTE";
  };

  const handleGuardar = () => {
    const nueva: Licencia = {
      id: editingId || Date.now(),
      empresa: form.empresa,
      producto: form.producto,
      cantidad: Number(form.cantidad),
      suscripcion: "ANUAL",
      fechaCompra: form.fechaCompra,
      fechaRenovacion: form.fechaRenovacion,
      estado: getEstado(form.fechaRenovacion),
    };

    if (editingId) {
      setLicencias(licencias.map(l => l.id === editingId ? nueva : l));
      setEditingId(null);
    } else {
      setLicencias([...licencias, nueva]);
    }

    setOpenModal(false);
    resetForm();
  };

  const handleEditar = (licencia: Licencia) => {
    setForm({
      empresa: licencia.empresa,
      producto: licencia.producto,
      cantidad: licencia.cantidad.toString(),
      suscripcion: "ANUAL",
      fechaCompra: licencia.fechaCompra,
      fechaRenovacion: licencia.fechaRenovacion,
    });
    setEditingId(licencia.id);
    setOpenModal(true);
  };

  const handleEliminar = (id: number) => {
    setLicencias(licencias.filter(l => l.id !== id));
  };

  const handleOutlook = (licencia: Licencia) => {
    setOutlookRedirecting(licencia.id);
    setTimeout(() => {
      window.open('https://outlook.office.com/', '_blank');
      setOutlookRedirecting(null);
    }, 1000);
  };

  const resetForm = () => {
    setForm({
      empresa: "",
      producto: "",
      cantidad: "",
      suscripcion: "ANUAL",
      fechaCompra: "",
      fechaRenovacion: "",
    });
  };

  const exportToCSV = () => {
    const data = filtradas.length > 0 ? filtradas : licencias;
    const csv = [
      ['Empresa', 'Producto', 'Cantidad', 'Suscripción', 'Fecha Compra', 'Fecha Renovación', 'Estado'],
      ...data.map(l => [
        l.empresa,
        l.producto,
        l.cantidad,
        l.suscripcion,
        l.fechaCompra,
        l.fechaRenovacion,
        l.estado
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licencias_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    alert('Exportando PDF... (Funcionalidad simulada - integra jsPDF para implementación completa)');
    
    const data = filtradas.length > 0 ? filtradas : licencias;
    console.log('Datos para PDF:', data);
  };

  const confirmDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar esta licencia?')) {
      handleEliminar(id);
    }
  };

  const filtradas = licencias.filter((l) => {
    const matchSearch =
      `${l.empresa} ${l.producto}`.toLowerCase().includes(search.toLowerCase());

    return (
      matchSearch &&
      (filterSus === "TODOS" || l.suscripcion === filterSus) &&
      (filterEstado === "TODOS" || l.estado === filterEstado)
    );
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Licencias</h1>

        <div className="flex gap-2">
          <button
            onClick={exportToPDF}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700"
          >
            <Download size={16} /> PDF
          </button>
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Download size={16} /> Excel
          </button>
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setOpenModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus size={16} /> Nueva Licencia
          </button>
        </div>
      </div>

      {/* DASHBOARD */}
      <div className="grid grid-cols-3 gap-4">

        <div className="bg-red-600 text-white p-5 rounded-xl shadow hover:shadow-lg transition-shadow">
          <div className="flex justify-between">
            <XCircle />
            <span>Vencidas</span>
          </div>
          <h2 className="text-3xl font-bold mt-2">
            {licencias.filter(l => l.estado === "VENCIDO").length}
          </h2>
        </div>

        <div className="bg-yellow-500 text-white p-5 rounded-xl shadow hover:shadow-lg transition-shadow">
          <div className="flex justify-between">
            <AlertCircle />
            <span>Por vencer</span>
          </div>
          <h2 className="text-3xl font-bold mt-2">
            {licencias.filter(l => l.estado === "POR VENCER").length}
          </h2>
        </div>

        <div className="bg-green-600 text-white p-5 rounded-xl shadow hover:shadow-lg transition-shadow">
          <div className="flex justify-between">
            <CheckCircle2 />
            <span>Vigentes</span>
          </div>
          <h2 className="text-3xl font-bold mt-2">
            {licencias.filter(l => l.estado === "VIGENTE").length}
          </h2>
        </div>

      </div>

      {/* FILTERS */}
      <div className="flex gap-3 bg-white p-3 rounded-lg shadow">

        <select 
          value={filterSus}
          onChange={(e) => setFilterSus(e.target.value)} 
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option>TODOS</option>
          <option>ANUAL</option>
        </select>

        <select 
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)} 
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option>TODOS</option>
          <option>VIGENTE</option>
          <option>POR VENCER</option>
          <option>VENCIDO</option>
        </select>

        <div className="flex items-center gap-2 border p-2 rounded w-full focus-within:ring-2 focus-within:ring-blue-500">
          <Search size={16} />
          <input
            className="w-full outline-none"
            placeholder="Buscar empresa o producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">

          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left font-semibold">Empresa</th>
              <th className="p-3 text-left font-semibold">Producto</th>
              <th className="p-3 text-left font-semibold">Suscripción</th>
              <th className="p-3 text-left font-semibold">F. Compra</th>
              <th className="p-3 text-left font-semibold">F. Renovación</th>
              <th className="p-3 text-left font-semibold">Estado</th>
              <th className="p-3 text-left font-semibold">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  No hay licencias que mostrar
                </td>
              </tr>
            ) : (
              filtradas.map((l) => (
                <tr key={l.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-medium">{l.empresa}</td>
                  <td className="p-3">{l.producto}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      ANUAL
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">{l.fechaCompra}</td>
                  <td className="p-3 text-gray-600">{l.fechaRenovacion}</td>

                  <td className="p-3">
                    <div className="space-y-1 max-w-[100px]">
                      <span className={`px-2 py-1 text-xs rounded block w-full text-center font-medium ${
                        l.estado === 'VIGENTE' ? 'bg-green-600 text-white' :
                        l.estado === 'POR VENCER' ? 'bg-yellow-600 text-white' :
                        'bg-red-600 text-white'
                      }`}>
                        {l.estado}
                      </span>
                      <span className={`text-xs font-bold text-center block ${
                        l.estado === 'VENCIDO' ? 'text-red-600' :
                        l.estado === 'POR VENCER' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {diasRestantes(l.fechaRenovacion) >= 0 
                          ? `${diasRestantes(l.fechaRenovacion)} días` 
                          : 'Vencido'
                        }
                      </span>
                    </div>
                  </td>

                  <td className="p-3 flex gap-1">
                    <button
                      onClick={() => setViewModal(l)}
                      className="bg-gray-100 p-2 rounded hover:bg-gray-200 transition-colors"
                      title="Ver detalle"
                    >
                      <Eye size={14} />
                    </button>

                    <button 
                      onClick={() => handleEditar(l)}
                      className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>

                    <button 
                      onClick={() => confirmDelete(l.id)}
                      className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>

                    <button 
                      onClick={() => handleOutlook(l)}
                      className={`p-2 rounded flex items-center justify-center transition-all ${
                        outlookRedirecting === l.id 
                          ? 'bg-blue-500 text-white animate-pulse' 
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                      title="Outlook"
                      disabled={outlookRedirecting === l.id}
                    >
                      {outlookRedirecting === l.id ? (
                        <>
                          <div className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                          <span className="text-xs">...</span>
                        </>
                      ) : (
                        <Mail size={14} />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>

        </table>
      </div>

      {/* MODAL NUEVA/EDITAR LICENCIA */}
      {openModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-[550px] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Editar Licencia' : 'Nueva Licencia'}
              </h2>
            </div>

            <div className="p-6 space-y-4">

              <input 
                name="empresa" 
                placeholder="Nombre de la empresa"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.empresa}
                onChange={handleChange} 
              />

              <input 
                name="producto" 
                placeholder="Nombre del producto"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.producto}
                onChange={handleChange} 
              />

              <input 
                name="cantidad" 
                placeholder="Cantidad de licencias"
                type="number"
                min="1"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.cantidad}
                onChange={handleChange} 
              />

              <input 
                type="date" 
                name="fechaCompra"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.fechaCompra}
                onChange={handleChange} 
              />

              <input 
                type="date"
                value={form.fechaRenovacion}
                className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 cursor-not-allowed"
                readOnly 
              />

            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
              <button 
                onClick={() => {
                  setOpenModal(false);
                  setEditingId(null);
                  resetForm();
                }} 
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancelar
              </button>

              <button 
                onClick={handleGuardar} 
                disabled={!form.empresa || !form.producto || !form.cantidad || !form.fechaCompra}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-[450px] shadow-2xl overflow-hidden">

            <div className="bg-gray-900 text-white px-6 py-4">
              <h2 className="text-lg font-semibold">Detalle de Licencia</h2>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50 w-1/3">Empresa</td>
                    <td className="p-3">{viewModal.empresa}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Producto</td>
                    <td className="p-3">{viewModal.producto}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Cantidad</td>
                    <td className="p-3 font-bold text-lg">{viewModal.cantidad}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Suscripción</td>
                    <td className="p-3">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        ANUAL
                      </span>
                    </td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Fecha Compra</td>
                    <td className="p-3">{viewModal.fechaCompra}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Fecha Renovación</td>
                    <td className="p-3 font-bold">{viewModal.fechaRenovacion}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Estado</td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <span className={`px-3 py-1 text-sm rounded block w-full text-center font-semibold ${
                          viewModal.estado === 'VIGENTE' ? 'bg-green-600 text-white' :
                          viewModal.estado === 'POR VENCER' ? 'bg-yellow-600 text-white' :
                          'bg-red-600 text-white'
                        }`}>
                          {viewModal.estado}
                        </span>
                        <span className={`text-sm font-bold text-center block pt-1 ${
                          viewModal.estado === 'VENCIDO' ? 'text-red-600' :
                          viewModal.estado === 'POR VENCER' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {diasRestantes(viewModal.fechaRenovacion) >= 0 
                            ? `${diasRestantes(viewModal.fechaRenovacion)} días restantes` 
                            : 'Vencido'
                          }
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end px-6 py-4 bg-gray-50">
              <button
                onClick={() => setViewModal(null)}
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}