import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCircle2,
  Heart,
  Loader2,
  MessageCircle,
  UserPlus,
  UserCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { notificationService } from "@/services/notificationService";
import { useNotifications } from "@/contexts/NotificationsContext";
import type { Notification, NotificationType } from "@/types";
import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

interface NotificationPanelProps {
  onClose?: () => void;
}

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  post_like: Heart,
  post_comment: MessageCircle,
};

const TYPE_LABELS: Record<NotificationType, string> = {
  friend_request: "Friend request",
  friend_accepted: "Friend accepted",
  post_like: "Like",
  post_comment: "Comment",
};

/**
 * Slide-down panel listing the current user's notifications.
 *
 * Mounted inside a Popover. Self-contained: handles its own loading,
 * empty-state, error, and "mark all read" actions.
 */
export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { unreadCount, refreshUnread } = useNotifications();

  const [items, setItems] = useState<Notification[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationService.list({
        unreadOnly: filter === "unread",
        limit: 50,
      });
      setItems(res.items);
    } catch (e) {
      setError((e as Error).message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleMarkRead = useCallback(
    async (n: Notification) => {
      if (n.read) return;
      // Optimistic update so the UI feels instant.
      setItems((prev) =>
        prev
          ? prev.map((p) => (p.id === n.id ? { ...p, read: true } : p))
          : prev,
      );
      try {
        await notificationService.markRead(n.id);
        refreshUnread(true);
      } catch {
        // Revert on failure
        setItems((prev) =>
          prev
            ? prev.map((p) => (p.id === n.id ? { ...p, read: false } : p))
            : prev,
        );
      }
    },
    [refreshUnread],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (busy || unreadCount === 0) return;
    setBusy(true);
    try {
      await notificationService.markAllRead();
      setItems((prev) =>
        prev ? prev.map((p) => ({ ...p, read: true })) : prev,
      );
      refreshUnread(true);
      toast({ title: "All notifications marked as read" });
    } catch (e) {
      toast({
        title: (e as Error).message || "Failed to mark all as read",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [busy, unreadCount, refreshUnread, toast]);

  const handleDelete = useCallback(
    async (n: Notification) => {
      const prev = items;
      setItems((p) => (p ? p.filter((x) => x.id !== n.id) : p));
      if (!n.read) refreshUnread(true);
      try {
        await notificationService.remove(n.id);
      } catch (e) {
        setItems(prev);
        if (!n.read) refreshUnread(true);
        toast({
          title: (e as Error).message || "Failed to delete notification",
          variant: "destructive",
        });
      }
    },
    [items, refreshUnread, toast],
  );

  const handleNotificationClick = useCallback(
    (n: Notification) => {
      // Mark first so the click "consumes" it.
      handleMarkRead(n);
      onClose?.();

      // The backend doesn't yet expose typed entity fields. Prefer the actor
      // when it's a friend-related notification, otherwise no navigation.
      if (
        n.actor?.id &&
        (n.type === "friend_request" || n.type === "friend_accepted")
      ) {
        navigate(`/app/user/${n.actor.id}`);
      }
    },
    [handleMarkRead, navigate, onClose],
  );

  const filteredItems = items ?? [];

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Notifications
          </h2>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : items
                ? "All caught up"
                : " "}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={busy || unreadCount === 0}
          className="text-xs gap-1"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Mark all read
        </Button>
      </header>

      <div className="px-4 pt-2">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | "unread")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="max-h-[60vh] min-h-[18rem]">
        {loading && items === null ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={fetch} />
        ) : filteredItems.length === 0 ? (
          <EmptyNotifications filter={filter} />
        ) : (
          <ul className="py-2">
            {filteredItems.map((n) => (
              <li key={n.id}>
                <NotificationRow
                  notification={n}
                  onClick={() => handleNotificationClick(n)}
                  onDelete={() => handleDelete(n)}
                />
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

interface NotificationRowProps {
  notification: Notification;
  onClick: () => void;
  onDelete: () => void;
}

function NotificationRow({
  notification: n,
  onClick,
  onDelete,
}: NotificationRowProps) {
  const Icon = TYPE_ICONS[n.type] ?? Bell;
  const label = TYPE_LABELS[n.type] ?? "Notification";

  return (
    <div
      className={cn(
        "group relative px-4 py-2.5 flex gap-3 cursor-pointer transition-colors",
        "hover:bg-accent/40",
        !n.read && "bg-primary/5",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
          n.type === "friend_request" && "bg-amber-500/15 text-amber-300",
          n.type === "friend_accepted" && "bg-emerald-500/15 text-emerald-300",
          n.type === "post_comment" && "bg-sky-500/15 text-sky-300",
          n.type === "post_like" && "bg-rose-500/15 text-rose-300",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground line-clamp-2 leading-snug">
          {n.message || buildFallbackMessage(n)}
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
          <span>{label}</span>
          <span>·</span>
          <span>{formatRelativeTime(n.created_at)}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {!n.read && (
          <span
            className="h-2 w-2 rounded-full bg-primary"
            aria-label="Unread"
          />
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          aria-label="Delete notification"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function buildFallbackMessage(n: Notification): string {
  const actor = n.actor?.display_name ?? "Someone";
  switch (n.type) {
    case "friend_request":
      return `${actor} sent you a friend request`;
    case "friend_accepted":
      return `${actor} accepted your friend request`;
    case "post_like":
      return `${actor} liked your post`;
    case "post_comment":
      return `${actor} commented on your post`;
    default:
      return "You have a new notification";
  }
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <p className="text-sm text-destructive mb-3">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function EmptyNotifications({ filter }: { filter: "all" | "unread" }) {
  return (
    <div className="py-10 px-4">
      <EmptyState
        icon={Check}
        title={filter === "unread" ? "Nothing unread" : "No notifications yet"}
        description={
          filter === "unread"
            ? "You're all caught up."
            : "When friends interact with you, you'll see it here."
        }
      />
    </div>
  );
}