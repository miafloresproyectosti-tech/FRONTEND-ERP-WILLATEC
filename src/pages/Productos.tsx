import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { getProductos, createProducto, updateProducto, deleteProducto, type Producto, type ProductoPayload } from "../services/producto.service";
import { useNotifications } from "../NotificationContext";

const categoriaOptions = [
  { id: 1, label: "Tecnologia" },
  { id: 2, label: "Hogar" },
  { id: 3, label: "Deportes" },
  { id: 4, label: "Salud" },
  { id: 5, label: "Alimentos y Bebidas" },
  { id: 6, label: "Estanterías/Racks" },
  { id: 7, label: "Repuestos impresoras" },
  { id: 8, label: "Otros" },
];

const unidadMedidaOptions = [
  { value: "unidad", label: "Unidad" },
  { value: "kg", label: "Kg" },
  { value: "m", label: "Metro" },
  { value: "l", label: "Litro" },
];

interface ProductoForm {
  id?: number;
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  categoria_id: number;
  stock: string;
  precio_referencial: string;
  descripcion: string;
  activo: "Activo" | "Inactivo";
  unidad_medida: string;
}

type ProductoUI = ProductoForm & {
  id: number;
  categoria_label: string;
  precio_referencial: string;
  activo: "Activo" | "Inactivo";
};

const mapProducto = (producto: Producto): ProductoUI => ({
  id: producto.id,
  codigo: producto.codigo,
  nombre: producto.nombre,
  marca: producto.marca ?? "",
  modelo: producto.modelo ?? "",
  categoria_id: producto.categoria_id,
  categoria_label:
    categoriaOptions.find((option) => option.id === producto.categoria_id)
      ?.label ?? String(producto.categoria_id),
  stock: String(producto.stock),
  precio_referencial: String(producto.precio_referencial),
  descripcion: producto.descripcion ?? "",
  activo: producto.activo ? "Activo" : "Inactivo",
  unidad_medida: producto.unidad_medida ?? "unidad",
});

