export default function RecentTickets() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm h-fit">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        Tickets Recientes
      </h3>
      
      <div className="space-y-4">
        <div className="group p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
              Alta
            </span>
            <span className="text-xs font-mono text-slate-500">#1245</span>
          </div>
          <h4 className="font-medium text-slate-900 dark:text-white text-sm group-hover:text-blue-600">
            Impresora corporativa no responde
          </h4>
          <p className="text-xs text-slate-500 mt-1">Ventas - Lima</p>
          <p className="text-xs text-slate-500">hace 3h</p>
        </div>

        <div className="group p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
              Media
            </span>
            <span className="text-xs font-mono text-slate-500">#1244</span>
          </div>
          <h4 className="font-medium text-slate-900 dark:text-white text-sm group-hover:text-blue-600">
            Error conexión VPN remota
          </h4>
          <p className="text-xs text-slate-500 mt-1">TI - Arequipa</p>
          <p className="text-xs text-slate-500">hace 5h</p>
        </div>

        <div className="group p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              Resuelto
            </span>
            <span className="text-xs font-mono text-slate-500">#1243</span>
          </div>
          <h4 className="font-medium text-slate-900 dark:text-white text-sm group-hover:text-blue-600">
            Licencia Office 365 vencida
          </h4>
          <p className="text-xs text-slate-500 mt-1">RRHH - Trujillo</p>
          <p className="text-xs text-slate-500">hace 8h</p>
        </div>
      </div>
    </div>
  );
}