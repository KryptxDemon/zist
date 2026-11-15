/**
 * Image prefetch helper for browser environments.
 * Warms the browser's HTTP image cache so cards and posters render without flicker.
 */
export function prefetchImages(urls: (string | null | undefined)[]) {
  if (typeof window === "undefined") return;
  const unique = new Set(
    urls.filter((u): u is string => typeof u === "string" && u.startsWith("http")),
  );
  unique.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}
