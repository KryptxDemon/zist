import type { MediaType } from "@/types";

/**
 * Shared shape for external discovery results (TMDb / OpenLibrary).
 *
 * Ported from the web `MediaResultCard` helper module so the mobile AddMedia
 * screen can reuse the exact same missing-data copy, cover fallbacks and tag
 * de-duplication without depending on any specific flow.
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

export const mediaTypes: { value: MediaType; label: string }[] = [
  { value: "movie", label: "Movie" },
  { value: "tv", label: "TV Show" },
  { value: "book", label: "Book" },
  { value: "documentary", label: "Documentary" },
  { value: "podcast", label: "Podcast" },
  { value: "game", label: "Game" },
];

export const fallbackCovers: Record<MediaType, string> = {
  movie: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
  tv: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80",
  book: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
  documentary: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80",
  podcast: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=600&q=80",
  game: "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?auto=format&fit=crop&w=600&q=80",
};

export function getResultCover(item: Pick<MediaResultItem, "type" | "cover_url">): string {
  return item.cover_url || fallbackCovers[item.type] || fallbackCovers.movie;
}

export function getMediaLabel(type: MediaType): string {
  return mediaTypes.find((item) => item.value === type)?.label || type;
}
