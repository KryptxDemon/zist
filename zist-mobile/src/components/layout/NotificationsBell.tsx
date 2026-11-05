import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react-native";

import { useTheme } from "@/theme";
import { useNotifications } from "@/contexts/NotificationsContext";
import { notificationService } from "@/services/notificationService";
import type { Notification } from "@/types";
import { formatRelativeTime } from "@/lib/time";
import {
  Avatar,
  Button,
  EmptyState,
  IconButton,
  Sheet,
  Skeleton,
  Text,
  useToast,
} from "@/components/ui";

const TYPE_LABEL: Record<string, string> = {
  friend_request: "Friend request",
  friend_accepted: "New friend",
  post_like: "Post liked",
  post_comment: "New comment",
};

/** Bell icon + unread badge that opens the notification sheet. */
export function NotificationsBell() {
  const { colors, radius } = useTheme();
  const { unreadCount, refreshUnread } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton
        accessibilityLabel="Notifications"
        onPress={() => {
          setOpen(true);
          void refreshUnread(true);
        }}
      >
        <View>
          <Bell size={20} color={colors.mutedForeground} />
          {unreadCount > 0 ? (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -6,
                minWidth: 16,
                height: 16,
                paddingHorizontal: 3,
                borderRadius: radius.full,
                backgroundColor: colors.destructive,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text variant="caption" tint="#fff" weight="semibold" style={{ fontSize: 10, lineHeight: 12 }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </IconButton>

      <NotificationPanel visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function NotificationPanel({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const { refreshUnread } = useNotifications();
  const { toast } = useToast();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await notificationService.list({ page: 1, limit: 25 });
      setItems(res.items);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const markRead = async (item: Notification) => {
    if (item.read) return;
    setItems((prev) => prev?.map((n) => (n.id === item.id ? { ...n, read: true } : n)) ?? prev);
    try {
      await notificationService.markRead(item.id);
      void refreshUnread(true);
    } catch {
      /* keep the optimistic state; the next poll corrects it */
    }
  };

  const markAll = async () => {
    setBusy(true);
    try {
      await notificationService.markAllRead();
      setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
      void refreshUnread(true);
      toast({ title: "All notifications marked as read" });
    } catch (error) {
      toast({
        title: "Couldn't mark all as read",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: Notification) => {
    setItems((prev) => prev?.filter((n) => n.id !== item.id) ?? prev);
    try {
      await notificationService.remove(item.id);
      void refreshUnread(true);
    } catch {
      void load();
    }
  };

  const handlePress = async (item: Notification) => {
    await markRead(item);
    const actorId = item.actor?.id;
    if (item.type === "friend_request" || item.type === "friend_accepted") {
      onClose();
      router.push("/friends");
    } else if (actorId) {
      onClose();
      router.push(`/user/${actorId}`);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Notifications"
      maxHeightRatio={0.8}
      footer={
        items && items.length > 0 ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              variant="outline"
              label="Mark all read"
              loading={busy}
              icon={<CheckCheck size={16} color={colors.foreground} />}
              onPress={markAll}
              style={{ flex: 1 }}
            />
            <Button variant="ghost" label="Close" onPress={onClose} />
          </View>
        ) : null
      }
    >
      {items == null ? (
        <View style={{ gap: 10 }}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Skeleton height={40} width={40} rounded={20} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton height={14} width="70%" />
                <Skeleton height={12} width="40%" />
              </View>
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell size={26} color={colors.mutedForeground} />}
          title="No notifications"
          description="Friend requests, likes and comments will show up here."
        />
      ) : (
        <View>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => void handlePress(item)}
              style={{
                flexDirection: "row",
                gap: 12,
                alignItems: "flex-start",
                paddingVertical: 12,
                paddingHorizontal: 4,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                backgroundColor: item.read ? "transparent" : colors.primary + "0d",
              }}
            >
              <Avatar
                name={item.actor?.display_name ?? "Zist"}
                avatarUrl={item.actor?.avatar_url ?? undefined}
                userId={item.actor?.id}
                size="sm"
              />
              <View style={{ flex: 1, gap: 3 }}>
                <Text variant="small" weight={item.read ? "regular" : "semibold"}>
                  {item.message || TYPE_LABEL[item.type] || "Notification"}
                </Text>
                <Text variant="caption">{formatRelativeTime(item.created_at)}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {!item.read ? (
                  <Pressable onPress={() => void markRead(item)} hitSlop={8}>
                    <Check size={16} color={colors.primary} />
                  </Pressable>
                ) : null}
                <Pressable onPress={() => void remove(item)} hitSlop={8}>
                  <Trash2 size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Sheet>
  );
}
