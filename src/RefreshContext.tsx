import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import api from "./services/api";

type RefreshSource = "manual" | "auto" | "focus" | "online";

interface RefreshContextType {
  refreshing: boolean;
  refreshCount: number;
  lastSync: string | null;
  refresh: () => Promise<void>;
}

const AUTO_REFRESH_INTERVAL_MS = 15_000;
const MIN_VISIBLE_REFRESH_INTERVAL_MS = 5_000;

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const refreshingRef = useRef(false);
  const lastRefreshAtRef = useRef(0);

  const runRefresh = useCallback(async (source: RefreshSource = "manual") => {
    if (refreshingRef.current) return;

    refreshingRef.current = true;
    setRefreshing(true);
    setRefreshCount((count) => count + 1);
    window.dispatchEvent(
      new CustomEvent("erp:refresh", {
        detail: { source, timestamp: Date.now() },
      })
    );

    try {
      await api.get("/erp/refresh", {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      console.debug("Refresh backend sync no disponible:", error);
    }

    lastRefreshAtRef.current = Date.now();
    setLastSync(new Date().toISOString());
    window.dispatchEvent(
      new CustomEvent("erp:refreshed", {
        detail: { source, timestamp: lastRefreshAtRef.current },
      })
    );

    window.setTimeout(
      () => {
        refreshingRef.current = false;
        setRefreshing(false);
      },
      source === "manual" ? 800 : 250
    );
  }, []);

  const refresh = useCallback(() => runRefresh("manual"), [runRefresh]);

  useEffect(() => {
    const refreshWhenVisible = (source: RefreshSource) => {
      if (document.hidden) return;
      if (Date.now() - lastRefreshAtRef.current < MIN_VISIBLE_REFRESH_INTERVAL_MS) {
        return;
      }

      void runRefresh(source);
    };

    const intervalId = window.setInterval(
      () => refreshWhenVisible("auto"),
      AUTO_REFRESH_INTERVAL_MS
    );
    const handleFocus = () => refreshWhenVisible("focus");
    const handleVisibilityChange = () => refreshWhenVisible("focus");
    const handleOnline = () => refreshWhenVisible("online");

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [runRefresh]);

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
