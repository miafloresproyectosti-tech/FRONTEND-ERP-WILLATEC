import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
    window.location.reload();
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
