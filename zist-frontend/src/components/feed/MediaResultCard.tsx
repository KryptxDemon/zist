import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MediaType } from "@/types";
import { Check, Loader2, Pencil, Plus, Star } from "lucide-react";

/**
 * Shared media-result UI used by both the AddMedia page and the Feed
 * discovery search bar. Callers provide their own `onPreview`, `onAutofill`,
 * and `onAdd` callbacks so the card is decoupled from any specific flow.
 *
 * Helper exports (MISSING_*, getMissingCreator, getResultTags, fallbackCovers,
 * getResultCover, getMediaLabel) are also re-exported so callers can reuse the
 * same missing-data copy and cover fallback logic in their own dialogs.
 */

export interface MediaResultItem {
  external_id?: string;
  external_source?: string;
  title: string;
  type: MediaType;
  year?: number | null;
  creator?: string | null;
  description?: string | null;
  cover_url?: string | null;
  genres?: string[] | null;
  subjects?: string[] | null;
  rating?: number | null;
  work_id?: string | null;
  edition_keys?: string[] | null;
}

export const MISSING_CREATOR = "Creator not listed";
export const MISSING_AUTHOR = "Author not listed";
export const MISSING_DESCRIPTION =
  "No description available for this title yet. You can add your own notes after saving.";

export function getMissingCreator(isBook: boolean): string {
  return isBook ? MISSING_AUTHOR : MISSING_CREATOR;
}

export function getResultTags(item: MediaResultItem): string[] {
  const tags: string[] = [];
  if (Array.isArray(item.genres)) {
    tags.push(...item.genres.filter((g) => typeof g === "string" && g.trim()));
  }
  if (Array.isArray(item.subjects)) {
    tags.push(...item.subjects.filter((s) => typeof s === "string" && s.trim()));
  }
  return Array.from(new Set(tags)).slice(0, 8);
}

const mediaTypes: { value: MediaType; label: string }[] = [
  { value: "movie", label: "Movie" },
  { value: "tv", label: "TV Show" },
  { value: "book", label: "Book" },
  { value: "documentary", label: "Documentary" },
  { value: "podcast", label: "Podcast" },
  { value: "game", label: "Game" },
];

export const fallbackCovers: Record<MediaType, string> = {
  movie:
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
  tv: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80",
  book: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
  documentary:
    "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80",
  podcast:
    "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=600&q=80",
  game: "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?auto=format&fit=crop&w=600&q=80",
};

export function getResultCover(
  item: Pick<MediaResultItem, "type" | "cover_url">,
): string {
  return item.cover_url || fallbackCovers[item.type] || fallbackCovers.movie;
}

export function getMediaLabel(type: MediaType): string {
  return mediaTypes.find((item) => item.value === type)?.label || type;
}

export interface MediaResultCardProps {
  item: MediaResultItem;
  isBook?: boolean;
  isAdding?: boolean;
  isAlreadySaved?: boolean;
  onPreview: (item: MediaResultItem) => void;
  onAutofill: (item: MediaResultItem) => void;
  onAdd: (item: MediaResultItem) => void;
}

export function MediaResultCard({
  item,
  isBook = false,
  isAdding = false,
  isAlreadySaved = false,
  onPreview,
  onAutofill,
  onAdd,
}: MediaResultCardProps) {
  const cover = getResultCover(item);
  const tags = getResultTags(item);
  return (
    <article className="group flex gap-3.5 rounded-2xl border border-border/60 bg-card/85 p-3 shadow-sm transition-all hover:border-primary/35 hover:bg-card">
      <button
        type="button"
        onClick={() => onPreview(item)}
        className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Preview ${item.title}`}
      >
        <img
          src={cover}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/95">
          {getMediaLabel(item.type)}
        </div>
      </button>

      <div className="min-w-0 flex-1 flex flex-col justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPreview(item)}
              className="truncate text-left text-base font-semibold text-foreground hover:text-primary transition-colors"
            >
              {item.title}
            </button>
            {item.year ? (
              <span className="rounded-full bg-accent/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {item.year}
              </span>
            ) : null}
            {isAlreadySaved ? (
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                In library
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {item.creator || getMissingCreator(isBook)}
          </p>
          {item.description ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/90">
              {item.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          {tags.length > 0 ? (
            <div className="hidden sm:flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-accent/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAutofill(item)}
              className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onAdd(item)}
              disabled={isAdding || isAlreadySaved}
              className="h-8 gap-1.5 px-3 text-xs"
            >
              {isAdding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isAlreadySaved ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {isAlreadySaved ? "Saved" : "Add"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export interface MediaPreviewDialogProps {
  item: MediaResultItem;
  isAdding?: boolean;
  isAlreadySaved?: boolean;
  onClose: () => void;
  onAutofill: (item: MediaResultItem) => void;
  onAdd: (item: MediaResultItem) => void;
}

export function MediaPreviewDialog({
  item,
  isAdding = false,
  isAlreadySaved = false,
  onClose,
  onAutofill,
  onAdd,
}: MediaPreviewDialogProps) {
  const isBook = item.type === "book";
  const cover = getResultCover(item);
  const tags = getResultTags(item);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {item.title}
          </DialogTitle>
          <DialogDescription>
            {getMediaLabel(item.type)}
            {item.year ? ` • ${item.year}` : ""}
            {item.creator ? ` • ${item.creator}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted">
            <img
              src={cover}
              alt={item.title}
              className="aspect-[2/3] w-full object-cover"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
                {getMediaLabel(item.type)}
              </span>
              {item.year ? (
                <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                  {item.year}
                </span>
              ) : null}
              {typeof item.rating === "number" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 text-amber-400" />
                  {item.rating.toFixed(1)}
                </span>
              ) : null}
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {isBook ? "Author" : "Creator"}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {item.creator || getMissingCreator(isBook)}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {item.description || MISSING_DESCRIPTION}
              </p>
            </div>

            {tags.length > 0 ? (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Tags
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/60 bg-background/70 px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onAutofill(item);
              onClose();
            }}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Edit details
          </Button>
          <Button
            type="button"
            onClick={async () => {
              await onAdd(item);
              onClose();
            }}
            disabled={isAdding || isAlreadySaved}
            className="gap-2"
          >
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {isAlreadySaved ? "Already in library" : "Add to Library"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
