import { useEffect, useRef, useState } from "react";

import {
  AlertCircle,
  ArrowRight,
  Bell,
  ChevronDown,
  Eye,
  Loader2,
  Menu,
  RefreshCcw,
  X,
} from "lucide-react";

import { useRefresh } from "../../RefreshContext";
import {
  notificationService,
  type DatabaseNotification,
} from "../../services/notification.service";
import {
  getNotificationDescription,
  getNotificationTone,
  getNotificationTitle,
} from "../../utils/notificationText";

interface TopbarProps {
  onNotificationClick?: (route: string) => void;
  onMenuClick?: () => void;
}

const NOTIFICATION_POLL_INTERVAL_MS = 60_000;
const NOTIFICATION_MIN_RELOAD_GAP_MS = 15_000;

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

async function playNotificationSound() {
  const AudioContextConstructor =
    window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext;

  if (!AudioContextConstructor) return;

  const audioContext = new AudioContextConstructor();

  try {
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const secondOscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const compressor = audioContext.createDynamicsCompressor();
    const now = audioContext.currentTime;

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(1046.5, now);
    oscillator.frequency.exponentialRampToValueAtTime(1318.5, now + 0.12);

    secondOscillator.type = "sine";
    secondOscillator.frequency.setValueAtTime(1568, now + 0.16);
    secondOscillator.frequency.exponentialRampToValueAtTime(1174.7, now + 0.42);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.75, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);

    compressor.threshold.setValueAtTime(-16, now);
    compressor.knee.setValueAtTime(18, now);
    compressor.ratio.setValueAtTime(8, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.18, now);

    oscillator.connect(gain);
    secondOscillator.connect(gain);
    gain.connect(compressor);
    compressor.connect(audioContext.destination);
    oscillator.start(now);
    secondOscillator.start(now + 0.16);
    oscillator.stop(now + 0.54);
    secondOscillator.stop(now + 0.54);

    oscillator.onended = () => {
      void audioContext.close();
    };
  } catch {
    void audioContext.close();
  }
}

async function requestNativeNotificationPermission() {
  if (!("Notification" in window) || Notification.permission !== "default") {
    return;
  }

  try {
    await Notification.requestPermission();
  } catch (error) {
    console.warn("No se pudo solicitar permiso de notificaciones nativas:", error);
  }
}

function showNativeNotification(notification: DatabaseNotification) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const title = getNotificationTitle(notification);
  const body = getNotificationDescription(notification);
  const nativeNotification = new Notification(title, {
    body,
    icon: "/logo_willatec.png",
    badge: "/favicon.svg",
    tag: notification.id,
    requireInteraction: false,
    silent: false,
  });

  nativeNotification.onclick = () => {
    window.focus();
    window.location.assign(notification.data.action_url || "/notificaciones");
    nativeNotification.close();
  };
}

function isCotizacionNotification(notification: DatabaseNotification): boolean {
  const actionUrl = String(notification.data.action_url || "");
  const type = String(notification.type || "");

  return Boolean(
    notification.data.cotizacion_id ||
      actionUrl.includes("/cotizaciones") ||
      type.toLowerCase().includes("cotizacion")
  );
}

