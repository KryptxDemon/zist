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
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  xUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
  createdAt: string;
  emailVerified?: boolean;
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
  description?: string;
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

export interface FeedComment {
  id: string;
  postId: string;
  userId: string;
  body: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
}

export interface ShareableContentItem {
  id: string;
  mediaId: string;
  mediaTitle: string;
  label: string;
  postType: "theme" | "vocab" | "quote";
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
  commentsCount: number;
  mediaTitle?: string;
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
    totalUpvotes: number;
  };
  isFollowing?: boolean;
}

export interface UserRef {
  id: string;
  displayName: string;
  avatar?: string;
}

export interface UserInfo {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  xUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
  emailVerified?: boolean;
  followers: number;
  following: number;
  mediaItems: number;
}

export type FriendRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

/**
 * Lightweight user shape embedded in friend payloads.
 *
 * NOTE: Backend Pydantic serializes with snake_case field names. We mirror
 * that exactly so consumers can index by JSON key without any conversion.
 */
export interface FriendRequestUser {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface FriendRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: FriendRequestStatus;
  created_at: string;
  responded_at?: string | null;
  requester?: FriendRequestUser | null;
  recipient?: FriendRequestUser | null;
}

export interface FriendRequestListResponse {
  items: FriendRequest[];
  total: number;
}

export interface FriendListResponse {
  items: FriendRequestUser[];
  total: number;
}

export type FriendRelationshipState =
  | "self"
  | "none"
  | "outgoing_pending"
  | "incoming_pending"
  | "friends";

export interface FriendRelationship {
  state: FriendRelationshipState;
  request_id?: string | null;
  requester_id?: string | null;
  recipient_id?: string | null;
}

/**
 * Notification types emitted by the backend (see
 * ``app/schemas/notification.py``).
 */
export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "post_like"
  | "post_comment";

export interface NotificationActor {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  message?: string | null;
  data?: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
  actor?: NotificationActor | null;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationUnreadCount {
  count: number;
}

export interface NotificationMessageResponse {
  message: string;
}
