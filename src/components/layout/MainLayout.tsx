import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { FileWarning, ShieldCheck, X } from "lucide-react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAuth } from "../../AuthContext";
import { getSuperadminSecurityQuestionsRequest } from "../../services/auth.service";
import { getOcEmitidas, getOcRecibidas } from "../../services/ordenCompra.service";

export default function MainLayout() {

  const navigate = useNavigate();
  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showSecurityQuestionsNotice, setShowSecurityQuestionsNotice] = useState(false);
  const [missingOcDocumentsNotice, setMissingOcDocumentsNotice] = useState<{
    recibidas: number;
    emitidas: number;
  } | null>(null);

  const handleNotificationClick = (route: string) => {
    navigate(route);
  };

  useEffect(() => {
    if (user?.role !== "SUPERADMIN") return;

    const sessionKey = `superadmin-security-questions-notice:${user.id}`;
    if (sessionStorage.getItem(sessionKey) === "seen") return;

    let cancelled = false;

    const checkSecurityQuestions = async () => {
      try {
        const data = await getSuperadminSecurityQuestionsRequest();
        if (!cancelled && !data.configured) {
          setShowSecurityQuestionsNotice(true);
          sessionStorage.setItem(sessionKey, "seen");
        }
      } catch (error) {
        console.warn("No se pudo verificar preguntas de seguridad:", error);
      }
    };

    void checkSecurityQuestions();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user || !["ADMIN", "CONTABILIDAD"].includes(user.role)) return;

    const sessionKey = `oc-missing-documents-notice:${user.id}`;
    if (sessionStorage.getItem(sessionKey) === "seen") return;

    let cancelled = false;

    const checkMissingOcDocuments = async () => {
      try {
        const [recibidas, emitidas] = await Promise.all([
          getOcRecibidas({ perPage: 100 }),
          getOcEmitidas({ perPage: 100 }),
        ]);
        const recibidasCount = recibidas.data.filter((oc) => oc.documentos_completos === false).length;
        const emitidasCount = emitidas.data.filter((oc) => oc.documentos_completos === false).length;

        if (!cancelled && recibidasCount + emitidasCount > 0) {
          setMissingOcDocumentsNotice({
            recibidas: recibidasCount,
            emitidas: emitidasCount,
          });
          sessionStorage.setItem(sessionKey, "seen");
        }
      } catch (error) {
        console.warn("No se pudo verificar documentos faltantes de OC:", error);
      }
    };

    void checkMissingOcDocuments();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  const closeSecurityQuestionsNotice = () => {
    setShowSecurityQuestionsNotice(false);
  };

  const goToSecuritySettings = () => {
    closeSecurityQuestionsNotice();
    navigate("/configuracion");
  };

  const closeMissingOcDocumentsNotice = () => {
    setMissingOcDocumentsNotice(null);
  };

  const goToOrdenesCompra = () => {
    closeMissingOcDocumentsNotice();
    navigate("/ordenes-compra");
  };

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden">

      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR DESKTOP */}
      {sidebarVisible && (
        <div className="hidden flex-shrink-0 lg:flex lg:w-[248px] lg:min-w-[248px]">
          <Sidebar />
        </div>
      )}

      {/* SIDEBAR MOBILE */}
      <div
        className={`
          fixed top-0 left-0 z-50 h-full transform transition-transform duration-300 lg:hidden
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar mobile onClose={() => setSidebarOpen(false)} />
      </div>

      {/* MAIN */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* TOPBAR */}
        <Topbar
          onNotificationClick={handleNotificationClick}
          onMenuClick={() => {
            if (window.innerWidth >= 1024) {
              setSidebarVisible((prev) => !prev);
            } else {
              setSidebarOpen(true);
            }
          }}
        />

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">

          <div className="bg-white rounded-3xl shadow-sm p-4 sm:p-6 lg:p-8 w-full">
            <Outlet />
          </div>

        </div>

      </main>

      {showSecurityQuestionsNotice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Configura tus preguntas de seguridad
                  </h2>
                  <p className="text-sm text-slate-500">
                    Recuperación SUPERADMIN
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeSecurityQuestionsNotice}
                className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                title="Cerrar aviso"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-5 text-sm leading-6 text-slate-600">
              Ya puedes configurar tus preguntas de seguridad para recuperar tu contraseña si pierdes el acceso.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={closeSecurityQuestionsNotice}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Luego
              </button>
              <button
                type="button"
                onClick={goToSecuritySettings}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Ir a Seguridad
              </button>
            </div>
          </div>
        </div>
      )}

      {missingOcDocumentsNotice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <FileWarning className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    OC con documentos pendientes
                  </h2>
                  <p className="text-sm text-slate-500">
                    Recordatorio de administracion
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeMissingOcDocumentsNotice}
                className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                title="Cerrar aviso"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm leading-6 text-slate-600">
              Hay ordenes de compra con documentos obligatorios pendientes de carga.
            </p>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{missingOcDocumentsNotice.recibidas}</p>
                <p className="text-xs font-semibold uppercase text-slate-500">OC recibidas</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{missingOcDocumentsNotice.emitidas}</p>
                <p className="text-xs font-semibold uppercase text-slate-500">OC emitidas</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={closeMissingOcDocumentsNotice}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Luego
              </button>
              <button
                type="button"
                onClick={goToOrdenesCompra}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Revisar OC
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
