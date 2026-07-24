import { useState } from "react";

import AppRoutes from "./routes/AppRoutes";
import { useAuth } from "./AuthContext";
import { AuditProvider } from "./context/AuditContext";
import { CotizacionesProvider } from "./CotizacionesContext";
import { NotificationProvider } from "./NotificationContext";
import { RefreshProvider } from "./RefreshContext";
import { ThemeProvider } from "./ThemeContext";
import AlertaVencimientos from "./components/AlertaVencimiento";
import ReleaseAnnouncement from "./components/announcements/ReleaseAnnouncement";
import InactivityTimeout from "./components/security/InactivityTimeout";
import type { Hosting, Licencia } from "./types/Licencias";

function App() {
  const { user } = useAuth();
  const [licencias] = useState<Licencia[]>([]);
  const [hostings] = useState<Hosting[]>([]);
  const [alertasDismissed, setAlertasDismissed] = useState(false);

  const esSuperadmin = user?.role === "SUPERADMIN";
  const debeMostrarAlerta =
    esSuperadmin &&
    !alertasDismissed &&
    (licencias.length > 0 || hostings.length > 0);

  return (
    <ThemeProvider>
      <RefreshProvider>
        <AuditProvider>
          <CotizacionesProvider>
            <NotificationProvider>
                <InactivityTimeout />
                <ReleaseAnnouncement />
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
