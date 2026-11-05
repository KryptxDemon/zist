import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { notificationService } from "@/services/notificationService";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Global unread-notification count, polled every 60s while the app is in the
 * foreground (the mobile equivalent of the web's visibility-aware polling).
 */
interface NotificationsContextValue {
  unreadCount: number;
  refreshUnread: (now?: boolean) => Promise<void>;
}

const POLL_INTERVAL_MS = 60_000;

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const inFlight = useRef(false);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await notificationService.unreadCount();
      setUnreadCount(res.count ?? 0);
    } catch {
      // Silent — a network blip shouldn't surface a user-visible error.
    } finally {
      inFlight.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    void refreshUnread();

    const interval = setInterval(() => {
      if (AppState.currentState === "active") void refreshUnread();
    }, POLL_INTERVAL_MS);

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshUnread();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [user, refreshUnread]);

  const value = useMemo(() => ({ unreadCount, refreshUnread }), [unreadCount, refreshUnread]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationsProvider");
  return ctx;
}
