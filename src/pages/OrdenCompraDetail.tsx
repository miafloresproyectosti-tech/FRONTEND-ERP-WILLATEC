import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  Printer,
  Send,
} from "lucide-react";

type EstadoOC = "PENDIENTE" | "APROBADA" | "RECHAZADA" | "ENVIADA" | "RECIBIDA";

const mockOC = {
  id: "1",
  numero: "OC-0001",
  proveedor: "Distribuidora ABC S.A.C.",
  cotizacionOrigen: "COT-0012",
  fecha: "2026-05-10",
  estado: "APROBADA" as EstadoOC,
  items: [
    { id: "1", producto: "Laptop Dell", cantidad: 2, precio: 2500 },
    { id: "2", producto: "Mouse Logitech", cantidad: 5, precio: 80 },
  ],
};

export default function OrdenCompraDetail() {
  const navigate = useNavigate();

  const oc = mockOC;

  const total = oc.items.reduce(
    (acc, item) => acc + item.cantidad * item.precio,
    0
  );

  const getEstado = (estado: EstadoOC) => {
    const base =
      "px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit";

    switch (estado) {
      case "PENDIENTE":
        return (
          <span className={`${base} bg-yellow-100 text-yellow-700`}>
            <Clock size={14} /> Pendiente
          </span>
        );
      case "APROBADA":
        return (
          <span className={`${base} bg-green-100 text-green-700`}>
            <CheckCircle size={14} /> Aprobada
          </span>
        );
      case "RECHAZADA":
        return (
          <span className={`${base} bg-red-100 text-red-700`}>
            <XCircle size={14} /> Rechazada
          </span>
        );
      case "ENVIADA":
        return (
          <span className={`${base} bg-blue-100 text-blue-700`}>
            <Truck size={14} /> Enviada
          </span>
        );
      case "RECIBIDA":
        return (
          <span className={`${base} bg-purple-100 text-purple-700`}>
            <FileText size={14} /> Recibida
          </span>
        );
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-black"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-xl hover:bg-gray-300">
            <Printer size={16} />
            Imprimir
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            <Send size={16} />
            Enviar
          </button>
        </div>
      </div>

      {/* TITULO */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Orden de Compra {oc.numero}
            </h1>
            <p className="text-gray-500 mt-1">
              Generada desde cotización {oc.cotizacionOrigen}
            </p>
          </div>

          {getEstado(oc.estado)}
        </div>
      </div>

      {/* INFO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white p-5 rounded-2xl shadow">
          <p className="text-gray-500 text-sm">Proveedor</p>
          <p className="font-semibold text-gray-800">{oc.proveedor}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow">
          <p className="text-gray-500 text-sm">Fecha</p>
          <p className="font-semibold text-gray-800">{oc.fecha}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow">
          <p className="text-gray-500 text-sm">Total</p>
          <p className="font-bold text-xl text-green-600">
            S/ {total.toFixed(2)}
          </p>
        </div>
      </div>

      {/* ITEMS */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-700">Ítems</h2>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="text-left p-4">Producto</th>
              <th className="text-left p-4">Cantidad</th>
              <th className="text-left p-4">Precio</th>
              <th className="text-left p-4">Subtotal</th>
            </tr>
          </thead>

          <tbody>
            {oc.items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="p-4">{item.producto}</td>
                <td className="p-4">{item.cantidad}</td>
                <td className="p-4">S/ {item.precio}</td>
                <td className="p-4 font-semibold">
                  S/ {(item.cantidad * item.precio).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}