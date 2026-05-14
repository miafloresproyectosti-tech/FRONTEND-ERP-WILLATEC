import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import type { UserRole } from "./types/roles";
import { rolePermissions } from "./utils/permissions";
import { logoutRequest } from "./services/auth.service";

interface User {
  email: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, role: string) => void;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // LOGIN
  const login = (email: string, roleStr: string) => {
    const role = roleStr as UserRole;

    const name =
      email.split("@")[0]?.replace(/\b\w/g, (l) => l.toUpperCase()) ||
      "Usuario";

    const userData: User = {
      email,
      role,
      name,
    };

    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // LOGOUT
  const logout = async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.error("Error en logout:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  };

  // PERMISOS
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // SUPERADMIN acceso total
    if (user.role === "SUPERADMIN") return true;

    const permissions = rolePermissions[user.role] || [];

    return permissions.includes(permission);
  };

  // CARGA INICIAL (EVITA REDIRECT FALSO A LOGIN)
  useEffect(() => {
    const saved = localStorage.getItem("user");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        // validación básica
        if (parsed?.email && parsed?.role) {
          setUser(parsed);
        } else {
          localStorage.removeItem("user");
        }
      } catch {
        localStorage.removeItem("user");
      }
    }

    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        hasPermission,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}