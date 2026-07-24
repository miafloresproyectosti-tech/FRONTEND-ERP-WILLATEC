export default function TicketsChart() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 h-[350px]">
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Tickets por Semana
        </h2>
      </div>

      <div className="h-[240px] flex items-end justify-between gap-3">
        
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