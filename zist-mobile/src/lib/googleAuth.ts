import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { apiClient } from "@/services/apiClient";
import { authService } from "@/services/authService";
import { localStorage, sessionStorage } from "@/lib/webStorage";
import type { User } from "@/types";

WebBrowser.maybeCompleteAuthSession();

export type GoogleSource = "login" | "signup";

let inFlightToken: string | null = null;
let inFlightPromise: Promise<User> | null = null;

/**
 * Exchange a freshly minted OAuth access token for the canonical User object
 * and persist both to storage.
 *
 * Deduplicated per token so both `WebBrowser.openAuthSessionAsync` and the
 * `/auth` deep-link route (`app/auth.tsx`) can safely handle the same callback
 * without firing duplicate `/auth/me` requests.
 */
export async function resolveUserFromAccessToken(accessToken: string): Promise<User> {
  if (inFlightToken === accessToken && inFlightPromise) {
    return inFlightPromise;
  }

  // Seed the token so `/auth/me` carries the right Bearer header, then let
  // `authService` resolve and persist the canonical user.
  localStorage.setItem("auth_token", accessToken);
  sessionStorage.removeItem("auth_token");

  inFlightToken = accessToken;
  inFlightPromise = authService.getCurrentUser().finally(() => {
    if (inFlightToken === accessToken) {
      inFlightToken = null;
      inFlightPromise = null;
    }
  });

  return inFlightPromise;
}

/**
 * Native Google sign-in.
 *
 * The backend's `/auth/google/start` endpoint accepts an optional
 * `redirect_to` that must use the app's deep-link scheme; when present the
 * OAuth callback redirects back to `zist://auth?access_token=...` (handled
 * both here and by `app/auth.tsx` when Android delivers the deep link directly
 * to Expo Router).
 *
 * Returns the access token, or `null` when the browser was dismissed or the
 * callback is being handled via the `/auth` deep-link route.
 */
export async function signInWithGoogle(source: GoogleSource): Promise<string | null> {
  const redirectUrl = Linking.createURL("auth");

  const { auth_url: authUrl } = await apiClient.get<{ auth_url: string }>(
    "/auth/google/start",
    { params: { source, redirect_to: redirectUrl } },
  );

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

  if (result.type !== "success" || !result.url) return null;

  const parsed = Linking.parse(result.url);
  const params = parsed.queryParams ?? {};
  const accessToken = typeof params.access_token === "string" ? params.access_token : null;
  return accessToken;
}
