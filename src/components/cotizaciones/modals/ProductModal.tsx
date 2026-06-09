import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Producto } from "../../../services/producto.service";
import { formatMoney } from "../../../utils/formatNumber";

interface Props {
  open: boolean;
  onClose: () => void;
  productos: Producto[];
  simboloMoneda: string;
  onSelect: (producto: Producto) => void;
}

export function ProductModal({
  open,
  onClose,
  productos,
  simboloMoneda,
  onSelect,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open) {
      setSearchTerm("");
    }
  }, [open]);

  const filteredProductos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return productos;

    return productos.filter((producto) => {
      const searchableText = [
        producto.nombre,
        producto.marca,
        producto.modelo,
        producto.codigo,
        producto.descripcion,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(term);
    });
  }, [productos, searchTerm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800">Seleccionar del Catálogo</h3>
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
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre, marca, modelo o código..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="space-y-2">
            {filteredProductos.map((producto) => (
              <div
                key={producto.id}
                onClick={() => onSelect(producto)}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-blue-50 cursor-pointer group transition-all"
              >
                <div>
                  <p className="font-bold text-gray-800 group-hover:text-blue-700">
                    {producto.nombre}
                  </p>
                  <p className="text-xs text-gray-500">
                    Sugerido: {formatMoney(producto.precio_referencial, simboloMoneda)}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    producto.stock === 0
                      ? "bg-red-100 text-red-700"
                      : producto.stock > 10
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {producto.stock === 0
                    ? "Agotado"
                    : producto.stock > 10
                      ? "En Stock"
                      : `Pocas Unidades (${producto.stock})`}
                </span>
              </div>
            ))}

            {filteredProductos.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-500">
                No se encontraron productos
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
