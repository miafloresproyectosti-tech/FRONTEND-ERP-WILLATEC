import React from "react";
import { CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";
import type { Toast, NotificationType } from "./NotificationContext";

const config: Record<
  NotificationType,
  { icon: React.ReactElement; bar: string; bg: string }
> = {
  success: {
    icon: <CheckCircle size={18} className="text-emerald-500" />,
    bar: "bg-emerald-500",
    bg: "bg-white",
  },
  warning: {
    icon: <AlertTriangle size={18} className="text-amber-500" />,
    bar: "bg-amber-500",
    bg: "bg-white",
  },
  error: {
    icon: <XCircle size={18} className="text-red-500" />,
    bar: "bg-red-500",
    bg: "bg-white",
  },
  info: {
    icon: <Info size={18} className="text-blue-500" />,
    bar: "bg-blue-500",
    bg: "bg-white",
  },
};

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;

  return (
<div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 items-center">
      {toasts.map((toast) => {
        const { icon, bar, bg } = config[toast.type];
        return (
          <div
            key={toast.id}
            className={`${bg} w-96 rounded-xl shadow-2xl border border-gray-100 overflow-hidden
              animate-in slide-in-from-top-4 fade-in duration-300`}
          >
            <div className={`h-1 w-full ${bar}`} />
            <div className="flex items-start gap-3 px-5 py-4">
              <div className="mt-0.5 shrink-0">{icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {toast.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
