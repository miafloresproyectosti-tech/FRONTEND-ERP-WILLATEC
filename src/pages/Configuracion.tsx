import { useEffect, useMemo, useState } from "react";
import {
  Save,
  Building,
  Settings,
  Shield,
  Bell,
  Eye,
  EyeOff,
  AlertTriangle,
  Volume2,
  Monitor,
  Mail,
  BellRing,
  UploadCloud,
} from "lucide-react";
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
import { notificationService } from "../services/notification.service";
import {
  defaultNotificationPreferences,
  type NotificationPreferences,
} from "../services/notificationPreference.service";
import {
  NOTIFICATION_SECTION_META,
  NOTIFICATION_SECTION_ORDER,
  type NotificationSectionKey,
} from "../utils/notificationSections";

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
  const canManageSystemSettings =
    user?.role === "SUPERADMIN" || user?.role === "ADMIN";
  const [loadingEmpresaConfig, setLoadingEmpresaConfig] = useState(false);
  const [savingEmpresaConfig, setSavingEmpresaConfig] = useState(false);
  const [empresaForm, setEmpresaForm] = useState({
    nombre: "",
    ruc: "",
    direccion: "",
    telefono: "",
    correo: "",
  });

  const tabs = useMemo(
    () =>
      [
        { id: "empresa", name: "Empresa", icon: Building },
        { id: "sistema", name: "Sistema", icon: Settings },
        { id: "seguridad", name: "Seguridad", icon: Shield },
        { id: "notificaciones", name: "Notificaciones", icon: Bell },
      ].filter(
        (tab) =>
          !user ||
          canManageSystemSettings ||
          ["seguridad", "notificaciones"].includes(tab.id),
      ),
    [canManageSystemSettings, user],
  );

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
  const [showSecurityQuestionAnswers, setShowSecurityQuestionAnswers] =
    useState([false, false]);
  const [loadingSecurityQuestions, setLoadingSecurityQuestions] =
    useState(false);
  const [savingSecurityQuestions, setSavingSecurityQuestions] = useState(false);
  const [securityQuestionsConfigured, setSecurityQuestionsConfigured] =
    useState(false);
  const [securityQuestionsPassword, setSecurityQuestionsPassword] =
    useState("");
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>(defaultNotificationPreferences);
  const [loadingNotificationPreferences, setLoadingNotificationPreferences] =
    useState(false);
  const [savingNotificationPreferences, setSavingNotificationPreferences] =
    useState(false);
  const [uploadingNotificationSound, setUploadingNotificationSound] =
    useState(false);
  const [securityQuestionsForm, setSecurityQuestionsForm] = useState<
    Array<{ answer: string }>
  >([{ answer: "" }, { answer: "" }]);

  useEffect(() => {
    if (!canManageSystemSettings) return;

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
  }, [canManageSystemSettings]);

  useEffect(() => {
    if (tabs.some((tab) => tab.id === activeTab)) return;
    setActiveTab(tabs[0]?.id || "seguridad");
  }, [activeTab, tabs]);

  useEffect(() => {
    if (activeTab !== "notificaciones") return;

    const loadNotificationPreferences = async () => {
      try {
        setLoadingNotificationPreferences(true);
        const data = await notificationService.getPreferences();
        setNotificationPreferences(data);
      } catch (error) {
        console.warn("Error al cargar preferencias de notificaciones:", error);
        showToast({
          title: "No se pudieron cargar las preferencias",
          description:
            "Se mostrara la configuracion predeterminada para tu rol.",
          type: "warning",
        });
      } finally {
        setLoadingNotificationPreferences(false);
      }
    };

    void loadNotificationPreferences();
  }, [activeTab, showToast]);

  const handleEmpresaChange = (
    field: keyof typeof empresaForm,
    value: string,
  ) => {
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
      const backendMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;

      showToast({
        title: "Error al guardar empresa",
        description:
          backendMessage || "No se pudieron guardar los datos de empresa",
        type: "error",
      });
    } finally {
      setSavingEmpresaConfig(false);
    }
  };

  const saveNotificationPreferences = async () => {
    try {
      setSavingNotificationPreferences(true);
      const data = await notificationService.updatePreferences(
        notificationPreferences,
      );
      setNotificationPreferences(data);
      showToast({
        title: "Notificaciones actualizadas",
        description: "Tus preferencias fueron guardadas correctamente",
        type: "success",
      });
    } catch (error: unknown) {
      const backendMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;

      showToast({
        title: "Error al guardar notificaciones",
        description:
          backendMessage || "No se pudieron guardar tus preferencias",
        type: "error",
      });
    } finally {
      setSavingNotificationPreferences(false);
    }
  };

  const updateNotificationChannel = (
    field:
      | "system_enabled"
      | "email_enabled"
      | "sound_enabled"
      | "browser_enabled",
    value: boolean,
  ) => {
    setNotificationPreferences((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateNotificationModule = (
    module: NotificationSectionKey,
    value: boolean,
  ) => {
    setNotificationPreferences((current) => ({
      ...current,
      modules: {
        ...current.modules,
        [module]: value,
      },
    }));
  };

  const getNotificationSoundLabel = () => {
    const soundUrl = String(
      notificationPreferences.custom_sound_url || "",
    ).trim();
    if (!soundUrl) return "Tono predeterminado del sistema";

    const filename = soundUrl.split("?")[0].split("/").filter(Boolean).pop();
    return filename || "Tono personalizado";
  };

  const playNotificationPreview = async () => {
    const soundUrl = String(
      notificationPreferences.custom_sound_url || "/sounds/notificacion.mp3",
    ).trim();
    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.85;
      await audio.play();
    } catch {
      showToast({
        title: "No se pudo reproducir el tono",
        description:
          "Verifica que el archivo exista o usa una ruta publica valida.",
        type: "warning",
      });
    }
  };

  const uploadNotificationSound = async (file?: File | null) => {
    if (!file) return;

    const isMp3 =
      file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3");
    const maxSizeMb = 5;

    if (!isMp3) {
      showToast({
        title: "Archivo no permitido",
        description: "Sube un archivo en formato MP3.",
        type: "warning",
      });
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      showToast({
        title: "Archivo demasiado pesado",
        description: `El tono debe pesar maximo ${maxSizeMb} MB.`,
        type: "warning",
      });
      return;
    }

    try {
      setUploadingNotificationSound(true);
      const data = await notificationService.uploadSound(file);
      setNotificationPreferences(data);
      showToast({
        title: "Tono actualizado",
        description:
          "El MP3 fue guardado y seleccionado como tono de notificacion.",
        type: "success",
      });
    } catch (error: unknown) {
      const backendMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;

      showToast({
        title: "No se pudo subir el tono",
        description:
          backendMessage ||
          "Verifica que el archivo sea MP3 e intenta nuevamente.",
        type: "error",
      });
    } finally {
      setUploadingNotificationSound(false);
    }
  };

  const resetNotificationSound = async () => {
    const nextPreferences: NotificationPreferences = {
      ...notificationPreferences,
      custom_sound_url: null,
    };

    try {
      setSavingNotificationPreferences(true);
      const data = await notificationService.updatePreferences(nextPreferences);
      setNotificationPreferences(data);
      showToast({
        title: "Tono predeterminado activado",
        description: "Se usara el sonido predeterminado del sistema.",
        type: "success",
      });
    } catch (error: unknown) {
      const backendMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;

      showToast({
        title: "No se pudo quitar el tono",
        description: backendMessage || "Intenta nuevamente en unos segundos.",
        type: "error",
      });
    } finally {
      setSavingNotificationPreferences(false);
    }
  };

  const handleSaveChanges = () => {
    if (activeTab === "notificaciones") {
      void saveNotificationPreferences();
      return;
    }

    if (!canManageSystemSettings) {
      showToast({
        title: "Sin cambios pendientes",
        description: "Por ahora este apartado no requiere guardado manual",
        type: "info",
      });
      return;
    }

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

  const handlePasswordFormChange = (
    field: keyof typeof passwordForm,
    value: string,
  ) => {
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
        description: "Ingresa tu contraseña actual",
        type: "warning",
      });
      return;
    }

    if (passwordForm.password.length < 6) {
      showToast({
        title: "Nueva contraseña invalida",
        description: "La nueva contraseña debe tener minimo 6 caracteres",
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
        passwordForm.password_confirmation,
      );

      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });

      showToast({
        title: "Contraseña actualizada",
        description: "Tu contraseña fue cambiada correctamente",
        type: "success",
      });
    } catch (error: unknown) {
      const backendMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;

      showToast({
        title: "Error al cambiar contraseña",
        description:
          backendMessage ||
          "No se pudo cambiar la contraseña. Revisa los datos ingresados",
        type: "error",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSecurityQuestionChange = (index: number, value: string) => {
    setSecurityQuestionsForm((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, answer: value } : row,
      ),
    );
  };

  const saveSecurityQuestions = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
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
        description:
          data.message || "Tus preguntas de seguridad fueron guardadas",
        type: "success",
      });
    } catch (error: unknown) {
      const backendMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;

      showToast({
        title: "Error al guardar preguntas",
        description:
          backendMessage ||
          "No se pudieron actualizar las preguntas de seguridad",
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
        description: "No se pudo desactivar el 2FA. Verifica tu contraseña",
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
        if (!canManageSystemSettings) return null;

        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  Esta direccion sera mostrada en los PDF de cotizacion.
                </p>
                <p className="mt-1 text-sm">
                  Si no configuras una direccion, se seguira usando la direccion
                  actual por defecto.
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
                  onChange={(event) =>
                    handleEmpresaChange("nombre", event.target.value)
                  }
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
                  onChange={(event) =>
                    handleEmpresaChange("ruc", event.target.value)
                  }
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
                onChange={(event) =>
                  handleEmpresaChange("direccion", event.target.value)
                }
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
                  onChange={(event) =>
                    handleEmpresaChange("telefono", event.target.value)
                  }
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
                  onChange={(event) =>
                    handleEmpresaChange("correo", event.target.value)
                  }
                  placeholder="ventas@willatec.com"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
            </div>
          </div>
        );
      case "sistema":
        if (!canManageSystemSettings) return null;

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
            {canManageSystemSettings && (
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
            )}
            {isSuperAdmin && (
              <div className="bg-white rounded-2xl p-6 shadow">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">
                      Preguntas de seguridad
                    </h2>
                    <p className="text-sm text-gray-600">
                      Solo se usarán para recuperar la cuenta SUPERADMIN.
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      securityQuestionsConfigured
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {loadingSecurityQuestions
                      ? "Cargando..."
                      : securityQuestionsConfigured
                        ? "Configuradas"
                        : "Pendientes"}
                  </span>
                </div>

                <form onSubmit={saveSecurityQuestions} className="space-y-4">
                  {securityQuestionsForm.map((row, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 gap-3 lg:grid-cols-2"
                    >
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
                            type={
                              showSecurityQuestionAnswers[index]
                                ? "text"
                                : "password"
                            }
                            value={row.answer}
                            onChange={(event) =>
                              handleSecurityQuestionChange(
                                index,
                                event.target.value,
                              )
                            }
                            className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
                            autoComplete="off"
                            placeholder={
                              securityQuestionsConfigured
                                ? "Nueva respuesta"
                                : "Respuesta"
                            }
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
                            title={
                              showSecurityQuestionAnswers[index]
                                ? "Ocultar respuesta"
                                : "Ver respuesta"
                            }
                          >
                            {showSecurityQuestionAnswers[index] ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
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
                        onChange={(event) =>
                          setSecurityQuestionsPassword(event.target.value)
                        }
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
                      {savingSecurityQuestions
                        ? "Guardando..."
                        : "Guardar preguntas"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-2xl p-6 shadow">
              <h2 className="text-xl font-bold mb-4">Cambiar contraseña</h2>

              <form
                onSubmit={changePassword}
                className="grid grid-cols-1 lg:grid-cols-3 gap-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Contraseña actual
                  </label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(event) =>
                      handlePasswordFormChange(
                        "current_password",
                        event.target.value,
                      )
                    }
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
                    autoComplete="current-password"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Nueva contraseña
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
                      title={
                        showNewPassword
                          ? "Ocultar contrasena"
                          : "Ver contrasena"
                      }
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Confirmar nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.password_confirmation}
                      onChange={(event) =>
                        handlePasswordFormChange(
                          "password_confirmation",
                          event.target.value,
                        )
                      }
                      className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
                      autoComplete="new-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((current) => !current)
                      }
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                      title={
                        showConfirmPassword
                          ? "Ocultar contraseña"
                          : "Ver contraseña"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
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
                    {changingPassword
                      ? "Guardando..."
                      : "Guardar nueva contrasena"}
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
      case "notificaciones": {
        const channelOptions = [
          {
            key: "system_enabled" as const,
            title: "Dentro del sistema",
            description:
              "Muestra avisos en la campana y contadores del sidebar.",
            icon: BellRing,
          },
          {
            key: "sound_enabled" as const,
            title: "Sonido",
            description: "Reproduce un tono cuando llegan avisos nuevos.",
            icon: Volume2,
          },
          {
            key: "browser_enabled" as const,
            title: "Notificación del navegador",
            description: "Muestra avisos del navegador si diste permiso.",
            icon: Monitor,
          },
          {
            key: "email_enabled" as const,
            title: "Email",
            description: "Preferencia preparada para avisos por correo.",
            icon: Mail,
          },
        ];
        const allowedModules = notificationPreferences.allowed_modules || [];
        const visibleModules = NOTIFICATION_SECTION_ORDER.filter((module) =>
          allowedModules.includes(module),
        );

        return (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900">
              <p className="font-semibold">Preferencias personales</p>
              <p className="mt-1 text-blue-800">
                Solo puedes configurar los modulos disponibles para tu rol. Los
                cambios afectan tu campana, contadores y avisos en este usuario.
              </p>
            </div>

            {loadingNotificationPreferences ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                Cargando preferencias...
              </div>
            ) : (
              <>
                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Canales
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {channelOptions.map((option) => {
                      const Icon = option.icon;
                      const checked = Boolean(
                        notificationPreferences[option.key],
                      );

                      return (
                        <label
                          key={option.key}
                          className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                            checked
                              ? "border-blue-200 bg-blue-50"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              updateNotificationChannel(
                                option.key,
                                event.target.checked,
                              )
                            }
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600"
                          />
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                            <Icon size={20} />
                          </span>
                          <span>
                            <span className="block text-sm font-bold text-gray-900">
                              {option.title}
                            </span>
                            <span className="mt-1 block text-sm text-gray-600">
                              {option.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Modulos
                  </h3>
                  <p className="text-sm text-gray-500">
                    Activa solo los avisos que quieres ver en tu cuenta.
                  </p>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {visibleModules.map((module) => {
                      const meta = NOTIFICATION_SECTION_META[module];
                      const Icon = meta.icon;
                      const checked =
                        notificationPreferences.modules[module] !== false;

                      return (
                        <label
                          key={module}
                          className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                            checked
                              ? "border-slate-200 bg-white shadow-sm"
                              : "border-gray-200 bg-gray-50 opacity-75"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              updateNotificationModule(
                                module,
                                event.target.checked,
                              )
                            }
                            disabled={!notificationPreferences.system_enabled}
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 disabled:opacity-50"
                          />
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta.accent}`}
                          >
                            <Icon size={20} />
                          </span>
                          <span>
                            <span className="block text-sm font-bold text-gray-900">
                              {meta.label}
                            </span>
                            <span className="mt-1 block text-sm text-gray-600">
                              {meta.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex flex-col gap-5">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        Tono personalizado
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Sube un MP3 para usarlo como tono cuando lleguen nuevas
                        notificaciones.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-5 py-6 text-center transition hover:bg-blue-50">
                        <UploadCloud className="mb-2 text-blue-700" size={28} />
                        <span className="text-sm font-bold text-blue-800">
                          {uploadingNotificationSound
                            ? "Subiendo tono..."
                            : "Seleccionar MP3"}
                        </span>
                        <span className="mt-1 text-xs text-blue-700">
                          Formato .mp3, maximo 5 MB
                        </span>
                        <input
                          type="file"
                          accept=".mp3,audio/mpeg"
                          disabled={uploadingNotificationSound}
                          onChange={(event) => {
                            void uploadNotificationSound(
                              event.target.files?.[0],
                            );
                            event.currentTarget.value = "";
                          }}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => void playNotificationPreview()}
                        disabled={
                          !notificationPreferences.sound_enabled ||
                          uploadingNotificationSound
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Volume2 size={16} />
                        Probar tono
                      </button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800">
                            Tono seleccionado
                          </p>
                          <p
                            className="mt-1 truncate text-sm text-gray-600"
                            title={
                              notificationPreferences.custom_sound_url ||
                              undefined
                            }
                          >
                            {getNotificationSoundLabel()}
                          </p>
                        </div>
                        {notificationPreferences.custom_sound_url && (
                          <button
                            type="button"
                            onClick={() => void resetNotificationSound()}
                            disabled={
                              savingNotificationPreferences ||
                              uploadingNotificationSound
                            }
                            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Usar predeterminado
                          </button>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-gray-500">
                        Al subir un MP3 se guarda y queda seleccionado
                        automaticamente para tu usuario.
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        );
      }

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

        {((canManageSystemSettings && activeTab === "empresa") ||
          activeTab === "notificaciones") && (
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={savingEmpresaConfig || savingNotificationPreferences}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-5 py-3 rounded-2xl flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <Save size={20} />
            {savingEmpresaConfig || savingNotificationPreferences
              ? "Guardando..."
              : "Guardar Cambios"}
          </button>
        )}
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
