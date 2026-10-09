import api from "./api";
import { clearCache } from "../utils/cache";
import type { NotificationSectionKey } from "../utils/notificationSections";

export interface NotificationPreferences {
  system_enabled: boolean;
  email_enabled: boolean;
  sound_enabled: boolean;
  browser_enabled: boolean;
  custom_sound_url?: string | null;
  modules: Partial<Record<NotificationSectionKey, boolean>>;
  allowed_modules: NotificationSectionKey[];
}

export const NOTIFICATION_PREFERENCES_CACHE_KEY = "notification-preferences:current-user";
export const NOTIFICATION_PREFERENCES_UPDATED_EVENT = "erp:notification-preferences-updated";

export const defaultNotificationPreferences: NotificationPreferences = {
  system_enabled: true,
  email_enabled: true,
  sound_enabled: true,
  browser_enabled: false,
  custom_sound_url: null,
  modules: {
    cotizaciones: true,
    oportunidades: true,
    ordenes: true,
    inventario: true,
    servicios: true,
    usuarios: true,
    general: true,
  },
  allowed_modules: [
    "cotizaciones",
    "oportunidades",
    "ordenes",
    "inventario",
    "servicios",
    "usuarios",
    "general",
  ],
};

const notifyPreferencesUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATION_PREFERENCES_UPDATED_EVENT));
  }
};

export const notificationPreferenceService = {
  get: async (): Promise<NotificationPreferences> => {
    const response = await api.get<NotificationPreferences>("/notification-preferences");
    return {
      ...defaultNotificationPreferences,
      ...response.data,
      modules: {
        ...defaultNotificationPreferences.modules,
        ...(response.data.modules || {}),
      },
      allowed_modules: response.data.allowed_modules || defaultNotificationPreferences.allowed_modules,
    };
  },

  update: async (payload: NotificationPreferences): Promise<NotificationPreferences> => {
    const response = await api.put<NotificationPreferences>("/notification-preferences", payload);
    clearCache(NOTIFICATION_PREFERENCES_CACHE_KEY);
    notifyPreferencesUpdated();
    return {
      ...defaultNotificationPreferences,
      ...response.data,
      modules: {
        ...defaultNotificationPreferences.modules,
        ...(response.data.modules || {}),
      },
      allowed_modules: response.data.allowed_modules || defaultNotificationPreferences.allowed_modules,
    };
  },

  uploadSound: async (file: File): Promise<NotificationPreferences> => {
    const formData = new FormData();
    formData.append("sound", file);

    const response = await api.post<NotificationPreferences>(
      "/notification-preferences/sound",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    clearCache(NOTIFICATION_PREFERENCES_CACHE_KEY);
    notifyPreferencesUpdated();

    return {
      ...defaultNotificationPreferences,
      ...response.data,
      modules: {
        ...defaultNotificationPreferences.modules,
        ...(response.data.modules || {}),
      },
      allowed_modules: response.data.allowed_modules || defaultNotificationPreferences.allowed_modules,
    };
  },
};
