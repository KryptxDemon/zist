import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  MediaPreviewDialog,
  MediaResultCard,
  MediaResultItem,
} from "@/components/feed/MediaResultCard";
import { mediaService } from "@/services/mediaService";
import { mediaSearchService } from "@/services/externalServices";
import { MediaStatus } from "@/types";
import { LibraryBig, Loader2, Search, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Discovery search bar shown in the Feed page header. Searches the external
 * media catalog (TMDb + OpenLibrary) via the same /external/search/media
 * endpoint AddMedia uses, and delegates Preview / Autofill / Add actions back
 * to mediaService so we never duplicate the search pipeline.
 *
 * States:
 *   - initial:    empty input, no panel
 *   - typing:     non-empty input, panel open, no request yet
 *   - loading:    request in flight
 *   - results:    results rendered
 *   - empty:      request returned zero items
 *   - error:      request failed
 *
 * The dropdown closes on click-outside or Escape. Stale requests are cancelled
 * via a request-id counter so out-of-order responses never overwrite fresher
 * data. Items already in the user's library are tagged with an "In library"
 * badge and have their Add button disabled.
 */
export interface MediaDiscoverySearchProps {
  className?: string;
  placeholder?: string;
  defaultStatus?: MediaStatus;
  /**
   * Optional controlled value. When provided, the component renders in
   * controlled mode and `onQueryChange` must also be provided. Useful when
   * the parent wants to read the current query (e.g. to pre-fill an "Add"
   * button label).
   */
  value?: string;
  onQueryChange?: (value: string) => void;
}

interface SavedKey {
  source: string;
  id: string;
}

const matchesSaved = (
  item: MediaResultItem,
  saved: Set<string>,
): boolean => {
  if (!item.external_source || !item.external_id) return false;
  return saved.has(`${item.external_source}::${item.external_id}`);
};

const savedKey = (k: SavedKey) => `${k.source}::${k.id}`;

export function MediaDiscoverySearch({
  className,
  placeholder = "Search movies, books, TV shows\u2026",
  defaultStatus = "planned",
  value,
  onQueryChange,
}: MediaDiscoverySearchProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const isControlled = value !== undefined;
  const [internalQuery, setInternalQuery] = useState("");
  const query = isControlled ? (value as string) : internalQuery;
  const setQuery = (next: string) => {
    if (!isControlled) setInternalQuery(next);
    onQueryChange?.(next);
  };

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moviesTv, setMoviesTv] = useState<MediaResultItem[]>([]);
  const [books, setBooks] = useState<MediaResultItem[]>([]);
  const [activeQuery, setActiveQuery] = useState("");
  const [addingItem, setAddingItem] = useState<MediaResultItem | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaResultItem | null>(null);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  // Load user's library once when the panel first opens so we can mark items
  // already in the library. We re-load when Add succeeds so the badge updates.
  const loadLibrarySnapshot = async () => {
    try {
      const { items } = await mediaService.getAllWithMeta(1, 100);
      const set = new Set<string>();
      for (const m of items) {
        const source = (m as unknown as { externalSource?: string }).externalSource;
        const id = (m as unknown as { externalId?: string }).externalId;
        if (source && id) {
          set.add(savedKey({ source, id }));
        }
      }
      setSavedSet(set);
    } catch (err) {
      // Silent failure — dedup badge is non-essential. The Add button will fail
      // with a backend error if the user actually tries to re-add it.
      console.warn("Failed to load library snapshot for dedup:", err);
    }
  };

  // Debounced search effect — 350ms after the last keystroke, fire the
  // request. Empty / whitespace-only queries clear the panel.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setIsOpen(false);
      setIsLoading(false);
      setError(null);
      setMoviesTv([]);
      setBooks([]);
      setActiveQuery("");
      return;
    }

    setIsOpen(true);
    const currentId = ++requestIdRef.current;
    const handle = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await mediaSearchService.searchMediaGrouped(trimmed);
        if (currentId !== requestIdRef.current) return; // stale
        setActiveQuery(trimmed);
        setMoviesTv(result.moviesTv || []);
        setBooks(result.books || []);
      } catch (err) {
        if (currentId !== requestIdRef.current) return;
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't search right now. Please try again.",
        );
        setMoviesTv([]);
        setBooks([]);
      } finally {
        if (currentId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => window.clearTimeout(handle);
  }, [query]);

  // Reload library snapshot on first open so we have fresh dedup data.
  useEffect(() => {
    if (isOpen && savedSet.size === 0) {
      loadLibrarySnapshot();
    }
    // We intentionally only depend on `isOpen` so the snapshot is loaded once
    // per session and re-loaded only after a successful Add.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Close on click-outside.
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    setError(null);
    setMoviesTv([]);
    setBooks([]);
    setActiveQuery("");
    inputRef.current?.focus();
  };

  const handleAdd = async (item: MediaResultItem) => {
    setAddingItem(item);
    try {
      const media = await mediaService.create({
        title: item.title,
        type: item.type,
        year: item.year ?? undefined,
        creator: item.creator ?? undefined,
        description: item.description ?? undefined,
        coverUrl: item.cover_url ?? undefined,
        status: defaultStatus,
        externalSource: item.external_source ?? undefined,
        externalId: item.external_id ?? undefined,
      });
      toast({
        title: "Added to library",
        description: `${item.title} is now in your library.`,
      });
      // Update dedup set so the badge appears immediately.
      if (item.external_source && item.external_id) {
        setSavedSet((prev) =>
          new Set(prev).add(
            savedKey({ source: item.external_source!, id: item.external_id! }),
          ),
        );
      }
      // Gently close the panel after a successful add so the user sees the
      // toast cleanly, but stay on the page if they want to keep adding.
      // Navigate to the new media detail page.
      navigate(`/app/media/${media.id}`);
    } catch (err) {
      toast({
        title: "Failed to add",
        description:
          err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingItem(null);
    }
  };

  const handleAutofill = (item: MediaResultItem) => {
    // The Feed page doesn't host an AddMedia form, so "Autofill" here means
    // "open the preview dialog with rich details". Users can then choose Add.
    setPreviewItem(item);
  };

  const handlePreview = (item: MediaResultItem) => {
    setPreviewItem(item);
  };

  const totalResults = moviesTv.length + books.length;
  const hasQuery = query.trim().length > 0;

  const panelState = useMemo(() => {
    if (!hasQuery) return "initial";
    if (isLoading) return "loading";
    if (error) return "error";
    if (totalResults === 0) return "empty";
    return "results";
  }, [hasQuery, isLoading, error, totalResults]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => hasQuery && setIsOpen(true)}
          placeholder={placeholder}
          aria-label="Search movies, books, and TV shows"
          className="h-10 rounded-full border-border/60 bg-card/70 pl-9 pr-9 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
        />
        {query ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {isOpen && hasQuery ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-2 max-h-[28rem] overflow-hidden rounded-2xl border border-border/60 bg-popover/95 p-2 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-popover/80"
        >
          {panelState === "loading" ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching for "{query.trim()}"…
            </div>
          ) : null}

          {panelState === "error" ? (
            <div className="flex items-start gap-2 px-3 py-6 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {panelState === "empty" ? (
            <div className="flex flex-col items-center justify-center gap-2 px-3 py-8 text-center text-sm text-muted-foreground">
              <LibraryBig className="h-6 w-6 text-muted-foreground/60" />
              <p>No media found for "{activeQuery || query.trim()}".</p>
              <p className="text-xs text-muted-foreground/80">
                Try a different title, or check spelling.
              </p>
            </div>
          ) : null}

          {panelState === "results" ? (
            <div className="max-h-[26rem] overflow-auto pr-1">
              {moviesTv.length > 0 ? (
                <section className="mb-3">
                  <header className="sticky top-0 z-10 mb-1.5 flex items-center justify-between bg-popover/95 px-1 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span>Movies &amp; TV</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {moviesTv.length}
                    </span>
                  </header>
                  <div className="space-y-2">
                    {moviesTv.slice(0, 8).map((item, idx) => (
                      <MediaResultCard
                        key={`feed-movies-${item.external_source || "ext"}-${item.external_id || item.title}-${idx}`}
                        item={item}
                        isAdding={
                          addingItem?.external_id === item.external_id &&
                          addingItem?.external_source === item.external_source
                        }
                        isAlreadySaved={matchesSaved(item, savedSet)}
                        onPreview={handlePreview}
                        onAutofill={handleAutofill}
                        onAdd={handleAdd}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {books.length > 0 ? (
                <section>
                  <header className="sticky top-0 z-10 mb-1.5 flex items-center justify-between bg-popover/95 px-1 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span>Books</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {books.length}
                    </span>
                  </header>
                  <div className="space-y-2">
                    {books.slice(0, 8).map((item, idx) => (
                      <MediaResultCard
                        key={`feed-books-${item.external_source || "ext"}-${item.external_id || item.title}-${idx}`}
                        item={item}
                        isBook
                        isAdding={
                          addingItem?.external_id === item.external_id &&
                          addingItem?.external_source === item.external_source
                        }
                        isAlreadySaved={matchesSaved(item, savedSet)}
                        onPreview={handlePreview}
                        onAutofill={handleAutofill}
                        onAdd={handleAdd}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {previewItem ? (
        <MediaPreviewDialog
          item={previewItem}
          isAdding={
            addingItem?.external_id === previewItem.external_id &&
            addingItem?.external_source === previewItem.external_source
          }
          isAlreadySaved={matchesSaved(previewItem, savedSet)}
          onClose={() => setPreviewItem(null)}
          onAutofill={handleAutofill}
          onAdd={handleAdd}
        />
      ) : null}
    </div>
  );
}
