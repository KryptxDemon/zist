import { useEffect, useState } from "react";
import { Loader2, Film, Lightbulb, BookOpen, Quote, Image as ImageIcon, Star, PenTool } from "lucide-react";
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
          title: "Could not load archive items",
          description: "Record titles or marginalia in your library first.",
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
      toast({ title: "Please select an entry to reflect upon", variant: "destructive" });
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
      toast({ title: "Reflection published to the forum" });
      setOpen(false);
      setCaption("");
      setImageUrl("");
      setSelectedId("");
      onPost();
    } catch {
      toast({ title: "Failed to publish reflection", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button size="sm" className="gap-2 font-medium text-xs rounded-lg shadow-xs">
            <PenTool className="h-3.5 w-3.5" />
            Share a Thought
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-tight">Share a Thought</DialogTitle>
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
            <TabsList className="w-full grid grid-cols-4 p-1 bg-accent/30 border border-border/50 rounded-lg">
              <TabsTrigger value="media" className="gap-1.5 text-xs">
                <Film className="h-3.5 w-3.5 opacity-70" />
                Media
              </TabsTrigger>
              <TabsTrigger value="theme" className="gap-1.5 text-xs">
                <Lightbulb className="h-3.5 w-3.5 opacity-70" />
                Theme
              </TabsTrigger>
              <TabsTrigger value="vocab" className="gap-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5 opacity-70" />
                Vocabulary
              </TabsTrigger>
              <TabsTrigger value="quote" className="gap-1.5 text-xs">
                <Quote className="h-3.5 w-3.5 opacity-70" />
                Quote
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Item Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Select {postType === "media" ? "Movie or Book" : postType === "quote" ? "Quote" : postType} from Library
            </Label>
            {isLoadingContent ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading your library...
              </div>
            ) : items.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border/80 p-4 text-center italic">
                No saved items found. Add some to your library first.
              </p>
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue
                    placeholder={`Select a ${
                      postType === "media" ? "title" : postType === "quote" ? "quote" : postType
                    }…`}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id} className="text-xs">
                      <span className="font-medium">{item.label}</span>
                      {postType !== "media" && item.mediaTitle && (
                        <span className="text-muted-foreground ml-1.5 italic font-serif">
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
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border border-border/60">
              {selectedItem.coverUrl ? (
                <img
                  src={selectedItem.coverUrl}
                  alt={selectedItem.label}
                  className="w-12 h-16 object-cover rounded shrink-0 shadow-xs border border-border/60"
                />
              ) : (
                <div className="w-12 h-16 rounded bg-secondary flex items-center justify-center shrink-0">
                  <Film className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-serif font-semibold text-sm text-foreground truncate">
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
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Who can see this
            </Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as typeof visibility)}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global" className="text-xs">Public Feed (Everyone)</SelectItem>
                <SelectItem value="friends" className="text-xs">Friends Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Your Thoughts */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                Your Thoughts
              </Label>
              <button
                type="button"
                onClick={() => setShowImageInput(!showImageInput)}
                className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors"
              >
                <ImageIcon className="h-3 w-3" />
                {showImageInput ? "Hide image link" : "Attach image link"}
              </button>
            </div>
            <Textarea
              placeholder={
                postType === "media"
                  ? "What did you think of this? Add your commentary, favorite themes, or thoughts..."
                  : "Why did this stand out to you? Add a thought or reflection..."
              }
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="resize-none text-xs sm:text-sm font-sans"
            />
          </div>

          {/* Optional Custom Image URL */}
          {showImageInput && (
            <div className="space-y-1.5 animate-fade-in">
              <Label className="text-[11px] text-muted-foreground">
                Poster or Image Link (optional)
              </Label>
              <Input
                placeholder="https://example.com/poster.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="text-xs"
              />
              {imageUrl && (
                <div className="mt-2 overflow-hidden rounded-md border max-h-36">
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
            className="w-full font-medium py-4 text-xs tracking-wide"
          >
            {isPosting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
            Post to Feed
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
