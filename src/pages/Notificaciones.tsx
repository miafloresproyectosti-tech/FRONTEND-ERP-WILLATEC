import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Loader, AlertCircle, CheckCircle2 } from "lucide-react";
import { notificationService, type DatabaseNotification } from "../services/notification.service";
import {
  getNotificationDescription,
  getNotificationTone,
  getNotificationTitle,
} from "../utils/notificationText";

export default function Notificaciones() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<DatabaseNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    notificationService
      .getNotifications()
      .then((data) => {
        if (!cancelled) {
          setNotifications(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError("Error al cargar notificaciones");
        }

        console.error(err);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleNotificationClick = async (notification: DatabaseNotification) => {
    const isRead = !!notification.read_at;

    if (!isRead) {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, read_at: new Date().toISOString() }
              : n
          )
        );
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }

    navigate(notification.data.action_url || "/notificaciones");
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-slate-900 dark:text-white" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Notificaciones
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {unreadCount > 0
                ? `${unreadCount} no leída${unreadCount !== 1 ? "s" : ""}`
                : "Todas leídas"}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Marcar todo como leído
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-6 w-6 text-blue-600 animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Bell className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            No hay notificaciones
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isRead = !!notification.read_at;
            const title = getNotificationTitle(notification);
            const description = getNotificationDescription(notification);
            const tone = getNotificationTone(notification);
            const unreadToneClasses =
              tone === "success"
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-l-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                : tone === "warning"
                  ? "bg-amber-50 dark:bg-amber-900/20 border-l-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  : "bg-blue-50 dark:bg-blue-900/20 border-l-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30";
            const unreadIconClass =
              tone === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : tone === "warning"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-blue-600 dark:text-blue-400";
            const unreadDotClass =
              tone === "success"
                ? "bg-emerald-600"
                : tone === "warning"
                  ? "bg-amber-600"
                  : "bg-blue-600";
            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all ${
                  isRead
                    ? "bg-slate-50 dark:bg-slate-800 border-l-slate-300 dark:border-l-slate-600"
                    : unreadToneClasses
                }`}
              >
                <div className="flex items-start gap-3">
                  {isRead ? (
                    <CheckCircle2 className="h-5 w-5 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Bell className={`h-5 w-5 ${unreadIconClass} flex-shrink-0 mt-0.5`} />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`font-semibold ${
                          isRead
                            ? "text-slate-700 dark:text-slate-300"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {title}
                      </h3>
                      {!isRead && (
                        <span className={`flex-shrink-0 inline-block h-2 w-2 rounded-full ${unreadDotClass}`} />
                      )}
                    </div>

                    {description && (
                      <p
                        className={`text-sm mt-1 ${
                          isRead
                            ? "text-slate-600 dark:text-slate-400"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {description}
                      </p>
                    )}

                    <p className="text-xs mt-2 text-slate-500 dark:text-slate-400">
                      {new Date(notification.created_at).toLocaleDateString(
                        "es-ES",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "America/Lima",
                        }
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
