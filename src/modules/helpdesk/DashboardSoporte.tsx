import StatCard from "../../components/ui/StatCard";
import { 
  Ticket, 
  Clock, 
  ShieldCheck 
} from "lucide-react";

import TicketsChart from "../../components/dashboard/TicketsChart";
import RecentTickets from "../../components/dashboard/RecentTickets";

export default function DashboardSoporte() {
  return (
    <div className="space-y-6">
      
      {/* Header - SIN RefreshContext */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Soporte TI
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Panel de tickets y métricas
            </p>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Actualizado: hace 2 minutos
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Tickets Abiertos"
          value="23"
          subtitle="En espera"
          icon={<Ticket />}
          color="from-red-500 to-red-600"
        />
        <StatCard
          title="En Proceso"
          value="17"
          subtitle="Activos"
          icon={<Clock />}
          color="from-yellow-500 to-yellow-600"
        />
        <StatCard
          title="Resueltos Hoy"
          value="45"
          subtitle="Completados"
          icon={<ShieldCheck />}
          color="from-green-500 to-green-600"
        />
      </div>

      {/* Sección inferior */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TicketsChart />
        </div>
        <div>
          <RecentTickets />
        </div>
      </div>

    </div>
  );
}