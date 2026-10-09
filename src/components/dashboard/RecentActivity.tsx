import { useMemo } from "react";
import { useAudit } from "../../context/AuditContext";

export default function RecentActivity() {
  const { logs } = useAudit();
  const recentLogs = useMemo(() => logs.slice(0, 5), [logs]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:shadow-slate-900/20">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Actividad Reciente
        </h2>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Últimos movimientos del sistema
        </p>
      </div>

      <div className="space-y-3">
        {recentLogs.length === 0 ? (
          <div className="text-gray-500 text-sm">
            No hay actividad registrada todavía.
          </div>
        ) : (
          recentLogs.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between rounded-xl bg-gray-50 p-3 transition hover:bg-gray-100 dark:bg-slate-950 dark:hover:bg-slate-900"
            >
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100">
                  {activity.accion}
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {activity.usuario} · {activity.modulo}
                </p>
              </div>

              <span className="text-sm text-slate-500 dark:text-slate-400">
                {activity.fecha}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
