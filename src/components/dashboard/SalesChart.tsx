import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { mes: "Ene", ventas: 4000 },
  { mes: "Feb", ventas: 3000 },
  { mes: "Mar", ventas: 5000 },
  { mes: "Abr", ventas: 4780 },
  { mes: "May", ventas: 5890 },
  { mes: "Jun", ventas: 6390 },
];

export default function SalesChart() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm dark:shadow-slate-900/20 border border-gray-200 dark:border-slate-800">
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Ventas Mensuales
        </h2>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Resumen de ingresos
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip />

          <Line
            type="monotone"
            dataKey="ventas"
            stroke="#2563eb"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>

    </div>
  );
}