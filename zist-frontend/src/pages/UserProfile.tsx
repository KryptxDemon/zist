import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { FeedComposeDialog } from "@/components/feed/FeedComposeDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { FeedPostSkeleton } from "@/components/ui/skeleton-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/userService";
import { feedService } from "@/services/feedService";
import { ApiError } from "@/services/apiClient";
import { UserProfile, FeedPost, UserRef } from "@/types";
import { formatRelativeTime } from "@/lib/time";
import { FriendActionButton } from "@/components/friends/FriendActionButton";
import {
  Users,
  Mail,
  Calendar,
  Share2,
  Heart,
  Globe,
  Github,
  Instagram,
  Linkedin,
  Youtube,
  Twitter,
  Link as LinkIcon,
  BadgeCheck,
  Sparkles,
  BarChart3,
  Clock3,
  PencilLine,
  RefreshCcw,
} from "lucide-react";

const socialFields = [
  { key: "websiteUrl", label: "Website", icon: Globe },
  { key: "githubUrl", label: "GitHub", icon: Github },
  { key: "linkedinUrl", label: "LinkedIn", icon: Linkedin },
  { key: "instagramUrl", label: "Instagram", icon: Instagram },
  { key: "xUrl", label: "X", icon: Twitter },
  { key: "youtubeUrl", label: "YouTube", icon: Youtube },
] as const;

