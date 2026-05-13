import AppRoutes from "./routes/AppRoutes";
import { ThemeProvider } from "./ThemeContext";
import { RefreshProvider } from "./RefreshContext";
import { NotificationProvider } from "./NotificationContext";
import { CotizacionesProvider } from "./CotizacionesContext";
import { AuditProvider } from "./context/AuditContext";

function App() {
  return (
    <ThemeProvider>
      <RefreshProvider>
        <AuditProvider>
          <CotizacionesProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </CotizacionesProvider>
        </AuditProvider>
      </RefreshProvider>
    </ThemeProvider>
  );
}

export default App;