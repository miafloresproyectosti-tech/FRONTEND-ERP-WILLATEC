import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import type { UserRole } from './types/roles';

export type NotificationType = 'success' | 'warning' | 'info';

export type NotificationIcon =
  | 'CheckCircle'
  | 'MessageCircle'
  | 'Package'
  | 'UserCheck'
  | 'Send'
  | 'ShoppingCart';

export interface Notification {
  id: number;
  title: string;
  description: string;
  time: string;
  type: NotificationType;
  icon: NotificationIcon;
  route: string;
  read?: boolean;
  targetRole?: UserRole;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (
    notification: Omit<Notification, 'id' | 'time' | 'read'>
  ) => void;
  markRead: (id: number) => void;

  // 🔥 PRO FLOW HELPERS
  notifyCotizacionEnviada: (id: string) => void;
  notifyCotizacionAprobada: (id: string) => void;
  notifyCotizacionRechazada: (id: string, motivo?: string) => void;
}

const NotificationContext = createContext<
  NotificationContextType | undefined
>(undefined);

const STORAGE_KEY = 'erp_notifications';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  // =========================
  // LOAD STORAGE
  // =========================
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        setAllNotifications(JSON.parse(stored));
      } catch {
        setAllNotifications([]);
      }
    }
  }, []);

  // =========================
  // SAVE STORAGE
  // =========================
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allNotifications));
  }, [allNotifications]);

  // =========================
  // CORE ADD NOTIFICATION
  // =========================
  const addNotification = (
    notification: Omit<Notification, 'id' | 'time' | 'read'>
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now(),
      time: new Date().toLocaleString(),
      read: false,
    };

    setAllNotifications((prev) => [newNotification, ...prev]);
  };

  // =========================
  // MARK AS READ
  // =========================
  const markRead = (id: number) => {
    setAllNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    );
  };

  // =========================
  // FILTER BY ROLE
  // =========================
  const notifications = allNotifications.filter((n) => {
    if (user?.role === 'SUPERADMIN') return true;
    if (!n.targetRole) return true;
    return n.targetRole === user?.role;
  });

  // =========================
  // 🔥 PRO FLOWS
  // =========================

  const notifyCotizacionEnviada = (id: string) => {
    addNotification({
      title: 'Nueva cotización enviada',
      description: `La cotización ${id} está lista para aprobación`,
      type: 'info',
      icon: 'Send',
      route: '/cotizaciones',
      targetRole: 'SUPERADMIN',
    });
  };

  const notifyCotizacionAprobada = (id: string) => {
    addNotification({
      title: 'Cotización aprobada',
      description: `La cotización ${id} fue aprobada`,
      type: 'success',
      icon: 'CheckCircle',
      route: '/cotizaciones',
      targetRole: 'VENTAS',
    });
  };

  const notifyCotizacionRechazada = (id: string, motivo?: string) => {
    addNotification({
      title: 'Cotización rechazada',
      description: `La cotización ${id} fue rechazada${motivo ? `: ${motivo}` : ''}`,
      type: 'warning',
      icon: 'MessageCircle',
      route: '/cotizaciones',
      targetRole: 'VENTAS',
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markRead,
        notifyCotizacionEnviada,
        notifyCotizacionAprobada,
        notifyCotizacionRechazada,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error('useNotifications debe usarse dentro de NotificationProvider');
  return context;
}