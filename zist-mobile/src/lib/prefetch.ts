import { Image } from "react-native";

/**
 * Image prefetch helper for mobile (React Native).
 * Downloads and caches images in the native disk/memory cache so
 * movie posters and book covers load instantly when rendered.
 */
export function prefetchImages(urls: (string | null | undefined)[]) {
  const unique = new Set(
    urls.filter((u): u is string => typeof u === "string" && u.startsWith("http")),
  );
  unique.forEach((url) => {
    Image.prefetch(url).catch(() => {});
  });
}
