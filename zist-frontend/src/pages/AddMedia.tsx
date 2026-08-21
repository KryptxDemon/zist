import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  MediaPreviewDialog,
  MediaResultCard,
  MediaResultItem,
  getMediaLabel,
  getResultCover,
} from "@/components/feed/MediaResultCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { mediaService } from "@/services/mediaService";
import { mediaSearchService } from "@/services/externalServices";
import { MediaStatus, MediaType } from "@/types";
import {
  ArrowLeft,
  LibraryBig,
  Loader2,
  Plus,
  Search,
  Star,
  WandSparkles,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SearchResultItem = MediaResultItem;

const mediaTypes: { value: MediaType; label: string }[] = [
  { value: "movie", label: "Movie" },
  { value: "tv", label: "TV Show" },
  { value: "book", label: "Book" },
  { value: "documentary", label: "Documentary" },
  { value: "podcast", label: "Podcast" },
  { value: "game", label: "Game" },
];

const statusOptions: { value: MediaStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export default function AddMedia() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const initialType = (searchParams.get("type") as MediaType) || "movie";
  const initialQuery = searchParams.get("q")?.trim() || "";

  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedResult, setSelectedResult] = useState<SearchResultItem | null>(
    null,
  );
  const [groupedResults, setGroupedResults] = useState<{
    moviesTv: SearchResultItem[];
    books: SearchResultItem[];
  }>({ moviesTv: [], books: [] });
  const [previewItem, setPreviewItem] = useState<SearchResultItem | null>(null);
  const [formData, setFormData] = useState({
    title: initialQuery,
    type: initialType,
    year: "",
    creator: "",
    description: "",
    coverUrl: "",
    status: "planned" as MediaStatus,
    tags: [] as string[],
    externalSource: "",
    externalId: "",
  });
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    const nextTag = tagInput.trim();
    if (nextTag && !formData.tags.includes(nextTag)) {
      setFormData({ ...formData, tags: [...formData.tags, nextTag] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((item) => item !== tag),
    });
  };

  const applyResultToForm = (item: SearchResultItem) => {
    setSelectedResult(item);
    setFormData((prev) => ({
      ...prev,
      title: item.title || prev.title,
      type: item.type || prev.type,
      year: item.year ? String(item.year) : prev.year,
      creator: item.creator || prev.creator,
      description: item.description || prev.description,
      coverUrl: item.cover_url || prev.coverUrl,
      externalSource: item.external_source || prev.externalSource,
      externalId: item.external_id || prev.externalId,
    }));

    toast({
      title: "Details fetched",
      description: "Form updated with API data. You can edit and save.",
    });
  };

  const addResultDirectly = async (item: SearchResultItem) => {
    setIsLoading(true);
    try {
      const media = await mediaService.create({
        userId: "current-user",
        title: item.title,
        type: item.type,
        year: item.year,
        creator: item.creator,
        description: item.description,
        coverUrl: item.cover_url,
        status: formData.status,
        tags: formData.tags,
        externalSource: item.external_source,
        externalId: item.external_id,
      });

      toast({
        title: "Media added!",
        description: `${item.title} was fetched and added automatically.`,
      });
      navigate(`/app/media/${media.id}`);
    } catch (error) {
      toast({
        title: "Failed to add media",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your media.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let autoResult:
        | {
            title: string;
            type: MediaType;
            year?: number;
            creator?: string;
            description?: string;
            cover_url?: string;
            external_source?: string;
            external_id?: string;
          }
        | undefined;

      const needsAutoFetch =
        !formData.externalId &&
        (!formData.coverUrl ||
          !formData.year ||
          !formData.creator ||
          !formData.description);

      if (needsAutoFetch) {
        const results = await mediaSearchService.searchMedia(
          formData.title.trim(),
          formData.type,
        );
        autoResult = results[0] as typeof autoResult;
      }

      const media = await mediaService.create({
        userId: "current-user",
        title: formData.title.trim() || autoResult?.title || "",
        type: autoResult?.type || formData.type,
        year: formData.year ? parseInt(formData.year) : autoResult?.year,
        creator: formData.creator.trim() || autoResult?.creator || undefined,
        description:
          formData.description.trim() || autoResult?.description || undefined,
        coverUrl:
          formData.coverUrl.trim() || autoResult?.cover_url || undefined,
        status: formData.status,
        tags: formData.tags,
        externalSource:
          formData.externalSource || autoResult?.external_source || undefined,
        externalId: formData.externalId || autoResult?.external_id || undefined,
      });

      toast({
        title: "Media added!",
        description: autoResult
          ? `${formData.title} was auto-enriched from external APIs and added.`
          : `${formData.title} has been added to your library.`,
      });

      navigate(`/app/media/${media.id}`);
    } catch (error) {
      toast({
        title: "Failed to add media",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setGroupedResults({ moviesTv: [], books: [] });
      toast({
        title: "Search query required",
        description: "Type a title to fetch media details from APIs.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const results = await mediaSearchService.searchMediaGrouped(query);
      setGroupedResults(results);
      if (!results.moviesTv.length && !results.books.length) {
        toast({
          title: "No results found",
          description: "Try a different title.",
        });
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not fetch data from API.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setGroupedResults({ moviesTv: [], books: [] });
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsSearching(true);
      void (async () => {
        try {
          const results = await mediaSearchService.searchMediaGrouped(query);
          setGroupedResults(results);
        } finally {
          setIsSearching(false);
        }
      })();
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const selectedPreview = useMemo(
    () =>
      selectedResult ||
      groupedResults.moviesTv[0] ||
      groupedResults.books[0] ||
      null,
    [groupedResults.books, groupedResults.moviesTv, selectedResult],
  );

  const previewCover = selectedPreview
    ? getResultCover(selectedPreview)
    : getResultCover({
        type: formData.type,
        cover_url: formData.coverUrl || undefined,
      });

  return (
    <AppLayout>
      {previewItem ? (
        <MediaPreviewDialog
          item={previewItem}
          isAdding={isLoading}
          onClose={() => setPreviewItem(null)}
          onAutofill={(item) => {
            applyResultToForm(item);
          }}
          onAdd={addResultDirectly}
        />
      ) : null}
      <div className="max-w-7xl mx-auto pb-20 md:pb-0 animate-fade-in">
        <div className="mb-8 rounded-[2rem] border border-border/60 bg-gradient-to-br from-background via-background to-primary/5 p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="shrink-0 rounded-2xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="space-y-2">
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                  Add Media
                </h1>
                <p className="max-w-2xl text-muted-foreground">
                  Search by title, preview rich results with thumbnails, and add
                  a polished entry to your library in one pass.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[32rem]">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Step 1
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  Search title
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Step 2
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  Choose details
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 col-span-2 sm:col-span-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Step 3
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  Save instantly
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <form
            onSubmit={handleSubmit}
            className="glass grain rounded-[2rem] p-6 sm:p-8 space-y-8 border border-border/50 shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
          >
            <div className="space-y-4 rounded-[1.5rem] border border-border/60 bg-background/45 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <Label htmlFor="apiSearch" className="text-base font-semibold">
                  Find title details automatically
                </Label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="apiSearch"
                  placeholder="Search a movie, show, book, documentary, podcast, or game..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSearch();
                    }
                  }}
                  className="h-12 bg-background/80"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="h-12 min-w-28"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <WandSparkles className="mr-2 h-4 w-4" />
                      Fetch
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Results appear as you type. Press Enter or Fetch to search
                again.
                {groupedResults.moviesTv.length + groupedResults.books.length >
                0
                  ? ` Found ${groupedResults.moviesTv.length + groupedResults.books.length} result${groupedResults.moviesTv.length + groupedResults.books.length > 1 ? "s" : ""}.`
                  : ""}
              </p>
            </div>

            <div className="grid gap-5 2xl:grid-cols-2">
              <div className="rounded-[1.5rem] border border-border/60 bg-background/45 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Movies & TV
                    </p>
                    <h2 className="font-display text-xl font-bold text-foreground">
                      Visual results
                    </h2>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {groupedResults.moviesTv.length}
                  </span>
                </div>

                {groupedResults.moviesTv.length === 0 ? (
                  <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40 px-4 text-center text-sm text-muted-foreground">
                    Start typing a title to see rich suggestions with posters
                    and quick actions.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[34rem] overflow-auto pr-1">
                    {groupedResults.moviesTv.slice(0, 8).map((item, idx) => (
                      <MediaResultCard
                        key={`movies-${item.external_source || "ext"}-${item.external_id || item.title}-${idx}`}
                        item={item}
                        isAdding={isLoading}
                        onPreview={(it) => setPreviewItem(it)}
                        onAutofill={(it) => applyResultToForm(it)}
                        onAdd={(it) => addResultDirectly(it)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-border/60 bg-background/45 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Books
                    </p>
                    <h2 className="font-display text-xl font-bold text-foreground">
                      Curated suggestions
                    </h2>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {groupedResults.books.length}
                  </span>
                </div>

                {groupedResults.books.length === 0 ? (
                  <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40 px-4 text-center text-sm text-muted-foreground">
                    Search a title and books will appear here with matching
                    covers and metadata.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[34rem] overflow-auto pr-1">
                    {groupedResults.books.slice(0, 8).map((item, idx) => (
                      <MediaResultCard
                        key={`books-${item.external_source || "ext"}-${item.external_id || item.title}-${idx}`}
                        item={item}
                        isBook
                        isAdding={isLoading}
                        onPreview={(it) => setPreviewItem(it)}
                        onAutofill={(it) => applyResultToForm(it)}
                        onAdd={(it) => addResultDirectly(it)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5 rounded-[1.5rem] border border-border/60 bg-background/45 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <LibraryBig className="h-4 w-4 text-primary" />
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Final details
                </h2>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter title..."
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="h-12 bg-background/80"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, type: v as MediaType })
                    }
                  >
                    <SelectTrigger id="type" className="h-12 bg-background/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mediaTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) =>
                      setFormData({ ...formData, status: v as MediaStatus })
                    }
                  >
                    <SelectTrigger
                      id="status"
                      className="h-12 bg-background/80"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Auto-filled from API when available"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="min-h-28 bg-background/80"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    placeholder="2024"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: e.target.value })
                    }
                    className="h-12 bg-background/80"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creator">Creator/Author/Director</Label>
                  <Input
                    id="creator"
                    placeholder="Enter name..."
                    value={formData.creator}
                    onChange={(e) =>
                      setFormData({ ...formData, creator: e.target.value })
                    }
                    className="h-12 bg-background/80"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverUrl">Cover Image URL</Label>
                <Input
                  id="coverUrl"
                  type="url"
                  placeholder="https://..."
                  value={formData.coverUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, coverUrl: e.target.value })
                  }
                  className="h-12 bg-background/80"
                />
                {formData.coverUrl ? (
                  <div className="mt-3 w-fit overflow-hidden rounded-2xl border border-border/60 bg-background/70 p-2">
                    <img
                      src={formData.coverUrl}
                      alt="Preview"
                      className="h-36 w-24 rounded-xl object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="h-12 bg-background/80"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex-1 h-12"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add to Library"
                  )}
                </Button>
              </div>
            </div>
          </form>

          <aside className="space-y-6">
            <div className="glass grain sticky top-6 rounded-[2rem] p-5 border border-border/50 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Live preview
                </h2>
              </div>

              <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-border/60 bg-background/60">
                <div className="relative aspect-[3/4] w-full">
                  <img
                    src={previewCover}
                    alt={
                      selectedPreview?.title ||
                      formData.title ||
                      "Media preview"
                    }
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                      Selected media
                    </p>
                    <h3 className="mt-1 font-display text-2xl font-bold leading-tight">
                      {formData.title || selectedPreview?.title || "Untitled"}
                    </h3>
                    <p className="mt-1 text-sm text-white/80">
                      {getMediaLabel(formData.type)}
                      {formData.year ? ` • ${formData.year}` : ""}
                      {formData.creator ? ` • ${formData.creator}` : ""}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Status
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {
                          statusOptions.find((s) => s.value === formData.status)
                            ?.label
                        }
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Tags
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formData.tags.length} added
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Summary
                    </p>
                    <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">
                      {formData.description ||
                        selectedPreview?.description ||
                        "Search results can auto-fill the form so you spend less time typing and more time learning."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Cover URL
                    </p>
                    <p className="mt-1 break-all text-sm text-muted-foreground">
                      {formData.coverUrl ||
                        selectedPreview?.cover_url ||
                        "No custom cover selected yet."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                Pick a result on the left to autofill the form, or keep editing
                manually before saving.
              </div>
            </div>

            <div className="glass grain rounded-[2rem] p-5 border border-border/50 space-y-4">
              <div className="flex items-center gap-2">
                <LibraryBig className="h-4 w-4 text-primary" />
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Tips
                </h2>
              </div>

              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="rounded-2xl border border-border/60 bg-background/60 p-3">
                  Use Autofill when a result already looks accurate. It saves
                  time and keeps data consistent.
                </li>
                <li className="rounded-2xl border border-border/60 bg-background/60 p-3">
                  The thumbnail list is the fastest way to verify you picked the
                  right title.
                </li>
                <li className="rounded-2xl border border-border/60 bg-background/60 p-3">
                  Tags help you find items later, so add only the ones that
                  actually matter.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
