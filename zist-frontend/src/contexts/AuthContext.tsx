import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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
   * @deprecated Google OAuth is now handled by Neon Auth (see `bootstrapNeonSession`).
   * Kept for compatibility with the legacy backend popup flow.
   */
  completeGoogleAuth: (payload: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: OAuthSessionPayload["user"];
  }) => Promise<void>;
  /**
   * Detect a Neon Auth redirect (Google OAuth callback) and hydrate the
   * React auth state with the resulting JWT. Safe to call on every mount.
   */
  bootstrapNeonSession: () => Promise<User | null>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth
    const { user: storedUser } = authService.getStoredAuth();
    if (storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);
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

  const bootstrapNeonSession = useCallback(async () => {
    if (!hasNeonSessionVerifier()) return null;
    try {
      const snapshot = await getNeonSession();
      if (!snapshot) {
        console.warn("[auth] Neon session verifier present but no session returned");
        clearNeonSessionVerifier();
        return null;
      }
      console.info("[auth] neon session bootstrapped", {
        userId: snapshot.user.id,
        email: snapshot.user.email,
        tokenPresent: Boolean(snapshot.token),
      });
      persistNeonSession(snapshot);
      setUser(snapshot.user);
      clearNeonSessionVerifier();
      return snapshot.user;
    } catch (error) {
      console.error("[auth] failed to bootstrap Neon session", error);
      clearNeonSessionVerifier();
      return null;
    }
  }, []);

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
        bootstrapNeonSession,
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
