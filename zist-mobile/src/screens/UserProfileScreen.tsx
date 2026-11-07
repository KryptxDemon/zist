import React, { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  Share as RNShare,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  AtSign,
  BadgeCheck,
  BarChart3,
  Briefcase,
  Calendar,
  Camera,
  ChevronRight,
  Clock3,
  Code,
  Globe,
  Heart,
  Library,
  LogOut,
  Mail,
  Moon,
  PencilLine,
  Play,
  RefreshCcw,
  Share2,
  Sparkles,
  Sun,
  Users,
} from "lucide-react-native";

import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FeedPostSkeleton,
  IconButton,
  Screen,
  Text,
  useToast,
} from "@/components/ui";
import { FriendActionButton } from "@/components/friends";
import { FeedComposeSheet, FeedPostCard } from "@/components/feed";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { ApiError } from "@/services/apiClient";
import { feedService } from "@/services/feedService";
import { userService } from "@/services/userService";
import { formatRelativeTime } from "@/lib/time";
import type { FeedPost, UserProfile, UserRef } from "@/types";

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
 */
export function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { user: currentUser, logout } = useAuth();
  const { colors, theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [friends, setFriends] = useState<UserRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadFailure, setLoadFailure] = useState<LoadFailure | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadProfile();
    setIsRefreshing(false);
  }, [loadProfile]);

  const handleRetry = () => setReloadKey((n) => n + 1);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handleOpenLink = (url: string) => {
    void Linking.openURL(withProtocol(url)).catch(() => {
      toast({
        title: "Couldn't open link",
        description: url,
        variant: "destructive",
      });
    });
  };

  const handleShare = async () => {
    if (!profile) return;
    const profileUrl = `https://zist.app/user/${profile.id}`;
    const shareMessage = `Check out ${profile.displayName}'s profile on ZIST: ${profileUrl}`;
    try {
      await Clipboard.setStringAsync(profileUrl);
      toast({
        title: "Profile link copied to clipboard!",
        description: profileUrl,
      });
      await RNShare.share({
        title: `${profile.displayName} on ZIST`,
        message: shareMessage,
        url: profileUrl,
      });
    } catch {
      // Handled
    }
  };

  const renderTopBar = (screenTitle?: string) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 4,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconButton accessibilityLabel="Back" onPress={handleBack}>
          <ArrowLeft size={22} color={colors.foreground} />
        </IconButton>
        <Text variant="h3" weight="bold">
          {screenTitle ?? (isOwnProfile ? "Profile" : (profile?.displayName || "Profile"))}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {isOwnProfile ? (
          <>
            <IconButton
              accessibilityLabel="Edit profile"
              onPress={() => router.push("/profile-edit")}
            >
              <PencilLine size={20} color={colors.foreground} />
            </IconButton>
            <IconButton
              accessibilityLabel="Share profile"
              onPress={handleShare}
            >
              <Share2 size={20} color={colors.foreground} />
            </IconButton>
          </>
        ) : profile ? (
          <IconButton
            accessibilityLabel="Share profile"
            onPress={handleShare}
          >
            <Share2 size={20} color={colors.foreground} />
          </IconButton>
        ) : null}
      </View>
    </View>
  );

  if (isLoading && !profile) {
    return (
      <Screen>
        {renderTopBar("Profile")}
        <FeedPostSkeleton />
        <FeedPostSkeleton />
        <FeedPostSkeleton />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        {renderTopBar("Profile")}
        <EmptyState
          icon={
            loadFailure?.kind === "not_found" ? (
              <Users size={28} color={colors.primary} />
            ) : (
              <RefreshCcw size={28} color={colors.primary} />
            )
          }
          title={
            loadFailure?.kind === "not_found"
              ? "User not found"
              : "Couldn't load profile"
          }
          description={
            loadFailure?.kind === "not_found"
              ? "This user profile doesn't exist or its account was deleted."
              : (loadFailure?.message || "Our servers hiccuped. Try again in a moment.")
          }
          action={
            loadFailure?.kind === "transient" ? (
              <Button label="Try again" onPress={handleRetry} />
            ) : (
              <Button label="Go back" variant="outline" onPress={handleBack} />
            )
          }
        />
      </Screen>
    );
  }

  const stats = profile.stats;
  const hasSocial = socialFields.some(
    ({ key }) => !!(profile[key as keyof UserProfile] as string | undefined),
  );

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void handleRefresh()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {renderTopBar()}

      {/* Main Profile Header Card */}
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
            {isOwnProfile
              ? "No bio yet. Tap Edit Profile to add one that describes what you love watching or reading."
              : "No bio shared yet."}
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
                label="Share Profile"
                icon={<Share2 size={16} color={colors.foreground} />}
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

        {/* Stats Grid */}
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
            description="Saved in library"
            onPress={isOwnProfile ? () => router.push("/library") : undefined}
          />
          <StatCard
            label="Friends"
            value={stats?.following ?? friends.length}
            description="Connected friends"
            onPress={isOwnProfile ? () => router.push("/friends") : undefined}
          />
          <StatCard
            label="Shares"
            value={stats?.sharedPosts ?? posts.length}
            description="Posts shared"
          />
          <StatCard
            label="Upvotes"
            value={stats?.totalUpvotes ?? 0}
            description="Total post likes"
            icon={<Heart size={12} color={colors.mutedForeground} />}
          />
          <StatCard
            label="Followers"
            value={stats?.followers ?? 0}
            description="Community followers"
          />
        </View>
      </Card>

      {/* Account & Settings Hub (for signed-in user) */}
      {isOwnProfile ? (
        <Card variant="glass" style={{ gap: 12 }}>
          <Text variant="caption" uppercase letterSpacing={2}>
            Account & Quick Actions
          </Text>

          <View style={{ gap: 8 }}>
            {/* Edit Profile */}
            <Pressable
              onPress={() => router.push("/profile-edit")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: colors.muted,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: colors.primary + "1a",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <PencilLine size={18} color={colors.primary} />
                </View>
                <View>
                  <Text variant="label" weight="semibold">
                    Edit Profile
                  </Text>
                  <Text variant="caption">
                    Update avatar, bio, and social links
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </Pressable>

            {/* Friends & Requests */}
            <Pressable
              onPress={() => router.push("/friends")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: colors.muted,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: colors.primary + "1a",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users size={18} color={colors.primary} />
                </View>
                <View>
                  <Text variant="label" weight="semibold">
                    Friends & Requests
                  </Text>
                  <Text variant="caption">
                    {friends.length} friends connected
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </Pressable>

            {/* My Library */}
            <Pressable
              onPress={() => router.push("/library")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: colors.muted,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: colors.primary + "1a",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Library size={18} color={colors.primary} />
                </View>
                <View>
                  <Text variant="label" weight="semibold">
                    My Library
                  </Text>
                  <Text variant="caption">
                    {stats?.mediaItems ?? 0} saved titles & themes
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </Pressable>

            {/* Theme Toggle */}
            <Pressable
              onPress={toggleTheme}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: colors.muted,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: colors.primary + "1a",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {theme === "light" ? (
                    <Moon size={18} color={colors.primary} />
                  ) : (
                    <Sun size={18} color={colors.primary} />
                  )}
                </View>
                <View>
                  <Text variant="label" weight="semibold">
                    Appearance
                  </Text>
                  <Text variant="caption">
                    {theme === "light" ? "Light theme active" : "Dark theme active"}
                  </Text>
                </View>
              </View>
              <Badge variant="secondary" label={theme === "light" ? "Light" : "Dark"} />
            </Pressable>

            {/* Sign Out */}
            <Pressable
              onPress={() => setLogoutConfirmOpen(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: colors.destructive + "12",
                borderWidth: 1,
                borderColor: colors.destructive + "33",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: colors.destructive + "1f",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LogOut size={18} color={colors.destructive} />
                </View>
                <View>
                  <Text variant="label" weight="semibold" tint={colors.destructive}>
                    Log out
                  </Text>
                  <Text variant="caption">
                    Sign out of this device
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.destructive} />
            </Pressable>
          </View>
        </Card>
      ) : null}

      {/* Social Links Card */}
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
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Text variant="muted">
              {isOwnProfile
                ? "No social links added yet. Add your profiles to connect with other learners!"
                : "No social links added yet."}
            </Text>
            {isOwnProfile ? (
              <Button
                variant="outline"
                size="sm"
                label="Add social profiles"
                onPress={() => router.push("/profile-edit")}
              />
            ) : null}
          </View>
        )}
      </Card>

      {/* Friends Card */}
      <Card variant="glass" style={{ gap: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ gap: 2 }}>
            <Text variant="caption" uppercase letterSpacing={2}>
              {isOwnProfile ? "Your friends" : "Friends"}
            </Text>
            <Text variant="h3" weight="bold">
              {friends.length} connected
            </Text>
          </View>
          {isOwnProfile ? (
            <Button
              variant="outline"
              size="sm"
              label="Manage"
              onPress={() => router.push("/friends")}
            />
          ) : null}
        </View>

        {friends.length === 0 ? (
          <View style={{ gap: 10 }}>
            <Text variant="muted">
              {isOwnProfile
                ? "No friends yet. Discover other learners in the community feed!"
                : "No friends to show yet."}
            </Text>
            {isOwnProfile ? (
              <Button
                variant="outline"
                size="sm"
                label="Find people"
                onPress={() => router.push("/friends")}
              />
            ) : null}
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {friends.slice(0, 8).map((friend) => (
              <FriendMiniRow key={friend.id} friend={friend} />
            ))}
            {friends.length > 8 && isOwnProfile ? (
              <Button
                variant="ghost"
                size="sm"
                label={`View all ${friends.length} friends`}
                onPress={() => router.push("/friends")}
              />
            ) : null}
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
                Account status
              </Text>
              <Text variant="caption">
                {profile.emailVerified
                  ? "Verified and active"
                  : "Unverified account"}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Recent Shares Feed Section */}
      <View style={{ gap: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Share2 size={18} color={colors.primary} />
            <Text variant="h4" weight="bold">
              Recent Shares
            </Text>
          </View>
          {isOwnProfile ? (
            <FeedComposeSheet onPost={() => void loadProfile()} showTrigger />
          ) : null}
        </View>

        {posts.length === 0 ? (
          <EmptyState
            icon={<Share2 size={24} color={colors.primary} />}
            title="No shared content yet"
            description={
              isOwnProfile
                ? "Share a theme, quote, or vocabulary note from your library with friends!"
                : "This user hasn't shared any content yet."
            }
          />
        ) : (
          <View style={{ gap: 14 }}>
            {posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                compact
                onDelete={(id) =>
                  setPosts((prev) => prev.filter((p) => p.id !== id))
                }
                onUpdate={(updated) =>
                  setPosts((prev) =>
                    prev.map((p) => (p.id === updated.id ? updated : p)),
                  )
                }
              />
            ))}
          </View>
        )}
      </View>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        visible={logoutConfirmOpen}
        title="Log out of Zist?"
        description="You will need to sign back in with your credentials to access your library."
        confirmLabel="Log out"
        destructive
        onConfirm={async () => {
          setLogoutConfirmOpen(false);
          await logout();
          router.replace("/welcome");
        }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
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
  onPress,
}: {
  label: string;
  value: number;
  description: string;
  icon?: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors, radius } = useTheme();
  const cardContent = (
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          {icon}
          <Text variant="caption" uppercase letterSpacing={1}>
            {label}
          </Text>
        </View>
        {onPress ? (
          <ChevronRight size={14} color={colors.mutedForeground} />
        ) : null}
      </View>
      <Text variant="h2" weight="bold" tint={colors.primary}>
        {value}
      </Text>
      <Text variant="caption">{description}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={{ minWidth: 140, flexGrow: 1, flexBasis: 140 }}
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}

function FriendMiniRow({ friend }: { friend: UserRef }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={() => router.push(`/user/${friend.id}`)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.muted,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          flex: 1,
        }}
      >
        <Avatar
          userId={friend.id}
          name={friend.displayName}
          avatarUrl={friend.avatar}
          size="sm"
          clickable={false}
        />
        <Text
          variant="label"
          weight="medium"
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {friend.displayName}
        </Text>
      </View>
      <ChevronRight size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}
