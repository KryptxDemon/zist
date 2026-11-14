import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatRelativeTime } from "@/lib/time";
import {
  Heart,
  Bookmark,
  MessageCircle,
  Lightbulb,
  BookOpen,
  Quote,
  Trash2,
  Globe,
  Users,
  Loader2,
  Send,
  ChevronDown,
  ChevronUp,
  Film,
  Book,
  Star,
  Share2,
  Sparkles,
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { feedService } from "@/services/feedService";
import { FeedComment, FeedPost, QuoteItem, ThemeConcept, VocabItem } from "@/types";
import { cn } from "@/lib/utils";

const typeConfig = {
  media: {
    icon: Film,
    color: "text-amber-400",
    bg: "bg-amber-500/15 border-amber-500/30",
    label: "Media",
  },
  theme: {
    icon: Lightbulb,
    color: "text-yellow-400",
    bg: "bg-yellow-500/15 border-yellow-500/30",
    label: "Theme",
  },
  vocab: {
    icon: BookOpen,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15 border-emerald-500/30",
    label: "Vocabulary",
  },
  quote: {
    icon: Quote,
    color: "text-violet-400",
    bg: "bg-violet-500/15 border-violet-500/30",
    label: "Quote",
  },
};

function ExpandableText({
  text,
  wordLimit = 50,
  charLimit = 240,
  className = "",
  prefix = "",
  suffix = "",
}: {
  text: string;
  wordLimit?: number;
  charLimit?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const words = text.trim().split(/\s+/);
  const isTooLong = words.length > wordLimit || text.length > charLimit;

  const displayText =
    !isTooLong || expanded
      ? text
      : words.slice(0, wordLimit).join(" ").trim() + "…";

  return (
    <div className="space-y-1">
      <p className={className}>
        {prefix}
        {displayText}
        {suffix}
      </p>
      {isTooLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline transition-all"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show more <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

interface FeedPostCardProps {
  post: FeedPost;
  onUpdate?: (post: FeedPost) => void;
  onDelete?: (postId: string) => void;
  compact?: boolean;
}

export function FeedPostCard({
  post,
  onUpdate,
  onDelete,
  compact = false,
}: FeedPostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [localPost, setLocalPost] = useState(post);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

  const config = typeConfig[localPost.type] || typeConfig.theme;
  const Icon =
    localPost.type === "media"
      ? localPost.mediaType === "book"
        ? Book
        : Film
      : config.icon;
  const isOwner = user?.id === localPost.userId;

  const updatePost = (next: FeedPost) => {
    setLocalPost(next);
    onUpdate?.(next);
  };

  const handleLike = async () => {
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 600);

    // Optimistic toggle
    const nextLiked = !localPost.isLiked;
    const nextCount = localPost.likes + (nextLiked ? 1 : -1);
    const optimistic = {
      ...localPost,
      isLiked: nextLiked,
      likes: Math.max(0, nextCount),
    };
    updatePost(optimistic);

    try {
      const result = await feedService.likePost(localPost.id);
      updatePost({
        ...localPost,
        isLiked: result.active,
        likes: result.count,
      });
    } catch {
      updatePost(localPost); // revert
      toast({ title: "Failed to like post", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    const nextSaved = !localPost.isSaved;
    updatePost({ ...localPost, isSaved: nextSaved });

    try {
      const result = await feedService.savePost(localPost.id);
      updatePost({ ...localPost, isSaved: result.active });
      toast({
        title: result.active ? "Saved to your bookmarks" : "Removed from bookmarks",
      });
    } catch {
      updatePost(localPost);
      toast({ title: "Failed to save post", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/app/feed?post=${localPost.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Zist post by ${localPost.authorName}`,
          text: localPost.caption || localPost.mediaTitle || "Check out this post on Zist",
          url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Post link copied to your clipboard.",
      });
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await feedService.deletePost(localPost.id);
      onDelete?.(localPost.id);
      toast({ title: "Post deleted" });
    } catch {
      toast({ title: "Failed to delete post", variant: "destructive" });
    }
  };

  const loadComments = async () => {
    setIsLoadingComments(true);
    try {
      const data = await feedService.getComments(localPost.id);
      setComments(data);
    } catch {
      toast({ title: "Failed to load comments", variant: "destructive" });
    } finally {
      setIsLoadingComments(false);
    }
  };

  const toggleComments = async () => {
    if (!showComments) {
      await loadComments();
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    const body = commentText.trim();
    if (!body) return;

    setIsSubmittingComment(true);
    try {
      const comment = await feedService.addComment(localPost.id, body);
      setComments((prev) => [...prev, comment]);
      setCommentText("");
      updatePost({
        ...localPost,
        commentsCount: localPost.commentsCount + 1,
      });
    } catch {
      toast({ title: "Failed to post comment", variant: "destructive" });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await feedService.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      updatePost({
        ...localPost,
        commentsCount: Math.max(0, localPost.commentsCount - 1),
      });
    } catch {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    }
  };

  const coverImage = localPost.imageUrl || localPost.mediaCoverUrl;
  const isMediaPost = localPost.type === "media";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl transition-all duration-300 hover:border-border/90 hover:shadow-xl hover:shadow-black/10 animate-fade-in">
      {/* Subtle top ambient glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              userId={localPost.userId}
              name={localPost.authorName}
              avatarUrl={localPost.authorAvatar}
              className="ring-2 ring-primary/20 transition-transform group-hover:scale-105"
            />
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigate(`/app/user/${localPost.userId}`)}
                className="font-semibold text-foreground hover:text-primary transition-colors text-left truncate block text-sm sm:text-base"
              >
                {localPost.authorName}
              </button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{formatRelativeTime(localPost.createdAt)}</span>
                <span>·</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-medium",
                    localPost.visibility === "global"
                      ? "text-sky-400"
                      : "text-primary",
                  )}
                >
                  {localPost.visibility === "global" ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <Users className="h-3 w-3" />
                  )}
                  {localPost.visibility === "global" ? "Public" : "Friends"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border shadow-xs",
                config.bg,
                config.color,
              )}
            >
              <Icon className="h-3 w-3" />
              {localPost.type === "media"
                ? localPost.mediaType
                  ? localPost.mediaType.charAt(0).toUpperCase() + localPost.mediaType.slice(1)
                  : "Media"
                : config.label}
            </span>

            {isOwner && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                title="Delete post"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* User Caption / Thoughts */}
        {localPost.caption && (
          <div className="mt-3.5 text-foreground/95 text-sm sm:text-base leading-relaxed">
            <ExpandableText
              text={localPost.caption}
              wordLimit={60}
              charLimit={280}
            />
          </div>
        )}
      </div>

      {/* Main Content Showcase */}
      <div className="px-5 pb-4">
        {/* MEDIA POST SHOWCASE (Letterboxd / Instagram Style) */}
        {isMediaPost ? (
          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-accent/50 via-accent/30 to-background/50 p-4 transition-all">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {coverImage && (
                <div className="relative shrink-0 w-24 sm:w-28 aspect-[2/3] overflow-hidden rounded-lg shadow-lg ring-1 ring-white/10 group-hover:scale-102 transition-transform">
                  <img
                    src={coverImage}
                    alt={localPost.mediaTitle || "Media poster"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">
                    {localPost.mediaTitle || (localPost.content?.title ?? "Media")}
                  </h3>
                  {localPost.mediaYear && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
                      {localPost.mediaYear}
                    </span>
                  )}
                </div>

                {localPost.mediaCreator && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    by{" "}
                    <span className="text-foreground/80 font-medium">
                      {localPost.mediaCreator}
                    </span>
                  </p>
                )}

                {localPost.mediaRating !== undefined && localPost.mediaRating !== null && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    <span>{localPost.mediaRating.toFixed(1)} / 10</span>
                  </div>
                )}

                {localPost.content?.review && (
                  <div className="pt-1 text-xs sm:text-sm text-muted-foreground italic border-t border-border/40 mt-2">
                    <ExpandableText
                      text={localPost.content.review}
                      prefix="“"
                      suffix="”"
                      wordLimit={35}
                      charLimit={160}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* THEME CONCEPT SHOWCASE */}
        {localPost.type === "theme" && (
          <div className="relative overflow-hidden rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 shrink-0">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-yellow-400/90">
                    Core Theme
                  </span>
                  {localPost.mediaTitle && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground font-medium truncate">
                        {localPost.mediaTitle}
                      </span>
                    </>
                  )}
                </div>
                <h4 className="font-display text-base sm:text-lg font-bold text-foreground">
                  {(localPost.content as ThemeConcept).title}
                </h4>
                {(localPost.content as ThemeConcept).summary && (
                  <ExpandableText
                    text={(localPost.content as ThemeConcept).summary}
                    className="text-sm text-muted-foreground mt-2 leading-relaxed"
                    wordLimit={45}
                    charLimit={200}
                  />
                )}
              </div>
              {coverImage && (
                <img
                  src={coverImage}
                  alt="Poster"
                  className="hidden sm:block shrink-0 w-14 h-20 object-cover rounded-md shadow ring-1 ring-white/10"
                />
              )}
            </div>
          </div>
        )}

        {/* VOCABULARY SHOWCASE */}
        {localPost.type === "vocab" && (
          <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                    Vocabulary Insight
                  </span>
                  {localPost.mediaTitle && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground font-medium truncate">
                        {localPost.mediaTitle}
                      </span>
                    </>
                  )}
                </div>
                <h4 className="font-display text-lg sm:text-xl font-bold text-emerald-300">
                  {(localPost.content as VocabItem).word}
                </h4>
                {(localPost.content as VocabItem).definition && (
                  <p className="text-sm text-foreground/90 mt-1 leading-relaxed">
                    {(localPost.content as VocabItem).definition}
                  </p>
                )}
                {(localPost.content as VocabItem).exampleSentence && (
                  <div className="mt-2.5 pt-2 border-t border-emerald-500/20 text-xs sm:text-sm text-muted-foreground italic">
                    “{(localPost.content as VocabItem).exampleSentence}”
                  </div>
                )}
              </div>
              {coverImage && (
                <img
                  src={coverImage}
                  alt="Poster"
                  className="hidden sm:block shrink-0 w-14 h-20 object-cover rounded-md shadow ring-1 ring-white/10"
                />
              )}
            </div>
          </div>
        )}

        {/* QUOTE SHOWCASE */}
        {localPost.type === "quote" && (
          <div className="relative overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent p-5">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
                <Quote className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <ExpandableText
                  text={(localPost.content as QuoteItem).text}
                  prefix="“"
                  suffix="”"
                  className="font-serif text-base sm:text-lg italic text-foreground leading-relaxed"
                  wordLimit={50}
                  charLimit={240}
                />
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-violet-500/20 text-xs sm:text-sm text-muted-foreground">
                  {(localPost.content as QuoteItem).speaker && (
                    <span className="font-semibold text-violet-300">
                      — {(localPost.content as QuoteItem).speaker}
                    </span>
                  )}
                  {localPost.mediaTitle && (
                    <>
                      <span>in</span>
                      <span className="font-medium text-foreground/80 truncate">
                        {localPost.mediaTitle}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {coverImage && (
                <img
                  src={coverImage}
                  alt="Poster"
                  className="hidden sm:block shrink-0 w-14 h-20 object-cover rounded-md shadow ring-1 ring-white/10"
                />
              )}
            </div>
          </div>
        )}

        {/* Attached custom image if not already shown as poster */}
        {!isMediaPost && localPost.imageUrl && localPost.imageUrl !== localPost.mediaCoverUrl && (
          <div className="mt-3 overflow-hidden rounded-xl border border-border/50 max-h-96">
            <img
              src={localPost.imageUrl}
              alt="Post attachment"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Engagement Action Bar (Like, Comment, Save, Share) */}
      <div className="flex items-center justify-between border-t border-border/40 bg-accent/20 px-5 py-3">
        <div className="flex items-center gap-5 sm:gap-6">
          {/* Like Button with Pop Animation */}
          <button
            type="button"
            onClick={handleLike}
            className={cn(
              "group/btn relative flex items-center gap-2 text-sm font-medium transition-all duration-200",
              localPost.isLiked
                ? "text-rose-500"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <div className="relative">
              <Heart
                className={cn(
                  "h-4 w-4 transition-transform duration-200 group-hover/btn:scale-110",
                  localPost.isLiked && "fill-current text-rose-500",
                  likeAnim && "scale-125 animate-bounce",
                )}
              />
              {likeAnim && (
                <Sparkles className="absolute -top-2 -right-2 h-3 w-3 text-rose-400 animate-ping" />
              )}
            </div>
            <span>{localPost.likes}</span>
          </button>

          {/* Comments Toggle */}
          {!compact && (
            <button
              type="button"
              onClick={toggleComments}
              className={cn(
                "group/btn flex items-center gap-2 text-sm font-medium transition-colors",
                showComments
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MessageCircle className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
              <span>{localPost.commentsCount}</span>
            </button>
          )}

          {/* Save / Bookmark Button */}
          {!compact && (
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                "group/btn flex items-center gap-1.5 text-sm font-medium transition-colors",
                localPost.isSaved
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Bookmark
                className={cn(
                  "h-4 w-4 transition-transform group-hover/btn:scale-110",
                  localPost.isSaved && "fill-current text-primary",
                )}
              />
              <span className="hidden sm:inline">
                {localPost.isSaved ? "Saved" : "Save"}
              </span>
            </button>
          )}
        </div>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          className="group/btn flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          title="Share post"
        >
          <Share2 className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Integrated Inline Comments Section */}
      {showComments && !compact && (
        <div className="border-t border-border/50 bg-background/50 p-5 space-y-4 animate-fade-in">
          {isLoadingComments ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-3">
              No comments yet. Share your thoughts to kick off the conversation!
            </p>
          ) : (
            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5 items-start">
                  <UserAvatar
                    userId={comment.userId}
                    name={comment.authorName}
                    avatarUrl={comment.authorAvatar}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="rounded-xl bg-accent/40 border border-border/40 px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/app/user/${comment.userId}`)}
                          className="text-xs sm:text-sm font-semibold hover:text-primary transition-colors"
                        >
                          {comment.authorName}
                        </button>
                        <span className="text-[11px] text-muted-foreground">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground/95 mt-1 leading-relaxed">
                        {comment.body}
                      </p>
                    </div>
                    {user?.id === comment.userId && (
                      <div className="flex justify-end mt-1 px-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment Input */}
          <div className="flex gap-2.5 items-center pt-2 border-t border-border/40">
            <UserAvatar
              userId={user?.id}
              name={user?.displayName || "You"}
              avatarUrl={user?.avatar}
              size="sm"
              clickable={false}
            />
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="Add a comment... (Enter to post)"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={1}
                className="min-h-[40px] resize-none text-xs sm:text-sm bg-accent/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <Button
                size="icon"
                onClick={handleAddComment}
                disabled={isSubmittingComment || !commentText.trim()}
                className="shrink-0"
              >
                {isSubmittingComment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
