import { createContext, useContext, useState, type ReactNode } from "react";

interface RefreshContextType {
  refreshing: boolean;
  refreshCount: number;
  lastSync: string;
  refresh: () => Promise<void>;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastSync, setLastSync] = useState("Nunca");

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshCount((count) => count + 1);
    window.dispatchEvent(new CustomEvent("erp:refresh", { detail: { source: "manual", timestamp: Date.now() } }));

    const backendUrl = import.meta.env.VITE_API_BASE_URL;
    if (backendUrl) {
      try {
        await fetch(`${backendUrl}/erp/refresh`, {
          cache: "no-store",
          method: "GET",
        });
      } catch (error) {
        console.debug("Refresh backend sync no disponible:", error);
      }
    }

    setLastSync(new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    window.dispatchEvent(new CustomEvent("erp:refreshed", { detail: { timestamp: Date.now() } }));
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <RefreshContext.Provider value={{ refreshing, refreshCount, lastSync, refresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error("useRefresh debe usarse dentro de RefreshProvider");
  }
  return context;
}
