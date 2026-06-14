import { useEffect, useState } from "react";
import { Save, Building, Settings, Shield, Bell } from "lucide-react";
import {
  enableTwoFactorRequest,
  getTwoFactorQrRequest,
  confirmTwoFactorRequest,
  disableTwoFactorRequest,
} from "../services/auth.service";
import { useNotifications } from "../NotificationContext";
import { useAuth } from "../AuthContext";

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState("empresa");
  const { showToast } = useNotifications();
  const { user, updateTwoFactorEnabled } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    !!user?.two_factor_enabled
  );

  useEffect(() => {
    setTwoFactorEnabled(!!user?.two_factor_enabled);
  }, [user?.two_factor_enabled]);

  const tabs = [
    { id: "empresa", name: "Empresa", icon: Building },
    { id: "sistema", name: "Sistema", icon: Settings },
    { id: "seguridad", name: "Seguridad", icon: Shield },
    { id: "notificaciones", name: "Notificaciones", icon: Bell },
  ];

  //VERIFICACION DE 2 PASOS
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [enabling2FA, setEnabling2FA] = useState(false);
  const [confirming2FA, setConfirming2FA] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);

  const enable2FA = async () => {
    try {
      setEnabling2FA(true);
      await enableTwoFactorRequest();
      const data = await getTwoFactorQrRequest();
      setQr(data.svg);
    } catch {
      showToast({
        title: "Error al activar 2FA",
        description:
          "No se pudo generar la configuracion de autenticacion en dos pasos",
        type: "error",
      });
    } finally {
      setEnabling2FA(false);
    }
  };

  const confirm2FA = async () => {
    try {
      setConfirming2FA(true);
      const data = await confirmTwoFactorRequest(code);
      setRecoveryCodes(data.recovery_codes || []);
      setQr("");
      setTwoFactorEnabled(true);
      updateTwoFactorEnabled(true);
      showToast({
        title: "2FA activado",
        description: "La autenticacion en dos pasos fue activada correctamente",
        type: "success",
      });
    } catch {
      showToast({
        title: "Error al confirmar 2FA",
        description: "El codigo ingresado es invalido o expiro",
        type: "error",
      });
    } finally {
      setConfirming2FA(false);
    }
  };

  const disable2FA = async () => {
    const confirmDisable = window.confirm(
      "¿Seguro que deseas desactivar el 2FA?\n\nSi lo activas nuevamente, tendrás que escanear un nuevo código QR.",
    );

    if (!confirmDisable) return;

    const password = prompt("Ingrese su contraseña actual para confirmar");

    if (!password) return;

    try {
      setDisabling2FA(true);

      await disableTwoFactorRequest(password);

      setQr("");
      setCode("");
      setRecoveryCodes([]);
      setTwoFactorEnabled(false);
      updateTwoFactorEnabled(false);

      showToast({
        title: "2FA desactivado",
        description:
          "La autenticacion en dos pasos fue desactivada correctamente",
        type: "success",
      });
    } catch {
      showToast({
        title: "Error al desactivar 2FA",
        description: "No se pudo desactivar el 2FA. Verifica tu contrasena",
        type: "error",
      });
    } finally {
      setDisabling2FA(false);
    }
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodes.length) return;

    const content = `CÓDIGOS DE RECUPERACIÓN - ERP WILLATEC

Guarda estos códigos en un lugar seguro.
Cada código solo debe usarse una vez.

${recoveryCodes.join("\n")}
`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "codigos-recuperacion-erp-willatec.txt";
    a.click();

    URL.revokeObjectURL(url);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "empresa":
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  defaultValue="Willatec ERP"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              <div className="lg:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  RUC
                </label>
                <input
                  type="text"
                  defaultValue="12345678901"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Dirección
              </label>
              <input
                type="text"
                defaultValue="Av. Principal 123, Lima, Perú"
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Teléfono
                </label>
                <input
                  type="tel"
                  defaultValue="+51 999 999 999"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  defaultValue="info@willatec.com"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
            </div>
          </div>
        );
      case "sistema":
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Idioma
                </label>
                <select className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md">
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Zona Horaria
                </label>
                <select className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md">
                  <option value="America/Lima">America/Lima (UTC-5)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Moneda
                </label>
                <select className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md">
                  <option value="PEN">Soles (PEN)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Formato de Fecha
                </label>
                <select className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </select>
              </div>
            </div>
          </div>
        );
      case "seguridad":
        return (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200">
                  Política de Contraseñas
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Longitud Mínima
                    </label>
                    <input
                      type="number"
                      defaultValue="8"
                      min="6"
                      max="20"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Días para Expiración
                    </label>
                    <input
                      type="number"
                      defaultValue="90"
                      min="30"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow">
              <h2 className="text-xl font-bold mb-4">Autenticación 2FA</h2>

              {twoFactorEnabled ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm font-bold text-green-800">
                    YA TIENES HABILITADO EL 2FA
                  </div>

                  <button
                    onClick={disable2FA}
                    disabled={disabling2FA}
                    className="bg-red-600 text-white px-4 py-2 rounded-xl disabled:opacity-50"
                  >
                    {disabling2FA ? "Desactivando..." : "Desactivar"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={enable2FA}
                  disabled={enabling2FA}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl disabled:opacity-50"
                >
                  {enabling2FA ? "Activando..." : "Activar 2FA"}
                </button>
              )}

              {!twoFactorEnabled && qr && (
                <div className="mt-4">
                  <div dangerouslySetInnerHTML={{ __html: qr }} />

                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Código de 6 dígitos"
                    className="border p-3 rounded-xl mt-4"
                  />

                  <button
                    onClick={confirm2FA}
                    disabled={confirming2FA}
                    className="ml-2 bg-green-600 text-white px-4 py-2 rounded-xl disabled:opacity-50"
                  >
                    {confirming2FA ? "Confirmando..." : "Confirmar"}
                  </button>
                </div>
              )}

              {recoveryCodes.length > 0 && (
                <div className="mt-4 bg-slate-100 p-4 rounded-xl">
                  <h3 className="font-bold mb-2">Códigos de recuperación</h3>

                  <p className="text-sm text-gray-600 mb-3">
                    Guarda estos códigos en un lugar seguro. Te servirán si
                    pierdes acceso a tu aplicación autenticadora.
                  </p>

                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {recoveryCodes.map((code) => (
                      <div
                        key={code}
                        className="bg-white rounded-lg px-3 py-2 border"
                      >
                        {code}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={downloadRecoveryCodes}
                    className="mt-4 bg-slate-800 text-white px-4 py-2 rounded-xl"
                  >
                    Descargar códigos
                  </button>
                </div>
              )}

            </div>
          </div>
        );
      case "notificaciones":
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200">
                Notificaciones por Email
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                    <input
                      type="checkbox"
                      id="pedidos"
                      defaultChecked
                      className="w-5 h-5 text-blue-600"
                    />
                    <label
                      htmlFor="pedidos"
                      className="text-sm font-medium text-gray-700"
                    >
                      Nuevos pedidos
                    </label>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                    <input
                      type="checkbox"
                      id="stock"
                      defaultChecked
                      className="w-5 h-5 text-blue-600"
                    />
                    <label
                      htmlFor="stock"
                      className="text-sm font-medium text-gray-700"
                    >
                      Stock bajo
                    </label>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                    <input
                      type="checkbox"
                      id="usuarios"
                      defaultChecked
                      className="w-5 h-5 text-blue-600"
                    />
                    <label
                      htmlFor="usuarios"
                      className="text-sm font-medium text-gray-700"
                    >
                      Nuevos usuarios
                    </label>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                    <input
                      type="checkbox"
                      id="reportes"
                      className="w-5 h-5 text-blue-600"
                    />
                    <label
                      htmlFor="reportes"
                      className="text-sm font-medium text-gray-700"
                    >
                      Reportes semanales
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Configuración</h1>
          <p className="text-gray-500 mt-1">
            Gestiona la configuración del sistema ERP
          </p>
        </div>

        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
          <Save size={20} />
          Guardar Cambios
        </button>
      </div>

      {/* TABS */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1">
        <div className="border-b border-gray-200 flex-shrink-0">
          <nav className="flex justify-center">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={16} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* CONTENT */}
        <div className="p-8 overflow-y-auto flex-1">{renderTabContent()}</div>
      </div>
    </div>
  );
}
