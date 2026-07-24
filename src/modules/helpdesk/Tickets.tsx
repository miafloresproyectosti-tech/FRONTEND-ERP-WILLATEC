import { useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  User,
  Ticket,
  X,
  Sparkles,
} from "lucide-react";

interface TicketSoporte {
  id: number;
  titulo: string;
  descripcion: string;
  prioridad: "Baja" | "Media" | "Alta";
  estado: "Pendiente" | "En Proceso" | "Resuelto";
  usuario: string;
  fecha: string;
}

const ticketInicial: TicketSoporte = {
  id: 0,
  titulo: "",
  descripcion: "",
  prioridad: "Media",
  estado: "Pendiente",
  usuario: "",
  fecha: "",
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketSoporte[]>([
    {
      id: 1,
      titulo: "Error en impresora",
      descripcion: "La impresora no responde en el área de ventas.",
      prioridad: "Alta",
      estado: "Pendiente",
      usuario: "Carlos Pérez",
      fecha: "14/05/2026",
    },
    {
      id: 2,
      titulo: "Instalar Office",
      descripcion: "Instalar Office en laptop nueva.",
      prioridad: "Media",
      estado: "En Proceso",
      usuario: "María López",
      fecha: "13/05/2026",
    },
    {
      id: 3,
      titulo: "PC lenta",
      descripcion: "La computadora demora demasiado.",
      prioridad: "Baja",
      estado: "Resuelto",
      usuario: "Juan Torres",
      fecha: "12/05/2026",
    },
  ]);

  const [busqueda, setBusqueda] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modo, setModo] = useState<"nuevo" | "editar" | "ver">(
    "nuevo"
  );
  const [ticketActual, setTicketActual] =
    useState<TicketSoporte>(ticketInicial);

  const ticketsFiltrados = tickets.filter((ticket) =>
    ticket.titulo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirNuevo = () => {
    setModo("nuevo");

    setTicketActual({
      ...ticketInicial,
      fecha: new Date().toLocaleDateString(),
    });

    setMostrarModal(true);
  };

  const abrirVer = (ticket: TicketSoporte) => {
    setModo("ver");
    setTicketActual(ticket);
    setMostrarModal(true);
  };

  const abrirEditar = (ticket: TicketSoporte) => {
    setModo("editar");
    setTicketActual(ticket);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
  };

  const guardarTicket = () => {
    if (
      !ticketActual.titulo ||
      !ticketActual.descripcion ||
      !ticketActual.usuario
    ) {
      alert("Completa todos los campos");
      return;
    }

    if (modo === "nuevo") {
      setTickets([
        {
          ...ticketActual,
          id: Date.now(),
        },
        ...tickets,
      ]);
    }

    if (modo === "editar") {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketActual.id ? ticketActual : t
        )
      );
    }

    cerrarModal();
  };

  const eliminarTicket = (id: number) => {
    const confirmar = window.confirm(
      "¿Deseas eliminar este ticket?"
    );

    if (confirmar) {
      setTickets((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const estadoColor = (estado: string) => {
    switch (estado) {
      case "Pendiente":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "En Proceso":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Resuelto":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const prioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "Alta":
        return "bg-red-100 text-red-700 border-red-200";
      case "Media":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "Baja":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-100 p-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg">
              <Ticket size={28} />
            </div>

            <div>
              <h1 className="text-4xl font-black text-slate-800">
                Tickets Soporte TI
              </h1>

              <p className="text-slate-500 mt-1">
                Gestión moderna de incidencias técnicas
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={abrirNuevo}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 transition-all text-white px-6 py-4 rounded-2xl shadow-xl font-semibold"
        >
          <Plus size={20} />
          Nuevo Ticket
        </button>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/80 backdrop-blur rounded-3xl p-6 border border-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">
                Pendientes
              </p>

              <h2 className="text-4xl font-black mt-2 text-slate-800">
                {
                  tickets.filter((t) => t.estado === "Pendiente")
                    .length
                }
              </h2>
            </div>

            <div className="bg-yellow-100 p-4 rounded-2xl">
              <Clock3 className="text-yellow-600" size={30} />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-3xl p-6 border border-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">
                En Proceso
              </p>

              <h2 className="text-4xl font-black mt-2 text-slate-800">
                {
                  tickets.filter(
                    (t) => t.estado === "En Proceso"
                  ).length
                }
              </h2>
            </div>

            <div className="bg-blue-100 p-4 rounded-2xl">
              <AlertTriangle
                className="text-blue-600"
                size={30}
              />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-3xl p-6 border border-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">
                Resueltos
              </p>

              <h2 className="text-4xl font-black mt-2 text-slate-800">
                {
                  tickets.filter((t) => t.estado === "Resuelto")
                    .length
                }
              </h2>
            </div>

            <div className="bg-green-100 p-4 rounded-2xl">
              <CheckCircle2
                className="text-green-600"
                size={30}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white/80 backdrop-blur border border-white shadow-xl rounded-3xl p-5 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-2xl px-4 flex-1">
            <Search size={20} className="text-slate-400" />

            <input
              type="text"
              placeholder="Buscar tickets..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
              className="w-full bg-transparent outline-none px-4 py-4"
            />
          </div>

          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-4 rounded-2xl flex items-center gap-2 shadow-lg">
            <Sparkles size={18} />
            Soporte
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white/80 backdrop-blur rounded-3xl border border-white shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr className="text-left text-slate-600 text-sm">
                <th className="p-5">Ticket</th>
                <th className="p-5">Usuario</th>
                <th className="p-5">Prioridad</th>
                <th className="p-5">Estado</th>
                <th className="p-5">Fecha</th>
                <th className="p-5 text-center">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {ticketsFiltrados.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="border-t hover:bg-slate-50 transition"
                >
                  <td className="p-5">
                    <div className="flex gap-4">
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-3 rounded-2xl shadow-lg h-fit">
                        <Ticket size={20} />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-800">
                          {ticket.titulo}
                        </h3>

                        <p className="text-sm text-slate-500 mt-1 max-w-md">
                          {ticket.descripcion}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="p-5">
                    <div className="flex items-center gap-2 text-slate-700">
                      <User size={17} />
                      {ticket.usuario}
                    </div>
                  </td>

                  <td className="p-5">
                    <span
                      className={`px-4 py-2 rounded-full text-xs font-bold border ${prioridadColor(
                        ticket.prioridad
                      )}`}
                    >
                      {ticket.prioridad}
                    </span>
                  </td>

                  <td className="p-5">
                    <span
                      className={`px-4 py-2 rounded-full text-xs font-bold border ${estadoColor(
                        ticket.estado
                      )}`}
                    >
                      {ticket.estado}
                    </span>
                  </td>

                  <td className="p-5 text-slate-500 font-medium">
                    {ticket.fecha}
                  </td>

                  <td className="p-5">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => abrirVer(ticket)}
                        className="bg-slate-100 hover:bg-slate-200 p-3 rounded-xl transition"
                      >
                        <Eye size={18} />
                      </button>

                      <button
                        onClick={() =>
                          abrirEditar(ticket)
                        }
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-3 rounded-xl transition"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() =>
                          eliminarTicket(ticket.id)
                        }
                        className="bg-red-100 hover:bg-red-200 text-red-700 p-3 rounded-xl transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {ticketsFiltrados.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              No se encontraron tickets
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black">
                  {modo === "nuevo" &&
                    "Nuevo Ticket"}
                  {modo === "editar" &&
                    "Editar Ticket"}
                  {modo === "ver" &&
                    "Detalle del Ticket"}
                </h2>

                <p className="text-blue-100 mt-1">
                  Gestión de soporte TI
                </p>
              </div>

              <button
                onClick={cerrarModal}
                className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition"
              >
                <X />
              </button>
            </div>

            {/* BODY */}
            <div className="p-7 space-y-5">
              <div>
                <label className="font-semibold text-slate-700">
                  Título
                </label>

                <input
                  type="text"
                  disabled={modo === "ver"}
                  value={ticketActual.titulo}
                  onChange={(e) =>
                    setTicketActual({
                      ...ticketActual,
                      titulo: e.target.value,
                    })
                  }
                  className="w-full mt-2 border-2 border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">
                  Descripción
                </label>

                <textarea
                  rows={4}
                  disabled={modo === "ver"}
                  value={ticketActual.descripcion}
                  onChange={(e) =>
                    setTicketActual({
                      ...ticketActual,
                      descripcion: e.target.value,
                    })
                  }
                  className="w-full mt-2 border-2 border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-blue-500 resize-none transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="font-semibold text-slate-700">
                    Usuario
                  </label>

                  <input
                    type="text"
                    disabled={modo === "ver"}
                    value={ticketActual.usuario}
                    onChange={(e) =>
                      setTicketActual({
                        ...ticketActual,
                        usuario: e.target.value,
                      })
                    }
                    className="w-full mt-2 border-2 border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">
                    Prioridad
                  </label>

                  <select
                    disabled={modo === "ver"}
                    value={ticketActual.prioridad}
                    onChange={(e) =>
                      setTicketActual({
                        ...ticketActual,
                        prioridad:
                          e.target.value as TicketSoporte["prioridad"],
                      })
                    }
                    className="w-full mt-2 border-2 border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-blue-500 transition"
                  >
                    <option>Baja</option>
                    <option>Media</option>
                    <option>Alta</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">
                    Estado
                  </label>

                  <select
                    disabled={modo === "ver"}
                    value={ticketActual.estado}
                    onChange={(e) =>
                      setTicketActual({
                        ...ticketActual,
                        estado:
                          e.target.value as TicketSoporte["estado"],
                      })
                    }
                    className="w-full mt-2 border-2 border-slate-200 rounded-2xl px-4 py-4 outline-none focus:border-blue-500 transition"
                  >
                    <option>Pendiente</option>
                    <option>En Proceso</option>
                    <option>Resuelto</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">
                    Fecha
                  </label>

                  <input
                    disabled
                    value={ticketActual.fecha}
                    className="w-full mt-2 border-2 border-slate-200 bg-slate-100 rounded-2xl px-4 py-4"
                  />
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="border-t bg-slate-50 p-6 flex justify-end gap-4">
              <button
                onClick={cerrarModal}
                className="px-6 py-3 rounded-2xl border border-slate-300 hover:bg-slate-100 transition font-semibold"
              >
                Cerrar
              </button>

              {modo !== "ver" && (
                <button
                  onClick={guardarTicket}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:scale-105 transition"
                >
                  Guardar Ticket
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}