function formatJoinedDate(createdAt?: string | null): string {
  if (!createdAt) {
    return "Joined recently";
  }

  return formatRelativeTime(createdAt);
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [friends, setFriends] = useState<UserRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Discriminated failure mode so we can show a useful empty/retry state.
  type LoadFailure =
    | { kind: "not_found" }
    | { kind: "auth" }
    | { kind: "transient"; message: string };
  const [loadFailure, setLoadFailure] = useState<LoadFailure | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // If no userId provided and user is logged in, show their own profile
  const displayUserId = userId || currentUser?.id;

  useEffect(() => {
    if (!displayUserId) return;
    loadProfile();
    // reloadKey is included so the "Retry" button below can force a re-run.
  }, [displayUserId, reloadKey]);

  async function loadProfile() {
    setIsLoading(true);
    setLoadFailure(null);
    const targetId = displayUserId;
    if (!targetId) {
      setIsLoading(false);
      return;
    }
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
      console.error("Failed to load profile:", error);

      if (error instanceof ApiError) {
        if (error.status === 401) {
          // Token rejected — bounce to login rather than rendering a stale
          // empty state.
          toast({
            title: "Session expired",
            description: "Please sign in again to view profiles.",
            variant: "destructive",
          });
          navigate("/login", { replace: true });
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
        // 5xx — render a retry affordance.
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

      // Network or unknown failure.
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
  }

  const isOwnProfile = currentUser?.id === displayUserId;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
          {[1, 2, 3].map((i) => (
            <FeedPostSkeleton key={i} />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    if (loadFailure?.kind === "not_found") {
      return (
        <AppLayout>
          <EmptyState
            icon={Users}
            title="User not found"
            description="This profile doesn't exist or its account was deleted."
          />
        </AppLayout>
      );
    }

    if (loadFailure?.kind === "transient") {
      return (
        <AppLayout>
          <EmptyState
            icon={RefreshCcw}
            title="Couldn't load this profile"
            description={
              loadFailure.message ||
              "Our servers hiccuped. Try again in a moment."
            }
            action={
              <Button
                onClick={() => setReloadKey((n) => n + 1)}
                className="gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Try again
              </Button>
            }
          />
        </AppLayout>
      );
    }

    return (
      <AppLayout>
        <EmptyState
          icon={Users}
          title="Profile unavailable"
          description="We couldn't load this profile right now."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20 md:pb-0">
        <div className="glass grain relative overflow-hidden rounded-[2rem] p-6 md:p-8 border border-border/50">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/10 pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row gap-6 lg:items-center">
            <div className="relative">
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-primary/30 via-cyan-400/20 to-fuchsia-500/20 blur-2xl" />
              <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-[1.75rem] overflow-hidden border border-white/10 bg-gradient-to-br from-primary/40 to-primary/10 shadow-2xl">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-4xl md:text-5xl font-display font-bold text-primary">
                    {profile.displayName[0]?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
            </div>

            <div className="relative flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground">
                  {profile.displayName}
                </h1>
                {profile.emailVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : null}
                {isOwnProfile ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" /> Your profile
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {isOwnProfile && currentUser?.email ? (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {currentUser.email}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatJoinedDate(profile.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-4 w-4" />
                  Learning in progress
                </span>
              </div>

              {profile.bio ? (
                <p className="max-w-2xl text-base md:text-lg text-foreground/90 leading-7">
                  {profile.bio}
                </p>
              ) : (
                <p className="max-w-2xl text-sm text-muted-foreground">
                  No bio yet. Use edit profile to add one that matches your
                  vibe.
                </p>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                {isOwnProfile ? (
                  <>
                    <Button
                      onClick={() => navigate("/app/profile/edit")}
                      className="gap-2"
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit Profile
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigator.clipboard.writeText(window.location.href)
                      }
                      className="gap-2"
                    >
                      <LinkIcon className="h-4 w-4" />
                      Copy Link
                    </Button>
                  </>
                ) : currentUser ? (
                  <FriendActionButton
                    targetUserId={displayUserId!}
                    targetUserName={profile.displayName}
                    onChange={loadProfile}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative grid gap-4 pt-8 mt-8 border-t border-border/70 md:grid-cols-5">
            <div className="rounded-2xl bg-background/70 p-4 border border-border/50">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Media
              </p>
              <p className="mt-1 text-3xl font-bold text-primary">
                {profile.stats?.mediaItems || 0}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Saved titles and collections
              </p>
            </div>
            <div className="rounded-2xl bg-background/70 p-4 border border-border/50">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Shares
              </p>
              <p className="mt-1 text-3xl font-bold text-primary">
                {profile.stats?.sharedPosts || 0}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Posts shared from learning
              </p>
            </div>
            <div className="rounded-2xl bg-background/70 p-4 border border-border/50">
              <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Heart className="h-3 w-3" />
                Upvotes
              </p>
              <p className="mt-1 text-3xl font-bold text-primary">
                {profile.stats?.totalUpvotes || 0}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Total upvotes on shared posts
              </p>
            </div>
            <div className="rounded-2xl bg-background/70 p-4 border border-border/50">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Followers
              </p>
              <p className="mt-1 text-3xl font-bold text-primary">
                {profile.stats?.followers || 0}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                People following your journey
              </p>
            </div>
            <div className="rounded-2xl bg-background/70 p-4 border border-border/50">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Friends
              </p>
              <p className="mt-1 text-3xl font-bold text-primary">
                {profile.stats?.following || 0}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                People you are friends with
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="glass grain rounded-[2rem] p-6 border border-border/50 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  Socials
                </p>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Connect and share
                </h2>
              </div>
              {isOwnProfile ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/app/profile/edit")}
                >
                  Edit links
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {socialFields.map(({ key, label, icon: Icon }) => {
                const value = profile[key as keyof UserProfile] as
                  | string
                  | undefined;
                if (!value) return null;
                return (
                  <a
                    key={key}
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {label}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {value}
                      </p>
                    </div>
                  </a>
                );
              })}

              {socialFields.every(
                ({ key }) => !profile[key as keyof UserProfile],
              ) ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-5 text-sm text-muted-foreground sm:col-span-2">
                  No social links added yet. Add them in edit profile to make
                  this page feel alive.
                </div>
              ) : null}
            </div>
          </div>

          <div className="glass grain rounded-[2rem] p-6 border border-border/50 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                {isOwnProfile ? "Your friends" : "Friends"}
              </p>
              <h2 className="font-display text-2xl font-bold text-foreground">
                {friends.length} connected
              </h2>
            </div>

            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border/70 p-4">
                {isOwnProfile
                  ? "No friends yet. Visit profiles and tap Add Friend."
                  : "No friends to show yet."}
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => navigate(`/app/user/${friend.id}`)}
                    className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2 hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                  >
                    <UserAvatar
                      userId={friend.id}
                      name={friend.displayName}
                      avatarUrl={friend.avatar}
                      size="sm"
                    />
                    <span className="text-sm font-medium text-foreground truncate">
                      {friend.displayName}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-border/60">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Snapshot
              </p>
              <h2 className="font-display text-xl font-bold text-foreground mt-1">
                Profile energy
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 p-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Learning footprint
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile.stats?.mediaItems || 0} media entries tracked
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 p-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Account vibe
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile.emailVerified
                      ? "Verified and ready"
                      : "Unverified account"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Recent Shares</h2>
            </div>
            {isOwnProfile ? (
              <FeedComposeDialog onPost={loadProfile} showTrigger />
            ) : null}
          </div>

          {posts.length === 0 ? (
            <EmptyState
              icon={Share2}
              title="No shared content yet"
              description={
                isOwnProfile
                  ? "Share a theme, quote, or vocab item from the feed!"
                  : "This user hasn't shared any content yet."
              }
            />
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  compact
                  onDelete={(id) =>
                    setPosts((prev) => prev.filter((p) => p.id !== id))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
