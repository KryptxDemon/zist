import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const [postType, setPostType] = useState<"theme" | "vocab" | "quote">("theme");
  const [visibility, setVisibility] = useState<"friends" | "global">("global");
  const [caption, setCaption] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [themes, setThemes] = useState<ShareableContentItem[]>([]);
  const [vocab, setVocab] = useState<ShareableContentItem[]>([]);
  const [quotes, setQuotes] = useState<ShareableContentItem[]>([]);

  useEffect(() => {
    if (!open) return;

    async function loadContent() {
      setIsLoadingContent(true);
      try {
        const data = await feedService.getShareableContent();
        setThemes(data.themes);
        setVocab(data.vocab);
        setQuotes(data.quotes);
        setSelectedId("");
      } catch {
        toast({
          title: "Could not load your library content",
          description: "Add themes, vocabulary, or quotes to a media item first.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingContent(false);
      }
    }

    loadContent();
  }, [open, toast]);

  const items =
    postType === "theme" ? themes : postType === "vocab" ? vocab : quotes;

  const handlePost = async () => {
    if (!selectedId) {
      toast({ title: "Select content to share", variant: "destructive" });
      return;
    }

    setIsPosting(true);
    try {
      await feedService.createPost({
        type: postType,
        contentId: selectedId,
        caption: caption.trim() || undefined,
        visibility,
      });
      toast({ title: "Shared to feed!" });
      setOpen(false);
      setCaption("");
      setSelectedId("");
      onPost();
    } catch {
      toast({ title: "Failed to share", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Share
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share from your library</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Tabs
            value={postType}
            onValueChange={(v) => {
              setPostType(v as typeof postType);
              setSelectedId("");
            }}
          >
            <TabsList className="w-full glass">
              <TabsTrigger value="theme" className="flex-1">
                Themes
              </TabsTrigger>
              <TabsTrigger value="vocab" className="flex-1">
                Vocab
              </TabsTrigger>
              <TabsTrigger value="quote" className="flex-1">
                Quotes
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>Pick content</Label>
              {isLoadingContent ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your library...
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
                  No {postType} items found. Add some in your media library first.
                </p>
              ) : (
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select a ${postType}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label} — {item.mediaTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
                  <SelectItem value="global">Global — everyone</SelectItem>
                  <SelectItem value="friends">Friends only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your thoughts</Label>
            <Textarea
              placeholder="Share your opinion on this theme, word, or quote..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handlePost}
            disabled={isPosting || !selectedId}
            className="w-full"
          >
            {isPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Post to feed
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
