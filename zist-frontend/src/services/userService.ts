import { User, UserProfile, UserRef } from "@/types";
import { apiClient } from "./apiClient";

interface BackendUserProfile {
  id: string;
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
  followers_count: number;
  following_count: number;
  media_count: number;
  shared_posts_count?: number;
  total_upvotes?: number;
  is_following?: boolean;
}

interface BackendUserRef {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

interface BackendUserList {
  items: BackendUserProfile[];
  total: number;
}

function mapUserRef(user: BackendUserRef): UserRef {
  return {
    id: user.id,
    displayName: user.display_name,
    avatar: user.avatar_url ?? undefined,
  };
}

function mapUserProfile(profile: BackendUserProfile): UserProfile {
  return {
    id: profile.id,
    email: "",
    displayName: profile.display_name,
    firstName: profile.first_name ?? undefined,
    lastName: profile.last_name ?? undefined,
    avatar: profile.avatar_url ?? undefined,
    bio: profile.bio ?? undefined,
    websiteUrl: profile.website_url ?? undefined,
    instagramUrl: profile.instagram_url ?? undefined,
    xUrl: profile.x_url ?? undefined,
    githubUrl: profile.github_url ?? undefined,
    linkedinUrl: profile.linkedin_url ?? undefined,
    youtubeUrl: profile.youtube_url ?? undefined,
    createdAt: profile.created_at,
    emailVerified: profile.email_verified ?? false,
    preferences: {
      privacy: "public",
      theme: "night-cold",
    },
    stats: {
      mediaItems: profile.media_count,
      sharedPosts: profile.shared_posts_count ?? 0,
      followers: profile.followers_count,
      following: profile.following_count,
      totalUpvotes: profile.total_upvotes ?? 0,
    },
    isFollowing: profile.is_following ?? false,
  };
}

function mapSearchUser(user: BackendUserProfile): User {
  return {
    id: user.id,
    email: "",
    displayName: user.display_name,
    avatar: user.avatar_url ?? undefined,
    bio: user.bio ?? undefined,
    createdAt: user.created_at,
    emailVerified: user.email_verified ?? false,
    preferences: {
      privacy: "public",
      theme: "night-cold",
    },
  };
}

export const userService = {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const profile = await apiClient.get<BackendUserProfile>(`/users/${userId}`);
    return mapUserProfile(profile);
  },

  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const response = await apiClient.get<BackendUserList>("/users", {
      params: { search: query, limit, page: 1 },
    });
    return response.items.map(mapSearchUser);
  },

  async getFriends(userId: string): Promise<UserRef[]> {
    const response = await apiClient.get<{
      items: BackendUserRef[];
      total: number;
    }>(`/users/${userId}/following`);
    return response.items.map(mapUserRef);
  },

  async followUser(_currentUserId: string, targetUserId: string): Promise<void> {
    await apiClient.post(`/users/${targetUserId}/follow`);
  },

  async unfollowUser(
    _currentUserId: string,
    targetUserId: string,
  ): Promise<void> {
    await apiClient.delete(`/users/${targetUserId}/unfollow`);
  },

  async isFollowing(
    currentUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const profile = await this.getUserProfile(targetUserId);
    return profile?.isFollowing ?? false;
  },
};
