import api from "./api";
import { normalizeStorageImagePath, normalizeStorageImageUrl } from "../utils/storageImage";

export interface Producto {
    id: number;
    sku?: string | null;
    nombre: string;
    marca: string;
    modelo: string;
    codigo:string;
    serie?: string | null;
    factura_numero?: string | null;
    ubicacion_almacen?: string | null;
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
    estado?: "nuevo" | "usado";
    tipo_producto?: "stock" | "servicio" | "externo" | "personalizado";
    controla_stock?: boolean;
    stock_actual?: number | string | null;
    stock_reservado?: number | string | null;
    stock_disponible?: number | string | null;
    stock_minimo?: number | string | null;
    costo_unitario?: number | string | null;
    precio_venta?: number | string | null;
    codigo_barras?: string | null;
    moneda_id?: number | null;
    moneda?: {
        id?: number;
        codigo?: string | null;
        simbolo?: string | null;
        nombre?: string | null;
    } | null;
    categoria?: {
        id?: number;
        nombre?: string | null;
    } | null;
    series?: ProductoSerie[];
}

export interface ProductoSerie {
    id: number;
    producto_id?: number;
    serie?: string | null;
    factura_numero?: string | null;
    documento_path?: string | null;
    estado?: string | null;
    fecha_ingreso?: string | null;
    fecha_salida?: string | null;
    oc_recibida_id?: number | string | null;
    cotizacion_item_id?: number | string | null;
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
    nota?: string | null;
    subtotal: number;
    tipo: string;
    disponibilidad_tipo: string;
    disponibilidad_dias: number;
    garantia_meses: number;
    estado_cotizacion_item_id: number;
    orden: number;
    aplica_costos_adicionales?: boolean;
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
    producto_externo_id?: number | null;
    producto?: {
        id?: number;
        nombre?: string | null;
        sku?: string | null;
        codigo?: string | null;
        stock_actual?: number | string | null;
        stock_reservado?: number | string | null;
        stock_disponible?: number | string | null;
    } | null;
    moneda_id?: number | null;
    precio_incluye_igv?: boolean | null;
    plantilla_origen_id?: number | null;
    plantilla_origen_nombre?: string | null;
    plantilla_ultimo_uso_nombre?: string | null;
    moneda?: {
        id?: number;
        codigo?: string | null;
        simbolo?: string | null;
        nombre?: string | null;
    } | null;
    costo_base_referencial?: number;
    ultimo_margen_usado?: number | null;
    ultimo_precio_venta?: number | null;
    ultima_fecha_cotizacion?: string | null;
    veces_cotizado?: number;
    activo?: boolean;
    stock: number;
    created_at: string;
    updated_at: string;
}

export interface ProductoExterno {
    id: number;
    descripcion: string;
    nota?: string | null;
    marca?: string | null;
    codigo?: string | null;
    unidad_medida?: string | null;
    proveedor?: string | null;
    link_proveedor?: string | null;
    costo_base_referencial?: number | string | null;
    moneda_id?: number | string | null;
    precio_incluye_igv?: boolean | number | string | null;
    plantilla_origen_id?: number | string | null;
    plantilla_origen?: {
        id?: number;
        nombre?: string | null;
        formato_pdf?: string | null;
        incluye_igv?: boolean | number | null;
    } | null;
    moneda?: {
        id?: number;
        codigo?: string | null;
        simbolo?: string | null;
        nombre?: string | null;
    } | null;
    imagen?: string | null;
    imagen_url?: string | null;
    imagen_path?: string | null;
    garantia_meses?: number | string | null;
    disponibilidad_tipo?: string | null;
    disponibilidad_dias?: number | string | null;
    stock?: number | string | null;
    producto_id?: number | string | null;
    producto?: {
        id?: number;
        nombre?: string | null;
        sku?: string | null;
        codigo?: string | null;
        stock_actual?: number | string | null;
        stock_reservado?: number | string | null;
        stock_disponible?: number | string | null;
    } | null;
    activo?: boolean;
    veces_cotizado?: number;
    ultimo_margen_usado?: number | string | null;
    ultimo_precio_venta?: number | string | null;
    ultima_fecha_cotizacion?: string | null;
    ultimo_cotizacion_item?: {
        nota?: string | null;
        proveedores?: CotizacionItem["proveedores"];
        cotizacion?: {
            plantilla_id?: number | string | null;
            moneda_id?: number | string | null;
            plantilla?: {
                id?: number;
                nombre?: string | null;
                formato_pdf?: string | null;
                incluye_igv?: boolean | number | null;
            } | null;
        } | null;
    } | null;
    ultimo_cotizacion_item_con_proveedores?: {
        nota?: string | null;
        proveedores?: CotizacionItem["proveedores"];
        cotizacion?: {
            plantilla_id?: number | string | null;
            moneda_id?: number | string | null;
            plantilla?: {
                id?: number;
                nombre?: string | null;
                formato_pdf?: string | null;
                incluye_igv?: boolean | number | null;
            } | null;
        } | null;
    } | null;
}

