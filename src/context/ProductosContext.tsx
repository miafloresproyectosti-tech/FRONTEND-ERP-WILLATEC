import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  stock: number;
  precio: number;
  estado: string;
}

const productosIniciales: Producto[] = [
  {
    id: 1,
    codigo: "PROD-001",
    nombre: "Laptop HP EliteBook",
    categoria: "Laptops",
    stock: 12,
    precio: 3500,
    estado: "Stock",
  },
  {
    id: 2,
    codigo: "PROD-002",
    nombre: "Mouse Logitech",
    categoria: "Accesorios",
    stock: 45,
    precio: 120,
    estado: "Stock",
  },
];

interface ProductosContextType {
  productos: Producto[];

  agregarProducto: (producto: Producto) => void;

  actualizarProducto: (producto: Producto) => void;

  eliminarProducto: (id: number) => void;
}

const ProductosContext = createContext<
  ProductosContextType | undefined
>(undefined);

export function ProductosProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [productos, setProductos] = useState<Producto[]>(() => {
    const saved = localStorage.getItem("productos");

    if (saved) {
      return JSON.parse(saved);
    }

    return productosIniciales;
  });

  useEffect(() => {
    localStorage.setItem(
      "productos",
      JSON.stringify(productos)
    );
  }, [productos]);

  const agregarProducto = (producto: Producto) => {
    setProductos((prev) => [producto, ...prev]);
  };

  const actualizarProducto = (producto: Producto) => {
    setProductos((prev) =>
      prev.map((p) =>
        p.id === producto.id ? producto : p
      )
    );
  };

  const eliminarProducto = (id: number) => {
    setProductos((prev) =>
      prev.filter((p) => p.id !== id)
    );
  };

  return (
    <ProductosContext.Provider
      value={{
        productos,
        agregarProducto,
        actualizarProducto,
        eliminarProducto,
      }}
    >
      {children}
    </ProductosContext.Provider>
  );
}

export function useProductos() {
  const context = useContext(ProductosContext);

  if (!context) {
    throw new Error(
      "useProductos debe usarse dentro de ProductosProvider"
    );
  }

  return context;
}