export default function Productos() {
  const { addNotification } = useNotifications();

  const [productos, setProductos] = useState<ProductoUI[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const nextCodigo = useMemo(() => {
    const maxCodigo = productos.reduce((max, producto) => {
      const value = parseInt(producto.codigo ?? "", 10);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);

    return productos.length > 0 ? maxCodigo + 1 : 1;
  }, [productos]);

  const nextCodigoStr = String(nextCodigo).padStart(4, "0");

  const [productoSeleccionado, setProductoSeleccionado] =
    useState<ProductoForm>({
      codigo: "",
      nombre: "",
      categoria_id: 1,
      stock: "",
      precio_referencial: "",
      descripcion: "",
      activo: "Activo",
      marca: "",
      modelo: "",
      unidad_medida: "unidad",
    });

  const [productoAEliminar, setProductoAEliminar] =
    useState<ProductoUI | null>(null);

  // FILTRAR PRODUCTOS
  const productosFiltrados = productos.filter(
    (producto: any) =>
      producto.nombre
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      producto.codigo
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      producto.categoria_label
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  // PAGINACION
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem =
    indexOfLastItem - itemsPerPage;

  const currentItems = productosFiltrados.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const totalPages = Math.ceil(
    productosFiltrados.length / itemsPerPage
  );

  const pages = Array.from(
    { length: totalPages },
    (_, i) => i + 1
  );

  // RESETEAR PAGINA EN BUSQUEDA
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoading(true);
        const productos = await getProductos();
        setProductos(productos.map(mapProducto));
      } catch (error) {
        console.error(error);
        addNotification({
          title: "Error al cargar productos",
          description: "No se pudo obtener la lista de productos.",
          type: "warning",
          icon: "MessageCircle",
          route: "/productos",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NUEVO
  const handleNuevo = () => {
    setProductoSeleccionado({
      codigo: nextCodigoStr,
      nombre: "",
      categoria_id: 1,
      stock: "",
      precio_referencial: "",
      descripcion: "",
      activo: "Activo",
      marca: "",
      modelo: "",
      unidad_medida: "unidad",
    });

    setModoEdicion(false);
    setOpenModal(true);
  };

  // EDITAR
  const handleEditar = (producto: any) => {
    setProductoSeleccionado({
      id: producto.id,
      codigo: producto.codigo || "",
      nombre: producto.nombre || "",
      categoria_id: producto.categoria_id || 1,
      stock: String(producto.stock || ""),
      precio_referencial: String(producto.precio_referencial || ""),
      descripcion: producto.descripcion || "",
      activo: producto.activo ? "Activo" : "Inactivo",
      marca: producto.marca || "",
      modelo: producto.modelo || "",
      unidad_medida: producto.unidad_medida || "unidad",
    });

    setModoEdicion(true);
    setOpenModal(true);
  };

  // ELIMINAR
  const handleEliminar = (producto: any) => {
    setProductoAEliminar(producto);
  };

  // CONFIRMAR ELIMINAR
  const confirmarEliminar = async () => {
    if (!productoAEliminar) return;

    try {
      setSaving(true);
      await deleteProducto(productoAEliminar.id);
      setProductos((prev) =>
        prev.filter((p) => p.id !== productoAEliminar.id)
      );
      addNotification({
        title: "Producto eliminado",
        description: `El producto ${productoAEliminar.nombre} se eliminó correctamente.`,
        type: "success",
        icon: "CheckCircle",
        route: "/productos",
      });
    } catch (error) {
      console.error(error);
      addNotification({
        title: "Error al eliminar producto",
        description: "No se pudo eliminar el producto.",
        type: "warning",
        icon: "MessageCircle",
        route: "/productos",
      });
    } finally {
      setSaving(false);
      setProductoAEliminar(null);
    }
  };

  // GUARDAR
  const handleGuardar = async () => {
    const stockNum = parseInt(productoSeleccionado.stock, 10);
    const precioNum = parseFloat(productoSeleccionado.precio_referencial);

    const payload: ProductoPayload = {
      nombre: productoSeleccionado.nombre,
      marca: productoSeleccionado.marca,
      modelo: productoSeleccionado.modelo,
      codigo: productoSeleccionado.codigo,
      descripcion: productoSeleccionado.descripcion || "",
      precio_referencial: isNaN(precioNum) ? 0 : precioNum,
      unidad_medida:
        productoSeleccionado.unidad_medida || "unidad",
      activo: productoSeleccionado.activo === "Activo",
      stock: isNaN(stockNum) ? 0 : stockNum,
      categoria_id: productoSeleccionado.categoria_id,
    };

    try {
      setSaving(true);

      if (modoEdicion && productoSeleccionado.id) {
        const updated = await updateProducto(
          productoSeleccionado.id,
          payload
        );
        setProductos((prev) =>
          prev.map((p) =>
            p.id === updated.id
              ? mapProducto(updated)
              : p
          )
        );
        addNotification({
          title: "Producto actualizado",
          description: `El producto ${updated.nombre} se actualizó correctamente.`,
          type: "success",
          icon: "CheckCircle",
          route: "/productos",
        });
      } else {
        const created = await createProducto(payload);
        setProductos((prev) => [mapProducto(created), ...prev]);
        addNotification({
          title: "Producto creado",
          description: `El producto ${created.nombre} se creó correctamente.`,
          type: "success",
          icon: "CheckCircle",
          route: "/productos",
        });
      }

      setOpenModal(false);
    } catch (error) {
      console.error(error);
      addNotification({
        title: modoEdicion
          ? "Error al actualizar producto"
          : "Error al crear producto",
        description:
          "Hubo un problema al guardar el producto.",
        type: "warning",
        icon: "MessageCircle",
        route: "/productos",
      });
    } finally {
      setSaving(false);
    }
  };

  // ESTADO
  const handleEstadoChange = (activo: string) => {
    setProductoSeleccionado({
      ...productoSeleccionado,
      activo: 'Activo' === activo ? "Activo" : "Inactivo",
    });
  };

  // BUSQUEDA
  const handleSearch = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Productos
          </h1>

          <p className="text-gray-500 mt-1">
            Gestión de productos del sistema (
            {productos.length} total)
          </p>
        </div>

        <button
          onClick={handleNuevo}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <Plus size={20} />
          Nuevo Producto
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 bg-gray-100 px-4 py-3 rounded-2xl w-full md:w-96">
          <Search
            size={18}
            className="text-gray-500 flex-shrink-0"
          />

          <input
            type="text"
            placeholder="Buscar producto por nombre, código o categoría..."
            value={searchTerm}
            onChange={handleSearch}
            className="bg-transparent outline-none w-full text-sm"
          />
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Producto
              </th>

              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Categoría
              </th>

              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Stock
              </th>

              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Precio
              </th>

              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Descripción
              </th>

              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Estado
              </th>

              <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="animate-spin" size={18} />
                    Cargando productos...
                  </div>
                </td>
              </tr>
            ) : currentItems.length > 0 ? (
              currentItems.map((producto: any) => (
                <tr
                  key={producto.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-200"
                >
                  <td className="px-6 py-5">
                    <h3 className="font-semibold text-gray-800">
                      {producto.nombre}
                    </h3>

                    <p className="text-sm text-gray-500">
                      #{producto.codigo}
                    </p>
                  </td>

                  <td className="px-6 py-5 text-gray-600">
                    {producto.categoria_label}
                  </td>

                  <td className="px-6 py-5 text-gray-600 font-medium">
                    {producto.stock}
                  </td>

                  <td className="px-6 py-5 font-semibold text-gray-800">
                    S/. {Number(producto.precio_referencial || "0").toLocaleString()}
                  </td>

                  <td className="px-6 py-5 text-gray-600">
                    {producto.descripcion || "Sin descripción"}
                  </td>

                  <td className="px-6 py-5">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        producto.activo === "Activo"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-red-100 text-red-700 border border-red-200"
                      }`}
                    >
                      {producto.activo}
                    </span>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() =>
                          handleEditar(producto)
                        }
                        className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-all duration-200 hover:scale-105 shadow-sm"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() =>
                          handleEliminar(producto)
                        }
                        className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-all duration-200 hover:scale-105 shadow-sm"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {searchTerm
                    ? "No se encontraron productos"
                    : "No hay productos"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* PAGINACION */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {indexOfFirstItem + 1} a{" "}
                {Math.min(
                  indexOfLastItem,
                  productosFiltrados.length
                )}{" "}
                de {productosFiltrados.length} productos
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.max(prev - 1, 1)
                    )
                  }
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                >
                  <ChevronLeft size={18} />
                </button>

                {pages.map((page) => (
                  <button
                    key={page}
                    onClick={() =>
                      setCurrentPage(page)
                    }
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-medium ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(
                        prev + 1,
                        totalPages
                      )
                    )
                  }
                  disabled={
                    currentPage === totalPages
                  }
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ELIMINAR */}
      {productoAEliminar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-gray-200">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Trash2
                  size={32}
                  className="text-red-600"
                />
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-2">
                ¿Eliminar producto?
              </h3>

              <p className="text-gray-600">
                ¿Deseas eliminar{" "}
                <strong>
                  "{productoAEliminar.nombre}"
                </strong>
                ?
              </p>
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() =>
                  setProductoAEliminar(null)
                }
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-2xl"
              >
                Cancelar
              </button>

              <button
                onClick={confirmarEliminar}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-2xl"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      {openModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold">
                  {modoEdicion
                    ? "Editar Producto"
                    : "Nuevo Producto"}
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                  Completa toda la información
                </p>
              </div>

              <button
                onClick={() => setOpenModal(false)}
                className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Código
                </label>
                <input
                  value={productoSeleccionado.codigo}
                  disabled
                  className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Nombre
                </label>
                <input
                  value={productoSeleccionado.nombre}
                  onChange={(e) =>
                    setProductoSeleccionado({
                      ...productoSeleccionado,
                      nombre: e.target.value,
                    })
                  }
                  placeholder="Nombre"
                  className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Categoría
                </label>
                <select
                  value={productoSeleccionado.categoria_id}
                  onChange={(e) =>
                    setProductoSeleccionado({
                      ...productoSeleccionado,
                      categoria_id: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200"
                >
                  {categoriaOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Stock
                </label>
                <input
                  type="number"
                  value={productoSeleccionado.stock}
                  onChange={(e) =>
                    setProductoSeleccionado({
                      ...productoSeleccionado,
                      stock: e.target.value,
                    })
                  }
                  placeholder="Stock"
                  className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Precio de Compra
                </label>
                <input
                  type="number"
                  value={productoSeleccionado.precio_referencial}
                  onChange={(e) =>
                    setProductoSeleccionado({
                      ...productoSeleccionado,
                      precio_referencial: e.target.value,
                    })
                  }
                  placeholder="Precio"
                  className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Marca
                </label>
                <input
                  value={productoSeleccionado.marca}
                  onChange={(e) =>
                    setProductoSeleccionado({
                      ...productoSeleccionado,
                      marca: e.target.value,
                    })
                  }
                  placeholder="Marca"
                  className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Modelo
                </label>
                <input
                  value={productoSeleccionado.modelo}
                  onChange={(e) =>
                    setProductoSeleccionado({
                      ...productoSeleccionado,
                      modelo: e.target.value,
                    })
                  }
                  placeholder="Modelo"
                  className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Unidad de medida
                </label>
                <select
                  value={productoSeleccionado.unidad_medida}
                  onChange={(e) =>
                    setProductoSeleccionado({
                      ...productoSeleccionado,
                      unidad_medida: e.target.value,
                    })
                  }
                  className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200"
                >
                  {unidadMedidaOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Descripción
                </label>
                <input
                  value={productoSeleccionado.descripcion}
                  onChange={(e) =>
                    setProductoSeleccionado({
                      ...productoSeleccionado,
                      descripcion: e.target.value,
                    })
                  }
                  placeholder="Descripción"
                  className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Estado
                </label>
                <select
                  value={productoSeleccionado.activo}
                  onChange={(e) => handleEstadoChange(e.target.value)}
                  className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setOpenModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-2xl font-semibold"
              >
                Cancelar
              </button>

              <button
                onClick={handleGuardar}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-semibold"
              >
                {modoEdicion
                  ? "Actualizar Producto"
                  : "Crear Producto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}