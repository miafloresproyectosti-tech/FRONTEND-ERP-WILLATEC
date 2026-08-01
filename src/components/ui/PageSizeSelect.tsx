const DEFAULT_OPTIONS = [5, 10, 25, 50, 100];

interface PageSizeSelectProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  label?: string;
  className?: string;
}

export default function PageSizeSelect({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  label = "Mostrar",
  className = "",
}: PageSizeSelectProps) {
  return (
    <label className={`flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 ${className}`}>
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-950"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span>por página</span>
    </label>
  );
}
