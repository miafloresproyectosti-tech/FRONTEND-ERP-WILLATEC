import api from "./api";

export interface Producto {
    id: number;
    nombre: string;
    marca: string;
    modelo: string;
    codigo:string;
    descripcion: string | null;
    precio_referencial: number;
    unidad_medida: string;
    activo: boolean;
    stock: number;
    categoria_id: number;
}

export interface ProductoPayload {
    nombre: string;
    marca: string;
    modelo: string;
    codigo:string;
    descripcion?: string;
    precio_referencial: number;
    unidad_medida: string;
    activo: boolean;
    stock: number;
    categoria_id: number;
}

//Backend devuelve productos paginados
export const getProductos = async (): Promise<Producto[]> => {
    const res = await api.get("/productos");
    return res.data?.data ?? [];
};

export const getProducto = async (id: number): Promise<Producto> => {
    const res = await api.get(`/productos/${id}`);
    return res.data;
};

export const createProducto = async (
    payload: ProductoPayload,
): Promise<Producto> => {
    const res = await api.post("/productos", payload);
    return res.data.producto;
};

export const updateProducto = async (
    id: number,
    payload: ProductoPayload,
): Promise<Producto> => {
    const res = await api.put(`/productos/${id}`, payload);
    return res.data.producto;
};

export const deleteProducto = async (id: number): Promise<void> => {
    await api.delete(`/productos/${id}`);
};

