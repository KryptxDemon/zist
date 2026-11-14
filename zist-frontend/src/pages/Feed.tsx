import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeedComposeDialog } from "@/components/feed/FeedComposeDialog";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { MediaDiscoverySearch } from "@/components/feed/MediaDiscoverySearch";
import { feedService } from "@/services/feedService";
import { FeedPost } from "@/types";
import {
  Plus,
  Rss,
  Users,
  Globe,
  Film,
  Quote,
  Lightbulb,
  BookOpen,
  Sparkles,
  Layers,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedPostSkeleton } from "@/components/ui/skeleton-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ContentFilter = "all" | "media" | "quote" | "theme" | "vocab";

export default function Feed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [audienceFilter, setAudienceFilter] = useState<"global" | "friends">("global");
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await feedService.getPosts(audienceFilter);
      setPosts(data.items);
    } catch (error) {
      console.error("Failed to load posts:", error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [audienceFilter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

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

  // Recent posters highlight strip
  const mediaHighlights = useMemo(() => {
    const list: { id: string; title: string; cover: string; type: string }[] = [];
    const seen = new Set<string>();
    for (const p of posts) {
      const cover = p.imageUrl || p.mediaCoverUrl;
      const title = p.mediaTitle || (p.content?.title ?? "Media");
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
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-24 md:pb-12">
        {/* Header & Hero */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Social Feed
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wide uppercase">
                  <Sparkles className="h-3 w-3" />
                  2.0
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Discover movie takeaways, book reviews, themes, and quotes from curious minds
              </p>
            </div>
            <FeedComposeDialog
              open={isComposeOpen}
              onOpenChange={setIsComposeOpen}
              onPost={loadPosts}
            />
          </div>

          {/* Quick Universal Discovery Search */}
          <MediaDiscoverySearch
            placeholder="Search movies, books, TV shows to discuss…"
            className="w-full shadow-xs"
          />
        </div>

        {/* Stories / Cinema Highlight Strip (if posters exist) */}
        {mediaHighlights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Trending on Zist
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
              {mediaHighlights.map((item) => (
                <div
                  key={item.id}
                  className="group relative shrink-0 w-20 sm:w-24 cursor-pointer text-left"
                  onClick={() => {
                    const el = document.getElementById(`post-${item.id}`);
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary group-hover:scale-105 shadow-md">
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-foreground truncate text-center">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Controls: Audience (Global/Friends) + Content Type Pills */}
        <div className="space-y-3">
          <Tabs
            value={audienceFilter}
            onValueChange={(v) => setAudienceFilter(v as typeof audienceFilter)}
          >
            <TabsList className="glass w-full grid grid-cols-2 p-1">
              <TabsTrigger value="global" className="gap-2 text-xs sm:text-sm font-medium">
                <Globe className="h-3.5 w-3.5" />
                Global Community
              </TabsTrigger>
              <TabsTrigger value="friends" className="gap-2 text-xs sm:text-sm font-medium">
                <Users className="h-3.5 w-3.5" />
                Friends Only
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Content Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setContentFilter("all")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border",
                contentFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                  : "bg-secondary/60 hover:bg-secondary text-secondary-foreground border-transparent",
              )}
            >
              <Layers className="h-3 w-3" />
              All Content
            </button>

            <button
              type="button"
              onClick={() => setContentFilter("media")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border",
                contentFilter === "media"
                  ? "bg-amber-500 text-black border-amber-500 shadow-xs font-semibold"
                  : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20",
              )}
            >
              <Film className="h-3 w-3" />
              Movies & Books
            </button>

            <button
              type="button"
              onClick={() => setContentFilter("quote")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border",
                contentFilter === "quote"
                  ? "bg-violet-500 text-white border-violet-500 shadow-xs font-semibold"
                  : "bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border-violet-500/20",
              )}
            >
              <Quote className="h-3 w-3" />
              Quotes
            </button>

            <button
              type="button"
              onClick={() => setContentFilter("theme")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border",
                contentFilter === "theme"
                  ? "bg-yellow-500 text-black border-yellow-500 shadow-xs font-semibold"
                  : "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border-yellow-500/20",
              )}
            >
              <Lightbulb className="h-3 w-3" />
              Themes
            </button>

            <button
              type="button"
              onClick={() => setContentFilter("vocab")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border",
                contentFilter === "vocab"
                  ? "bg-emerald-500 text-black border-emerald-500 shadow-xs font-semibold"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20",
              )}
            >
              <BookOpen className="h-3 w-3" />
              Vocabulary
            </button>
          </div>
        </div>

        {/* Post List or States */}
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
                ? `No ${contentFilter} posts found`
                : audienceFilter === "friends"
                  ? "No friend posts yet"
                  : "No posts yet"
            }
            description={
              contentFilter !== "all"
                ? `Nobody has shared ${contentFilter} posts in this view yet. Be the first!`
                : audienceFilter === "friends"
                  ? "Follow fellow film and book enthusiasts to see their shares here, or switch to Global."
                  : "Be the first to share a favorite movie, memorable quote, or theme you've learned!"
            }
            action={
              <Button onClick={() => setIsComposeOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Post
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
      </div>
    </AppLayout>
  );
}
