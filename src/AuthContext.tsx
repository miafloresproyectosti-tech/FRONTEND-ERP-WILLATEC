import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { logoutRequest, meRequest } from "./services/auth.service";
import type { UserRole } from "./types/roles";
import { rolePermissions } from "./utils/permissions";

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

  const login = (
    id: number,
    email: string,
    roleStr: string,
    lastLoginAt?: string | null,
    twoFactorEnabled = false
  ) => {
    const role = roleStr as UserRole;
    const name =
      email.split("@")[0]?.replace(/\b\w/g, (letter) => letter.toUpperCase()) ||
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

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === "SUPERADMIN") return true;

    const permissions = rolePermissions[user.role] || [];
    return permissions.includes(permission);
  };

  useEffect(() => {
    let cancelled = false;

    const loadSavedSession = async () => {
      const saved = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!saved || !token) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const parsed = JSON.parse(saved);

        if (!parsed?.id || !parsed?.email || !parsed?.role) {
          throw new Error("Invalid saved user");
        }

        const response = await meRequest();
        const backendUser = response.data?.user;
        const backendRole =
          backendUser?.roles && backendUser.roles.length > 0
            ? backendUser.roles[0].name.toUpperCase()
            : parsed.role;

        const userData: User = {
          id: backendUser?.id ?? parsed.id,
          email: backendUser?.email ?? parsed.email,
          role: backendRole as UserRole,
          name:
            backendUser?.nombres ||
            parsed.name ||
            (backendUser?.email ?? parsed.email).split("@")[0],
          last_login_at: backendUser?.last_login_at ?? parsed.last_login_at ?? null,
          two_factor_enabled:
            Boolean(backendUser?.two_factor_confirmed_at) ||
            Boolean(parsed.two_factor_enabled),
        };

        if (!cancelled) {
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        }
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadSavedSession();

    return () => {
      cancelled = true;
    };
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
