import {
  FeedComment,
  FeedPost,
  QuoteItem,
  ShareableContentItem,
  ThemeConcept,
  VocabItem,
} from "@/types";
import { apiClient } from "./apiClient";

type ApiObject = Record<string, unknown>;

interface BackendFeedPost {
  id: string;
  user_id: string;
  post_type: string;
  content_id: string;
  caption?: string | null;
  visibility: string;
  created_at: string;
  updated_at?: string;
  author_name: string;
  author_avatar?: string | null;
  likes_count: number;
  is_liked: boolean;
  is_saved: boolean;
  comments_count: number;
  content?: ApiObject | null;
  media_title?: string | null;
}

interface BackendFeedList {
  items: BackendFeedPost[];
  total: number;
  page?: number;
  limit?: number;
}

interface BackendComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string;
  author_avatar?: string | null;
}

function mapContent(
  postType: string,
  content: ApiObject | null | undefined,
  contentId: string,
): ThemeConcept | VocabItem | QuoteItem {
  const mediaId = String(content?.media_id ?? content?.mediaId ?? "");
  const now = new Date().toISOString();

  if (postType === "theme") {
    return {
      id: String(content?.id ?? contentId),
      mediaId,
      title: String(content?.title ?? "Theme"),
      summary: (content?.summary as string) ?? undefined,
      userUnderstanding:
        (content?.user_understanding as string) ??
        (content?.userUnderstanding as string) ??
        undefined,
      savedForLater: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  if (postType === "vocab") {
    return {
      id: String(content?.id ?? contentId),
      mediaId,
      word: String(content?.word ?? "Word"),
      definition: (content?.definition as string) ?? undefined,
      exampleSentence:
        (content?.example_sentence as string) ??
        (content?.exampleSentence as string) ??
        undefined,
      tags: [],
      isLearned: false,
      createdAt: now,
    };
  }

  return {
    id: String(content?.id ?? contentId),
    mediaId,
    text: String(content?.text ?? ""),
    speaker: (content?.speaker as string) ?? undefined,
    userMeaning:
      (content?.user_meaning as string) ??
      (content?.userMeaning as string) ??
      undefined,
    isBookmarked: false,
    createdAt: now,
  };
}

function mapFeedPost(post: BackendFeedPost): FeedPost {
  const postType = post.post_type as FeedPost["type"];
  return {
    id: post.id,
    userId: post.user_id,
    authorName: post.author_name,
    authorAvatar: post.author_avatar ?? undefined,
    type: postType,
    contentId: post.content_id,
    content: mapContent(postType, post.content, post.content_id),
    caption: post.caption ?? undefined,
    visibility: post.visibility as FeedPost["visibility"],
    likes: post.likes_count,
    isLiked: post.is_liked,
    isSaved: post.is_saved,
    commentsCount: post.comments_count,
    mediaTitle: post.media_title ?? undefined,
    createdAt: post.created_at,
  };
}

function mapComment(comment: BackendComment): FeedComment {
  return {
    id: comment.id,
    postId: comment.post_id,
    userId: comment.user_id,
    body: comment.body,
    authorName: comment.author_name,
    authorAvatar: comment.author_avatar ?? undefined,
    createdAt: comment.created_at,
  };
}

function mapShareableItem(item: ApiObject): ShareableContentItem {
  return {
    id: String(item.id),
    mediaId: String(item.media_id ?? item.mediaId),
    mediaTitle: String(item.media_title ?? item.mediaTitle ?? "Media"),
    label: String(item.label),
    postType: (item.post_type ?? item.postType) as ShareableContentItem["postType"],
  };
}

export const feedService = {
  async getPosts(
    filter?: "friends" | "global",
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: FeedPost[]; total: number }> {
    const params: Record<string, string | number> = { page, limit };
    if (filter) params.visibility = filter;

    const response = await apiClient.get<BackendFeedList>("/feed", { params });
    return {
      items: response.items.map(mapFeedPost),
      total: response.total,
    };
  },

  async getUserPosts(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: FeedPost[]; total: number }> {
    const response = await apiClient.get<BackendFeedList>(
      `/users/${userId}/posts`,
      { params: { page, limit } },
    );
    return {
      items: response.items.map(mapFeedPost),
      total: response.total,
    };
  },

  async getShareableContent(): Promise<{
    themes: ShareableContentItem[];
    vocab: ShareableContentItem[];
    quotes: ShareableContentItem[];
  }> {
    const response = await apiClient.get<{
      themes: ApiObject[];
      vocab: ApiObject[];
      quotes: ApiObject[];
    }>("/feed/shareable-content");

    return {
      themes: response.themes.map(mapShareableItem),
      vocab: response.vocab.map(mapShareableItem),
      quotes: response.quotes.map(mapShareableItem),
    };
  },

  async createPost(data: {
    type: "theme" | "vocab" | "quote";
    contentId: string;
    caption?: string;
    visibility: "friends" | "global";
  }): Promise<FeedPost> {
    const response = await apiClient.post<BackendFeedPost>("/feed", {
      post_type: data.type,
      content_id: data.contentId,
      caption: data.caption,
      visibility: data.visibility,
    });
    return mapFeedPost(response);
  },

  async likePost(
    postId: string,
  ): Promise<{ active: boolean; count: number }> {
    const response = await apiClient.post<{ active: boolean; count: number }>(
      `/feed/${postId}/like`,
    );
    return response;
  },

  async savePost(
    postId: string,
  ): Promise<{ active: boolean; count: number }> {
    const response = await apiClient.post<{ active: boolean; count: number }>(
      `/feed/${postId}/save`,
    );
    return response;
  },

  async getComments(postId: string): Promise<FeedComment[]> {
    const response = await apiClient.get<{ items: BackendComment[] }>(
      `/feed/${postId}/comments`,
    );
    return response.items.map(mapComment);
  },

  async addComment(postId: string, body: string): Promise<FeedComment> {
    const response = await apiClient.post<BackendComment>(
      `/feed/${postId}/comments`,
      { body },
    );
    return mapComment(response);
  },

  async deleteComment(commentId: string): Promise<void> {
    await apiClient.delete(`/feed/comments/${commentId}`);
  },

  async deletePost(postId: string): Promise<void> {
    await apiClient.delete(`/feed/${postId}`);
  },
};
