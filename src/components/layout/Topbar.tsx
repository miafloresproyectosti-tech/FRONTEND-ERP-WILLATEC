import { useState, useRef, useEffect } from "react";

import {
  Bell,
  X,
  ChevronDown,
  ArrowRight,
  Eye,
  CheckCircle,
  MessageCircle,
  Package,
  UserCheck,
  Send,
  RefreshCcw,
  Loader2,
  Menu,
} from "lucide-react";

import { useNotifications } from "../../NotificationContext";
import { useRefresh } from "../../RefreshContext";

interface TopbarProps {
  onNotificationClick?: (route: string) => void;
  onMenuClick?: () => void;
}

export default function Topbar({
  onNotificationClick,
  onMenuClick,
}: TopbarProps) {

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, markRead } = useNotifications();

  const { refreshing, refresh } = useRefresh();

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  // CLOSE DROPDOWN
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

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  // REDIRECT
  const handleNotificationClick = (notification: {
    id: number;
    title: string;
    description: string;
    time: string;
    type: string;
    icon: any;
    route: string;
  }) => {

    setNotificationsOpen(false);

    markRead(notification.id);

    if (onNotificationClick) {
      onNotificationClick(notification.route);
      return;
    }

    window.location.href = notification.route;
  };

  return (

    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

      {/* LEFT */}
      <div className="flex items-center gap-3">

        {/* MOBILE MENU */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-3 rounded-2xl bg-slate-100 border border-slate-200 hover:bg-slate-200 transition"
        >

          <Menu size={22} className="text-slate-700" />

        </button>

      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3 sm:gap-4">

        {/* REFRESH */}
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

        {/* NOTIFICATIONS */}
        <div className="relative" ref={dropdownRef}>

          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-3 sm:p-4 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.05] active:scale-[0.98] transition-all duration-300 border border-orange-400/50"
            aria-label="Notificaciones"
            title="Ver notificaciones"
          >

            <Bell size={22} className="pointer-events-none" />

            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[11px] font-black shadow-lg animate-pulse">
              {unreadCount}
            </span>

          </button>

          {/* DROPDOWN */}
          {notificationsOpen && (

            <div className="absolute top-20 right-0 w-[95vw] sm:w-[430px] lg:w-[480px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-[80vh]">

              {/* HEADER */}
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

                    <X size={22} className="text-slate-500 hover:text-slate-700" />

                  </button>

                </div>

                <p className="text-sm sm:text-base text-slate-600 font-semibold">
                  Haz clic en una notificación para verla
                </p>

              </div>

              {/* LIST */}
              <div className="max-h-[55vh] overflow-y-auto">

                {notifications.length === 0 ? (

                  <div className="p-8 text-center text-slate-500">
                    No hay notificaciones para tu rol.
                  </div>

                ) : (

                  [...notifications]
                    .sort((a, b) => b.id - a.id)
                    .map((notification, index) => {

                      const iconMap = {
                        CheckCircle,
                        MessageCircle,
                        Package,
                        UserCheck,
                        Send,
                      } as const;

                      const Icon =
                        iconMap[
                          notification.icon as keyof typeof iconMap
                        ] ?? CheckCircle;

                      return (

                        <button
                          key={notification.id}
                          onClick={() =>
                            handleNotificationClick(notification)
                          }
                          className={`w-full p-4 sm:p-5 border-b border-slate-100 last:border-b-0 bg-white hover:bg-gradient-to-r hover:from-emerald-50/80 hover:to-blue-50/80 transition-all duration-300 group text-left ${
                            notification.read ? "opacity-80" : ""
                          }`}
                          style={{
                            animationDelay: `${index * 75}ms`,
                          }}
                        >

                          <div className="flex items-start justify-between gap-3">

                            <div className="flex items-start gap-3 flex-1 min-w-0">

                              <div
                                className={`p-3 rounded-2xl shadow-md flex-shrink-0 transition-all duration-300 ${
                                  notification.type === "success"
                                    ? "bg-emerald-100 text-emerald-600 border border-emerald-200"
                                    : notification.type === "warning"
                                    ? "bg-orange-100 text-orange-600 border border-orange-200"
                                    : "bg-blue-100 text-blue-600 border border-blue-200"
                                }`}
                              >

                                <Icon size={22} />

                              </div>

                              <div className="flex-1 min-w-0">

                                <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">
                                  {notification.title}
                                </h4>

                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                  {notification.description}
                                </p>

                                <div className="flex items-center gap-2 mt-3">

                                  <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded-lg">
                                    {notification.time} atrás
                                  </span>

                                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>

                                </div>

                              </div>

                            </div>

                            <div className="hidden sm:flex flex-col items-end opacity-0 group-hover:opacity-100 transition-all duration-300">

                              <Eye
                                size={18}
                                className="text-slate-400 group-hover:text-emerald-500 mb-1"
                              />

                              <ArrowRight
                                size={16}
                                className="text-emerald-400"
                              />

                            </div>

                          </div>

                        </button>
                      );
                    })
                )}

              </div>

              {/* FOOTER */}
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