import { User, UserProfile, FeedPost } from "@/types";
import { storage, STORAGE_KEYS } from "./storage";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const generateId = () => Math.random().toString(36).substring(2, 15);

const USERS_STORAGE_KEY = "zist_users";

export const userService = {
  /**
   * Get all users - useful for directory and search
   */
  async getAllUsers(): Promise<User[]> {
    await delay(200);
    return storage.get<User[]>(USERS_STORAGE_KEY) || [];
  },

  /**
   * Search users by display name
   */
  async searchUsers(query: string): Promise<User[]> {
    await delay(300);
    const users = await this.getAllUsers();
    if (!query.trim()) return users;

    const lowerQuery = query.toLowerCase();
    return users.filter(
      (user) =>
        user.displayName.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery),
    );
  },

  /**
   * Get a specific user by ID with profile stats
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    await delay(200);
    const users = await this.getAllUsers();
    const user = users.find((u) => u.id === userId);

    if (!user) return null;

    // Calculate stats
    const posts = storage.get<FeedPost[]>(STORAGE_KEYS.FEED) || [];
    const userPosts = posts.filter((p) => p.userId === userId);

    const profile: UserProfile = {
      ...user,
      stats: {
        mediaItems: 0, // Would be calculated from mediaService
        sharedPosts: userPosts.length,
        followers: user.followers?.length || 0,
        following: user.following?.length || 0,
      },
    };

    return profile;
  },

  /**
   * Get user's feed posts
   */
  async getUserPosts(userId: string): Promise<FeedPost[]> {
    await delay(200);
    const posts = storage.get<FeedPost[]>(STORAGE_KEYS.FEED) || [];
    return posts
      .filter((p) => p.userId === userId && p.visibility === "global")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  },

  /**
   * Add a user (usually done during signup)
   */
  async addUser(user: User): Promise<User> {
    await delay(200);
    const users = storage.get<User[]>(USERS_STORAGE_KEY) || [];
    const newUser = {
      ...user,
      followers: [],
      following: [],
      stats: {
        mediaItems: 0,
        sharedPosts: 0,
        followers: 0,
        following: 0,
      },
    };
    storage.set(USERS_STORAGE_KEY, [...users, newUser]);
    return newUser;
  },

  /**
   * Update user profile
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    await delay(200);
    const users = storage.get<User[]>(USERS_STORAGE_KEY) || [];
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error("User not found");

    const updatedUser = { ...users[index], ...updates };
    users[index] = updatedUser;
    storage.set(USERS_STORAGE_KEY, users);
    return updatedUser;
  },

  /**
   * Follow a user
   */
  async followUser(currentUserId: string, targetUserId: string): Promise<void> {
    await delay(200);
    const users = storage.get<User[]>(USERS_STORAGE_KEY) || [];

    const currentUserIndex = users.findIndex((u) => u.id === currentUserId);
    const targetUserIndex = users.findIndex((u) => u.id === targetUserId);

    if (currentUserIndex === -1 || targetUserIndex === -1) {
      throw new Error("User not found");
    }

    const currentUser = users[currentUserIndex];
    const targetUser = users[targetUserIndex];

    // Add to current user's following list
    if (!currentUser.following) currentUser.following = [];
    if (!currentUser.following.includes(targetUserId)) {
      currentUser.following.push(targetUserId);
    }

    // Add to target user's followers list
    if (!targetUser.followers) targetUser.followers = [];
    if (!targetUser.followers.includes(currentUserId)) {
      targetUser.followers.push(currentUserId);
    }

    storage.set(USERS_STORAGE_KEY, users);
  },

  /**
   * Unfollow a user
   */
  async unfollowUser(
    currentUserId: string,
    targetUserId: string,
  ): Promise<void> {
    await delay(200);
    const users = storage.get<User[]>(USERS_STORAGE_KEY) || [];

    const currentUserIndex = users.findIndex((u) => u.id === currentUserId);
    const targetUserIndex = users.findIndex((u) => u.id === targetUserId);

    if (currentUserIndex === -1 || targetUserIndex === -1) {
      throw new Error("User not found");
    }

    const currentUser = users[currentUserIndex];
    const targetUser = users[targetUserIndex];

    // Remove from current user's following list
    if (currentUser.following) {
      currentUser.following = currentUser.following.filter(
        (id) => id !== targetUserId,
      );
    }

    // Remove from target user's followers list
    if (targetUser.followers) {
      targetUser.followers = targetUser.followers.filter(
        (id) => id !== currentUserId,
      );
    }

    storage.set(USERS_STORAGE_KEY, users);
  },

  /**
   * Check if current user follows target user
   */
  async isFollowing(
    currentUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    await delay(100);
    const users = await this.getAllUsers();
    const currentUser = users.find((u) => u.id === currentUserId);
    return currentUser?.following?.includes(targetUserId) || false;
  },
};
