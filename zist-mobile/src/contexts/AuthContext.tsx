import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { User } from "@/types";
import { authService } from "@/services/authService";
import { ApiError, onUnauthorized } from "@/services/apiClient";
import { consumeSessionNotice, setSessionNotice } from "@/lib/sessionNotice";

/**
 * How long to keep retrying `/auth/me` on a stored session before giving up.
 * Mirrors the web behaviour so a cold backend start doesn't log the user out.
 */
const ME_SYNC_MAX_ATTEMPTS = 4;
const ME_SYNC_BACKOFF_MS = [200, 500, 1000, 2000];

/** Description shown on the signed-out home when a session ends on its own. */
const SESSION_EXPIRED_NOTICE = "Please sign in again to continue.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientSyncError(err: unknown): boolean {
  if (!(err instanceof Error)) return true;
  if (err instanceof ApiError) return err.status >= 500;
  return true;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  /** Adopt a session produced by a native OAuth flow (Google). */
  completeOAuth: (payload: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: Parameters<typeof authService.completeGoogleAuth>[0]["user"];
  }) => Promise<void>;
  /** Re-run the bootstrap (used after a manual session change). */
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Increments whenever the session changes identity: login, signup, OAuth,
   * logout, or a forced sign-out.
   *
   * `bootstrap()` awaits `/auth/me` (with retries) in the background. If the
   * user signs in while that request is in flight, its — possibly 401 —
   * answer belongs to the *old* session and must never overwrite the new one.
   * Comparing this counter before applying any async result makes stale
   * bootstrap work inert.
   */
  const sessionEpoch = useRef(0);

  const syncMeWithBackoff = useCallback(async (isCancelled: () => boolean): Promise<User | null> => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < ME_SYNC_MAX_ATTEMPTS; attempt += 1) {
      if (isCancelled()) return null;
      try {
        return await authService.getCurrentUser();
      } catch (err) {
        lastError = err;
        if (!isTransientSyncError(err)) throw err;
        const delay = ME_SYNC_BACKOFF_MS[attempt] ?? 2000;
        console.warn(
          `[auth] /auth/me transient failure (attempt ${attempt + 1}/${ME_SYNC_MAX_ATTEMPTS}); retrying in ${delay}ms`,
          err,
        );
        await sleep(delay);
      }
    }
    throw lastError;
  }, []);

  /**
   * Forget a session the backend has refused, and record why so the signed-out
   * home can explain itself instead of silently dumping the user there.
   */
  const endSession = useCallback((reason: string) => {
    sessionEpoch.current += 1;
    authService.clearStoredSession();
    setSessionNotice(reason);
    setUser(null);
  }, []);

  const bootstrap = useCallback(
    async (isCancelled: () => boolean) => {
      // A token past its `exp` cannot be refreshed (the backend has no
      // `/auth/refresh`), so treat it as a deliberate sign-out and say why.
      if (authService.isStoredSessionExpired()) {
        if (!isCancelled()) endSession(SESSION_EXPIRED_NOTICE);
        return;
      }

      // Everything below describes *this* stored session. If the epoch moves
      // on (the user signs in or out) while `/auth/me` is in flight, the
      // result is stale and must be discarded rather than applied.
      const epoch = sessionEpoch.current;
      const isStale = () => isCancelled() || sessionEpoch.current !== epoch;

      const { user: storedUser } = authService.getStoredAuth();
      if (storedUser && !isStale()) setUser(storedUser);

      if (storedUser) {
        try {
          const me = await syncMeWithBackoff(isStale);
          if (!isStale() && me) setUser(me);
        } catch (err) {
          if (isStale()) return;
          console.warn("[auth] stored session no longer valid", err);
          // A definitive 401 means the token is dead, so drop the stored
          // session instead of retrying it on every launch. Transient failures
          // (network, 5xx) deliberately keep the session.
          if (err instanceof ApiError && err.status === 401) {
            authService.clearStoredSession();
          }
          setUser(null);
        }
      }
    },
    [endSession, syncMeWithBackoff],
  );

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    (async () => {
      try {
        await bootstrap(isCancelled);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrap]);

  // The backend refusing our bearer token means the session is over — it cannot
  // be renewed, so sign out once, cleanly, instead of letting every screen in
  // the app fail with "Not authenticated".
  useEffect(
    () =>
      onUnauthorized(() => {
        console.warn("[auth] backend refused the stored token — signing out");
        endSession(SESSION_EXPIRED_NOTICE);
      }),
    [endSession],
  );

  // Expo Go keeps the JS runtime alive for hours, so a 60-minute token often
  // dies while the app sits in the background. Re-check on the way back in
  // rather than waiting for the next screen to fail (and without pinging
  // `/auth/me`, which would sign the user out over a transient network error).
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (authService.isStoredSessionExpired()) {
        endSession(SESSION_EXPIRED_NOTICE);
      }
    });
    return () => subscription.remove();
  }, [endSession]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    const { user: next } = await authService.login(email, password, rememberMe);
    // Claim the session slot *before* touching React state: any bootstrap
    // request still in flight now belongs to the previous epoch.
    sessionEpoch.current += 1;
    setUser(next);
  }, []);

  const signup = useCallback(
    async (email: string, password: string, displayName: string, firstName: string, lastName: string) => {
      const { user: next } = await authService.signup(email, password, displayName, firstName, lastName);
      sessionEpoch.current += 1;
      setUser(next);
    },
    [],
  );

  const completeOAuth = useCallback<AuthContextType["completeOAuth"]>(async (payload) => {
    const { user: next } = await authService.completeGoogleAuth(payload);
    sessionEpoch.current += 1;
    setUser(next);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    sessionEpoch.current += 1;
    // A voluntary sign-out needs no "your session ended" explanation.
    consumeSessionNotice();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const updatedUser = await authService.updateProfile(updates);
    setUser(updatedUser);
  }, []);

  const reload = useCallback(async () => {
    await bootstrap(() => false);
  }, [bootstrap]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      signup,
      logout,
      updateProfile,
      completeOAuth,
      reload,
    }),
    [user, isLoading, login, signup, logout, updateProfile, completeOAuth, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
