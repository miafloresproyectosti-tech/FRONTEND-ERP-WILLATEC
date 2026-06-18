import { Link } from "react-router-dom";

export default function NotAuthorized() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Acceso no autorizado
        </h1>
        <p className="text-gray-600 mb-6">
          Tu usuario no tiene permiso para ver esta seccion.
        </p>
        <Link
          to="/cotizaciones"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Ir a cotizaciones
        </Link>
      </div>
    </div>
  );
}
