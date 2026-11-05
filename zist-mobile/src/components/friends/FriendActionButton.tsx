import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { Check, UserCheck, UserPlus, UserX, X as XIcon } from "lucide-react-native";

import { Button, useToast } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { friendService } from "@/services/friendService";
import { useTheme } from "@/theme";
import type { FriendRelationship, FriendRelationshipState } from "@/types";

interface FriendActionButtonProps {
  /** The user we are viewing (never the current user). */
  targetUserId: string;
  /** Display name used in toasts. */
  targetUserName?: string;
  /** Optional container style for the surrounding button row. */
  style?: ViewStyle;
  /** Fired after a successful mutation so the parent can refresh. */
  onChange?: () => void;
}

const EMERALD = "#34d399";
const EMERALD_BORDER = "#22c55e66";
const AMBER = "#fbbf24";
const AMBER_BORDER = "#f59e0b66";

/**
 * State-aware button cluster for any "Add Friend" affordance.
 *
 * Drives the UI directly from the backend's `FriendRelationship`:
 *  - `self`             → "View your profile"
 *  - `none`             → "Add Friend"
 *  - `outgoing_pending` → "Request Sent" (+ Cancel)
 *  - `incoming_pending` → "Accept" / "Decline"
 *  - `friends`          → "Friends" (tap to remove)
 *
 * Mutations update the UI optimistically, then reconcile against backend
 * truth (and revert on failure).
 */
export function FriendActionButton({
  targetUserId,
  targetUserName,
  style,
  onChange,
}: FriendActionButtonProps) {
  const { colors } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();

  const [relationship, setRelationship] = useState<FriendRelationship | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (!user) return;
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        const rel = await friendService.getRelationship(targetUserId);
        setRelationship(rel);
      } catch (e) {
        setError((e as Error).message || "Failed to load relationship");
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [targetUserId, user],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  const refresh = useCallback(() => load(false), [load]);

  const run = useCallback(
    async (
      optimistic: FriendRelationshipState | null,
      fn: () => Promise<unknown>,
      success?: string,
    ) => {
      const previous = relationship;
      setBusy(true);
      if (optimistic && relationship) {
        setRelationship({ ...relationship, state: optimistic });
      }
      try {
        await fn();
        if (success) toast({ title: success });
        await refresh();
        onChange?.();
      } catch (e) {
        setRelationship(previous);
        toast({
          title: (e as Error).message || "Action failed",
          variant: "destructive",
        });
      } finally {
        setBusy(false);
      }
    },
    [relationship, refresh, onChange, toast],
  );

  const handleSend = () =>
    run(
      "outgoing_pending",
      () => friendService.sendRequest(targetUserId),
      `Friend request sent to ${targetUserName ?? "user"}`,
    );

  const handleCancel = () => {
    const id = relationship?.request_id;
    if (!id) return;
    return run(
      "none",
      () => friendService.cancelRequest(id),
      "Friend request cancelled",
    );
  };

  const handleAccept = () => {
    const id = relationship?.request_id;
    if (!id) return;
    return run(
      "friends",
      () => friendService.acceptRequest(id),
      `You and ${targetUserName ?? "this user"} are now friends`,
    );
  };

  const handleDecline = () => {
    const id = relationship?.request_id;
    if (!id) return;
    return run(
      "none",
      () => friendService.declineRequest(id),
      "Friend request declined",
    );
  };

  const handleUnfriend = () =>
    run("none", () => friendService.unfriend(targetUserId), "Removed from friends");

  if (loading) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        icon={<ActivityIndicator size="small" color={colors.mutedForeground} />}
        label="Loading"
        style={style}
      />
    );
  }

  if (error) {
    return (
      <Button
        variant="outline"
        size="sm"
        onPress={() => void refresh()}
        icon={<UserX size={16} color={colors.mutedForeground} />}
        label="Retry"
        style={style}
      />
    );
  }

  if (!relationship) return null;

  const state: FriendRelationshipState = relationship.state;

  if (state === "self") {
    return (
      <Button
        variant="outline"
        size="sm"
        onPress={() => router.push("/profile")}
        label="View your profile"
        style={style}
      />
    );
  }

  if (state === "friends") {
    return (
      <Button
        variant="outline"
        size="sm"
        onPress={handleUnfriend}
        disabled={busy}
        icon={
          busy ? (
            <ActivityIndicator size="small" color={EMERALD} />
          ) : (
            <UserCheck size={16} color={EMERALD} />
          )
        }
        label="Friends"
        style={[{ borderColor: EMERALD_BORDER }, ...(style ? [style] : [])]}
        textStyle={{ color: EMERALD }}
      />
    );
  }

  if (state === "outgoing_pending") {
    return (
      <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>
        <Button
          variant="outline"
          size="sm"
          disabled
          icon={<UserPlus size={16} color={AMBER} />}
          label="Request Sent"
          style={{ borderColor: AMBER_BORDER }}
          textStyle={{ color: AMBER }}
        />
        <Button
          variant="ghost"
          size="sm"
          onPress={handleCancel}
          disabled={busy}
          icon={
            busy ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <XIcon size={16} color={colors.mutedForeground} />
            )
          }
          label="Cancel"
          textStyle={{ color: colors.mutedForeground }}
        />
      </View>
    );
  }

  if (state === "incoming_pending") {
    return (
      <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>
        <Button
          size="sm"
          onPress={handleAccept}
          disabled={busy}
          icon={
            busy ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Check size={16} color="#ffffff" />
            )
          }
          label="Accept"
          style={{ backgroundColor: "#16a34a" }}
          textStyle={{ color: "#ffffff" }}
        />
        <Button
          variant="outline"
          size="sm"
          onPress={handleDecline}
          disabled={busy}
          icon={<XIcon size={16} color={colors.destructive} />}
          label="Decline"
          style={{ borderColor: colors.destructive + "66" }}
          textStyle={{ color: colors.destructive }}
        />
      </View>
    );
  }

  // state === "none"
  return (
    <Button
      size="sm"
      onPress={handleSend}
      disabled={busy}
      icon={
        busy ? (
          <ActivityIndicator size="small" color={colors.primaryForeground} />
        ) : (
          <UserPlus size={16} color={colors.primaryForeground} />
        )
      }
      label="Add Friend"
      style={style}
    />
  );
}
