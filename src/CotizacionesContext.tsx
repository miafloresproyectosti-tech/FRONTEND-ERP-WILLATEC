// // import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// export interface Cotizacion {
//   id: string;
//   numero: string;
//   fecha: string;
//   validez_dias: number;
//   modo_distribucion: 'POR_ITEM' | 'POR_CANTIDAD';
//   tipo_cambio: number;
//   titulo: string;
//   subtotal: number;
//   igv: number;
//   total: number;
//   ganancia?: number;
//   total_gasto?: number;
//   cliente_nombre: string;
//   cliente_ruc: string;
//   cliente_contacto: string;
//   cliente_telefono: string;
//   cliente_correo: string;
//   cliente_id: number;
//   plantilla_id: number;
//   estado_cotizacion_id: number;
//   plataforma_id: number;
//   user_id: number;
//   moneda_id: number;
//   items: ItemCotizacion[];
//   costosAdicionales: CostosAdicionales;

//   // 🔥 NUEVO CONTROL FLUJO
//   aprobadoPor?: string;
//   rechazadoPor?: string;
//   motivoRechazo?: string;
//   fechaAprobacion?: string;
// }

// export interface ItemCotizacion {
//   descripcion: string;
//   cantidad: number;
//   codigo: string;
//   unidad_medida: string;
//   costo_unitario: number;
//   precio_venta: number;
//   margen: number;
//   marca?: string;
//   costo_base: number;
//   costo_total: number;
//   ganancia: number;
//   subtotal: number;
//   imagen?: string;
//   orden: number;
//   cotizacion_id: string;
//   producto_id?: number;
//   estado_cotizacion_id: number;
//   garantia_meses?: number;
//   disponibilidad_tipo: 'stock' | 'importacion';
//   disponibilidad_dias: number;
//   tipo: 'catalogo' | 'externo';
// }

// export interface CostosAdicionales {
//   viaje: number;
//   viatico: number;
//   movilidad: number;
//   estancia: number;
//   envioFlete: number;
//   personalExterno: number;
// }

// // interface CotizacionesContextType {
// //   cotizaciones: Cotizacion[];

// //   addCotizacion: (c: Omit<Cotizacion, 'id' | 'estado'>) => void;

// //   updateCotizacion: (id: string, c: Partial<Cotizacion>) => void;

// //   deleteCotizacion: (id: string) => void;

// //   getCotizacion: (id: string) => Cotizacion | undefined;

// //   // 🔥 NUEVO FLUJO PRO
// //   enviarCotizacion: (id: string) => void;
// //   aprobarCotizacion: (id: string, user: string) => void;
// //   rechazarCotizacion: (id: string, user: string, motivo: string) => void;
// // }

// // const CotizacionesContext = createContext<CotizacionesContextType | undefined>(undefined);

// // const STORAGE_KEY = 'erp_cotizaciones';

// // export function CotizacionesProvider({ children }: { children: ReactNode }) {
// //   const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);

// //   useEffect(() => {
// //     const stored = localStorage.getItem(STORAGE_KEY);
// //     if (stored) setCotizaciones(JSON.parse(stored));
// //   }, []);

// //   useEffect(() => {
// //     localStorage.setItem(STORAGE_KEY, JSON.stringify(cotizaciones));
// //   }, [cotizaciones]);

// //   const addCotizacion = (c: Omit<Cotizacion, 'id' | 'estado'>) => {
// //     const newCot: Cotizacion = {
// //       ...c,
// //       id: Date.now().toString(),
// //       estado_cotizacion_id: 1,
// //     };
// //     setCotizaciones((prev) => [newCot, ...prev]);
// //   };

// //   const updateCotizacion = (id: string, data: Partial<Cotizacion>) => {
// //     setCotizaciones((prev) =>
// //       prev.map((c) => (c.id === id ? { ...c, ...data } : c))
// //     );
// //   };

// //   const deleteCotizacion = (id: string) => {
// //     setCotizaciones((prev) => prev.filter((c) => c.id !== id));
// //   };

// //   const getCotizacion = (id: string) => {
// //     return cotizaciones.find((c) => c.id === id);
// //   };

// //   // 🔥 ENVIAR A APROBACIÓN
// //   const enviarCotizacion = (id: string) => {
// //     updateCotizacion(id, {
// //       estado_cotizacion_id: 2,
// //     });
// //   };

// //   // 🔥 APROBAR
// //   const aprobarCotizacion = (id: string, user: string) => {
// //     updateCotizacion(id, {
// //       estado_cotizacion_id: 3,
// //       aprobadoPor: user,
// //       fechaAprobacion: new Date().toISOString(),
// //     });
// //   };

// //   // 🔥 RECHAZAR
// //   const rechazarCotizacion = (id: string, user: string, motivo: string) => {
// //     updateCotizacion(id, {
// //       estado_cotizacion_id: 4,
// //       rechazadoPor: user,
// //       motivoRechazo: motivo,
// //     });
// //   };

// //   return (
// //     <CotizacionesContext.Provider
// //       value={{
// //         cotizaciones,
// //         addCotizacion,
// //         updateCotizacion,
// //         deleteCotizacion,
// //         getCotizacion,
// //         enviarCotizacion,
// //         aprobarCotizacion,
// //         rechazarCotizacion,
// //       }}
// //     >
// //       {children}
// //     </CotizacionesContext.Provider>
// //   );
// // }

// // export function useCotizaciones() {
// //   const ctx = useContext(CotizacionesContext);
// //   if (!ctx) throw new Error('useCotizaciones debe usarse dentro del provider');
// //   return ctx;
// // }