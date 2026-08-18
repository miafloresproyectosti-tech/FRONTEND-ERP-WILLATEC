import { useEffect, useState } from "react";

import AppRoutes from "./routes/AppRoutes";
import { useAuth } from "./AuthContext";
import { AuditProvider } from "./context/AuditContext";
import { CotizacionesProvider } from "./CotizacionesContext";
import { NotificationProvider } from "./NotificationContext";
import { RefreshProvider } from "./RefreshContext";
import { ThemeProvider } from "./ThemeContext";
import AlertaVencimientos from "./components/AlertaVencimiento";
import InactivityTimeout from "./components/security/InactivityTimeout";
import { getAllHostings } from "./services/hosting.service";
import { getAllLicencias } from "./services/licencia.service";
import type { Hosting, Licencia } from "./types/Licencias";

function App() {
  const { user } = useAuth();
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [hostings, setHostings] = useState<Hosting[]>([]);
  const [alertasDismissed, setAlertasDismissed] = useState(false);

  const esSuperadmin = user?.role === "SUPERADMIN";
  const debeMostrarAlerta =
    esSuperadmin &&
    !alertasDismissed &&
    (licencias.length > 0 || hostings.length > 0);

  useEffect(() => {
    const dismissedToday =
      localStorage.getItem("alertasVencimientosDismissed") === new Date().toDateString();
    setAlertasDismissed(dismissedToday);
  }, []);

  useEffect(() => {
    if (!esSuperadmin || alertasDismissed) return;

    let cancelled = false;

    const loadServicios = async () => {
      try {
        const [licenciasData, hostingsData] = await Promise.all([
          getAllLicencias(),
          getAllHostings(),
        ]);

        if (cancelled) return;

        setLicencias(
          licenciasData.map((licencia) => ({
            id: licencia.id,
            empresa: licencia.empresa,
            producto: licencia.producto,
            cantidad: Number(licencia.cantidad || 0),
            suscripcion: "ANUAL",
            fechaCompra: licencia.fecha_inicio,
            fechaRenovacion: licencia.fecha_renovacion,
            estado: "VIGENTE",
          }))
        );
        setHostings(
          hostingsData.map((hosting) => ({
            id: hosting.id,
            empresa: hosting.empresa,
            ruc: hosting.ruc || "",
            dominio: hosting.dominio,
            plan: hosting.plan,
            suscripcion: hosting.suscripcion,
            fechaInicio: hosting.fecha_inicio,
            fechaRenovacion: hosting.fecha_renovacion,
            contacto: hosting.contacto || "",
            cliente: hosting.cliente || hosting.cliente_relacionado?.nombre || "",
            estado: "VIGENTE",
          }))
        );
      } catch (error) {
        console.error("Error al cargar alertas de servicios:", error);
      }
    };

    void loadServicios();

    return () => {
      cancelled = true;
    };
  }, [alertasDismissed, esSuperadmin]);

  return (
    <ThemeProvider>
      <RefreshProvider>
        <AuditProvider>
          <CotizacionesProvider>
            <NotificationProvider>
                <InactivityTimeout />
                {debeMostrarAlerta && (
                  <AlertaVencimientos
                    licencias={licencias}
                    hostings={hostings}
                    esSuperadmin={esSuperadmin}
                    onDismiss={() => {
                      localStorage.setItem(
                        "alertasVencimientosDismissed",
                        new Date().toDateString()
                      );
                      setAlertasDismissed(true);
                    }}
                  />
                )}
                <AppRoutes />
            </NotificationProvider>
          </CotizacionesProvider>
        </AuditProvider>
      </RefreshProvider>
    </ThemeProvider>
  );
}

export default App;
