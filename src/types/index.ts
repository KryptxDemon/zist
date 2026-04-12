export type MediaType =
  | "movie"
  | "tv"
  | "book"
  | "documentary"
  | "podcast"
  | "game";
export type MediaStatus = "planned" | "in-progress" | "completed";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  followers?: string[]; // User IDs
  following?: string[]; // User IDs
  stats?: {
    mediaItems: number;
    sharedPosts: number;
    followers: number;
    following: number;
  };
  preferences: {
    privacy: "private" | "public";
    theme: "night-cold";
  };
}

export interface MediaItem {
  id: string;
  userId: string;
  title: string;
  type: MediaType;
  year?: number;
  creator?: string;
  coverUrl?: string;
  tags: string[];
  status: MediaStatus;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeConcept {
  id: string;
  mediaId: string;
  title: string;
  summary?: string;
  sourceUrl?: string;
  userUnderstanding?: string;
  savedForLater: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FactItem {
  id: string;
  mediaId: string;
  category: "misconception" | "reference" | "context";
  content: string;
  source?: string;
  order: number;
  createdAt: string;
}

export interface VocabItem {
  id: string;
  mediaId: string;
  word: string;
  definition?: string;
  exampleSentence?: string;
  whereFound?: string;
  tags: string[];
  userSentence?: string;
  memoryTip?: string;
  isLearned: boolean;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  mediaId: string;
  text: string;
  speaker?: string;
  reference?: string;
  relatedThemeId?: string;
  userMeaning?: string;
  aiMeaning?: string;
  isBookmarked: boolean;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  type: "multiple-choice" | "short-answer";
  question: string;
  options?: string[];
  correctAnswer: string;
  category: "theme" | "vocab" | "quote" | "fact";
}

export interface QuizAttempt {
  id: string;
  mediaId: string;
  userId: string;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  score: number;
  totalQuestions: number;
  completedAt: string;
}

export interface FeedPost {
  id: string;
  userId: string;
  authorName: string;
  authorAvatar?: string;
  type: "theme" | "vocab" | "quote";
  contentId: string;
  content: ThemeConcept | VocabItem | QuoteItem;
  caption?: string;
  visibility: "friends" | "global";
  likes: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
}

export interface MediaStats {
  themes: number;
  facts: number;
  vocab: number;
  quotes: number;
  quizzes: number;
}

export interface UserProfile extends User {
  stats: {
    mediaItems: number;
    sharedPosts: number;
    followers: number;
    following: number;
  };
}

export interface UserInfo {
  id: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  followers: number;
  following: number;
  mediaItems: number;
}
