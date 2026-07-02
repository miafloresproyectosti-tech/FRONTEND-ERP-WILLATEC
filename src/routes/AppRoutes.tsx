import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../components/layout/MainLayout";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";

import LoginPage from "../pages/LoginPage";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import TwoFactorChallengePage from "../pages/TwoFactorChallengePage";
import NotAuthorized from "../pages/NotAuthorized";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const Clientes = lazy(() => import("../pages/Clientes"));
const Productos = lazy(() => import("../pages/Productos"));
const Cotizaciones = lazy(() => import("../pages/Cotizaciones"));
const CotizacionDetail = lazy(() =>
  import("../pages/CotizacionDetail").then((module) => ({
    default: module.CotizacionDetail,
  }))
);
const Usuarios = lazy(() => import("../pages/Usuarios"));
const Configuracion = lazy(() => import("../pages/Configuracion"));
const Auditoria = lazy(() => import("../pages/Auditoria"));
const OrdenesCompraPage = lazy(() => import("../pages/OrdenesCompraPage"));
const OrdenCompraDetail = lazy(() => import("../pages/OrdenCompraDetail"));
const Notificaciones = lazy(() => import("../pages/Notificaciones"));

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
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
          <Route path="/ordenes-compra/nueva" element={<OrdenesCompraPage />} />
          <Route path="/ordenes-compra/recibidas/:ocId" element={<OrdenesCompraPage />} />
          <Route path="/ordenes-compra/emitidas/:ocId" element={<OrdenesCompraPage />} />
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
      </Suspense>
    </BrowserRouter>
  );
}
