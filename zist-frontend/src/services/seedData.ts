import {
  MediaItem,
  ThemeConcept,
  FactItem,
  VocabItem,
  QuoteItem,
  FeedPost,
  User,
} from "@/types";
import { storage, STORAGE_KEYS } from "./storage";

const sampleUsers: User[] = [
  {
    id: "user-1",
    email: "alex@example.com",
    displayName: "Alex Chen",
    bio: "Film and literature enthusiast exploring themes in media 🎬📚",
    createdAt: "2023-06-15T10:00:00Z",
    followers: ["user-2", "user-3"],
    following: ["user-2"],
    preferences: {
      privacy: "public",
      theme: "night-cold",
    },
    stats: {
      mediaItems: 3,
      sharedPosts: 2,
      followers: 2,
      following: 1,
    },
  },
  {
    id: "user-2",
    email: "sam@example.com",
    displayName: "Sam Rivera",
    bio: "Vocabulary collector and quiz enthusiast 🎯",
    createdAt: "2023-07-20T14:30:00Z",
    followers: ["user-1"],
    following: ["user-1", "user-3"],
    preferences: {
      privacy: "public",
      theme: "night-cold",
    },
    stats: {
      mediaItems: 2,
      sharedPosts: 1,
      followers: 1,
      following: 2,
    },
  },
  {
    id: "user-3",
    email: "jordan@example.com",
    displayName: "Jordan Smith",
    bio: "Learning through documentaries and deep analysis 🧠",
    createdAt: "2023-08-10T09:15:00Z",
    followers: ["user-1"],
    following: [],
    preferences: {
      privacy: "public",
      theme: "night-cold",
    },
    stats: {
      mediaItems: 4,
      sharedPosts: 0,
      followers: 1,
      following: 0,
    },
  },
];

const sampleMedia: MediaItem[] = [
  {
    id: "media-1",
    userId: "user-1",
    title: "Heretic",
    type: "movie",
    year: 2024,
    creator: "Scott Beck & Bryan Woods",
    coverUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop",
    tags: ["thriller", "religion", "psychological"],
    status: "completed",
    rating: 4,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
  },
  {
    id: "media-2",
    userId: "user-1",
    title: "Educated",
    type: "book",
    year: 2018,
    creator: "Tara Westover",
    coverUrl:
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop",
    tags: ["memoir", "education", "survival"],
    status: "completed",
    rating: 5,
    createdAt: "2024-02-01T08:00:00Z",
    updatedAt: "2024-02-15T16:00:00Z",
  },
  {
    id: "media-3",
    userId: "user-1",
    title: "The Last of Us",
    type: "tv",
    year: 2023,
    creator: "Craig Mazin & Neil Druckmann",
    coverUrl:
      "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=400&h=600&fit=crop",
    tags: ["drama", "survival", "post-apocalyptic"],
    status: "in-progress",
    createdAt: "2024-03-01T12:00:00Z",
    updatedAt: "2024-03-10T18:00:00Z",
  },
];

const sampleThemes: ThemeConcept[] = [
  {
    id: "theme-1",
    mediaId: "media-1",
    title: "Religious Extremism",
    summary:
      "Religious extremism involves holding strict religious beliefs that often reject mainstream society and may justify harmful actions in the name of faith.",
    sourceUrl: "https://en.wikipedia.org/wiki/Religious_extremism",
    userUnderstanding:
      "The film explores how isolation from mainstream society can lead to extreme interpretations of religious doctrine.",
    savedForLater: true,
    createdAt: "2024-01-16T10:00:00Z",
    updatedAt: "2024-01-18T14:00:00Z",
  },
  {
    id: "theme-2",
    mediaId: "media-1",
    title: "Faith vs Doubt",
    summary:
      "The tension between maintaining religious faith and experiencing moments of doubt or questioning.",
    savedForLater: false,
    createdAt: "2024-01-17T11:00:00Z",
    updatedAt: "2024-01-17T11:00:00Z",
  },
  {
    id: "theme-3",
    mediaId: "media-2",
    title: "Self-Education",
    summary:
      "The pursuit of knowledge outside traditional educational institutions, often driven by personal determination.",
    userUnderstanding:
      "Tara's journey shows how access to education can fundamentally transform one's worldview and opportunities.",
    savedForLater: true,
    createdAt: "2024-02-05T09:00:00Z",
    updatedAt: "2024-02-10T12:00:00Z",
  },
];

const sampleFacts: FactItem[] = [
  {
    id: "fact-1",
    mediaId: "media-1",
    category: "misconception",
    content:
      "Not all religious communities are isolated or extreme - the film specifically depicts fringe groups.",
    order: 0,
    createdAt: "2024-01-17T10:00:00Z",
  },
  {
    id: "fact-2",
    mediaId: "media-1",
    category: "reference",
    content:
      "References the historical persecution of early Mormon settlers in 19th century America.",
    source: "Wikipedia - History of the Latter Day Saint movement",
    order: 1,
    createdAt: "2024-01-17T11:00:00Z",
  },
  {
    id: "fact-3",
    mediaId: "media-2",
    category: "context",
    content:
      "Tara Westover was raised in a survivalist Mormon family in Idaho and did not attend school until age 17.",
    order: 0,
    createdAt: "2024-02-06T10:00:00Z",
  },
];

