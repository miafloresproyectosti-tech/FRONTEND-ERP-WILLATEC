import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileUp,
  LockOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

import { useAuth } from "../AuthContext";
import { useNotifications } from "../NotificationContext";
import { OportunidadDetailDrawer } from "../components/licitaciones/OportunidadDetailDrawer";
import { OportunidadFormModal } from "../components/licitaciones/OportunidadFormModal";
import { EstadoBadge, TipoBadge, VigenciaBadge } from "../components/licitaciones/OportunidadBadges";
import PageSizeSelect from "../components/ui/PageSizeSelect";
import {
  CATEGORIAS_OPORTUNIDAD,
  ESTADOS_CIERRE,
  FORMAS_PAGO,
  MOTIVOS_NO_CONTINUAR,
  MOTIVOS_PERDIDA,
  MOTIVOS_VENCIMIENTO,
  OPORTUNIDAD_ESTADOS,
  OPORTUNIDAD_TIPOS,
} from "../constants/licitaciones";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import {
  addComentarioOportunidad,
  addCotizacionRelacionada,
  deleteOportunidad,
  getOportunidades,
  saveOportunidad,
} from "../services/licitaciones.service";
import { getUsers } from "../services/usuario.service";
import type {
  EjecutivoAsignado,
  Oportunidad,
  OportunidadEstado,
  OportunidadFilters,
  OportunidadFormData,
  OportunidadSortKey,
  SortDirection,
} from "../types/licitaciones";
import { exportExcelFile } from "../utils/exportExcel";
import { getPaginationItems } from "../utils/pagination";
import { normalizeRole } from "../utils/permissions";
import {
  createId,
  fileToOpportunityFile,
  formatDateTime,
  formatRemainingTime,
  getVigenciaAlert,
  isClosedOpportunity,
  normalizeText,
} from "../utils/licitaciones";

const DEFAULT_FILTERS: OportunidadFilters = {
  tipo: "todos",
  empresa: "",
  ejecutivo: "todos",
  estado: "todos",
  categoria: "todos",
  vigenciaDesde: "",
  vigenciaHasta: "",
  requerimiento: "",
  search: "",
};

const SORT_LABELS: Record<OportunidadSortKey, string> = {
  empresa: "Empresa",
  vigencia: "Vigencia",
  estado: "Estado",
  ejecutivo: "Ejecutivo",
  creadoEn: "Fecha de creacion",
};

const SUMMARY_ITEMS: Array<{ key: string; label: string; className: string }> = [
  { key: "total", label: "Total de oportunidades", className: "border-slate-200" },
  { key: "sin_atender", label: "Sin atender", className: "border-slate-200" },
  { key: "en_atencion", label: "En atencion", className: "border-sky-200" },
  { key: "atendido", label: "Atendidas", className: "border-teal-200" },
  { key: "cotizacion_generada", label: "Cotizaciones generadas", className: "border-indigo-200" },
  { key: "ganada", label: "Ganadas", className: "border-emerald-200" },
  { key: "perdida", label: "Perdidas", className: "border-rose-200" },
  { key: "no_se_realizara", label: "No se realizara", className: "border-amber-200" },
  { key: "vencida", label: "Vencidas", className: "border-red-200" },
  { key: "proximas", label: "Proximas a vencer", className: "border-orange-200" },
];

const TYPE_TABS = [
  { key: "todos", label: "Todos", description: "Todo el portafolio" },
  { key: "licitacion", label: "Licitaciones", description: "Concursos públicos" },
  { key: "privado", label: "Privados", description: "Oportunidades cerradas" },
  { key: "wherex", label: "WHEREX", description: "Canal digital" },
] as const;

const SALES_BANDEJAS = [
  { key: "disponibles", label: "Oportunidades Disponibles" },
  { key: "mis", label: "Mis Oportunidades" },
] as const;

const SUPERADMIN_BANDEJAS = [
  { key: "disponibles", label: "Oportunidades Disponibles" },
  { key: "en_atencion", label: "Oportunidades en Atencion" },
  { key: "finalizadas", label: "Oportunidades Finalizadas" },
] as const;

