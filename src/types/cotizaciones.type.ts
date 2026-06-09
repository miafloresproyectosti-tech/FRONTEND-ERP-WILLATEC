export interface Cotizacion {
    id: string;
    numero: string;
    fecha: string;
    validez_dias: number;
    modo_distribucion: "POR_ITEM" | "POR_CANTIDAD";
    tipo_cambio: number;
    titulo: string;
    forma_pago?: string;
    subtotal: number;
    igv: number;
    total: number;
    ganancia?: number;
    total_gasto?: number;
    cliente_nombre: string;
    cliente_ruc: string;
    cliente_contacto: string;
    cliente_telefono: string;
    cliente_correo: string;
    cliente_id: number;
    plantilla_id: number;
    estado_cotizacion_id: number;
    plataforma_id: number;
    user_id: number;
    moneda_id: number;
    delegado_cotizacion_id?: number | null;
    items: CotizacionItem[];
    costosAdicionales: CotizacionCostosAdicional[];
    historial?: CotizacionHistorial[];
    cotizacion_historial?: CotizacionHistorial[];

    // 🔥 NUEVO CONTROL FLUJO
    aprobadoPor?: string;
    rechazadoPor?: string;
    motivoRechazo?: string;
    fechaAprobacion?: string;
}

export type CotizacionItem ={
    id: number;
    cotizacion_id: number;
    descripcion: string;
    cantidad: number;
    costo_base: number;
    imagen: string;
    imagen_url?: string | null;
    imagen_path?: string | null;
    margen: number;
    marca?: string;
    codigo?: string;
    unidad_medida?: string;
    disponibilidad?: string;
    garantia_meses: number;
    disponibilidad_tipo: "stock" | "importacion";
    disponibilidad_dias: number;
    orden: number;
    costo_unitario?: number;
    precio_venta: number;
    subtotal?: number;
    costo_total?: number;
    ganancia?: number;
    producto_id?: number;
    estado_cotizacion_item_id?: number;
    created_at?: string;
    updated_at?: string;
    tipo?: "catalogo" | "externo"; // Para diferenciar items de catálogo vs personalizados
    proveedor?: string; // Nuevo campo para proveedor
    link_proveedor?: string; // Nuevo campo para link del proveedor
}

export interface CotizacionCostosAdicional {
    id: number;
    cotizacion_id: number;
    tipo: string;
    monto: number;
    descripcion: string;
    created_at?: string;
    updated_at?: string;
}

export interface CotizacionHistorial {
    id: number;
    cotizacion_id: number;
    estado_anterior_id: number | null;
    estado_nuevo_id: number;
    comentario?: string | null;
    user_id: number;
    created_at?: string;
    updated_at?: string;
    user?: {
        id: number;
        nombre?: string;
        name?: string;
        email?: string;
    };
    usuario?: {
        id: number;
        nombre?: string;
        name?: string;
        email?: string;
    };
}

export interface Plantilla{
    id:number,
    nombre: string,
    incluye_igv: boolean
}

export interface ItemForm {
    id: number;
    cotizacion_id: number;
    descripcion: string;
    cantidad: number;
    costo_base: number;
    imagen: string;
    imagen_url?: string | null;
    imagen_path?: string | null;
    margen: number;
    marca?: string;
    codigo?: string;
    unidad_medida?: string;
    disponibilidad?: string;
    garantia_meses?: number;
    disponibilidad_tipo: "stock" | "importacion";
    disponibilidad_dias: number;
    orden: number;
    costo_unitario?: number;
    precio_venta?: number;
    subtotal?: number;
    costo_total?: number;
    ganancia?: number;
    producto_id?: number;
    estado_cotizacion_item_id?: number;
    created_at?: string;
    updated_at?: string;
    tipo?: "catalogo" | "externo"; // Para diferenciar items de catálogo vs personalizados
    proveedor?: string; // Nuevo campo para proveedor
    link_proveedor?: string; // Nuevo campo para link del proveedor
}

export interface Cliente {
    id: number;
    nombre: string;
    ruc: string;
    contacto?: string | null;
    correo: string | null;
    telefono: string | null;
    estado: "activo" | "inactivo";
    tipo_cliente_id: number;
    moneda_id: number;
}
