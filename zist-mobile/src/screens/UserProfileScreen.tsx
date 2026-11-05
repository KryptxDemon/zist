import React, { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  Share as RNShare,
  View,
  type ViewStyle,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  AtSign,
  BadgeCheck,
  BarChart3,
  Briefcase,
  Calendar,
  Camera,
  Clock3,
  Code,
  Globe,
  Heart,
  Mail,
  PencilLine,
  Play,
  RefreshCcw,
  Share2,
  Sparkles,
  Users,
} from "lucide-react-native";

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  FeedPostSkeleton,
  Screen,
  Text,
  useToast,
} from "@/components/ui";
import { FriendActionButton } from "@/components/friends";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { ApiError } from "@/services/apiClient";
import { feedService } from "@/services/feedService";
import { userService } from "@/services/userService";
import { formatRelativeTime } from "@/lib/time";
import type {
  FeedPost,
  QuoteItem,
  ThemeConcept,
  UserProfile,
  UserRef,
  VocabItem,
} from "@/types";

const socialFields = [
  { key: "websiteUrl", label: "Website", icon: Globe },
  { key: "githubUrl", label: "GitHub", icon: Code },
  { key: "linkedinUrl", label: "LinkedIn", icon: Briefcase },
  { key: "instagramUrl", label: "Instagram", icon: Camera },
  { key: "xUrl", label: "X", icon: AtSign },
  { key: "youtubeUrl", label: "YouTube", icon: Play },
] as const;

type LoadFailure =
  | { kind: "not_found" }
  | { kind: "transient"; message: string };

function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Public/self profile view. Works for the signed-in user (`/profile`, no
 * `userId` param) and any other user (`/user/[userId]`).
 * Ported from the web `UserProfile.tsx`.
 */
