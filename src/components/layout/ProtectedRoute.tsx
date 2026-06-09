import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../AuthContext";

interface Props {
  children: ReactNode;
  requiredPermission?: string;
}

export function ProtectedRoute({ children, requiredPermission }: Props) {
  const { user, hasPermission, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <>{children}</>;
}
