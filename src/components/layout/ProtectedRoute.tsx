import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import type { UserRole } from "../../types/roles";

interface Props {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredPermission, requiredRole }: Props) {
  const { user, hasPermission, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/not-authorized" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <>{children}</>;
}
