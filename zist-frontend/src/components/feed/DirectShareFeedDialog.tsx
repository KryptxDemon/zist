import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { feedService } from "@/services/feedService";
import { BookOpen, Globe, Lightbulb, Loader2, Quote, Rss, Users } from "lucide-react";

export interface DirectShareItem {
  type: "theme" | "vocab" | "quote";
  id: string;
  title: string;
  subtitle?: string;
  mediaTitle?: string;
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
    item.type === "theme"
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
            Share to Feed
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Item Preview Card */}
          <div className="rounded-xl border border-border/60 bg-accent/30 p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
              <Icon className="h-3.5 w-3.5" />
              <span>
                {item.type} {item.mediaTitle ? `· ${item.mediaTitle}` : ""}
              </span>
            </div>
            <p className="font-semibold text-foreground text-sm line-clamp-2">
              {item.title}
            </p>
            {item.subtitle ? (
              <p className="text-xs text-muted-foreground line-clamp-3">
                {item.subtitle}
              </p>
            ) : null}
          </div>

          {/* Caption Input */}
          <div className="space-y-1.5">
            <Label htmlFor="feedCaption" className="text-xs font-medium">
              Your Thoughts / Caption (Optional)
            </Label>
            <Textarea
              id="feedCaption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What made this memorable? Share your insights with fellow learners..."
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Visibility Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Audience</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("global")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                  visibility === "global"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                Global Community
              </button>
              <button
                type="button"
                onClick={() => setVisibility("friends")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                  visibility === "friends"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Friends Only
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPosting}
          >
            Cancel
          </Button>
          <Button onClick={handlePost} disabled={isPosting} className="gap-2">
            {isPosting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rss className="h-4 w-4" />
            )}
            Post to Feed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
