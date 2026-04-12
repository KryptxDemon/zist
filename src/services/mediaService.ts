import {
  MediaItem,
  MediaStatus,
  MediaType,
  MediaStats,
  ThemeConcept,
  FactItem,
  VocabItem,
  QuoteItem,
} from "@/types";
import { apiClient } from "./apiClient";

interface CreateMediaInput {
  userId?: string;
  title: string;
  type: MediaType;
  year?: number;
  creator?: string;
  description?: string;
  coverUrl?: string;
  tags?: string[];
  status: MediaStatus;
  externalSource?: string;
  externalId?: string;
}

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

type ApiObject = Record<string, unknown>;

const mapMediaItem = (item: ApiObject): MediaItem =>
  ({
    id: item.id,
    userId: item.userId ?? item.user_id,
    title: item.title,
    type: item.type,
    year: item.year,
    creator: item.creator,
    coverUrl: item.coverUrl ?? item.cover_url,
    tags: Array.isArray(item.tags) ? item.tags : [],
    status: item.status,
    rating: item.rating,
    createdAt: item.createdAt ?? item.created_at,
    updatedAt: item.updatedAt ?? item.updated_at,
  }) as MediaItem;

const mapTheme = (item: ApiObject): ThemeConcept =>
  ({
    id: item.id,
    mediaId: item.mediaId ?? item.media_id,
    title: item.title,
    summary: item.summary,
    sourceUrl: item.sourceUrl ?? item.source_url,
    userUnderstanding: item.userUnderstanding ?? item.user_understanding,
    savedForLater: item.savedForLater ?? item.saved_for_later ?? false,
    createdAt: item.createdAt ?? item.created_at,
    updatedAt: item.updatedAt ?? item.updated_at,
  }) as ThemeConcept;

const mapFact = (item: ApiObject): FactItem =>
  ({
    id: item.id,
    mediaId: item.mediaId ?? item.media_id,
    category: item.category,
    content: item.content,
    source: item.source ?? item.source_name,
    order: item.order ?? item.display_order ?? 0,
    createdAt: item.createdAt ?? item.created_at,
  }) as FactItem;

const mapVocab = (item: ApiObject): VocabItem =>
  ({
    id: item.id,
    mediaId: item.mediaId ?? item.media_id,
    word: item.word,
    definition: item.definition,
    exampleSentence: item.exampleSentence ?? item.example_sentence,
    whereFound: item.whereFound ?? item.where_found,
    tags: Array.isArray(item.tags) ? item.tags : [],
    userSentence: item.userSentence ?? item.user_sentence,
    memoryTip: item.memoryTip ?? item.memory_tip,
    isLearned: item.isLearned ?? item.is_learned ?? false,
    createdAt: item.createdAt ?? item.created_at,
  }) as VocabItem;

const mapQuote = (item: ApiObject): QuoteItem =>
  ({
    id: item.id,
    mediaId: item.mediaId ?? item.media_id,
    text: item.text,
    speaker: item.speaker,
    reference: item.reference,
    relatedThemeId: item.relatedThemeId ?? item.related_theme_id,
    userMeaning: item.userMeaning ?? item.user_meaning,
    aiMeaning: item.aiMeaning ?? item.ai_meaning,
    isBookmarked: item.isBookmarked ?? item.is_bookmarked ?? false,
    createdAt: item.createdAt ?? item.created_at,
  }) as QuoteItem;

