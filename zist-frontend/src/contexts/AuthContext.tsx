import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "@/types";
import { authService, type OAuthSessionPayload } from "@/services/authService";
import {
  clearNeonSessionVerifier,
  getNeonSession,
  hasNeonSessionVerifier,
  persistNeonSession,
} from "@/lib/neonAuthAdapter";

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

    async function init() {
      // 1. Hydrate from stored auth (synchronous)
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
              userId: snapshot.user.id,
              email: snapshot.user.email,
              tokenPresent: Boolean(snapshot.token),
            });
            persistNeonSession(snapshot);
            // Force a backend upsert so the canonical Zist profile is
            // available before ProtectedRoute checks it. This guarantees
            // the Neon user id is mapped (or migrated by email) into the
            // ``users`` table on first sign-in. ``getCurrentUser`` maps
            // the backend snake_case payload to the frontend User shape
            // and persists it to localStorage so reloads stay in sync.
            try {
              const me = await authService.getCurrentUser();
              if (!cancelled) {
                setUser(me);
              }
            } catch (meError) {
              console.error(
                "[auth] /auth/me sync failed; falling back to Neon snapshot",
                meError,
              );
              if (!cancelled) {
                setUser(snapshot.user);
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
