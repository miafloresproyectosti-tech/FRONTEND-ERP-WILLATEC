import { useEffect, useState } from "react";
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

import {
  createHosting,
  deleteHosting,
  getHostings,
  updateHosting,
  type HostingApi,
  type HostingPayload,
} from "../../services/hosting.service";
import {
  getActiveClientesSearchCached,
  type Cliente,
} from "../../services/cliente.service";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { exportExcelFile } from "../../utils/exportExcel";

interface Hosting {
  id: number;
  cliente_id?: number | null;
  empresa: string;
  ruc: string;
  dominio: string;
  plan: string;
  suscripcion: "ANUAL" | "MENSUAL";
  fechaInicio: string;
  fechaRenovacion: string;
  contacto: string;
  cliente: string;
  correoHosting: string;
  estado: "VIGENTE" | "POR VENCER" | "VENCIDO";
}

export default function Hosting() {
  const [hostings, setHostings] = useState<Hosting[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [outlookRedirecting, setOutlookRedirecting] = useState<number | null>(null);
  const [loadingHostings, setLoadingHostings] = useState(false);
  const [savingHosting, setSavingHosting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const [search, setSearch] = useState("");
  const [filterSus, setFilterSus] = useState("TODOS");
  const [filterEstado, setFilterEstado] = useState("TODOS");

  const [openModal, setOpenModal] = useState(false);
  const [viewModal, setViewModal] = useState<Hosting | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const debouncedClienteSearch = useDebouncedValue(clienteSearch, 300);

  const [form, setForm] = useState({
    cliente_id: "",
    empresa: "",
    ruc: "",
    dominio: "",
    plan: "",
    suscripcion: "ANUAL",
    fechaInicio: "",
    fechaRenovacion: "",
    contacto: "",
    cliente: "",
    correoHosting: "",
  });

  const mapHosting = (hosting: HostingApi): Hosting => ({
    id: hosting.id,
    cliente_id: hosting.cliente_id ?? null,
    empresa: hosting.empresa,
    ruc: hosting.ruc || "",
    dominio: hosting.dominio,
    plan: hosting.plan,
    suscripcion: hosting.suscripcion,
    fechaInicio: hosting.fecha_inicio,
    fechaRenovacion: hosting.fecha_renovacion,
    contacto: hosting.contacto || "",
    cliente: hosting.cliente || hosting.cliente_relacionado?.nombre || "",
    correoHosting: hosting.correo_hosting || hosting.cliente_relacionado?.correo || "",
    estado: getEstado(hosting.fecha_renovacion),
  });

  const calculateFechaRenovacion = (
    fechaInicio: string,
    suscripcion: string
  ) => {
    if (!fechaInicio) return "";

    const [year, month, day] = fechaInicio.split("-").map(Number);
    const fecha = new Date(year, month - 1, day);

    if (suscripcion === "MENSUAL") {
      fecha.setMonth(fecha.getMonth() + 1);
    } else {
      fecha.setFullYear(fecha.getFullYear() + 1);
    }

    fecha.setDate(fecha.getDate() - 1);

    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const dd = String(fecha.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;

    let newForm = { ...form, [name]: value };

    if (name === "fechaInicio" || name === "suscripcion") {
      newForm.fechaRenovacion = calculateFechaRenovacion(
        name === "fechaInicio" ? value : form.fechaInicio,
        name === "suscripcion" ? value : form.suscripcion
      );
    }

    setForm(newForm);
  };

  useEffect(() => {
    if (!openModal || !showClienteDropdown) return;

    let cancelled = false;

    const fetchClientes = async () => {
      try {
        setClientesLoading(true);
        const data = await getActiveClientesSearchCached(debouncedClienteSearch);

        if (!cancelled) {
          setClientes(data);
        }
      } catch (error) {
        console.error("Error al buscar clientes:", error);
        if (!cancelled) setClientes([]);
      } finally {
        if (!cancelled) setClientesLoading(false);
      }
    };

    void fetchClientes();

    return () => {
      cancelled = true;
    };
  }, [debouncedClienteSearch, openModal, showClienteDropdown]);

  const handleClienteSelect = (cliente: Cliente) => {
    setForm((currentForm) => ({
      ...currentForm,
      cliente_id: String(cliente.id),
      empresa: cliente.nombre,
      ruc: cliente.ruc || currentForm.ruc,
      cliente: cliente.nombre,
      correoHosting: currentForm.correoHosting || cliente.correo || "",
    }));
    setClienteSearch(cliente.nombre);
    setShowClienteDropdown(false);
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

  const loadHostings = async () => {
    try {
      setLoadingHostings(true);
      const response = await getHostings({ perPage: 100 });
      const data = Array.isArray(response) ? response : response.data || [];
      setHostings(data.map(mapHosting));
    } catch (error) {
      console.error("Error al cargar hostings:", error);
      alert("No se pudieron cargar los hostings.");
    } finally {
      setLoadingHostings(false);
    }
  };

  useEffect(() => {
    void loadHostings();
  }, []);

  const handleGuardar = async () => {
    const payload: HostingPayload = {
      cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
      empresa: form.empresa,
      ruc: form.ruc.trim() || null,
      dominio: form.dominio,
      plan: form.plan,
      suscripcion: form.suscripcion as "ANUAL" | "MENSUAL",
      fecha_inicio: form.fechaInicio,
      contacto: form.contacto.trim() || null,
      cliente: form.cliente.trim() || null,
      correo_hosting: form.correoHosting.trim() || null,
    };

    try {
      setSavingHosting(true);
      const saved = editingId
        ? await updateHosting(editingId, payload)
        : await createHosting(payload);
      const mapped = mapHosting(saved);

      if (editingId) {
        setHostings((current) =>
          current.map((hosting) =>
            hosting.id === editingId ? mapped : hosting
          )
        );
        setEditingId(null);
      } else {
        setHostings((current) => [mapped, ...current]);
      }

      setOpenModal(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar hosting:", error);
      alert("No se pudo guardar el hosting. Revisa los datos ingresados.");
    } finally {
      setSavingHosting(false);
    }
  };

  const handleEditar = (hosting: Hosting) => {
    setForm({
      cliente_id: hosting.cliente_id ? String(hosting.cliente_id) : "",
      empresa: hosting.empresa,
      ruc: hosting.ruc,
      dominio: hosting.dominio,
      plan: hosting.plan,
      suscripcion: hosting.suscripcion,
      fechaInicio: hosting.fechaInicio,
      fechaRenovacion: hosting.fechaRenovacion,
      contacto: hosting.contacto,
      cliente: hosting.cliente,
      correoHosting: hosting.correoHosting,
    });
    setClienteSearch(hosting.cliente || hosting.empresa);
    setEditingId(hosting.id);
    setOpenModal(true);
  };

  const handleEliminar = async (id: number) => {
    try {
      await deleteHosting(id);
      setHostings((current) => current.filter(h => h.id !== id));
    } catch (error) {
      console.error("Error al eliminar hosting:", error);
      alert("No se pudo eliminar el hosting.");
    }
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
      cliente_id: "",
      empresa: "",
      ruc: "",
      dominio: "",
      plan: "",
      suscripcion: "ANUAL",
      fechaInicio: "",
      fechaRenovacion: "",
      contacto: "",
      cliente: "",
      correoHosting: "",
    });
    setClienteSearch("");
    setShowClienteDropdown(false);
  };

  const exportToExcel = async () => {
    const data = filtrados.length > 0 ? filtrados : hostings;

    try {
      setExportingExcel(true);
      await exportExcelFile({
        filename: `hosting_${new Date().toISOString().split("T")[0]}.xlsx`,
        title: "HOSTING",
        columns: [
          { header: "Empresa", key: "empresa", width: 34 },
          { header: "RUC", key: "ruc", width: 16 },
          { header: "Dominio", key: "dominio", width: 28 },
          { header: "Plan", key: "plan", width: 28 },
          { header: "Suscripcion", key: "suscripcion", width: 16 },
          { header: "Fecha inicio", key: "fechaInicio", width: 16 },
          { header: "Fecha renovacion", key: "fechaRenovacion", width: 18 },
          { header: "Contacto", key: "contacto", width: 24 },
          { header: "Cliente", key: "cliente", width: 30 },
          { header: "Correo hosting", key: "correoHosting", width: 32 },
          { header: "Estado", key: "estado", width: 16 },
        ],
        rows: data.map((hosting) => ({
          empresa: hosting.empresa,
          ruc: hosting.ruc,
          dominio: hosting.dominio,
          plan: hosting.plan,
          suscripcion: hosting.suscripcion,
          fechaInicio: hosting.fechaInicio,
          fechaRenovacion: hosting.fechaRenovacion,
          contacto: hosting.contacto,
          cliente: hosting.cliente,
          correoHosting: hosting.correoHosting,
          estado: hosting.estado,
        })),
      });
    } catch (error) {
      console.error("Error al exportar hosting:", error);
      alert("No se pudo descargar el Excel de hosting.");
    } finally {
      setExportingExcel(false);
    }
  };

  const confirmDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este hosting?")) {
      void handleEliminar(id);
    }
  };

  const filtrados = hostings.filter((h) => {
    const matchSearch =
      `${h.empresa} ${h.dominio} ${h.ruc} ${h.cliente} ${h.correoHosting}`.toLowerCase().includes(search.toLowerCase());

    return (
      matchSearch &&
      (filterSus === "TODOS" || h.suscripcion === filterSus) &&
      (filterEstado === "TODOS" || h.estado === filterEstado)
    );
  });

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hosting</h1>
          <p className="text-sm text-gray-500">Control de dominios, planes y renovaciones</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void exportToExcel()}
            disabled={exportingExcel}
            className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            <Download size={16} /> {exportingExcel ? "Descargando..." : "Excel"}
          </button>
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setOpenModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={16} /> Nuevo Hosting
          </button>
        </div>
      </div>

      {/* DASHBOARD */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-800 shadow-sm">
          <div className="flex justify-between">
            <XCircle />
            <span>Vencidos</span>
          </div>
          <h2 className="text-3xl font-bold mt-2">
            {hostings.filter(h => h.estado === "VENCIDO").length}
          </h2>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-amber-800 shadow-sm">
          <div className="flex justify-between">
            <AlertCircle />
            <span>Por vencer</span>
          </div>
          <h2 className="text-3xl font-bold mt-2">
            {hostings.filter(h => h.estado === "POR VENCER").length}
          </h2>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-800 shadow-sm">
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
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row">

        <select 
          value={filterSus}
          onChange={(e) => setFilterSus(e.target.value)} 
          className="rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option>TODOS</option>
          <option>ANUAL</option>
          <option>MENSUAL</option>
        </select>

        <select 
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)} 
          className="rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option>TODOS</option>
          <option>VIGENTE</option>
          <option>POR VENCER</option>
          <option>VENCIDO</option>
        </select>

        <div className="flex w-full items-center gap-2 rounded-xl border border-gray-200 p-2.5 focus-within:ring-2 focus-within:ring-blue-500">
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
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full text-sm">

          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left font-semibold">Empresa</th>
              <th className="p-3 text-left font-semibold">RUC</th>
              <th className="p-3 text-left font-semibold">Dominio</th>
              <th className="p-3 text-left font-semibold">Plan</th>
              <th className="p-3 text-left font-semibold">Suscripción</th>
              <th className="p-3 text-left font-semibold">Correo hosting</th>
              <th className="p-3 text-left font-semibold">F. Inicio</th>
              <th className="p-3 text-left font-semibold">F. Renovación</th>
              <th className="p-3 text-left font-semibold">Estado</th>
              <th className="p-3 text-left font-semibold">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loadingHostings ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-gray-500">
                  Cargando hostings...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-gray-500">
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
                  <td className="p-3 text-gray-600">{h.correoHosting || "-"}</td>
                  <td className="p-3 text-gray-600">{h.fechaInicio}</td>
                  <td className="p-3 text-gray-600">{h.fechaRenovacion}</td>

                  <td className="p-3">
                    <div className="space-y-1 max-w-[100px]">
                      <span className={`px-2 py-1 text-xs rounded block w-full text-center font-medium ${
                        h.estado === 'VIGENTE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        h.estado === 'POR VENCER' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-red-50 text-red-700 border border-red-100'
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

                  <td className="p-3">
                    <div className="flex gap-1 whitespace-nowrap">
                    <button
                      onClick={() => setViewModal(h)}
                      className="bg-gray-100 p-2 rounded hover:bg-gray-200 transition-colors"
                      title="Ver detalle"
                    >
                      <Eye size={14} />
                    </button>

                    <button 
                      onClick={() => handleEditar(h)}
                      className="rounded-lg bg-blue-50 p-2 text-blue-700 transition-colors hover:bg-blue-100"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>

                    <button 
                      onClick={() => confirmDelete(h.id)}
                      className="rounded-lg bg-red-50 p-2 text-red-700 transition-colors hover:bg-red-100"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>

                    <button 
                      onClick={() => handleOutlook(h)}
                      className={`p-2 rounded flex items-center justify-center transition-all ${
                        outlookRedirecting === h.id 
                          ? 'bg-blue-500 text-white animate-pulse' 
                          : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
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
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

        </table>
        </div>
      </div>

      {/* MODAL NUEVO/EDITAR HOSTING */}
      {openModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="border-b border-gray-100 px-6 py-5">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Editar Hosting' : 'Nuevo Hosting'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Registra el servicio, dominio y datos de contacto para futuras renovaciones.
              </p>
            </div>

            <div className="space-y-6 overflow-y-auto p-6">

              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <div className="relative">
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Cliente asociado
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white p-3 focus-within:border-transparent focus-within:ring-2 focus-within:ring-blue-500">
                    <Search size={16} className="text-gray-400" />
                    <input
                      placeholder="Buscar cliente..."
                      className="w-full outline-none"
                      value={clienteSearch || form.cliente || form.empresa}
                      onChange={(event) => {
                        setClienteSearch(event.target.value);
                        setForm((currentForm) => ({
                          ...currentForm,
                          cliente_id: "",
                          cliente: event.target.value,
                          empresa: event.target.value,
                        }));
                        setShowClienteDropdown(true);
                      }}
                      onFocus={() => setShowClienteDropdown(true)}
                    />
                  </div>

                  {showClienteDropdown && (
                    <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                      {clientesLoading ? (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          Buscando clientes...
                        </div>
                      ) : clientes.length > 0 ? (
                        clientes.map((cliente) => (
                          <button
                            key={cliente.id}
                            type="button"
                            onClick={() => handleClienteSelect(cliente)}
                            className="w-full px-4 py-3 text-left text-sm transition hover:bg-blue-50"
                          >
                            <span className="block font-semibold text-gray-800">
                              {cliente.nombre}
                            </span>
                            <span className="block text-xs text-gray-500">
                              RUC {cliente.ruc || "-"} - {cliente.correo || "Sin correo"}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          No se encontraron clientes
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Empresa
                  </label>
                  <input
                    name="empresa"
                    placeholder="Nombre de la empresa"
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    value={form.empresa}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    RUC
                  </label>
                  <input
                    name="ruc"
                    placeholder="RUC"
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    value={form.ruc}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Dominio
                  </label>
                  <input
                    name="dominio"
                    placeholder="ejemplo.com"
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    value={form.dominio}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Plan
                  </label>
                  <input
                    name="plan"
                    placeholder="Descripción del plan"
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    value={form.plan}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Contacto
                  </label>
                  <input
                    name="contacto"
                    placeholder="Persona de contacto"
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    value={form.contacto}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Correo para hosting
                  </label>
                  <input
                    name="correoHosting"
                    placeholder="hosting@cliente.com"
                    type="email"
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    value={form.correoHosting}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Suscripción
                    </label>
                    <select
                      name="suscripcion"
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      value={form.suscripcion}
                      onChange={handleChange}
                    >
                      <option value="ANUAL">ANUAL</option>
                      <option value="MENSUAL">MENSUAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      name="fechaInicio"
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      value={form.fechaInicio}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                      Fecha Renovación
                    </label>
                    <input
                      type="date"
                      name="fechaRenovacion"
                      value={form.fechaRenovacion}
                      className="w-full cursor-not-allowed rounded-lg border border-blue-100 bg-white p-3 text-gray-600"
                      readOnly
                    />
                  </div>
                </div>
              </div>

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
                disabled={savingHosting || !form.empresa || !form.dominio || !form.plan || !form.fechaInicio}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {savingHosting ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-[550px] shadow-2xl overflow-hidden">

            <div className="border-b border-gray-100 px-6 py-4">
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

                  <tr className="border-b">
                    <td className="p-3 font-semibold bg-gray-50">Correo hosting</td>
                    <td className="p-3">{viewModal.correoHosting || "-"}</td>
                  </tr>

                  <tr>
                    <td className="p-3 font-semibold bg-gray-50">Estado</td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <span className={`px-3 py-1 text-sm rounded block w-full text-center font-semibold ${
                          viewModal.estado === 'VIGENTE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          viewModal.estado === 'POR VENCER' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-red-50 text-red-700 border border-red-100'
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

