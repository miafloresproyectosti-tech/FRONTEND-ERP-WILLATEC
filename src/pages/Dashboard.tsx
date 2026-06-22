import StatCard from "../components/ui/StatCard";
import { DollarSign, Users, FileText } from "lucide-react";
import { useRefresh } from "../RefreshContext";

import SalesChart from "../components/dashboard/SalesChart";
import RecentActivity from "../components/dashboard/RecentActivity";

export default function Dashboard() {
  const { refreshCount, lastSync } = useRefresh();
  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Lima",
    })
    : "Nunca";

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Dashboard
            </h1>

            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Resumen general del sistema
            </p>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Actualizado: {refreshCount === 0 ? "Nunca" : lastSyncLabel}
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <StatCard
          title="Ventas del Mes"
          value="S/. 61,000"
          subtitle="+27% este mes"
          icon={<DollarSign />}
          color="from-blue-500 to-blue-600"
        />

        <StatCard
          title="Clientes"
          value="124"
          subtitle="Activos"
          icon={<Users />}
          color="from-purple-500 to-purple-600"
        />

        <StatCard
          title="Cotizaciones"
          value="12"
          subtitle="Pendientes"
          icon={<FileText />}
          color="from-green-500 to-green-600"
        />

      </div>

      {/* Sección inferior */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Gráfico */}
        <div className="xl:col-span-2">
          <SalesChart />
        </div>

        {/* Actividad */}
        <div>
          <RecentActivity />
        </div>

      </div>

    </div>
  );
}
