import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { notificationService } from "@/services/notificationService";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Lightweight global store for the unread-notification count.
 *
 * Why a context instead of React Query:
 * - The rest of Zist uses plain `fetch` + local state, so adding a global
 *   data layer would be out of scope.
 * - We only need ONE value (the count) on the chrome, and a richer fetch on
 *   demand when the panel opens.
 *
 * The provider mounts only when a user is authenticated and starts polling
 * on a 60s cadence. While the tab is hidden, polling pauses (no point
 *   waking the network for an invisible badge).
 */

interface NotificationsContextValue {
  unreadCount: number;
  /** Force a fresh unread-count fetch. The boolean is just for API ergonomics. */
  refreshUnread: (now?: boolean) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

const POLL_INTERVAL_MS = 60_000;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const inFlight = useRef(false);
  const intervalRef = useRef<number | null>(null);

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
      // Silent — the badge just stays where it is. Network blips shouldn't
      // surface as user-visible errors.
    } finally {
      inFlight.current = false;
    }
  }, [user]);

  // Start / stop polling based on authentication and tab visibility.
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Initial fetch on mount/auth change.
    refreshUnread();

    const tick = () => {
      if (document.hidden) return;
      refreshUnread();
    };

    intervalRef.current = window.setInterval(tick, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (!document.hidden) refreshUnread();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user, refreshUnread]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnread }),
    [unreadCount, refreshUnread],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  }
  return ctx;
}