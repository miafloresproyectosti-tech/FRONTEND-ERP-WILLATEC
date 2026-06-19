import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../components/layout/MainLayout";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";

import LoginPage from "../pages/LoginPage";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import Dashboard from "../pages/Dashboard";
import Clientes from "../pages/Clientes";
import Productos from "../pages/Productos";
import Cotizaciones from "../pages/Cotizaciones";
import { CotizacionDetail } from "../pages/CotizacionDetail";
import Usuarios from "../pages/Usuarios";
import Configuracion from "../pages/Configuracion";
import Auditoria from "../pages/Auditoria";
import OrdenesCompraPage from "../pages/OrdenesCompraPage";
import OrdenCompraDetail from "../pages/OrdenCompraDetail";
import Notificaciones from "../pages/Notificaciones";
import TwoFactorChallengePage from "../pages/TwoFactorChallengePage";
import NotAuthorized from "../pages/NotAuthorized";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/two-factor" element={<TwoFactorChallengePage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        

        {/* RUTAS PROTEGIDAS */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >

          {/* DASHBOARD */}
          <Route
            path="/"
            element={
              <ProtectedRoute requiredRole="SUPERADMIN">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/not-authorized" element={<NotAuthorized />} />

          {/* NOTIFICACIONES */}
          <Route path="/notificaciones" element={<Notificaciones />} />

          {/* MÓDULOS ERP */}
          <Route path="/productos" element={<Productos />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/cotizaciones" element={<Cotizaciones />} />
          <Route path="/cotizaciones/new" element={<CotizacionDetail />} />
          <Route path="/cotizaciones/:id/edit" element={<CotizacionDetail />} />
          <Route path="/cotizaciones/:id/view" element={<CotizacionDetail />} />
          <Route path="/cotizaciones/modificaciones/:modificacionId/edit" element={<CotizacionDetail />} />

          {/* ÓRDENES DE COMPRA */}
          <Route path="/ordenes-compra" element={<OrdenesCompraPage />} />
          <Route path="/ordenes-compra/:id" element={<OrdenCompraDetail />} />
          {/* ADMIN */}
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/configuracion" element={<Configuracion />} />

          {/* AUDITORÍA (con permiso específico) */}
          <Route
            path="/auditoria"
            element={
              <ProtectedRoute requiredPermission="auditoria">
                <Auditoria />
              </ProtectedRoute>
            }
          />

        </Route>

        {/* REDIRECCIÓN GLOBAL */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
