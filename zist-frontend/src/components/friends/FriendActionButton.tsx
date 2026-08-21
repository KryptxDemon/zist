import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserCheck,
  UserPlus,
  UserX,
  Loader2,
  Check,
  X as XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { friendService } from "@/services/friendService";
import type {
  FriendRelationship,
  FriendRelationshipState,
} from "@/types";
import { cn } from "@/lib/utils";

interface FriendActionButtonProps {
  /** The user we are viewing (not the current user). */
  targetUserId: string;
  /** Display name used in toasts. */
  targetUserName?: string;
  /** Optional Tailwind class for the surrounding button row. */
  className?: string;
  /** Optional callback fired after a successful mutation (refresh parent). */
  onChange?: () => void;
}

/**
 * State-aware button cluster for any "Add Friend" affordance.
 *
 * Drives 4 (or 6) UI states directly from the backend's `FriendRelationship`:
 *  - `self`         → nothing
 *  - `none`         → "Add Friend"
 *  - `outgoing_pending` → "Request Sent" (with optional cancel)
 *  - `incoming_pending` → "Accept" / "Decline"
 *  - `friends`      → "Friends" (with optional "Remove")
 *
 * After every API mutation, we re-fetch the relationship so the UI reflects
 * backend truth, not stale frontend state.
 */
export function FriendActionButton({
  targetUserId,
  targetUserName,
  className,
  onChange,
}: FriendActionButtonProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [relationship, setRelationship] = useState<FriendRelationship | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const rel = await friendService.getRelationship(targetUserId);
      setRelationship(rel);
    } catch (e) {
      setError((e as Error).message || "Failed to load relationship");
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Wrap refresh + parent notification for mutation flows.
  const refreshAndNotify = useCallback(async () => {
    await refresh();
    onChange?.();
  }, [refresh, onChange]);

  const guarded = async <T,>(fn: () => Promise<T>, successMessage?: string) => {
    setBusy(true);
    try {
      const result = await fn();
      if (successMessage) toast({ title: successMessage });
      return result;
    } catch (e) {
      const message = (e as Error).message || "Action failed";
      toast({ title: message, variant: "destructive" });
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () =>
    guarded(
      () => friendService.sendRequest(targetUserId),
      `Friend request sent to ${targetUserName ?? "user"}`,
    )
      .then(refreshAndNotify)
      .catch(() => {});

  const handleCancel = async () => {
    if (!relationship?.request_id) return;
    guarded(
      () => friendService.cancelRequest(relationship.request_id!),
      "Friend request cancelled",
    )
      .then(refreshAndNotify)
      .catch(() => {});
  };

  const handleAccept = async () => {
    if (!relationship?.request_id) return;
    guarded(
      () => friendService.acceptRequest(relationship.request_id!),
      `You and ${targetUserName ?? "this user"} are now friends`,
    )
      .then(refreshAndNotify)
      .catch(() => {});
  };

  const handleDecline = async () => {
    if (!relationship?.request_id) return;
    guarded(
      () => friendService.declineRequest(relationship.request_id!),
      "Friend request declined",
    )
      .then(refreshAndNotify)
      .catch(() => {});
  };

  const handleUnfriend = async () =>
    guarded(
      () => friendService.unfriend(targetUserId),
      "Removed from friends",
    )
      .then(refreshAndNotify)
      .catch(() => {});

  if (loading) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={cn("gap-2", className)}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading
      </Button>
    );
  }

  if (error) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={refresh}
        className={cn("gap-2 text-muted-foreground", className)}
      >
        <UserX className="h-4 w-4" />
        Retry
      </Button>
    );
  }

  if (!relationship) return null;

  const state: FriendRelationshipState = relationship.state;

  if (state === "self") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/app/profile")}
        className={cn("gap-2", className)}
      >
        View your profile
      </Button>
    );
  }

  if (state === "friends") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnfriend}
        disabled={busy}
        className={cn("gap-2 text-emerald-400 border-emerald-500/40", className)}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserCheck className="h-4 w-4" />
        )}
        Friends
      </Button>
    );
  }

  if (state === "outgoing_pending") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          variant="outline"
          size="sm"
          disabled
          className="gap-2 text-amber-400 border-amber-500/40"
        >
          <UserPlus className="h-4 w-4" />
          Request Sent
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={busy}
          className="text-muted-foreground hover:text-destructive gap-1"
          title="Cancel your friend request"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XIcon className="h-4 w-4" />
          )}
          Cancel
        </Button>
      </div>
    );
  }

  if (state === "incoming_pending") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={busy}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Accept
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDecline}
          disabled={busy}
          className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
        >
          <XIcon className="h-4 w-4" />
          Decline
        </Button>
      </div>
    );
  }

  // state === "none"
  return (
    <Button
      size="sm"
      onClick={handleSend}
      disabled={busy}
      className={cn("gap-2", className)}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      Add Friend
    </Button>
  );
}