import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "@/types";
import {
  authService,
  type OAuthSessionPayload,
} from "@/services/authService";
import {
  clearNeonSessionVerifier,
  getNeonSession,
  hasNeonSessionVerifier,
  persistNeonSession,
} from "@/lib/neonAuthAdapter";
import { ApiError } from "@/services/apiClient";

/**
 * How long to keep retrying `/auth/me` after a Neon session lands before we
 * give up. The backend upsert is normally fast, but a cold start on Render
 * can occasionally push the first request over a second.
 */
const ME_SYNC_MAX_ATTEMPTS = 4;
const ME_SYNC_BACKOFF_MS = [200, 500, 1000, 2000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientSyncError(err: unknown): boolean {
  if (!(err instanceof Error)) return true;
  // Network failures (no status) and 5xx are recoverable. 4xx is the server
  // telling us the token is bad — retrying won't change that.
  if (err instanceof ApiError) {
    return err.status >= 500;
  }
  return true;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  /**
   * @deprecated Google OAuth is now handled by Neon Auth during AuthProvider init.
   * Kept for compatibility with the legacy backend popup flow.
   */
  completeGoogleAuth: (payload: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: OAuthSessionPayload["user"];
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function syncMeWithBackoff(): Promise<User | null> {
      let lastError: unknown = null;
      for (let attempt = 0; attempt < ME_SYNC_MAX_ATTEMPTS; attempt += 1) {
        if (cancelled) return null;
        try {
          return await authService.getCurrentUser();
        } catch (err) {
          lastError = err;
          if (!isTransientSyncError(err)) {
            // 4xx means the token is fundamentally bad — stop trying and
            // surface the failure rather than masking it with a Neon
            // snapshot (whose ``id`` is the upstream ``sub`` and would
            // produce a 404 from ``GET /users/{id}``).
            throw err;
          }
          const delay = ME_SYNC_BACKOFF_MS[attempt] ?? 2000;
          console.warn(
            `[auth] /auth/me transient failure (attempt ${attempt + 1}/${ME_SYNC_MAX_ATTEMPTS}); retrying in ${delay}ms`,
            err,
          );
          await sleep(delay);
        }
      }
      throw lastError;
    }

    async function init() {
      // 1. Hydrate from stored auth (synchronous). The stored user object
      //    is always a local Zist user — ``authService.login/signup`` and
      //    ``getCurrentUser`` only ever persist that shape — so it's safe
      //    to show immediately while we re-validate in the background.
      const { user: storedUser } = authService.getStoredAuth();
      if (storedUser && !cancelled) {
        setUser(storedUser);
      }

      // 2. If we just landed from a Google OAuth redirect, exchange the
      //    session verifier BEFORE we drop isLoading. This prevents
      //    ProtectedRoute from redirecting to /login and stripping the
      //    verifier before it can be consumed.
      if (hasNeonSessionVerifier()) {
        try {
          const snapshot = await getNeonSession();
          if (snapshot && !cancelled) {
            console.info("[auth] neon session bootstrapped", {
              neonUserId: snapshot.user.id,
              email: snapshot.user.email,
              tokenPresent: Boolean(snapshot.token),
            });
            // Stash the Neon token so the very first ``/auth/me`` request
            // carries the right Bearer header. ``getCurrentUser`` will
            // overwrite both the token and the user with the canonical
            // Zist local user once the upsert completes.
            persistNeonSession(snapshot);

            try {
              const me = await syncMeWithBackoff();
              if (!cancelled && me) {
                setUser(me);
              }
            } catch (meError) {
              // /auth/me definitively failed. The Neon snapshot uses the
              // upstream ``sub`` as its ``id``, which would never resolve
              // via ``GET /users/{id}`` on the backend, so we MUST NOT
              // silently adopt it. Instead: drop the session, surface a
              // visible error, and bounce the user back to /login.
              console.error(
                "[auth] /auth/me failed after retries; cannot adopt Neon snapshot as local user",
                meError,
              );
              if (!cancelled) {
                authService.clearStoredSession();
                setUser(null);
              }
            }
          } else if (!snapshot) {
            console.warn(
              "[auth] Neon session verifier present but no session returned",
            );
          }
        } catch (error) {
          console.error("[auth] failed to bootstrap Neon session", error);
        } finally {
          clearNeonSessionVerifier();
        }
      } else if (storedUser) {
        // No Neon verifier, but we have a stored session — silently
        // re-validate it with /auth/me in the background so a stale or
        // revoked token doesn't keep the UI in a broken state.
        try {
          const me = await syncMeWithBackoff();
          if (!cancelled && me) {
            setUser(me);
          }
        } catch (err) {
          // ``getCurrentUser`` already cleared storage on a definitive
          // 401. Treat any failure here as "logged out".
          console.warn("[auth] stored session no longer valid", err);
          if (!cancelled) {
            setUser(null);
          }
        }
      }

      // 3. Only now mark loading as done
      if (!cancelled) {
        setIsLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => {
    const { user } = await authService.login(email, password, rememberMe);
    setUser(user);
  };

  const signup = async (
    email: string,
    password: string,
    displayName: string,
    firstName: string,
    lastName: string,
  ) => {
    const { user } = await authService.signup(
      email,
      password,
      displayName,
      firstName,
      lastName,
    );
    setUser(user);
  };

  const completeGoogleAuth = async (payload: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: OAuthSessionPayload["user"];
  }) => {
    const { user } = await authService.completeGoogleAuth(payload);
    setUser(user);
  };



  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    const updatedUser = await authService.updateProfile(updates);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        completeGoogleAuth,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
