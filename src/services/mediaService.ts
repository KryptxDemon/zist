import { MediaItem, MediaStatus, MediaType, MediaStats, ThemeConcept, FactItem, VocabItem, QuoteItem } from '@/types';
import { storage, STORAGE_KEYS } from './storage';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const generateId = () => Math.random().toString(36).substring(2, 15);

export const mediaService = {
  async getAll(): Promise<MediaItem[]> {
    await delay(400);
    return storage.get<MediaItem[]>(STORAGE_KEYS.MEDIA) || [];
  },

  async getById(id: string): Promise<MediaItem | null> {
    await delay(300);
    const items = storage.get<MediaItem[]>(STORAGE_KEYS.MEDIA) || [];
    return items.find((item) => item.id === id) || null;
  },

  async create(data: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<MediaItem> {
    await delay(600);
    const items = storage.get<MediaItem[]>(STORAGE_KEYS.MEDIA) || [];
    const newItem: MediaItem = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storage.set(STORAGE_KEYS.MEDIA, [...items, newItem]);
    return newItem;
  },

  async update(id: string, data: Partial<MediaItem>): Promise<MediaItem> {
    await delay(400);
    const items = storage.get<MediaItem[]>(STORAGE_KEYS.MEDIA) || [];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) throw new Error('Media not found');

    items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
    storage.set(STORAGE_KEYS.MEDIA, items);
    return items[index];
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    const items = storage.get<MediaItem[]>(STORAGE_KEYS.MEDIA) || [];
    storage.set(STORAGE_KEYS.MEDIA, items.filter((item) => item.id !== id));
  },

  async search(query: string, filters?: { type?: MediaType; status?: MediaStatus }): Promise<MediaItem[]> {
    await delay(300);
    let items = storage.get<MediaItem[]>(STORAGE_KEYS.MEDIA) || [];

    if (query) {
      const lowerQuery = query.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(lowerQuery) ||
          item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    }

    if (filters?.type) {
      items = items.filter((item) => item.type === filters.type);
    }

    if (filters?.status) {
      items = items.filter((item) => item.status === filters.status);
    }

    return items;
  },

  async getStats(mediaId: string): Promise<MediaStats> {
    await delay(200);
    const themes = storage.get<ThemeConcept[]>(STORAGE_KEYS.THEMES) || [];
    const facts = storage.get<FactItem[]>(STORAGE_KEYS.FACTS) || [];
    const vocab = storage.get<VocabItem[]>(STORAGE_KEYS.VOCAB) || [];
    const quotes = storage.get<QuoteItem[]>(STORAGE_KEYS.QUOTES) || [];

    return {
      themes: themes.filter((t) => t.mediaId === mediaId).length,
      facts: facts.filter((f) => f.mediaId === mediaId).length,
      vocab: vocab.filter((v) => v.mediaId === mediaId).length,
      quotes: quotes.filter((q) => q.mediaId === mediaId).length,
      quizzes: 0,
    };
  },
};

// Theme service
export const themeService = {
  async getByMediaId(mediaId: string): Promise<ThemeConcept[]> {
    await delay(300);
    const themes = storage.get<ThemeConcept[]>(STORAGE_KEYS.THEMES) || [];
    return themes.filter((t) => t.mediaId === mediaId);
  },

  async create(data: Omit<ThemeConcept, 'id' | 'createdAt' | 'updatedAt'>): Promise<ThemeConcept> {
    await delay(500);
    const themes = storage.get<ThemeConcept[]>(STORAGE_KEYS.THEMES) || [];
    const newTheme: ThemeConcept = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storage.set(STORAGE_KEYS.THEMES, [...themes, newTheme]);
    return newTheme;
  },

  async update(id: string, data: Partial<ThemeConcept>): Promise<ThemeConcept> {
    await delay(400);
    const themes = storage.get<ThemeConcept[]>(STORAGE_KEYS.THEMES) || [];
    const index = themes.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Theme not found');

    themes[index] = { ...themes[index], ...data, updatedAt: new Date().toISOString() };
    storage.set(STORAGE_KEYS.THEMES, themes);
    return themes[index];
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    const themes = storage.get<ThemeConcept[]>(STORAGE_KEYS.THEMES) || [];
    storage.set(STORAGE_KEYS.THEMES, themes.filter((t) => t.id !== id));
  },
};

