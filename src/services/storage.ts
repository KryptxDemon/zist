const STORAGE_KEYS = {
  USER: "zist_user",
  TOKEN: "zist_token",
  USERS: "zist_users",
  MEDIA: "zist_media",
  THEMES: "zist_themes",
  FACTS: "zist_facts",
  VOCAB: "zist_vocab",
  QUOTES: "zist_quotes",
  QUIZZES: "zist_quizzes",
  FEED: "zist_feed",
} as const;

export const storage = {
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  },
};

export { STORAGE_KEYS };