export function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { user: currentUser } = useAuth();
  const { colors } = useTheme();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [friends, setFriends] = useState<UserRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<LoadFailure | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const displayUserId =
    typeof userId === "string" && userId.length > 0 ? userId : currentUser?.id;
  const isOwnProfile = !!displayUserId && currentUser?.id === displayUserId;

  const loadProfile = useCallback(async () => {
    const targetId = displayUserId;
    if (!targetId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadFailure(null);
    try {
      const profileData = await userService.getUserProfile(targetId);
      setProfile(profileData);

      const [userPosts, friendsList] = await Promise.all([
        feedService.getUserPosts(targetId, 1, 50),
        userService.getFriends(targetId),
      ]);
      setPosts(userPosts.items);
      setFriends(friendsList);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          toast({
            title: "Session expired",
            description: "Please sign in again to view profiles.",
            variant: "destructive",
          });
          router.replace("/login");
          return;
        }
        if (error.status === 404) {
          setLoadFailure({ kind: "not_found" });
          toast({
            title: "Profile not found",
            description:
              "This user profile doesn't exist or hasn't finished syncing yet.",
            variant: "destructive",
          });
          return;
        }
        setLoadFailure({
          kind: "transient",
          message: error.message || `Server error (${error.status})`,
        });
        toast({
          title: "Couldn't load profile",
          description: "Our servers hiccuped. Try again in a moment.",
          variant: "destructive",
        });
        return;
      }

      setLoadFailure({
        kind: "transient",
        message:
          error instanceof Error ? error.message : "Network request failed",
      });
      toast({
        title: "Network error",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [displayUserId, toast]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile, reloadKey]);

  const handleRetry = () => setReloadKey((n) => n + 1);

  const handleOpenLink = (url: string) => {
    void Linking.openURL(withProtocol(url)).catch(() => {
      toast({
        title: "Couldn't open link",
        description: url,
        variant: "destructive",
      });
    });
  };

  const handleShare = () => {
    if (!profile) return;
    void RNShare.share({
      message: `${profile.displayName} on ZIST`,
    }).catch(() => undefined);
  };

  if (isLoading && !profile) {
    return (
      <Screen>
        <FeedPostSkeleton />
        <FeedPostSkeleton />
        <FeedPostSkeleton />
      </Screen>
    );
  }

  if (!profile) {
    if (loadFailure?.kind === "not_found") {
      return (
        <Screen>
          <EmptyState
            icon={<Users size={24} color={colors.primary} />}
            title="User not found"
            description="This profile doesn't exist or its account was deleted."
          />
        </Screen>
      );
    }

    if (loadFailure?.kind === "transient") {
      return (
        <Screen>
          <EmptyState
            icon={<RefreshCcw size={24} color={colors.primary} />}
            title="Couldn't load this profile"
            description={
              loadFailure.message ||
              "Our servers hiccuped. Try again in a moment."
            }
            action={<Button label="Try again" onPress={handleRetry} />}
          />
        </Screen>
      );
    }

    return (
      <Screen>
        <EmptyState
          icon={<Users size={24} color={colors.primary} />}
          title="Profile unavailable"
          description="We couldn't load this profile right now."
        />
      </Screen>
    );
  }

  const stats = profile.stats;
  const hasSocial = socialFields.some(
    ({ key }) => !!(profile[key as keyof UserProfile] as string | undefined),
  );

  return (
    <Screen>
      <Card variant="glass" style={{ gap: 20 }}>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Avatar
            name={profile.displayName}
            avatarUrl={profile.avatar}
            size="2xl"
            userId={profile.id}
            clickable={false}
            ring
          />
          <View style={{ flex: 1, gap: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Text variant="h2" weight="bold" numberOfLines={2}>
                {profile.displayName}
              </Text>
              {profile.emailVerified ? (
                <Badge
                  label="Verified"
                  icon={<BadgeCheck size={12} color={colors.primary} />}
                />
              ) : null}
              {isOwnProfile ? (
                <Badge
                  variant="outline"
                  label="Your profile"
                  icon={<Sparkles size={12} color={colors.mutedForeground} />}
                />
              ) : null}
            </View>

            <View style={{ gap: 4 }}>
              {isOwnProfile && currentUser?.email ? (
                <MetaRow icon={<Mail size={14} color={colors.mutedForeground} />}>
                  {currentUser.email}
                </MetaRow>
              ) : null}
              <MetaRow
                icon={<Calendar size={14} color={colors.mutedForeground} />}
              >
                Joined {formatRelativeTime(profile.createdAt)}
              </MetaRow>
              <MetaRow
                icon={<Clock3 size={14} color={colors.mutedForeground} />}
              >
                Learning in progress
              </MetaRow>
            </View>
          </View>
        </View>

        {profile.bio ? (
          <Text variant="body">{profile.bio}</Text>
        ) : (
          <Text variant="muted">
            No bio yet. Use edit profile to add one that matches your vibe.
          </Text>
        )}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {isOwnProfile ? (
            <>
              <Button
                label="Edit Profile"
                icon={<PencilLine size={16} color={colors.primaryForeground} />}
                onPress={() => router.push("/profile-edit")}
              />
              <Button
                variant="outline"
                label="Share"
                onPress={handleShare}
              />
            </>
          ) : currentUser && displayUserId ? (
            <FriendActionButton
              targetUserId={displayUserId}
              targetUserName={profile.displayName}
              onChange={() => void loadProfile()}
            />
          ) : null}
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <StatCard
            label="Media"
            value={stats?.mediaItems ?? 0}
            description="Saved titles and collections"
          />
          <StatCard
            label="Shares"
            value={stats?.sharedPosts ?? 0}
            description="Posts shared from learning"
          />
          <StatCard
            label="Upvotes"
            value={stats?.totalUpvotes ?? 0}
            description="Total upvotes on shared posts"
            icon={<Heart size={12} color={colors.mutedForeground} />}
          />
          <StatCard
            label="Followers"
            value={stats?.followers ?? 0}
            description="People following your journey"
          />
          <StatCard
            label="Friends"
            value={stats?.following ?? 0}
            description="People you are friends with"
          />
        </View>
      </Card>

      <Card variant="glass" style={{ gap: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="caption" uppercase letterSpacing={2}>
              Socials
            </Text>
            <Text variant="h3" weight="bold">
              Connect and share
            </Text>
          </View>
          {isOwnProfile ? (
            <Button
              variant="outline"
              size="sm"
              label="Edit links"
              onPress={() => router.push("/profile-edit")}
            />
          ) : null}
        </View>

        {hasSocial ? (
          <View style={{ gap: 10 }}>
            {socialFields.map(({ key, label, icon: Icon }) => {
              const value = profile[key as keyof UserProfile] as
                | string
                | undefined;
              if (!value) return null;
              return (
                <Pressable
                  key={key}
                  onPress={() => handleOpenLink(value)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.muted,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <View
                    style={{
                      height: 40,
                      width: 40,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      backgroundColor: colors.primary + "1a",
                    }}
                  >
                    <Icon size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="label" weight="medium">
                      {label}
                    </Text>
                    <Text variant="caption" numberOfLines={1}>
                      {value}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text variant="muted">
            No social links added yet. Add them in edit profile to make this page
            feel alive.
          </Text>
        )}
      </Card>

      <Card variant="glass" style={{ gap: 14 }}>
        <View style={{ gap: 2 }}>
          <Text variant="caption" uppercase letterSpacing={2}>
            {isOwnProfile ? "Your friends" : "Friends"}
          </Text>
          <Text variant="h3" weight="bold">
            {friends.length} connected
          </Text>
        </View>

        {friends.length === 0 ? (
          <Text variant="muted">
            {isOwnProfile
              ? "No friends yet. Visit profiles and tap Add Friend."
              : "No friends to show yet."}
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {friends.map((friend) => (
              <FriendMiniRow key={friend.id} friend={friend} />
            ))}
          </View>
        )}

        <View
          style={{
            gap: 10,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <BarChart3 size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="label" weight="medium">
                Learning footprint
              </Text>
              <Text variant="caption">
                {stats?.mediaItems ?? 0} media entries tracked
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Sparkles size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="label" weight="medium">
                Account vibe
              </Text>
              <Text variant="caption">
                {profile.emailVerified
                  ? "Verified and ready"
                  : "Unverified account"}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Share2 size={18} color={colors.primary} />
          <Text variant="h4" weight="bold">
            Recent Shares
          </Text>
        </View>

        {posts.length === 0 ? (
          <EmptyState
            icon={<Share2 size={24} color={colors.primary} />}
            title="No shared content yet"
            description={
              isOwnProfile
                ? "Share a theme, quote, or vocab item from the feed!"
                : "This user hasn't shared any content yet."
            }
          />
        ) : (
          <View style={{ gap: 12 }}>
            {posts.map((post) => (
              <SharedPostCard key={post.id} post={post} />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function MetaRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {icon}
      <Text variant="small">{children}</Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon?: React.ReactNode;
}) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        minWidth: 140,
        flexGrow: 1,
        flexBasis: 140,
        gap: 4,
        padding: 14,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.muted,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {icon}
        <Text variant="caption" uppercase letterSpacing={1}>
          {label}
        </Text>
      </View>
      <Text variant="h2" weight="bold" tint={colors.primary}>
        {value}
      </Text>
      <Text variant="caption">{description}</Text>
    </View>
  );
}

function FriendMiniRow({ friend }: { friend: UserRef }) {
  const { colors, radius } = useTheme();
  const rowStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  };
  return (
    <Pressable
      onPress={() => router.push(`/user/${friend.id}`)}
      style={rowStyle}
    >
      <Avatar
        userId={friend.id}
        name={friend.displayName}
        avatarUrl={friend.avatar}
        size="sm"
        clickable={false}
      />
      <Text variant="label" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
        {friend.displayName}
      </Text>
    </Pressable>
  );
}

const POST_TYPE_LABEL: Record<FeedPost["type"], string> = {
  theme: "Theme",
  vocab: "Vocabulary",
  quote: "Quote",
};

function postHeading(post: FeedPost): string {
  if (post.type === "theme") return (post.content as ThemeConcept).title;
  if (post.type === "vocab") return (post.content as VocabItem).word;
  return (post.content as QuoteItem).text;
}

function postBody(post: FeedPost): string | undefined {
  if (post.type === "theme") {
    const theme = post.content as ThemeConcept;
    return theme.summary ?? theme.userUnderstanding;
  }
  if (post.type === "vocab") return (post.content as VocabItem).definition;
  return (post.content as QuoteItem).userMeaning;
}

function SharedPostCard({ post }: { post: FeedPost }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        gap: 10,
        padding: 16,
        borderRadius: radius["2xl"],
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar
          userId={post.userId}
          name={post.authorName}
          avatarUrl={post.authorAvatar}
          size="sm"
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" weight="semibold" numberOfLines={1}>
            {post.authorName}
          </Text>
          <Text variant="caption">
            {POST_TYPE_LABEL[post.type]} · {formatRelativeTime(post.createdAt)}
          </Text>
        </View>
        {post.mediaTitle ? (
          <Badge variant="secondary" label={post.mediaTitle} />
        ) : null}
      </View>

      <Text variant="body" weight="medium">
        {postHeading(post)}
      </Text>
      {post.caption ? <Text variant="small">{post.caption}</Text> : null}
      {postBody(post) ? (
        <Text variant="muted" numberOfLines={4}>
          {postBody(post)}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Heart size={14} color={colors.mutedForeground} />
          <Text variant="caption">{post.likes}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Share2 size={14} color={colors.mutedForeground} />
          <Text variant="caption">{post.commentsCount} comments</Text>
        </View>
      </View>
    </View>
  );
}
