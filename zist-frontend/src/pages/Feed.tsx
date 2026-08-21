import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeedComposeDialog } from "@/components/feed/FeedComposeDialog";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { MediaDiscoverySearch } from "@/components/feed/MediaDiscoverySearch";
import { feedService } from "@/services/feedService";
import { FeedPost } from "@/types";
import { Plus, Rss, Users, Globe } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedPostSkeleton } from "@/components/ui/skeleton-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function Feed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"global" | "friends">("global");
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await feedService.getPosts(filter);
      setPosts(data.items);
    } catch (error) {
      console.error("Failed to load posts:", error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handlePostUpdate = (updated: FeedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handlePostDelete = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-20 md:pb-0">
        <div>
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Feed
              </h1>
              <p className="text-muted-foreground mt-1">
                Share quotes, themes, and vocabulary with your take on them
              </p>
            </div>
            <FeedComposeDialog
              open={isComposeOpen}
              onOpenChange={setIsComposeOpen}
              onPost={loadPosts}
            />
          </div>
          <MediaDiscoverySearch
            placeholder="Search movies, books, TV shows…"
            className="w-full"
          />
        </div>

        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
        >
          <TabsList className="glass w-full">
            <TabsTrigger value="global" className="flex-1 gap-2">
              <Globe className="h-4 w-4" />
              Global
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex-1 gap-2">
              <Users className="h-4 w-4" />
              Friends
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <FeedPostSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Rss}
            title={filter === "friends" ? "No friend posts yet" : "No posts yet"}
            description={
              filter === "friends"
                ? "Follow friends to see their shares here, or switch to Global."
                : "Be the first to share something you've learned!"
            }
            action={
              <Button onClick={() => setIsComposeOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Share something
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                onUpdate={handlePostUpdate}
                onDelete={handlePostDelete}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
