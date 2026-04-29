import { User } from "@/types";
import { storage, STORAGE_KEYS } from "./storage";
import { apiClient } from "./apiClient";

interface TokenData {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface AuthResponse {
  user: User;
  tokens: TokenData;
}

interface TokenPayload {
  email: string;
  password: string;
}

interface SignupPayload {
  email: string;
  password: string;
  display_name: string;
}

type ApiUser = {
  id: string;
  email: string;
  displayName?: string;
  display_name?: string;
  avatar?: string;
  avatarUrl?: string;
  avatar_url?: string;
  bio?: string | null;
  createdAt?: string;
  created_at?: string;
};

const mapApiUser = (user: ApiUser, currentUser?: User | null): User => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName ?? user.display_name ?? currentUser?.displayName ?? "User",
  avatar: user.avatar ?? user.avatarUrl ?? user.avatar_url ?? currentUser?.avatar,
  bio: user.bio ?? currentUser?.bio,
  createdAt: user.createdAt ?? user.created_at ?? currentUser?.createdAt ?? new Date().toISOString(),
  preferences: currentUser?.preferences ?? {
    privacy: "public",
    theme: "night-cold",
  },
});

export const authService = {
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

      if (rememberMe) {
        localStorage.setItem("auth_token", token);
        localStorage.setItem("user", JSON.stringify(response.user));
        sessionStorage.removeItem("auth_token");
        sessionStorage.removeItem("user");
      } else {
        sessionStorage.setItem("auth_token", token);
        sessionStorage.setItem("user", JSON.stringify(response.user));
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
      }

      return { user: mapApiUser(response.user), token };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Login failed");
    }
  },

  async signup(
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ user: User; token: string }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await apiClient.post<AuthResponse>("/auth/signup", {
        email: normalizedEmail,
        password,
        display_name: displayName,
      });

      const token = response.tokens.access_token;

      localStorage.setItem("auth_token", token);
      localStorage.setItem("user", JSON.stringify(response.user));
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("user");

      return { user: mapApiUser(response.user), token };
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
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("user");
    }
  },

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
      const storedUser = this.getStoredAuth().user;
      if (!storedUser) {
        throw new Error("You must be logged in to update profile");
      }

      await apiClient.patch(`/users/${storedUser.id}`, {
        display_name: updates.displayName,
        bio: updates.bio,
        avatar_url: updates.avatar,
      });

      const response = await apiClient.get<ApiUser>("/auth/me");
      const mapped = mapApiUser(response, {
        ...storedUser,
        ...updates,
      });

      if (localStorage.getItem("auth_token")) {
        localStorage.setItem("user", JSON.stringify(mapped));
      } else {
        sessionStorage.setItem("user", JSON.stringify(mapped));
      }
      return mapped;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update profile",
      );
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      const current = this.getStoredAuth().user;
      const user = await apiClient.get<ApiUser>("/auth/me");
      const mapped = mapApiUser(user, current);
      localStorage.setItem("user", JSON.stringify(mapped));
      return mapped;
    } catch (error) {
      // If fetching current user fails, clear stored auth
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch current user",
      );
    }
  },
};
