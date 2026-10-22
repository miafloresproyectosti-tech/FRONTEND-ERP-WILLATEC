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

  // Las rutas con permiso dinámico se autorizan
  // por permiso, independientemente del rol.
  if (requiredPermission) {
    return hasPermission(requiredPermission)
      ? <>{children}</>
      : <Navigate to="/not-authorized" replace />;
  }

  return <>{children}</>;
}