export interface ProductoPayload {
    sku: string;
    nombre: string;
    marca: string;
    modelo: string;
    codigo:string;
    serie?: string;
    series?: string[];
    factura_numero?: string;
    ubicacion_almacen?: string;
    descripcion?: string;
    imagen?: string;
    precio_referencial: number;
    unidad_medida: string;
    activo: boolean;
    estado: "nuevo" | "usado";
    tipo_producto: "stock" | "servicio" | "externo" | "personalizado";
    controla_stock: boolean;
    stock_actual: number;
    stock_minimo?: number;
    costo_unitario?: number;
    precio_venta?: number;
    codigo_barras?: string;
    moneda_id?: number | null;
    stock: number;
    categoria_id: number;
}

export interface ConvertirProductoExternoPayload {
    cantidad: number;
    costo_unitario: number;
    moneda_id: number;
    documento_numero: string;
    factura: File;
    sku?: string;
    categoria_id?: number;
    estado?: "nuevo" | "usado";
    observacion?: string;
}

export interface ProductoPaginationMeta {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
    from: number;
    to: number;
}

export interface ProductoPaginatedResponse extends ProductoPaginationMeta {
    data: Producto[];
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
        sku: producto.sku || producto.codigo || null,
        imagen: imageUrl || producto.imagen || null,
        imagen_url: imageUrl || null,
        imagen_path: normalizeStorageImagePath(rawImage),
    };
}

function normalizeCotizacionItem(item: CotizacionItem): CotizacionItem {
    const rawImage = item.imagen_url || item.imagen;
    const imageUrl = normalizeStorageImageUrl(rawImage);

    return {
        ...item,
        aplica_costos_adicionales: item.aplica_costos_adicionales ?? true,
        imagen: imageUrl || item.imagen || null,
        ...(imageUrl ? { imagen_url: imageUrl } : {}),
        ...(rawImage ? { imagen_path: normalizeStorageImagePath(rawImage) } : {}),
    } as CotizacionItem;
}

const PLANTILLA_IDS_CON_IGV = new Set([3, 5]);

function normalizeBoolean(value: boolean | number | string | null | undefined): boolean | null {
    if (value === null || value === undefined) return null;

    return value === true || value === 1 || value === "1";
}

function plantillaIncluyeIgvFromPayload(
    plantillaId: number | string | null | undefined,
    plantilla?: { id?: number | string | null; incluye_igv?: boolean | number | null } | null
): boolean | null {
    const id = Number(plantillaId || plantilla?.id || 0);

    if (PLANTILLA_IDS_CON_IGV.has(id)) return true;
    if ([1, 2, 4].includes(id)) return false;

    return normalizeBoolean(plantilla?.incluye_igv);
}

