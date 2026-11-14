import { useEffect, useState } from "react";
import { Plus, Loader2, Film, Lightbulb, BookOpen, Quote, Image as ImageIcon, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { feedService } from "@/services/feedService";
import { ShareableContentItem } from "@/types";

interface FeedComposeDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPost: () => void;
  showTrigger?: boolean;
}

export function FeedComposeDialog({
  open: controlledOpen,
  onOpenChange,
  onPost,
  showTrigger = true,
}: FeedComposeDialogProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [postType, setPostType] = useState<"media" | "theme" | "vocab" | "quote">("media");
  const [visibility, setVisibility] = useState<"friends" | "global">("global");
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  const [mediaList, setMediaList] = useState<ShareableContentItem[]>([]);
  const [themes, setThemes] = useState<ShareableContentItem[]>([]);
  const [vocab, setVocab] = useState<ShareableContentItem[]>([]);
  const [quotes, setQuotes] = useState<ShareableContentItem[]>([]);

  useEffect(() => {
    if (!open) return;

    async function loadContent() {
      setIsLoadingContent(true);
      try {
        const data = await feedService.getShareableContent();
        setMediaList(data.media || []);
        setThemes(data.themes || []);
        setVocab(data.vocab || []);
        setQuotes(data.quotes || []);
        setSelectedId("");
      } catch {
        toast({
          title: "Could not load library items",
          description: "Add movies, books, or notes to your library first.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingContent(false);
      }
    }

    loadContent();
  }, [open, toast]);

  const items =
    postType === "media"
      ? mediaList
      : postType === "theme"
        ? themes
        : postType === "vocab"
          ? vocab
          : quotes;

  const selectedItem = items.find((i) => i.id === selectedId);

  const handlePost = async () => {
    if (!selectedId) {
      toast({ title: "Please select an item to share", variant: "destructive" });
      return;
    }

    setIsPosting(true);
    try {
      await feedService.createPost({
        type: postType,
        contentId: selectedId,
        caption: caption.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        visibility,
      });
      toast({ title: "Shared to feed!" });
      setOpen(false);
      setCaption("");
      setImageUrl("");
      setSelectedId("");
      onPost();
    } catch {
      toast({ title: "Failed to share post", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button className="gap-2 shadow-sm font-semibold">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create a Social Share</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Post Type Selector Tabs */}
          <Tabs
            value={postType}
            onValueChange={(v) => {
              setPostType(v as typeof postType);
              setSelectedId("");
            }}
          >
            <TabsList className="w-full glass grid grid-cols-4 p-1">
              <TabsTrigger value="media" className="gap-1.5 text-xs sm:text-sm">
                <Film className="h-3.5 w-3.5" />
                Media
              </TabsTrigger>
              <TabsTrigger value="theme" className="gap-1.5 text-xs sm:text-sm">
                <Lightbulb className="h-3.5 w-3.5" />
                Theme
              </TabsTrigger>
              <TabsTrigger value="vocab" className="gap-1.5 text-xs sm:text-sm">
                <BookOpen className="h-3.5 w-3.5" />
                Vocab
              </TabsTrigger>
              <TabsTrigger value="quote" className="gap-1.5 text-xs sm:text-sm">
                <Quote className="h-3.5 w-3.5" />
                Quote
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Item Selector */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Select {postType === "media" ? "Movie / Book" : postType} from Library
            </Label>
            {isLoadingContent ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your library...
              </div>
            ) : items.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground rounded-xl border border-dashed border-border/80 p-4 text-center">
                No {postType} items found in your library yet. Add some first!
              </p>
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={`Choose a ${
                      postType === "media" ? "movie or book" : postType
                    }...`}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <span className="font-medium">{item.label}</span>
                      {postType !== "media" && item.mediaTitle && (
                        <span className="text-muted-foreground ml-1.5">
                          — {item.mediaTitle}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Item Preview Pill */}
          {selectedItem && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/40 border border-border/60">
              {selectedItem.coverUrl ? (
                <img
                  src={selectedItem.coverUrl}
                  alt={selectedItem.label}
                  className="w-12 h-16 object-cover rounded-md shrink-0 shadow-sm"
                />
              ) : (
                <div className="w-12 h-16 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <Film className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground truncate">
                  {selectedItem.label}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {selectedItem.mediaType && (
                    <span className="capitalize">{selectedItem.mediaType}</span>
                  )}
                  {selectedItem.year && <span>· {selectedItem.year}</span>}
                  {selectedItem.rating !== undefined && selectedItem.rating !== null && (
                    <span className="inline-flex items-center gap-0.5 text-amber-400 font-medium">
                      <Star className="h-3 w-3 fill-amber-400" />
                      {selectedItem.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Visibility selector */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Audience
            </Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as typeof visibility)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Public (Global feed — visible to all)</SelectItem>
                <SelectItem value="friends">Friends only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Caption / Review */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Your Take / Review / Caption
              </Label>
              <button
                type="button"
                onClick={() => setShowImageInput(!showImageInput)}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
              >
                <ImageIcon className="h-3 w-3" />
                {showImageInput ? "Hide image URL" : "Attach custom image"}
              </button>
            </div>
            <Textarea
              placeholder={
                postType === "media"
                  ? "Write your thoughts or review on this film or book..."
                  : "Share why this quote, concept, or word resonated with you..."
              }
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Optional Custom Image URL */}
          {showImageInput && (
            <div className="space-y-1.5 animate-fade-in">
              <Label className="text-xs text-muted-foreground">
                Custom Poster / Image Link (optional)
              </Label>
              <Input
                placeholder="https://example.com/poster.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="text-xs"
              />
              {imageUrl && (
                <div className="mt-2 overflow-hidden rounded-lg border max-h-36">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => toast({ title: "Image could not be loaded", variant: "destructive" })}
                  />
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handlePost}
            disabled={isPosting || !selectedId}
            className="w-full font-semibold py-5"
          >
            {isPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Publish Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
