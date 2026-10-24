import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

import { getAlertasOperativas } from "../../services/contabilidad.service";

type AlertaOperativa = {
  codigo: string;
  titulo: string;
  total: number;
  action_url?: string;
  severidad?: "urgent" | "warning" | "info";
};

const tone: Record<string, string> = {
  urgent: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export default function AlertasOperativasSummary({
  codes,
}: {
  codes?: string[];
}) {
  const [items, setItems] = useState<AlertaOperativa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAlertasOperativas()
      .then((response) => {
        if (cancelled) return;
        const active = (response.data || []).filter((item) => item.total > 0);
        setItems(codes?.length ? active.filter((item) => codes.includes(item.codigo)) : active);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [codes?.join(",")]);

  if (loading) {
    return <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Revisando pendientes operativos...</div>;
  }

  if (!items.length) return null;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.codigo}
          to={item.action_url || "/operaciones/alertas"}
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${tone[item.severidad || "info"]}`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <AlertTriangle size={17} className="shrink-0" />
            <span><strong>{item.total}</strong> {item.titulo.toLowerCase()}</span>
          </span>
          <ArrowRight size={16} className="shrink-0" />
        </Link>
      ))}
    </div>
  );
}
