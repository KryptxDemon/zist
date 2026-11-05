import type { MediaItem, MediaType } from "@/types";
import { TMDB_API_KEY } from "@/lib/env";

/**
 * Type-tinted placeholder artwork, ported verbatim from the web Dashboard's
 * `TYPE_FALLBACKS`. Used whenever a media item has no cover of its own and no
 * external provider can supply one.
 */
export const TYPE_FALLBACKS: Record<MediaType, string> = {
  movie:
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
  tv: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80",
  book: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
  documentary:
    "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=900&q=80",
  podcast:
    "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=900&q=80",
  game: "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?auto=format&fit=crop&w=900&q=80",
};

/** Safe fallback for an unknown media type. */
export function fallbackCover(type: MediaType): string {
  return TYPE_FALLBACKS[type] ?? TYPE_FALLBACKS.movie;
}

/** OpenLibrary cover lookup used for books (mirrors the web helper). */
function openLibraryCover(title: string): string {
  return `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-L.jpg?default=false`;
}

/**
 * TMDb poster lookup. Returns `null` when no key is configured (the section
 * then hides gracefully rather than crashing) or when the type has no poster.
 */
async function tmdbPoster(title: string, type: MediaType): Promise<string | null> {
  if (!TMDB_API_KEY || (type !== "movie" && type !== "tv" && type !== "documentary")) {
    return null;
  }

  const endpoint = type === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${encodeURIComponent(
    TMDB_API_KEY,
  )}&query=${encodeURIComponent(title)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{ poster_path?: string }>;
    };
    const path = data?.results?.[0]?.poster_path;
    return path ? `https://image.tmdb.org/t/p/w500${path}` : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the best available cover for a media item: the user's own artwork
 * first, then OpenLibrary (books), then TMDb, then the type fallback.
 */
export async function resolveCover(item: MediaItem): Promise<string> {
  if (item.coverUrl?.trim()) return item.coverUrl;

  if (item.type === "book") {
    return openLibraryCover(item.title);
  }

  const tmdb = await tmdbPoster(item.title, item.type);
  if (tmdb) return tmdb;

  return fallbackCover(item.type);
}
