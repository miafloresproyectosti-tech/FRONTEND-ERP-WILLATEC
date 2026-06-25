import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import api from "./services/api";

interface RefreshContextType {
  refreshing: boolean;
  refreshCount: number;
  lastSync: string | null;
  refresh: () => Promise<void>;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const refreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;

    refreshingRef.current = true;
    setRefreshing(true);
    setRefreshCount((count) => count + 1);
    window.dispatchEvent(
      new CustomEvent("erp:refresh", {
        detail: { source: "manual", timestamp: Date.now() },
      })
    );

    try {
      await api.get("/erp/refresh", {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      console.debug("Refresh backend sync no disponible:", error);
    }

    const timestamp = Date.now();
    setLastSync(new Date().toISOString());
    window.dispatchEvent(
      new CustomEvent("erp:refreshed", {
        detail: { source: "manual", timestamp },
      })
    );

    window.setTimeout(
      () => {
        refreshingRef.current = false;
        setRefreshing(false);
      },
      800
    );
  }, []);

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
