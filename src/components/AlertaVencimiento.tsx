import { useState, useEffect } from "react";
import { AlertCircle, Clock, X } from "lucide-react";
import type { Licencia, Hosting } from "../types/Licencias";

interface AlertaVencimientosProps {
  licencias: Licencia[];
  hostings: Hosting[];
  esSuperadmin: boolean;
  onDismiss: () => void;
}

export default function AlertaVencimientos({ 
  licencias, 
  hostings, 
  esSuperadmin, 
  onDismiss 
}: AlertaVencimientosProps) {
  const [mostrar, setMostrar] = useState(false);

  const diasRestantes = (fecha: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    return Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  const alertasLicencias = licencias
    .filter(l => diasRestantes(l.fechaRenovacion) > 0 && diasRestantes(l.fechaRenovacion) <= 15)
    .map(l => ({
      tipo: 'LICENCIA' as const,
      empresa: l.empresa,
      item: l.producto,
      diasRestantes: diasRestantes(l.fechaRenovacion),
      fechaRenovacion: l.fechaRenovacion,
      id: l.id
    }));

  const alertasHosting = hostings
    .filter(h => diasRestantes(h.fechaRenovacion) > 0 && diasRestantes(h.fechaRenovacion) <= 15)
    .map(h => ({
      tipo: 'HOSTING' as const,
      empresa: h.empresa,
      item: h.dominio,
      diasRestantes: diasRestantes(h.fechaRenovacion),
      fechaRenovacion: h.fechaRenovacion,
      id: h.id
    }));

  const todasAlertas = [...alertasLicencias, ...alertasHosting];

  useEffect(() => {
    if (esSuperadmin && todasAlertas.length > 0) {
      const timer = setTimeout(() => {
        setMostrar(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [esSuperadmin, todasAlertas.length]);

  if (!mostrar || !esSuperadmin || todasAlertas.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md w-full">
      <div className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white p-6 rounded-2xl shadow-2xl border border-yellow-400 animate-in slide-in-from-top duration-500">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">¡Alertas de vencimiento!</h3>
              <p className="text-yellow-100 text-sm mt-1">
                {todasAlertas.length} {todasAlertas.length === 1 ? 'elemento' : 'elementos'} por vencer
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setMostrar(false);
              onDismiss();
            }}
            className="p-1.5 hover:bg-white/20 rounded-full transition-all hover:scale-110"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {todasAlertas.map((alerta: any) => (
            <div key={alerta.id} className="flex items-start gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20">
              <Clock size={18} className="text-yellow-200 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{alerta.empresa}</p>
                <p className="text-xs text-yellow-100 truncate">
                  {alerta.tipo === 'LICENCIA' ? 'Licencia: ' : 'Hosting: '}
                  <span className="font-medium">{alerta.item}</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 text-xs rounded-full font-mono font-bold ${
                    alerta.diasRestantes <= 3 ? 'bg-red-500' : 'bg-yellow-500'
                  }`}>
                    {alerta.diasRestantes}d
                  </span>
                  <span className="text-xs opacity-90">
                    {new Date(alerta.fechaRenovacion).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-white/20 flex gap-2">
          <button
            onClick={() => {
              setMostrar(false);
              onDismiss();
            }}
            className="flex-1 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium hover:bg-white/30 transition-all"
          >
            Cerrar
          </button>
          <button
            onClick={() => window.open('/servicios/licencias', '_blank')}
            className="flex-1 px-4 py-2 bg-white text-orange-600 rounded-lg text-sm font-bold hover:bg-white/90 shadow-lg hover:shadow-xl transition-all"
          >
            Ver Todos
          </button>
        </div>

        <div className="mt-3 pt-3 border-t border-white/20">
          <button
            onClick={() => {
              localStorage.setItem('alertasVencimientosDismissed', new Date().toDateString());
              setMostrar(false);
              onDismiss();
            }}
            className="w-full text-xs text-yellow-100 hover:text-white py-1 underline hover:no-underline transition-colors text-center"
          >
            No mostrar alertas hoy
          </button>
        </div>
      </div>
    </div>
  );
}
