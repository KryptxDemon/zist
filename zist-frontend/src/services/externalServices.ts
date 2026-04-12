import { apiClient } from "./apiClient";

interface WikiSummaryResponse {
  summary: string;
  source_url: string;
}

interface DictionaryResponse {
  definition: string;
  example: string;
}

interface ExternalMediaItem {
  title: string;
  type: "movie" | "tv" | "book" | "documentary" | "podcast" | "game";
  year?: number;
  creator?: string;
  description?: string;
  cover_url?: string;
  external_source?: string;
  external_id?: string;
}

interface ExternalSearchResponse {
  items?: ExternalMediaItem[];
  grouped?: {
    movies_tv?: ExternalMediaItem[];
    books?: ExternalMediaItem[];
  };
}

interface GroupedSearchResult {
  moviesTv: ExternalMediaItem[];
  books: ExternalMediaItem[];
}

interface WikiSuggestionsResponse {
  items?: string[];
  suggestions?: string[];
}

export const wikiService = {
  async getSummaryByTopic(
    topic: string,
  ): Promise<{ summary: string; sourceUrl: string }> {
    try {
      const response = await apiClient.get<WikiSummaryResponse>(
        "/external/wiki/summary",
        {
          params: { topic },
        },
      );
      return {
        summary: response.summary,
        sourceUrl: response.source_url,
      };
    } catch (error) {
      console.error("Failed to fetch Wikipedia summary:", error);
      return {
        summary: `${topic} is an important concept. Unable to fetch summary at the moment.`,
        sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
      };
    }
  },

  async suggestThemes(mediaTitle: string): Promise<string[]> {
    try {
      const response = await apiClient.get<WikiSuggestionsResponse>(
        "/external/wiki/suggestions",
        {
          params: { query: mediaTitle },
        },
      );
      return response.items ?? response.suggestions ?? [];
    } catch (error) {
      console.error("Failed to fetch theme suggestions:", error);
      // Fallback suggestions
      return [
        "Faith and Doubt",
        "Religious Extremism",
        "Isolation and Community",
        "Truth vs Deception",
        "Family Dynamics",
      ];
    }
  },
};

// Dictionary service
export const dictionaryService = {
  async getDefinitionAndExample(
    word: string,
  ): Promise<{ definition: string; example: string }> {
    try {
      const response = await apiClient.get<DictionaryResponse>(
        "/external/dictionary/lookup",
        {
          params: { word },
        },
      );
      return response;
    } catch (error) {
      console.error("Failed to fetch dictionary definition:", error);
      return {
        definition: `Unable to fetch definition for "${word}" at the moment.`,
        example: `The term "${word}" was used in the text.`,
      };
    }
  },
};

export const mediaSearchService = {
  async searchMedia(
    query: string,
    type?: string,
  ): Promise<ExternalMediaItem[]> {
    if (!query.trim()) return [];

    try {
      const fetchResponse = async (requestedType?: string) => {
        const params: Record<string, string> = { query };
        if (requestedType) params.type = requestedType;
        return apiClient.get<ExternalSearchResponse>("/external/search/media", {
          params,
        });
      };

      const primary = await fetchResponse(type);

      if (primary.items && primary.items.length > 0) {
        return primary.items;
      }

      const groupedPrimary = primary.grouped;
      if (groupedPrimary) {
        // Put books first so they are visible in the first rows of suggestions.
        return [
          ...(groupedPrimary.books || []),
          ...(groupedPrimary.movies_tv || []),
        ];
      }

      // If typed search returns no items (e.g., wrong selected media type),
      // retry without type and prefer books in the blended results.
      if (type) {
        const fallback = await fetchResponse();
        if (fallback.grouped) {
          return [
            ...(fallback.grouped.books || []),
            ...(fallback.grouped.movies_tv || []),
          ];
        }
        if (fallback.items) {
          return fallback.items;
        }
      }

      return [];
    } catch (error) {
      console.error("Failed to search media externally:", error);
      return [];
    }
  },

  async searchMediaGrouped(query: string): Promise<GroupedSearchResult> {
    if (!query.trim()) {
      return { moviesTv: [], books: [] };
    }

    try {
      const response = await apiClient.get<ExternalSearchResponse>(
        "/external/search/media",
        {
          params: { query },
        },
      );

      if (response.grouped) {
        return {
          moviesTv: response.grouped.movies_tv || [],
          books: response.grouped.books || [],
        };
      }

      const items = response.items || [];
      return {
        moviesTv: items.filter((item) => item.type !== "book"),
        books: items.filter((item) => item.type === "book"),
      };
    } catch (error) {
      console.error("Failed to fetch grouped media search:", error);
      return { moviesTv: [], books: [] };
    }
  },
};

// AI service for quote meanings - calls backend API
export const aiService = {
  async generateQuoteMeaning(quote: string, context?: string): Promise<string> {
    try {
      const response = await apiClient.post<{ meaning: string }>(
        "/external/ai/quote-meaning",
        {
          quote,
          context,
        },
      );
      return response.meaning;
    } catch (error) {
      console.error("Failed to generate quote meaning:", error);
      return "This quote invites reflection on the themes and ideas presented in the narrative.";
    }
  },
};
