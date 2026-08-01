import { useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ShieldCheck,
  CalendarDays,
  Laptop,
  User,
  X,
} from "lucide-react";

interface GarantiaEquipo {
  id: number;
  equipo: string;
  serie: string;
  cliente: string;
  fechaCompra: string;
  fechaGarantia: string;
  estado: "Vigente" | "Por vencer" | "Vencida";
}

const garantiaInicial: GarantiaEquipo = {
  id: 0,
  equipo: "",
  serie: "",
  cliente: "",
  fechaCompra: "",
  fechaGarantia: "",
  estado: "Vigente",
};

export default function EquiposGarantiaPage() {
  const [equipos, setEquipos] = useState<GarantiaEquipo[]>([
    {
      id: 1,
      equipo: "Laptop Lenovo ThinkPad",
      serie: "LEN-2026-001",
      cliente: "Carlos Pérez",
      fechaCompra: "10/01/2026",
      fechaGarantia: "10/01/2027",
      estado: "Vigente",
    },
    {
      id: 2,
      equipo: "Impresora Epson L3250",
      serie: "EPS-874521",
      cliente: "María López",
      fechaCompra: "05/02/2025",
      fechaGarantia: "05/02/2026",
      estado: "Por vencer",
    },
    {
      id: 3,
      equipo: "PC Gamer Ryzen 7",
      serie: "RYZ-993214",
      cliente: "Juan Torres",
      fechaCompra: "15/03/2024",
      fechaGarantia: "15/03/2025",
      estado: "Vencida",
    },
  ]);

  const [busqueda, setBusqueda] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);

  const [modo, setModo] = useState<
    "nuevo" | "editar" | "ver"
  >("nuevo");

  const [equipoActual, setEquipoActual] =
    useState<GarantiaEquipo>(garantiaInicial);

  const equiposFiltrados = equipos.filter((equipo) =>
    equipo.equipo
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  const abrirNuevo = () => {
    setModo("nuevo");
    setEquipoActual(garantiaInicial);
    setMostrarModal(true);
  };

  const abrirVer = (equipo: GarantiaEquipo) => {
    setModo("ver");
    setEquipoActual(equipo);
    setMostrarModal(true);
  };

  const abrirEditar = (equipo: GarantiaEquipo) => {
    setModo("editar");
    setEquipoActual(equipo);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
  };

  const guardarEquipo = () => {
    if (
      !equipoActual.equipo ||
      !equipoActual.serie ||
      !equipoActual.cliente
    ) {
      alert("Completa todos los campos");
      return;
    }

    if (modo === "nuevo") {
      setEquipos([
        {
          ...equipoActual,
          id: Date.now(),
        },
        ...equipos,
      ]);
    }

    if (modo === "editar") {
      setEquipos((prev) =>
        prev.map((e) =>
          e.id === equipoActual.id
            ? equipoActual
            : e
        )
      );
    }

    cerrarModal();
  };

  const eliminarEquipo = (id: number) => {
    const confirmar = window.confirm(
      "¿Deseas eliminar este equipo?"
    );

    if (confirmar) {
      setEquipos((prev) =>
        prev.filter((e) => e.id !== id)
      );
    }
  };

  const estadoColor = (estado: string) => {
    switch (estado) {
      case "Vigente":
        return "bg-green-100 text-green-700 border-green-200";

      case "Por vencer":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";

      case "Vencida":
        return "bg-red-100 text-red-700 border-red-200";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Equipos en Garantía
          </h1>

          <p className="text-gray-500 mt-1">
            Gestión de equipos y garantías
          </p>
        </div>

        <button
          onClick={abrirNuevo}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Nuevo Equipo
        </button>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Garantías Vigentes
              </p>

              <h2 className="text-3xl font-bold mt-2 text-gray-800">
                {
                  equipos.filter(
                    (e) => e.estado === "Vigente"
                  ).length
                }
              </h2>
            </div>

            <div className="bg-green-100 p-3 rounded-xl">
              <ShieldCheck
                className="text-green-600"
                size={22}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Por Vencer
              </p>

              <h2 className="text-3xl font-bold mt-2 text-gray-800">
                {
                  equipos.filter(
                    (e) => e.estado === "Por vencer"
                  ).length
                }
              </h2>
            </div>

            <div className="bg-yellow-100 p-3 rounded-xl">
              <CalendarDays
                className="text-yellow-600"
                size={22}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Garantías Vencidas
              </p>

              <h2 className="text-3xl font-bold mt-2 text-gray-800">
                {
                  equipos.filter(
                    (e) => e.estado === "Vencida"
                  ).length
                }
              </h2>
            </div>

            <div className="bg-red-100 p-3 rounded-xl">
              <ShieldCheck
                className="text-red-600"
                size={22}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center bg-gray-100 rounded-xl px-4">
          <Search
            size={18}
            className="text-gray-400"
          />

          <input
            type="text"
            placeholder="Buscar equipo..."
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
            className="w-full bg-transparent outline-none px-4 py-3"
          />
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-sm text-gray-500">
                <th className="p-5">Equipo</th>
                <th className="p-5">Cliente</th>
                <th className="p-5">Serie</th>
                <th className="p-5">Garantía</th>
                <th className="p-5">Estado</th>
                <th className="p-5 text-center">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {equiposFiltrados.map((equipo) => (
                <tr
                  key={equipo.id}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="p-5">
                    <div className="flex gap-4">
                      <div className="bg-gray-100 p-3 rounded-xl h-fit">
                        <Laptop
                          size={18}
                          className="text-gray-700"
                        />
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {equipo.equipo}
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                          Compra: {equipo.fechaCompra}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="p-5">
                    <div className="flex items-center gap-2 text-gray-700">
                      <User size={16} />
                      {equipo.cliente}
                    </div>
                  </td>

                  <td className="p-5 text-gray-600">
                    {equipo.serie}
                  </td>

                  <td className="p-5 text-gray-600">
                    {equipo.fechaGarantia}
                  </td>

                  <td className="p-5">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${estadoColor(
                        equipo.estado
                      )}`}
                    >
                      {equipo.estado}
                    </span>
                  </td>

                  <td className="p-5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() =>
                          abrirVer(equipo)
                        }
                        className="bg-gray-100 hover:bg-gray-200 p-2.5 rounded-xl transition"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        onClick={() =>
                          abrirEditar(equipo)
                        }
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-2.5 rounded-xl transition"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        onClick={() =>
                          eliminarEquipo(equipo.id)
                        }
                        className="bg-red-100 hover:bg-red-200 text-red-700 p-2.5 rounded-xl transition"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {equiposFiltrados.length === 0 && (
            <div className="p-10 text-center text-gray-500">
              No se encontraron equipos
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            {/* HEADER */}
            <div className="border-b p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {modo === "nuevo" &&
                    "Nuevo Equipo"}

                  {modo === "editar" &&
                    "Editar Equipo"}

                  {modo === "ver" &&
                    "Detalle del Equipo"}
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                  Gestión de garantías
                </p>
              </div>

              <button
                onClick={cerrarModal}
                className="bg-gray-100 hover:bg-gray-200 p-2 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* BODY */}
            <div className="p-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Equipo
                </label>

                <input
                  type="text"
                  disabled={modo === "ver"}
                  value={equipoActual.equipo}
                  onChange={(e) =>
                    setEquipoActual({
                      ...equipoActual,
                      equipo: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Serie
                  </label>

                  <input
                    type="text"
                    disabled={modo === "ver"}
                    value={equipoActual.serie}
                    onChange={(e) =>
                      setEquipoActual({
                        ...equipoActual,
                        serie: e.target.value,
                      })
                    }
                    className="w-full border rounded-xl px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Cliente
                  </label>

                  <input
                    type="text"
                    disabled={modo === "ver"}
                    value={equipoActual.cliente}
                    onChange={(e) =>
                      setEquipoActual({
                        ...equipoActual,
                        cliente: e.target.value,
                      })
                    }
                    className="w-full border rounded-xl px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Fecha Compra
                  </label>

                  <input
                    type="date"
                    disabled={modo === "ver"}
                    value={equipoActual.fechaCompra}
                    onChange={(e) =>
                      setEquipoActual({
                        ...equipoActual,
                        fechaCompra: e.target.value,
                      })
                    }
                    className="w-full border rounded-xl px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Fecha Garantía
                  </label>

                  <input
                    type="date"
                    disabled={modo === "ver"}
                    value={equipoActual.fechaGarantia}
                    onChange={(e) =>
                      setEquipoActual({
                        ...equipoActual,
                        fechaGarantia: e.target.value,
                      })
                    }
                    className="w-full border rounded-xl px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Estado
                  </label>

                  <select
                    disabled={modo === "ver"}
                    value={equipoActual.estado}
                    onChange={(e) =>
                      setEquipoActual({
                        ...equipoActual,
                        estado:
                          e.target
                            .value as GarantiaEquipo["estado"],
                      })
                    }
                    className="w-full border rounded-xl px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    <option>Vigente</option>
                    <option>Por vencer</option>
                    <option>Vencida</option>
                  </select>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="border-t p-6 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={cerrarModal}
                className="px-5 py-3 rounded-xl border hover:bg-gray-100 transition"
              >
                Cerrar
              </button>

              {modo !== "ver" && (
                <button
                  onClick={guardarEquipo}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-white transition hover:bg-blue-700"
                >
                  Guardar Equipo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
