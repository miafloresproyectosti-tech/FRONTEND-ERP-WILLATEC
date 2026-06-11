import api from "./api";
import { normalizeStorageImagePath, normalizeStorageImageUrl } from "../utils/storageImage";

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
    imagen_url?: string | null;
    imagen_path?: string | null;
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
    proveedores?: {
        id?: number;
        cotizacion_item_id?: number;
        nombre: string;
        link?: string | null;
        precio?: number | null;
        notas?: string | null;
        orden?: number;
    }[];
    imagen?: string | null;
    imagen_url?: string | null;
    imagen_path?: string | null;
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

function buildCotizacionItemFormData(payload: Partial<CotizacionItem>): FormData {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
        if (key === "imagen" || value === undefined || value === null) return;

        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                Object.entries(item ?? {}).forEach(([childKey, childValue]) => {
                    if (childValue !== undefined && childValue !== null) {
                        formData.append(`${key}[${index}][${childKey}]`, String(childValue));
                    }
                });
            });
            return;
        }

        formData.append(key, String(value));
    });

    if (payload.imagen?.startsWith("data:")) {
        formData.append("imagen", base64ToFile(payload.imagen, "cotizacion-item.jpg"));
    }

    return formData;
}

function normalizeProducto(producto: Producto): Producto {
    const rawImage = producto.imagen_url || producto.imagen || producto.imagen_path;
    const imageUrl = normalizeStorageImageUrl(rawImage);

    return {
        ...producto,
        imagen: imageUrl || producto.imagen || null,
        imagen_url: imageUrl || null,
        imagen_path: normalizeStorageImagePath(rawImage),
    };
}

function normalizeCotizacionItem(item: CotizacionItem): CotizacionItem {
    const rawImage = (item as any).imagen_url || item.imagen;
    const imageUrl = normalizeStorageImageUrl(rawImage);

    return {
        ...item,
        imagen: imageUrl || item.imagen || null,
        ...(imageUrl ? { imagen_url: imageUrl } : {}),
        ...(rawImage ? { imagen_path: normalizeStorageImagePath(rawImage) } : {}),
    } as CotizacionItem;
}

// Convierte una imagen base64 dataURL a File
function base64ToFile(dataUrl: string, filename: string): File {
    const [header, data] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
    }
    return new File([array], filename, { type: mime });
}
 
// Construye un FormData a partir del payload
function buildFormData(payload: ProductoPayload): FormData {
    const formData = new FormData();
 
    const fields: (keyof ProductoPayload)[] = [
        "nombre", "marca", "modelo", "codigo",
        "descripcion", "precio_referencial",
        "unidad_medida", "stock", "categoria_id",
    ];
 
    for (const key of fields) {
        const value = payload[key];
        if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        }
    }
        formData.append("activo", payload.activo ? "1" : "0");

            // Solo adjunta imagen si es base64 nueva
            if (payload.imagen?.startsWith("data:")) {
                const file = base64ToFile(payload.imagen, "producto.jpg");
                formData.append("imagen", file);
            }
            // Si es URL existente o vacío → no se envía nada → backend no toca la imagen

            return formData;
}

//Backend devuelve productos paginados
export const getProductos = async (): Promise<Producto[]> => {
    const res = await api.get("/productos");
    const productos = res.data?.data ?? [];
    return Array.isArray(productos) ? productos.map(normalizeProducto) : [];
};

export const getExternalItems = async (page = 1, search = ""): Promise<{
    data: CotizacionItem[];
    meta: {
        current_page: number;
        last_page: number;
        total: number;
        per_page: number;
    };
}> => {
    const res = await api.get("/cotizaciones/items/all", {
        params: { page, search: search.trim() || undefined },
    });
    const raw = res.data ?? {};

    return {
        data: Array.isArray(raw.data) ? raw.data.map(normalizeCotizacionItem) : [],
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
    return normalizeProducto(res.data);
};

export const createProducto = async (
    payload: ProductoPayload,
): Promise<Producto> => {
    const formData = buildFormData(payload);
 
    const res = await api.post("/productos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return normalizeProducto(res.data.producto);
};

export const updateProducto = async (
    id: number,
    payload: ProductoPayload,
): Promise<Producto> => {
    const formData = buildFormData(payload);
 
    // Laravel no procesa archivos en PUT/PATCH nativamente,
    // por eso enviamos POST con _method=PUT
    formData.append("_method", "PUT");
 
    const res = await api.post(`/productos/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return normalizeProducto(res.data.producto);
};

export const deleteProducto = async (id: number): Promise<void> => {
    await api.delete(`/productos/${id}`);
};

export const updateCotizacionItem = async (
    id: number,
    payload: Partial<CotizacionItem>,
): Promise<CotizacionItem> => {
    const hasNewImage = typeof payload.imagen === "string" && payload.imagen.startsWith("data:");
    const res = hasNewImage
        ? await api.post(`/cotizaciones/items/${id}`, buildCotizacionItemFormData(payload), {
            headers: { "Content-Type": "multipart/form-data" },
        })
        : await api.put(`/cotizaciones/items/${id}`, payload);
    return normalizeCotizacionItem(res.data?.data || res.data);
};

