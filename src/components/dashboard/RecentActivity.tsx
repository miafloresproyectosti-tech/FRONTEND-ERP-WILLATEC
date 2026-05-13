import { useMemo } from "react";
import { useAudit } from "../../context/AuditContext";

export default function RecentActivity() {
  const { logs } = useAudit();
  const recentLogs = useMemo(() => logs.slice(0, 5), [logs]);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm dark:shadow-slate-900/20 border border-gray-200 dark:border-slate-800">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Actividad Reciente
        </h2>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Últimos movimientos del sistema
        </p>
      </div>

      <div className="space-y-4">
        {recentLogs.length === 0 ? (
          <div className="text-gray-500 text-sm">
            No hay actividad registrada todavía.
          </div>
        ) : (
          recentLogs.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-900 transition"
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
