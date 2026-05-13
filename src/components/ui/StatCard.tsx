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
        rounded-3xl
        p-6
        text-white
        shadow-lg
        hover:scale-[1.02]
        transition-all
        duration-300
      `}
    >
      <div className="flex items-center justify-between mb-6">
        
        <div className="bg-white/20 p-3 rounded-2xl">
          {icon}
        </div>

        <div className="w-10 h-10 rounded-2xl bg-white/10"></div>
      </div>

      <div>
        <p className="text-sm text-white/80 mb-1">
          {title}
        </p>

        <h2 className="text-3xl font-bold mb-2">
          {value}
        </h2>

        <p className="text-sm text-white/70">
          {subtitle}
        </p>
      </div>
    </div>
  );
}