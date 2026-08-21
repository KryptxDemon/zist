import { useLayoutEffect, useRef, useState } from "react";
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
  theme: { icon: Lightbulb, color: "text-amber-400", bg: "bg-amber-500/20", label: "Theme" },
  vocab: { icon: BookOpen, color: "text-emerald-400", bg: "bg-emerald-500/20", label: "Vocabulary" },
  quote: { icon: Quote, color: "text-violet-400", bg: "bg-violet-500/20", label: "Quote" },
};

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
  const [expanded, setExpanded] = useState(false);
  const [captionOverflows, setCaptionOverflows] = useState(false);
  const captionRef = useRef<HTMLParagraphElement | null>(null);

  const config = typeConfig[localPost.type];
  const Icon = config.icon;
  const isOwner = user?.id === localPost.userId;

  useLayoutEffect(() => {
    const el = captionRef.current;
    setCaptionOverflows(el ? el.scrollHeight - el.clientHeight > 1 : false);
  }, [localPost.caption, localPost.type]);

  const updatePost = (next: FeedPost) => {
    setLocalPost(next);
    onUpdate?.(next);
  };

  const handleLike = async () => {
    try {
      const result = await feedService.likePost(localPost.id);
      updatePost({
        ...localPost,
        isLiked: result.active,
        likes: result.count,
      });
    } catch {
      toast({ title: "Failed to upvote", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    try {
      const result = await feedService.savePost(localPost.id);
      updatePost({ ...localPost, isSaved: result.active });
    } catch {
      toast({ title: "Failed to save post", variant: "destructive" });
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

  return (
    <article className="glass grain rounded-2xl p-5 animate-fade-in">
      <div className="flex items-start gap-3 mb-4">
        <UserAvatar
          userId={localPost.userId}
          name={localPost.authorName}
          avatarUrl={localPost.authorAvatar}
        />
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/app/user/${localPost.userId}`)}
            className="font-medium text-foreground hover:text-primary transition-colors text-left"
          >
            {localPost.authorName}
          </button>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {formatRelativeTime(localPost.createdAt)}
            </span>
            {localPost.mediaTitle ? (
              <>
                <span>·</span>
                <span className="truncate max-w-[180px]">{localPost.mediaTitle}</span>
              </>
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                localPost.visibility === "global"
                  ? "bg-sky-500/15 text-sky-400"
                  : "bg-primary/15 text-primary",
              )}
            >
              {localPost.visibility === "global" ? (
                <Globe className="h-3 w-3" />
              ) : (
                <Users className="h-3 w-3" />
              )}
              {localPost.visibility === "global" ? "Global" : "Friends"}
            </span>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
            config.bg,
            config.color,
          )}
        >
          <Icon className="h-3 w-3" />
          {config.label}
        </span>
      </div>

      {localPost.caption ? (
        <div className="mb-4">
          <p
            ref={captionRef}
            className={cn(
              "text-foreground leading-relaxed",
              !expanded && "line-clamp-6",
            )}
          >
            {localPost.caption}
          </p>
          {captionOverflows ? (
            <div className="mt-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="text-primary hover:text-primary/80 gap-1 h-7 px-2"
              >
                {expanded ? (
                  <>
                    See less <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    See more <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="bg-accent/30 rounded-xl p-4 mb-4">
        {localPost.type === "theme" && (
          <div>
            <h4 className="font-display font-semibold text-foreground">
              {(localPost.content as ThemeConcept).title}
            </h4>
            {(localPost.content as ThemeConcept).summary ? (
              <p className="text-sm text-muted-foreground mt-1">
                {(localPost.content as ThemeConcept).summary}
              </p>
            ) : null}
          </div>
        )}
        {localPost.type === "vocab" && (
          <div>
            <h4 className="font-display font-semibold text-foreground">
              {(localPost.content as VocabItem).word}
            </h4>
            {(localPost.content as VocabItem).definition ? (
              <p className="text-sm text-muted-foreground mt-1">
                {(localPost.content as VocabItem).definition}
              </p>
            ) : null}
          </div>
        )}
        {localPost.type === "quote" && (
          <div>
            <p className="text-foreground italic">
              &ldquo;{(localPost.content as QuoteItem).text}&rdquo;
            </p>
            {(localPost.content as QuoteItem).speaker ? (
              <p className="text-sm text-muted-foreground mt-2">
                — {(localPost.content as QuoteItem).speaker}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleLike}
          className={cn(
            "flex items-center gap-1.5 text-sm transition-colors",
            localPost.isLiked
              ? "text-rose-400"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Heart className={cn("h-4 w-4", localPost.isLiked && "fill-current")} />
          {localPost.likes}
        </button>
        {!compact ? (
          <>
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors",
                localPost.isSaved
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Bookmark
                className={cn("h-4 w-4", localPost.isSaved && "fill-current")}
              />
              Save
            </button>
            <button
              type="button"
              onClick={toggleComments}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              {localPost.commentsCount}
            </button>
          </>
        ) : null}
        {isOwner ? (
          <button
            type="button"
            onClick={handleDelete}
            className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showComments && !compact ? (
        <div className="mt-4 pt-4 border-t border-border/60 space-y-4">
          {isLoadingComments ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No comments yet. Start the conversation.
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <UserAvatar
                    userId={comment.userId}
                    name={comment.authorName}
                    avatarUrl={comment.authorAvatar}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="rounded-xl bg-accent/40 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/app/user/${comment.userId}`)}
                        className="text-sm font-medium hover:text-primary"
                      >
                        {comment.authorName}
                      </button>
                      <p className="text-sm text-foreground mt-0.5">{comment.body}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                      {user?.id === comment.userId ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <UserAvatar
              userId={user?.id}
              name={user?.displayName || "You"}
              avatarUrl={user?.avatar}
              size="sm"
              clickable={false}
            />
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={1}
                className="min-h-[40px] resize-none"
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
      ) : null}
    </article>
  );
}
