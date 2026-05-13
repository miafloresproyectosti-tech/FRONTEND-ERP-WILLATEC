import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Search,
  Eye,
  Calendar,
  Filter,
  FileText,
  Download,
  FileSpreadsheet,
} from "lucide-react";

import { useAuth } from "../AuthContext";
import { useNotifications } from "../NotificationContext";

const ordenesCompra = [
  {
    id: "OC-001",
    cotizacionId: "COT-001",
    proveedor: "Proveedor A",
    fecha: "2026-05-10",
    total: 1500,
    estado: "pendiente",
  },
  {
    id: "OC-002",
    cotizacionId: "COT-002",
    proveedor: "Proveedor B",
    fecha: "2026-05-11",
    total: 3200,
    estado: "aprobada",
  },
];

export default function OrdenesCompraPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");

  const filteredOrdenes = ordenesCompra.filter((oc) => {
    const matchesSearch =
      oc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      oc.proveedor.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEstado =
      filterEstado === "todos" || oc.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  // 🔥 EXPORTAR PDF
  const exportarPDF = () => {
    const contenido = `
      <html>
        <head>
          <title>Órdenes de Compra</title>
        </head>

        <body style="font-family: Arial; padding: 20px;">
          <h1>Órdenes de Compra</h1>

          <table border="1" cellspacing="0" cellpadding="8" width="100%">
            <thead>
              <tr>
                <th>OC</th>
                <th>Cotización</th>
                <th>Proveedor</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              ${filteredOrdenes
                .map(
                  (oc) => `
                <tr>
                  <td>${oc.id}</td>
                  <td>${oc.cotizacionId}</td>
                  <td>${oc.proveedor}</td>
                  <td>${oc.fecha}</td>
                  <td>S/. ${oc.total}</td>
                  <td>${oc.estado}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const ventana = window.open("", "_blank");

    if (ventana) {
      ventana.document.write(contenido);
      ventana.document.close();
      ventana.print();
    }

    addNotification({
      title: "PDF exportado",
      description: "Las órdenes de compra fueron exportadas en PDF",
      type: "success",
      icon: "CheckCircle",
      route: "/ordenes-compra",
    });
  };

  // 🔥 EXPORTAR EXCEL
  const exportarExcel = () => {
    const encabezados = [
      "OC",
      "Cotización",
      "Proveedor",
      "Fecha",
      "Total",
      "Estado",
    ];

    const filas = filteredOrdenes.map((oc) => [
      oc.id,
      oc.cotizacionId,
      oc.proveedor,
      oc.fecha,
      oc.total,
      oc.estado,
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) => fila.join(","))
      .join("\n");

    const blob = new Blob([contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "ordenes_compra.csv";

    link.click();

    URL.revokeObjectURL(url);

    addNotification({
      title: "Excel exportado",
      description: "Las órdenes de compra fueron exportadas en Excel",
      type: "success",
      icon: "CheckCircle",
      route: "/ordenes-compra",
    });
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">

        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Órdenes de Compra
          </h1>

          <p className="text-slate-500 dark:text-slate-400">
            Gestión de órdenes de compra tipo ERP
          </p>

          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Usuario: {user?.name || "Invitado"}
          </p>
        </div>

        <div className="flex items-center gap-3">

          {/* PDF */}
          <button
            onClick={exportarPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-2xl flex items-center gap-2 transition"
          >
            <Download size={18} />
            PDF
          </button>

          {/* EXCEL */}
          <button
            onClick={exportarExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl flex items-center gap-2 transition"
          >
            <FileSpreadsheet size={18} />
            Excel
          </button>

        </div>

      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-2xl">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pendientes
              </p>

              <h2 className="text-2xl font-bold text-yellow-600">
                {
                  ordenesCompra.filter(
                    (oc) => oc.estado === "pendiente"
                  ).length
                }
              </h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-2xl">
              <FileText className="w-6 h-6 text-green-600" />
            </div>

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aprobadas
              </p>

              <h2 className="text-2xl font-bold text-green-600">
                {
                  ordenesCompra.filter(
                    (oc) => oc.estado === "aprobada"
                  ).length
                }
              </h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-2xl">
              <FileText className="w-6 h-6 text-red-600" />
            </div>

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Rechazadas
              </p>

              <h2 className="text-2xl font-bold text-red-600">
                {
                  ordenesCompra.filter(
                    (oc) => oc.estado === "rechazada"
                  ).length
                }
              </h2>
            </div>
          </div>
        </div>

      </div>

      {/* FILTROS */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">

        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
          <Filter size={18} />
          <span>Filtros</span>
        </div>

        <div className="flex gap-3 w-full">

          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />

            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar OC..."
              className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl outline-none border border-slate-200 dark:border-slate-700"
            />
          </div>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
          </select>

        </div>

      </div>

      {/* TABLA */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-6 py-4">OC</th>
                <th className="text-left px-6 py-4">Cotización</th>
                <th className="text-left px-6 py-4">Proveedor</th>
                <th className="text-left px-6 py-4">Fecha</th>
                <th className="text-left px-6 py-4">Total</th>
                <th className="text-left px-6 py-4">Estado</th>
                <th className="text-center px-6 py-4">Acciones</th>
              </tr>
            </thead>

            <tbody>

              {filteredOrdenes.map((oc) => (
                <tr
                  key={oc.id}
                  className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                >

                  <td className="px-6 py-5 font-bold text-blue-600">
                    {oc.id}
                  </td>

                  <td className="px-6 py-5">
                    {oc.cotizacionId}
                  </td>

                  <td className="px-6 py-5">
                    {oc.proveedor}
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      {oc.fecha}
                    </div>
                  </td>

                  <td className="px-6 py-5 font-semibold">
                    S/. {oc.total}
                  </td>

                  <td className="px-6 py-5">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {oc.estado}
                    </span>
                  </td>

                  <td className="px-6 py-5">

                    <div className="flex items-center justify-center gap-3">

                      <button
                        onClick={() =>
                          navigate(`/ordenes-compra/${oc.id}`)
                        }
                        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 transition"
                      >
                        <Eye size={18} />
                      </button>

                    </div>

                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}