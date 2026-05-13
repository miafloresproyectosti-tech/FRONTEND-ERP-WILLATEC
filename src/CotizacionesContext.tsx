import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type EstadoCotizacion =
  | 'borrador'
  | 'enviada'
  | 'aprobada'
  | 'rechazada'
  | 'parcialmente_aprobada';

export interface Cotizacion {
  id: string;
  cliente: string;
  fecha: string;
  validezOferta: number;
  tipoPlantilla: 'DOLARES' | 'SOLES' | 'SOLES-EST';
  tipoMoneda: 'USD' | 'PEN';
  estado: EstadoCotizacion;
  items: ItemCotizacion[];
  costosAdicionales: CostosAdicionales;

  // 🔥 NUEVO CONTROL FLUJO
  aprobadoPor?: string;
  rechazadoPor?: string;
  motivoRechazo?: string;
  fechaAprobacion?: string;
}

export interface ItemCotizacion {
  id: number;
  producto: string;
  cantidad: number;
  cantidadAprobada?: number;
  estadoItem?: 'pendiente' | 'aprobado' | 'rechazado';
  precioVenta: number;
  costoCompra: number;
  costoMoneda: 'USD' | 'PEN';
  margen: number;
  tipo: 'catalogo' | 'externo';
}

export interface CostosAdicionales {
  viaje: number;
  viatico: number;
  movilidad: number;
  estancia: number;
  envioFlete: number;
  personalExterno: number;
}

interface CotizacionesContextType {
  cotizaciones: Cotizacion[];

  addCotizacion: (c: Omit<Cotizacion, 'id' | 'estado'>) => void;

  updateCotizacion: (id: string, c: Partial<Cotizacion>) => void;

  deleteCotizacion: (id: string) => void;

  getCotizacion: (id: string) => Cotizacion | undefined;

  // 🔥 NUEVO FLUJO PRO
  enviarCotizacion: (id: string) => void;
  aprobarCotizacion: (id: string, user: string) => void;
  rechazarCotizacion: (id: string, user: string, motivo: string) => void;
}

const CotizacionesContext = createContext<CotizacionesContextType | undefined>(undefined);

const STORAGE_KEY = 'erp_cotizaciones';

export function CotizacionesProvider({ children }: { children: ReactNode }) {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setCotizaciones(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cotizaciones));
  }, [cotizaciones]);

  const addCotizacion = (c: Omit<Cotizacion, 'id' | 'estado'>) => {
    const newCot: Cotizacion = {
      ...c,
      id: Date.now().toString(),
      estado: 'borrador',
    };
    setCotizaciones((prev) => [newCot, ...prev]);
  };

  const updateCotizacion = (id: string, data: Partial<Cotizacion>) => {
    setCotizaciones((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
  };

  const deleteCotizacion = (id: string) => {
    setCotizaciones((prev) => prev.filter((c) => c.id !== id));
  };

  const getCotizacion = (id: string) => {
    return cotizaciones.find((c) => c.id === id);
  };

  // 🔥 ENVIAR A APROBACIÓN
  const enviarCotizacion = (id: string) => {
    updateCotizacion(id, {
      estado: 'enviada',
    });
  };

  // 🔥 APROBAR
  const aprobarCotizacion = (id: string, user: string) => {
    updateCotizacion(id, {
      estado: 'aprobada',
      aprobadoPor: user,
      fechaAprobacion: new Date().toISOString(),
    });
  };

  // 🔥 RECHAZAR
  const rechazarCotizacion = (id: string, user: string, motivo: string) => {
    updateCotizacion(id, {
      estado: 'rechazada',
      rechazadoPor: user,
      motivoRechazo: motivo,
    });
  };

  return (
    <CotizacionesContext.Provider
      value={{
        cotizaciones,
        addCotizacion,
        updateCotizacion,
        deleteCotizacion,
        getCotizacion,
        enviarCotizacion,
        aprobarCotizacion,
        rechazarCotizacion,
      }}
    >
      {children}
    </CotizacionesContext.Provider>
  );
}

export function useCotizaciones() {
  const ctx = useContext(CotizacionesContext);
  if (!ctx) throw new Error('useCotizaciones debe usarse dentro del provider');
  return ctx;
}