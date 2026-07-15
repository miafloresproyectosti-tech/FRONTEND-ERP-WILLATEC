import AppRoutes from "./routes/AppRoutes";
import { ThemeProvider } from "./ThemeContext";
import { RefreshProvider } from "./RefreshContext";
import { NotificationProvider } from "./NotificationContext";
import { CotizacionesProvider } from "./CotizacionesContext";
import { AuditProvider } from "./context/AuditContext";
import InactivityTimeout from "./components/security/InactivityTimeout";
import ReleaseAnnouncement from "./components/announcements/ReleaseAnnouncement";

function App() {
  return (
    <ThemeProvider>
      <RefreshProvider>
        <AuditProvider>
          <CotizacionesProvider>
            <NotificationProvider>
              <InactivityTimeout />
              <ReleaseAnnouncement />
              <AppRoutes />
            </NotificationProvider>
          </CotizacionesProvider>
        </AuditProvider>
      </RefreshProvider>
    </ThemeProvider>
  );
}

export default App;
