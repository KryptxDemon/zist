import { useEffect, useMemo, useRef, useState } from "react";
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
  BookOpen,
  ChevronDown,
  ChevronUp,
  Film,
  Gamepad2,
  Headphones,
  Loader2,
  PenLine,
  Plus,
  Search,
  Tv,
  Video,
  X,
} from "lucide-react";
import { prefetchImages } from "@/utils/prefetch";

type Mode = "search" | "manual";
type ResultFilter = "all" | "moviesTv" | "books";

const MEDIA_TYPES: {
  value: MediaType;
  label: string;
  icon: typeof Film;
}[] = [
  { value: "movie", label: "Movie", icon: Film },
  { value: "tv", label: "TV Show", icon: Tv },
  { value: "book", label: "Book", icon: BookOpen },
  { value: "documentary", label: "Documentary", icon: Video },
  { value: "podcast", label: "Podcast", icon: Headphones },
  { value: "game", label: "Game", icon: Gamepad2 },
];

const STATUS_OPTIONS: { value: MediaStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const EXAMPLE_SEARCHES = [
  "Interstellar",
  "Dune",
  "In the Mood for Love",
  "Atomic Habits",
  "The Bear",
];

function getItemKey(item: MediaResultItem, idx: number): string {
  return `${item.type}-${item.external_id || item.title}-${idx}`;
}

function getCreatorLabel(type: MediaType): string {
  if (type === "book") return "Author";
  if (type === "movie" || type === "documentary") return "Director";
  if (type === "podcast") return "Host / Creator";
  if (type === "game") return "Studio / Developer";
  return "Creator";
}

export default function AddMedia() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const initialType = (searchParams.get("type") as MediaType) || "movie";
  const initialQuery = searchParams.get("q")?.trim() || "";

  const [mode, setMode] = useState<Mode>("search");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showCoverField, setShowCoverField] = useState(false);
  const searchRequestId = useRef(0);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedResult, setSelectedResult] = useState<MediaResultItem | null>(
    null,
  );
  const [groupedResults, setGroupedResults] = useState<{
    moviesTv: MediaResultItem[];
    books: MediaResultItem[];
  }>({ moviesTv: [], books: [] });
  const [previewItem, setPreviewItem] = useState<MediaResultItem | null>(null);

  const [formData, setFormData] = useState({
    title: initialQuery,
    type: initialType,
    year: "",
    creator: "",
    description: "",
    coverUrl: "",
    rating: "",
    status: "planned" as MediaStatus,
    tags: [] as string[],
    externalSource: "",
    externalId: "",
  });
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    const nextTag = tagInput.trim();
    if (nextTag && !formData.tags.includes(nextTag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, nextTag] }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((item) => item !== tag),
    }));
  };

  const applyResultToForm = (item: MediaResultItem) => {
    setSelectedResult(item);
    setFormData((prev) => ({
      ...prev,
      title: item.title || prev.title,
      type: item.type || prev.type,
      year: item.year ? String(item.year) : "",
      creator: item.creator || "",
      description: item.description || "",
      coverUrl: item.cover_url || "",
      rating: item.rating !== undefined && item.rating !== null ? String(item.rating) : "",
      externalSource: item.external_source || "",
      externalId: item.external_id || "",
    }));
    setMode("manual");
  };

  const clearSelectedResult = () => {
    setSelectedResult(null);
    setFormData((prev) => ({
      ...prev,
      title: "",
      year: "",
      creator: "",
      description: "",
      coverUrl: "",
      rating: "",
      externalSource: "",
      externalId: "",
    }));
  };

  const openManualWithQuery = (title?: string) => {
    const prefill = (title ?? searchQuery).trim();
    if (prefill && !formData.title.trim()) {
      setFormData((prev) => ({ ...prev, title: prefill }));
    }
    setMode("manual");
  };

  const addResultDirectly = async (item: MediaResultItem, key?: string) => {
    setIsLoading(true);
    setAddingKey(key ?? item.title);
    try {
      const media = await mediaService.create({
        userId: "current-user",
        title: item.title,
        type: item.type,
        year: item.year ?? undefined,
        creator: item.creator ?? undefined,
        description: item.description ?? undefined,
        coverUrl: item.cover_url ?? undefined,
        status: formData.status,
        rating: item.rating ?? undefined,
        tags: formData.tags,
        externalSource: item.external_source,
        externalId: item.external_id,
      });

      toast({
        title: "Added to your library",
        description: `${item.title} has been saved.`,
      });
      navigate(`/app/media/${media.id}`);
    } catch (error) {
      toast({
        title: "Couldn't add title",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setAddingKey(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const title = formData.title.trim();
    if (!title) {
      toast({
        title: "Title required",
        description: "Give your entry a title to save it.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let autoResult: MediaResultItem | undefined;
      const needsDetails =
        !formData.externalId &&
        (!formData.coverUrl ||
          !formData.year ||
          !formData.creator ||
          !formData.description);

      if (needsDetails) {
        try {
          const results = await mediaSearchService.searchMedia(
            title,
            formData.type,
          );
          autoResult = results[0] as MediaResultItem | undefined;
        } catch {
          // Proceed with manual entry even if lookup fails
        }
      }

      const media = await mediaService.create({
        userId: "current-user",
        title: title || autoResult?.title || "",
        type: formData.type || autoResult?.type || "movie",
        year: formData.year
          ? parseInt(formData.year, 10)
          : autoResult?.year ?? undefined,
        creator: formData.creator.trim() || autoResult?.creator || undefined,
        description:
          formData.description.trim() || autoResult?.description || undefined,
        coverUrl:
          formData.coverUrl.trim() || autoResult?.cover_url || undefined,
        status: formData.status,
        rating: formData.rating
          ? parseFloat(formData.rating)
          : autoResult?.rating ?? undefined,
        tags: formData.tags,
        externalSource:
          formData.externalSource || autoResult?.external_source || undefined,
        externalId: formData.externalId || autoResult?.external_id || undefined,
      });

      toast({
        title: "Added to your library",
        description: `${title} has been saved.`,
      });
      navigate(`/app/media/${media.id}`);
    } catch (error) {
      toast({
        title: "Couldn't save entry",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runSearch = async (rawQuery: string) => {
    const query = rawQuery.trim();
    const reqId = ++searchRequestId.current;
    if (!query) {
      setGroupedResults({ moviesTv: [], books: [] });
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await mediaSearchService.searchMediaGrouped(query);
      if (reqId !== searchRequestId.current) return;
      setGroupedResults(results);
      setHasSearched(true);
      setResultFilter("all");
      prefetchImages([
        ...(results.moviesTv || []).map((m) => m.cover_url),
        ...(results.books || []).map((b) => b.cover_url),
      ]);
    } catch {
      if (reqId !== searchRequestId.current) return;
      toast({
        title: "Search unavailable",
        description: "Couldn't load results right now. You can still add it manually.",
        variant: "destructive",
      });
    } finally {
      if (reqId === searchRequestId.current) {
        setIsSearching(false);
      }
    }
  };

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      searchRequestId.current += 1;
      setGroupedResults({ moviesTv: [], books: [] });
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      void runSearch(query);
    }, 320);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const totalMoviesTv = groupedResults.moviesTv.length;
  const totalBooks = groupedResults.books.length;
  const totalResults = totalMoviesTv + totalBooks;

  const visibleMoviesTv = useMemo(
    () =>
      resultFilter === "books" ? [] : groupedResults.moviesTv.slice(0, 8),
    [groupedResults.moviesTv, resultFilter],
  );
  const visibleBooks = useMemo(
    () =>
      resultFilter === "moviesTv" ? [] : groupedResults.books.slice(0, 8),
    [groupedResults.books, resultFilter],
  );

  return (
    <AppLayout>
      {previewItem ? (
        <MediaPreviewDialog
          item={previewItem}
          isAdding={isLoading}
          onClose={() => setPreviewItem(null)}
          onAutofill={(item) => applyResultToForm(item)}
          onAdd={(item) => addResultDirectly(item)}
        />
      ) : null}

      <div className="mx-auto max-w-3xl pb-20 md:pb-8 animate-fade-in">
        {/* Clean Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0 rounded-full"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Add to Library
              </h1>
              <p className="text-sm text-muted-foreground">
                Search for a movie, show, or book — or add your own.
              </p>
            </div>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="mb-6 inline-flex w-full rounded-2xl border border-border/60 bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setMode("search")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              mode === "search"
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="h-4 w-4" />
            Search
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              mode === "manual"
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PenLine className="h-4 w-4" />
            Add manually
          </button>
        </div>

        {mode === "search" ? (
          <div className="space-y-5">
            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search movies, TV shows, or books..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runSearch(searchQuery);
                  }
                }}
                className="h-14 rounded-2xl border-border/70 bg-card/80 pl-12 pr-12 text-base shadow-sm focus-visible:ring-primary/40"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-1" />
                ) : null}
                {searchQuery ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Save Status Quick Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">
                  Save as:
                </span>
                <div className="inline-flex rounded-full border border-border/60 bg-card/60 p-0.5">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = formData.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, status: opt.value }))
                        }
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {totalMoviesTv > 0 && totalBooks > 0 ? (
                <div className="inline-flex rounded-full border border-border/60 bg-card/60 p-0.5">
                  {(
                    [
                      { id: "all", label: `All (${totalResults})` },
                      { id: "moviesTv", label: `Movies & TV (${totalMoviesTv})` },
                      { id: "books", label: `Books (${totalBooks})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setResultFilter(tab.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        resultFilter === tab.id
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Results / Empty States */}
            {!searchQuery.trim() ? (
              <div className="rounded-3xl border border-border/60 bg-card/40 p-6 sm:p-8 text-center space-y-5">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Search className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Find something to watch or read
                  </h2>
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">
                    Type a title above to add it in one click, with its poster
                    and details filled in for you.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {EXAMPLE_SEARCHES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setSearchQuery(example)}
                      className="rounded-full border border-border/70 bg-background/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {example}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Adding a podcast, game, or custom entry? Add it manually →
                  </button>
                </div>
              </div>
            ) : isSearching && totalResults === 0 ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex gap-3.5 rounded-2xl border border-border/50 bg-card/50 p-3 animate-pulse"
                  >
                    <div className="h-28 w-20 shrink-0 rounded-xl bg-muted/70" />
                    <div className="flex-1 space-y-2.5 py-1">
                      <div className="h-4 w-2/5 rounded bg-muted/70" />
                      <div className="h-3 w-1/4 rounded bg-muted/60" />
                      <div className="h-3 w-4/5 rounded bg-muted/50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : totalResults === 0 && hasSearched ? (
              <div className="rounded-3xl border border-border/60 bg-card/40 p-8 text-center space-y-4">
                <div className="space-y-1">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    No matches for "{searchQuery.trim()}"
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Try a different spelling, or add it yourself in seconds.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => openManualWithQuery(searchQuery)}
                  className="gap-2 rounded-xl"
                >
                  <Plus className="h-4 w-4" />
                  Add "{searchQuery.trim()}" manually
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {visibleMoviesTv.length > 0 ? (
                  <section className="space-y-3">
                    {visibleBooks.length > 0 ? (
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                        Movies & TV
                      </h2>
                    ) : null}
                    <div className="space-y-2.5">
                      {visibleMoviesTv.map((item, idx) => {
                        const key = getItemKey(item, idx);
                        return (
                          <MediaResultCard
                            key={key}
                            item={item}
                            isAdding={addingKey === key}
                            onPreview={(it) => setPreviewItem(it)}
                            onAutofill={(it) => applyResultToForm(it)}
                            onAdd={(it) => addResultDirectly(it, key)}
                          />
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {visibleBooks.length > 0 ? (
                  <section className="space-y-3">
                    {visibleMoviesTv.length > 0 ? (
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                        Books
                      </h2>
                    ) : null}
                    <div className="space-y-2.5">
                      {visibleBooks.map((item, idx) => {
                        const key = getItemKey(item, idx);
                        return (
                          <MediaResultCard
                            key={key}
                            item={item}
                            isBook
                            isAdding={addingKey === key}
                            onPreview={(it) => setPreviewItem(it)}
                            onAutofill={(it) => applyResultToForm(it)}
                            onAdd={(it) => addResultDirectly(it, key)}
                          />
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => openManualWithQuery(searchQuery)}
                    className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                  >
                    Didn't see the right one? Add "{searchQuery.trim()}" manually →
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Manual Entry Form */
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-border/60 bg-card/60 p-5 sm:p-7 space-y-6 shadow-sm"
          >
            {selectedResult ? (
              <div className="flex items-center gap-3.5 rounded-2xl border border-primary/25 bg-primary/5 p-3">
                <img
                  src={getResultCover(selectedResult)}
                  alt={selectedResult.title}
                  className="h-16 w-11 rounded-lg object-cover shrink-0 bg-muted"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-primary">
                    Selected from search
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedResult.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {getMediaLabel(selectedResult.type)}
                    {selectedResult.year ? ` · ${selectedResult.year}` : ""}
                    {selectedResult.creator ? ` · ${selectedResult.creator}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSelectedResult}
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              </div>
            ) : null}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-primary">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Interstellar, Atomic Habits..."
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="h-12 rounded-xl bg-background/80"
              />
            </div>

            {/* Type Pills */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MEDIA_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = formData.type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, type: t.value }))
                      }
                      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Pills */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const active = formData.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, status: opt.value }))
                      }
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Creator & Year */}
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <div className="space-y-2">
                <Label htmlFor="creator" className="text-sm font-medium">
                  {getCreatorLabel(formData.type)}
                </Label>
                <Input
                  id="creator"
                  placeholder="Optional"
                  value={formData.creator}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, creator: e.target.value }))
                  }
                  className="h-11 rounded-xl bg-background/80"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year" className="text-sm font-medium">
                  Year
                </Label>
                <Input
                  id="year"
                  type="number"
                  placeholder="2024"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, year: e.target.value }))
                  }
                  className="h-11 rounded-xl bg-background/80"
                />
              </div>
            </div>

            {/* Notes / Summary */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Summary or notes
              </Label>
              <Textarea
                id="description"
                placeholder="Write a short description or why you want to check this out..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="min-h-24 rounded-xl bg-background/80"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag and press Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="h-11 rounded-xl bg-background/80"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  className="h-11 rounded-xl px-3.5"
                  aria-label="Add tag"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Optional Custom Cover Toggle */}
            <div className="border-t border-border/50 pt-4">
              <button
                type="button"
                onClick={() => setShowCoverField((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCoverField || formData.coverUrl ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {formData.coverUrl
                  ? "Cover image attached"
                  : "Add a custom cover image (optional)"}
              </button>

              {showCoverField || formData.coverUrl ? (
                <div className="mt-3 space-y-3">
                  <Input
                    id="coverUrl"
                    type="url"
                    placeholder="Paste an image link (https://...)"
                    value={formData.coverUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        coverUrl: e.target.value,
                      }))
                    }
                    className="h-11 rounded-xl bg-background/80"
                  />
                  {formData.coverUrl ? (
                    <div className="w-fit overflow-hidden rounded-xl border border-border/60 bg-background/70 p-1.5">
                      <img
                        src={formData.coverUrl}
                        alt="Cover preview"
                        className="h-28 w-20 rounded-lg object-cover"
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Submit Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="h-12 flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-12 flex-1 rounded-xl"
                disabled={isLoading || !formData.title.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save to Library"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