export const mediaService = {
  async getAll(page: number = 1, limit: number = 20): Promise<MediaItem[]> {
    try {
      const response = await apiClient.get<ListResponse<ApiObject>>("/media", {
        params: { page, limit },
      });
      return response.items.map(mapMediaItem);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch media",
      );
    }
  },

  async getAllWithMeta(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    items: MediaItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await apiClient.get<ListResponse<ApiObject>>("/media", {
        params: { page, limit },
      });
      return {
        items: response.items.map(mapMediaItem),
        total: response.total,
        page: response.page,
        limit: response.limit,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch media",
      );
    }
  },

  async getById(id: string): Promise<MediaItem | null> {
    try {
      const item = await apiClient.get<ApiObject>(`/media/${id}`);
      return mapMediaItem(item);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  },

  async create(data: CreateMediaInput): Promise<MediaItem> {
    try {
      const response = await apiClient.post<ApiObject>("/media", {
        title: data.title,
        type: data.type,
        cover_url: data.coverUrl,
        description: data.description,
        year: data.year,
        creator: data.creator,
        status: data.status,
        external_source: data.externalSource,
        external_id: data.externalId,
      });
      return mapMediaItem(response);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to create media",
      );
    }
  },

  async update(id: string, data: Partial<MediaItem>): Promise<MediaItem> {
    try {
      const response = await apiClient.patch<ApiObject>(`/media/${id}`, {
        title: data.title,
        type: data.type,
        year: data.year,
        creator: data.creator,
        cover_url: data.coverUrl,
        status: data.status,
        rating: data.rating,
      });
      return mapMediaItem(response);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update media",
      );
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/media/${id}`);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete media",
      );
    }
  },

  async search(
    query: string,
    filters?: { type?: MediaType; status?: MediaStatus },
  ): Promise<MediaItem[]> {
    try {
      const params: Record<string, string | number | boolean> = {
        search: query,
      };
      if (filters?.type) params.type = filters.type;
      if (filters?.status) params.status = filters.status;

      const response = await apiClient.get<{ items: ApiObject[] }>("/media", {
        params,
      });
      return response.items.map(mapMediaItem);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to search media",
      );
    }
  },

  async getStats(mediaId: string): Promise<MediaStats> {
    try {
      const response = await apiClient.get<MediaStats>(
        `/media/${mediaId}/stats`,
      );
      return response;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch stats",
      );
    }
  },
};

// Theme service
export const themeService = {
  async getByMediaId(mediaId: string): Promise<ThemeConcept[]> {
    try {
      const response = await apiClient.get<{ items: ApiObject[] }>(
        `/media/${mediaId}/themes`,
      );
      return response.items.map(mapTheme);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch themes",
      );
    }
  },

  async create(
    data: Omit<ThemeConcept, "id" | "createdAt" | "updatedAt">,
  ): Promise<ThemeConcept> {
    try {
      const response = await apiClient.post<ApiObject>(
        `/media/${data.mediaId}/themes`,
        {
          title: data.title,
          summary: data.summary,
          source_url: data.sourceUrl,
          user_understanding: data.userUnderstanding,
          saved_for_later: data.savedForLater,
        },
      );
      return mapTheme(response);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to create theme",
      );
    }
  },

  async update(id: string, data: Partial<ThemeConcept>): Promise<ThemeConcept> {
    try {
      const response = await apiClient.patch<ApiObject>(`/themes/${id}`, {
        title: data.title,
        summary: data.summary,
        source_url: data.sourceUrl,
        user_understanding: data.userUnderstanding,
        saved_for_later: data.savedForLater,
      });
      return mapTheme(response);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update theme",
      );
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/themes/${id}`);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete theme",
      );
    }
  },

  async toggleSave(id: string): Promise<{ saved: boolean }> {
    try {
      const response = await apiClient.post<ApiObject>(
        `/themes/${id}/toggle-save`,
      );
      return {
        saved: response.savedForLater ?? response.saved_for_later ?? false,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to toggle save",
      );
    }
  },
};

