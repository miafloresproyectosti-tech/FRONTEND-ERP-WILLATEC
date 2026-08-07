import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import type { UserRole } from "../../types/roles";
import { normalizeRole } from "../../utils/permissions";

interface Props {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredPermission, requiredRole, requiredRoles }: Props) {
  const { user, hasPermission, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = normalizeRole(user.role);

  if (requiredRole && currentRole !== requiredRole) {
    return <Navigate to="/not-authorized" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(currentRole)) {
    return <Navigate to="/not-authorized" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <>{children}</>;
}