function normalizeProductoExterno(item: ProductoExterno): CotizacionItem {
    const rawImage = item.imagen_url || item.imagen || item.imagen_path;
    const imageUrl = normalizeStorageImageUrl(rawImage);
    const costoBase = Number(item.costo_base_referencial || 0);
    const ultimoPrecioVenta = item.ultimo_precio_venta === null || item.ultimo_precio_venta === undefined
        ? 0
        : Number(item.ultimo_precio_venta);
    const ultimoMargen = item.ultimo_margen_usado === null || item.ultimo_margen_usado === undefined
        ? 0
        : Number(item.ultimo_margen_usado);
    const proveedores = item.ultimo_cotizacion_item?.proveedores?.length
        ? item.ultimo_cotizacion_item.proveedores
        : item.ultimo_cotizacion_item_con_proveedores?.proveedores?.length
            ? item.ultimo_cotizacion_item_con_proveedores.proveedores
        : item.proveedor
            ? [{ nombre: item.proveedor, link: item.link_proveedor || "", precio: null, notas: "" }]
            : [{ nombre: "", link: "", precio: null, notas: "" }];
    const latestCotizacion = item.ultimo_cotizacion_item?.cotizacion;
    const latestWithProvidersCotizacion = item.ultimo_cotizacion_item_con_proveedores?.cotizacion;
    const nota =
        item.ultimo_cotizacion_item?.nota ||
        item.ultimo_cotizacion_item_con_proveedores?.nota ||
        item.nota ||
        "";
    const resolvedMonedaId =
        item.moneda_id === null || item.moneda_id === undefined
            ? Number(latestCotizacion?.moneda_id || latestWithProvidersCotizacion?.moneda_id || 1)
            : Number(item.moneda_id);
    const precioIncluyeIgv =
        normalizeBoolean(item.precio_incluye_igv) ??
        plantillaIncluyeIgvFromPayload(
            latestCotizacion?.plantilla_id || latestWithProvidersCotizacion?.plantilla_id || item.plantilla_origen_id,
            latestCotizacion?.plantilla || latestWithProvidersCotizacion?.plantilla || item.plantilla_origen
        );
    const plantillaOrigenNombre = item.plantilla_origen?.formato_pdf || item.plantilla_origen?.nombre || null;
    const plantillaUltimoUsoNombre =
        item.ultimo_cotizacion_item?.cotizacion?.plantilla?.formato_pdf ||
        item.ultimo_cotizacion_item?.cotizacion?.plantilla?.nombre ||
        item.ultimo_cotizacion_item_con_proveedores?.cotizacion?.plantilla?.formato_pdf ||
        item.ultimo_cotizacion_item_con_proveedores?.cotizacion?.plantilla?.nombre ||
        plantillaOrigenNombre;

    return {
        id: item.id,
        cotizacion_id: 0,
        descripcion: item.descripcion || "",
        cantidad: 1,
        marca: item.marca || "",
        codigo: item.codigo || "",
        unidad_medida: item.unidad_medida || "UND",
        costo_base: costoBase,
        costo_unitario: costoBase,
        costo_total: costoBase,
        precio_venta: ultimoPrecioVenta,
        ganancia: Math.max(ultimoPrecioVenta - costoBase, 0),
        margen: 0,
        nota,
        subtotal: ultimoPrecioVenta,
        tipo: "externo",
        disponibilidad_tipo: item.disponibilidad_tipo || "stock",
        disponibilidad_dias: Number(item.disponibilidad_dias || 4),
        garantia_meses: Number(item.garantia_meses || 12),
        estado_cotizacion_item_id: 0,
        orden: 1,
        aplica_costos_adicionales: false,
        proveedor: item.proveedor || "",
        link_proveedor: item.link_proveedor || "",
        proveedores,
        imagen: imageUrl || item.imagen || null,
        imagen_url: imageUrl || null,
        imagen_path: normalizeStorageImagePath(rawImage),
        producto_id: item.producto_id === null || item.producto_id === undefined ? null : Number(item.producto_id),
        producto_externo_id: item.id,
        producto: item.producto || null,
        moneda_id: resolvedMonedaId,
        precio_incluye_igv: precioIncluyeIgv,
        plantilla_origen_id: item.plantilla_origen_id === null || item.plantilla_origen_id === undefined ? null : Number(item.plantilla_origen_id),
        plantilla_origen_nombre: plantillaOrigenNombre,
        plantilla_ultimo_uso_nombre: plantillaUltimoUsoNombre,
        moneda: item.moneda || null,
        costo_base_referencial: costoBase,
        ultimo_margen_usado: ultimoMargen,
        ultimo_precio_venta: ultimoPrecioVenta,
        ultima_fecha_cotizacion: item.ultima_fecha_cotizacion || null,
        veces_cotizado: item.veces_cotizado || 0,
        activo: item.activo ?? true,
        stock: Number(item.stock || 0),
        created_at: "",
        updated_at: "",
    };
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
        "sku", "nombre", "marca", "modelo", "codigo",
        "serie", "factura_numero", "ubicacion_almacen", "descripcion", "precio_referencial",
        "unidad_medida", "stock", "categoria_id", "estado",
        "tipo_producto", "stock_actual", "stock_minimo",
        "costo_unitario", "precio_venta", "codigo_barras", "moneda_id",
    ];
 
    for (const key of fields) {
        const value = payload[key];
        if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        }
    }
    payload.series?.forEach((serie, index) => {
        if (serie.trim()) formData.append(`series[${index}]`, serie.trim());
    });
        formData.append("activo", payload.activo ? "1" : "0");
        formData.append("controla_stock", payload.controla_stock ? "1" : "0");

            // Solo adjunta imagen si es base64 nueva
            if (payload.imagen?.startsWith("data:")) {
                const file = base64ToFile(payload.imagen, "producto.jpg");
                formData.append("imagen", file);
            }
            // Si es URL existente o vacío → no se envía nada → backend no toca la imagen

            return formData;
}

