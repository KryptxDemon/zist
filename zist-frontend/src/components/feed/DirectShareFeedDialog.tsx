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
        title: "Reflection published",
        description: `Your thoughts on this ${item.type} are now shared with fellow readers.`,
      });
      setCaption("");
      onOpenChange(false);
      onShared?.();
    } catch (e) {
      toast({
        title: "Could not publish reflection",
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
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg tracking-tight flex items-center gap-2">
            <Rss className="h-4 w-4 opacity-70" />
            Inscribe to Dispatches
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Item Preview Card */}
          <div className="flex gap-3 rounded-lg border border-border/60 bg-accent/25 p-3.5">
            {item.coverUrl && (
              <img
                src={item.coverUrl}
                alt={item.title}
                className="w-12 h-16 object-cover rounded shrink-0 shadow-xs border border-border/60"
              />
            )}
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">
                <Icon className="h-3 w-3" />
                <span>
                  {item.type === "quote" ? "Passage" : item.type === "vocab" ? "Lexicon" : item.type}
                  {item.mediaTitle && item.type !== "media" ? ` · ${item.mediaTitle}` : ""}
                </span>
              </div>
              <p className="font-serif font-semibold text-foreground text-sm line-clamp-2">
                {item.title}
              </p>
              {item.subtitle ? (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {item.subtitle}
                </p>
              ) : null}
            </div>
          </div>

          {/* Circulation toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Circulation
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
                <Globe className="h-3.5 w-3.5 opacity-70" />
                Public Forum
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
                <Users className="h-3.5 w-3.5 opacity-70" />
                Fellow Readers Only
              </button>
            </div>
          </div>

          {/* Caption Textarea */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Marginalia & Critical Notes
            </Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What makes this work memorable? Record your reflections or commentary..."
              rows={3}
              className="resize-none text-xs sm:text-sm font-sans"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPosting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePost}
              disabled={isPosting}
              className="gap-2 text-xs font-medium"
            >
              {isPosting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Publish Reflection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