// Fact service
export const factService = {
  async getByMediaId(mediaId: string): Promise<FactItem[]> {
    await delay(300);
    const facts = storage.get<FactItem[]>(STORAGE_KEYS.FACTS) || [];
    return facts.filter((f) => f.mediaId === mediaId).sort((a, b) => a.order - b.order);
  },

  async create(data: Omit<FactItem, 'id' | 'createdAt'>): Promise<FactItem> {
    await delay(500);
    const facts = storage.get<FactItem[]>(STORAGE_KEYS.FACTS) || [];
    const newFact: FactItem = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    storage.set(STORAGE_KEYS.FACTS, [...facts, newFact]);
    return newFact;
  },

  async update(id: string, data: Partial<FactItem>): Promise<FactItem> {
    await delay(400);
    const facts = storage.get<FactItem[]>(STORAGE_KEYS.FACTS) || [];
    const index = facts.findIndex((f) => f.id === id);
    if (index === -1) throw new Error('Fact not found');

    facts[index] = { ...facts[index], ...data };
    storage.set(STORAGE_KEYS.FACTS, facts);
    return facts[index];
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    const facts = storage.get<FactItem[]>(STORAGE_KEYS.FACTS) || [];
    storage.set(STORAGE_KEYS.FACTS, facts.filter((f) => f.id !== id));
  },
};

// Vocabulary service
export const vocabService = {
  async getByMediaId(mediaId: string): Promise<VocabItem[]> {
    await delay(300);
    const vocab = storage.get<VocabItem[]>(STORAGE_KEYS.VOCAB) || [];
    return vocab.filter((v) => v.mediaId === mediaId);
  },

  async create(data: Omit<VocabItem, 'id' | 'createdAt'>): Promise<VocabItem> {
    await delay(500);
    const vocab = storage.get<VocabItem[]>(STORAGE_KEYS.VOCAB) || [];
    const newVocab: VocabItem = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    storage.set(STORAGE_KEYS.VOCAB, [...vocab, newVocab]);
    return newVocab;
  },

  async update(id: string, data: Partial<VocabItem>): Promise<VocabItem> {
    await delay(400);
    const vocab = storage.get<VocabItem[]>(STORAGE_KEYS.VOCAB) || [];
    const index = vocab.findIndex((v) => v.id === id);
    if (index === -1) throw new Error('Vocab not found');

    vocab[index] = { ...vocab[index], ...data };
    storage.set(STORAGE_KEYS.VOCAB, vocab);
    return vocab[index];
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    const vocab = storage.get<VocabItem[]>(STORAGE_KEYS.VOCAB) || [];
    storage.set(STORAGE_KEYS.VOCAB, vocab.filter((v) => v.id !== id));
  },
};

// Quote service
export const quoteService = {
  async getByMediaId(mediaId: string): Promise<QuoteItem[]> {
    await delay(300);
    const quotes = storage.get<QuoteItem[]>(STORAGE_KEYS.QUOTES) || [];
    return quotes.filter((q) => q.mediaId === mediaId);
  },

  async create(data: Omit<QuoteItem, 'id' | 'createdAt'>): Promise<QuoteItem> {
    await delay(500);
    const quotes = storage.get<QuoteItem[]>(STORAGE_KEYS.QUOTES) || [];
    const newQuote: QuoteItem = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    storage.set(STORAGE_KEYS.QUOTES, [...quotes, newQuote]);
    return newQuote;
  },

  async update(id: string, data: Partial<QuoteItem>): Promise<QuoteItem> {
    await delay(400);
    const quotes = storage.get<QuoteItem[]>(STORAGE_KEYS.QUOTES) || [];
    const index = quotes.findIndex((q) => q.id === id);
    if (index === -1) throw new Error('Quote not found');

    quotes[index] = { ...quotes[index], ...data };
    storage.set(STORAGE_KEYS.QUOTES, quotes);
    return quotes[index];
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    const quotes = storage.get<QuoteItem[]>(STORAGE_KEYS.QUOTES) || [];
    storage.set(STORAGE_KEYS.QUOTES, quotes.filter((q) => q.id !== id));
  },
};
