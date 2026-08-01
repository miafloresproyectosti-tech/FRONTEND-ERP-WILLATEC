import { useEffect, useState } from "react";
import { Save, Building, Settings, Shield, Bell, Eye, EyeOff, AlertTriangle } from "lucide-react";
import {
  enableTwoFactorRequest,
  getTwoFactorQrRequest,
  confirmTwoFactorRequest,
  disableTwoFactorRequest,
  changePasswordRequest,
  getSuperadminSecurityQuestionsRequest,
  updateSuperadminSecurityQuestionsRequest,
} from "../services/auth.service";
import { useNotifications } from "../NotificationContext";
import { useAuth } from "../AuthContext";
import {
  getEmpresaConfiguracion,
  updateEmpresaConfiguracion,
} from "../services/empresaConfiguracion.service";

const SUPERADMIN_SECURITY_QUESTIONS = [
  "¿Cual es el nombre de tu primera mascota?",
  "¿Cual fue tu apodo en la universidad?",
];

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState("empresa");
  const { showToast } = useNotifications();
  const { user, updateTwoFactorEnabled } = useAuth();
  const twoFactorEnabled = !!user?.two_factor_enabled;
  const isSuperAdmin = user?.role === "SUPERADMIN";
  const [loadingEmpresaConfig, setLoadingEmpresaConfig] = useState(false);
  const [savingEmpresaConfig, setSavingEmpresaConfig] = useState(false);
  const [empresaForm, setEmpresaForm] = useState({
    nombre: "",
    ruc: "",
    direccion: "",
    telefono: "",
    correo: "",
  });

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
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecurityQuestionAnswers, setShowSecurityQuestionAnswers] = useState([false, false]);
  const [loadingSecurityQuestions, setLoadingSecurityQuestions] = useState(false);
  const [savingSecurityQuestions, setSavingSecurityQuestions] = useState(false);
  const [securityQuestionsConfigured, setSecurityQuestionsConfigured] = useState(false);
  const [securityQuestionsPassword, setSecurityQuestionsPassword] = useState("");
  const [securityQuestionsForm, setSecurityQuestionsForm] = useState<Array<{ answer: string }>>([
    { answer: "" },
    { answer: "" },
  ]);

  useEffect(() => {
    const loadEmpresaConfig = async () => {
      try {
        setLoadingEmpresaConfig(true);
        const data = await getEmpresaConfiguracion();
        setEmpresaForm({
          nombre: data.nombre || "",
          ruc: data.ruc || "",
          direccion: data.direccion || "",
          telefono: data.telefono || "",
          correo: data.correo || "",
        });
      } catch (error) {
        console.warn("Error al cargar configuracion de empresa:", error);
      } finally {
        setLoadingEmpresaConfig(false);
      }
    };

    void loadEmpresaConfig();
  }, []);

  const handleEmpresaChange = (field: keyof typeof empresaForm, value: string) => {
    setEmpresaForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveEmpresaConfig = async () => {
    try {
      setSavingEmpresaConfig(true);
      const data = await updateEmpresaConfiguracion({
        nombre: empresaForm.nombre.trim() || null,
        ruc: empresaForm.ruc.trim() || null,
        direccion: empresaForm.direccion.trim() || null,
        telefono: empresaForm.telefono.trim() || null,
        correo: empresaForm.correo.trim() || null,
      });

      setEmpresaForm({
        nombre: data.nombre || "",
        ruc: data.ruc || "",
        direccion: data.direccion || "",
        telefono: data.telefono || "",
        correo: data.correo || "",
      });

      showToast({
        title: "Empresa actualizada",
        description: "Los datos de empresa fueron guardados correctamente",
        type: "success",
      });
    } catch (error: unknown) {
      const backendMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

      showToast({
        title: "Error al guardar empresa",
        description: backendMessage || "No se pudieron guardar los datos de empresa",
        type: "error",
      });
    } finally {
      setSavingEmpresaConfig(false);
    }
  };

  const handleSaveChanges = () => {
    if (activeTab === "empresa") {
      void saveEmpresaConfig();
      return;
    }

    showToast({
      title: "Sin cambios pendientes",
      description: "Por ahora solo el apartado Empresa guarda configuracion",
      type: "info",
    });
  };

  useEffect(() => {
    if (!isSuperAdmin || activeTab !== "seguridad") return;

    const loadSecurityQuestions = async () => {
      try {
        setLoadingSecurityQuestions(true);
        const data = await getSuperadminSecurityQuestionsRequest();
        setSecurityQuestionsConfigured(Boolean(data.configured));
      } catch (error) {
        console.warn("Error al cargar preguntas de seguridad:", error);
      } finally {
        setLoadingSecurityQuestions(false);
      }
    };

    void loadSecurityQuestions();
  }, [activeTab, isSuperAdmin]);

  const handlePasswordFormChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!passwordForm.current_password.trim()) {
      showToast({
        title: "Datos incompletos",
        description: "Ingresa tu contrasena actual",
        type: "warning",
      });
      return;
    }

    if (passwordForm.password.length < 6) {
      showToast({
        title: "Nueva contrasena invalida",
        description: "La nueva contrasena debe tener minimo 6 caracteres",
        type: "warning",
      });
      return;
    }

    if (passwordForm.password !== passwordForm.password_confirmation) {
      showToast({
        title: "Confirmacion incorrecta",
        description: "La confirmacion debe coincidir con la nueva contraseña",
        type: "warning",
      });
      return;
    }

    try {
      setChangingPassword(true);
      await changePasswordRequest(
        passwordForm.current_password,
        passwordForm.password,
        passwordForm.password_confirmation
      );

      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });

      showToast({
        title: "Contrasena actualizada",
        description: "Tu contrasena fue cambiada correctamente",
        type: "success",
      });
    } catch (error: unknown) {
      const backendMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

      showToast({
        title: "Error al cambiar contrasena",
        description:
          backendMessage ||
          "No se pudo cambiar la contrasena. Revisa los datos ingresados",
        type: "error",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSecurityQuestionChange = (
    index: number,
    value: string,
  ) => {
    setSecurityQuestionsForm((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, answer: value } : row,
      ),
    );
  };

  const saveSecurityQuestions = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!securityQuestionsPassword.trim()) {
      showToast({
        title: "Datos incompletos",
        description: "Ingresa tu contraseña actual para confirmar",
        type: "warning",
      });
      return;
    }

    if (securityQuestionsForm.some((row) => !row.answer.trim())) {
      showToast({
        title: "Preguntas incompletas",
        description: "Completa las 2 respuestas de seguridad",
        type: "warning",
      });
      return;
    }

    try {
      setSavingSecurityQuestions(true);
      const data = await updateSuperadminSecurityQuestionsRequest(
        securityQuestionsPassword,
        securityQuestionsForm,
      );
      setSecurityQuestionsConfigured(Boolean(data.configured));
      setSecurityQuestionsPassword("");
      setSecurityQuestionsForm((current) =>
        current.map((row) => ({
          ...row,
          answer: "",
        })),
      );
      showToast({
        title: "Preguntas actualizadas",
        description: data.message || "Tus preguntas de seguridad fueron guardadas",
        type: "success",
      });
    } catch (error: unknown) {
      const backendMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

      showToast({
        title: "Error al guardar preguntas",
        description: backendMessage || "No se pudieron actualizar las preguntas de seguridad",
        type: "error",
      });
    } finally {
      setSavingSecurityQuestions(false);
    }
  };

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
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  Esta direccion sera mostrada en los PDF de cotizacion.
                </p>
                <p className="mt-1 text-sm">
                  Si no configuras una direccion, se seguira usando la direccion actual por defecto.
                </p>
              </div>
            </div>

            {loadingEmpresaConfig && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-700">
                Cargando datos de empresa...
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  value={empresaForm.nombre}
                  onChange={(event) => handleEmpresaChange("nombre", event.target.value)}
                  placeholder="WILLATEC S.A.C"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              <div className="lg:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  RUC
                </label>
                <input
                  type="text"
                  value={empresaForm.ruc}
                  onChange={(event) => handleEmpresaChange("ruc", event.target.value)}
                  placeholder="20602503331"
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
                value={empresaForm.direccion}
                onChange={(event) => handleEmpresaChange("direccion", event.target.value)}
                placeholder="Jr. Jorge Chavez Nro. 1747 - Of.1002 - Brena - Lima"
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
                  value={empresaForm.telefono}
                  onChange={(event) => handleEmpresaChange("telefono", event.target.value)}
                  placeholder="(01) 757-1253"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={empresaForm.correo}
                  onChange={(event) => handleEmpresaChange("correo", event.target.value)}
                  placeholder="ventas@willatec.com"
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
            {isSuperAdmin && (
              <div className="bg-white rounded-2xl p-6 shadow">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Preguntas de seguridad</h2>
                    <p className="text-sm text-gray-600">
                      Solo se usarán para recuperar la cuenta SUPERADMIN.
                    </p>
                  </div>
                  <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    securityQuestionsConfigured
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {loadingSecurityQuestions
                      ? "Cargando..."
                      : securityQuestionsConfigured
                        ? "Configuradas"
                        : "Pendientes"}
                  </span>
                </div>

                <form onSubmit={saveSecurityQuestions} className="space-y-4">
                  {securityQuestionsForm.map((row, index) => (
                    <div key={index} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                          Pregunta {index + 1}
                        </label>
                        <input
                          type="text"
                          value={SUPERADMIN_SECURITY_QUESTIONS[index]}
                          readOnly
                          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
                          placeholder="Ej. ¿Cuál fue tu primera ciudad?"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                          Respuesta
                        </label>
                        <div className="relative">
                          <input
                            type={showSecurityQuestionAnswers[index] ? "text" : "password"}
                            value={row.answer}
                            onChange={(event) =>
                              handleSecurityQuestionChange(index, event.target.value)
                            }
                            className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
                            autoComplete="off"
                            placeholder={securityQuestionsConfigured ? "Nueva respuesta" : "Respuesta"}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowSecurityQuestionAnswers((current) =>
                                current.map((visible, answerIndex) =>
                                  answerIndex === index ? !visible : visible,
                                ),
                              )
                            }
                            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                            title={showSecurityQuestionAnswers[index] ? "Ocultar respuesta" : "Ver respuesta"}
                          >
                            {showSecurityQuestionAnswers[index] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Contraseña actual
                      </label>
                      <input
                        type="password"
                        value={securityQuestionsPassword}
                        onChange={(event) => setSecurityQuestionsPassword(event.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
                        autoComplete="current-password"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingSecurityQuestions}
                      className="inline-flex items-center justify-center gap-2 bg-slate-800 text-white px-5 py-3 rounded-xl font-semibold hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {savingSecurityQuestions ? "Guardando..." : "Guardar preguntas"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-2xl p-6 shadow">
              <h2 className="text-xl font-bold mb-4">Cambiar contraseña</h2>

              <form onSubmit={changePassword} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Contrasena actual
                  </label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(event) =>
                      handlePasswordFormChange("current_password", event.target.value)
                    }
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
                    autoComplete="current-password"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Nueva contrasena
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.password}
                      onChange={(event) =>
                        handlePasswordFormChange("password", event.target.value)
                      }
                      className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
                      autoComplete="new-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((current) => !current)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                      title={showNewPassword ? "Ocultar contrasena" : "Ver contrasena"}
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Confirmar nueva contrasena
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.password_confirmation}
                      onChange={(event) =>
                        handlePasswordFormChange("password_confirmation", event.target.value)
                      }
                      className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
                      autoComplete="new-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                      title={showConfirmPassword ? "Ocultar contrasena" : "Ver contrasena"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {changingPassword ? "Guardando..." : "Guardar nueva contrasena"}
                  </button>
                </div>
              </form>
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

        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={activeTab === "empresa" && savingEmpresaConfig}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-5 py-3 rounded-2xl flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <Save size={20} />
          {activeTab === "empresa" && savingEmpresaConfig ? "Guardando..." : "Guardar Cambios"}
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
