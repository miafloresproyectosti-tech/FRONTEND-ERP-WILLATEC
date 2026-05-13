import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface AuditLog {
  id: number;
  usuario: string;
  rol: string;
  accion: string;
  modulo: string;
  detalle: string;
  fecha: string;
}

interface AuditContextType {
  logs: AuditLog[];
  addLog: (log: Omit<AuditLog, "id" | "fecha">) => void;
}

const AuditContext = createContext<AuditContextType | undefined>(
  undefined
);

const STORAGE_KEY = "erp_audit_logs";

export function AuditProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLogs(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading audit logs from localStorage:", error);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          setLogs(JSON.parse(event.newValue));
        } catch (error) {
          console.error("Error syncing audit logs from localStorage:", error);
        }
      }
    };

    const handleRefresh = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setLogs(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Error refreshing audit logs from localStorage:", error);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("erp:refresh", handleRefresh as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("erp:refresh", handleRefresh as EventListener);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error("Error saving audit logs to localStorage:", error);
    }
  }, [logs]);

  const addLog = (
    nuevoLog: Omit<AuditLog, "id" | "fecha">
  ) => {
    const logCompleto: AuditLog = {
      ...nuevoLog,
      id: Date.now(),
      fecha: new Date().toLocaleString(),
    };

    setLogs((prev) => [logCompleto, ...prev]);
  };

  return (
    <AuditContext.Provider value={{ logs, addLog }}>
      {children}
    </AuditContext.Provider>
  );
}

export function useAudit() {
  const context = useContext(AuditContext);

  if (!context) {
    throw new Error(
      "useAudit debe usarse dentro de AuditProvider"
    );
  }

  return context;
}