export interface Cotizacion {
    id: string;
    numero: string;
    fecha: string;
    validez_dias: number;
    modo_distribucion: "POR_ITEM" | "POR_CANTIDAD";
    tipo_cambio: number;
    titulo: string;
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
    items: ItemCotizacion[];
    costosAdicionales: CostosAdicionales;

    // 🔥 NUEVO CONTROL FLUJO
    aprobadoPor?: string;
    rechazadoPor?: string;
    motivoRechazo?: string;
    fechaAprobacion?: string;
}

export interface ItemCotizacion {
    descripcion: string;
    cantidad: number;
    codigo: string;
    unidad_medida: string;
    costo_unitario: number;
    precio_venta: number;
    margen: number;
    marca?: string;
    costo_base: number;
    costo_total: number;
    ganancia: number;
    subtotal: number;
    imagen?: string;
    orden: number;
    cotizacion_id: string;
    producto_id: number | null;
    estado_cotizacion_id: number;
    garantia_meses?: number;
    disponibilidad_tipo: "stock" | "importacion";
    disponibilidad_dias: number;
    tipo: "catalogo" | "externo";
}

export interface CostosAdicionales {
    viaje: number;
    viatico: number;
    movilidad: number;
    estancia: number;
    envioFlete: number;
    personalExterno: number;
}