// Fact service
export const factService = {
  async getByMediaId(mediaId: string): Promise<FactItem[]> {
    try {
      const response = await apiClient.get<{ items: ApiObject[] }>(
        `/media/${mediaId}/facts`,
      );
      return response.items.map(mapFact);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch facts",
      );
    }
  },

  async create(data: Omit<FactItem, "id" | "createdAt">): Promise<FactItem> {
    try {
      const response = await apiClient.post<ApiObject>(
        `/media/${data.mediaId}/facts`,
        {
          category: data.category,
          content: data.content,
          display_order: data.order,
          source_name: data.source,
          source_url: data.sourceUrl,
        },
      );
      return mapFact(response);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to create fact",
      );
    }
  },

  async update(id: string, data: Partial<FactItem>): Promise<FactItem> {
    try {
      const response = await apiClient.patch<ApiObject>(`/facts/${id}`, {
        category: data.category,
        content: data.content,
        display_order: data.order,
        source_name: data.source,
      });
      return mapFact(response);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update fact",
      );
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/facts/${id}`);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete fact",
      );
    }
  },
};

// Vocabulary service
export const vocabService = {
  async getByMediaId(mediaId: string): Promise<VocabItem[]> {
    try {
      const response = await apiClient.get<{ items: ApiObject[] }>(
        `/media/${mediaId}/vocab`,
      );
      return response.items.map(mapVocab);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch vocab",
      );
    }
  },

  async create(data: Omit<VocabItem, "id" | "createdAt">): Promise<VocabItem> {
    const fullPayload = {
      word: data.word,
      definition: data.definition,
      example_sentence: data.exampleSentence,
      where_found: data.whereFound,
      memory_tip: data.memoryTip,
      user_sentence: data.userSentence,
      is_learned: data.isLearned,
      tags: data.tags,
    };

    try {
      const response = await apiClient.post<ApiObject>(
        `/media/${data.mediaId}/vocab`,
        fullPayload,
      );
      return mapVocab(response);
    } catch (error) {
      // Fallback to a minimal payload in case optional fields trigger backend validation issues.
      try {
        const fallbackResponse = await apiClient.post<ApiObject>(
          `/media/${data.mediaId}/vocab`,
          {
            word: data.word,
            where_found: data.whereFound,
            is_learned: data.isLearned,
            tags: data.tags,
          },
        );
        return mapVocab(fallbackResponse);
      } catch (fallbackError) {
        throw new Error(
          fallbackError instanceof Error
            ? fallbackError.message
            : "Failed to create vocab",
        );
      }
    }
  },

  async update(id: string, data: Partial<VocabItem>): Promise<VocabItem> {
    try {
      const response = await apiClient.patch<ApiObject>(`/vocab/${id}`, {
        word: data.word,
        definition: data.definition,
        example_sentence: data.exampleSentence,
        where_found: data.whereFound,
        memory_tip: data.memoryTip,
        user_sentence: data.userSentence,
        is_learned: data.isLearned,
        tags: data.tags,
      });
      return mapVocab(response);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update vocab",
      );
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/vocab/${id}`);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete vocab",
      );
    }
  },

  async toggleLearned(id: string): Promise<{ is_learned: boolean }> {
    try {
      const response = await apiClient.post<ApiObject>(
        `/vocab/${id}/toggle-learned`,
      );
      return { is_learned: response.isLearned ?? response.is_learned ?? false };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to toggle learned",
      );
    }
  },
};

// Quote service
export const quoteService = {
  async getByMediaId(mediaId: string): Promise<QuoteItem[]> {
    try {
      const response = await apiClient.get<{ items: ApiObject[] }>(
        `/media/${mediaId}/quotes`,
      );
      return response.items.map(mapQuote);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch quotes",
      );
    }
  },

  async create(data: Omit<QuoteItem, "id" | "createdAt">): Promise<QuoteItem> {
    try {
      const response = await apiClient.post<ApiObject>(
        `/media/${data.mediaId}/quotes`,
        {
          text: data.text,
          speaker: data.speaker,
          reference: data.reference,
          related_theme_id: data.relatedThemeId,
          user_meaning: data.userMeaning,
          ai_meaning: data.aiMeaning,
          is_bookmarked: data.isBookmarked,
        },
      );
      return mapQuote(response);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to create quote",
      );
    }
  },

  async update(id: string, data: Partial<QuoteItem>): Promise<QuoteItem> {
    try {
      const response = await apiClient.patch<ApiObject>(`/quotes/${id}`, {
        text: data.text,
        speaker: data.speaker,
        reference: data.reference,
        related_theme_id: data.relatedThemeId,
        user_meaning: data.userMeaning,
        ai_meaning: data.aiMeaning,
        is_bookmarked: data.isBookmarked,
      });
      return mapQuote(response);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update quote",
      );
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/quotes/${id}`);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete quote",
      );
    }
  },

  async toggleBookmark(id: string): Promise<{ is_bookmarked: boolean }> {
    try {
      const response = await apiClient.post<ApiObject>(
        `/quotes/${id}/toggle-bookmark`,
      );
      return {
        is_bookmarked: response.isBookmarked ?? response.is_bookmarked ?? false,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to toggle bookmark",
      );
    }
  },
};
