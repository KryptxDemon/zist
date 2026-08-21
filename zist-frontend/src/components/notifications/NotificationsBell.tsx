import { useEffect, useRef, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationPanel } from "./NotificationPanel";
import { useNotifications } from "@/contexts/NotificationsContext";
import { cn } from "@/lib/utils";

/**
 * Bell icon button + unread badge that opens the in-app notification panel.
 *
 * The button is rendered in the top-right chrome (next to the theme toggle &
 * avatar). It does NOT navigate to a separate page — the panel is a popover
 * anchored to the bell.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { unreadCount, refreshUnread } = useNotifications();
  const [dotPulse, setDotPulse] = useState(false);
  const lastCountRef = useRef(unreadCount);

  // Refresh unread count when the bell is opened and revalidate at a
  // reasonable cadence. We don't poll every second — just when the user
  // opens the panel, plus on a 60s background cadence driven by the context.
  useEffect(() => {
    if (open) {
      // Force a refresh so the panel always opens on the latest data.
      refreshUnread(true);
    }
  }, [open, refreshUnread]);

  // Brief visual cue when a new notification arrives.
  useEffect(() => {
    if (unreadCount > lastCountRef.current) {
      setDotPulse(true);
      const t = setTimeout(() => setDotPulse(false), 1500);
      return () => clearTimeout(t);
    }
    lastCountRef.current = unreadCount;
  }, [unreadCount]);

  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications, none unread"
          }
          title="Notifications"
        >
          <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          {unreadCount > 0 ? (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none",
                dotPulse && "animate-pulse",
              )}
            >
              {displayCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[22rem] sm:w-[26rem] p-0 rounded-2xl border-white/10 bg-popover/95 backdrop-blur-xl"
      >
        <NotificationPanel onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Quiet no-op icon-button with a spinning loader — used by the panel itself
 * when refetching in the background.
 */
export function NotificationsBellLoading() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      disabled
      aria-label="Loading notifications"
    >
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </Button>
  );
}