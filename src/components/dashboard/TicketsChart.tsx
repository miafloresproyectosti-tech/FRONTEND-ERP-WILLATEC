export default function TicketsChart() {
  return (
    <div className="h-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Tickets por Semana
        </h2>
      </div>

      <div className="flex h-[220px] items-end justify-between gap-3">
        
        {[40, 70, 55, 90, 60, 80, 45].map((height, index) => (
          <div
            key={index}
            className="flex-1 bg-blue-500 rounded-t-2xl"
            style={{ height: `${height}%` }}
          />
        ))}

      </div>

    </div>
  );
}
