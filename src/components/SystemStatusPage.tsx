import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Home,
  RefreshCw,
  SearchX,
  ServerCrash,
} from "lucide-react";

export type SystemStatusKind = "maintenance" | "server-error" | "not-found";

const STATUS_CONFIG: Record<SystemStatusKind, {
  code: string;
  title: string;
  description: string;
  badgeClass: string;
  iconClass: string;
}> = {
  maintenance: {
    code: "Mantenimiento",
    title: "Estamos realizando mejoras",
    description: "El ERP se encuentra temporalmente en mantenimiento. Intenta nuevamente en unos minutos.",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    iconClass: "border-amber-200 bg-amber-50 text-amber-600",
  },
  "server-error": {
    code: "Error del sistema",
    title: "Algo salió mal",
    description: "Ocurrió un error interno. Intenta nuevamente más tarde o vuelve al inicio.",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
    iconClass: "border-red-200 bg-red-50 text-red-600",
  },
  "not-found": {
    code: "Error 404",
    title: "No encontramos esta página",
    description: "La dirección puede haber cambiado o la página ya no está disponible.",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    iconClass: "border-blue-200 bg-blue-50 text-blue-600",
  },
};

export default function SystemStatusPage({ kind }: { kind: SystemStatusKind }) {
  const config = STATUS_CONFIG[kind];
  const Icon = kind === "maintenance" ? ServerCrash : kind === "not-found" ? SearchX : AlertTriangle;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8fc] px-4 py-10 text-slate-900">
      <div className="w-full max-w-xl text-center">
        <img
          src="/logo_willatec.png"
          alt="Willatec"
          className="mx-auto mb-10 h-auto w-52 object-contain"
        />

        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-14">
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border ${config.iconClass}`}>
            <Icon size={38} strokeWidth={1.8} />
          </div>

          <span className={`mt-6 inline-flex rounded-full border px-4 py-1.5 text-sm font-semibold ${config.badgeClass}`}>
            {config.code}
          </span>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {config.title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-7 text-slate-500">
            {config.description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <RefreshCw size={17} />
              Intentar nuevamente
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={17} />
              Volver
            </button>
            {kind === "not-found" && (
              <button
                type="button"
                onClick={() => window.location.assign("/")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Home size={17} />
                Inicio
              </button>
            )}
          </div>
        </section>

        <p className="mt-8 inline-flex items-center gap-2 text-sm text-slate-500">
          <CheckCircle2 size={16} className="text-[#22a7df]" />
          Soporte Willatec
        </p>
      </div>
    </main>
  );
}
