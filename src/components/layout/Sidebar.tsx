import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderOpen,
  HandCoins,
  Home,
  KeyRound,
  Landmark,
  LogOut,
  Mail,
  Package,
  Receipt,
  Server,
  Settings,
  ShieldCheck,
  ShoppingCart,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "../../AuthContext";
import { featureFlags } from "../../config/featureFlags";

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuth();

  const [commercialOpen, setCommercialOpen] = useState(true);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [administrationOpen, setAdministrationOpen] = useState(false);
  const [seguimientoOpen, setSeguimientoOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const dropdownTimeoutRef = useRef<number | null>(null);

  const canSeeCommercialGroup =
    user?.role === "SUPERADMIN" || user?.role === "ADMIN";
  const showCommercialGroup =
    canSeeCommercialGroup &&
    (hasPermission("cotizaciones") ||
      hasPermission("licitaciones") ||
      hasPermission("ordenes_compra") ||
      hasPermission("productos") ||
      hasPermission("clientes"));

  const isActive = (path: string) => location.pathname === path;
  const closeMobile = () => {
    if (mobile) onClose?.();
  };

  const itemClass = (path: string) =>
    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all sm:text-base ${
      isActive(path)
        ? "bg-blue-600 text-white shadow-lg"
        : "text-gray-300 hover:bg-gray-900 hover:text-white"
    }`;

  const subItemClass = (path: string) =>
    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all ${
      isActive(path)
        ? "bg-blue-600 text-white shadow-lg"
        : "text-gray-400 hover:bg-gray-900 hover:text-white"
    }`;

  const formatLastLogin = (value?: string | null) => {
    if (!value) return "No disponible";

    const localDateTimeMatch = value.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/
    );

    if (localDateTimeMatch) {
      const [, year, month, day, hour, minute] = localDateTimeMatch;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      const formattedDate = date.toLocaleDateString("es-PE", {
        dateStyle: "long",
      });

      return `${formattedDate} a las ${hour}:${minute}`;
    }

    const date = new Date(value);
    return !Number.isNaN(date.getTime())
      ? date.toLocaleString("es-PE", {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: "America/Lima",
        })
      : "No disponible";
  };

  const formattedLastLogin = formatLastLogin(user?.last_login_at);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error al cerrar sesion:", error);
    }
  };

  const handleMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = window.setTimeout(() => {
      setDropdownOpen(false);
    }, 300);
  };

  return (
    <>
      <aside className="flex h-full w-[min(74vw,248px)] flex-col justify-between border-r border-gray-800 bg-gray-950 p-3 text-white sm:p-4 lg:w-[248px] [&_nav_a]:px-3 [&_nav_a]:py-2.5 [&_nav_button]:px-3 [&_nav_button]:py-2.5">
        <div className="flex min-h-0 flex-col">
          {mobile && (
            <div className="mb-3 flex justify-end lg:hidden">
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-gray-300 transition hover:bg-gray-800 hover:text-white"
                title="Cerrar menu"
              >
                <X size={20} />
              </button>
            </div>
          )}

          <div className="mb-6 flex justify-center">
            <img
              src="/logoWILLATEC-white.png"
              alt="Willatec"
              className="h-12 object-contain sm:h-14"
            />
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
            {user?.role === "SUPERADMIN" && (
              <Link to="/" onClick={closeMobile} className={itemClass("/")}>
                <Home size={20} />
                <span className="font-medium">Dashboard</span>
              </Link>
            )}

            {hasPermission("licitaciones") && (
              <Link
                to="/seguimiento-licitaciones"
                onClick={closeMobile}
                className={itemClass("/seguimiento-licitaciones")}
              >
                <ClipboardList size={20} />
                <span className="font-medium">Licitaciones</span>
              </Link>
            )}

            {showCommercialGroup && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setCommercialOpen(!commercialOpen)}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-gray-300 transition hover:bg-gray-900 hover:text-white"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen size={20} />
                    <span className="font-medium uppercase">Comercial</span>
                  </div>

                  <ChevronDown
                    size={18}
                    className={`transition-transform ${
                      commercialOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {commercialOpen && (
                  <div className="ml-2 mt-1.5 flex flex-col gap-1 border-l border-gray-800 pl-2">
                    {hasPermission("cotizaciones") && (
                      <Link
                        to="/cotizaciones"
                        onClick={closeMobile}
                        className={subItemClass("/cotizaciones")}
                      >
                        <FileText size={18} />
                        Cotizaciones
                      </Link>
                    )}

                    {hasPermission("servicios") && (
                      <Link
                        to="/servicios/licencias"
                        onClick={closeMobile}
                        className={subItemClass("/servicios/licencias")}
                      >
                        <ShieldCheck size={16} />
                        Licencias
                      </Link>
                    )}

                    {hasPermission("ordenes_compra") && (
                      <Link
                        to="/ordenes-compra"
                        onClick={closeMobile}
                        className={subItemClass("/ordenes-compra")}
                      >
                        <ShoppingCart size={18} />
                        Ordenes de Compra
                      </Link>
                    )}

                    {hasPermission("productos") && (
                      <Link
                        to="/productos"
                        onClick={closeMobile}
                        className={subItemClass("/productos")}
                      >
                        <Package size={18} />
                        Productos
                      </Link>
                    )}

                    {hasPermission("clientes") && (
                      <Link
                        to="/clientes"
                        onClick={closeMobile}
                        className={subItemClass("/clientes")}
                      >
                        <UserCheck size={18} />
                        Clientes
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {user?.role === "VENTAS" && (
              <>
                <Link
                  to="/productos"
                  onClick={closeMobile}
                  className={itemClass("/productos")}
                >
                  <Package size={20} />
                  <span className="font-medium">Productos</span>
                </Link>

                <Link
                  to="/clientes"
                  onClick={closeMobile}
                  className={itemClass("/clientes")}
                >
                  <UserCheck size={20} />
                  <span className="font-medium">Clientes</span>
                </Link>

                <Link
                  to="/cotizaciones"
                  onClick={closeMobile}
                  className={itemClass("/cotizaciones")}
                >
                  <FileText size={20} />
                  <span className="font-medium">Cotizaciones</span>
                </Link>

                <Link
                  to="/ordenes-compra"
                  onClick={closeMobile}
                  className={itemClass("/ordenes-compra")}
                >
                  <ShoppingCart size={20} />
                  <span className="font-medium">Ordenes de Compra</span>
                </Link>
              </>
            )}

            {user?.role === "SOPORTE" && (
              <Link
                to="/productos"
                onClick={closeMobile}
                className={itemClass("/productos")}
              >
                <Package size={20} />
                <span className="font-medium">Productos</span>
              </Link>
            )}

            {user?.role === "LOGISTICA" && (
              <>
                <Link
                  to="/productos"
                  onClick={closeMobile}
                  className={itemClass("/productos")}
                >
                  <Package size={20} />
                  <span className="font-medium">Productos</span>
                </Link>

                <Link
                  to="/inventario/movimientos"
                  onClick={closeMobile}
                  className={itemClass("/inventario/movimientos")}
                >
                  <ClipboardList size={20} />
                  <span className="font-medium">KARDEX</span>
                </Link>
              </>
            )}

            {user?.role === "CONTABILIDAD" && (
              <Link
                to="/ordenes-compra"
                onClick={closeMobile}
                className={itemClass("/ordenes-compra")}
              >
                <ShoppingCart size={20} />
                <span className="font-medium">Ordenes de Compra</span>
              </Link>
            )}

            {hasPermission("servicios") && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setServicesOpen(!servicesOpen)}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-gray-300 transition hover:bg-gray-900 hover:text-white"
                >
                  <div className="flex items-center gap-3">
                    <Server size={20} />
                    <span className="font-medium uppercase">Servicios</span>
                  </div>

                  <ChevronDown
                    size={18}
                    className={`transition-transform ${
                      servicesOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {servicesOpen && (
                  <div className="ml-2 mt-1.5 flex flex-col gap-1 border-l border-gray-800 pl-2">
                    <Link
                      to="/servicios/licencias"
                      onClick={closeMobile}
                      className={subItemClass("/servicios/licencias")}
                    >
                      <KeyRound size={18} />
                      Licencias
                    </Link>

                    <Link
                      to="/servicios/hosting"
                      onClick={closeMobile}
                      className={subItemClass("/servicios/hosting")}
                    >
                      <Server size={18} />
                      Hosting
                    </Link>
                  </div>
                )}
              </div>
            )}

            {featureFlags.soporteTi && hasPermission("soporte_ti") && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setSupportOpen(!supportOpen)}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-gray-300 transition hover:bg-gray-900 hover:text-white"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} />
                    <span className="font-medium uppercase">Soporte TI</span>
                  </div>

                  <ChevronDown
                    size={18}
                    className={`transition-transform ${
                      supportOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {supportOpen && (
                  <div className="ml-2 mt-1.5 flex flex-col gap-1 border-l border-gray-800 pl-2">
                    <Link
                      to="/soporte"
                      onClick={closeMobile}
                      className={subItemClass("/soporte")}
                    >
                      <Home size={18} />
                      Dashboard
                    </Link>

                    <Link
                      to="/soporte/tickets"
                      onClick={closeMobile}
                      className={subItemClass("/soporte/tickets")}
                    >
                      <FileText size={18} />
                      Tickets
                    </Link>

                    <Link
                      to="/soporte/equipo-garantia"
                      onClick={closeMobile}
                      className={subItemClass("/soporte/equipo-garantia")}
                    >
                      <ShieldCheck size={18} />
                      Equipo / Garantia
                    </Link>
                  </div>
                )}
              </div>
            )}

            {featureFlags.controlAdm && hasPermission("control_pagos") && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setAdministrationOpen(!administrationOpen)}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-gray-300 transition hover:bg-gray-900 hover:text-white"
                >
                  <div className="flex items-center gap-3">
                    <Landmark size={20} />
                    <span className="font-medium uppercase">Control ADM</span>
                  </div>

                  <ChevronDown
                    size={18}
                    className={`transition-transform ${
                      administrationOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {administrationOpen && (
                  <div className="ml-2 mt-1.5 flex flex-col gap-1 border-l border-gray-800 pl-2">
                    <Link
                      to="/administracion/control-pagos/facturas-clientes"
                      onClick={closeMobile}
                      className={subItemClass(
                        "/administracion/control-pagos/facturas-clientes"
                      )}
                    >
                      <Receipt size={18} />
                      Pago Facturas Clientes
                    </Link>

                    <Link
                      to="/administracion/control-pagos/pagos-proveedores"
                      onClick={closeMobile}
                      className={subItemClass(
                        "/administracion/control-pagos/pagos-proveedores"
                      )}
                    >
                      <HandCoins size={18} />
                      Pagos Proveedores
                    </Link>
                  </div>
                )}
              </div>
            )}

            {hasPermission("usuarios") && (
              <Link
                to="/usuarios"
                onClick={closeMobile}
                className={itemClass("/usuarios")}
              >
                <Users size={20} />
                <span className="font-medium">Usuarios</span>
              </Link>
            )}

            {hasPermission("auditoria") && (
              <Link
                to="/auditoria"
                onClick={closeMobile}
                className={itemClass("/auditoria")}
              >
                <ShieldCheck size={20} />
                <span className="font-medium">Auditoria</span>
              </Link>
            )}

            {hasPermission("inventario") && user?.role === "SUPERADMIN" && (
              <Link
                to="/inventario/movimientos"
                onClick={closeMobile}
                className={itemClass("/inventario/movimientos")}
              >
                <ClipboardList size={20} />
                <span className="font-medium">KARDEX</span>
              </Link>
            )}
          </nav>
        </div>

        <div
          className="sticky bottom-0 space-y-3 bg-gray-950 pt-6"
          onMouseLeave={handleMouseLeave}
        >
          <div
            onMouseEnter={handleMouseEnter}
            className="relative z-10 w-full rounded-2xl bg-gray-900 p-3 transition hover:bg-gray-800"
          >
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="flex w-full items-center gap-3 text-left transition hover:opacity-80"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-bold">
                {user?.name?.charAt(0).toUpperCase() || "M"}
              </div>

              <div className="min-w-0">
                <p className="truncate font-medium text-white">
                  {user?.name || "Usuario"}
                </p>
                <p className="truncate text-sm text-gray-400">{user?.role}</p>
              </div>
            </button>

            {user?.role === "SUPERADMIN" && dropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
                <Link
                  to="/configuracion"
                  onClick={closeMobile}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-white"
                >
                  <Settings size={18} />
                  Configuracion
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                >
                  <LogOut size={18} />
                  Cerrar sesion
                </button>
              </div>
            )}
          </div>

          {user?.role !== "SUPERADMIN" && (
            <Link
              to="/configuracion"
              onClick={closeMobile}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-gray-300 transition hover:bg-gray-900 hover:text-white"
            >
              <Settings size={20} />
              Configuracion
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-red-400 transition hover:bg-red-500/10"
          >
            <LogOut size={20} />
            Cerrar sesion
          </button>
        </div>
      </aside>

      {profileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/50 bg-gradient-to-br from-white to-gray-50 p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">
                Mi Perfil
              </h2>

              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 transition hover:bg-gray-200"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="mb-8 flex flex-col items-center border-b border-gray-200 pb-8">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-3xl font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || "M"}
              </div>

              <h3 className="text-center text-xl font-bold text-gray-800">
                {user?.name || "Usuario"}
              </h3>

              <p className="mt-1 text-center text-sm font-semibold text-blue-600">
                {user?.role === "SUPERADMIN"
                  ? "Superadministrador"
                  : user?.role === "ADMIN"
                  ? "Administracion"
                  : user?.role || "Usuario"}
              </p>
            </div>

            <div className="mb-8 space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-gray-100 p-3">
                <Mail size={18} className="shrink-0 text-blue-600" />

                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Correo</p>
                  <p className="truncate text-sm font-medium text-gray-800">
                    {user?.email || "No disponible"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-gray-100 p-3">
                <Calendar size={18} className="shrink-0 text-green-600" />

                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Ultimo acceso</p>
                  <p className="text-sm font-medium text-gray-800">
                    {formattedLastLogin}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 font-medium text-white shadow-md transition hover:bg-red-700"
            >
              <LogOut size={18} />
              Cerrar Sesion
            </button>
          </div>
        </div>
      )}
    </>
  );
}
