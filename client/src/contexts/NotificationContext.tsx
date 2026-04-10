import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface Notification {
  _id: string;
  type: 'alert' | 'workorder' | 'system' | 'inspection';
  level: 'info' | 'warning' | 'critical';
  title: string;
  message?: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
  relatedType?: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (ids?: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: true,
  markRead: async () => {},
  markAllRead: async () => {},
  deleteNotification: async () => {},
  refresh: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const token = localStorage.getItem('smartsolar_token');
      const res = await fetch('/api/notifications?limit=50', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unread);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Poll every 30 seconds
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const markRead = useCallback(async (ids?: string[]) => {
    const token = localStorage.getItem('smartsolar_token');
    await fetch('/api/notifications/read', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ ids }),
    });
    setNotifications(prev => prev.map(n => ids?.includes(n._id) ? { ...n, read: true } : ids ? { ...n } : { ...n, read: true }));
    setUnreadCount(prev => ids ? Math.max(0, prev - ids.length) : 0);
  }, []);

  const markAllRead = useCallback(async () => {
    const token = localStorage.getItem('smartsolar_token');
    await fetch('/api/notifications/read', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({}),
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    const token = localStorage.getItem('smartsolar_token');
    await fetch(`/api/notifications/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setNotifications(prev => {
      const n = prev.find(n => n._id === id);
      setUnreadCount(c => c - (n && !n.read ? 1 : 0));
      return prev.filter(n => n._id !== id);
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, markRead, markAllRead, deleteNotification, refresh: load }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
