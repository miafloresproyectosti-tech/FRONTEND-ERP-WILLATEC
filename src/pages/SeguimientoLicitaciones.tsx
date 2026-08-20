import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileUp,
  LockOpen,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useNavigate, useSearchParams } from "react-router-dom";

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
  addArchivoOportunidad,
  addCotizacionRelacionada,
  deleteArchivoOportunidad,
  deleteCotizacionRelacionada,
  deleteOportunidad,
  getOportunidad,
  getOportunidades,
  saveOportunidad,
} from "../services/licitaciones.service";
import { getUsers } from "../services/usuario.service";
import {
  descargarPdfCotizacion,
  exportarCotizacionPdf,
  getCotizacionesPaginated,
  type Cotizacion,
} from "../services/cotizacion.service";
import type {
  EjecutivoAsignado,
  Oportunidad,
  OportunidadArchivo,
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
  toDatetimeLocalValue,
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

const MIS_OPORTUNIDADES_ACTIVE_RANK: Record<OportunidadEstado, number> = {
  en_atencion: 0,
  cotizacion_generada: 1,
  sin_atender: 2,
  atendido: 3,
  ganada: 4,
  perdida: 4,
  no_se_realizara: 4,
  vencida: 4,
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
  { key: "creadas", label: "Subidas por mi" },
] as const;

const SUPERADMIN_BANDEJAS = [
  { key: "disponibles", label: "Oportunidades Disponibles" },
  { key: "en_atencion", label: "Oportunidades en Atencion" },
  { key: "finalizadas", label: "Oportunidades Finalizadas" },
] as const;

export default function SeguimientoLicitaciones() {
  const { user } = useAuth();
  const { addNotification, showToast } = useNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
  const [editingLoadingId, setEditingLoadingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Oportunidad | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
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
  const [quoteLinkModalOpen, setQuoteLinkModalOpen] = useState(false);
  const [quoteLinkSearch, setQuoteLinkSearch] = useState("");
  const [quoteLinkLoading, setQuoteLinkLoading] = useState(false);
  const [quoteLinkOptions, setQuoteLinkOptions] = useState<Cotizacion[]>([]);
  const [quoteLinkSelectedId, setQuoteLinkSelectedId] = useState<number | null>(null);
  const [downloadingQuoteId, setDownloadingQuoteId] = useState<string | number | null>(null);
  const [presentingProposalId, setPresentingProposalId] = useState<string | null>(null);
  const [uploadingOpportunityFile, setUploadingOpportunityFile] = useState(false);
  const [deletingOpportunityFileId, setDeletingOpportunityFileId] = useState<string | null>(null);
  const [unlinkingQuoteId, setUnlinkingQuoteId] = useState<string | null>(null);
  const [assigningOpportunityId, setAssigningOpportunityId] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const loadRequestRef = useRef(0);
  const showToastRef = useRef(showToast);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

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
  const canCreateOpportunity = currentRole === "LICITACIONES" || currentRole === "VENTAS";
  const [activeBandeja, setActiveBandeja] = useState<string>(
    currentRole === "VENTAS" ? "disponibles" : currentRole === "SUPERADMIN" ? "disponibles" : "todas"
  );

  const loadData = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setLoading(true);
    try {
      const [items, users] = await Promise.all([
        getOportunidades(),
        getUsers().catch(() => []),
      ]);

      if (requestId !== loadRequestRef.current) return;

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
    } catch (error) {
      console.error("No se pudieron cargar oportunidades", error);
      showToastRef.current({
        title: "No se pudieron cargar oportunidades",
        description: "Se mantendran los datos visibles y puedes intentar refrescar nuevamente.",
        type: "warning",
      });
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [user?.email, user?.id, userName]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void getOportunidades()
        .then((items) => {
          setOpportunities((current) => {
            if (current.length > 0 && items.length === 0) {
              return current;
            }

            return items;
          });
        })
        .catch((error) => {
          console.error("No se pudo refrescar oportunidades", error);
        });
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

  const isCreatedByMeOpportunity = useCallback((item: Oportunidad) => {
    if (!user?.id) return false;
    if (item.creadoPorId && Number(item.creadoPorId) === Number(user.id)) return true;

    const creator = normalizeText(item.creadoPor || "");
    return Boolean(creator) && (
      creator === normalizeText(userName) ||
      creator === normalizeText(user?.email || "")
    );
  }, [user?.email, user?.id, userName]);

  const isCreatedByMeAssignedToOther = useCallback((item: Oportunidad) => (
    isCreatedByMeOpportunity(item) &&
    !isMyOpportunity(item) &&
    !isAvailableOpportunity(item)
  ), [isAvailableOpportunity, isCreatedByMeOpportunity, isMyOpportunity]);

  const isAttentionOpportunity = useCallback((item: Oportunidad) => (
    item.estado === "en_atencion" || item.estado === "atendido" || item.estado === "cotizacion_generada"
  ), []);

  const scopedOpportunities = useMemo(() => {
    if (isSalesRole) {
      if (activeBandeja === "mis") return opportunities.filter(isMyOpportunity);
      if (activeBandeja === "creadas") return opportunities.filter(isCreatedByMeAssignedToOther);
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
  }, [activeBandeja, currentRole, isAttentionOpportunity, isAvailableOpportunity, isCreatedByMeAssignedToOther, isManager, isMyOpportunity, isSalesRole, opportunities, user?.id]);

  const filteredOpportunities = useMemo(() => {
    const search = normalizeText(debouncedSearch);
    const vigenciaDesdeTime = filters.vigenciaDesde ? new Date(filters.vigenciaDesde).getTime() : null;
    const vigenciaHastaTime = filters.vigenciaHasta ? new Date(filters.vigenciaHasta).getTime() : null;

    return scopedOpportunities
      .filter((item) => filters.tipo === "todos" || item.tipo === filters.tipo)
      .filter((item) => filters.estado === "todos" || item.estado === filters.estado)
      .filter((item) => filters.ejecutivo === "todos" || String(item.ejecutivo.id) === filters.ejecutivo)
      .filter((item) => filters.categoria === "todos" || item.categoria === filters.categoria)
      .filter((item) => !filters.empresa || normalizeText(item.empresa).includes(normalizeText(filters.empresa)))
      .filter((item) => !filters.requerimiento || normalizeText(item.requerimiento).includes(normalizeText(filters.requerimiento)))
      .filter((item) => !vigenciaDesdeTime || new Date(item.vigencia).getTime() >= vigenciaDesdeTime)
      .filter((item) => !vigenciaHastaTime || new Date(item.vigencia).getTime() <= vigenciaHastaTime)
      .filter((item) => {
        if (!search) return true;
        return normalizeText(`${item.empresa} ${item.requerimiento}`).includes(search);
      })
      .sort((a, b) => {
        if (currentRole === "LICITACIONES") {
          const dateA = new Date(a.creadoEn).getTime();
          const dateB = new Date(b.creadoEn).getTime();
          return dateB - dateA;
        }

        if (isSalesRole && ["mis", "creadas"].includes(activeBandeja)) {
          const rankDiff = MIS_OPORTUNIDADES_ACTIVE_RANK[a.estado] - MIS_OPORTUNIDADES_ACTIVE_RANK[b.estado];
          if (rankDiff !== 0) return rankDiff;

          const dateA = new Date(a.modificadoEn || a.creadoEn || a.vigencia).getTime();
          const dateB = new Date(b.modificadoEn || b.creadoEn || b.vigencia).getTime();
          return dateB - dateA;
        }

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
  }, [activeBandeja, currentRole, debouncedSearch, filters, isSalesRole, scopedOpportunities, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredOpportunities.length / itemsPerPage));
  const paginationItems = getPaginationItems(currentPage, totalPages);
  const paginated = filteredOpportunities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const selectedSummary = opportunities.find((item) => item.id === selectedId) || null;
  const selected = selectedDetail?.id === selectedId ? selectedDetail : selectedSummary;

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      setSelectedLoading(false);
      return;
    }

    let cancelled = false;
    setSelectedLoading(true);

    void getOportunidad(selectedId)
      .then((detail) => {
        if (cancelled) return;
        setSelectedDetail(detail);
        setOpportunities((current) =>
          current.map((item) => (item.id === detail.id ? { ...item, ...detail } : item)),
        );
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("No se pudo cargar detalle de oportunidad", error);
        showToastRef.current({
          title: "No se pudo cargar el detalle",
          description: "Se mostrara la informacion disponible del listado.",
          type: "warning",
        });
      })
      .finally(() => {
        if (!cancelled) setSelectedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    const oportunidadId = searchParams.get("oportunidad_id");

    if (!oportunidadId || opportunities.length === 0) {
      return;
    }

    const exists = opportunities.some((item) => String(item.id) === String(oportunidadId));
    if (!exists) {
      return;
    }

    setSelectedId(String(oportunidadId));
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("oportunidad_id");
    setSearchParams(nextParams, { replace: true });
  }, [opportunities, searchParams, setSearchParams]);

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
    if (!user?.id || !isAvailableOpportunity(opportunity) || assigningOpportunityId) return;

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

    try {
      setAssigningOpportunityId(opportunity.id);
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
    } finally {
      setAssigningOpportunityId(null);
    }
  };

  const handleSave = async (data: OportunidadFormData) => {
    const now = new Date().toISOString();
    const previous = editing;
    const hasEstadoChange = previous && previous.estado !== data.estado;
    const estado = previous ? data.estado : "sin_atender";
    const clean = (value?: string | null) => (value || "").trim();

    const next: Oportunidad = {
      id: previous?.id || createId("op"),
      tipo: data.tipo,
      empresa: clean(data.empresa),
      requerimiento: clean(data.requerimiento),
      vigencia: data.vigencia,
      ejecutivo: previous?.ejecutivo || { id: 0, nombre: "Sin ejecutivo" },
      asignadoA: previous?.asignadoA ?? null,
      asignadoEn: previous?.asignadoEn ?? null,
      asignadoPor: previous?.asignadoPor ?? null,
      esNueva: previous?.esNueva ?? true,
      categoria: data.categoria,
      estado,
      observacion: clean(data.observacion),
      creadoEn: previous?.creadoEn || now,
      creadoPorId: previous?.creadoPorId ?? user?.id ?? null,
      creadoPor: previous?.creadoPor || userName,
      modificadoEn: previous ? now : undefined,
      modificadoPor: previous ? userName : undefined,
      garantia: data.tipo === "licitacion" ? clean(data.garantia) : undefined,
      plazo: data.tipo === "licitacion" ? clean(data.plazo) : undefined,
      carpetaServidor: data.tipo === "licitacion" ? clean(data.carpetaServidor) : undefined,
      tdr: data.tipo === "licitacion" || data.tipo === "privado" ? data.tdr : undefined,
      formaPago: data.tipo !== "licitacion" && data.formaPago ? data.formaPago : undefined,
      destinoEntrega: data.tipo === "privado" ? clean(data.destinoEntrega) : undefined,
      wherexId: data.tipo === "wherex" ? clean(data.wherexId) : undefined,
      wherexUrl: data.tipo === "wherex" ? clean(data.wherexUrl) : undefined,
      comentariosGenerales: data.tipo === "wherex" ? clean(data.comentariosGenerales) : undefined,
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

    try {
      await saveOportunidad(next);
      setModalOpen(false);
      setEditing(null);
      await loadData();
      showToast({ title: "Oportunidad guardada", description: "El seguimiento fue actualizado.", type: "success" });
    } catch (error) {
      const response = error as { response?: { data?: { message?: string } }; message?: string };
      showToast({
        title: "No se pudo guardar oportunidad",
        description: response.response?.data?.message || response.message || "Revisa los datos e intenta nuevamente.",
        type: "error",
      });
      throw error;
    }
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
    const updated = await saveOportunidad({
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
    syncSelectedOpportunity(updated);
    void refreshSelectedOpportunity(item.id, updated);
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

    const updated = await saveOportunidad({
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
    syncSelectedOpportunity(updated);
    void refreshSelectedOpportunity(lossTarget.id, updated);
    showToast({ title: "Oportunidad perdida", description: "Se registró el motivo y las observaciones de la pérdida.", type: "success" });
  };

  const canDeleteOpportunity = (item: Oportunidad) => {
    const hasQuote = Boolean(item.cotizacionId || item.cotizacionNumero || item.cotizaciones.length > 0);

    return (
      isOpportunityCreator(item) &&
      item.estado === "sin_atender" &&
      isAvailableOpportunity(item) &&
      !hasQuote
    );
  };

  const handleDelete = async (item: Oportunidad) => {
    if (!canDeleteOpportunity(item)) {
      showToast({
        title: "No se puede eliminar",
        description: "Solo se pueden eliminar oportunidades sin atender, sin responsable y sin cotizacion vinculada o generada.",
        type: "warning",
      });
      return;
    }

    if (!window.confirm(`Eliminar la oportunidad de ${item.empresa}?`)) return;
    await deleteOportunidad(item.id);
    await loadData();
    showToast({ title: "Oportunidad eliminada", type: "success" });
  };

  const handleEditOpportunity = async (item: Oportunidad) => {
    if (editingLoadingId) return;

    setEditingLoadingId(item.id);
    try {
      const detail = selectedDetail?.id === item.id ? selectedDetail : await getOportunidad(item.id);
      setOpportunities((current) =>
        current.map((opportunity) => (opportunity.id === detail.id ? { ...opportunity, ...detail } : opportunity)),
      );
      setEditing(detail);
      setModalOpen(true);
    } catch (error) {
      console.error("No se pudo cargar oportunidad para editar", error);
      showToast({
        title: "No se pudo abrir la edicion",
        description: "Intenta nuevamente para cargar archivos y detalle completo.",
        type: "error",
      });
    } finally {
      setEditingLoadingId(null);
    }
  };

  const syncSelectedOpportunity = (detail: Oportunidad) => {
    setSelectedDetail(detail);
    setOpportunities((current) =>
      current.map((item) => (item.id === detail.id ? { ...item, ...detail } : item)),
    );
  };

  const refreshSelectedOpportunity = async (opportunityId: string, immediateDetail?: Oportunidad) => {
    if (immediateDetail) {
      syncSelectedOpportunity(immediateDetail);
    }

    try {
      const detail = await getOportunidad(opportunityId);
      syncSelectedOpportunity(detail);
    } catch (error) {
      console.warn("No se pudo refrescar el detalle de oportunidad", error);
    }

    void loadData().catch((error) => {
      console.warn("No se pudo refrescar el listado de oportunidades", error);
    });
  };

  const handleAddComment = async (comment: string) => {
    if (!selected) return;
    await addComentarioOportunidad(selected.id, {
      id: createId("comment"),
      usuario: userName,
      fecha: new Date().toISOString(),
      comentario: comment,
    });
    await refreshSelectedOpportunity(selected.id);
  };

  const isCreatedByCurrentUser = (createdBy?: string | null, createdById?: string | number | null) => {
    if (!user?.id) return false;
    if (createdById && Number(createdById) === Number(user.id)) return true;

    const creator = normalizeText(createdBy || "");
    return Boolean(creator) && (
      creator === normalizeText(userName) ||
      creator === normalizeText(user?.email || "")
    );
  };

  const handleUploadOpportunityFile = async (file: File) => {
    if (!selected || uploadingOpportunityFile) return;

    setUploadingOpportunityFile(true);
    try {
      const parsed = await fileToOpportunityFile(file, userName);
      const detail = await addArchivoOportunidad(selected.id, parsed);
      syncSelectedOpportunity(detail);
      showToast({ title: "Archivo subido", description: "El documento quedo asociado a la oportunidad.", type: "success" });
    } catch (error) {
      const response = error as { response?: { data?: { message?: string } }; message?: string };
      showToast({
        title: "No se pudo subir archivo",
        description: response.response?.data?.message || response.message || "Intenta nuevamente.",
        type: "error",
      });
    } finally {
      setUploadingOpportunityFile(false);
    }
  };

  const handleDeleteOpportunityFile = async (file: OportunidadArchivo) => {
    if (!selected || deletingOpportunityFileId) return;
    if (!window.confirm(`Eliminar el archivo "${file.nombre}"?`)) return;

    setDeletingOpportunityFileId(file.id);
    try {
      const detail = await deleteArchivoOportunidad(selected.id, file.id);
      syncSelectedOpportunity(detail);
      showToast({ title: "Archivo eliminado", type: "success" });
    } catch (error) {
      const response = error as { response?: { data?: { message?: string } }; message?: string };
      showToast({
        title: "No se pudo eliminar archivo",
        description: response.response?.data?.message || response.message || "Solo puedes eliminar archivos subidos por ti.",
        type: "error",
      });
    } finally {
      setDeletingOpportunityFileId(null);
    }
  };

  const handleUnlinkQuote = async (relacionId: string) => {
    if (!selected || unlinkingQuoteId) return;
    const quote = selected.cotizaciones.find((item) => item.id === relacionId);
    if (!quote) return;
    if (!window.confirm(`Desvincular la cotizacion ${quote.numero}?`)) return;

    setUnlinkingQuoteId(relacionId);
    try {
      const detail = await deleteCotizacionRelacionada(selected.id, relacionId);
      syncSelectedOpportunity(detail);
      showToast({ title: "Cotizacion desvinculada", description: "La oportunidad quedo actualizada.", type: "success" });
      await loadData();
    } catch (error) {
      const response = error as { response?: { data?: { message?: string } }; message?: string };
      showToast({
        title: "No se pudo desvincular",
        description: response.response?.data?.message || response.message || "Solo puedes desvincular cotizaciones que vinculaste manualmente.",
        type: "error",
      });
    } finally {
      setUnlinkingQuoteId(null);
    }
  };

  const handleGenerateQuote = async () => {
    if (!selected) return;
    if (!canManageOpportunityQuote(selected)) {
      showToast({
        title: "No autorizado",
        description: "Solo el ejecutivo asignado puede generar o vincular cotizaciones para esta oportunidad.",
        type: "warning",
      });
      return;
    }

    const params = new URLSearchParams({
      oportunidad_id: selected.id,
      oportunidad_tipo: selected.tipo,
      oportunidad_empresa: selected.empresa,
      oportunidad_requerimiento: selected.requerimiento,
      oportunidad_vigencia: selected.vigencia,
      oportunidad_categoria: selected.categoria || "",
      oportunidad_garantia: selected.garantia || "",
      oportunidad_plazo: selected.plazo || "",
      oportunidad_forma_pago: selected.formaPago || "",
      oportunidad_destino_entrega: selected.destinoEntrega || "",
      oportunidad_observacion: selected.observacion || "",
      oportunidad_comentarios: selected.comentariosGenerales || "",
      oportunidad_carpeta_servidor: selected.carpetaServidor || "",
      oportunidad_wherex_id: selected.wherexId || "",
      oportunidad_wherex_url: selected.wherexUrl || "",
    });

    navigate(`/cotizaciones/new?${params.toString()}`);
  };

  const handleMarkQuoteDone = async () => {
    if (!selected || !canManageOpportunityQuote(selected) || isClosedOpportunity(selected.estado)) return;
    setQuoteLinkSearch(selected.empresa);
    setQuoteLinkSelectedId(null);
    setQuoteLinkModalOpen(true);
  };

  useEffect(() => {
    if (!quoteLinkModalOpen) return;

    let cancelled = false;
    setQuoteLinkLoading(true);

    void getCotizacionesPaginated({
      page: 1,
      perPage: 10,
      search: quoteLinkSearch,
    })
      .then((response) => {
        if (!cancelled) setQuoteLinkOptions(response.data || []);
      })
      .catch(() => {
        if (!cancelled) setQuoteLinkOptions([]);
      })
      .finally(() => {
        if (!cancelled) setQuoteLinkLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [quoteLinkModalOpen, quoteLinkSearch]);

  const handleLinkExistingQuote = async () => {
    if (!selected || !quoteLinkSelectedId) return;

    const cotizacion = quoteLinkOptions.find((item) => Number(item.id) === Number(quoteLinkSelectedId));
    if (!cotizacion) {
      showToast({ title: "Selecciona una cotizacion", description: "Elige una cotizacion para vincularla.", type: "warning" });
      return;
    }

    const cotizacionData = cotizacion as any;

    await addCotizacionRelacionada(selected.id, userName, {
      cotizacion_id: Number(cotizacion.id),
      numero: cotizacion.numero,
      estado: cotizacionData.estadoCotizacion?.nombre || cotizacionData.estado_cotizacion?.nombre || "registrada",
      monto: Number(cotizacion.total || 0),
      moneda: cotizacionData.moneda?.codigo || cotizacionData.codigo_moneda,
      origen: "vinculada",
    });

    setQuoteLinkModalOpen(false);
    setQuoteLinkSelectedId(null);
    await loadData();
    showToast({
      title: "Cotizacion vinculada",
      description: `${cotizacion.numero || `#${cotizacion.id}`} quedo asociada a la oportunidad.`,
      type: "success",
    });
  };

  const handleDownloadQuotePdf = async (cotizacionId: string | number) => {
    const parsedId = Number(cotizacionId);
    if (!parsedId || downloadingQuoteId) return;

    setDownloadingQuoteId(cotizacionId);
    try {
      const { blob, filename } = await exportarCotizacionPdf(parsedId, { desdeOportunidad: true });
      await descargarPdfCotizacion(filename || `cotizacion-${parsedId}.pdf`, blob);
    } catch (error) {
      console.error("Error al descargar PDF de cotizacion vinculada:", error);
      showToast({
        title: "No se pudo descargar el PDF",
        description: "Solo se puede descargar si la cotizacion esta aprobada y sin modificacion pendiente.",
        type: "error",
      });
    } finally {
      setDownloadingQuoteId(null);
    }
  };

  const handleMarkProposalPresented = async (file: File) => {
    if (!selected || !["cotizacion_generada", "vencida"].includes(selected.estado) || presentingProposalId) return;
    if (!canMarkProposalPresented(selected)) {
      showToast({
        title: "No autorizado",
        description: "No tienes permiso para marcar esta oportunidad como presentada.",
        type: "warning",
      });
      return;
    }

    const now = new Date().toISOString();
    const wasExpired = selected.estado === "vencida" || new Date(selected.vigencia).getTime() <= Date.now();
    setPresentingProposalId(selected.id);
    try {
      const evidence = await fileToOpportunityFile(file, userName);
      const updated = await saveOportunidad({
        ...selected,
        archivos: [evidence, ...selected.archivos],
        ...( { presentacionEvidencia: evidence } as { presentacionEvidencia: OportunidadArchivo }),
        estado: "atendido",
        modificadoEn: now,
        modificadoPor: userName,
        historial: [
          {
            id: createId("hist"),
            fecha: now,
            usuario: userName,
            tipo: "estado",
            descripcion: wasExpired
              ? `Propuesta presentada fuera de registro con evidencia ${evidence.nombre}, posterior al vencimiento.`
              : `Propuesta presentada/subida con evidencia ${evidence.nombre}.`,
          },
          ...selected.historial,
        ],
      });

      syncSelectedOpportunity(updated);
      void refreshSelectedOpportunity(selected.id, updated);
      showToast({
        title: "Propuesta presentada",
        description: wasExpired
          ? "La oportunidad quedo marcada como atendida con registro posterior al vencimiento."
          : "La oportunidad quedo marcada como atendida.",
        type: "success",
      });
    } finally {
      setPresentingProposalId(null);
    }
  };

  const canReleaseOpportunity = (item: Oportunidad) => {
    if (!user?.id) return false;
    if (currentRole === "SUPERADMIN") return true;
    return Number(item.asignadoA ?? item.ejecutivo?.id ?? 0) === user.id;
  };

  const isOpportunityCreator = (item: Oportunidad) => {
    return isCreatedByMeOpportunity(item);
  };

  const canManageOpportunityQuote = (item: Oportunidad) => {
    if (!user?.id) return false;
    if (item.estado !== "en_atencion") return false;
    if (item.cotizacionId || item.cotizacionNumero || item.cotizaciones.length > 0) return false;

    return Number(item.asignadoA ?? item.ejecutivo?.id ?? 0) === Number(user.id);
  };

  const canMarkProposalPresented = (item: Oportunidad) => {
    if (!user?.id) return false;
    if (!["cotizacion_generada", "vencida"].includes(item.estado)) return false;

    if (item.tipo === "licitacion") {
      return currentRole === "LICITACIONES" || isOpportunityCreator(item);
    }

    if (currentRole === "VENTAS" && isOpportunityCreator(item)) return true;

    return Number(item.asignadoA ?? item.ejecutivo?.id ?? 0) === Number(user.id);
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
    const updated = await saveOportunidad({
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
    syncSelectedOpportunity(updated);
    void refreshSelectedOpportunity(item.id, updated);
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
    tiempo_restante: formatRemainingTime(item.vigencia, item.estado),
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
        vigencia: toDatetimeLocalValue(new Date(row.getCell(3).value?.toString() || Date.now() + 2 * 24 * 60 * 60 * 1000)),
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
    if (key === "creadas") return opportunities.filter(isCreatedByMeAssignedToOther).length;
    if (key === "en_atencion") return opportunities.filter(isAttentionOpportunity).length;
    if (key === "finalizadas") return opportunities.filter((item) => isClosedOpportunity(item.estado)).length;
    return opportunities.length;
  };

  const isInitialLoading = loading && opportunities.length === 0;
  const isRefreshing = loading && opportunities.length > 0;

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

      {loading && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div>
            <p>{isInitialLoading ? "Cargando oportunidades..." : "Actualizando oportunidades..."}</p>
            <p className="text-xs font-medium text-blue-600/80 dark:text-blue-200/80">
              Estamos sincronizando oportunidades, responsables, estados y vigencias.
            </p>
          </div>
        </div>
      )}

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

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-lg">
        <div className="absolute inset-y-0 left-0 flex w-4 gap-1 pl-1.5">
          <span className="my-4 w-1 rounded-full bg-[#e52f7f]" />
          <span className="my-4 w-1 rounded-full bg-[#22a7df]" />
          <span className="my-4 w-1 rounded-full bg-[#8bc53f]" />
        </div>
        <div className="absolute inset-x-0 top-0 h-1 bg-[#0f3f8f]" />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl pl-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0f3f8f]">Canal comercial</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Seguimiento comercial</h2>
            <p className="mt-1 text-xs text-slate-500">
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
                  className={`min-w-[120px] rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? "border-[#0f3f8f] bg-[#0f3f8f] text-white shadow-lg shadow-blue-900/10"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  <div className="text-sm font-semibold">{tab.label}</div>
                  <div className={`text-[11px] ${active ? "text-blue-100" : "text-slate-500"}`}>{tab.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {TYPE_TABS.map((tab) => (
            <div key={tab.key} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold text-slate-500">{tab.label}</p>
              <p className="text-xl font-bold text-[#0f3f8f]">{typeSummary[tab.key as keyof typeof typeSummary]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5 xl:grid-cols-10">
        {SUMMARY_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              if (item.key in OPORTUNIDAD_ESTADOS) {
                updateFilter("estado", item.key as OportunidadEstado);
              }
            }}
            className={`rounded-xl border bg-white px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-950 ${item.className}`}
          >
            <p className="min-h-8 text-xs font-semibold leading-4 text-slate-500">{item.label}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{summary[item.key] || 0}</p>
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
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 text-sm dark:border-slate-800">
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {isInitialLoading ? "Preparando listado" : `${filteredOpportunities.length} oportunidades encontradas`}
          </div>
          {isRefreshing && (
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Actualizando
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <tr>
                <Th>Tipo</Th>
                <Th>{sortButton("empresa")}</Th>
                <Th>Requerimiento</Th>
                <Th>Categoria</Th>
                <Th>{sortButton("creadoEn")}</Th>
                <Th>{sortButton("estado")}</Th>
                <Th>Ejecutivo</Th>
                <Th className="min-w-[150px]">{sortButton("vigencia")}</Th>
                <Th>Tiempo restante</Th>
                <Th className="sticky right-0 z-20 w-[148px] min-w-[148px] bg-slate-50 shadow-[-10px_0_18px_-18px_rgba(15,23,42,0.7)] dark:bg-slate-900">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
                    <td colSpan={10} className="px-5 py-4">
                      <div className="h-8 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
                    </td>
                  </tr>
                ))
              ) : paginated.length > 0 ? (
                paginated.map((item) => {
                  const locked = isClosedOpportunity(item.estado);
                  const alert = getVigenciaAlert(item.vigencia, item.estado);

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
                        <EstadoBadge estado={item.estado} />
                      </Td>
                      <Td>
                        <div className="max-w-[170px]">
                          <span className="block truncate font-semibold text-slate-800 dark:text-slate-100" title={item.ejecutivo.nombre}>
                            {["en_atencion", "cotizacion_generada", "atendido"].includes(item.estado)
                              ? item.ejecutivo.nombre
                              : item.ejecutivo.nombre === "Sin ejecutivo" ? "Sin asignar" : item.ejecutivo.nombre}
                          </span>
                          {item.estado === "en_atencion" && (
                            <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              En atencion
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td className="min-w-[150px] font-semibold text-slate-700 dark:text-slate-200">{formatDateTime(item.vigencia)}</Td>
                      <Td>
                        <div className="space-y-1">
                          <VigenciaBadge vigencia={item.vigencia} estado={item.estado} />
                          <p className={`text-xs font-semibold ${alert.textClass}`}>{formatRemainingTime(item.vigencia, item.estado)}</p>
                        </div>
                      </Td>
                      <Td className="sticky right-0 z-10 w-[148px] min-w-[148px] bg-white shadow-[-10px_0_18px_-18px_rgba(15,23,42,0.7)] dark:bg-slate-950">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <IconButton title="Ver detalle" onClick={() => setSelectedId(item.id)}><Eye size={17} /></IconButton>
                          {(isSalesRole || currentRole === "SUPERADMIN") && isAvailableOpportunity(item) && (
                            <button
                              type="button"
                              disabled={Boolean(assigningOpportunityId)}
                              onClick={() => void handleAssignToMe(item)}
                              className="inline-flex h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {assigningOpportunityId === item.id && <Loader2 size={14} className="animate-spin" />}
                              {assigningOpportunityId === item.id ? "Asignando" : "Asignarme"}
                            </button>
                          )}
                          {canReleaseOpportunity(item) && item.estado === "en_atencion" && (
                            <button
                              type="button"
                              title="Liberar"
                              onClick={() => openReleaseModal(item)}
                              className="inline-flex h-9 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                            >
                              <LockOpen size={16} />
                              Liberar
                            </button>
                          )}
                          {isOpportunityCreator(item) && (
                            <IconButton
                              title={locked ? "Registro bloqueado" : "Editar"}
                              disabled={locked || editingLoadingId === item.id}
                              onClick={() => void handleEditOpportunity(item)}
                            >
                              {editingLoadingId === item.id ? <Loader2 size={17} className="animate-spin" /> : <Pencil size={17} />}
                            </IconButton>
                          )}
                          {canDeleteOpportunity(item) && (
                            <IconButton
                              title={locked ? "Registro bloqueado" : "Eliminar"}
                              disabled={locked}
                              danger
                              onClick={() => void handleDelete(item)}
                            >
                              <Trash2 size={17} />
                            </IconButton>
                          )}
                          {currentRole === "LICITACIONES" && item.estado === "atendido" && (
                            <IconButton
                              title="Marcar como perdida"
                              danger
                              onClick={() => void changeEstado(item, "perdida")}
                            >
                              <XCircle size={17} />
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
                  <td colSpan={10} className="px-5 py-12 text-center text-slate-500">
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
        onSubmit={handleSave}
      />

      <OportunidadDetailDrawer
        opportunity={selected}
        onClose={() => setSelectedId(null)}
        onAddComment={(comment) => void handleAddComment(comment)}
        onGenerateQuote={() => void handleGenerateQuote()}
        canManageOpportunity={Boolean(selected && canManageOpportunityQuote(selected))}
        onMarkQuoteDone={() => void handleMarkQuoteDone()}
        onReleaseOpportunity={() => {
          if (selected) openReleaseModal(selected);
        }}
        onFinalizeOpportunity={(estado) => {
          if (selected) void changeEstado(selected, estado);
        }}
        canMarkProposalPresented={Boolean(selected && canMarkProposalPresented(selected))}
        presentingProposal={Boolean(selected && presentingProposalId === selected.id)}
        onMarkProposalPresented={(file) => void handleMarkProposalPresented(file)}
        canDownloadQuotePdf={currentRole === "LICITACIONES" || currentRole === "SUPERADMIN"}
        downloadingQuoteId={downloadingQuoteId}
        onDownloadQuotePdf={(cotizacionId) => void handleDownloadQuotePdf(cotizacionId)}
        loadingDetails={selectedLoading}
        canUploadFile={Boolean(selected && !isClosedOpportunity(selected.estado) && (
          isOpportunityCreator(selected) ||
          Number(selected.asignadoA ?? selected.ejecutivo?.id ?? 0) === Number(user?.id) ||
          currentRole === "SUPERADMIN"
        ))}
        uploadingFile={uploadingOpportunityFile}
        onUploadFile={(file) => void handleUploadOpportunityFile(file)}
        deletingFileId={deletingOpportunityFileId}
        canDeleteFile={(file) => isCreatedByCurrentUser(file.creadoPor)}
        onDeleteFile={(file) => void handleDeleteOpportunityFile(file)}
        unlinkingQuoteId={unlinkingQuoteId}
        canUnlinkQuote={(relacionId) => {
          const quote = selected?.cotizaciones.find((item) => item.id === relacionId);
          return Boolean(quote && quote.origen === "vinculada" && isCreatedByCurrentUser(quote.creadoPor, quote.creadoPorId));
        }}
        onUnlinkQuote={(relacionId) => void handleUnlinkQuote(relacionId)}
      />

      {quoteLinkModalOpen && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Vincular cotizacion existente</h3>
                  <p className="mt-1 text-sm text-slate-500">Selecciona la cotizacion que corresponde a {selected.empresa}.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuoteLinkModalOpen(false)}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                  title="Cerrar"
                >
                  ×
                </button>
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={quoteLinkSearch}
                  onChange={(event) => setQuoteLinkSearch(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="Buscar por numero, cliente o titulo"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {quoteLinkLoading ? (
                <div className="rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800">
                  Buscando cotizaciones...
                </div>
              ) : quoteLinkOptions.length > 0 ? (
                <div className="space-y-2">
                  {quoteLinkOptions.map((cotizacion) => {
                    const cotizacionData = cotizacion as any;
                    const clienteNombre = cotizacion.cliente?.nombre || cotizacionData.cliente_nombre || "Sin cliente";
                    const estadoNombre = cotizacionData.estadoCotizacion?.nombre || cotizacionData.estado_cotizacion?.nombre || "Sin estado";
                    const total = Number(cotizacion.total || 0);
                    const moneda = cotizacionData.moneda?.simbolo || cotizacionData.simbolo_moneda || "";

                    return (
                      <label
                        key={cotizacion.id}
                        className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                          Number(quoteLinkSelectedId) === Number(cotizacion.id)
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                            : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                        }`}
                      >
                        <input
                          type="radio"
                          name="cotizacion-link"
                          checked={Number(quoteLinkSelectedId) === Number(cotizacion.id)}
                          onChange={() => setQuoteLinkSelectedId(Number(cotizacion.id))}
                          className="mt-1"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-slate-900 dark:text-white">
                            {cotizacion.numero || `#${cotizacion.id}`} - {cotizacion.titulo || "Sin titulo"}
                          </span>
                          <span className="mt-1 block text-sm text-slate-500">
                            {clienteNombre} · {estadoNombre} · {moneda} {total.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800">
                  No se encontraron cotizaciones con ese criterio.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setQuoteLinkModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleLinkExistingQuote()}
                disabled={!quoteLinkSelectedId}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Vincular cotizacion
              </button>
            </div>
          </div>
        </div>
      )}

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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Liberar</h3>
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

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-5 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-300 ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-5 py-4 align-middle text-sm text-slate-600 dark:text-slate-300 ${className}`}>{children}</td>;
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
