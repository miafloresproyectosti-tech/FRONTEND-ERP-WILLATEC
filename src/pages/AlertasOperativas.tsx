import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

import { getAlertasOperativas } from "../services/contabilidad.service";

const toneByCode: Record<string, string> = {
  cxp_vencida: "border-red-200 bg-red-50 text-red-800",
  cxc_vencida: "border-red-200 bg-red-50 text-red-800",
  compra_confirmada_sin_recepcion: "border-amber-200 bg-amber-50 text-amber-800",
  compra_parcialmente_recibida: "border-amber-200 bg-amber-50 text-amber-800",
  documento_cliente_pendiente: "border-blue-200 bg-blue-50 text-blue-800",
};

export default function AlertasOperativas() {
  const [items, setItems] = useState<Array<{ codigo: string; titulo: string; total: number }>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRows = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAlertasOperativas();
      setItems(response.data || []);
      setTotal(response.total_alertas || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudieron cargar las alertas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-700">Operaciones</p>
            <h1 className="text-2xl font-bold text-slate-900">Alertas operativas</h1>
            <p className="text-sm text-slate-500">Indicadores para Logistica, Compras y Contabilidad.</p>
          </div>
          <button onClick={fetchRows} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Actualizar
          </button>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total de puntos por revisar</p>
              <p className="text-3xl font-bold text-slate-900">{total}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-center text-slate-500">
              <Loader2 className="mx-auto mb-2 animate-spin" /> Cargando...
            </div>
          ) : (
            items.map((item) => (
              <div key={item.codigo} className={`rounded-2xl border p-5 shadow-sm ${toneByCode[item.codigo] || "border-slate-200 bg-white text-slate-800"}`}>
                <p className="text-sm font-semibold uppercase opacity-70">{item.codigo.replace(/_/g, " ")}</p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <h2 className="text-base font-bold">{item.titulo}</h2>
                  <span className="text-3xl font-bold">{item.total}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
