import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../AuthContext";

interface Props {
  children: ReactNode;
  requiredPermission?: string;
}

export function ProtectedRoute({ children, requiredPermission }: Props) {
  const { user, hasPermission } = useAuth();

  console.log('🔒 ProtectedRoute:', {
    user: user?.email,
    role: user?.role,
    permission: requiredPermission,
    hasAccess: requiredPermission ? hasPermission(requiredPermission) : true,
  });

  if (!user) {
    console.log('🚪 Sin login → /login');
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    console.log('⛔ Sin permiso → /not-authorized');
    return <Navigate to="/not-authorized" replace />;
  }

  console.log('✅ Acceso OK');
  return <>{children}</>;
}