import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FeedPostSkeleton } from "@/components/ui/skeleton-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { UserSearch } from "@/components/UserSearch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { feedService } from "@/services/feedService";
import {
  themeService,
  vocabService,
  quoteService,
} from "@/services/mediaService";
import { FeedPost, ThemeConcept, VocabItem, QuoteItem } from "@/types";
import {
  Plus,
  Rss,
  Heart,
  Bookmark,
  MessageCircle,
  Lightbulb,
  BookOpen,
  Quote,
  Users,
  Globe,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function Feed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "friends" | "global">("all");
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [filter]);

  async function loadPosts() {
    setIsLoading(true);
    try {
      const data = await feedService.getPosts(
        filter === "all" ? undefined : filter,
      );
      setPosts(data);
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleLike = async (postId: string) => {
    try {
      await feedService.likePost(postId);
      setPosts(
        posts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              isLiked: !p.isLiked,
              likes: p.isLiked ? p.likes - 1 : p.likes + 1,
            };
          }
          return p;
        }),
      );
    } catch (error) {
      toast({ title: "Failed to like post", variant: "destructive" });
    }
  };

  const handleSave = async (postId: string) => {
    try {
      await feedService.savePost(postId);
      setPosts(
        posts.map((p) => {
          if (p.id === postId) {
            return { ...p, isSaved: !p.isSaved };
          }
          return p;
        }),
      );
    } catch (error) {
      toast({ title: "Failed to save post", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-20 md:pb-0">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                Feed
              </h1>
              <p className="text-muted-foreground mt-1">
                Share and discover learning insights
              </p>
            </div>
            <ComposeDialog
              open={isComposeOpen}
              onOpenChange={setIsComposeOpen}
              onPost={loadPosts}
              userName={user?.displayName || "User"}
            />
          </div>

          {/* User Search */}
          <UserSearch placeholder="Search for users..." className="max-w-sm" />
        </div>

        {/* Filter Tabs */}
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
        >
          <TabsList className="glass">
            <TabsTrigger value="all" className="gap-2">
              <Rss className="h-4 w-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="friends" className="gap-2">
              <Users className="h-4 w-4" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="global" className="gap-2">
              <Globe className="h-4 w-4" />
              Global
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Posts */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <FeedPostSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Rss}
            title="No posts yet"
            description="Be the first to share something you've learned!"
            action={
              <Button onClick={() => setIsComposeOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Post
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function PostCard({
  post,
  onLike,
  onSave,
}: {
  post: FeedPost;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
}) {
  const navigate = useNavigate();

  const typeConfig = {
    theme: { icon: Lightbulb, color: "text-amber-400", bg: "bg-amber-500/20" },
    vocab: {
      icon: BookOpen,
      color: "text-emerald-400",
      bg: "bg-emerald-500/20",
    },
    quote: { icon: Quote, color: "text-violet-400", bg: "bg-violet-500/20" },
  };

  const config = typeConfig[post.type];
  const Icon = config.icon;

  return (
    <div className="glass grain rounded-2xl p-5 animate-fade-in">
      {/* Author */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(`/app/user/${post.userId}`)}
          className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-foreground font-medium hover:bg-accent/80 transition-colors flex-shrink-0"
        >
          {post.authorName[0].toUpperCase()}
        </button>
        <div className="flex-1">
          <button
            onClick={() => navigate(`/app/user/${post.userId}`)}
            className="font-medium text-foreground hover:text-primary transition-colors text-left"
          >
            {post.authorName}
          </button>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            config.bg,
            config.color,
          )}
        >
          <Icon className="h-3 w-3" />
          {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
        </span>
      </div>

      {/* Caption */}
      {post.caption && <p className="text-foreground mb-4">{post.caption}</p>}

      {/* Content Card */}
      <div className="bg-accent/30 rounded-xl p-4 mb-4">
        {post.type === "theme" && (
          <div>
            <h4 className="font-display font-semibold text-foreground">
              {(post.content as ThemeConcept).title}
            </h4>
            {(post.content as ThemeConcept).summary && (
              <p className="text-sm text-muted-foreground mt-1">
                {(post.content as ThemeConcept).summary}
              </p>
            )}
          </div>
        )}
        {post.type === "vocab" && (
          <div>
            <h4 className="font-display font-semibold text-foreground">
              {(post.content as VocabItem).word}
            </h4>
            {(post.content as VocabItem).definition && (
              <p className="text-sm text-muted-foreground mt-1">
                {(post.content as VocabItem).definition}
              </p>
            )}
          </div>
        )}
        {post.type === "quote" && (
          <div>
            <p className="text-foreground italic">
              "{(post.content as QuoteItem).text}"
            </p>
            {(post.content as QuoteItem).speaker && (
              <p className="text-sm text-muted-foreground mt-2">
                — {(post.content as QuoteItem).speaker}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onLike(post.id)}
          className={cn(
            "flex items-center gap-1.5 text-sm transition-colors",
            post.isLiked
              ? "text-rose-400"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Heart className={cn("h-4 w-4", post.isLiked && "fill-current")} />
          {post.likes}
        </button>
        <button
          onClick={() => onSave(post.id)}
          className={cn(
            "flex items-center gap-1.5 text-sm transition-colors",
            post.isSaved
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Bookmark className={cn("h-4 w-4", post.isSaved && "fill-current")} />
          Save
        </button>
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <MessageCircle className="h-4 w-4" />
          Comment
        </button>
      </div>
    </div>
  );
}

function ComposeDialog({
  open,
  onOpenChange,
  onPost,
  userName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPost: () => void;
  userName: string;
}) {
  const { toast } = useToast();
  const [isPosting, setIsPosting] = useState(false);
  const [postType, setPostType] = useState<"theme" | "vocab" | "quote">(
    "theme",
  );
  const [visibility, setVisibility] = useState<"friends" | "global">("global");
  const [caption, setCaption] = useState("");
  const [content, setContent] = useState({ title: "", description: "" });

  const handlePost = async () => {
    if (!content.title.trim()) {
      toast({ title: "Content required", variant: "destructive" });
      return;
    }

    setIsPosting(true);
    try {
      let contentObj: ThemeConcept | VocabItem | QuoteItem;

      if (postType === "theme") {
        contentObj = {
          id: Math.random().toString(36).substring(2),
          mediaId: "shared",
          title: content.title,
          summary: content.description,
          savedForLater: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else if (postType === "vocab") {
        contentObj = {
          id: Math.random().toString(36).substring(2),
          mediaId: "shared",
          word: content.title,
          definition: content.description,
          tags: [],
          isLearned: false,
          createdAt: new Date().toISOString(),
        };
      } else {
        contentObj = {
          id: Math.random().toString(36).substring(2),
          mediaId: "shared",
          text: content.title,
          userMeaning: content.description,
          isBookmarked: false,
          createdAt: new Date().toISOString(),
        };
      }

      await feedService.createPost({
        type: postType,
        content: contentObj,
        caption: caption.trim() || undefined,
        visibility,
        authorName: userName,
      });

      toast({ title: "Posted!" });
      onOpenChange(false);
      setCaption("");
      setContent({ title: "", description: "" });
      onPost();
    } catch (error) {
      toast({ title: "Failed to post", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share What You've Learned</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={postType}
                onValueChange={(v) => setPostType(v as typeof postType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="theme">Theme</SelectItem>
                  <SelectItem value="vocab">Vocabulary</SelectItem>
                  <SelectItem value="quote">Quote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as typeof visibility)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="friends">Friends Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              {postType === "quote"
                ? "Quote Text"
                : postType === "vocab"
                  ? "Word"
                  : "Theme Title"}
            </Label>
            <Input
              placeholder={
                postType === "quote"
                  ? "Enter the quote..."
                  : postType === "vocab"
                    ? "Enter the word..."
                    : "Enter theme title..."
              }
              value={content.title}
              onChange={(e) =>
                setContent({ ...content, title: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>
              {postType === "quote"
                ? "Meaning"
                : postType === "vocab"
                  ? "Definition"
                  : "Summary"}
            </Label>
            <Textarea
              placeholder={
                postType === "quote"
                  ? "What does it mean to you?"
                  : postType === "vocab"
                    ? "Enter definition..."
                    : "Brief summary..."
              }
              value={content.description}
              onChange={(e) =>
                setContent({ ...content, description: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Caption (optional)</Label>
            <Textarea
              placeholder="Add your thoughts..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
            />
          </div>

          <Button onClick={handlePost} disabled={isPosting} className="w-full">
            {isPosting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
