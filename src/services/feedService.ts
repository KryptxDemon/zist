import { FeedPost, ThemeConcept, VocabItem, QuoteItem } from "@/types";
import { apiClient } from "./apiClient";

interface FeedResponse {
  items: FeedPost[];
  total: number;
}

export const feedService = {
  async getPosts(
    filter?: "friends" | "global",
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: FeedPost[]; total: number }> {
    try {
      const params: Record<string, any> = { page, limit };
      if (filter) params.visibility = filter;

      const response = await apiClient.get<FeedResponse>("/feed", { params });
      return { items: response.items, total: response.total };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch feed",
      );
    }
  },

  async createPost(data: {
    type: "theme" | "vocab" | "quote";
    content: ThemeConcept | VocabItem | QuoteItem;
    caption?: string;
    visibility: "friends" | "global";
    authorName: string;
    authorAvatar?: string;
  }): Promise<FeedPost> {
    try {
      const response = await apiClient.post<FeedPost>("/feed", {
        post_type: data.type,
        content_id: (data.content as { id: string }).id,
        caption: data.caption,
        visibility: data.visibility,
      });
      return response;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to create post",
      );
    }
  },

  async likePost(
    postId: string,
  ): Promise<{ is_liked: boolean; likes_count: number }> {
    try {
      const response = await apiClient.post<{
        is_liked: boolean;
        likes_count: number;
      }>(`/feed/${postId}/like`);
      return response;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to like post",
      );
    }
  },

  async savePost(postId: string): Promise<{ is_saved: boolean }> {
    try {
      const response = await apiClient.post<{ is_saved: boolean }>(
        `/feed/${postId}/save`,
      );
      return response;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to save post",
      );
    }
  },

  async deletePost(postId: string): Promise<void> {
    try {
      await apiClient.delete(`/feed/${postId}`);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete post",
      );
    }
  },
};
