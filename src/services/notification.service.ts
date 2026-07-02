import api from "./api";
import { cachedRequest, clearCache } from "../utils/cache";

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

export const notificationService = {
  // Obtener todas las notificaciones del usuario autenticado
  getNotifications: async (options?: { force?: boolean }): Promise<DatabaseNotification[]> => {
    return cachedRequest(
      NOTIFICATIONS_CACHE_KEY,
      async () => {
        const response = await api.get<NotificationResponse>("/notifications");
        return normalizeNotifications(response.data);
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
  },
};
