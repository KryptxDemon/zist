import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { mediaService } from "@/services/mediaService";
import { MediaType, MediaStatus } from "@/types";
import { mediaSearchService } from "@/services/externalServices";
import { Loader2, ArrowLeft, X, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SearchResultItem = {
  title: string;
  type: MediaType;
  year?: number;
  creator?: string;
  description?: string;
  cover_url?: string;
  external_source?: string;
  external_id?: string;
};

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
  const [groupedResults, setGroupedResults] = useState<{
    moviesTv: SearchResultItem[];
    books: SearchResultItem[];
  }>({ moviesTv: [], books: [] });
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
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
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
    if (!searchQuery.trim()) {
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
      const results = await mediaSearchService.searchMediaGrouped(
        searchQuery.trim(),
      );
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

  const applyResultToForm = (item: SearchResultItem) => {
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

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-20 md:pb-0 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Add Media
            </h1>
            <p className="text-muted-foreground">
              Add a new item to your learning library
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="glass grain rounded-2xl p-6 sm:p-8 space-y-6"
        >
          <div className="space-y-3 rounded-xl border border-border/60 p-4 bg-background/40">
            <Label htmlFor="apiSearch">Find title details automatically</Label>
            <div className="flex gap-2">
              <Input
                id="apiSearch"
                placeholder="Search title and fetch details automatically..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSearch();
                  }
                }}
                className="h-11"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Fetch"
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Results appear as you type. Press Enter or Fetch to search again.
              {groupedResults.moviesTv.length + groupedResults.books.length > 0
                ? ` Found ${groupedResults.moviesTv.length + groupedResults.books.length} result${groupedResults.moviesTv.length + groupedResults.books.length > 1 ? "s" : ""}.`
                : ""}
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 p-3 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Movies & TV
                </p>
                {groupedResults.moviesTv.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No movie/TV results yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-auto pr-1">
                    {groupedResults.moviesTv.slice(0, 8).map((item, idx) => (
                      <div
                        key={`movies-${item.external_source || "ext"}-${item.external_id || item.title}-${idx}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {(item.type || "media").toUpperCase()}
                            {item.year ? ` • ${item.year}` : ""}
                            {item.creator ? ` • ${item.creator}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => applyResultToForm(item)}
                          >
                            Autofill
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => addResultDirectly(item)}
                            disabled={isLoading}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border/60 p-3 space-y-2">
                <p className="text-sm font-semibold text-foreground">Books</p>
                {groupedResults.books.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No book results yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-auto pr-1">
                    {groupedResults.books.slice(0, 8).map((item, idx) => (
                      <div
                        key={`books-${item.external_source || "ext"}-${item.external_id || item.title}-${idx}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {(item.type || "media").toUpperCase()}
                            {item.year ? ` • ${item.year}` : ""}
                            {item.creator ? ` • ${item.creator}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => applyResultToForm(item)}
                          >
                            Autofill
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => addResultDirectly(item)}
                            disabled={isLoading}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
              className="h-11"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData({ ...formData, type: v as MediaType })
                }
              >
                <SelectTrigger id="type" className="h-11">
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
                <SelectTrigger id="status" className="h-11">
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
              className="min-h-24"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
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
                className="h-11"
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
                className="h-11"
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
              className="h-11"
            />
            {formData.coverUrl && (
              <div className="mt-2">
                <img
                  src={formData.coverUrl}
                  alt="Preview"
                  className="w-24 h-36 object-cover rounded-lg"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}
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
                className="h-11"
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-accent rounded-full text-sm"
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
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
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
        </form>
      </div>
    </AppLayout>
  );
}
