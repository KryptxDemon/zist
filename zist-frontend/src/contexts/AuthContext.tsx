import {
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
   * Finish a Google sign-in. Called by useGoogleAuth once the popup posts the
   * backend's token payload back to this window.
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
      // 1. Hydrate from stored auth synchronously so the UI paints instantly.
      //    The stored object is always a local Zist user, so it is safe to
      //    show while we re-validate in the background.
      const { user: storedUser, token } = authService.getStoredAuth();
      if (storedUser && !cancelled) {
        setUser(storedUser);
      }

      // 2. Re-validate against /auth/me so a stale or revoked token doesn't
      //    leave the UI in a broken half-authenticated state. Transient
      //    failures retry with backoff; a definitive 401 clears the session
      //    (getCurrentUser already wipes storage in that case).
      if (token) {
        try {
          const me = await syncMeWithBackoff();
          if (!cancelled && me) {
            setUser(me);
          }
        } catch (err) {
          console.warn("[auth] stored session no longer valid", err);
          if (!cancelled) {
            setUser(null);
          }
        }
      }

      // 3. Only now mark loading as done.
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
