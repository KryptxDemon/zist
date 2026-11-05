import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, View } from "react-native";
import { Inbox, Send, UserRound, Users } from "lucide-react-native";

import {
  Card,
  EmptyState,
  Screen,
  Segmented,
  Spinner,
  TabBar,
  Text,
  type TabItem,
} from "@/components/ui";
import { FriendActionButton, FriendRow } from "@/components/friends";
import { UserSearch } from "@/components/UserSearch";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { friendService } from "@/services/friendService";
import { userService } from "@/services/userService";
import { formatRelativeTime } from "@/lib/time";
import type {
  FriendListResponse,
  FriendRequestListResponse,
  UserProfile,
} from "@/types";

type FriendsTab = "friends" | "requests" | "find";
type RequestTab = "incoming" | "outgoing";

const TABS: TabItem<FriendsTab>[] = [
  { value: "friends", label: "Friends", icon: <Users size={15} /> },
  { value: "requests", label: "Requests", icon: <Inbox size={15} /> },
  { value: "find", label: "Find people", icon: <UserRound size={15} /> },
];

/**
 * Friends management: friends list, incoming/outgoing requests and a
 * debounced user search. Ported from the web `Friends.tsx`.
 */
export function FriendsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [tab, setTab] = useState<FriendsTab>("friends");
  const [requestTab, setRequestTab] = useState<RequestTab>("incoming");

  const [friends, setFriends] = useState<FriendListResponse | null>(null);
  const [incoming, setIncoming] = useState<FriendRequestListResponse | null>(null);
  const [outgoing, setOutgoing] = useState<FriendRequestListResponse | null>(null);
  const [viewer, setViewer] = useState<UserProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (viaPull = false) => {
      if (viaPull) setRefreshing(true);
      else setLoading(true);
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
        setRefreshing(false);
      }

      // Follow counts are a nice-to-have — never let them break the page.
      if (user?.id) {
        try {
          const profile = await userService.getUserProfile(user.id);
          setViewer(profile);
        } catch {
          setViewer(null);
        }
      }
    },
    [user?.id],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRetry = () => {
    void refresh();
  };

  const incomingTotal = incoming?.total ?? 0;
  const outgoingTotal = outgoing?.total ?? 0;
  const friendsTotal = friends?.total ?? 0;

  if (loading && !friends) {
    return (
      <Screen>
        <Spinner label="Loading friends…" />
      </Screen>
    );
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh(true)}
          tintColor={colors.primary}
        />
      }
    >
      <View style={{ gap: 4 }}>
        <Text variant="h2" weight="bold">
          Friends
        </Text>
        <Text variant="muted">Manage your connections and friend requests.</Text>
      </View>

      {error ? (
        <Card style={{ gap: 12, alignItems: "center" }}>
          <Text variant="small" color="destructive">
            {error}
          </Text>
          <Text
            variant="small"
            weight="medium"
            tint={colors.primary}
            onPress={handleRetry}
          >
            Try again
          </Text>
        </Card>
      ) : (
        <>
          <Segmented value={tab} onChange={setTab} items={TABS} />

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <StatPill label="Friends" value={friendsTotal} />
            <StatPill label="Incoming" value={incomingTotal} />
            <StatPill label="Outgoing" value={outgoingTotal} />
            <StatPill label="Followers" value={viewer?.stats?.followers ?? 0} />
            <StatPill label="Following" value={viewer?.stats?.following ?? 0} />
          </View>

          {tab === "friends" ? (
            friends?.items?.length ? (
              <View style={{ gap: 8 }}>
                {friends.items.map((f) => (
                  <FriendRow
                    key={f.id}
                    userId={f.id}
                    name={f.display_name}
                    avatarUrl={f.avatar_url ?? undefined}
                    subtitle="You are friends"
                    trailing={
                      <FriendActionButton
                        targetUserId={f.id}
                        targetUserName={f.display_name}
                        onChange={() => void refresh()}
                      />
                    }
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon={<Users size={24} color={colors.primary} />}
                title="No friends yet"
                description="Search for someone you know and send them a friend request to get started."
              />
            )
          ) : null}

          {tab === "requests" ? (
            <View style={{ gap: 12 }}>
              <TabBar
                value={requestTab}
                onChange={setRequestTab}
                items={[
                  {
                    value: "incoming",
                    label: "Incoming",
                    icon: <Inbox size={15} />,
                    badge: incomingTotal || undefined,
                  },
                  {
                    value: "outgoing",
                    label: "Outgoing",
                    icon: <Send size={15} />,
                    badge: outgoingTotal || undefined,
                  },
                ]}
              />

              {requestTab === "incoming" ? (
                incoming?.items?.length ? (
                  <View style={{ gap: 8 }}>
                    {incoming.items.map((r) => {
                      const other = r.requester;
                      return (
                        <FriendRow
                          key={r.id}
                          userId={other?.id ?? r.id}
                          name={other?.display_name ?? "Unknown user"}
                          avatarUrl={other?.avatar_url ?? undefined}
                          subtitle={`Sent ${formatRelativeTime(r.created_at)} · pending`}
                          trailing={
                            <FriendActionButton
                              targetUserId={other?.id ?? r.requester_id}
                              targetUserName={other?.display_name}
                              onChange={() => void refresh()}
                            />
                          }
                        />
                      );
                    })}
                  </View>
                ) : (
                  <EmptyState
                    icon={<Inbox size={24} color={colors.primary} />}
                    title="No incoming requests"
                    description="Friend requests other users send you will appear here."
                  />
                )
              ) : outgoing?.items?.length ? (
                <View style={{ gap: 8 }}>
                  {outgoing.items.map((r) => {
                    const other = r.recipient;
                    return (
                      <FriendRow
                        key={r.id}
                        userId={other?.id ?? r.id}
                        name={other?.display_name ?? "Unknown user"}
                        avatarUrl={other?.avatar_url ?? undefined}
                        subtitle={`Sent ${formatRelativeTime(r.created_at)} · awaiting response`}
                        trailing={
                          <FriendActionButton
                            targetUserId={other?.id ?? r.recipient_id}
                            targetUserName={other?.display_name}
                            onChange={() => void refresh()}
                          />
                        }
                      />
                    );
                  })}
                </View>
              ) : (
                <EmptyState
                  icon={<Send size={24} color={colors.primary} />}
                  title="No outgoing requests"
                  description="Friend requests you send will appear here until they are accepted."
                />
              )}
            </View>
          ) : null}

          {tab === "find" ? (
            <View style={{ gap: 12 }}>
              <Text variant="muted">
                Search by name to find people and send a friend request.
              </Text>
              <UserSearch
                placeholder="Search people…"
                renderTrailing={(u) =>
                  u.id === user?.id ? null : (
                    <FriendActionButton
                      targetUserId={u.id}
                      targetUserName={u.displayName}
                      onChange={() => void refresh()}
                    />
                  )
                }
              />
              {!friends?.items?.length ? (
                <EmptyState
                  icon={<UserRound size={24} color={colors.primary} />}
                  title="Grow your circle"
                  description="Search for classmates, creators or friends to follow their learning journey."
                />
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text variant="caption" weight="semibold" tint={colors.primary}>
        {value}
      </Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}