//Backend devuelve productos paginados
export const getProductosPaginated = async ({
    page = 1,
    search = "",
    perPage = 10,
}: {
    page?: number;
    search?: string;
    perPage?: number;
} = {}): Promise<ProductoPaginatedResponse> => {
    const res = await api.get("/productos", {
        params: {
            activo: true,
            page,
            search: search.trim() || undefined,
            per_page: perPage,
        },
    });
    const raw = res.data ?? {};
    const productos = raw.data ?? [];

    return {
        data: Array.isArray(productos) ? productos.map(normalizeProducto) : [],
        current_page: raw.current_page ?? page,
        last_page: raw.last_page ?? 1,
        total: raw.total ?? (Array.isArray(productos) ? productos.length : 0),
        per_page: raw.per_page ?? perPage,
        from: raw.from ?? 0,
        to: raw.to ?? 0,
    };
};

export const getProductos = async (): Promise<Producto[]> => {
    const perPage = 100;
    const first = await getProductosPaginated({ page: 1, perPage });
    const rows = [...first.data];
    const lastPage = Number(first.last_page || 1);

    for (let page = 2; page <= lastPage; page += 1) {
        const response = await getProductosPaginated({ page, perPage });
        rows.push(...response.data);
    }

    return rows;
};

export const getExternalItems = async (page = 1, search = "", perPage = 10): Promise<{
    data: CotizacionItem[];
    meta: {
        current_page: number;
        last_page: number;
        total: number;
        per_page: number;
    };
}> => {
    const res = await api.get("/productos-externos", {
        params: {
            page,
            search: search.trim() || undefined,
            activo: true,
            per_page: perPage,
        },
    });
    const raw = res.data ?? {};

    return {
        data: Array.isArray(raw.data) ? raw.data.map(normalizeProductoExterno) : [],
        meta: {
            current_page: raw.current_page ?? page,
            last_page: raw.last_page ?? 1,
            total: raw.total ?? (Array.isArray(raw.data) ? raw.data.length : 0),
            per_page: raw.per_page ?? perPage,
        },
    };
};

export const getProducto = async (id: number): Promise<Producto> => {
    const res = await api.get(`/productos/${id}`);
    return normalizeProducto(res.data);
};

export const convertirProductoExternoAInterno = async (
    id: number,
    payload: ConvertirProductoExternoPayload,
): Promise<{ producto: Producto; producto_externo: ProductoExterno; message?: string }> => {
    const formData = new FormData();
    formData.append("cantidad", String(payload.cantidad));
    formData.append("costo_unitario", String(payload.costo_unitario));
    formData.append("moneda_id", String(payload.moneda_id));
    formData.append("documento_numero", payload.documento_numero);
    formData.append("factura", payload.factura);

    if (payload.sku) formData.append("sku", payload.sku);
    if (payload.categoria_id) formData.append("categoria_id", String(payload.categoria_id));
    if (payload.estado) formData.append("estado", payload.estado);
    if (payload.observacion) formData.append("observacion", payload.observacion);

    const res = await api.post(`/productos-externos/${id}/convertir-interno`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
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