const sampleVocab: VocabItem[] = [
  {
    id: "vocab-1",
    mediaId: "media-1",
    word: "Apostate",
    definition:
      "A person who renounces a religious or political belief or principle.",
    exampleSentence:
      "He was labeled an apostate after questioning the church's teachings.",
    whereFound: "Opening scene dialogue",
    tags: ["religious", "identity"],
    userSentence: "The apostate faced isolation from their former community.",
    memoryTip: 'Think "a-post" - posting away from the group',
    isLearned: true,
    createdAt: "2024-01-16T12:00:00Z",
  },
  {
    id: "vocab-2",
    mediaId: "media-1",
    word: "Proselytize",
    definition:
      "To convert or attempt to convert someone from one religion or belief to another.",
    exampleSentence:
      "The missionaries would proselytize door to door in the neighborhood.",
    whereFound: "Midpoint conversation",
    tags: ["religious"],
    isLearned: false,
    createdAt: "2024-01-17T14:00:00Z",
  },
  {
    id: "vocab-3",
    mediaId: "media-2",
    word: "Tincture",
    definition: "A medicine made by dissolving a drug in alcohol.",
    exampleSentence:
      "Her mother prepared herbal tinctures for various ailments.",
    whereFound: "Chapter 3",
    tags: ["medical", "herbalism"],
    isLearned: true,
    createdAt: "2024-02-08T10:00:00Z",
  },
];

const sampleQuotes: QuoteItem[] = [
  {
    id: "quote-1",
    mediaId: "media-1",
    text: "You can't choose what to believe. You can only choose what to do about it.",
    speaker: "Mr. Reed",
    reference: "Final act",
    relatedThemeId: "theme-2",
    userMeaning:
      "This suggests that belief is not a conscious choice, but our actions in response to our beliefs define who we are.",
    aiMeaning:
      "The quote explores the philosophical concept of doxastic voluntarism - whether we have control over what we believe.",
    isBookmarked: true,
    createdAt: "2024-01-18T10:00:00Z",
  },
  {
    id: "quote-2",
    mediaId: "media-2",
    text: "The skill I was learning was a crucial one, the patience to read things I could not yet understand.",
    speaker: "Tara Westover",
    reference: "Chapter 22",
    relatedThemeId: "theme-3",
    userMeaning:
      "This captures the essence of self-education - the willingness to sit with confusion as part of learning.",
    isBookmarked: true,
    createdAt: "2024-02-10T15:00:00Z",
  },
];

const sampleFeed: FeedPost[] = [
  {
    id: "post-1",
    userId: "user-1",
    authorName: "Alex Chen",
    type: "theme",
    contentId: "theme-1",
    content: sampleThemes[0],
    caption:
      "This theme really made me reconsider how isolation can shape belief systems.",
    visibility: "global",
    likes: 12,
    isLiked: false,
    isSaved: false,
    createdAt: "2024-01-19T16:00:00Z",
  },
  {
    id: "post-2",
    userId: "user-2",
    authorName: "Sam Rivera",
    type: "vocab",
    contentId: "vocab-1",
    content: sampleVocab[0],
    caption: "New word I learned from Heretic. Such a powerful term.",
    visibility: "friends",
    likes: 5,
    isLiked: true,
    isSaved: false,
    createdAt: "2024-01-18T14:00:00Z",
  },
  {
    id: "post-3",
    userId: "user-1",
    authorName: "Alex Chen",
    type: "quote",
    contentId: "quote-2",
    content: sampleQuotes[1],
    caption:
      "This quote from Educated perfectly captures the learning journey.",
    visibility: "global",
    likes: 24,
    isLiked: false,
    isSaved: true,
    createdAt: "2024-02-11T09:00:00Z",
  },
];

export function seedData(): void {
  // Only seed if no data exists
  const existingMedia = storage.get<MediaItem[]>(STORAGE_KEYS.MEDIA);
  if (existingMedia && existingMedia.length > 0) return;

  storage.set(STORAGE_KEYS.USERS, sampleUsers);
  storage.set(STORAGE_KEYS.MEDIA, sampleMedia);
  storage.set(STORAGE_KEYS.THEMES, sampleThemes);
  storage.set(STORAGE_KEYS.FACTS, sampleFacts);
  storage.set(STORAGE_KEYS.VOCAB, sampleVocab);
  storage.set(STORAGE_KEYS.QUOTES, sampleQuotes);
  storage.set(STORAGE_KEYS.FEED, sampleFeed);
}
