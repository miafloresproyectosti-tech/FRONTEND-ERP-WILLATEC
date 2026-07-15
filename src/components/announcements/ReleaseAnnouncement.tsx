import { CheckCircle2, Clock3, PackageCheck, RotateCcw, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../../AuthContext";

const ANNOUNCEMENT_KEY = "erp_release_notes_2026_07_15_inventory_security_v1";

const updates = [
  {
    icon: Clock3,
    title: "Cierre por inactividad",
    description: "El sistema avisara antes de cerrar sesion y protegera el acceso si no hay actividad.",
  },
  {
    icon: PackageCheck,
    title: "OC con series mas seguras",
    description: "Al entregar productos seriados ahora se valida y conserva la serie exacta asociada.",
  },
  {
    icon: ShieldCheck,
    title: "Cancelacion de OC recibidas",
    description: "Las OC no atendidas pueden cancelarse liberando reservas de inventario.",
  },
  {
    icon: RotateCcw,
    title: "Devoluciones en Kardex",
    description: "Las entradas ahora diferencian compra nueva y devolucion de cliente.",
  },
];

export default function ReleaseAnnouncement() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setOpen(false);
      return;
    }

    if (localStorage.getItem(ANNOUNCEMENT_KEY) !== "seen") {
      setOpen(true);
    }
  }, [user]);

  const close = () => {
    localStorage.setItem(ANNOUNCEMENT_KEY, "seen");
    setOpen(false);
  };

  if (!user || !open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative bg-slate-950 px-6 py-6 text-white">
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Cerrar anuncio"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-950/30">
              <CheckCircle2 size={25} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-200">
                Willatec ERP
              </p>
              <h2 className="mt-1 text-2xl font-black">Novedades del sistema</h2>
            </div>
          </div>

          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            Activamos mejoras de seguridad, control de inventario y trazabilidad para que las operaciones queden mas claras.
          </p>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {updates.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{item.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-500">
              Este aviso se mostrara solo una vez en este navegador.
            </p>
            <button
              type="button"
              onClick={close}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
