import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { feedService } from "@/services/feedService";
import { BookOpen, Film, Globe, Lightbulb, Loader2, Quote, Rss, Users } from "lucide-react";

export interface DirectShareItem {
  type: "theme" | "vocab" | "quote" | "media";
  id: string;
  title: string;
  subtitle?: string;
  mediaTitle?: string;
  coverUrl?: string;
}

interface DirectShareFeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DirectShareItem | null;
  onShared?: () => void;
}

export function DirectShareFeedDialog({
  open,
  onOpenChange,
  item,
  onShared,
}: DirectShareFeedDialogProps) {
  const { toast } = useToast();
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"global" | "friends">("global");
  const [isPosting, setIsPosting] = useState(false);

  if (!item) return null;

  const handlePost = async () => {
    setIsPosting(true);
    try {
      await feedService.createPost({
        type: item.type,
        contentId: item.id,
        caption: caption.trim() || undefined,
        imageUrl: item.coverUrl,
        visibility,
      });
      toast({
        title: "Shared to feed!",
        description: `Your ${item.type} is now published for others to discover.`,
      });
      setCaption("");
      onOpenChange(false);
      onShared?.();
    } catch (e) {
      toast({
        title: "Failed to share",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const Icon =
    item.type === "media"
      ? Film
      : item.type === "theme"
        ? Lightbulb
        : item.type === "vocab"
          ? BookOpen
          : Quote;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rss className="h-5 w-5 text-primary" />
            Share to Social Feed
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Item Preview Card */}
          <div className="flex gap-3 rounded-xl border border-border/60 bg-accent/30 p-4">
            {item.coverUrl && (
              <img
                src={item.coverUrl}
                alt={item.title}
                className="w-14 h-20 object-cover rounded-lg shrink-0 shadow-sm"
              />
            )}
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                <Icon className="h-3.5 w-3.5" />
                <span>
                  {item.type} {item.mediaTitle && item.type !== "media" ? `· ${item.mediaTitle}` : ""}
                </span>
              </div>
              <p className="font-semibold text-foreground text-sm line-clamp-2">
                {item.title}
              </p>
              {item.subtitle ? (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {item.subtitle}
                </p>
              ) : null}
            </div>
          </div>

          {/* Visibility toggle buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Audience
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("global")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-xs font-medium transition-colors ${
                  visibility === "global"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border/60 text-muted-foreground hover:bg-accent/40"
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                Public (Global)
              </button>
              <button
                type="button"
                onClick={() => setVisibility("friends")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-2 text-xs font-medium transition-colors ${
                  visibility === "friends"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border/60 text-muted-foreground hover:bg-accent/40"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Friends Only
              </button>
            </div>
          </div>

          {/* Caption Textarea */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Add Your Thoughts
            </Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What makes this special to you? Add your review or takeaway..."
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPosting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePost}
              disabled={isPosting}
              className="gap-2"
            >
              {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Share Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
