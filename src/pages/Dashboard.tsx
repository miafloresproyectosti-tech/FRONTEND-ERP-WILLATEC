import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
  Warehouse,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getActiveClientesCached } from "../services/cliente.service";
import {
  getCotizacionesPaginated,
  type Cotizacion,
} from "../services/cotizacion.service";
import { getInventarioMovimientos, getProductosInventario, type InventarioMovimiento, type ProductoInventarioOption } from "../services/inventario.service";
import { getOcEmitidas, getOcRecibidas, type OcEmitida, type OcRecibida } from "../services/ordenCompra.service";
import { getPlataformas, type Plataforma } from "../services/plataforma.service";
import { getProductos, type Producto } from "../services/producto.service";
import { getUsers, type User } from "../services/usuario.service";
import { formatMoney } from "../utils/formatNumber";
import { useRefresh } from "../RefreshContext";

type DashboardTab = "ventas" | "inventario" | "operacion";
type PeriodFilter = "hoy" | "7d" | "mes" | "anio" | "todo";

interface DashboardState {
  cotizaciones: Cotizacion[];
  clientesTotal: number;
  productos: Producto[];
  productosInventario: ProductoInventarioOption[];
  ocRecibidas: OcRecibida[];
  ocEmitidas: OcEmitida[];
  movimientos: InventarioMovimiento[];
  users: User[];
  plataformas: Plataforma[];
}

const emptyState: DashboardState = {
  cotizaciones: [],
  clientesTotal: 0,
  productos: [],
  productosInventario: [],
  ocRecibidas: [],
  ocEmitidas: [],
  movimientos: [],
  users: [],
  plataformas: [],
};

type EstadoKey =
  | "borrador"
  | "enviada"
  | "parcialmente_aprobada"
  | "aprobada"
  | "rechazada"
  | "oc_registrada";

const ESTADOS: Array<{ key: EstadoKey; fallbackId: number; label: string; color: string }> = [
  { key: "borrador", fallbackId: 1, label: "Borrador", color: "bg-slate-100 text-slate-700" },
  { key: "enviada", fallbackId: 2, label: "Enviada", color: "bg-blue-50 text-blue-700" },
  { key: "parcialmente_aprobada", fallbackId: 3, label: "Parcial", color: "bg-amber-50 text-amber-700" },
  { key: "aprobada", fallbackId: 4, label: "Aprobada", color: "bg-emerald-50 text-emerald-700" },
  { key: "rechazada", fallbackId: 5, label: "Rechazada", color: "bg-red-50 text-red-700" },
  { key: "oc_registrada", fallbackId: 6, label: "OC registrada", color: "bg-indigo-50 text-indigo-700" },
];

const ESTADO_BY_ID = new Map(ESTADOS.map((estado) => [estado.fallbackId, estado]));
const ESTADO_BY_KEY = new Map(ESTADOS.map((estado) => [estado.key, estado]));

const tabItems: Array<{ id: DashboardTab; label: string; icon: typeof BarChart3 }> = [
  { id: "ventas", label: "Ventas", icon: BarChart3 },
  { id: "inventario", label: "Inventario", icon: Warehouse },
  { id: "operacion", label: "Operacion", icon: ClipboardCheck },
];

const periodItems: Array<{ id: PeriodFilter; label: string }> = [
  { id: "hoy", label: "Hoy" },
  { id: "7d", label: "7 dias" },
  { id: "mes", label: "Este mes" },
  { id: "anio", label: "Este año" },
  { id: "todo", label: "Todo" },
];

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0) || 0;

const getRowDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const periodStartDate = (period: PeriodFilter) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "hoy") return start;
  if (period === "7d") {
    start.setDate(start.getDate() - 6);
    return start;
  }
  if (period === "mes") {
    start.setDate(1);
    return start;
  }
  if (period === "anio") {
    start.setMonth(0, 1);
    return start;
  }

  return null;
};

const isWithinPeriod = (value: string | null | undefined, period: PeriodFilter) => {
  if (period === "todo") return true;
  const date = getRowDate(value);
  const start = periodStartDate(period);
  if (!date || !start) return false;

  return date >= start;
};

const estadoNombre = (cotizacion: Cotizacion | null | undefined) => {
  const row = cotizacion as any;
  return String(row?.estado_cotizacion?.nombre || row?.estadoCotizacion?.nombre || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

const estadoKey = (cotizacion: Cotizacion | null | undefined): EstadoKey | null => {
  if (!cotizacion) return null;

  const nombre = estadoNombre(cotizacion);
  if (ESTADO_BY_KEY.has(nombre as EstadoKey)) return nombre as EstadoKey;

  return ESTADO_BY_ID.get(Number(cotizacion.estado_cotizacion_id))?.key ?? null;
};

const isCotizacionAprobada = (cotizacion: Cotizacion) =>
  estadoKey(cotizacion) === "aprobada";

const isCotizacionOcRegistrada = (cotizacion: Cotizacion | null | undefined) => {
  return estadoKey(cotizacion) === "oc_registrada";
};

const ocVentaDate = (oc: OcRecibida) => oc.updated_at || oc.fecha_recepcion || oc.created_at || "";

const userDisplayName = (user?: Record<string, any> | null) => {
  const row = user as any;
  const fullName = `${row?.nombres || row?.profile?.nombres || ""} ${row?.apellidos || row?.profile?.apellidos || ""}`.trim();
  return fullName || row?.name || row?.email || "Sin ejecutivo";
};

const formatDate = (value?: string | null) => {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Lima",
  });
};

