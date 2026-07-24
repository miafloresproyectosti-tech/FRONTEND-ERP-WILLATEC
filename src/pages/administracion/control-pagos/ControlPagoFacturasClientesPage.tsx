import { useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  FileText,
  CalendarDays,
  DollarSign,
  Building2,
  X,
  Receipt,
  CreditCard,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

interface FacturaCliente {
  id: number;
  numeroFactura: string;
  cliente: string;
  fechaEmision: string;
  ordenCompra: string;
  montoSoles: number;
  montoDolares: number;
  detraccion: number;
  montoDetraccion: number;
  montoNetoPendiente: number;
  fechaVencimiento: string;
  pago: string;
  fechaPago: string;
  estado: "CANCELADO" | "PROGRAMACION";
  montoDetraccion02: number;
  fechaPagoDetraccion: string;
  vendedor: string;
  fechaProbablePago: string;
}

const facturaInicial: FacturaCliente = {
  id: 0,
  numeroFactura: "",
  cliente: "",
  fechaEmision: "",
  ordenCompra: "",
  montoSoles: 0,
  montoDolares: 0,
  detraccion: 0,
  montoDetraccion: 0,
  montoNetoPendiente: 0,
  fechaVencimiento: "",
  pago: "",
  fechaPago: "",
  estado: "PROGRAMACION",
  montoDetraccion02: 0,
  fechaPagoDetraccion: "",
  vendedor: "",
  fechaProbablePago: "",
};

export default function ControlPagoFacturasClientesPage() {
  const [facturas, setFacturas] = useState<FacturaCliente[]>([
    {
      id: 1,
      numeroFactura: "F001-2541",
      cliente: "Municipalidad de Lima",
      fechaEmision: "2026-05-10",
      ordenCompra: "OC-2026-552",
      montoSoles: 15000,
      montoDolares: 0,
      detraccion: 12,
      montoDetraccion: 1800,
      montoNetoPendiente: 13200,
      fechaVencimiento: "2026-05-30",
      pago: "Transferencia Bancaria",
      fechaPago: "2026-05-25",
      estado: "PROGRAMACION",
      montoDetraccion02: 0.2,
      fechaPagoDetraccion: "2026-05-27",
      vendedor: "Carlos Ruiz",
      fechaProbablePago: "2026-05-28",
    },
  ]);

  const [busqueda, setBusqueda] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);

  const [modo, setModo] = useState<
    "nuevo" | "editar" | "ver"
  >("nuevo");

  const [facturaActual, setFacturaActual] =
    useState<FacturaCliente>(facturaInicial);

  const facturasFiltradas = facturas.filter(
    (factura) =>
      factura.numeroFactura
        .toLowerCase()
        .includes(busqueda.toLowerCase()) ||
      factura.cliente
        .toLowerCase()
        .includes(busqueda.toLowerCase())
  );

  const abrirNuevo = () => {
    setModo("nuevo");
    setFacturaActual(facturaInicial);
    setMostrarModal(true);
  };

  const abrirEditar = (factura: FacturaCliente) => {
    setModo("editar");
    setFacturaActual({ ...factura });
    setMostrarModal(true);
  };

  const abrirVer = (factura: FacturaCliente) => {
    setModo("ver");
    setFacturaActual({ ...factura });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
  };

  const guardarFactura = () => {
    if (
      !facturaActual.numeroFactura ||
      !facturaActual.cliente
    ) {
      alert("Completa los campos");
      return;
    }

    if (modo === "nuevo") {
      setFacturas([
        {
          ...facturaActual,
          id: Date.now(),
        },
        ...facturas,
      ]);
    }

    if (modo === "editar") {
      setFacturas((prev) =>
        prev.map((f) =>
          f.id === facturaActual.id
            ? facturaActual
            : f
        )
      );
    }

    cerrarModal();
  };

  const eliminarFactura = (id: number) => {
    const confirmar = window.confirm(
      "¿Eliminar factura?"
    );

    if (confirmar) {
      setFacturas((prev) =>
        prev.filter((f) => f.id !== id)
      );
    }
  };

  const estadoColor = (estado: string) => {
    switch (estado) {
      case "CANCELADO":
        return "bg-green-100 text-green-700 border-green-200";

      case "PROGRAMACION":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const inputClass =
    "w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition";
  <input className={inputClass} />
  return (
    <div className="bg-gray-50 rounded-3xl p-6 h-full">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Pago Facturas Clientes
          </h1>

          <p className="text-gray-500 mt-1">
            Control y seguimiento de pagos
          </p>
        </div>

        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-xl transition"
        >
          <Plus size={18} />
          Nueva Factura
        </button>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">
                Facturas
              </p>

              <h2 className="text-3xl font-bold mt-2 text-gray-800">
                {facturas.length}
              </h2>
            </div>

            <div className="bg-blue-100 p-3 rounded-xl">
              <FileText
                className="text-blue-700"
                size={22}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">
                Total Soles
              </p>

              <h2 className="text-3xl font-bold mt-2 text-gray-800">
                S/
                {facturas
                  .reduce(
                    (acc, item) =>
                      acc + item.montoSoles,
                    0
                  )
                  .toLocaleString()}
              </h2>
            </div>

            <div className="bg-green-100 p-3 rounded-xl">
              <DollarSign
                className="text-green-700"
                size={22}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">
                Programación
              </p>

              <h2 className="text-3xl font-bold mt-2 text-gray-800">
                {
                  facturas.filter(
                    (f) =>
                      f.estado ===
                      "PROGRAMACION"
                  ).length
                }
              </h2>
            </div>

            <div className="bg-yellow-100 p-3 rounded-xl">
              <CalendarDays
                className="text-yellow-700"
                size={22}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm mb-8">
        <div className="flex items-center bg-gray-100 rounded-xl px-4">
          <Search
            size={18}
            className="text-gray-400"
          />

          <input
            type="text"
            placeholder="Buscar factura..."
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
            className="w-full bg-transparent outline-none px-4 py-3"
          />
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-sm text-gray-500">
                <th className="p-5">
                  N° Factura
                </th>

                <th className="p-5">
                  Fecha Emisión
                </th>

                <th className="p-5">
                  Cliente
                </th>

                <th className="p-5">
                  Orden Compra
                </th>

                <th className="p-5">
                  Monto Soles
                </th>

                <th className="p-5">
                  Estado
                </th>

                <th className="p-5 text-center">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {facturasFiltradas.map((factura) => (
                <tr
                  key={factura.id}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="p-5 font-medium text-gray-800">
                    {factura.numeroFactura}
                  </td>

                  <td className="p-5 text-gray-600">
                    {factura.fechaEmision}
                  </td>

                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} />
                      {factura.cliente}
                    </div>
                  </td>

                  <td className="p-5 text-gray-600">
                    {factura.ordenCompra}
                  </td>

                  <td className="p-5 font-medium text-green-700">
                    S/{" "}
                    {factura.montoSoles.toLocaleString()}
                  </td>

                  <td className="p-5">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${estadoColor(
                        factura.estado
                      )}`}
                    >
                      {factura.estado}
                    </span>
                  </td>

                  <td className="p-5">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() =>
                          abrirVer(factura)
                        }
                        className="bg-gray-100 hover:bg-gray-200 p-2.5 rounded-xl"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        onClick={() =>
                          abrirEditar(factura)
                        }
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-2.5 rounded-xl"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        onClick={() =>
                          eliminarFactura(
                            factura.id
                          )
                        }
                        className="bg-red-100 hover:bg-red-200 text-red-700 p-2.5 rounded-xl"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-7xl shadow-2xl overflow-hidden">
            {/* HEADER */}
            <div className="border-b p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {modo === "nuevo" &&
                    "Nueva Factura"}

                  {modo === "editar" &&
                    "Editar Factura"}

                  {modo === "ver" &&
                    "Visualización Factura"}
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                  Gestión administrativa
                </p>
              </div>

              <button
                onClick={cerrarModal}
                className="bg-gray-100 hover:bg-gray-200 p-2 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {/* VISUALIZAR */}
            {modo === "ver" ? (
              <div className="bg-gray-100 p-8 max-h-[85vh] overflow-y-auto">
                <div className="bg-white rounded-3xl overflow-hidden shadow-xl">
                  {/* TOP */}
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="bg-white p-10">
                      <h1 className="text-5xl font-black text-gray-900">
                        WILLATEC.SAC
                      </h1>

                      <p className="text-gray-500 text-xl mt-2">
                        SOLUCIONES TECNOLÓGICAS
                      </p>

                      <div className="mt-10 space-y-5 text-gray-700">
                        <div className="flex items-center gap-4">
                          <Building2 size={20} />
                          <span>
                            RUC: 20602503331
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <MapPin size={20} />
                          <span>
                            Jr. Jorge Chávez N°
                            1747, Breña
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <Phone size={20} />
                          <span>
                            +51 934 577 815
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <Mail size={20} />
                          <span>
                            ventas@willatec.com
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-950 to-blue-800 text-white flex flex-col justify-center items-center p-10">
                      <h2 className="text-6xl font-black">
                        FACTURA
                      </h2>

                      <div className="mt-10 text-center">
                        <p className="text-lg tracking-widest">
                          N° DE FACTURA
                        </p>

                        <div className="w-64 h-[2px] bg-white/40 mx-auto my-4" />

                        <h3 className="text-5xl font-black">
                          {
                            facturaActual.numeroFactura
                          }
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* CONTENIDO */}
                  <div className="p-8 space-y-10">
                    <div>
                      <h3 className="text-2xl font-bold text-blue-950 mb-5">
                        INFORMACIÓN GENERAL
                      </h3>

                      <div className="overflow-x-auto border rounded-2xl">
                        <table className="w-full">
                          <thead className="bg-blue-950 text-white">
                            <tr>
                              <th className="p-4">
                                CLIENTE
                              </th>

                              <th className="p-4">
                                FECHA EMISIÓN
                              </th>

                              <th className="p-4">
                                ORDEN COMPRA
                              </th>

                              <th className="p-4">
                                MONTO SOLES
                              </th>

                              <th className="p-4">
                                MONTO DÓLARES
                              </th>

                              <th className="p-4">
                                DETRACCIÓN %
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr className="text-center">
                              <td className="p-4 border">
                                {
                                  facturaActual.cliente
                                }
                              </td>

                              <td className="p-4 border">
                                {
                                  facturaActual.fechaEmision
                                }
                              </td>

                              <td className="p-4 border">
                                {
                                  facturaActual.ordenCompra
                                }
                              </td>

                              <td className="p-4 border">
                                S/{" "}
                                {facturaActual.montoSoles.toLocaleString()}
                              </td>

                              <td className="p-4 border">
                                $
                                {facturaActual.montoDolares.toLocaleString()}
                              </td>

                              <td className="p-4 border">
                                {
                                  facturaActual.detraccion
                                }
                                %
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-blue-950 mb-5">
                        DETALLE ECONÓMICO
                      </h3>

                      <div className="overflow-x-auto border rounded-2xl">
                        <table className="w-full">
                          <thead className="bg-blue-950 text-white">
                            <tr>
                              <th className="p-4">
                                MONTO DETRACCIÓN
                              </th>

                              <th className="p-4">
                                MONTO NETO
                              </th>

                              <th className="p-4">
                                FECHA VENCIMIENTO
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr className="text-center">
                              <td className="p-4 border">
                                S/{" "}
                                {
                                  facturaActual.montoDetraccion
                                }
                              </td>

                              <td className="p-4 border">
                                S/{" "}
                                {
                                  facturaActual.montoNetoPendiente
                                }
                              </td>

                              <td className="p-4 border">
                                {
                                  facturaActual.fechaVencimiento
                                }
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-blue-950 mb-5">
                        DETALLE DE PAGO
                      </h3>

                      <div className="overflow-x-auto border rounded-2xl">
                        <table className="w-full">
                          <thead className="bg-blue-950 text-white">
                            <tr>
                              <th className="p-4">
                                PAGO
                              </th>

                              <th className="p-4">
                                FECHA PAGO
                              </th>

                              <th className="p-4">
                                ESTADO
                              </th>

                              <th className="p-4">
                                DETRACCIÓN 0.2
                              </th>

                              <th className="p-4">
                                FECHA PAGO
                                DETRACCIÓN
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr className="text-center">
                              <td className="p-4 border">
                                {facturaActual.pago}
                              </td>

                              <td className="p-4 border">
                                {
                                  facturaActual.fechaPago
                                }
                              </td>

                              <td className="p-4 border font-bold text-green-700">
                                {
                                  facturaActual.estado
                                }
                              </td>

                              <td className="p-4 border">
                                {
                                  facturaActual.montoDetraccion02
                                }
                              </td>

                              <td className="p-4 border">
                                {
                                  facturaActual.fechaPagoDetraccion
                                }
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-blue-950 mb-5">
                        INFORMACIÓN COMERCIAL
                      </h3>

                      <div className="overflow-x-auto border rounded-2xl">
                        <table className="w-full">
                          <thead className="bg-blue-950 text-white">
                            <tr>
                              <th className="p-4">
                                VENDEDOR
                              </th>

                              <th className="p-4">
                                FECHA PROBABLE
                                PAGO
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            <tr className="text-center">
                              <td className="p-4 border">
                                {
                                  facturaActual.vendedor
                                }
                              </td>

                              <td className="p-4 border">
                                {
                                  facturaActual.fechaProbablePago
                                }
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          ) : (

            <>
              {/* FORMULARIO MODERNO */}
              <div className="p-8 bg-gray-100 max-h-[75vh] overflow-y-auto">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                  {/* INFORMACION GENERAL */}
                  <div className="bg-white rounded-3xl p-7 shadow-sm border">

                    <div className="flex items-center gap-3 mb-6">

                      <div className="bg-indigo-100 p-3 rounded-2xl">
                        <Receipt
                          className="text-indigo-700"
                          size={22}
                        />
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-gray-800">
                          Información General
                        </h3>

                        <p className="text-sm text-gray-500">
                          Datos principales de la factura
                        </p>
                      </div>

                    </div>

                    <div className="space-y-5">

                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-2 block">
                          N° Factura
                        </label>

                        <input
                          type="text"
                          placeholder="F001-0001"
                          value={facturaActual.numeroFactura}
                          onChange={(e) =>
                            setFacturaActual({
                              ...facturaActual,
                              numeroFactura:
                                e.target.value,
                            })
                          }
                          className="w-full border-2 border-gray-200 focus:border-indigo-500 outline-none rounded-2xl px-5 py-4 transition"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-2 block">
                          Cliente
                        </label>

                        <input
                          type="text"
                          placeholder="Nombre cliente"
                          value={facturaActual.cliente}
                          onChange={(e) =>
                            setFacturaActual({
                              ...facturaActual,
                              cliente: e.target.value,
                            })
                          }
                          className="w-full border-2 border-gray-200 focus:border-indigo-500 outline-none rounded-2xl px-5 py-4 transition"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">

                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-2 block">
                            Fecha Emisión
                          </label>

                          <input
                            type="date"
                            value={facturaActual.fechaEmision}
                            onChange={(e) =>
                              setFacturaActual({
                                ...facturaActual,
                                fechaEmision:
                                  e.target.value,
                              })
                            }
                            className="w-full border-2 border-gray-200 focus:border-indigo-500 outline-none rounded-2xl px-5 py-4 transition"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-2 block">
                            Orden Compra
                          </label>

                          <input
                            type="text"
                            placeholder="OC-0001"
                            value={facturaActual.ordenCompra}
                            onChange={(e) =>
                              setFacturaActual({
                                ...facturaActual,
                                ordenCompra:
                                  e.target.value,
                              })
                            }
                            className="w-full border-2 border-gray-200 focus:border-indigo-500 outline-none rounded-2xl px-5 py-4 transition"
                          />
                        </div>

                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-2 block">
                          Vendedor
                        </label>

                        <input
                          type="text"
                          placeholder="Nombre vendedor"
                          value={facturaActual.vendedor}
                          onChange={(e) =>
                            setFacturaActual({
                              ...facturaActual,
                              vendedor:
                                e.target.value,
                            })
                          }
                          className="w-full border-2 border-gray-200 focus:border-indigo-500 outline-none rounded-2xl px-5 py-4 transition"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-2 block">
                          Estado
                        </label>

                        <select
                          value={facturaActual.estado}
                          onChange={(e) =>
                            setFacturaActual({
                              ...facturaActual,
                              estado: e.target.value as
                                | "CANCELADO"
                                | "PROGRAMACION",
                            })
                          }
                          className="w-full border-2 border-gray-200 focus:border-indigo-500 outline-none rounded-2xl px-5 py-4 transition"
                        >
                          <option value="PROGRAMACION">
                            PROGRAMACION
                          </option>

                          <option value="CANCELADO">
                            CANCELADO
                          </option>
                        </select>
                      </div>

                    </div>

                  </div>

                  {/* INFORMACION FINANCIERA */}
                  <div className="bg-white rounded-3xl p-7 shadow-sm border">

                    <div className="flex items-center gap-3 mb-6">

                      <div className="bg-green-100 p-3 rounded-2xl">
                        <CreditCard
                          className="text-green-700"
                          size={22}
                        />
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-gray-800">
                          Información Financiera
                        </h3>

                        <p className="text-sm text-gray-500">
                          Datos económicos y pagos
                        </p>
                      </div>

                    </div>

                    <div className="space-y-5">

                      <div className="grid grid-cols-2 gap-4">

                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-2 block">
                            Monto Soles
                          </label>

                          <input
                            type="number"
                            value={facturaActual.montoSoles}
                            onChange={(e) =>
                              setFacturaActual({
                                ...facturaActual,
                                montoSoles: Number(
                                  e.target.value
                                ),
                              })
                            }
                            className="w-full border-2 border-gray-200 focus:border-green-500 outline-none rounded-2xl px-5 py-4 transition"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-2 block">
                            Monto Dólares
                          </label>

                          <input
                            type="number"
                            value={facturaActual.montoDolares}
                            onChange={(e) =>
                              setFacturaActual({
                                ...facturaActual,
                                montoDolares: Number(
                                  e.target.value
                                ),
                              })
                            }
                            className="w-full border-2 border-gray-200 focus:border-blue-500 outline-none rounded-2xl px-5 py-4 transition"
                          />
                        </div>

                      </div>

                      <div className="grid grid-cols-2 gap-4">

                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-2 block">
                            Detracción %
                          </label>

                          <input
                            type="number"
                            value={facturaActual.detraccion}
                            onChange={(e) =>
                              setFacturaActual({
                                ...facturaActual,
                                detraccion: Number(
                                  e.target.value
                                ),
                              })
                            }
                            className="w-full border-2 border-gray-200 focus:border-yellow-500 outline-none rounded-2xl px-5 py-4 transition"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-2 block">
                            Monto Detracción
                          </label>

                          <input
                            type="number"
                            value={facturaActual.montoDetraccion}
                            onChange={(e) =>
                              setFacturaActual({
                                ...facturaActual,
                                montoDetraccion: Number(
                                  e.target.value
                                ),
                              })
                            }
                            className="w-full border-2 border-gray-200 focus:border-yellow-500 outline-none rounded-2xl px-5 py-4 transition"
                          />
                        </div>

                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-2 block">
                          Monto Neto Pendiente
                        </label>

                        <input
                          type="number"
                          value={facturaActual.montoNetoPendiente}
                          onChange={(e) =>
                            setFacturaActual({
                              ...facturaActual,
                              montoNetoPendiente:
                                Number(
                                  e.target.value
                                ),
                            })
                          }
                          className="w-full border-2 border-gray-200 focus:border-red-500 outline-none rounded-2xl px-5 py-4 transition"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600 mb-2 block">
                          Método Pago
                        </label>

                        <input
                          type="text"
                          placeholder="Transferencia"
                          value={facturaActual.pago}
                          onChange={(e) =>
                            setFacturaActual({
                              ...facturaActual,
                              pago: e.target.value,
                            })
                          }
                          className="w-full border-2 border-gray-200 focus:border-indigo-500 outline-none rounded-2xl px-5 py-4 transition"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">

                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-2 block">
                            Fecha Pago
                          </label>

                          <input
                            type="date"
                            value={facturaActual.fechaPago}
                            onChange={(e) =>
                              setFacturaActual({
                                ...facturaActual,
                                fechaPago:
                                  e.target.value,
                              })
                            }
                            className="w-full border-2 border-gray-200 focus:border-indigo-500 outline-none rounded-2xl px-5 py-4 transition"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-2 block">
                            Fecha Vencimiento
                          </label>

                          <input
                            type="date"
                            value={facturaActual.fechaVencimiento}
                            onChange={(e) =>
                              setFacturaActual({
                                ...facturaActual,
                                fechaVencimiento:
                                  e.target.value,
                              })
                            }
                            className="w-full border-2 border-gray-200 focus:border-indigo-500 outline-none rounded-2xl px-5 py-4 transition"
                          />
                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* FOOTER */}
              <div className="border-t bg-white p-6 flex justify-end gap-4">

                <button
                  onClick={cerrarModal}
                  className="px-6 py-4 rounded-2xl border border-gray-300 hover:bg-gray-100 transition font-medium"
                >
                  Cancelar
                </button>

                <button
                  onClick={guardarFactura}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-lg hover:scale-105 transition"
                >
                  Guardar Factura
                </button>

              </div>

            </>
          )}
          </div>
        </div>
      )}
    </div>
  );
}