import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../components/layout/MainLayout";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { featureFlags } from "../config/featureFlags";

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
const InventarioMovimientos = lazy(() => import("../pages/InventarioMovimientos"));
const OrdenesCompraPage = lazy(() => import("../pages/OrdenesCompraPage"));
const OrdenCompraDetail = lazy(() => import("../pages/OrdenCompraDetail"));
const Notificaciones = lazy(() => import("../pages/Notificaciones"));

// 🆕 SERVICIOS
import Licencias from "../pages/Servicios/Licencias";
import Hosting from "../pages/Servicios/Hosting";

// 🆕 HELP DESK (SOPORTE TI)
import DashboardSoporte from "../modules/helpdesk/DashboardSoporte";
import Tickets from "../modules/helpdesk/Tickets";
import EquipoGarantia from "../modules/helpdesk/EquipoGarantia";

import ControlPagoFacturasClientesPage from "../pages/administracion/control-pagos/ControlPagoFacturasClientesPage";
// 🆕 CONTROL PAGO PROVEEDORES
import ControlPagoProveedores from "../pages/administracion/control-pagos/ControlPagosProveedoresPage";

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
          <Route
            path="/productos"
            element={
              <ProtectedRoute requiredPermission="productos">
                <Productos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <ProtectedRoute requiredPermission="clientes">
                <Clientes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cotizaciones"
            element={
              <ProtectedRoute requiredPermission="cotizaciones">
                <Cotizaciones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cotizaciones/new"
            element={
              <ProtectedRoute requiredPermission="cotizaciones">
                <CotizacionDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cotizaciones/:id/edit"
            element={
              <ProtectedRoute requiredPermission="cotizaciones">
                <CotizacionDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cotizaciones/:id/view"
            element={
              <ProtectedRoute requiredPermission="cotizaciones">
                <CotizacionDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cotizaciones/modificaciones/:modificacionId/edit"
            element={
              <ProtectedRoute requiredPermission="cotizaciones">
                <CotizacionDetail />
              </ProtectedRoute>
            }
          />

          {/* ÓRDENES DE COMPRA */}
          <Route
            path="/ordenes-compra"
            element={
              <ProtectedRoute requiredPermission="ordenes_compra">
                <OrdenesCompraPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ordenes-compra/nueva"
            element={
              <ProtectedRoute requiredPermission="ordenes_compra">
                <OrdenesCompraPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ordenes-compra/recibidas/:ocId"
            element={
              <ProtectedRoute requiredPermission="ordenes_compra">
                <OrdenesCompraPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ordenes-compra/emitidas/:ocId"
            element={
              <ProtectedRoute requiredPermission="ordenes_compra">
                <OrdenesCompraPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ordenes-compra/:id"
            element={
              <ProtectedRoute requiredPermission="ordenes_compra">
                <OrdenCompraDetail />
              </ProtectedRoute>
            }
          />

          {/* 🆕 SERVICIOS ERP */}
          <Route
            path="/servicios/licencias"
            element={
              <ProtectedRoute requiredPermission="servicios">
                <Licencias />
              </ProtectedRoute>
            }
          />
          <Route
            path="/servicios/hosting"
            element={
              <ProtectedRoute requiredPermission="servicios">
                <Hosting />
              </ProtectedRoute>
            }
          />

          {/* 🆕 SOPORTE TI (HELP DESK) */}
          {featureFlags.soporteTi && (
            <>
              <Route
                path="/soporte"
                element={
                  <ProtectedRoute requiredPermission="soporte_ti">
                    <DashboardSoporte />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/soporte/tickets"
                element={
                  <ProtectedRoute requiredPermission="soporte_ti">
                    <Tickets />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/soporte/equipo-garantia"
                element={
                  <ProtectedRoute requiredPermission="soporte_ti">
                    <EquipoGarantia />
                  </ProtectedRoute>
                }
              />
            </>
          )}

          {/* ADMIN */}
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/configuracion" element={<Configuracion />} />
          {featureFlags.controlAdm && (
            <>
              <Route
                path="/administracion/control-pagos/facturas-clientes"
                element={
                  <ProtectedRoute requiredPermission="control_pagos">
                    <ControlPagoFacturasClientesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/administracion/control-pagos/pagos-proveedores"
                element={
                  <ProtectedRoute requiredPermission="control_pagos">
                    <ControlPagoProveedores />
                  </ProtectedRoute>
                }
              />
            </>
          )}

          {/* AUDITORÍA */}
          <Route
            path="/auditoria"
            element={
              <ProtectedRoute requiredPermission="auditoria">
                <Auditoria />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventario/movimientos"
            element={
              <ProtectedRoute requiredPermission="inventario">
                <InventarioMovimientos />
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
