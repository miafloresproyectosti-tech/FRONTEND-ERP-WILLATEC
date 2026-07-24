import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Save,
  X,
  Eye,
  HandCoins,
  CalendarDays,
  CircleDollarSign,
  FileText,
} from "lucide-react";

interface Abono {
  id: number;
  monto: number;
}

interface PagoProveedor {
  id: number;
  fechaEmision: string;
  numeroFactura: string;
  proveedor: string;
  descripcion: string;
  soles: number;
  dolares: number;
  fechaVencimiento: string;
  condicionPago: string;
  cheque: string;
  fechaPago: string;
  estado: "Pendiente" | "Pagado" | "Vencido" | "Parcial";
  reprogramacionPago: string;
  abonos: Abono[];
}

const estadoColors = {
  Pendiente: "bg-yellow-100 text-yellow-700",
  Pagado: "bg-green-100 text-green-700",
  Vencido: "bg-red-100 text-red-700",
  Parcial: "bg-blue-100 text-blue-700",
};

export default function ControlPagoProveedores() {
  const [busqueda, setBusqueda] = useState("");

  const [pagos, setPagos] = useState<PagoProveedor[]>([
    {
      id: 1,
      fechaEmision: "2026-05-10",
      numeroFactura: "F001-258",
      proveedor: "Claro",
      descripcion: "Servicio Internet",
      soles: 850,
      dolares: 0,
      fechaVencimiento: "2026-05-25",
      condicionPago: "15 días",
      cheque: "CH-001",
      fechaPago: "",
      estado: "Pendiente",
      reprogramacionPago: "",
      abonos: [
        {
          id: 1,
          monto: 200,
        },
      ],
    },
  ]);

  const initialForm: PagoProveedor = {
    id: 0,
    fechaEmision: "",
    numeroFactura: "",
    proveedor: "",
    descripcion: "",
    soles: 0,
    dolares: 0,
    fechaVencimiento: "",
    condicionPago: "",
    cheque: "",
    fechaPago: "",
    estado: "Pendiente",
    reprogramacionPago: "",
    abonos: [
      {
        id: 1,
        monto: 0,
      },
    ],
  };

  const [formData, setFormData] =
    useState<PagoProveedor>(initialForm);

  const [showModal, setShowModal] =
    useState(false);

  const [editando, setEditando] =
    useState(false);

  const [modoVista, setModoVista] =
    useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]:
        name === "soles" ||
        name === "dolares"
          ? Number(value)
          : value,
    });
  };

  const handleAbonoChange = (
    id: number,
    value: number
  ) => {
    setFormData({
      ...formData,
      abonos: formData.abonos.map((abono) =>
        abono.id === id
          ? {
              ...abono,
              monto: value,
            }
          : abono
      ),
    });
  };

  const agregarAbono = () => {
    setFormData({
      ...formData,
      abonos: [
        ...formData.abonos,
        {
          id: Date.now(),
          monto: 0,
        },
      ],
    });
  };

  const eliminarAbono = (id: number) => {
    setFormData({
      ...formData,
      abonos: formData.abonos.filter(
        (abono) => abono.id !== id
      ),
    });
  };

  const guardarPago = () => {
    if (editando) {
      setPagos((prev) =>
        prev.map((item) =>
          item.id === formData.id
            ? formData
            : item
        )
      );
    } else {
      setPagos([
        ...pagos,
        {
          ...formData,
          id: Date.now(),
        },
      ]);
    }

    setShowModal(false);
    setFormData(initialForm);
    setEditando(false);
    setModoVista(false);
  };

  const editarPago = (
    pago: PagoProveedor,
    vista = false
  ) => {
    setFormData(pago);
    setEditando(!vista);
    setModoVista(vista);
    setShowModal(true);
  };

  const eliminarPago = (id: number) => {
    if (
      confirm(
        "¿Deseas eliminar este registro?"
      )
    ) {
      setPagos((prev) =>
        prev.filter((item) => item.id !== id)
      );
    }
  };

  const pagosFiltrados = pagos.filter(
    (item) =>
      item.proveedor
        .toLowerCase()
        .includes(busqueda.toLowerCase()) ||
      item.numeroFactura
        .toLowerCase()
        .includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 p-6">

      <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl border border-gray-200 p-6">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-8">

          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              Pago Facturas Proveedores
            </h1>

            <p className="text-gray-500 text-sm mt-1">
              Control y seguimiento de pagos
            </p>
          </div>

          <button
            onClick={() => {
              setFormData(initialForm);
              setEditando(false);
              setModoVista(false);
              setShowModal(true);
            }}
            className="bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-2xl flex items-center gap-2 transition"
          >
            <Plus size={18} />
            Nuevo Pago
          </button>

        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">

          {/* PENDIENTES */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Pendientes
                </p>

                <h2 className="text-4xl font-bold text-gray-900 mt-2">
                  {
                    pagos.filter(
                      (p) => p.estado === "Pendiente"
                    ).length
                  }
                </h2>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
                <HandCoins
                  size={26}
                  className="text-red-600"
                />
              </div>

            </div>

          </div>

          {/* PAGADOS */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Pagados
                </p>

                <h2 className="text-4xl font-bold text-gray-900 mt-2">
                  {
                    pagos.filter(
                      (p) => p.estado === "Pagado"
                    ).length
                  }
                </h2>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
                <Save
                  size={26}
                  className="text-green-600"
                />
              </div>

            </div>

          </div>

          {/* TOTAL */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Total Soles
                </p>

                <h2 className="text-4xl font-bold text-gray-900 mt-2">
                  S/
                  {pagos
                    .reduce(
                      (acc, item) =>
                        acc + item.soles,
                      0
                    )
                    .toLocaleString()}
                </h2>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                <CircleDollarSign
                  size={26}
                  className="text-blue-600"
                />
              </div>

            </div>

          </div>

        </div>

        {/* BUSCADOR */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">

          <div className="relative">

            <Search
              size={18}
              className="absolute left-4 top-3.5 text-gray-400"
            />

            <input
              type="text"
              placeholder="Buscar proveedor..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

        </div>

        {/* TABLA */}
        <div className="overflow-auto rounded-2xl border border-gray-200">

          <table className="w-full border-collapse">

            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm">
                <th className="p-4 text-left">
                  Proveedor
                </th>

                <th className="p-4 text-left">
                  Factura
                </th>

                <th className="p-4 text-left">
                  Soles
                </th>

                <th className="p-4 text-left">
                  Dólares
                </th>

                <th className="p-4 text-left">
                  Vencimiento
                </th>

                <th className="p-4 text-left">
                  Estado
                </th>

                <th className="p-4 text-left">
                  Abonos
                </th>

                <th className="p-4 text-left">
                  Fecha Pago
                </th>

                <th className="p-4 text-center">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {pagosFiltrados.map((item) => {
                const totalAbonos =
                  item.abonos.reduce(
                    (acc, abono) =>
                      acc + abono.monto,
                    0
                  );

                return (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-gray-50 text-sm transition"
                  >

                    <td className="p-4 font-semibold text-gray-800">
                      {item.proveedor}
                    </td>

                    <td className="p-4">
                      {item.numeroFactura}
                    </td>

                    <td className="p-4 font-medium text-green-700">
                      S/{" "}
                      {item.soles.toFixed(2)}
                    </td>

                    <td className="p-4 font-medium text-blue-700">
                      ${" "}
                      {item.dolares.toFixed(2)}
                    </td>

                    <td className="p-4">
                      {
                        item.fechaVencimiento
                      }
                    </td>

                    <td className="p-4">

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${estadoColors[item.estado]}`}
                      >
                        {item.estado}
                      </span>

                    </td>

                    <td className="p-4 font-bold text-blue-600">
                      S/{" "}
                      {totalAbonos.toFixed(
                        2
                      )}
                    </td>

                    <td className="p-4">
                      {item.fechaPago || "-"}
                    </td>

                    <td className="p-4">

                      <div className="flex justify-center items-center gap-3">

                        <button
                          onClick={() =>
                            editarPago(item, true)
                          }
                          className="group relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 hover:bg-blue-600 transition-all duration-300 shadow-sm hover:shadow-md"
                        >

                          <Eye
                            size={18}
                            className="text-gray-600 group-hover:text-white transition"
                          />

                        </button>

                        <button
                          onClick={() =>
                            editarPago(item)
                          }
                          className="group relative flex items-center justify-center w-10 h-10 rounded-2xl bg-yellow-50 hover:bg-yellow-500 transition-all duration-300 shadow-sm hover:shadow-md"
                        >

                          <Pencil
                            size={18}
                            className="text-yellow-700 group-hover:text-white transition"
                          />

                        </button>

                        <button
                          onClick={() =>
                            eliminarPago(item.id)
                          }
                          className="group relative flex items-center justify-center w-10 h-10 rounded-2xl bg-red-50 hover:bg-red-600 transition-all duration-300 shadow-sm hover:shadow-md"
                        >

                          <Trash2
                            size={18}
                            className="text-red-700 group-hover:text-white transition"
                          />

                        </button>

                      </div>

                    </td>

                  </tr>
                );
              })}
            </tbody>

          </table>

        </div>

      </div>

      {/* MODAL */}
      {showModal && (

        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">

          <div className="bg-white w-full max-w-6xl rounded-[32px] shadow-2xl border border-gray-200 overflow-hidden">

            {/* HEADER */}
            <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-black px-8 py-7">

              <div className="relative flex justify-between items-center">

                <div className="flex items-center gap-4">

                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">

                    {modoVista ? (
                      <Eye
                        size={28}
                        className="text-white"
                      />
                    ) : editando ? (
                      <Pencil
                        size={28}
                        className="text-white"
                      />
                    ) : (
                      <FileText
                        size={28}
                        className="text-white"
                      />
                    )}

                  </div>

                  <div>

                    <h2 className="text-3xl font-bold text-white">

                      {modoVista
                        ? "Visualización de Pago"
                        : editando
                        ? "Editar Pago"
                        : "Nuevo Pago"}

                    </h2>

                    <p className="text-gray-300 text-sm mt-1">
                      Gestión y seguimiento de facturas
                    </p>

                  </div>

                </div>

                <button
                  onClick={() =>
                    setShowModal(false)
                  }
                  className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-red-500 flex items-center justify-center transition"
                >
                  <X
                    size={22}
                    className="text-white"
                  />
                </button>

              </div>

            </div>

            {/* BODY */}
            <div className="p-8 bg-gradient-to-b from-gray-50 to-white max-h-[75vh] overflow-y-auto">

              {/* RESUMEN */}
              {modoVista && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">

                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <p className="text-xs text-gray-500 mb-2">
                      Factura
                    </p>

                    <h3 className="text-lg font-bold text-gray-800">
                      {formData.numeroFactura}
                    </h3>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <p className="text-xs text-gray-500 mb-2">
                      Total Soles
                    </p>

                    <h3 className="text-lg font-bold text-green-600">
                      S/ {formData.soles}
                    </h3>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <p className="text-xs text-gray-500 mb-2">
                      Estado
                    </p>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColors[formData.estado]}`}
                    >
                      {formData.estado}
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <p className="text-xs text-gray-500 mb-2">
                      Vencimiento
                    </p>

                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <CalendarDays size={18} />
                      {formData.fechaVencimiento}
                    </h3>
                  </div>

                </div>
              )}

{/* FORM */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

  <Input
    label="Fecha Emisión"
    name="fechaEmision"
    type="date"
    value={
      formData.fechaEmision
    }
    onChange={handleChange}
    disabled={modoVista}
  />

  <Input
    label="N° Factura"
    name="numeroFactura"
    value={
      formData.numeroFactura
    }
    onChange={handleChange}
    disabled={modoVista}
  />

  <Input
    label="Proveedor"
    name="proveedor"
    value={formData.proveedor}
    onChange={handleChange}
    disabled={modoVista}
  />

  <Input
    label="Descripción"
    name="descripcion"
    value={
      formData.descripcion
    }
    onChange={handleChange}
    disabled={modoVista}
  />

  <Input
    label="Soles"
    name="soles"
    type="number"
    value={formData.soles}
    onChange={handleChange}
    disabled={modoVista}
  />

  <Input
    label="Dólares"
    name="dolares"
    type="number"
    value={formData.dolares}
    onChange={handleChange}
    disabled={modoVista}
  />

  {/* NUEVOS CAMPOS */}
  <Input
    label="Fecha Vencimiento"
    name="fechaVencimiento"
    type="date"
    value={
      formData.fechaVencimiento
    }
    onChange={handleChange}
    disabled={modoVista}
  />

  <Input
    label="Condición de Pago"
    name="condicionPago"
    value={
      formData.condicionPago
    }
    onChange={handleChange}
    disabled={modoVista}
  />

  <Input
    label="Cheque"
    name="cheque"
    value={formData.cheque}
    onChange={handleChange}
    disabled={modoVista}
  />

  <Input
    label="Fecha de Pago"
    name="fechaPago"
    type="date"
    value={
      formData.fechaPago
    }
    onChange={handleChange}
    disabled={modoVista}
  />

  {/* ESTADO */}
  <div>

    <label className="block text-sm font-semibold mb-2 text-gray-700">
      Estado
    </label>

    <select
      name="estado"
      value={formData.estado}
      onChange={handleChange}
      disabled={modoVista}
      className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${
        modoVista
          ? "bg-gray-100 text-gray-500 border-gray-200"
          : "bg-white focus:ring-2 focus:ring-blue-500 border-gray-300"
      }`}
    >

      <option value="Pendiente">
        Pendiente
      </option>

      <option value="Pagado">
        Pagado
      </option>

      <option value="Vencido">
        Vencido
      </option>

      <option value="Parcial">
        Parcial
      </option>

    </select>

  </div>

  <Input
    label="Reprogramación de Pago"
    name="reprogramacionPago"
    type="date"
    value={
      formData.reprogramacionPago
    }
    onChange={handleChange}
    disabled={modoVista}
  />

</div>

{/* TABLA ABONOS */}
<div className="mt-10">

  <div className="flex items-center justify-between mb-5">

    <h3 className="text-xl font-bold text-gray-800">
      Tabla de Abonos
    </h3>

    {!modoVista && (
      <button
        onClick={agregarAbono}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition"
      >
        <Plus size={16} />
        Agregar Abono
      </button>
    )}

  </div>

  <div className="overflow-hidden rounded-2xl border border-gray-200">

    <table className="w-full">

      <thead className="bg-gray-100">

        <tr>

          <th className="p-4 text-left text-sm text-gray-700">
            #
          </th>

          <th className="p-4 text-left text-sm text-gray-700">
            Monto
          </th>

          {!modoVista && (
            <th className="p-4 text-center text-sm text-gray-700">
              Acción
            </th>
          )}

        </tr>

      </thead>

      <tbody>

        {formData.abonos.map(
          (abono, index) => (
            <tr
              key={abono.id}
              className="border-t"
            >

              <td className="p-4 font-medium">
                Abono {index + 1}
              </td>

              <td className="p-4">

                <input
                  type="number"
                  value={abono.monto}
                  disabled={modoVista}
                  onChange={(e) =>
                    handleAbonoChange(
                      abono.id,
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className={`w-full rounded-xl border px-4 py-3 outline-none ${
                    modoVista
                      ? "bg-gray-100"
                      : "focus:ring-2 focus:ring-blue-500"
                  }`}
                />

              </td>

              {!modoVista && (
                <td className="p-4 text-center">

                  <button
                    onClick={() =>
                      eliminarAbono(
                        abono.id
                      )
                    }
                    className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-600 flex items-center justify-center transition"
                  >

                    <Trash2
                      size={18}
                      className="text-red-600 hover:text-white"
                    />

                  </button>

                </td>
              )}

            </tr>
          )
        )}

      </tbody>

    </table>

  </div>

</div>

            </div>

            {/* FOOTER */}
            {!modoVista && (

              <div className="flex justify-end gap-3 border-t bg-white px-8 py-5">

                <button
                  onClick={() =>
                    setShowModal(false)
                  }
                  className="px-5 py-3 rounded-2xl border border-gray-300 hover:bg-gray-100 transition font-medium"
                >
                  Cancelar
                </button>

                <button
                  onClick={guardarPago}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition shadow-lg"
                >
                  <Save size={18} />
                  Guardar
                </button>

              </div>

            )}

          </div>

        </div>

      )}
    </div>
  );
}

interface InputProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  type?: string;
  disabled?: boolean;
}

function Input({
  label,
  name,
  value,
  onChange,
  type = "text",
  disabled = false,
}: InputProps) {
  return (
    <div>

      <label className="block text-sm font-semibold mb-2 text-gray-700">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${
          disabled
            ? "bg-gray-100 text-gray-500 border-gray-200"
            : "bg-white focus:ring-2 focus:ring-blue-500 border-gray-300"
        }`}
      />

    </div>
  );
}