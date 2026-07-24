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

interface Hosting {
  id: number;
  empresa: string;
  ruc: string;
  dominio: string;
  plan: string;
  suscripcion: "ANUAL" | "MENSUAL";
  fechaInicio: string;
  fechaRenovacion: string;
  contacto: string;
  cliente: string;
  estado: "VIGENTE" | "POR VENCER" | "VENCIDO";
}

export default function Hosting() {
  const [hostings, setHostings] = useState<Hosting[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [outlookRedirecting, setOutlookRedirecting] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [filterSus, setFilterSus] = useState("TODOS");
  const [filterEstado, setFilterEstado] = useState("TODOS");

  const [openModal, setOpenModal] = useState(false);
  const [viewModal, setViewModal] = useState<Hosting | null>(null);

  const [form, setForm] = useState({
    empresa: "",
    ruc: "",
    dominio: "",
    plan: "",
    suscripcion: "ANUAL",
    fechaInicio: "",
    fechaRenovacion: "",
    contacto: "",
    cliente: "",
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;

    let newForm = { ...form, [name]: value };

    if (name === "fechaInicio") {
      const d = new Date(value);
      if (newForm.suscripcion === "ANUAL") {
        d.setFullYear(d.getFullYear() + 1);
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      newForm.fechaRenovacion = d.toISOString().split("T")[0];
    }

    setForm(newForm);
  };

  const diasRestantes = (fecha: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    return Math.ceil((vencimiento.getTime() - hoy.getTime()) / 86400000);
  };

  const getEstado = (fecha: string): Hosting["estado"] => {
    const dias = diasRestantes(fecha);
    if (dias < 0) return "VENCIDO";
    if (dias <= 30) return "POR VENCER";
    return "VIGENTE";
  };

  const handleGuardar = () => {
    const nuevo: Hosting = {
      id: editingId || Date.now(),
      empresa: form.empresa,
      ruc: form.ruc,
      dominio: form.dominio,
      plan: form.plan,
      suscripcion: form.suscripcion as "ANUAL" | "MENSUAL",
      fechaInicio: form.fechaInicio,
      fechaRenovacion: form.fechaRenovacion,
      contacto: form.contacto,
      cliente: form.cliente,
      estado: getEstado(form.fechaRenovacion),
    };

    if (editingId) {
      setHostings(hostings.map(h => h.id === editingId ? nuevo : h));
      setEditingId(null);
    } else {
      setHostings([...hostings, nuevo]);
    }

    setOpenModal(false);
    resetForm();
  };

  const handleEditar = (hosting: Hosting) => {
    setForm({
      empresa: hosting.empresa,
      ruc: hosting.ruc,
      dominio: hosting.dominio,
      plan: hosting.plan,
      suscripcion: hosting.suscripcion,
      fechaInicio: hosting.fechaInicio,
      fechaRenovacion: hosting.fechaRenovacion,
      contacto: hosting.contacto,
      cliente: hosting.cliente,
    });
    setEditingId(hosting.id);
    setOpenModal(true);
  };

  const handleEliminar = (id: number) => {
    setHostings(hostings.filter(h => h.id !== id));
  };

  const handleOutlook = (hosting: Hosting) => {
    setOutlookRedirecting(hosting.id);
    setTimeout(() => {
      window.open('https://outlook.office.com/', '_blank');
      setOutlookRedirecting(null);
    }, 1000);
  };

  const resetForm = () => {
    setForm({
      empresa: "",
      ruc: "",
      dominio: "",
      plan: "",
      suscripcion: "ANUAL",
      fechaInicio: "",
      fechaRenovacion: "",
      contacto: "",
      cliente: "",
    });
  };

  const exportToCSV = () => {
    const data = filtrados.length > 0 ? filtrados : hostings;
    const csv = [
      ['Empresa', 'RUC', 'Dominio', 'Plan', 'Suscripción', 'Fecha Inicio', 'Fecha Renovación', 'Contacto', 'Cliente', 'Estado'],
      ...data.map(h => [
        h.empresa,
        h.ruc,
        h.dominio,
        h.plan,
        h.suscripcion,
        h.fechaInicio,
        h.fechaRenovacion,
        h.contacto,
        h.cliente,
        h.estado
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hosting_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    alert('Exportando PDF... (Funcionalidad simulada - integra jsPDF para implementación completa)');
    
    const data = filtrados.length > 0 ? filtrados : hostings;
    console.log('Datos para PDF:', data);
  };

  const confirmDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este hosting?')) {
      handleEliminar(id);
    }
  };

  const filtrados = hostings.filter((h) => {
    const matchSearch =
      `${h.empresa} ${h.dominio} ${h.ruc}`.toLowerCase().includes(search.toLowerCase());

    return (
      matchSearch &&
      (filterSus === "TODOS" || h.suscripcion === filterSus) &&
      (filterEstado === "TODOS" || h.estado === filterEstado)
    );
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Hosting</h1>

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
            <Plus size={16} /> Nuevo Hosting
          </button>
        </div>
      </div>

      {/* DASHBOARD */}
      <div className="grid grid-cols-3 gap-4">

        <div className="bg-red-600 text-white p-5 rounded-xl shadow hover:shadow-lg transition-shadow">
          <div className="flex justify-between">
            <XCircle />
            <span>Vencidos</span>
          </div>
          <h2 className="text-3xl font-bold mt-2">
            {hostings.filter(h => h.estado === "VENCIDO").length}
          </h2>
        </div>

        <div className="bg-yellow-500 text-white p-5 rounded-xl shadow hover:shadow-lg transition-shadow">
          <div className="flex justify-between">
            <AlertCircle />
            <span>Por vencer</span>
          </div>
          <h2 className="text-3xl font-bold mt-2">
            {hostings.filter(h => h.estado === "POR VENCER").length}
          </h2>
        </div>

        <div className="bg-green-600 text-white p-5 rounded-xl shadow hover:shadow-lg transition-shadow">
          <div className="flex justify-between">
            <CheckCircle2 />
            <span>Vigentes</span>
          </div>
          <h2 className="text-3xl font-bold mt-2">
            {hostings.filter(h => h.estado === "VIGENTE").length}
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
          <option>MENSUAL</option>
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
            placeholder="Buscar empresa, dominio o RUC..."
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
              <th className="p-3 text-left font-semibold">RUC</th>
              <th className="p-3 text-left font-semibold">Dominio</th>
              <th className="p-3 text-left font-semibold">Plan</th>
              <th className="p-3 text-left font-semibold">Suscripción</th>
              <th className="p-3 text-left font-semibold">F. Inicio</th>
              <th className="p-3 text-left font-semibold">F. Renovación</th>
              <th className="p-3 text-left font-semibold">Estado</th>
              <th className="p-3 text-left font-semibold">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  No hay hostings que mostrar
                </td>
              </tr>
            ) : (
              filtrados.map((h) => (
                <tr key={h.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-medium">{h.empresa}</td>
                  <td className="p-3">{h.ruc}</td>
                  <td className="p-3 font-medium text-blue-600">{h.dominio}</td>
                  <td className="p-3">{h.plan}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      h.suscripcion === 'ANUAL' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {h.suscripcion}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">{h.fechaInicio}</td>
                  <td className="p-3 text-gray-600">{h.fechaRenovacion}</td>

                  <td className="p-3">
                    <div className="space-y-1 max-w-[100px]">
                      <span className={`px-2 py-1 text-xs rounded block w-full text-center font-medium ${
                        h.estado === 'VIGENTE' ? 'bg-green-600 text-white' :
                        h.estado === 'POR VENCER' ? 'bg-yellow-600 text-white' :
                        'bg-red-600 text-white'
                      }`}>
                        {h.estado}
                      </span>
                      <span className={`text-xs font-bold text-center block ${
                        h.estado === 'VENCIDO' ? 'text-red-600' :
                        h.estado === 'POR VENCER' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {diasRestantes(h.fechaRenovacion) >= 0 
                          ? `${diasRestantes(h.fechaRenovacion)} días` 
                          : 'Vencido'
                        }
                      </span>
                    </div>
                  </td>

                  <td className="p-3 flex gap-1">
                    <button
                      onClick={() => setViewModal(h)}
                      className="bg-gray-100 p-2 rounded hover:bg-gray-200 transition-colors"
                      title="Ver detalle"
                    >
                      <Eye size={14} />
                    </button>

                    <button 
                      onClick={() => handleEditar(h)}
                      className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>

                    <button 
                      onClick={() => confirmDelete(h.id)}
                      className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>

                    <button 
                      onClick={() => handleOutlook(h)}
                      className={`p-2 rounded flex items-center justify-center transition-all ${
                        outlookRedirecting === h.id 
                          ? 'bg-blue-500 text-white animate-pulse' 
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                      title="Outlook"
                      disabled={outlookRedirecting === h.id}
                    >
                      {outlookRedirecting === h.id ? (
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

      {/* MODAL NUEVO/EDITAR HOSTING */}
      {openModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-[650px] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Editar Hosting' : 'Nuevo Hosting'}
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
                name="ruc" 
                placeholder="RUC"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.ruc}
                onChange={handleChange} 
              />

              <input 
                name="dominio" 
                placeholder="Dominio (ej: ejemplo.com)"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.dominio}
                onChange={handleChange} 
              />

              <input 
                name="plan" 
                placeholder="Descripción del plan"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.plan}
                onChange={handleChange} 
              />

              <select
                name="suscripcion"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.suscripcion}
                onChange={handleChange}
              >
                <option value="ANUAL">ANUAL</option>
                <option value="MENSUAL">MENSUAL</option>
              </select>

              <input 
                type="date" 
                name="fechaInicio"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.fechaInicio}
                onChange={handleChange} 
              />

              <input 
                type="date"
                name="fechaRenovacion"
                value={form.fechaRenovacion}
                className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 cursor-not-allowed"
                readOnly 
              />

              <input 
                name="contacto" 
                placeholder="Contacto"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.contacto}
                onChange={handleChange} 
              />

              <input 
                name="cliente" 
                placeholder="Cliente"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.cliente}
                onChange={handleChange} 
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
                disabled={!form.empresa || !form.dominio || !form.plan || !form.fechaInicio}
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
          <div className="bg-white rounded-2xl w-full max-w-[550px] shadow-2xl overflow-hidden">

            <div className="bg-gray-900 text-white px-6 py-4">
              <h2 className="text-lg font-semibold">Detalle de Hosting</h2>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50 w-1/3">Empresa</td>
                    <td className="p-3">{viewModal.empresa}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">RUC</td>
                    <td className="p-3">{viewModal.ruc}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Dominio</td>
                    <td className="p-3 font-bold text-blue-600">{viewModal.dominio}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Plan</td>
                    <td className="p-3">{viewModal.plan}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Suscripción</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        viewModal.suscripcion === 'ANUAL' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {viewModal.suscripcion}
                      </span>
                    </td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Fecha Inicio</td>
                    <td className="p-3">{viewModal.fechaInicio}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Fecha Renovación</td>
                    <td className="p-3 font-bold">{viewModal.fechaRenovacion}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Contacto</td>
                    <td className="p-3">{viewModal.contacto}</td>
                  </tr>

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Cliente</td>
                    <td className="p-3">{viewModal.cliente}</td>
                  </tr>

                  <tr>
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