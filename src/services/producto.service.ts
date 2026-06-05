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
    costo_base: number;
    garantia_meses: number;
    disponibilidad_tipo: "stock" | "importacion";
    disponibilidad_dias: number;
    imagen?: string | null;
}

export interface CotizacionItem {
    id: number;
    cotizacion_id: number;
    descripcion: string;
    cantidad: number;
    marca: string;
    codigo: string;
    unidad_medida: string;
    costo_base: number;
    costo_unitario: number;
    costo_total: number;
    precio_venta: number;
    ganancia: number;
    margen: number;
    subtotal: number;
    tipo: string;
    disponibilidad_tipo: string;
    disponibilidad_dias: number;
    garantia_meses: number;
    estado_cotizacion_item_id: number;
    proveedor?: string;
    link_proveedor?: string;
    imagen?: string | null;
    producto_id?: number | null;
    stock: number;
    created_at: string;
    updated_at: string;
}

export interface ProductoPayload {
    nombre: string;
    marca: string;
    modelo: string;
    codigo:string;
    descripcion?: string;
    imagen?: string;
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

export const getExternalItems = async (page = 1): Promise<{
    data: CotizacionItem[];
    meta: {
        current_page: number;
        last_page: number;
        total: number;
        per_page: number;
    };
}> => {
    const res = await api.get("/cotizaciones/items/all", {
        params: { page },
    });
    const raw = res.data ?? {};

    return {
        data: Array.isArray(raw.data) ? raw.data : [],
        meta: {
            current_page: raw.current_page ?? page,
            last_page: raw.last_page ?? 1,
            total: raw.total ?? (Array.isArray(raw.data) ? raw.data.length : 0),
            per_page: raw.per_page ?? 10,
        },
    };
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

export const updateCotizacionItem = async (
    id: number,
    payload: Partial<CotizacionItem>,
): Promise<CotizacionItem> => {
    const res = await api.put(`/cotizaciones/items/${id}`, payload);
    return res.data?.data || res.data;
};

