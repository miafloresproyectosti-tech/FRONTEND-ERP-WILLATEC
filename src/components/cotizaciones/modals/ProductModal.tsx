import { Search, X } from "lucide-react";
import type { Producto } from "../../../services/producto.service";
import { formatMoney } from "../../../utils/formatNumber";

interface Props {
  open: boolean;
  onClose: () => void;
  productos: Producto[];
  simboloMoneda: string;
  searchTerm: string;
  loading?: boolean;
  total?: number;
  onSearchChange: (value: string) => void;
  onSelect: (producto: Producto) => void;
}

export function ProductModal({
  open,
  onClose,
  productos,
  simboloMoneda,
  searchTerm,
  loading = false,
  total = productos.length,
  onSearchChange,
  onSelect,
}: Props) {
  const toNumber = (value: number | string | null | undefined) => Number(value ?? 0) || 0;
  const formatUnits = (value: number) =>
    value.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800">Seleccionar del Catalogo</h3>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-4 border-b bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por nombre, marca, modelo, SKU o codigo..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="space-y-2">
            {loading && (
              <div className="py-10 text-center text-sm text-gray-500">
                Cargando productos...
              </div>
            )}

            {!loading && productos.map((producto) => {
              const stockActual = toNumber(producto.stock_actual ?? producto.stock);
              const stockReservado = toNumber(producto.stock_reservado);
              const stockDisponible = toNumber(producto.stock_disponible ?? producto.stock);
              const unidad = producto.unidad_medida || "UND";

              return (
                <div
                  key={producto.id}
                  onClick={() => onSelect(producto)}
                  className="flex items-center justify-between gap-3 p-4 border rounded-lg hover:bg-blue-50 cursor-pointer group transition-all"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 group-hover:text-blue-700">
                      {producto.nombre}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span>Sugerido: {formatMoney(producto.precio_referencial, simboloMoneda)}</span>
                      {(producto.sku || producto.codigo) && (
                        <span>Codigo: {producto.sku || producto.codigo}</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                        Disponibles: {formatUnits(stockDisponible)} {unidad}
                      </span>
                      <span className="rounded-md bg-gray-100 px-2 py-1 text-gray-600">
                        Actual: {formatUnits(stockActual)}
                      </span>
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">
                        Reservado: {formatUnits(stockReservado)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2 py-1 rounded-full ${
                      stockDisponible <= 0
                        ? "bg-red-100 text-red-700"
                        : stockDisponible > 10
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {stockDisponible <= 0
                      ? "Sin disponible"
                      : stockDisponible > 10
                        ? "Disponible"
                        : "Disponible bajo"}
                  </span>
                </div>
              );
            })}

            {!loading && productos.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-500">
                No se encontraron productos
              </div>
            )}

            {!loading && total > productos.length && (
              <div className="py-2 text-center text-xs text-gray-500">
                Mostrando {productos.length} de {total}. Afina la busqueda para ver resultados mas precisos.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
