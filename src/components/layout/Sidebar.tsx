import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { useState, useRef } from "react";

import {
  Home,
  Package,
  UserCheck,
  Users,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  X,
  Mail,
  Calendar,
  ShoppingCart,
  FolderOpen,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  mobile = false,
  onClose,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // ✅ CARPETA COMERCIAL
  const [commercialOpen, setCommercialOpen] = useState(true);

  const dropdownTimeoutRef = useRef<number | null>(null);
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

  // ✅ LOGOUT
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
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
      <aside
        className="
          bg-gray-950 text-white flex flex-col justify-between
          h-full
          w-[290px]
          p-5
          border-r border-gray-800
        "
      >
        {/* TOP */}
        <div>
          {/* MOBILE CLOSE */}
          {mobile && (
            <div className="flex justify-end mb-4 lg:hidden">
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition"
              >
                <X size={22} />
              </button>
            </div>
          )}

          {/* LOGO */}
          <div className="mb-10 flex justify-center">
            <img
              src="/logoWILLATEC-white.png"
              alt="Willatec"
              className="h-16 sm:h-20 object-contain"
            />
          </div>

          {/* MENU */}
          <nav className="flex flex-col gap-2">
            {/* DASHBOARD */}
            {user?.role === "SUPERADMIN" && (
              <Link
                to="/"
                onClick={() => mobile && onClose?.()}
                className={`
                  flex items-center gap-3
                  px-4 py-3
                  rounded-2xl
                  transition-all
                  text-sm sm:text-base
                  ${
                    location.pathname === "/"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-gray-300 hover:bg-gray-900 hover:text-white"
                  }
                `}
              >
                <Home size={20} />
                <span className="font-medium">Dashboard</span>
              </Link>
            )}

            {/* ✅ SUPERADMIN Y ADMIN */}
            {(user?.role === "SUPERADMIN" ||
              user?.role === "ADMIN") && (
              <>
                {/* CARPETA COMERCIAL */}
                <div className="mt-2">
                  <button
                    onClick={() =>
                      setCommercialOpen(!commercialOpen)
                    }
                    className="
                      w-full
                      flex items-center justify-between
                      px-4 py-3
                      rounded-2xl
                      text-gray-300
                      hover:bg-gray-900
                      hover:text-white
                      transition
                    "
                  >
                    <div className="flex items-center gap-3">
                      <FolderOpen size={20} />

                      <span className="font-medium uppercase">
                        Comercial
                      </span>
                    </div>

                    <ChevronDown
                      size={18}
                      className={`transition-transform ${
                        commercialOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* SUBMENU */}
                  {commercialOpen && (
                    <div className="ml-4 mt-2 flex flex-col gap-2 border-l border-gray-800 pl-3">
                      {/* COTIZACIONES */}
                      <Link
                        to="/cotizaciones"
                        className={`
                          flex items-center gap-3
                          px-4 py-3
                          rounded-2xl
                          transition-all
                          text-sm
                          ${
                            location.pathname ===
                            "/cotizaciones"
                              ? "bg-blue-600 text-white shadow-lg"
                              : "text-gray-400 hover:bg-gray-900 hover:text-white"
                          }
                        `}
                      >
                        <FileText size={18} />
                        Cotizaciones
                      </Link>

                      {/* ORDENES */}
                      <Link
                        to="/ordenes-compra"
                        className={`
                          flex items-center gap-3
                          px-4 py-3
                          rounded-2xl
                          transition-all
                          text-sm
                          ${
                            location.pathname ===
                            "/ordenes-compra"
                              ? "bg-blue-600 text-white shadow-lg"
                              : "text-gray-400 hover:bg-gray-900 hover:text-white"
                          }
                        `}
                      >
                        <ShoppingCart size={18} />
                        Órdenes de Compra
                      </Link>

                      {/* PRODUCTOS */}
                      <Link
                        to="/productos"
                        className={`
                          flex items-center gap-3
                          px-4 py-3
                          rounded-2xl
                          transition-all
                          text-sm
                          ${
                            location.pathname ===
                            "/productos"
                              ? "bg-blue-600 text-white shadow-lg"
                              : "text-gray-400 hover:bg-gray-900 hover:text-white"
                          }
                        `}
                      >
                        <Package size={18} />
                        Productos
                      </Link>

                      {/* CLIENTES */}
                      <Link
                        to="/clientes"
                        className={`
                          flex items-center gap-3
                          px-4 py-3
                          rounded-2xl
                          transition-all
                          text-sm
                          ${
                            location.pathname ===
                            "/clientes"
                              ? "bg-blue-600 text-white shadow-lg"
                              : "text-gray-400 hover:bg-gray-900 hover:text-white"
                          }
                        `}
                      >
                        <UserCheck size={18} />
                        Clientes
                      </Link>
                    </div>
                  )}
                </div>

                {/* USUARIOS */}
                <Link
                  to="/usuarios"
                  onClick={() => mobile && onClose?.()}
                  className={`
                    flex items-center gap-3
                    px-4 py-3
                    rounded-2xl
                    transition-all
                    text-sm sm:text-base
                    ${
                      location.pathname === "/usuarios"
                        ? "bg-blue-600 text-white shadow-lg"
                        : "text-gray-300 hover:bg-gray-900 hover:text-white"
                    }
                  `}
                >
                  <Users size={20} />
                  <span className="font-medium">Usuarios</span>
                </Link>

                {/* AUDITORIA */}
                <Link
                  to="/auditoria"
                  onClick={() => mobile && onClose?.()}
                  className={`
                    flex items-center gap-3
                    px-4 py-3
                    rounded-2xl
                    transition-all
                    text-sm sm:text-base
                    ${
                      location.pathname === "/auditoria"
                        ? "bg-blue-600 text-white shadow-lg"
                        : "text-gray-300 hover:bg-gray-900 hover:text-white"
                    }
                  `}
                >
                  <ShieldCheck size={20} />
                  <span className="font-medium">
                    Auditoría
                  </span>
                </Link>
              </>
            )}

            {/* ✅ VENTAS NORMAL */}
            {user?.role === "VENTAS" && (
              <>
                <Link
                  to="/productos"
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-300 hover:bg-gray-900 hover:text-white transition"
                >
                  <Package size={20} />
                  Productos
                </Link>

                <Link
                  to="/clientes"
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-300 hover:bg-gray-900 hover:text-white transition"
                >
                  <UserCheck size={20} />
                  Clientes
                </Link>

                <Link
                  to="/cotizaciones"
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-300 hover:bg-gray-900 hover:text-white transition"
                >
                  <FileText size={20} />
                  Cotizaciones
                </Link>

                <Link
                  to="/ordenes-compra"
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-300 hover:bg-gray-900 hover:text-white transition"
                >
                  <ShoppingCart size={20} />
                  Órdenes de Compra
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* BOTTOM */}
        <div
          className="space-y-3 relative"
          onMouseLeave={handleMouseLeave}
        >
          {/* USER */}
          <div
            onMouseEnter={handleMouseEnter}
            className="w-full bg-gray-900 hover:bg-gray-800 rounded-2xl p-4 mt-4 transition relative z-10 cursor-pointer"
          >
            <button
              onClick={() => setProfileModalOpen(true)}
              className="w-full flex items-center gap-3 hover:opacity-80 transition"
            >
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase() || "M"}
              </div>

              <div className="flex-1 text-left overflow-hidden">
                <h3 className="font-medium text-white truncate">
                  {user?.name || "Usuario"}
                </h3>

                <p className="text-sm text-gray-400 truncate">
                  {user?.role === "SUPERADMIN"
                    ? "Super Admin"
                    : user?.role === "ADMIN"
                    ? "Administración"
                    : user?.role || "Usuario"}
                </p>
              </div>

              {user?.role === "SUPERADMIN" && (
                <ChevronDown
                  size={18}
                  className={`text-gray-300 transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>
          </div>

          {/* DROPDOWN SUPERADMIN */}
          {user?.role === "SUPERADMIN" && dropdownOpen && (
            <div className="absolute bottom-20 left-0 right-0 bg-gray-800 rounded-2xl border border-gray-700 shadow-lg overflow-hidden z-20">
              <Link
                to="/configuracion"
                onClick={() => mobile && onClose?.()}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition border-b border-gray-700"
              >
                <Settings size={18} />
                Configuración
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition"
              >
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </div>
          )}

          {/* OTROS ROLES */}
          {user?.role !== "SUPERADMIN" && (
            <>
              <Link
                to="/configuracion"
                onClick={() => mobile && onClose?.()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-300 hover:bg-gray-900 hover:text-white transition"
              >
                <Settings size={20} />
                Configuración
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition"
              >
                <LogOut size={20} />
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </aside>

      {/* MODAL PERFIL */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gradient-to-br from-white to-gray-50 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/50">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                Mi Perfil
              </h2>

              <button
                onClick={() => setProfileModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* INFO */}
            <div className="flex flex-col items-center mb-8 pb-8 border-b border-gray-200">
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center font-bold text-3xl text-white mb-4">
                {user?.name?.charAt(0).toUpperCase() || "M"}
              </div>

              <h3 className="text-xl font-bold text-gray-800 text-center">
                {user?.name || "Usuario"}
              </h3>

              <p className="text-sm text-blue-600 font-semibold mt-1 text-center">
                {user?.role === "SUPERADMIN"
                  ? "👑 Superadministrador"
                  : user?.role === "ADMIN"
                  ? "Administración"
                  : user?.role || "Usuario"}
              </p>
            </div>

            {/* DATOS */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-2xl">
                <Mail
                  size={18}
                  className="text-blue-600 flex-shrink-0"
                />

                <div className="min-w-0">
                  <p className="text-xs text-gray-500">
                    Correo
                  </p>

                  <p className="text-sm font-medium text-gray-800 truncate">
                    {user?.email || "No disponible"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-2xl">
                <Calendar
                  size={18}
                  className="text-green-600 flex-shrink-0"
                />

                <div className="min-w-0">
                  <p className="text-xs text-gray-500">
                    Último acceso
                  </p>

                  <p className="text-sm font-medium text-gray-800">
                    {formattedLastLogin}
                  </p>
                </div>
              </div>
            </div>

            {/* BOTONES */}
            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-medium transition shadow-md"
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