export default function Topbar({
  onNotificationClick,
  onMenuClick,
}: TopbarProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<DatabaseNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null
  );

  const dropdownRef = useRef<HTMLDivElement>(null);
  const originalTitleRef = useRef(document.title);
  const knownUnreadIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedNotificationsRef = useRef(false);
  const lastNotificationsFetchRef = useRef(0);
  const { refreshing, refresh } = useRefresh();

  const unreadCount = notifications.filter(
    (notification) => !notification.read_at
  ).length;

  const applyNotifications = (
    data: DatabaseNotification[],
    notifyNewUnread = false
  ) => {
    const unreadIds = data
      .filter((notification) => !notification.read_at)
      .map((notification) => notification.id);
    const newUnreadNotifications = data.filter(
      (notification) =>
        !notification.read_at && !knownUnreadIdsRef.current.has(notification.id)
    );
    const hasNewUnread = newUnreadNotifications.length > 0;

    knownUnreadIdsRef.current = new Set(unreadIds);
    setNotifications(data);

    if (hasLoadedNotificationsRef.current && notifyNewUnread && hasNewUnread) {
      const cotizacionNotifications = newUnreadNotifications.filter(isCotizacionNotification);

      if (cotizacionNotifications.length > 0) {
        window.dispatchEvent(
          new CustomEvent("erp:cotizacion-notification", {
            detail: {
              cotizacionIds: cotizacionNotifications
                .map((notification) => notification.data.cotizacion_id)
                .filter(Boolean),
              notificationIds: cotizacionNotifications.map((notification) => notification.id),
            },
          })
        );
      }

      void playNotificationSound();
      showNativeNotification(newUnreadNotifications[0]);
    }

    hasLoadedNotificationsRef.current = true;
  };

  const loadNotifications = async (force = false) => {
    try {
      setNotificationsLoading(true);
      setNotificationsError(null);
      lastNotificationsFetchRef.current = Date.now();
      const data = await notificationService.getNotifications({ force });
      applyNotifications(data, true);
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
      setNotificationsError("No se pudieron cargar las notificaciones.");
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchNotifications = (notifyNewUnread = false, force = false) => {
      const elapsed = Date.now() - lastNotificationsFetchRef.current;
      if (!force && elapsed < NOTIFICATION_MIN_RELOAD_GAP_MS) {
        return;
      }

      lastNotificationsFetchRef.current = Date.now();
      notificationService
        .getNotifications({ force })
        .then((data) => {
          if (!cancelled) {
            applyNotifications(data, notifyNewUnread);
          }
        })
        .catch((error) => {
          console.error("Error al cargar notificaciones:", error);
        });
    };

    fetchNotifications(false);
    const intervalId = window.setInterval(
      () => fetchNotifications(true),
      NOTIFICATION_POLL_INTERVAL_MS
    );
    const handleFocus = () => fetchNotifications(true);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications(true);
      }
    };
    const handleRefresh = () => fetchNotifications(true, true);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("erp:refreshed", handleRefresh);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("erp:refreshed", handleRefresh);
    };
  }, []);

  useEffect(() => {
    const originalTitle = originalTitleRef.current;

    document.title =
      unreadCount > 0
        ? `(${unreadCount}) ${originalTitle}`
        : originalTitle;

    return () => {
      document.title = originalTitle;
    };
  }, [unreadCount]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: DatabaseNotification) => {
    setNotificationsOpen(false);

    if (!notification.read_at) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );

      try {
        await notificationService.markAsRead(notification.id);
      } catch (error) {
        console.error("Error al marcar notificacion como leida:", error);
      }
    }

    const route = notification.data.action_url || "/notificaciones";

    if (onNotificationClick) {
      onNotificationClick(route);
      return;
    }

    window.location.assign(route);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-3 rounded-2xl bg-slate-100 border border-slate-200 hover:bg-slate-200 transition"
          aria-label="Toggle sidebar"
          title="Ocultar / mostrar sidebar"
        >
          <Menu size={22} className="text-slate-700" />
        </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={refresh}
          disabled={refreshing}
          className="relative p-3 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          title="Actualizar ERP"
          aria-label="Actualizar ERP"
        >
          {refreshing ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <RefreshCcw size={20} />
          )}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              void requestNativeNotificationPermission();
              const nextOpen = !notificationsOpen;

              if (nextOpen) {
                loadNotifications(true);
              }

              setNotificationsOpen(nextOpen);
            }}
            className="relative p-3 sm:p-4 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.05] active:scale-[0.98] transition-all duration-300 border border-orange-400/50"
            aria-label="Notificaciones"
            title="Ver notificaciones"
          >
            <Bell size={22} className="pointer-events-none" />

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[11px] font-black shadow-lg animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute top-20 right-0 w-[95vw] sm:w-[430px] lg:w-[480px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-[80vh]">
              <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-red-50/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
                    <Bell className="h-6 w-6 text-orange-500" />
                    Notificaciones
                  </h3>

                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="p-2 hover:bg-orange-100 rounded-2xl transition-all duration-200"
                    aria-label="Cerrar"
                  >
                    <X
                      size={22}
                      className="text-slate-500 hover:text-slate-700"
                    />
                  </button>
                </div>

                <p className="text-sm sm:text-base text-slate-600 font-semibold">
                  Haz clic en una notificacion para verla
                </p>
              </div>

              <div className="max-h-[55vh] overflow-y-auto">
                {notificationsLoading ? (
                  <div className="p-8 flex items-center justify-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : notificationsError ? (
                  <div className="p-6 flex items-start gap-3 text-red-600">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold">
                      {notificationsError}
                    </span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    No hay notificaciones.
                  </div>
                ) : (
                  [...notifications]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                    )
                    .map((notification, index) => {
                      const isRead = !!notification.read_at;
                      const title = getNotificationTitle(notification);
                      const description =
                        getNotificationDescription(notification);
                      const tone = getNotificationTone(notification);
                      const createdAt = new Date(notification.created_at);
                      const formattedDate = Number.isNaN(createdAt.getTime())
                        ? ""
                        : createdAt.toLocaleString("es-PE", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "America/Lima",
                          });

                      return (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full p-4 sm:p-5 border-b border-slate-100 last:border-b-0 bg-white hover:bg-gradient-to-r hover:from-emerald-50/80 hover:to-blue-50/80 transition-all duration-300 group text-left ${
                            isRead ? "opacity-80" : ""
                          }`}
                          style={{ animationDelay: `${index * 75}ms` }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div
                                className={`p-3 rounded-2xl shadow-md flex-shrink-0 transition-all duration-300 ${
                                  tone === "success"
                                    ? "bg-emerald-100 text-emerald-600 border border-emerald-200"
                                    : tone === "warning"
                                    ? "bg-orange-100 text-orange-600 border border-orange-200"
                                    : "bg-blue-100 text-blue-600 border border-blue-200"
                                }`}
                              >
                                <Bell size={22} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">
                                  {title}
                                </h4>

                                {description && (
                                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                    {description}
                                  </p>
                                )}

                                <div className="flex items-center gap-2 mt-3">
                                  {formattedDate && (
                                    <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded-lg">
                                      {formattedDate}
                                    </span>
                                  )}

                                  {!isRead && (
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="hidden sm:flex flex-col items-end opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <Eye
                                size={18}
                                className="text-slate-400 group-hover:text-emerald-500 mb-1"
                              />
                              <ArrowRight size={16} className="text-emerald-400" />
                            </div>
                          </div>
                        </button>
                      );
                    })
                )}
              </div>

              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200">
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    onNotificationClick?.("/notificaciones");
                  }}
                  className="w-full flex items-center justify-center gap-3 text-sm sm:text-base font-black text-slate-800 hover:text-emerald-600 py-4 px-6 rounded-2xl hover:bg-white transition-all duration-300 border border-slate-200"
                >
                  Ver todas las notificaciones
                  <ChevronDown size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
