import { apiClient } from "./apiClient";
import type {
  Notification,
  NotificationListResponse,
  NotificationMessageResponse,
  NotificationUnreadCount,
} from "@/types";

/**
 * Frontend service for the notification system.
 *
 * The backend exposes a small REST surface. The frontend polls
 * `unreadCount` on a short interval to drive the bell badge and fetches the
 * full list lazily when the user opens the panel or notifications page.
 */

export interface NotificationListOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export const notificationService = {
  /**
   * Fetch a page of notifications for the current user.
   */
  async list(
    options: NotificationListOptions = {},
  ): Promise<NotificationListResponse> {
    const { page = 1, limit = 25, unreadOnly = false } = options;
    return apiClient.get<NotificationListResponse>("/notifications", {
      params: { page, limit, unread_only: unreadOnly },
    });
  },

  /**
   * Fetch only the count of unread notifications (drives the bell badge).
   */
  async unreadCount(): Promise<NotificationUnreadCount> {
    return apiClient.get<NotificationUnreadCount>(
      "/notifications/unread-count",
    );
  },

  /**
   * Mark a single notification as read.
   *
   * Backend returns a small `{message}` envelope; this method resolves to a
   * minimal `{id}` so callers can update local state without a re-fetch.
   */
  async markRead(
    notificationId: string,
  ): Promise<NotificationMessageResponse & { id: string }> {
    const res = await apiClient.post<NotificationMessageResponse>(
      `/notifications/${notificationId}/read`,
    );
    return { ...res, id: notificationId };
  },

  /**
   * Mark every unread notification as read.
   */
  async markAllRead(): Promise<NotificationMessageResponse> {
    return apiClient.post<NotificationMessageResponse>(
      "/notifications/read-all",
    );
  },

  /**
   * Delete a single notification.
   */
  async remove(notificationId: string): Promise<void> {
    await apiClient.delete<void>(`/notifications/${notificationId}`);
  },
};

/**
 * Helper: derive a useful navigation target for a notification row.
 *
 * The backend's `NotificationRead` doesn't yet expose typed `entity_*` fields
 * (those are still inside the free-form `data` blob). For now, this returns
 * `null` — the panel can still surface the message and timestamp while we
 * decide how to wire entity-based navigation.
 */
export function getNotificationHref(
  _notification: Notification,
): string | null {
  return null;
}