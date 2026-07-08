export interface Cotizacion {
    id: string;
    numero: string;
    fecha: string;
    validez_dias: number;
    modo_distribucion: "POR_ITEM" | "POR_CANTIDAD";
    tipo_cambio: number;
    titulo: string;
    forma_pago?: string;
    entrega_provincia?: boolean;
    entrega_destino?: string | null;
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

export interface CotizacionItemProveedor {
    id?: number;
    cotizacion_item_id?: number;
    nombre: string;
    link?: string | null;
    precio?: number | null;
    notas?: string | null;
    orden?: number;
}

export type ImportacionCalculoTipo = "under200" | "from201to1999" | "from2000up";

export interface ImportacionCalculo {
    tipo: ImportacionCalculoTipo;
    label: string;
    precio_producto: number;
    unidades: number;
    peso_total: number;
    costo_peso_kg: number;
    desaduanaje: number;
    agente_aduanero: number;
    impuesto_rate: number;
    total_producto: number;
    total_peso: number;
    subtotal_importacion: number;
    impuesto: number;
    total_importacion: number;
    precio_unitario_usd: number;
    costo_aplicado: number;
    moneda_id: number;
    tipo_cambio_usd_soles?: number;
    created_at?: string;
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
    nota?: string;
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
    producto_externo_id?: number | null;
    moneda_id?: number | null;
    precio_incluye_igv?: boolean | null;
    plantilla_origen_id?: number | null;
    plantilla_origen_nombre?: string | null;
    plantilla_ultimo_uso_nombre?: string | null;
    estado_cotizacion_item_id?: number;
    aplica_costos_adicionales?: boolean;
    created_at?: string;
    updated_at?: string;
    tipo?: "catalogo" | "externo"; // Para diferenciar items de catálogo vs personalizados
    proveedor?: string; // Nuevo campo para proveedor
    link_proveedor?: string; // Nuevo campo para link del proveedor
    proveedores?: CotizacionItemProveedor[];
    importacion_calculo?: ImportacionCalculo | null;
    costo_base_referencial?: number;
    ultimo_margen_usado?: number | null;
    ultimo_precio_venta?: number | null;
    ultima_fecha_cotizacion?: string | null;
    veces_cotizado?: number;
    activo?: boolean;
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
    nota?: string;
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
    producto_externo_id?: number | null;
    moneda_id?: number | null;
    precio_incluye_igv?: boolean | null;
    plantilla_origen_id?: number | null;
    plantilla_origen_nombre?: string | null;
    plantilla_ultimo_uso_nombre?: string | null;
    estado_cotizacion_item_id?: number;
    aplica_costos_adicionales?: boolean;
    created_at?: string;
    updated_at?: string;
    tipo?: "catalogo" | "externo"; // Para diferenciar items de catálogo vs personalizados
    proveedor?: string; // Nuevo campo para proveedor
    link_proveedor?: string; // Nuevo campo para link del proveedor
    proveedores?: CotizacionItemProveedor[];
    importacion_calculo?: ImportacionCalculo | null;
    costo_base_referencial?: number;
    ultimo_margen_usado?: number | null;
    ultimo_precio_venta?: number | null;
    ultima_fecha_cotizacion?: string | null;
    veces_cotizado?: number;
    activo?: boolean;
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