const daysSince = (value?: string | null) => {
  const date = getRowDate(value);
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((today.getTime() - date.getTime()) / 86_400_000));
};

const monthKey = (value?: string | null) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleDateString("es-PE", {
    month: "short",
    year: "2-digit",
    timeZone: "America/Lima",
  });
};

const loadCotizaciones = async () => {
  const perPage = 100;
  const first = await getCotizacionesPaginated({ page: 1, perPage });
  const rows = [...(first.data || [])];
  const lastPage = Number(first.last_page || 1);

  for (let page = 2; page <= lastPage; page += 1) {
    const response = await getCotizacionesPaginated({ page, perPage });
    rows.push(...(response.data || []));
  }

  return rows;
};

const sumCotizaciones = (rows: Cotizacion[], predicate: (row: Cotizacion) => boolean) =>
  rows.filter(predicate).reduce((acc, row) => acc + toNumber(row.total), 0);

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof FileText;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>
        <span className={`rounded-lg p-2 ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { refreshCount, lastSync } = useRefresh();
  const [activeTab, setActiveTab] = useState<DashboardTab>("ventas");
  const [period, setPeriod] = useState<PeriodFilter>("mes");
  const [data, setData] = useState<DashboardState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    const [
      cotizacionesResult,
      clientesResult,
      productosResult,
      productosInventarioResult,
      ocRecibidasResult,
      ocEmitidasResult,
      movimientosResult,
      usersResult,
      plataformasResult,
    ] = await Promise.allSettled([
      loadCotizaciones(),
      getActiveClientesCached(),
      getProductos(),
      getProductosInventario(),
      getOcRecibidas({ page: 1, perPage: 100 }),
      getOcEmitidas({ page: 1, perPage: 100 }),
      getInventarioMovimientos({ page: 1, per_page: 8 }),
      getUsers(),
      getPlataformas(),
    ]);

    setData({
      cotizaciones: cotizacionesResult.status === "fulfilled" ? cotizacionesResult.value : [],
      clientesTotal: clientesResult.status === "fulfilled" ? clientesResult.value.length : 0,
      productos: productosResult.status === "fulfilled" ? productosResult.value : [],
      productosInventario: productosInventarioResult.status === "fulfilled" ? productosInventarioResult.value : [],
      ocRecibidas: ocRecibidasResult.status === "fulfilled" ? ocRecibidasResult.value.data : [],
      ocEmitidas: ocEmitidasResult.status === "fulfilled" ? ocEmitidasResult.value.data : [],
      movimientos: movimientosResult.status === "fulfilled" ? movimientosResult.value.data : [],
      users: usersResult.status === "fulfilled" ? usersResult.value : [],
      plataformas: plataformasResult.status === "fulfilled" ? plataformasResult.value : [],
    });

    if ([cotizacionesResult, productosResult, ocRecibidasResult].some((result) => result.status === "rejected")) {
      setError("Algunas secciones no pudieron cargarse. Se muestran los datos disponibles.");
    }

    setLoadedAt(new Date().toISOString());
    setLoading(false);
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const cotizacionesPeriodo = useMemo(() => {
    return data.cotizaciones.filter((row) => isWithinPeriod(row.fecha || row.created_at, period));
  }, [data.cotizaciones, period]);

  const ocRecibidasPeriodo = useMemo(() => {
    return data.ocRecibidas.filter((row) => isWithinPeriod(row.fecha_recepcion || "", period));
  }, [data.ocRecibidas, period]);

  const ocEmitidasPeriodo = useMemo(() => {
    return data.ocEmitidas.filter((row) => isWithinPeriod(row.fecha_emision || "", period));
  }, [data.ocEmitidas, period]);

  const cotizacionesById = useMemo(() => {
    return new Map(data.cotizaciones.map((cotizacion) => [Number(cotizacion.id), cotizacion]));
  }, [data.cotizaciones]);

  const ocRecibidasAtendidasPeriodo = useMemo(() => {
    return data.ocRecibidas.filter((oc) => {
      const cotizacion = cotizacionesById.get(Number(oc.cotizacion_id || oc.cotizacion?.id));
      return oc.estado === "atendido"
        && isWithinPeriod(ocVentaDate(oc), period)
        && isCotizacionOcRegistrada(cotizacion);
    });
  }, [cotizacionesById, data.ocRecibidas, period]);

  const metrics = useMemo(() => {
    const cotizaciones = cotizacionesPeriodo;
    const aprobadas = cotizaciones.filter(isCotizacionAprobada);
    const pendientes = cotizaciones.filter((row) => ["borrador", "enviada", "parcialmente_aprobada"].includes(estadoKey(row) || ""));
    const ocPendientes = ocRecibidasPeriodo.filter((row) => row.estado !== "atendido").length + ocEmitidasPeriodo.filter((row) => row.estado !== "atendido").length;
    const productosBajoStock = data.productos.filter((producto) => {
      const disponible = toNumber(producto.stock_disponible ?? producto.stock);
      const minimo = toNumber(producto.stock_minimo);
      return disponible <= Math.max(minimo, 1);
    });
    const valorInventario = data.productosInventario.reduce((acc, producto) => acc + toNumber(producto.valor_stock), 0);
    const ventaEfectuada = ocRecibidasAtendidasPeriodo.reduce((acc, oc) => {
      const cotizacion = cotizacionesById.get(Number(oc.cotizacion_id || oc.cotizacion?.id));
      return acc + toNumber(cotizacion?.total || oc.cotizacion?.total);
    }, 0);

    return {
      ventaEfectuada,
      aprobadaLista: sumCotizaciones(aprobadas, () => true),
      cotizacionesTotal: cotizaciones.length,
      cotizacionesPendientes: pendientes.length,
      cotizacionesAprobadas: aprobadas.length,
      ventasEfectuadas: ocRecibidasAtendidasPeriodo.length,
      clientesTotal: data.clientesTotal,
      ocPendientes,
      productosTotal: data.productos.length,
      productosBajoStock,
      valorInventario,
    };
  }, [cotizacionesById, cotizacionesPeriodo, data.clientesTotal, data.productos, data.productosInventario, ocEmitidasPeriodo, ocRecibidasAtendidasPeriodo, ocRecibidasPeriodo]);

  const chartData = useMemo(() => {
    const buckets = new Map<string, { mes: string; cotizado: number; aprobado: number; venta: number }>();

    cotizacionesPeriodo.forEach((cotizacion) => {
      const key = monthKey(cotizacion.fecha || cotizacion.created_at);
      const current = buckets.get(key) || { mes: key, cotizado: 0, aprobado: 0, venta: 0 };
      current.cotizado += toNumber(cotizacion.total);
      if (isCotizacionAprobada(cotizacion)) {
        current.aprobado += toNumber(cotizacion.total);
      }
      buckets.set(key, current);
    });

    ocRecibidasAtendidasPeriodo.forEach((oc) => {
      const key = monthKey(ocVentaDate(oc));
      const current = buckets.get(key) || { mes: key, cotizado: 0, aprobado: 0, venta: 0 };
      const cotizacion = cotizacionesById.get(Number(oc.cotizacion_id || oc.cotizacion?.id));
      current.venta += toNumber(cotizacion?.total || oc.cotizacion?.total);
      buckets.set(key, current);
    });

    return Array.from(buckets.values()).slice(-6);
  }, [cotizacionesById, cotizacionesPeriodo, ocRecibidasAtendidasPeriodo]);

  const ejecutivoMetrics = useMemo(() => {
    const usersById = new Map(data.users.map((user) => [Number(user.id), user]));
    const rows = new Map<number, {
      id: number;
      nombre: string;
      cotizadas: number;
      montoCotizado: number;
      aprobadas: number;
      montoAprobado: number;
      ventas: number;
      montoVenta: number;
    }>();

    const ensureRow = (cotizacion?: Cotizacion | null) => {
      const userId = Number(cotizacion?.user_id || cotizacion?.user?.id || 0);
      const user = usersById.get(userId) || cotizacion?.user || cotizacion?.usuario || null;
      const id = userId || -1;

      if (!rows.has(id)) {
        rows.set(id, {
          id,
          nombre: userDisplayName(user),
          cotizadas: 0,
          montoCotizado: 0,
          aprobadas: 0,
          montoAprobado: 0,
          ventas: 0,
          montoVenta: 0,
        });
      }

      return rows.get(id)!;
    };

    cotizacionesPeriodo.forEach((cotizacion) => {
      const row = ensureRow(cotizacion);
      row.cotizadas += 1;
      row.montoCotizado += toNumber(cotizacion.total);

      if (isCotizacionAprobada(cotizacion)) {
        row.aprobadas += 1;
        row.montoAprobado += toNumber(cotizacion.total);
      }
    });

    ocRecibidasAtendidasPeriodo.forEach((oc) => {
      const cotizacion = cotizacionesById.get(Number(oc.cotizacion_id || oc.cotizacion?.id));
      const row = ensureRow(cotizacion);
      row.ventas += 1;
      row.montoVenta += toNumber(cotizacion?.total || oc.cotizacion?.total);
    });

    return Array.from(rows.values())
      .map((row) => ({
        ...row,
        conversion: row.cotizadas > 0 ? (row.ventas / row.cotizadas) * 100 : 0,
      }))
      .sort((a, b) => b.montoVenta - a.montoVenta || b.montoAprobado - a.montoAprobado || b.montoCotizado - a.montoCotizado);
  }, [cotizacionesById, cotizacionesPeriodo, data.users, ocRecibidasAtendidasPeriodo]);

  const plataformaMetrics = useMemo(() => {
    const plataformasById = new Map(data.plataformas.map((plataforma) => [Number(plataforma.id), plataforma.nombre]));
    const rows = new Map<number, {
      id: number;
      nombre: string;
      cotizaciones: number;
      aprobadas: number;
      ocRegistradas: number;
      montoCotizado: number;
    }>();

    cotizacionesPeriodo.forEach((cotizacion) => {
      const id = Number(cotizacion.plataforma_id || 0);
      const row = rows.get(id) || {
        id,
        nombre: plataformasById.get(id) || `Plataforma #${id || "N/A"}`,
        cotizaciones: 0,
        aprobadas: 0,
        ocRegistradas: 0,
        montoCotizado: 0,
      };

      row.cotizaciones += 1;
      row.montoCotizado += toNumber(cotizacion.total);
      if (isCotizacionAprobada(cotizacion)) row.aprobadas += 1;
      if (isCotizacionOcRegistrada(cotizacion)) row.ocRegistradas += 1;
      rows.set(id, row);
    });

    return Array.from(rows.values())
      .sort((a, b) => b.cotizaciones - a.cotizaciones || b.montoCotizado - a.montoCotizado);
  }, [cotizacionesPeriodo, data.plataformas]);

  const estadoResumen = useMemo(() => {
    return ESTADOS.map((estado) => {
      const match = cotizacionesPeriodo.find((row) => estadoKey(row) === estado.key);

      return {
        ...estado,
        id: Number(match?.estado_cotizacion_id || estado.fallbackId),
        total: cotizacionesPeriodo.filter((row) => estadoKey(row) === estado.key).length,
      };
    });
  }, [cotizacionesPeriodo]);

  const recientesCotizaciones = useMemo(() => {
    return [...cotizacionesPeriodo]
      .sort((a, b) => String(b.created_at || b.fecha).localeCompare(String(a.created_at || a.fecha)))
      .slice(0, 6);
  }, [cotizacionesPeriodo]);

  const lowStock = metrics.productosBajoStock.slice(0, 8);
  const ocRecibidasPendientes = ocRecibidasPeriodo.filter((row) => row.estado !== "atendido").slice(0, 6);
  const ocEmitidasPendientes = ocEmitidasPeriodo.filter((row) => row.estado !== "atendido").slice(0, 6);

  const topClientes = useMemo(() => {
    const rows = new Map<string, {
      key: string;
      nombre: string;
      ruc?: string;
      ventas: number;
      monto: number;
      ultimaVenta?: string;
    }>();

    ocRecibidasAtendidasPeriodo.forEach((oc) => {
      const cotizacion = cotizacionesById.get(Number(oc.cotizacion_id || oc.cotizacion?.id));
      const rawOc = oc as any;
      const nombre =
        cotizacion?.cliente_nombre ||
        oc.cotizacion?.cliente_nombre ||
        oc.cotizacion?.cliente?.nombre ||
        rawOc.cliente_nombre ||
        "Cliente sin nombre";
      const ruc = cotizacion?.cliente_ruc || rawOc.cliente_ruc || "";
      const key = String(cotizacion?.cliente_id || rawOc.cliente_id || ruc || nombre).toLowerCase();
      const current = rows.get(key) || { key, nombre, ruc, ventas: 0, monto: 0, ultimaVenta: undefined };
      const ventaDate = ocVentaDate(oc);

      current.ventas += 1;
      current.monto += toNumber(cotizacion?.total || oc.cotizacion?.total);
      current.ultimaVenta = !current.ultimaVenta || String(ventaDate).localeCompare(String(current.ultimaVenta)) > 0
        ? ventaDate
        : current.ultimaVenta;

      rows.set(key, current);
    });

    return Array.from(rows.values())
      .sort((a, b) => b.monto - a.monto || b.ventas - a.ventas)
      .slice(0, 6);
  }, [cotizacionesById, ocRecibidasAtendidasPeriodo]);

  const approvedWithoutOc = useMemo(() => {
    const cotizacionesConOc = new Set(data.ocRecibidas.map((oc) => Number(oc.cotizacion_id || oc.cotizacion?.id)));

    return cotizacionesPeriodo
      .filter((cotizacion) => isCotizacionAprobada(cotizacion) && !cotizacionesConOc.has(Number(cotizacion.id)))
      .sort((a, b) => String(b.updated_at || b.created_at || b.fecha).localeCompare(String(a.updated_at || a.created_at || a.fecha)))
      .slice(0, 6);
  }, [cotizacionesPeriodo, data.ocRecibidas]);

  const oldestPendingOrders = useMemo(() => {
    const recibidas = ocRecibidasPeriodo
      .filter((oc) => oc.estado !== "atendido")
      .map((oc) => ({
        id: oc.id,
        tipo: "Recibida",
        numero: oc.numero || `OC recibida #${oc.id}`,
        detalle: oc.cotizacion?.cliente_nombre || oc.cotizacion?.cliente?.nombre || "Sin cliente",
        estado: oc.estado,
        date: oc.fecha_recepcion || oc.created_at || "",
        route: `/ordenes-compra/recibidas/${oc.id}`,
      }));
    const emitidas = ocEmitidasPeriodo
      .filter((oc) => oc.estado !== "atendido")
      .map((oc) => ({
        id: oc.id,
        tipo: "Emitida",
        numero: oc.numero || `OC emitida #${oc.id}`,
        detalle: oc.proveedor || "Sin proveedor",
        estado: oc.estado,
        date: oc.fecha_emision || "",
        route: `/ordenes-compra/emitidas/${oc.id}`,
      }));

    return [...recibidas, ...emitidas]
      .map((oc) => ({ ...oc, dias: daysSince(oc.date) ?? 0 }))
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 8);
  }, [ocEmitidasPeriodo, ocRecibidasPeriodo]);

  const actionAlerts = useMemo(() => {
    const today = new Date();
    const sentWithoutAdvance = cotizacionesPeriodo.filter((cotizacion) => {
      if (estadoKey(cotizacion) !== "enviada") return false;
      const date = getRowDate(cotizacion.fecha || cotizacion.created_at);
      if (!date) return false;

      const days = Math.floor((today.getTime() - date.getTime()) / 86_400_000);
      return days >= 7;
    });
    const pendingMods = cotizacionesPeriodo.filter((cotizacion) => toNumber(cotizacion.modificaciones_pendientes_count) > 0);
    const missingDocs = ocRecibidasPeriodo.filter((oc) => oc.documentos_completos === false);
    const deliveryPending = ocRecibidasPeriodo.filter((oc) => oc.estado === "por_entrega");
    const recibidasPendientes = ocRecibidasPeriodo.filter((oc) => !["atendido", "por_entrega"].includes(String(oc.estado)));
    const emitidasMissingDocs = ocEmitidasPeriodo.filter((oc) => oc.documentos_completos === false);
    const emitidasPendientes = ocEmitidasPeriodo.filter((oc) => oc.estado !== "atendido");

    return [
      ...missingDocs.slice(0, 3).map((oc) => ({
        key: `docs-${oc.id}`,
        title: oc.numero || `OC recibida #${oc.id}`,
        detail: "Faltan documentos obligatorios",
        tone: "bg-red-50 text-red-700 border-red-100",
        action: () => navigate(`/ordenes-compra/recibidas/${oc.id}`),
      })),
      ...deliveryPending.slice(0, 3).map((oc) => ({
        key: `delivery-${oc.id}`,
        title: oc.numero || `OC recibida #${oc.id}`,
        detail: "Pendiente de entrega/atencion",
        tone: "bg-blue-50 text-blue-700 border-blue-100",
        action: () => navigate(`/ordenes-compra/recibidas/${oc.id}`),
      })),
      ...recibidasPendientes.slice(0, 3).map((oc) => ({
        key: `received-pending-${oc.id}`,
        title: oc.numero || `OC recibida #${oc.id}`,
        detail: `Estado: ${oc.estado}`,
        tone: "bg-slate-50 text-slate-700 border-slate-100",
        action: () => navigate(`/ordenes-compra/recibidas/${oc.id}`),
      })),
      ...emitidasMissingDocs.slice(0, 3).map((oc) => ({
        key: `issued-docs-${oc.id}`,
        title: oc.numero || `OC emitida #${oc.id}`,
        detail: "Faltan documentos de compra/pago",
        tone: "bg-red-50 text-red-700 border-red-100",
        action: () => navigate(`/ordenes-compra/emitidas/${oc.id}`),
      })),
      ...emitidasPendientes.slice(0, 3).map((oc) => ({
        key: `issued-pending-${oc.id}`,
        title: oc.numero || `OC emitida #${oc.id}`,
        detail: `Estado: ${oc.estado}`,
        tone: "bg-indigo-50 text-indigo-700 border-indigo-100",
        action: () => navigate(`/ordenes-compra/emitidas/${oc.id}`),
      })),
      ...lowStock.slice(0, 3).map((producto) => ({
        key: `stock-${producto.id}`,
        title: producto.nombre,
        detail: `Disponible ${toNumber(producto.stock_disponible ?? producto.stock)}`,
        tone: "bg-amber-50 text-amber-700 border-amber-100",
        action: () => navigate("/productos"),
      })),
      ...sentWithoutAdvance.slice(0, 3).map((cotizacion) => ({
        key: `sent-${cotizacion.id}`,
        title: cotizacion.numero,
        detail: "Enviada hace 7 dias o mas",
        tone: "bg-slate-50 text-slate-700 border-slate-100",
        action: () => navigate(`/cotizaciones/${cotizacion.id}/view`),
      })),
      ...pendingMods.slice(0, 3).map((cotizacion) => ({
        key: `mods-${cotizacion.id}`,
        title: cotizacion.numero,
        detail: "Tiene modificacion pendiente",
        tone: "bg-indigo-50 text-indigo-700 border-indigo-100",
        action: () => navigate(`/cotizaciones/${cotizacion.id}/view`),
      })),
    ].slice(0, 8);
  }, [cotizacionesPeriodo, lowStock, navigate, ocEmitidasPeriodo, ocRecibidasPeriodo]);
  const syncLabel = loadedAt || lastSync
    ? new Date(loadedAt || lastSync || "").toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Lima",
    })
    : "Nunca";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Indicadores reales de cotizaciones, inventario y ordenes de compra.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-white p-1">
            {periodItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  period === item.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">Actualizado: {refreshCount === 0 && !loadedAt ? "Nunca" : syncLabel}</span>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refrescar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Venta efectuada"
          value={formatMoney(metrics.ventaEfectuada, "S/")}
          subtitle={`${metrics.ventasEfectuadas} OC registradas y atendidas`}
          icon={TrendingUp}
          tone="bg-emerald-50 text-emerald-700"
        />
        <KpiCard
          title="Aprobadas para enviar"
          value={formatMoney(metrics.aprobadaLista, "S/")}
          subtitle={`${metrics.cotizacionesAprobadas} cotizaciones aprobadas`}
          icon={ClipboardCheck}
          tone="bg-lime-50 text-lime-700"
        />
        <KpiCard
          title="Cotizaciones abiertas"
          value={String(metrics.cotizacionesPendientes)}
          subtitle={`${metrics.cotizacionesTotal} cotizaciones registradas`}
          icon={FileText}
          tone="bg-blue-50 text-blue-700"
        />
        <KpiCard
          title="OC por atender"
          value={String(metrics.ocPendientes)}
          subtitle="Recibidas y emitidas no atendidas"
          icon={ShoppingCart}
          tone="bg-indigo-50 text-indigo-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <KpiCard
          title="Alertas de stock"
          value={String(metrics.productosBajoStock.length)}
          subtitle={`${metrics.productosTotal} productos internos activos`}
          icon={AlertTriangle}
          tone="bg-amber-50 text-amber-700"
        />
        <KpiCard
          title="Clientes activos"
          value={String(metrics.clientesTotal)}
          subtitle="Base comercial disponible"
          icon={Users}
          tone="bg-slate-100 text-slate-700"
        />
        <KpiCard
          title="Valor inventario"
          value={formatMoney(metrics.valorInventario, "S/")}
          subtitle="Segun Kardex/productos internos"
          icon={Warehouse}
          tone="bg-cyan-50 text-cyan-700"
        />
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cotizaciones por estado</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {estadoResumen.map((estado) => (
              <button
                type="button"
                key={estado.id}
                onClick={() => navigate(`/cotizaciones?estado=${estado.id}`)}
                className={`rounded-lg px-3 py-2 text-left text-xs font-semibold ${estado.color}`}
              >
                <span className="block text-lg">{estado.total}</span>
                {estado.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Requiere atencion</h2>
            <p className="text-xs text-gray-500">OC pendientes, stock bajo, cotizaciones sin avance y modificaciones pendientes.</p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {actionAlerts.length} alertas
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {actionAlerts.length ? actionAlerts.map((alert) => (
            <button
              key={alert.key}
              type="button"
              onClick={alert.action}
              className={`rounded-lg border p-3 text-left transition hover:shadow-sm ${alert.tone}`}
            >
              <p className="text-sm font-bold">{alert.title}</p>
              <p className="mt-1 text-xs opacity-80">{alert.detail}</p>
            </button>
          )) : (
            <div className="md:col-span-2 xl:col-span-4">
              <EmptyPanel message="No hay alertas accionables para este periodo." />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-gray-200">
        {tabItems.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold ${
                active
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12 text-sm text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Cargando dashboard...
        </div>
      ) : (
        <>
          {activeTab === "ventas" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:col-span-2">
                  <div className="mb-4">
                    <h2 className="text-base font-bold text-gray-900">Cotizado, aprobado y venta efectuada</h2>
                    <p className="text-xs text-gray-500">La venta solo cuenta con OC registrada y atendida.</p>
                  </div>
                  {chartData.length ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="mes" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatMoney(Number(value), "S/")} />
                        <Bar dataKey="cotizado" fill="#2563eb" name="Cotizado" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="aprobado" fill="#10b981" name="Aprobado" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="venta" fill="#7c3aed" name="Venta efectuada" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyPanel message="No hay cotizaciones para graficar." />
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <h2 className="text-base font-bold text-gray-900">Cotizaciones recientes</h2>
                  <div className="mt-3 space-y-2">
                    {recientesCotizaciones.length ? recientesCotizaciones.map((cotizacion) => (
                      <button
                        type="button"
                        key={cotizacion.id}
                        onClick={() => navigate(`/cotizaciones/${cotizacion.id}/view`)}
                        className="w-full rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{cotizacion.numero}</p>
                            <p className="text-xs text-gray-500">{cotizacion.cliente_nombre || cotizacion.titulo}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${ESTADO_BY_KEY.get(estadoKey(cotizacion) || "borrador")?.color || "bg-gray-100 text-gray-700"}`}>
                            {ESTADO_BY_KEY.get(estadoKey(cotizacion) || "borrador")?.label || "Estado"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-bold text-gray-800">{formatMoney(toNumber(cotizacion.total), "S/")}</p>
                      </button>
                    )) : <EmptyPanel message="No hay cotizaciones recientes." />}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Cotizaciones por plataforma</h2>
                    <p className="text-xs text-gray-500">Cantidad por canal del periodo seleccionado.</p>
                  </div>
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                    {plataformaMetrics.length} plataformas
                  </span>
                </div>

                {plataformaMetrics.length ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {plataformaMetrics.map((plataforma) => (
                      <div
                        key={plataforma.id}
                        className="rounded-lg border border-gray-100 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-gray-900">{plataforma.nombre}</p>
                            <p className="text-xs text-gray-500">
                              {plataforma.aprobadas} aprobadas · {plataforma.ocRegistradas} con OC
                            </p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-cyan-50 px-2.5 py-1 text-lg font-bold text-cyan-700">
                            {plataforma.cotizaciones}
                          </span>
                        </div>
                        <p className="mt-3 text-xs font-semibold text-gray-600">
                          Monto cotizado: {formatMoney(plataforma.montoCotizado, "S/")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3">
                    <EmptyPanel message="No hay cotizaciones por plataforma en este periodo." />
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Metricas por ejecutivo</h2>
                    <p className="text-xs text-gray-500">Cotizado, aprobado, venta efectuada y conversion real del periodo.</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {ejecutivoMetrics.length} ejecutivos
                  </span>
                </div>

                {ejecutivoMetrics.length ? (
                  <>
                  <div className="mt-3 grid gap-3 md:hidden">
                    {ejecutivoMetrics.map((row) => (
                      <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-gray-900">{row.nombre}</p>
                            <p className="mt-1 text-xs text-gray-500">{row.cotizadas} cotizadas</p>
                          </div>
                          <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                            {row.conversion.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="font-semibold uppercase text-gray-400">Monto cotizado</p>
                            <p className="mt-1 font-bold text-gray-800">{formatMoney(row.montoCotizado, "S/")}</p>
                          </div>
                          <div>
                            <p className="font-semibold uppercase text-gray-400">Aprobadas</p>
                            <p className="mt-1 font-bold text-gray-800">{row.aprobadas} <span className="text-gray-500">{formatMoney(row.montoAprobado, "S/")}</span></p>
                          </div>
                          <div className="col-span-2 rounded-xl bg-emerald-50 px-3 py-2">
                            <p className="font-semibold uppercase text-emerald-700">Venta efectuada</p>
                            <p className="mt-1 font-bold text-emerald-800">{row.ventas} - {formatMoney(row.montoVenta, "S/")}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Ejecutivo</th>
                          <th className="px-3 py-2 text-right">Cotizadas</th>
                          <th className="px-3 py-2 text-right">Monto cotizado</th>
                          <th className="px-3 py-2 text-right">Aprobadas</th>
                          <th className="px-3 py-2 text-right">Venta efectuada</th>
                          <th className="px-3 py-2 text-right">Conversion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ejecutivoMetrics.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-3 py-3 font-semibold text-gray-900">{row.nombre}</td>
                            <td className="px-3 py-3 text-right text-gray-700">{row.cotizadas}</td>
                            <td className="px-3 py-3 text-right font-semibold text-gray-800">{formatMoney(row.montoCotizado, "S/")}</td>
                            <td className="px-3 py-3 text-right text-gray-700">
                              {row.aprobadas}
                              <span className="ml-2 text-xs text-gray-400">{formatMoney(row.montoAprobado, "S/")}</span>
                            </td>
                            <td className="px-3 py-3 text-right text-gray-700">
                              {row.ventas}
                              <span className="ml-2 font-semibold text-emerald-700">{formatMoney(row.montoVenta, "S/")}</span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                                {row.conversion.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </>
                ) : (
                  <div className="mt-3">
                    <EmptyPanel message="No hay informacion de ejecutivos para este periodo." />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Top clientes por venta real</h2>
                      <p className="text-xs text-gray-500">Solo OC recibidas con estado atendido.</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {topClientes.length} clientes
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {topClientes.length ? topClientes.map((cliente, index) => (
                      <div
                        key={cliente.key}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-700">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{cliente.nombre}</p>
                            <p className="text-xs text-gray-500">
                              {cliente.ventas} venta{cliente.ventas === 1 ? "" : "s"}
                              {cliente.ultimaVenta ? ` · Ultima ${formatDate(cliente.ultimaVenta)}` : ""}
                            </p>
                          </div>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-emerald-700">
                          {formatMoney(cliente.monto, "S/")}
                        </p>
                      </div>
                    )) : <EmptyPanel message="No hay ventas reales para ranking de clientes." />}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Aprobadas sin OC</h2>
                      <p className="text-xs text-gray-500">Cotizaciones listas que aun no se convierten en venta.</p>
                    </div>
                    <span className="rounded-full bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-700">
                      {approvedWithoutOc.length} pendientes
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {approvedWithoutOc.length ? approvedWithoutOc.map((cotizacion) => (
                      <button
                        type="button"
                        key={cotizacion.id}
                        onClick={() => navigate(`/cotizaciones/${cotizacion.id}/view`)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{cotizacion.numero}</p>
                          <p className="truncate text-xs text-gray-500">{cotizacion.cliente_nombre || cotizacion.titulo}</p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-gray-800">{formatMoney(toNumber(cotizacion.total), "S/")}</p>
                      </button>
                    )) : <EmptyPanel message="No hay cotizaciones aprobadas pendientes de OC." />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "inventario" && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-bold text-gray-900">Productos con bajo disponible</h2>
                <div className="mt-3 space-y-2">
                  {lowStock.length ? lowStock.map((producto) => {
                    const disponible = toNumber(producto.stock_disponible ?? producto.stock);
                    const reservado = toNumber(producto.stock_reservado);
                    return (
                      <button
                        type="button"
                        key={producto.id}
                        onClick={() => navigate("/productos")}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{producto.nombre}</p>
                          <p className="text-xs text-gray-500">{producto.sku || producto.codigo || "Sin codigo"}</p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="font-bold text-amber-700">Disp. {disponible}</p>
                          <p className="text-gray-500">Reserv. {reservado}</p>
                        </div>
                      </button>
                    );
                  }) : <EmptyPanel message="No hay productos en alerta de stock." />}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-bold text-gray-900">Ultimos movimientos Kardex</h2>
                <div className="mt-3 space-y-2">
                  {data.movimientos.length ? data.movimientos.map((movimiento) => (
                    <button
                      type="button"
                      key={movimiento.id}
                      onClick={() => navigate("/inventario/movimientos")}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{movimiento.producto?.nombre || `Producto #${movimiento.producto_id}`}</p>
                        <p className="text-xs text-gray-500">{movimiento.tipo_movimiento} · {formatDate(movimiento.created_at)}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-800">{toNumber(movimiento.cantidad)}</p>
                    </button>
                  )) : <EmptyPanel message="No hay movimientos recientes o no tienes permisos para ver Kardex." />}
                </div>
              </div>
            </div>
          )}

          {activeTab === "operacion" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Antiguedad de OC pendientes</h2>
                    <p className="text-xs text-gray-500">Ordenadas por mas dias sin atencion completa.</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                    <Clock className="h-3.5 w-3.5" />
                    {oldestPendingOrders.length} en seguimiento
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {oldestPendingOrders.length ? oldestPendingOrders.map((oc) => (
                    <button
                      type="button"
                      key={`${oc.tipo}-${oc.id}`}
                      onClick={() => navigate(oc.route)}
                      className="rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{oc.numero}</p>
                          <p className="truncate text-xs text-gray-500">{oc.tipo} · {oc.detalle}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${
                          oc.dias >= 7 ? "bg-red-50 text-red-700" : oc.dias >= 3 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"
                        }`}>
                          {oc.dias} d
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold uppercase text-gray-500">{oc.estado}</p>
                    </button>
                  )) : (
                    <div className="md:col-span-2 xl:col-span-4">
                      <EmptyPanel message="No hay OC pendientes para seguimiento." />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-bold text-gray-900">OC recibidas pendientes</h2>
                <div className="mt-3 space-y-2">
                  {ocRecibidasPendientes.length ? ocRecibidasPendientes.map((oc) => (
                    <button
                      type="button"
                      key={oc.id}
                      onClick={() => navigate(`/ordenes-compra/recibidas/${oc.id}`)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{oc.numero || `OC recibida #${oc.id}`}</p>
                        <p className="text-xs text-gray-500">{oc.cotizacion?.cliente_nombre || oc.cotizacion?.cliente?.nombre || "Sin cliente"}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{oc.estado}</span>
                    </button>
                  )) : <EmptyPanel message="No hay OC recibidas pendientes." />}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-bold text-gray-900">OC emitidas pendientes</h2>
                <div className="mt-3 space-y-2">
                  {ocEmitidasPendientes.length ? ocEmitidasPendientes.map((oc) => (
                    <button
                      type="button"
                      key={oc.id}
                      onClick={() => navigate(`/ordenes-compra/emitidas/${oc.id}`)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{oc.numero || `OC emitida #${oc.id}`}</p>
                        <p className="text-xs text-gray-500">{oc.proveedor || "Sin proveedor"}</p>
                      </div>
                      <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">{oc.estado}</span>
                    </button>
                  )) : <EmptyPanel message="No hay OC emitidas pendientes." />}
                </div>
              </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
