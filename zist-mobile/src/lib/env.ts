/**
 * Runtime configuration for the ZIST mobile app.
 *
 * Expo exposes every environment variable prefixed with `EXPO_PUBLIC_` to the
 * JS bundle, so we read from those first and fall back to the values that the
 * web front-end used to compile in with Vite (`import.meta.env`).
 */

import Constants from "expo-constants";
import { Platform } from "react-native";

type EnvBag = Record<string, string | undefined>;

const env: EnvBag =
  (typeof process !== "undefined" && (process.env as EnvBag)) || {};

function pick(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

/**
 * `expo.extra.apiUrl` in `app.json`.
 *
 * Builds can be pointed at a backend without exporting an env var at bundle
 * time; `EXPO_PUBLIC_API_URL` still wins when both are present.
 */
const extraApiUrl = (() => {
  const extra = Constants.expoConfig?.extra as { apiUrl?: unknown } | undefined;
  return typeof extra?.apiUrl === "string" && extra.apiUrl.trim().length > 0
    ? extra.apiUrl.trim()
    : undefined;
})();

/**
 * Base URL of the FastAPI backend, including the `/api/v1` prefix.
 *
 * Override with `EXPO_PUBLIC_API_URL` (e.g. `http://10.0.2.2:8000/api/v1` for
 * the Android emulator or `https://api.example.com/api/v1` in production).
 */
export const API_URL: string =
  pick("EXPO_PUBLIC_API_URL", "VITE_API_URL") ??
  extraApiUrl ??
  "http://localhost:8000/api/v1";

// `localhost` is meaningful on the web build only: on a phone it resolves to
// the phone itself, and on the Android emulator it must be `10.0.2.2`. Say so
// loudly in development instead of letting every request fail with an opaque
// "Network request failed" *after* the user has typed their password.
if (
  __DEV__ &&
  Platform.OS !== "web" &&
  /\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(API_URL)
) {
  console.warn(
    `[env] API_URL is ${API_URL}, but "${Platform.OS}" cannot reach your computer at localhost. ` +
      "Use your machine's LAN IP (e.g. http://192.168.1.10:8000/api/v1) or 10.0.2.2 for the Android emulator.",
  );
}

/** Public TMDb key used by the dashboard's "trending" rail. */
export const TMDB_API_KEY: string | undefined = pick(
  "EXPO_PUBLIC_TMDB_API_KEY",
  "VITE_TMDB_API_KEY",
);

/** Deep-link scheme registered in app.json — used for OAuth callbacks. */
export const APP_SCHEME = "zist";

export const ENV = {
  API_URL,
  TMDB_API_KEY,
  APP_SCHEME,
} as const;
