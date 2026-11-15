import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeedComposeDialog } from "@/components/feed/FeedComposeDialog";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { MediaDiscoverySearch } from "@/components/feed/MediaDiscoverySearch";
import { UserSearch } from "@/components/UserSearch";
import { UserAvatar } from "@/components/UserAvatar";
import { feedService } from "@/services/feedService";
import { friendService } from "@/services/friendService";
import { userService } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import { FeedPost, FriendRequestUser, UserProfile } from "@/types";
import {
  PenTool,
  Rss,
  Users,
  Globe,
  Film,
  Quote,
  Lightbulb,
  BookOpen,
  Library,
  UserPlus,
  BrainCircuit,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedPostSkeleton } from "@/components/ui/skeleton-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ContentFilter = "all" | "media" | "quote" | "theme" | "vocab";

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [audienceFilter, setAudienceFilter] = useState<"global" | "friends">("global");
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const [friends, setFriends] = useState<FriendRequestUser[]>([]);
  const [friendsTotal, setFriendsTotal] = useState<number>(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await feedService.getPosts(audienceFilter);
      setPosts(data.items);
    } catch (error) {
      console.error("Failed to load dispatches:", error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [audienceFilter]);

  const loadFriends = useCallback(async () => {
    try {
      const res = await friendService.listFriends();
      setFriends(res.items);
      setFriendsTotal(res.total);
    } catch (err) {
      console.error("Failed to load friends:", err);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const p = await userService.getUserProfile(user.id);
      setProfile(p);
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    loadFriends();
    loadProfile();
  }, [loadFriends, loadProfile]);

  const handlePostUpdate = (updated: FeedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handlePostDelete = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const filteredPosts = useMemo(() => {
    if (contentFilter === "all") return posts;
    return posts.filter((p) => p.type === contentFilter);
  }, [posts, contentFilter]);

  // Recent literary & film highlights
  const mediaHighlights = useMemo(() => {
    const list: { id: string; title: string; cover: string; type: string }[] = [];
    const seen = new Set<string>();
    for (const p of posts) {
      const cover = p.imageUrl || p.mediaCoverUrl;
      const title = p.mediaTitle || (p.content?.title ?? "Untitled");
      if (cover && !seen.has(cover)) {
        seen.add(cover);
        list.push({ id: p.id, title, cover, type: p.type });
        if (list.length >= 8) break;
      }
    }
    return list;
  }, [posts]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 animate-fade-in pb-24 md:pb-14">
        <div className="flex gap-8 items-start justify-center">
          {/* Left Column: Profile Card & Shortcuts */}
          <aside className="w-64 hidden lg:block shrink-0 sticky top-20 self-start space-y-4">
            {/* User Profile Card */}
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <UserAvatar
                  userId={user?.id}
                  name={user?.displayName || "Reader"}
                  avatarUrl={user?.avatar}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/app/profile"
                    className="font-semibold text-sm text-foreground hover:text-primary transition-colors block truncate"
                  >
                    {user?.displayName || "Reader"}
                  </Link>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              {user?.bio ? (
                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                  "{user.bio}"
                </p>
              ) : null}

              <div className="grid grid-cols-3 gap-1 border-t border-border/40 pt-3 text-center">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {profile?.stats?.mediaItems ?? 0}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Media
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {friendsTotal}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Friends
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {profile?.stats?.totalUpvotes ?? 0}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Upvotes
                  </div>
                </div>
              </div>

              <Link
                to="/app/profile"
                className="block text-center text-xs font-medium py-1.5 px-3 rounded-xl border border-border/60 bg-accent/20 hover:bg-accent/60 transition-colors text-foreground"
              >
                View Profile
              </Link>
            </div>

            {/* Shortcuts Navigation Card */}
            {/* Shortcuts Navigation Card */}
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-2.5 space-y-1 shadow-xs">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Shortcuts
              </div>
              <Link
                to="/app/feed"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium bg-primary/10 text-primary transition-colors"
              >
                <Rss className="h-4 w-4" />
                <span>Community Feed</span>
              </Link>
              <Link
                to="/app/library"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
              >
                <Film className="h-4 w-4" />
                <span>Media Library</span>
              </Link>
              <Link
                to="/app/vocabulary"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                <span>Vocabulary</span>
              </Link>
              <Link
                to="/app/insights"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
              >
                <Lightbulb className="h-4 w-4" />
                <span>Themes & Insights</span>
              </Link>
              <Link
                to="/app/quiz"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
              >
                <BrainCircuit className="h-4 w-4" />
                <span>Practice & Quiz</span>
              </Link>
              <Link
                to="/app/friends"
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4" />
                  <span>Friends</span>
                </div>
                {friendsTotal > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-foreground">
                    {friendsTotal}
                  </span>
                )}
              </Link>
            </div>
          </aside>

          {/* Center Column: Community Feed */}
          <main className="flex-1 max-w-2xl min-w-0 space-y-6">
            {/* Header & Search */}
            <div className="space-y-4">
              <div className="flex flex-col gap-3.5 sm:flex-row sm:items-baseline sm:justify-between border-b border-border/40 pb-5">
                <div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                    Community Feed
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-sans leading-relaxed">
                    See what friends and the community are watching, reading, and sharing.
                  </p>
                </div>
                <FeedComposeDialog
                  open={isComposeOpen}
                  onOpenChange={setIsComposeOpen}
                  onPost={loadPosts}
                />
              </div>

              {/* Search */}
              <MediaDiscoverySearch
                placeholder="Search titles, authors, and creators across the archive…"
                className="w-full"
              />
            </div>

            {/* Filter Controls: Public / Circle + Category Pills */}
            <div className="space-y-3">
              <Tabs
                value={audienceFilter}
                onValueChange={(v) => setAudienceFilter(v as typeof audienceFilter)}
              >
                <TabsList className="w-full grid grid-cols-2 p-1 bg-accent/30 border border-border/50 rounded-xl">
                  <TabsTrigger value="global" className="gap-2 text-xs font-medium py-1.5">
                    <Globe className="h-3.5 w-3.5 opacity-70" />
                    Public Feed
                  </TabsTrigger>
                  <TabsTrigger value="friends" className="gap-2 text-xs font-medium py-1.5">
                    <Users className="h-3.5 w-3.5 opacity-70" />
                    Friends Only
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setContentFilter("all")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border",
                    contentFilter === "all"
                      ? "bg-foreground text-background border-foreground font-semibold shadow-xs"
                      : "bg-accent/40 hover:bg-accent text-muted-foreground hover:text-foreground border-border/50",
                  )}
                >
                  <Library className="h-3 w-3 opacity-70" />
                  All Posts
                </button>

                <button
                  type="button"
                  onClick={() => setContentFilter("media")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border",
                    contentFilter === "media"
                      ? "bg-amber-600 text-white border-amber-600 font-semibold shadow-xs"
                      : "bg-amber-500/5 hover:bg-amber-500/15 text-amber-300/90 border-amber-500/25",
                  )}
                >
                  <Film className="h-3 w-3 opacity-75" />
                  Movies & Books
                </button>

                <button
                  type="button"
                  onClick={() => setContentFilter("quote")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border",
                    contentFilter === "quote"
                      ? "bg-violet-600 text-white border-violet-600 font-semibold shadow-xs"
                      : "bg-violet-500/5 hover:bg-violet-500/15 text-violet-300/90 border-violet-500/25",
                  )}
                >
                  <Quote className="h-3 w-3 opacity-75" />
                  Quotes
                </button>

                <button
                  type="button"
                  onClick={() => setContentFilter("theme")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border",
                    contentFilter === "theme"
                      ? "bg-yellow-600 text-white border-yellow-600 font-semibold shadow-xs"
                      : "bg-yellow-500/5 hover:bg-yellow-500/15 text-yellow-300/90 border-yellow-500/25",
                  )}
                >
                  <Lightbulb className="h-3 w-3 opacity-75" />
                  Themes
                </button>

                <button
                  type="button"
                  onClick={() => setContentFilter("vocab")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border",
                    contentFilter === "vocab"
                      ? "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs"
                      : "bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-300/90 border-emerald-500/25",
                  )}
                >
                  <BookOpen className="h-3 w-3 opacity-75" />
                  Vocabulary
                </button>
              </div>
            </div>

            {/* Posts List or Empty States */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <FeedPostSkeleton key={i} />
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <EmptyState
                icon={Rss}
                title={
                  contentFilter !== "all"
                    ? `No ${contentFilter} posts yet`
                    : audienceFilter === "friends"
                      ? "No posts from friends yet"
                      : "The community feed is quiet"
                }
                description={
                  contentFilter !== "all"
                    ? "Nobody has shared a post under this category yet. Be the first to share one!"
                    : audienceFilter === "friends"
                      ? "Connect with friends to see their notes here, or check out the Public Feed."
                      : "Share your thoughts, favorite quotes, or new vocabulary to get the conversation started."
                }
                action={
                  <Button onClick={() => setIsComposeOpen(true)} className="gap-2 text-xs font-medium">
                    <PenTool className="h-3.5 w-3.5" />
                    Share a Thought
                  </Button>
                }
              />
            ) : (
              <div className="space-y-5">
                {filteredPosts.map((post) => (
                  <div key={post.id} id={`post-${post.id}`}>
                    <FeedPostCard
                      post={post}
                      onUpdate={handlePostUpdate}
                      onDelete={handlePostDelete}
                    />
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* Right Column: Trending Works, Friends, User Search */}
          <aside className="w-80 hidden xl:block shrink-0 sticky top-20 self-start space-y-5">
            {/* Works in Discourse Widget */}
            {mediaHighlights.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Works in Discourse
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Trending
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {mediaHighlights.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="group relative cursor-pointer text-left"
                      onClick={() => {
                        const el = document.getElementById(`post-${item.id}`);
                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      title={item.title}
                    >
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-border/60 transition-all duration-300 group-hover:border-primary/60 group-hover:shadow-md">
                        <img
                          src={item.cover}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                      </div>
                      <p className="mt-1 text-[10px] font-medium text-foreground/90 truncate text-center">
                        {item.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Find Friends Search Widget */}
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Find Friends
                  </span>
                </div>
                <Link
                  to="/app/friends"
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                >
                  Manage
                </Link>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Search readers by name to send a friend request directly from your feed.
              </p>
              <UserSearch
                placeholder="Search people to add..."
                variant="dropdown"
                showAddFriend={true}
                onFriendChange={loadFriends}
              />
            </div>

            {/* Friends List Widget */}
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Your Circle
                  </span>
                </div>
                {friendsTotal > 0 && (
                  <Link
                    to="/app/friends"
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                  >
                    See all ({friendsTotal})
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {friends.length > 0 ? (
                <div className="space-y-1 divide-y divide-border/30">
                  {friends.slice(0, 5).map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-2.5 pt-2 first:pt-0"
                    >
                      <Link
                        to={`/app/user/${f.id}`}
                        className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                      >
                        <UserAvatar
                          userId={f.id}
                          name={f.display_name}
                          avatarUrl={f.avatar_url ?? undefined}
                          size="sm"
                        />
                        <span className="text-xs font-medium text-foreground truncate">
                          {f.display_name}
                        </span>
                      </Link>
                      <Link
                        to={`/app/user/${f.id}`}
                        className="text-[11px] text-muted-foreground hover:text-primary shrink-0"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center space-y-2">
                  <p className="text-xs text-muted-foreground">
                    No friends added yet.
                  </p>
                  <Link
                    to="/app/friends"
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                  >
                    Discover readers to follow
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>

            {/* Share a Thought Prompt */}
            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-accent/20 p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <PenTool className="h-3.5 w-3.5 text-primary" />
                <span>Watching or reading something?</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Turn your thoughts, favorite quotes, or memorable moments into a post for your community.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsComposeOpen(true)}
                className="w-full text-xs font-medium gap-1.5 mt-1"
              >
                <PenTool className="h-3 w-3" />
                Share a Thought
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
