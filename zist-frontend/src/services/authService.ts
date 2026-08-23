import { User } from "@/types";
import { ApiError, apiClient } from "./apiClient";

interface TokenData {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface BackendAuthUser {
  id: string;
  email: string;
  display_name: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  x_url?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  youtube_url?: string | null;
  is_active: boolean;
  created_at: string;
  email_verified?: boolean;
}

interface AuthResponse {
  user: BackendAuthUser;
  tokens: TokenData;
}

interface OAuthSessionPayload {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: BackendAuthUser;
}

interface DisplayNameAvailabilityResponse {
  display_name: string;
  available: boolean;
  suggestions: string[];
}

function mapBackendUser(user: BackendAuthUser): User {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    firstName: user.first_name ?? undefined,
    lastName: user.last_name ?? undefined,
    avatar: user.avatar_url ?? undefined,
    bio: user.bio ?? undefined,
    websiteUrl: user.website_url ?? undefined,
    instagramUrl: user.instagram_url ?? undefined,
    xUrl: user.x_url ?? undefined,
    githubUrl: user.github_url ?? undefined,
    linkedinUrl: user.linkedin_url ?? undefined,
    youtubeUrl: user.youtube_url ?? undefined,
    createdAt: user.created_at,
    emailVerified: user.email_verified ?? false,
    preferences: {
      privacy: "public",
      theme: "night-cold",
    },
  };
}

function persistSession(user: User, token: string, rememberMe: boolean): void {
  if (rememberMe) {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("user", JSON.stringify(user));
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("user");
  } else {
    sessionStorage.setItem("auth_token", token);
    sessionStorage.setItem("user", JSON.stringify(user));
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  }
}

/**
 * Wipe the persisted session from both storage tiers. Called by the auth
 * provider when it determines the session is no longer trustworthy (e.g.
 * /auth/me returns 401 after a Neon verifier exchange). NOT called on
 * transient errors — those retry instead so a brief network blip doesn't
 * log the user out.
 */
function clearStoredSession(): void {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("auth_token");
  sessionStorage.removeItem("user");
}

export const authService = {
  getBackendOrigin(): string {
    const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;
    const defaultBase = configuredApiUrl?.trim() || "/api/v1";
    if (defaultBase.startsWith("http")) {
      return new URL(defaultBase).origin;
    }
    return window.location.origin;
  },

  async startGoogleAuth(source: "login" | "signup"): Promise<string> {
    const response = await apiClient.get<{ auth_url: string }>(
      "/auth/google/start",
      {
        params: { source },
      },
    );
    return response.auth_url;
  },

  async completeGoogleAuth(
    payload: OAuthSessionPayload,
  ): Promise<{ user: User; token: string }> {
    const user = mapBackendUser(payload.user);
    persistSession(user, payload.access_token, true);
    return { user, token: payload.access_token };
  },

  async checkDisplayName(
    displayName: string,
  ): Promise<DisplayNameAvailabilityResponse> {
    return apiClient.get<DisplayNameAvailabilityResponse>(
      "/auth/check-display-name",
      {
        params: { display_name: displayName },
      },
    );
  },

  async login(
    email: string,
    password: string,
    rememberMe: boolean,
  ): Promise<{ user: User; token: string }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await apiClient.post<AuthResponse>("/auth/login", {
        email: normalizedEmail,
        password,
      });

      const token = response.tokens.access_token;
      const user = mapBackendUser(response.user);

      persistSession(user, token, rememberMe);

      return { user, token };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Login failed");
    }
  },

  async signup(
    email: string,
    password: string,
    displayName: string,
    firstName: string,
    lastName: string,
  ): Promise<{ user: User; token: string }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await apiClient.post<AuthResponse>("/auth/signup", {
        email: normalizedEmail,
        password,
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
      });

      const token = response.tokens.access_token;
      const user = mapBackendUser(response.user);

      persistSession(user, token, true);

      return { user, token };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Signup failed");
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.warn("Logout request failed, clearing local data anyway", error);
    } finally {
      clearStoredSession();
    }
  },

  clearStoredSession,

  getStoredAuth(): { user: User | null; token: string | null } {
    const userStr =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    const token =
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token");

    return {
      user: userStr ? JSON.parse(userStr) : null,
      token,
    };
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const storedUser = authService.getStoredAuth().user;
      if (!storedUser?.id) {
        throw new Error("You must be signed in to update your profile");
      }

      const response = await apiClient.patch<{
        message: string;
        user: BackendAuthUser;
      }>(`/users/${storedUser.id}`, {
        display_name: updates.displayName,
        first_name: updates.firstName,
        last_name: updates.lastName,
        avatar_url: updates.avatar,
        bio: updates.bio,
        website_url: updates.websiteUrl,
        instagram_url: updates.instagramUrl,
        x_url: updates.xUrl,
        github_url: updates.githubUrl,
        linkedin_url: updates.linkedinUrl,
        youtube_url: updates.youtubeUrl,
      });
      const user = mapBackendUser(response.user);

      if (localStorage.getItem("auth_token")) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        sessionStorage.setItem("user", JSON.stringify(user));
      }

      return user;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update profile",
      );
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      const user = mapBackendUser(
        await apiClient.get<BackendAuthUser>("/auth/me"),
      );
      // Persist under the same storage tier that already holds the token.
      if (localStorage.getItem("auth_token")) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        sessionStorage.setItem("user", JSON.stringify(user));
      }
      return user;
    } catch (error) {
      // Only treat a definitive 401 as "session is dead". Transient failures
      // (network errors, 5xx) bubble up so the caller can retry; we must NOT
      // wipe storage on those, otherwise a flaky Render cold start would
      // log the user out mid-bootstrap.
      if (error instanceof ApiError && error.status === 401) {
        clearStoredSession();
      }
      throw error instanceof Error
        ? error
        : new Error("Failed to fetch current user");
    }
  },
};

export type { OAuthSessionPayload, DisplayNameAvailabilityResponse };
