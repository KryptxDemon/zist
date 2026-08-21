import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  UserCheck,
  UserPlus,
  X as XIcon,
  Loader2,
  Users,
  Inbox,
  Send,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/UserAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { friendService } from "@/services/friendService";
import type {
  FriendListResponse,
  FriendRequest,
  FriendRequestListResponse,
} from "@/types";
import { formatRelativeTime } from "@/lib/time";

/**
 * Friends management page: friends list, incoming requests, outgoing requests.
 *
 * The dedicated page is supplementary to the notification bell — the bell
 * surfaces urgent actions (accept/decline) one tap away, and this page
 * exists for the longer view of all relationships.
 */
export default function Friends() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [friends, setFriends] = useState<FriendListResponse | null>(null);
  const [incoming, setIncoming] = useState<FriendRequestListResponse | null>(
    null,
  );
  const [outgoing, setOutgoing] = useState<FriendRequestListResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [f, i, o] = await Promise.all([
        friendService.listFriends(),
        friendService.listIncoming(),
        friendService.listOutgoing(),
      ]);
      setFriends(f);
      setIncoming(i);
      setOutgoing(o);
    } catch (e) {
      setError((e as Error).message || "Failed to load friends");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runAction = useCallback(
    async (id: string, fn: () => Promise<unknown>, success: string) => {
      setBusyId(id);
      try {
        await fn();
        toast({ title: success });
        await refresh();
      } catch (e) {
        toast({
          title: (e as Error).message || "Action failed",
          variant: "destructive",
        });
      } finally {
        setBusyId(null);
      }
    },
    [refresh, toast],
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold font-display">Friends</h1>
          <p className="text-sm text-muted-foreground">
            Manage your connections and friend requests.
          </p>
        </header>

        {loading && !friends ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-destructive mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={refresh}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="incoming" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="incoming" className="gap-2">
                <Inbox className="h-4 w-4" />
                Incoming
                {(incoming?.total ?? 0) > 0 ? (
                  <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] text-white">
                    {incoming?.total}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="outgoing" className="gap-2">
                <Send className="h-4 w-4" />
                Outgoing
              </TabsTrigger>
              <TabsTrigger value="friends" className="gap-2">
                <Users className="h-4 w-4" />
                Friends
                <span className="ml-1 text-[11px] text-muted-foreground">
                  ({friends?.total ?? 0})
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="incoming" className="space-y-3 mt-4">
              {incoming?.items?.length ? (
                incoming.items.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    direction="incoming"
                    selfId={user?.id}
                    busy={busyId === r.id}
                    onAccept={() =>
                      runAction(
                        r.id,
                        () => friendService.acceptRequest(r.id),
                        `You and ${r.requester?.display_name ?? "this user"} are now friends`,
                      )
                    }
                    onDecline={() =>
                      runAction(
                        r.id,
                        () => friendService.declineRequest(r.id),
                        "Friend request declined",
                      )
                    }
                  />
                ))
              ) : (
                <EmptyState
                  icon={Inbox}
                  title="No incoming requests"
                  description="Friend requests other users send you will appear here."
                />
              )}
            </TabsContent>

            <TabsContent value="outgoing" className="space-y-3 mt-4">
              {outgoing?.items?.length ? (
                outgoing.items.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    direction="outgoing"
                    selfId={user?.id}
                    busy={busyId === r.id}
                    onCancel={() =>
                      runAction(
                        r.id,
                        () => friendService.cancelRequest(r.id),
                        "Friend request cancelled",
                      )
                    }
                  />
                ))
              ) : (
                <EmptyState
                  icon={Send}
                  title="No outgoing requests"
                  description="Friend requests you send will appear here until they are accepted."
                />
              )}
            </TabsContent>

            <TabsContent value="friends" className="space-y-3 mt-4">
              {friends?.items?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {friends.items.map((f) => (
                    <Card key={f.id}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <UserAvatar
                          userId={f.id}
                          name={f.display_name}
                          avatarUrl={f.avatar_url ?? undefined}
                        />
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/app/user/${f.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {f.display_name}
                          </Link>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            runAction(
                              f.id,
                              () => friendService.unfriend(f.id),
                              "Removed from friends",
                            )
                          }
                          disabled={busyId === f.id}
                          className="gap-1 text-muted-foreground hover:text-destructive"
                          title="Remove friend"
                        >
                          {busyId === f.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="No friends yet"
                  description="Search for someone you know and send them a friend request to get started."
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}

interface RequestCardProps {
  request: FriendRequest;
  direction: "incoming" | "outgoing";
  selfId?: string;
  busy: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
}

function RequestCard({
  request,
  direction,
  selfId,
  busy,
  onAccept,
  onDecline,
  onCancel,
}: RequestCardProps) {
  const counterpart =
    direction === "incoming" ? request.requester : request.recipient;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-3">
          <UserAvatar
            userId={counterpart?.id ?? ""}
            name={counterpart?.display_name}
            avatarUrl={counterpart?.avatar_url ?? undefined}
          />
          <div className="flex-1 min-w-0">
            {counterpart?.id ? (
              <Link
                to={`/app/user/${counterpart.id}`}
                className="font-medium hover:text-primary transition-colors"
              >
                {counterpart?.display_name ?? "Unknown user"}
              </Link>
            ) : (
              <span className="font-medium">
                {counterpart?.display_name ?? "Unknown user"}
              </span>
            )}
            <div className="text-xs font-normal text-muted-foreground mt-0.5">
              {direction === "incoming"
                ? `Sent ${formatRelativeTime(request.created_at)}`
                : `Sent ${formatRelativeTime(request.created_at)}`}
              {direction === "incoming" ? " · pending" : " · awaiting response"}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-end gap-2 pt-0">
        {direction === "incoming" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onDecline}
              disabled={busy}
              className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
            >
              <XIcon className="h-4 w-4" />
              Decline
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              disabled={busy}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              Accept
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={busy}
            className="gap-2 text-muted-foreground"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XIcon className="h-4 w-4" />
            )}
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}