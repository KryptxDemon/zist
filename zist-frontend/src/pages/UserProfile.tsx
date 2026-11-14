import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { FeedComposeDialog } from "@/components/feed/FeedComposeDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BadgeCheck,
  Sparkles,
  BookOpen,
  PencilLine,
  RefreshCcw,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";

const socialConfig = [
  { key: "websiteUrl", label: "Website", icon: Globe, prefix: "" },
  { key: "githubUrl", label: "GitHub", icon: Github, prefix: "github.com/" },
  { key: "xUrl", label: "X (Twitter)", icon: Twitter, prefix: "x.com/" },
  { key: "linkedinUrl", label: "LinkedIn", icon: Linkedin, prefix: "linkedin.com/in/" },
  { key: "instagramUrl", label: "Instagram", icon: Instagram, prefix: "instagram.com/" },
  { key: "youtubeUrl", label: "YouTube", icon: Youtube, prefix: "youtube.com/" },
] as const;

function formatJoinedDate(createdAt?: string | null): string {
  if (!createdAt) return "Joined recently";
  return `Joined ${formatRelativeTime(createdAt)}`;
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
  const [copiedLink, setCopiedLink] = useState(false);

  type LoadFailure =
    | { kind: "not_found" }
    | { kind: "auth" }
    | { kind: "transient"; message: string };
  const [loadFailure, setLoadFailure] = useState<LoadFailure | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const displayUserId = userId || currentUser?.id;

  useEffect(() => {
    if (!displayUserId) return;
    loadProfile();
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
            description: "This user profile doesn't exist or hasn't finished syncing yet.",
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
        message: error instanceof Error ? error.message : "Network request failed",
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

  const handleCopyProfileLink = () => {
    const url = `${window.location.origin}/app/user/${profile?.id || displayUserId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast({
      title: "Profile link copied",
      description: "Link has been copied to your clipboard.",
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-8">
          <div className="h-48 rounded-3xl bg-muted/40 animate-pulse border border-border/40" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse border border-border/40" />
            ))}
          </div>
          {[1, 2].map((i) => (
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
            description={loadFailure.message || "Our servers hiccuped. Try again in a moment."}
            action={
              <Button onClick={() => setReloadKey((n) => n + 1)} className="gap-2">
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

  const stats = profile.stats;
  const activeSocials = socialConfig.filter((s) => Boolean(profile[s.key as keyof UserProfile]));

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20 md:pb-12">
        {/* ==================== 1. HERO PROFILE CARD ==================== */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
          {/* Ambient Cover Banner */}
          <div className="relative h-36 sm:h-44 w-full bg-gradient-to-r from-primary/20 via-sky-500/10 to-indigo-500/20 border-b border-border/40">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent opacity-80" />
            <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:24px_24px]" />
          </div>

          {/* Profile Details Container */}
          <div className="px-6 sm:px-10 pb-8">
            {/* Avatar & Action Row */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 -mt-16 sm:-mt-20">
              {/* Avatar with Double Ring */}
              <div className="relative group shrink-0">
                <div className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-3xl overflow-hidden ring-4 ring-background border-2 border-border/60 bg-muted shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl sm:text-5xl font-display font-bold text-primary bg-primary/10">
                      {profile.displayName[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {isOwnProfile ? (
                  <>
                    <Button
                      onClick={() => navigate("/app/profile/edit")}
                      className="gap-2 shadow-sm rounded-xl font-medium"
                      size="sm"
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyProfileLink}
                      className="gap-2 rounded-xl border-border/70 hover:bg-muted"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4" />
                          <span>Share</span>
                        </>
                      )}
                    </Button>
                  </>
                ) : currentUser ? (
                  <div className="flex items-center gap-2">
                    <FriendActionButton
                      targetUserId={displayUserId!}
                      targetUserName={profile.displayName}
                      onChange={loadProfile}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyProfileLink}
                      className="rounded-xl border-border/70"
                    >
                      {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Identity Info */}
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                    {profile.displayName}
                  </h1>
                  {profile.emailVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  )}
                  {isOwnProfile && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-primary" />
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
                  @{profile.displayName.toLowerCase().replace(/\s+/g, "")}
                </p>
              </div>

              {/* Bio */}
              {profile.bio ? (
                <p className="max-w-2xl text-sm sm:text-base text-foreground/90 leading-relaxed font-normal">
                  {profile.bio}
                </p>
              ) : (
                <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground italic">
                  {isOwnProfile
                    ? "Welcome to your profile. Click 'Edit Profile' above to introduce yourself to fellow learners."
                    : "No bio shared yet."}
                </p>
              )}

              {/* Metadata Badges */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground pt-1">
                {isOwnProfile && currentUser?.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary/70" />
                    {currentUser.email}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary/70" />
                  {formatJoinedDate(profile.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-primary/70" />
                  Learning active
                </span>
              </div>

              {/* Social Links as Minimalist Chips */}
              {activeSocials.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {activeSocials.map(({ key, label, icon: Icon }) => {
                    const value = profile[key as keyof UserProfile] as string;
                    const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
                    return (
                      <a
                        key={key}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 hover:bg-accent/40 px-3 py-1 text-xs font-medium text-foreground transition-all duration-200 hover:border-primary/40 group shadow-2xs"
                      >
                        <Icon className="h-3.5 w-3.5 text-primary transition-transform group-hover:scale-110" />
                        <span>{label}</span>
                        <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-60" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ==================== 2. UNIFIED METRICS RIBBON ==================== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border/50 divide-x divide-y sm:divide-y-0 divide-border/50 bg-muted/20">
            <div className="p-4 sm:p-5 text-center transition-colors hover:bg-muted/30">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground block">
                {stats?.mediaItems ?? 0}
              </span>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5 block">
                Media Tracked
              </span>
            </div>

            <div className="p-4 sm:p-5 text-center transition-colors hover:bg-muted/30">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground block">
                {stats?.sharedPosts ?? posts.length}
              </span>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5 block">
                Posts Shared
              </span>
            </div>

            <div className="p-4 sm:p-5 text-center transition-colors hover:bg-muted/30">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground block">
                {friends.length}
              </span>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5 block">
                Friends
              </span>
            </div>

            <div className="p-4 sm:p-5 text-center transition-colors hover:bg-muted/30">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground inline-flex items-center justify-center gap-1">
                <Heart className="h-4 w-4 text-rose-500 fill-rose-500/20" />
                {stats?.totalUpvotes ?? 0}
              </span>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5 block">
                Total Upvotes
              </span>
            </div>
          </div>
        </div>

        {/* ==================== 3. STRUCTURED TAB CONTENT ==================== */}
        <Tabs defaultValue="shares" className="w-full space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/40">
              <TabsTrigger
                value="shares"
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Shares ({posts.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="friends"
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Friends ({friends.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="rounded-xl px-4 py-2 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-2"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>About</span>
              </TabsTrigger>
            </TabsList>

            {isOwnProfile && (
              <FeedComposeDialog onPost={loadProfile} showTrigger />
            )}
          </div>

          {/* TAB: Shared Posts */}
          <TabsContent value="shares" className="mt-0 space-y-4">
            {posts.length === 0 ? (
              <EmptyState
                icon={Share2}
                title="No shared content yet"
                description={
                  isOwnProfile
                    ? "Share an interesting theme, quote, or vocab item from your library to inspire others!"
                    : "This user hasn't shared any content to the feed yet."
                }
              />
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <FeedPostCard
                    key={post.id}
                    post={post}
                    compact
                    onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB: Friends */}
          <TabsContent value="friends" className="mt-0">
            {friends.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No friends connected yet"
                description={
                  isOwnProfile
                    ? "Explore the feed or discover other learners to build your circle."
                    : "This user has not connected with friends yet."
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => navigate(`/app/user/${friend.id}`)}
                    className="group flex items-center gap-3 p-3.5 rounded-2xl border border-border/60 bg-card hover:bg-accent/40 hover:border-primary/40 transition-all duration-200 cursor-pointer shadow-2xs"
                  >
                    <UserAvatar
                      userId={friend.id}
                      name={friend.displayName}
                      avatarUrl={friend.avatar}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {friend.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{friend.displayName.toLowerCase().replace(/\s+/g, "")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB: About & Learning Overview */}
          <TabsContent value="about" className="mt-0 space-y-6">
            <div className="rounded-3xl border border-border/60 bg-card/60 p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  About {profile.displayName}
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed mt-2">
                  {profile.bio || "No detailed bio provided."}
                </p>
              </div>

              <div className="border-t border-border/50 pt-5">
                <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3">
                  Learning Journey Summary
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl border border-border/50 bg-background/60">
                    <span className="text-xs text-muted-foreground block">Library Size</span>
                    <span className="text-lg font-bold text-foreground mt-0.5 block">
                      {stats?.mediaItems || 0} items
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl border border-border/50 bg-background/60">
                    <span className="text-xs text-muted-foreground block">Community Shares</span>
                    <span className="text-lg font-bold text-foreground mt-0.5 block">
                      {stats?.sharedPosts || 0} posts
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl border border-border/50 bg-background/60">
                    <span className="text-xs text-muted-foreground block">Account Status</span>
                    <span className="text-lg font-bold text-primary mt-0.5 block">
                      {profile.emailVerified ? "Verified User" : "Active Member"}
                    </span>
                  </div>
                </div>
              </div>

              {activeSocials.length > 0 && (
                <div className="border-t border-border/50 pt-5">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3">
                    Connected Networks
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeSocials.map(({ key, label, icon: Icon }) => {
                      const value = profile[key as keyof UserProfile] as string;
                      const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
                      return (
                        <a
                          key={key}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 p-3 rounded-2xl border border-border/60 bg-background hover:border-primary/40 hover:bg-primary/5 transition-all"
                        >
                          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground">{label}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{value}</p>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-50 shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