export default function SeguimientoLicitaciones() {
  const { user } = useAuth();
  const { addNotification, showToast } = useNotifications();

  const [opportunities, setOpportunities] = useState<Oportunidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<OportunidadFilters>(DEFAULT_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search, 250);
  const [sortKey, setSortKey] = useState<OportunidadSortKey>("vigencia");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Oportunidad | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ejecutivos, setEjecutivos] = useState<EjecutivoAsignado[]>([]);
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<Oportunidad | null>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [releaseError, setReleaseError] = useState("");
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [lossTarget, setLossTarget] = useState<Oportunidad | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [lossObservations, setLossObservations] = useState("");
  const [lossFile, setLossFile] = useState<File | null>(null);
  const [lossError, setLossError] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const userName = user?.name || "Usuario";
  const currentRole = normalizeRole(user?.role);
  const roleLabel =
    currentRole === "SUPERADMIN"
      ? "Superadmin"
      : currentRole === "ADMIN"
        ? "Admin"
        : currentRole === "LICITACIONES"
          ? "Licitaciones"
          : currentRole === "VENTAS"
            ? "Ventas"
            : currentRole;
  const isManager = currentRole === "SUPERADMIN" || currentRole === "ADMIN" || currentRole === "LICITACIONES";
  const isSalesRole = currentRole === "VENTAS";
  const canCreateOpportunity = currentRole === "LICITACIONES";
  const canEditOpportunity = currentRole === "LICITACIONES" || currentRole === "SUPERADMIN" || currentRole === "ADMIN";
  const canDeleteOpportunity = currentRole === "SUPERADMIN" || currentRole === "ADMIN" || currentRole === "LICITACIONES";
  const [activeBandeja, setActiveBandeja] = useState<string>(
    currentRole === "VENTAS" ? "disponibles" : currentRole === "SUPERADMIN" ? "disponibles" : "todas"
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [items, users] = await Promise.all([
        getOportunidades(),
        getUsers().catch(() => []),
      ]);

      const mappedUsers = users
        .filter((item) => item.activo !== false)
        .map((item) => ({
          id: item.id,
          nombre: `${item.nombres || ""} ${item.apellidos || ""}`.trim() || item.email,
          email: item.email,
        }));

      setEjecutivos(
        mappedUsers.length > 0
          ? mappedUsers
          : [
              { id: user?.id || 1, nombre: userName, email: user?.email },
              { id: 2, nombre: "Maria Ventas", email: "maria@willatec.com" },
              { id: 3, nombre: "Supervisor Comercial", email: "supervisor@willatec.com" },
            ]
      );
      setOpportunities(items);
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.id, userName]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void getOportunidades().then(setOpportunities);
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const isAvailableOpportunity = useCallback((item: Oportunidad) => {
    const executiveId = Number(item.asignadoA ?? item.ejecutivo?.id ?? 0);
    return item.estado === "sin_atender" && executiveId === 0;
  }, []);

  const isMyOpportunity = useCallback((item: Oportunidad) => {
    if (!user?.id) return false;
    return Number(item.asignadoA ?? item.ejecutivo?.id ?? 0) === user.id;
  }, [user?.id]);

  const isAttentionOpportunity = useCallback((item: Oportunidad) => (
    item.estado === "en_atencion" || item.estado === "atendido" || item.estado === "cotizacion_generada"
  ), []);

  const scopedOpportunities = useMemo(() => {
    if (isSalesRole) {
      if (activeBandeja === "mis") return opportunities.filter(isMyOpportunity);
      return opportunities.filter(isAvailableOpportunity);
    }

    if (currentRole === "SUPERADMIN") {
      if (activeBandeja === "disponibles") return opportunities.filter(isAvailableOpportunity);
      if (activeBandeja === "en_atencion") return opportunities.filter(isAttentionOpportunity);
      if (activeBandeja === "finalizadas") return opportunities.filter((item) => isClosedOpportunity(item.estado));
      return opportunities;
    }

    if (isManager) return opportunities;

    return opportunities.filter((item) => {
      const executiveId = Number(item.ejecutivo?.id ?? 0);
      const hasNoExecutive = !item.ejecutivo?.id || executiveId === 0 || item.ejecutivo?.nombre === "Sin ejecutivo";

      return hasNoExecutive || executiveId === user?.id;
    });
  }, [activeBandeja, currentRole, isAttentionOpportunity, isAvailableOpportunity, isManager, isMyOpportunity, isSalesRole, opportunities, user?.id]);

  const filteredOpportunities = useMemo(() => {
    const search = normalizeText(debouncedSearch);

    return scopedOpportunities
      .filter((item) => filters.tipo === "todos" || item.tipo === filters.tipo)
      .filter((item) => filters.estado === "todos" || item.estado === filters.estado)
      .filter((item) => filters.ejecutivo === "todos" || String(item.ejecutivo.id) === filters.ejecutivo)
      .filter((item) => filters.categoria === "todos" || item.categoria === filters.categoria)
      .filter((item) => !filters.empresa || normalizeText(item.empresa).includes(normalizeText(filters.empresa)))
      .filter((item) => !filters.requerimiento || normalizeText(item.requerimiento).includes(normalizeText(filters.requerimiento)))
      .filter((item) => !filters.vigenciaDesde || item.vigencia >= filters.vigenciaDesde)
      .filter((item) => !filters.vigenciaHasta || item.vigencia <= filters.vigenciaHasta)
      .filter((item) => {
        if (!search) return true;
        return normalizeText(`${item.empresa} ${item.requerimiento}`).includes(search);
      })
      .sort((a, b) => {
        const direction = sortDirection === "asc" ? 1 : -1;
        const values: Record<OportunidadSortKey, [string | number, string | number]> = {
          empresa: [a.empresa, b.empresa],
          vigencia: [new Date(a.vigencia).getTime(), new Date(b.vigencia).getTime()],
          estado: [OPORTUNIDAD_ESTADOS[a.estado], OPORTUNIDAD_ESTADOS[b.estado]],
          ejecutivo: [a.ejecutivo.nombre, b.ejecutivo.nombre],
          creadoEn: [new Date(a.creadoEn).getTime(), new Date(b.creadoEn).getTime()],
        };
        const [first, second] = values[sortKey];
        return String(first).localeCompare(String(second), "es", { numeric: true }) * direction;
      });
  }, [debouncedSearch, filters, scopedOpportunities, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredOpportunities.length / itemsPerPage));
  const paginationItems = getPaginationItems(currentPage, totalPages);
  const paginated = filteredOpportunities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const selected = opportunities.find((item) => item.id === selectedId) || null;

  const summary = useMemo(() => {
    const result: Record<string, number> = { total: scopedOpportunities.length, proximas: 0 };
    Object.keys(OPORTUNIDAD_ESTADOS).forEach((key) => {
      result[key] = 0;
    });

    scopedOpportunities.forEach((item) => {
      result[item.estado] += 1;
      const remaining = new Date(item.vigencia).getTime() - Date.now();
      if (remaining > 0 && remaining <= 3 * 24 * 60 * 60 * 1000) {
        result.proximas += 1;
      }
    });

    return result;
  }, [scopedOpportunities]);

  const typeSummary = useMemo(() => {
    const result = { todos: scopedOpportunities.length, licitacion: 0, privado: 0, wherex: 0 };
    scopedOpportunities.forEach((item) => {
      if (item.tipo in result) {
        result[item.tipo as keyof typeof result] += 1;
      }
    });
    return result;
  }, [scopedOpportunities]);

  const updateFilter = <K extends keyof OportunidadFilters>(key: K, value: OportunidadFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setCurrentPage(1);
  };

  const handleAssignToMe = async (opportunity: Oportunidad) => {
    if (!user?.id || !isAvailableOpportunity(opportunity)) return;

    const now = new Date().toISOString();
    const next: Oportunidad = {
      ...opportunity,
      ejecutivo: {
        id: user.id,
        nombre: userName,
        email: user.email,
      },
      asignadoA: user.id,
      asignadoEn: now,
      asignadoPor: userName,
      esNueva: false,
      estado: "en_atencion",
      modificadoEn: now,
      modificadoPor: userName,
      historial: [
        {
          id: createId("hist"),
          fecha: now,
          usuario: userName,
          tipo: "responsable",
          descripcion: `Oportunidad asignada a ${userName}.`,
        },
        ...opportunity.historial,
      ],
    };

    await saveOportunidad(next);
    const reminder = `Recuerda que tienes una cotización pendiente y se vence ${formatDateTime(next.vigencia)}.`;
    addNotification({
      title: "Cotización pendiente",
      description: reminder,
      type: "warning",
      icon: "UserCheck",
      route: "/seguimiento-licitaciones",
      targetUserId: next.ejecutivo.id,
    });
    addNotification({
      title: "Oportunidad asignada",
      description: `${userName} se asigno la oportunidad "${next.requerimiento} - ${next.empresa}".`,
      type: "info",
      icon: "UserCheck",
      route: "/seguimiento-licitaciones",
      targetRole: "SUPERADMIN",
    });
    await loadData();
    showToast({ title: "Oportunidad asignada", description: reminder, type: "warning" });
  };

  const handleSave = async (data: OportunidadFormData) => {
    const now = new Date().toISOString();
    const previous = editing;
    const hasEstadoChange = previous && previous.estado !== data.estado;
    const estado = previous ? data.estado : "sin_atender";

    const next: Oportunidad = {
      id: previous?.id || createId("op"),
      tipo: data.tipo,
      empresa: data.empresa.trim(),
      requerimiento: data.requerimiento.trim(),
      vigencia: new Date(data.vigencia).toISOString(),
      ejecutivo: previous?.ejecutivo || { id: 0, nombre: "Sin ejecutivo" },
      asignadoA: previous?.asignadoA ?? null,
      asignadoEn: previous?.asignadoEn ?? null,
      asignadoPor: previous?.asignadoPor ?? null,
      esNueva: previous?.esNueva ?? true,
      categoria: data.categoria,
      estado,
      observacion: data.observacion.trim(),
      creadoEn: previous?.creadoEn || now,
      creadoPor: previous?.creadoPor || userName,
      modificadoEn: previous ? now : undefined,
      modificadoPor: previous ? userName : undefined,
      garantia: data.tipo === "licitacion" ? data.garantia.trim() : undefined,
      plazo: data.tipo === "licitacion" ? data.plazo.trim() : undefined,
      carpetaServidor: data.tipo === "licitacion" ? data.carpetaServidor.trim() : undefined,
      tdr: data.tipo === "licitacion" ? data.tdr : undefined,
      formaPago: data.tipo !== "licitacion" && data.formaPago ? data.formaPago : undefined,
      destinoEntrega: data.tipo === "privado" ? data.destinoEntrega.trim() : undefined,
      wherexId: data.tipo === "wherex" ? data.wherexId.trim() : undefined,
      wherexUrl: data.tipo === "wherex" ? data.wherexUrl.trim() : undefined,
      comentariosGenerales: data.tipo === "wherex" ? data.comentariosGenerales.trim() : undefined,
      cotizacionId: data.cotizacionId || previous?.cotizacionId,
      cotizacionNumero: data.cotizacionNumero || previous?.cotizacionNumero,
      comentarios: previous?.comentarios || [],
      archivos: previous?.archivos || [],
      cotizaciones: previous?.cotizaciones || [],
      historial: [
        ...(hasEstadoChange
          ? [{
              id: createId("hist"),
              fecha: now,
              usuario: userName,
              tipo: "estado" as const,
              descripcion: `Estado cambiado de ${OPORTUNIDAD_ESTADOS[previous.estado]} a ${OPORTUNIDAD_ESTADOS[estado]}.`,
            }]
          : []),
        {
          id: createId("hist"),
          fecha: now,
          usuario: userName,
          tipo: previous ? "estado" : "creacion",
          descripcion: previous ? "Oportunidad actualizada." : "Oportunidad creada y publicada en disponibles.",
        },
        ...(previous?.historial || []),
      ],
    };

    await saveOportunidad(next);
    if (!previous) {
      const description = `Se ha registrado una nueva oportunidad de tipo ${OPORTUNIDAD_TIPOS[next.tipo]}. Revisala y asignatela si deseas gestionarla.`;
      addNotification({
        title: "Nueva oportunidad disponible",
        description,
        type: "info",
        icon: "MessageCircle",
        route: "/seguimiento-licitaciones",
        targetRole: "VENTAS",
      });
      addNotification({
        title: "Nueva oportunidad disponible",
        description: `${description} Empresa: ${next.empresa}.`,
        type: "info",
        icon: "MessageCircle",
        route: "/seguimiento-licitaciones",
        targetRole: "SUPERADMIN",
      });
    }
    setModalOpen(false);
    setEditing(null);
    await loadData();
    showToast({ title: "Oportunidad guardada", description: "El seguimiento fue actualizado.", type: "success" });
  };

  const requestCloseReason = (estado: OportunidadEstado) => {
    if (!ESTADOS_CIERRE.includes(estado)) return "";
    const examples = estado === "vencida" ? MOTIVOS_VENCIMIENTO : MOTIVOS_NO_CONTINUAR;
    return window.prompt(`Motivo obligatorio:\n${examples.join("\n")}`)?.trim() || "";
  };

  const changeEstado = async (item: Oportunidad, estado: OportunidadEstado) => {
    if (isClosedOpportunity(item.estado)) return;

    if (estado === "perdida") {
      setLossTarget(item);
      setLossReason("");
      setLossObservations("");
      setLossFile(null);
      setLossError("");
      setLossModalOpen(true);
      return;
    }

    const motivo = requestCloseReason(estado);
    if (ESTADOS_CIERRE.includes(estado) && !motivo) {
      showToast({ title: "Motivo requerido", description: "Debe registrar un motivo para cerrar la oportunidad.", type: "warning" });
      return;
    }

    const now = new Date().toISOString();
    await saveOportunidad({
      ...item,
      estado,
      motivoCierre: ESTADOS_CIERRE.includes(estado) ? motivo : item.motivoCierre,
      comentarioCierre: estado === "no_se_realizara" ? motivo : item.comentarioCierre,
      modificadoEn: now,
      modificadoPor: userName,
      historial: [
        {
          id: createId("hist"),
          fecha: now,
          usuario: userName,
          tipo: ESTADOS_CIERRE.includes(estado) ? "cierre" : "estado",
          descripcion: `Estado cambiado a ${OPORTUNIDAD_ESTADOS[estado]}${motivo ? `: ${motivo}` : ""}.`,
        },
        ...item.historial,
      ],
    });
    await loadData();
  };

  const submitLoss = async () => {
    if (!lossTarget) return;
    const trimmedReason = lossReason.trim();
    if (!trimmedReason) {
      setLossError("El motivo de la pérdida es obligatorio.");
      return;
    }

    const now = new Date().toISOString();
    const attachedDocument = lossFile ? await fileToOpportunityFile(lossFile, userName) : undefined;
    const observations = lossObservations.trim();
    const lessons = [trimmedReason, observations].filter(Boolean);

    await saveOportunidad({
      ...lossTarget,
      estado: "perdida",
      motivoCierre: trimmedReason,
      comentarioCierre: observations || trimmedReason,
      perdidaInfo: {
        motivo: trimmedReason,
        observacionesCliente: observations || undefined,
        documento: attachedDocument,
        fecha: now,
        usuario: userName,
      },
      leccionesAprendidas: lessons.length > 0 ? lessons : lossTarget.leccionesAprendidas,
      modificadoEn: now,
      modificadoPor: userName,
      historial: [
        {
          id: createId("hist"),
          fecha: now,
          usuario: userName,
          tipo: "cierre",
          descripcion: `Oportunidad marcada como perdida. Motivo: ${trimmedReason}${observations ? `. Observaciones: ${observations}` : ""}`,
        },
        ...lossTarget.historial,
      ],
    });

    setLossModalOpen(false);
    setLossTarget(null);
    setLossReason("");
    setLossObservations("");
    setLossFile(null);
    setLossError("");
    await loadData();
    showToast({ title: "Oportunidad perdida", description: "Se registró el motivo y las observaciones de la pérdida.", type: "success" });
  };

  const handleDelete = async (item: Oportunidad) => {
    if (isClosedOpportunity(item.estado)) return;
    if (!window.confirm(`Eliminar la oportunidad de ${item.empresa}?`)) return;
    await deleteOportunidad(item.id);
    await loadData();
    showToast({ title: "Oportunidad eliminada", type: "success" });
  };

  const handleAddComment = async (comment: string) => {
    if (!selected) return;
    await addComentarioOportunidad(selected.id, {
      id: createId("comment"),
      usuario: userName,
      fecha: new Date().toISOString(),
      comentario: comment,
    });
    await loadData();
  };

  const handleGenerateQuote = async () => {
    if (!selected) return;
    const cotizacion = await addCotizacionRelacionada(selected.id, userName);
    await loadData();
    showToast({
      title: "Cotizacion generada",
      description: `${cotizacion.numero} fue vinculada a la oportunidad.`,
      type: "success",
    });
  };

  const handleMarkQuoteDone = async () => {
    if (!selected || !canReleaseOpportunity(selected) || isClosedOpportunity(selected.estado)) return;
    const now = new Date().toISOString();
    await saveOportunidad({
      ...selected,
      estado: "atendido",
      modificadoEn: now,
      modificadoPor: userName,
      historial: [
        {
          id: createId("hist"),
          fecha: now,
          usuario: userName,
          tipo: "estado",
          descripcion: "Cotizacion marcada como realizada.",
        },
        ...selected.historial,
      ],
    });
    await loadData();
    showToast({ title: "Cotizacion realizada", description: "La oportunidad quedo marcada como atendida.", type: "success" });
  };

  const canReleaseOpportunity = (item: Oportunidad) => {
    if (!user?.id) return false;
    if (currentRole === "SUPERADMIN") return true;
    return Number(item.asignadoA ?? item.ejecutivo?.id ?? 0) === user.id;
  };

  const openReleaseModal = (item: Oportunidad) => {
    if (!canReleaseOpportunity(item)) {
      showToast({ title: "No autorizado", description: "Solo el ejecutivo asignado o el superadmin puede liberar la cotización.", type: "warning" });
      return;
    }

    setReleaseTarget(item);
    setReleaseReason("");
    setReleaseError("");
    setReleaseModalOpen(true);
  };

  const handleReleaseQuote = async (item: Oportunidad, reason: string) => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReleaseError("Escribe el motivo para liberar la oportunidad.");
      return;
    }

    const now = new Date().toISOString();
    await saveOportunidad({
      ...item,
      ejecutivo: { id: 0, nombre: "Sin ejecutivo" },
      asignadoA: null,
      asignadoEn: null,
      asignadoPor: null,
      esNueva: false,
      estado: "sin_atender",
      motivoCierre: trimmed,
      comentarioCierre: trimmed,
      modificadoEn: now,
      modificadoPor: userName,
      historial: [
        {
          id: createId("hist"),
          fecha: now,
          usuario: userName,
          tipo: "cierre",
          descripcion: `Oportunidad liberada: ${trimmed}`,
        },
        ...item.historial,
      ],
    });
    setReleaseModalOpen(false);
    setReleaseTarget(null);
    setReleaseReason("");
    setReleaseError("");
    await loadData();
    showToast({ title: "Cotización liberada", description: "La oportunidad volvió a estar disponible para asignarse.", type: "success" });
  };

  const exportRows = filteredOpportunities.map((item) => ({
    tipo: OPORTUNIDAD_TIPOS[item.tipo],
    empresa: item.empresa,
    requerimiento: item.requerimiento,
    ejecutivo: item.ejecutivo.nombre,
    categoria: item.categoria,
    estado: OPORTUNIDAD_ESTADOS[item.estado],
    vigencia: formatDateTime(item.vigencia),
    tiempo_restante: formatRemainingTime(item.vigencia),
  }));

  const handleExportExcel = async () => {
    await exportExcelFile({
      filename: "seguimiento-licitaciones.xlsx",
      title: "Seguimiento de Licitaciones",
      columns: [
        { header: "Tipo", key: "tipo", width: 18 },
        { header: "Empresa", key: "empresa", width: 28 },
        { header: "Requerimiento", key: "requerimiento", width: 42 },
        { header: "Ejecutivo", key: "ejecutivo", width: 24 },
        { header: "Categoria", key: "categoria", width: 20 },
        { header: "Estado", key: "estado", width: 22 },
        { header: "Vigencia", key: "vigencia", width: 22 },
        { header: "Tiempo restante", key: "tiempo_restante", width: 18 },
      ],
      rows: exportRows,
    });
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Seguimiento de Licitaciones", 14, 16);
    (doc as unknown as { autoTable: (options: object) => void }).autoTable({
      startY: 22,
      head: [["Tipo", "Empresa", "Requerimiento", "Ejecutivo", "Categoria", "Estado", "Vigencia", "Tiempo"]],
      body: exportRows.map((row) => [
        row.tipo,
        row.empresa,
        row.requerimiento,
        row.ejecutivo,
        row.categoria,
        row.estado,
        row.vigencia,
        row.tiempo_restante,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save("seguimiento-licitaciones.pdf");
  };

  const handleImportExcel = async (file?: File) => {
    if (!file) return;
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    const now = new Date().toISOString();
    const imported: Oportunidad[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const empresa = String(row.getCell(1).value || "").trim();
      const requerimiento = String(row.getCell(2).value || "").trim();
      if (!empresa || !requerimiento) return;

      imported.push({
        id: createId("imp"),
        tipo: "privado",
        empresa,
        requerimiento,
        vigencia: new Date(row.getCell(3).value?.toString() || Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        ejecutivo: { id: 0, nombre: "Sin ejecutivo" },
        asignadoA: null,
        asignadoEn: null,
        asignadoPor: null,
        esNueva: true,
        categoria: String(row.getCell(4).value || CATEGORIAS_OPORTUNIDAD[0]),
        estado: "sin_atender",
        observacion: "Importado desde Excel.",
        creadoEn: now,
        creadoPor: userName,
        formaPago: "credito_30",
        comentarios: [],
        archivos: [],
        cotizaciones: [],
        historial: [{
          id: createId("hist"),
          fecha: now,
          usuario: userName,
          tipo: "creacion",
          descripcion: "Oportunidad importada desde Excel.",
        }],
      });
    });

    for (const item of imported) {
      await saveOportunidad(item);
    }

    await loadData();
    showToast({ title: "Importacion completada", description: `${imported.length} registros importados.`, type: "success" });
    if (importInputRef.current) importInputRef.current.value = "";
  };

  const bandejas = currentRole === "VENTAS"
    ? SALES_BANDEJAS
    : currentRole === "SUPERADMIN"
      ? SUPERADMIN_BANDEJAS
      : [];

  const getBandejaCount = (key: string) => {
    if (key === "disponibles") return opportunities.filter(isAvailableOpportunity).length;
    if (key === "mis") return opportunities.filter(isMyOpportunity).length;
    if (key === "en_atencion") return opportunities.filter(isAttentionOpportunity).length;
    if (key === "finalizadas") return opportunities.filter((item) => isClosedOpportunity(item.estado)).length;
    return opportunities.length;
  };

  const sortButton = (key: OportunidadSortKey) => (
    <button
      type="button"
      onClick={() => {
        if (sortKey === key) {
          setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        } else {
          setSortKey(key);
          setSortDirection("asc");
        }
      }}
      className="inline-flex items-center gap-1 font-semibold hover:text-blue-600"
    >
      {SORT_LABELS[key]}
      {sortKey === key && <span>{sortDirection === "asc" ? "ASC" : "DESC"}</span>}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Seguimiento de Licitaciones</h1>
          </div>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Centraliza licitaciones, privados y WHEREX en un solo panel comercial con seguimiento visual para cada ejecutivo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreateOpportunity && (
            <button type="button" onClick={() => { setEditing(null); setModalOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
              <Plus size={18} />
              Nuevo
            </button>
          )}
          <button type="button" onClick={handleExportExcel} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
            <FileSpreadsheet size={18} />
            Excel
          </button>
          <button type="button" onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
            <FileDown size={18} />
            PDF
          </button>
          {canCreateOpportunity && (
            <>
              <button type="button" onClick={() => importInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                <FileUp size={18} />
                Importar
              </button>
              <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => void handleImportExcel(event.target.files?.[0])} />
            </>
          )}
        </div>
      </div>

      {bandejas.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {bandejas.map((bandeja) => {
            const active = activeBandeja === bandeja.key;
            return (
              <button
                key={bandeja.key}
                type="button"
                onClick={() => {
                  setActiveBandeja(bandeja.key);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                }`}
              >
                {bandeja.label}
                <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>
                  {getBandejaCount(bandeja.key)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">Canal comercial</p>
            <h2 className="mt-2 text-2xl font-semibold">Seguimiento comercial</h2>
            <p className="mt-2 text-sm text-blue-50">
              Filtra por licitaciones, privados o WHEREX y prioriza la cartera desde una vista más visual.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_TABS.map((tab) => {
              const active = filters.tipo === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => updateFilter("tipo", tab.key as OportunidadFilters["tipo"])}
                  className={`min-w-[140px] rounded-2xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-white/80 bg-white text-slate-900 shadow-lg"
                      : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <div className="text-sm font-semibold">{tab.label}</div>
                  <div className={`text-xs ${active ? "text-slate-600" : "text-blue-100"}`}>{tab.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TYPE_TABS.map((tab) => (
            <div key={tab.key} className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
              <p className="text-sm font-semibold text-blue-50">{tab.label}</p>
              <p className="mt-1 text-2xl font-bold">{typeSummary[tab.key as keyof typeof typeSummary]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {SUMMARY_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              if (item.key in OPORTUNIDAD_ESTADOS) {
                updateFilter("estado", item.key as OportunidadEstado);
              }
            }}
            className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-950 ${item.className}`}
          >
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{summary[item.key] || 0}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4 xl:grid-cols-8">
          <label className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Buscar empresa o requerimiento"
            />
          </label>
          <select value={filters.tipo} onChange={(event) => updateFilter("tipo", event.target.value as OportunidadFilters["tipo"])} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option value="todos">Todos los tipos</option>
            {Object.entries(OPORTUNIDAD_TIPOS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={filters.estado} onChange={(event) => updateFilter("estado", event.target.value as OportunidadFilters["estado"])} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option value="todos">Todos los estados</option>
            {Object.entries(OPORTUNIDAD_ESTADOS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={filters.ejecutivo} onChange={(event) => updateFilter("ejecutivo", event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option value="todos">Todos los ejecutivos</option>
            {ejecutivos.map((ejecutivo) => <option key={ejecutivo.id} value={ejecutivo.id}>{ejecutivo.nombre}</option>)}
          </select>
          <select value={filters.categoria} onChange={(event) => updateFilter("categoria", event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
            <option value="todos">Todas las categorias</option>
            {CATEGORIAS_OPORTUNIDAD.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
          </select>
          <input type="datetime-local" value={filters.vigenciaDesde} onChange={(event) => updateFilter("vigenciaDesde", event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" title="Vigencia desde" />
          <input type="datetime-local" value={filters.vigenciaHasta} onChange={(event) => updateFilter("vigenciaHasta", event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" title="Vigencia hasta" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <tr>
                <Th>Tipo</Th>
                <Th>{sortButton("empresa")}</Th>
                <Th>Requerimiento</Th>
                <Th>Categoria</Th>
                <Th>{sortButton("creadoEn")}</Th>
                <Th>{sortButton("estado")}</Th>
                <Th>{sortButton("vigencia")}</Th>
                <Th>Tiempo restante</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
                    <td colSpan={9} className="px-5 py-4">
                      <div className="h-8 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
                    </td>
                  </tr>
                ))
              ) : paginated.length > 0 ? (
                paginated.map((item) => {
                  const locked = isClosedOpportunity(item.estado);
                  const alert = getVigenciaAlert(item.vigencia);

                  return (
                    <tr key={item.id} className={`border-l-4 ${alert.rowClass} border-b border-slate-100 transition hover:bg-slate-50 dark:border-b-slate-800 dark:hover:bg-slate-900`}>
                      <Td><TipoBadge tipo={item.tipo} /></Td>
                      <Td><span className="font-semibold text-slate-900 dark:text-white">{item.empresa}</span></Td>
                      <Td><span className="block max-w-[260px] truncate text-slate-600 dark:text-slate-300" title={item.requerimiento}>{item.requerimiento}</span></Td>
                      <Td>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{item.categoria}</span>
                          {item.esNueva && isAvailableOpportunity(item) && (
                            <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-blue-200">
                              Nueva
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td>{formatDateTime(item.creadoEn)}</Td>
                      <Td>
                        {locked || isSalesRole ? (
                          <EstadoBadge estado={item.estado} />
                        ) : (
                          <select value={item.estado} onChange={(event) => void changeEstado(item, event.target.value as OportunidadEstado)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-950">
                            {Object.entries(OPORTUNIDAD_ESTADOS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        )}
                      </Td>
                      <Td>{formatDateTime(item.vigencia)}</Td>
                      <Td>
                        <div className="space-y-1">
                          <VigenciaBadge vigencia={item.vigencia} />
                          <p className={`text-xs font-semibold ${alert.textClass}`}>{formatRemainingTime(item.vigencia)}</p>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <IconButton title="Ver detalle" onClick={() => setSelectedId(item.id)}><Eye size={17} /></IconButton>
                          {isSalesRole && isAvailableOpportunity(item) && (
                            <button
                              type="button"
                              onClick={() => void handleAssignToMe(item)}
                              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Asignarme
                            </button>
                          )}
                          {canReleaseOpportunity(item) && item.estado === "en_atencion" && (
                            <button
                              type="button"
                              onClick={() => openReleaseModal(item)}
                              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                            >
                              <LockOpen size={16} />
                              Liberar cotización
                            </button>
                          )}
                          {canEditOpportunity && (
                            <IconButton
                              title={locked ? "Registro bloqueado" : "Editar"}
                              disabled={locked}
                              onClick={() => { setEditing(item); setModalOpen(true); }}
                            >
                              <Pencil size={17} />
                            </IconButton>
                          )}
                          {canDeleteOpportunity && (
                            <IconButton
                              title={locked ? "Registro bloqueado" : "Eliminar"}
                              disabled={locked}
                              danger
                              onClick={() => void handleDelete(item)}
                            >
                              <Trash2 size={17} />
                            </IconButton>
                          )}
                          {item.estado === "vencida" && <AlertTriangle className="h-4 w-4 text-red-600" />}
                        </div>
                      </Td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                    No se encontraron oportunidades.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span>Mostrando {paginated.length} de {filteredOpportunities.length}</span>
            <PageSizeSelect value={itemsPerPage} onChange={(value) => { setItemsPerPage(value); setCurrentPage(1); }} />
          </div>
          {totalPages > 1 && (
            <div className="flex flex-wrap gap-2">
              {paginationItems.map((item) =>
                typeof item === "number" ? (
                  <button key={item} type="button" onClick={() => setCurrentPage(item)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${currentPage === item ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"}`}>
                    {item}
                  </button>
                ) : (
                  <span key={item} className="px-2 py-2 text-slate-400">...</span>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <OportunidadFormModal
        open={modalOpen}
        opportunity={editing}
        userName={userName}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={(data) => void handleSave(data)}
      />

      <OportunidadDetailDrawer
        opportunity={selected}
        onClose={() => setSelectedId(null)}
        onAddComment={(comment) => void handleAddComment(comment)}
        onGenerateQuote={() => void handleGenerateQuote()}
        canManageOpportunity={Boolean(selected && canReleaseOpportunity(selected) && selected.estado !== "sin_atender")}
        onMarkQuoteDone={() => void handleMarkQuoteDone()}
        onReleaseOpportunity={() => {
          if (selected) openReleaseModal(selected);
        }}
        onFinalizeOpportunity={(estado) => {
          if (selected) void changeEstado(selected, estado);
        }}
      />

      {lossModalOpen && lossTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Resultado: Perdida</h3>
                <p className="mt-1 text-sm text-slate-500">Registra el motivo, las observaciones del cliente y un documento si aplica.</p>
              </div>
              <button type="button" onClick={() => { setLossModalOpen(false); setLossTarget(null); setLossReason(""); setLossObservations(""); setLossFile(null); setLossError(""); }} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900">✕</button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="loss-reason">Motivo de la pérdida</label>
                <select id="loss-reason" value={lossReason} onChange={(event) => { setLossReason(event.target.value); if (lossError) setLossError(""); }} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <option value="">Selecciona un motivo</option>
                  {MOTIVOS_PERDIDA.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="loss-observations">Observaciones de la entidad o cliente</label>
                <textarea id="loss-observations" value={lossObservations} onChange={(event) => setLossObservations(event.target.value)} rows={4} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Describe las observaciones que recibió la entidad o el cliente." />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="loss-file">Adjuntar documento de observaciones</label>
                <input id="loss-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={(event) => setLossFile(event.target.files?.[0] || null)} className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-amber-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-amber-700 dark:text-slate-300" />
                {lossFile && <p className="mt-2 text-sm text-slate-500">Archivo listo: {lossFile.name}</p>}
              </div>

              {lossError && <p className="text-sm font-medium text-amber-600">{lossError}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => { setLossModalOpen(false); setLossTarget(null); setLossReason(""); setLossObservations(""); setLossFile(null); setLossError(""); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                Cancelar
              </button>
              <button type="button" onClick={() => void submitLoss()} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">
                Guardar resultado
              </button>
            </div>
          </div>
        </div>
      )}

      {releaseModalOpen && releaseTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Liberar cotización</h3>
                <p className="mt-1 text-sm text-slate-500">Explica por qué se libera esta oportunidad y vuelve a quedar disponible.</p>
              </div>
              <button type="button" onClick={() => { setReleaseModalOpen(false); setReleaseTarget(null); setReleaseReason(""); setReleaseError(""); }} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900">✕</button>
            </div>

            <label className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="release-reason-modal">
              Motivo obligatorio
            </label>
            <textarea
              id="release-reason-modal"
              value={releaseReason}
              onChange={(event) => {
                setReleaseReason(event.target.value);
                if (releaseError) setReleaseError("");
              }}
              rows={5}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Ejemplo: No encontré proveedor, no contamos con stock, no manejo esta línea de productos, especificaciones demasiado técnicas, otro..."
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "No encontré proveedor.",
                "No contamos con stock.",
                "No manejo esta línea de productos.",
                "Especificaciones demasiado técnicas.",
                "Otro.",
              ].map((example) => (
                <button key={example} type="button" onClick={() => setReleaseReason(example)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">
                  {example}
                </button>
              ))}
            </div>

            {releaseError && <p className="mt-3 text-sm font-medium text-amber-600">{releaseError}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => { setReleaseModalOpen(false); setReleaseTarget(null); setReleaseReason(""); setReleaseError(""); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                Cancelar
              </button>
              <button type="button" onClick={() => void handleReleaseQuote(releaseTarget, releaseReason)} className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700">
                Confirmar liberación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-5 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4 align-middle text-sm text-slate-600 dark:text-slate-300">{children}</td>;
}

function IconButton({
  children,
  title,
  disabled,
  danger,
  onClick,
}: {
  children: ReactNode;
  title: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "bg-red-50 text-red-600 hover:bg-red-100"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}
