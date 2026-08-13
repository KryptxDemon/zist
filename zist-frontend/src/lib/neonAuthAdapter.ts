import { neonAuth } from "@/lib/neon";
import type { User } from "@/types";

/**
 * Bridge between the Neon Auth client (Better Auth React adapter) and our
 * existing `AuthContext` / localStorage token model.
 *
 * Neon Auth handles Google OAuth end-to-end:
 *   - `startGoogleSignIn({ callbackURL })` triggers a top-level browser
 *     redirect to Google, then back to `callbackURL` with a one-time session
 *     verifier in the URL.
 *   - The verifier is consumed automatically by the React adapter's
 *     `getSession()` hook, so the very first `getNeonSession()` call after the
 *     redirect returns the freshly-issued session and JWT.
 *
 * No Google OAuth secrets are required on the backend.
 */

export interface NeonSocialSignInOptions {
  /** Where Neon should redirect after a successful Google sign-in. */
  callbackURL: string;
  /**
   * Optional redirect after the user explicitly cancels. Neon defaults to the
   * current page when this is omitted.
   */
  errorCallbackURL?: string;
}

const NEON_SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";

/**
 * Storage layout matches what `authService.login` writes so `apiClient`
 * sees the JWT without any code changes.
 */
const TOKEN_STORAGE_KEY = "auth_token";
const USER_STORAGE_KEY = "user";

/**
 * Read the configured Neon Auth URL. Throws loudly if it is missing so the
 * UI doesn't silently fail with a "does nothing" Google button.
 */
function getNeonAuthUrl(): string {
  const url = import.meta.env.VITE_NEON_AUTH_URL?.trim();
  if (!url) {
    throw new Error(
      "VITE_NEON_AUTH_URL is not configured. Set it in Netlify env to the Neon auth endpoint " +
        "(e.g. https://ep-xxx.neonauth.<region>.aws.neon.tech/neondb/auth).",
    );
  }
  return url;
}

export interface NeonSessionSnapshot {
  user: User;
  token: string;
}

/**
 * Map a Neon/Better-Auth user object to our internal `User` shape.
 *
 * Neon returns: `{ id, email, name?, image?, emailVerified, createdAt, updatedAt }`.
 * We store: `{ id, email, displayName, firstName, lastName, avatar, ... }`.
 */
function toLocalUser(neonUser: Record<string, unknown>): User {
  const name = (neonUser.name as string | null | undefined) ?? "";
  const email = (neonUser.email as string | null | undefined) ?? "";
  const split = name.split(" ");
  const firstName = split[0] ?? "";
  const lastName = split.slice(1).join(" ");
  return {
    id: (neonUser.id as string) ?? "",
    email,
    displayName: name || email,
    firstName,
    lastName,
    avatar: (neonUser.image as string | null | undefined) ?? undefined,
    createdAt:
      (neonUser.createdAt as string | null | undefined) ?? new Date().toISOString(),
    emailVerified: Boolean(neonUser.emailVerified),
    preferences: { privacy: "private", theme: "night-cold" },
  };
}

/**
 * Trigger Neon Auth's Google OAuth flow.
 *
 * Better Auth's React adapter normally performs the browser redirect itself
 * after `POST /sign-in/social`, but in some iframe / headless paths it returns
 * a `{ url, redirect: true }` payload without navigating. To stay robust we
 * always inspect the response and force a navigation when one is needed.
 */
export async function startGoogleSignIn(
  options: NeonSocialSignInOptions,
): Promise<void> {
  // Fail loudly up front so misconfiguration surfaces in the UI rather than
  // looking like a dead button.
  getNeonAuthUrl();

  const authClient = neonAuth as unknown as {
    signIn: {
      social: (input: {
        provider: "google";
        callbackURL: string;
        errorCallbackURL?: string;
      }) => Promise<unknown>;
    };
  };

  const result = (await authClient.signIn.social({
    provider: "google",
    callbackURL: options.callbackURL,
    errorCallbackURL: options.errorCallbackURL,
  })) as { url?: string; redirect?: boolean } | null;

  const redirectUrl = result?.url;
  if (redirectUrl && typeof window !== "undefined") {
    // Use replace so the back button doesn't take the user back to the login
    // form mid-redirect.
    window.location.replace(redirectUrl);
  }
}

/**
 * Read the current Neon session (after a redirect or on subsequent loads).
 *
 * Returns `null` if there is no active session. The Neon client already caches
 * the session, so this is safe to call frequently.
 */
export async function getNeonSession(): Promise<NeonSessionSnapshot | null> {
  const authClient = neonAuth as unknown as {
    getSession: () => Promise<{
      data?: { session?: { token?: string | null } | null; user?: Record<string, unknown> | null } | null;
      error?: unknown;
    }>;
  };

  const result = await authClient.getSession();
  const sessionData = result?.data ?? null;
  const user = sessionData?.user ?? null;
  const token = sessionData?.session?.token ?? null;

  if (!user || !token) return null;

  return { user: toLocalUser(user), token };
}

/**
 * Returns `true` when the current URL carries Neon's one-time session verifier,
 * i.e. we just landed from a Google OAuth redirect.
 */
export function hasNeonSessionVerifier(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has(NEON_SESSION_VERIFIER_PARAM);
}

/**
 * Clear the verifier from the URL without reloading the page. Called after a
 * successful bootstrap so refreshes don't re-trigger the exchange.
 */
export function clearNeonSessionVerifier(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(NEON_SESSION_VERIFIER_PARAM)) return;
  url.searchParams.delete(NEON_SESSION_VERIFIER_PARAM);
  window.history.replaceState({}, "", url.href);
}

/**
 * Persist a Neon session snapshot into the same storage shape that
 * `authService.login` writes, so `apiClient` can pick up the JWT
 * transparently (it reads `localStorage["auth_token"]`).
 */
export function persistNeonSession(snapshot: NeonSessionSnapshot): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, snapshot.token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(snapshot.user));
}