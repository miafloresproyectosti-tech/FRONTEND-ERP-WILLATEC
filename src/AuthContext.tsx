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
  id: number;
  email: string;
  role: UserRole;
  name: string;
  last_login_at?: string | null;
  two_factor_enabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (
    id: number,
    email: string,
    role: string,
    lastLoginAt?: string | null,
    twoFactorEnabled?: boolean
  ) => void;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  updateTwoFactorEnabled: (enabled: boolean) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // LOGIN
  const login = (
    id: number,
    email: string,
    roleStr: string,
    lastLoginAt?: string | null,
    twoFactorEnabled = false
  ) => {
    const role = roleStr as UserRole;

    const name =
      email.split("@")[0]?.replace(/\b\w/g, (l) => l.toUpperCase()) ||
      "Usuario";

    const userData: User = {
      id,
      email,
      role,
      name,
      last_login_at: lastLoginAt || new Date().toISOString(),
      two_factor_enabled: twoFactorEnabled,
    };

    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const updateTwoFactorEnabled = (enabled: boolean) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;

      const updatedUser = {
        ...currentUser,
        two_factor_enabled: enabled,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    });
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
        if (parsed?.id && parsed?.email && parsed?.role) {
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
        updateTwoFactorEnabled,
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
