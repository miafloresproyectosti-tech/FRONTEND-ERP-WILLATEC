import { useState } from 'react';
import { Save, Building, Settings, Shield, Bell } from 'lucide-react';
import {
  enableTwoFactorRequest,
  getTwoFactorQrRequest,
  confirmTwoFactorRequest,
  disableTwoFactorRequest,
} from "../services/auth.service";

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState('empresa');

  const tabs = [
    { id: 'empresa', name: 'Empresa', icon: Building },
    { id: 'sistema', name: 'Sistema', icon: Settings },
    { id: 'seguridad', name: 'Seguridad', icon: Shield },
    { id: 'notificaciones', name: 'Notificaciones', icon: Bell },
  ];

  //VERIFICACION DE 2 PASOS
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const enable2FA = async () => {
    await enableTwoFactorRequest();
    const data = await getTwoFactorQrRequest();
    setQr(data.svg);
  };

  const confirm2FA = async () => {
    const data = await confirmTwoFactorRequest(code);
    setRecoveryCodes(data.recovery_codes || []);
  };

  const disable2FA = async () => {
    const password = prompt("Ingrese su contraseña actual");
    if (!password) return;
    await disableTwoFactorRequest(password);
    setQr("");
    setRecoveryCodes([]);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'empresa':
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-2">
                <label className="text-sm font-semibold text-gray-700">Nombre de la Empresa</label>
                <input
                  type="text"
                  defaultValue="Willatec ERP"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              <div className="lg:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-gray-700">RUC</label>
                <input
                  type="text"
                  defaultValue="12345678901"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Dirección</label>
              <input
                type="text"
                defaultValue="Av. Principal 123, Lima, Perú"
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Teléfono</label>
                <input
                  type="tel"
                  defaultValue="+51 999 999 999"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Correo Electrónico</label>
                <input
                  type="email"
                  defaultValue="info@willatec.com"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
            </div>
          </div>
        );
      case 'sistema':
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Idioma</label>
                <select className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md">
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Zona Horaria</label>
                <select className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md">
                  <option value="America/Lima">America/Lima (UTC-5)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Moneda</label>
                <select className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md">
                  <option value="PEN">Soles (PEN)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Formato de Fecha</label>
                <select className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 'seguridad':
        return (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200">Política de Contraseñas</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Longitud Mínima</label>
                    <input
                      type="number"
                      defaultValue="8"
                      min="6"
                      max="20"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Días para Expiración</label>
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

              <button onClick={enable2FA} className="bg-blue-600 text-white px-4 py-2 rounded-xl">
                Activar 2FA
              </button>

              {qr && (
                <div className="mt-4">
                  <div dangerouslySetInnerHTML={{ __html: qr }} />

                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Código de 6 dígitos"
                    className="border p-3 rounded-xl mt-4"
                  />

                  <button onClick={confirm2FA} className="ml-2 bg-green-600 text-white px-4 py-2 rounded-xl">
                    Confirmar
                  </button>
                </div>
              )}

              {recoveryCodes.length > 0 && (
                <div className="mt-4 bg-slate-100 p-4 rounded-xl">
                  <h3 className="font-bold mb-2">Códigos de recuperación</h3>
                  {recoveryCodes.map((code) => (
                    <div key={code}>{code}</div>
                  ))}
                </div>
              )}

              <button onClick={disable2FA} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-xl">
                Desactivar 2FA
              </button>
            </div>
          </div>
        );
      case 'notificaciones':
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200">Notificaciones por Email</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                    <input type="checkbox" id="pedidos" defaultChecked className="w-5 h-5 text-blue-600" />
                    <label htmlFor="pedidos" className="text-sm font-medium text-gray-700">Nuevos pedidos</label>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                    <input type="checkbox" id="stock" defaultChecked className="w-5 h-5 text-blue-600" />
                    <label htmlFor="stock" className="text-sm font-medium text-gray-700">Stock bajo</label>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                    <input type="checkbox" id="usuarios" defaultChecked className="w-5 h-5 text-blue-600" />
                    <label htmlFor="usuarios" className="text-sm font-medium text-gray-700">Nuevos usuarios</label>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                    <input type="checkbox" id="reportes" className="w-5 h-5 text-blue-600" />
                    <label htmlFor="reportes" className="text-sm font-medium text-gray-700">Reportes semanales</label>
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
          <h1 className="text-3xl font-bold text-gray-800">
            Configuración
          </h1>
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
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
        <div className="p-8 overflow-y-auto flex-1">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}