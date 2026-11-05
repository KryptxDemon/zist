import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { apiClient } from "@/services/apiClient";
import { authService } from "@/services/authService";
import { localStorage, sessionStorage } from "@/lib/webStorage";
import type { User } from "@/types";

export type GoogleSource = "login" | "signup";

/**
 * Native Google sign-in.
 *
 * The backend's `/auth/google/start` endpoint accepts an optional
 * `redirect_to` that must use the app's deep-link scheme; when present the
 * OAuth callback redirects back to the app with the freshly minted tokens
 * instead of rendering the web popup that the browser build uses.
 *
 * Returns the resolved Zist user, or `null` when the user dismissed the
 * browser / cancelled.
 */
export async function signInWithGoogle(source: GoogleSource): Promise<User | null> {
  const redirectUrl = Linking.createURL("auth");

  const { auth_url: authUrl } = await apiClient.get<{ auth_url: string }>(
    "/auth/google/start",
    { params: { source, redirect_to: redirectUrl } },
  );

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl, {
    showInRecents: true,
  });

  if (result.type !== "success" || !result.url) return null;

  const parsed = Linking.parse(result.url);
  const params = parsed.queryParams ?? {};
  const accessToken = typeof params.access_token === "string" ? params.access_token : null;
  if (!accessToken) return null;

  // Seed the token so the very first `/auth/me` carries the right Bearer
  // header, then let `authService` resolve and persist the canonical user.
  localStorage.setItem("auth_token", accessToken);
  sessionStorage.removeItem("auth_token");

  return authService.getCurrentUser();
}
