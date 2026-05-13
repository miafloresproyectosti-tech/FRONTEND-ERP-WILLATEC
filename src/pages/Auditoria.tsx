import { useState } from "react";
import { useAudit } from "../context/AuditContext";
import {
  Search,
  Download,
  Filter,
  User,
  Calendar,
  Layers,
} from "lucide-react";

export default function Auditoria() {
  const { logs } = useAudit();

  const [search, setSearch] = useState("");
  const [filterModulo, setFilterModulo] = useState("todos");

  // FILTRADO
  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      log.usuario.toLowerCase().includes(search.toLowerCase()) ||
      log.accion.toLowerCase().includes(search.toLowerCase()) ||
      log.detalle.toLowerCase().includes(search.toLowerCase());

    const matchModulo =
      filterModulo === "todos" || log.modulo === filterModulo;

    return matchSearch && matchModulo;
  });

  // EXPORT CSV
  const exportCSV = () => {
    const header = ["Usuario", "Rol", "Acción", "Módulo", "Detalle", "Fecha"];

    const rows = filteredLogs.map((l) => [
      l.usuario,
      l.rol,
      l.accion,
      l.modulo,
      l.detalle,
      l.fecha,
    ]);

    const csvContent =
      [header, ...rows].map((e) => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "auditoria.csv";
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Auditoría del Sistema
          </h1>
          <p className="text-gray-500">
            Registro de acciones realizadas en el ERP
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
        >
          <Download size={18} />
          Exportar
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-2xl shadow flex gap-4 items-center">
        <div className="flex items-center gap-2 flex-1">
          <Search size={18} className="text-gray-500" />
          <input
            placeholder="Buscar usuario, acción o detalle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={18} />
          <select
            value={filterModulo}
            onChange={(e) => setFilterModulo(e.target.value)}
            className="border px-3 py-2 rounded-xl"
          >
            <option value="todos">Todos</option>
            <option value="productos">Productos</option>
            <option value="clientes">Clientes</option>
            <option value="cotizaciones">Cotizaciones</option>
            <option value="usuarios">Usuarios</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Usuario</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Acción</th>
              <th className="p-3">Módulo</th>
              <th className="p-3">Detalle</th>
              <th className="p-3">Fecha</th>
            </tr>
          </thead>

          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-6 text-gray-500">
                  Sin registros
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-3 flex items-center gap-2">
                    <User size={16} />
                    {log.usuario}
                  </td>
                  <td className="p-3">{log.rol}</td>
                  <td className="p-3 font-semibold">{log.accion}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1">
                      <Layers size={14} />
                      {log.modulo}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">{log.detalle}</td>
                  <td className="p-3 text-sm text-gray-500 flex items-center gap-1">
                    <Calendar size={14} />
                    {log.fecha}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}