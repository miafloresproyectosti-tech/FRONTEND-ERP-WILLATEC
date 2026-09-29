import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  color: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: StatCardProps) {
  return (
    <div
      className={`
        bg-gradient-to-br ${color}
        rounded-2xl
        p-4
        text-white
        shadow-lg
        hover:scale-[1.02]
        transition-all
        duration-300
      `}
    >
      <div className="mb-4 flex items-center justify-between">
        
        <div className="rounded-xl bg-white/20 p-2.5">
          {icon}
        </div>

        <div className="h-9 w-9 rounded-xl bg-white/10"></div>
      </div>

      <div>
        <p className="text-sm text-white/80 mb-1">
          {title}
        </p>

        <h2 className="mb-1 text-2xl font-bold">
          {value}
        </h2>

        <p className="text-sm text-white/70">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
