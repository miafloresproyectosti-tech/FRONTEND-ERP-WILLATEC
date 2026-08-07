import { OPORTUNIDADES_STORAGE_KEY } from "../constants/licitaciones";
import type {
  CotizacionRelacionada,
  Oportunidad,
  OportunidadComentario,
} from "../types/licitaciones";
import { applyExpiredState, createId } from "../utils/licitaciones";

const seedOportunidades = (): Oportunidad[] => {
  const now = new Date();
  const future = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
  const near = new Date(now.getTime() + 20 * 60 * 60 * 1000).toISOString();
  const past = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

  const opportunities: Oportunidad[] = [
    {
      id: "op-seed-1",
      tipo: "licitacion",
      empresa: "Municipalidad de Lima",
      requerimiento: "Renovacion de licencias y soporte especializado",
      vigencia: future,
      ejecutivo: { id: 1, nombre: "Ejecutivo Comercial", email: "ventas@willatec.com" },
      categoria: "Licencias",
      estado: "en_atencion",
      observacion: "Se requiere revisar bases tecnicas antes de cotizar.",
      creadoEn: now.toISOString(),
      creadoPor: "Sistema",
      garantia: "Carta fianza 10%",
      plazo: "15 dias calendario",
      carpetaServidor: "LIC-2026-001",
      comentarios: [],
      archivos: [],
      historial: [
        {
          id: createId("hist"),
          fecha: now.toISOString(),
          usuario: "Sistema",
          tipo: "creacion",
          descripcion: "Oportunidad de licitacion registrada.",
        },
      ],
      cotizaciones: [],
    },
    {
      id: "op-seed-2",
      tipo: "privado",
      empresa: "Clinica Central",
      requerimiento: "Equipos para nueva sede administrativa",
      vigencia: near,
      ejecutivo: { id: 0, nombre: "Sin ejecutivo" },
      asignadoA: null,
      asignadoEn: null,
      asignadoPor: null,
      esNueva: true,
      categoria: "Hardware",
      estado: "sin_atender",
      observacion: "Cliente solicita respuesta rapida.",
      creadoEn: now.toISOString(),
      creadoPor: "Sistema",
      formaPago: "credito_30",
      destinoEntrega: "San Isidro",
      comentarios: [],
      archivos: [],
      historial: [
        {
          id: createId("hist"),
          fecha: now.toISOString(),
          usuario: "Sistema",
          tipo: "creacion",
          descripcion: "Oportunidad privada registrada.",
        },
      ],
      cotizaciones: [],
    },
    {
      id: "op-seed-3",
      tipo: "wherex",
      empresa: "Empresa Energia Sur",
      requerimiento: "Servicio de soporte y mesa de ayuda",
      vigencia: past,
      ejecutivo: { id: 1, nombre: "Ejecutivo Comercial", email: "ventas@willatec.com" },
      categoria: "Servicios TI",
      estado: "en_atencion",
      observacion: "Proceso proveniente de WHEREX.",
      creadoEn: now.toISOString(),
      creadoPor: "Sistema",
      formaPago: "al_contado",
      wherexId: "WX-20488",
      wherexUrl: "https://www.wherex.com/",
      comentariosGenerales: "Validar alcance de mesa de ayuda.",
      comentarios: [],
      archivos: [],
      historial: [
        {
          id: createId("hist"),
          fecha: now.toISOString(),
          usuario: "Sistema",
          tipo: "creacion",
          descripcion: "Oportunidad WHEREX registrada.",
        },
      ],
      cotizaciones: [],
    },
  ];

  return opportunities.map(applyExpiredState);
};

const persist = (items: Oportunidad[]) => {
  localStorage.setItem(OPORTUNIDADES_STORAGE_KEY, JSON.stringify(items));
};

export const getOportunidades = async (): Promise<Oportunidad[]> => {
  const raw = localStorage.getItem(OPORTUNIDADES_STORAGE_KEY);
  const parsed = raw ? (JSON.parse(raw) as Oportunidad[]) : seedOportunidades();
  const normalized = parsed.map(applyExpiredState);
  persist(normalized);
  return normalized;
};

export const saveOportunidad = async (opportunity: Oportunidad) => {
  const items = await getOportunidades();
  const exists = items.some((item) => item.id === opportunity.id);
  const next = exists
    ? items.map((item) => (item.id === opportunity.id ? opportunity : item))
    : [opportunity, ...items];

  persist(next);
  return opportunity;
};

export const deleteOportunidad = async (id: string) => {
  const items = await getOportunidades();
  persist(items.filter((item) => item.id !== id));
};

export const addComentarioOportunidad = async (
  id: string,
  comentario: OportunidadComentario
) => {
  const items = await getOportunidades();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          comentarios: [comentario, ...item.comentarios],
          historial: [
            {
              id: createId("hist"),
              fecha: comentario.fecha,
              usuario: comentario.usuario,
              tipo: "comentario" as const,
              descripcion: "Comentario interno agregado.",
            },
            ...item.historial,
          ],
        }
      : item
  );

  persist(next);
};

export const addCotizacionRelacionada = async (
  id: string,
  userName: string
): Promise<CotizacionRelacionada> => {
  const cotizacion: CotizacionRelacionada = {
    id: createId("cot"),
    numero: `COT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
    fecha: new Date().toISOString(),
    estado: "generada",
  };

  const items = await getOportunidades();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          estado: "cotizacion_generada" as const,
          cotizacionId: cotizacion.id,
          cotizacionNumero: cotizacion.numero,
          cotizaciones: [cotizacion, ...item.cotizaciones],
          modificadoEn: cotizacion.fecha,
          modificadoPor: userName,
          historial: [
            {
              id: createId("hist"),
              fecha: cotizacion.fecha,
              usuario: userName,
              tipo: "cotizacion" as const,
              descripcion: `Cotizacion ${cotizacion.numero} generada y vinculada.`,
            },
            ...item.historial,
          ],
        }
      : item
  );

  persist(next);
  return cotizacion;
};
