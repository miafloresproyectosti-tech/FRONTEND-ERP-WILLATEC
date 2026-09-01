import api from "./api";
import { cachedRequest, clearCache } from "../utils/cache";
import { getNotificationSectionKey } from "../utils/notificationSections";
import {
  notificationPreferenceService,
  NOTIFICATION_PREFERENCES_CACHE_KEY,
  type NotificationPreferences,
} from "./notificationPreference.service";

export interface DatabaseNotification {
  id: string;
  type: string;
  notifiable_type?: string;
  notifiable_id?: number;
  data: {
    title?: string;
    description?: string;
    message?: string;
    action_url?: string;
    [key: string]: unknown;
  };
  read_at: string | null;
  created_at: string;
  updated_at?: string;
}

export type NotificationResponse =
  | DatabaseNotification[]
  | {
      data: DatabaseNotification[];
    }
  | {
      notifications: DatabaseNotification[];
    };

const normalizeNotifications = (
  response: NotificationResponse
): DatabaseNotification[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if ("notifications" in response && Array.isArray(response.notifications)) {
    return response.notifications;
  }

  if ("data" in response && Array.isArray(response.data)) {
    return response.data;
  }

  return [];
};

const NOTIFICATIONS_CACHE_KEY = "notifications:current-user";
const NOTIFICATIONS_TTL_MS = 15_000;
export const NOTIFICATIONS_UPDATED_EVENT = "erp:notifications-updated";

const notifyNotificationsUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
  }
};

const filterNotificationsByPreferences = (
  notifications: DatabaseNotification[],
  preferences: NotificationPreferences
) => {
  if (!preferences.system_enabled) return [];

  return notifications.filter((notification) => {
    const section = getNotificationSectionKey(notification);

    return preferences.allowed_modules.includes(section) && preferences.modules[section] !== false;
  });
};

export const notificationService = {
  getPreferences: async (): Promise<NotificationPreferences> =>
    cachedRequest(
      NOTIFICATION_PREFERENCES_CACHE_KEY,
      () => notificationPreferenceService.get(),
      {
        ttlMs: 60_000,
        persist: false,
      }
    ),

  updatePreferences: async (payload: NotificationPreferences): Promise<NotificationPreferences> => {
    const preferences = await notificationPreferenceService.update(payload);
    clearCache(NOTIFICATIONS_CACHE_KEY);
    notifyNotificationsUpdated();
    return preferences;
  },

  uploadSound: async (file: File): Promise<NotificationPreferences> => {
    const preferences = await notificationPreferenceService.uploadSound(file);
    clearCache(NOTIFICATIONS_CACHE_KEY);
    notifyNotificationsUpdated();
    return preferences;
  },

  // Obtener todas las notificaciones del usuario autenticado
  getNotifications: async (options?: { force?: boolean }): Promise<DatabaseNotification[]> => {
    return cachedRequest(
      NOTIFICATIONS_CACHE_KEY,
      async () => {
        const [response, preferences] = await Promise.all([
          api.get<NotificationResponse>("/notifications"),
          notificationService.getPreferences(),
        ]);

        return filterNotificationsByPreferences(normalizeNotifications(response.data), preferences);
      },
      {
        ttlMs: NOTIFICATIONS_TTL_MS,
        persist: false,
        force: options?.force,
      }
    );
  },

  // Marcar una notificación como leída
  markAsRead: async (id: string): Promise<DatabaseNotification> => {
    const response = await api.patch<DatabaseNotification>(
      `/notifications/${id}/read`
    );
    clearCache(NOTIFICATIONS_CACHE_KEY);
    notifyNotificationsUpdated();
    return response.data;
  },

  // Obtener solo notificaciones no leídas
  getUnreadNotifications: async (): Promise<DatabaseNotification[]> => {
    const notifications = await notificationService.getNotifications();
    return notifications.filter((notif) => !notif.read_at);
  },

  // Contar notificaciones no leídas
  countUnread: async (): Promise<number> => {
    const unread = await notificationService.getUnreadNotifications();
    return unread.length;
  },

  // Marcar todas como leídas
  markAllAsRead: async (): Promise<void> => {
    const notifications = await notificationService.getNotifications();
    const unreadIds = notifications
      .filter((n) => !n.read_at)
      .map((n) => n.id);

    for (const id of unreadIds) {
      await notificationService.markAsRead(id);
    }

    clearCache(NOTIFICATIONS_CACHE_KEY);
    notifyNotificationsUpdated();
  },
};
