import { FeedPost, ThemeConcept, VocabItem, QuoteItem } from '@/types';
import { storage, STORAGE_KEYS } from './storage';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const generateId = () => Math.random().toString(36).substring(2, 15);

export const feedService = {
  async getPosts(filter?: 'friends' | 'global'): Promise<FeedPost[]> {
    await delay(400);
    let posts = storage.get<FeedPost[]>(STORAGE_KEYS.FEED) || [];

    if (filter) {
      posts = posts.filter((p) => p.visibility === filter);
    }

    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createPost(data: {
    type: 'theme' | 'vocab' | 'quote';
    content: ThemeConcept | VocabItem | QuoteItem;
    caption?: string;
    visibility: 'friends' | 'global';
    authorName: string;
    authorAvatar?: string;
  }): Promise<FeedPost> {
    await delay(600);
    const posts = storage.get<FeedPost[]>(STORAGE_KEYS.FEED) || [];
    const newPost: FeedPost = {
      id: generateId(),
      userId: 'current-user',
      authorName: data.authorName,
      authorAvatar: data.authorAvatar,
      type: data.type,
      contentId: (data.content as { id: string }).id,
      content: data.content,
      caption: data.caption,
      visibility: data.visibility,
      likes: 0,
      isLiked: false,
      isSaved: false,
      createdAt: new Date().toISOString(),
    };
    storage.set(STORAGE_KEYS.FEED, [...posts, newPost]);
    return newPost;
  },

  async likePost(postId: string): Promise<void> {
    await delay(200);
    const posts = storage.get<FeedPost[]>(STORAGE_KEYS.FEED) || [];
    const index = posts.findIndex((p) => p.id === postId);
    if (index !== -1) {
      posts[index].isLiked = !posts[index].isLiked;
      posts[index].likes += posts[index].isLiked ? 1 : -1;
      storage.set(STORAGE_KEYS.FEED, posts);
    }
  },

  async savePost(postId: string): Promise<void> {
    await delay(200);
    const posts = storage.get<FeedPost[]>(STORAGE_KEYS.FEED) || [];
    const index = posts.findIndex((p) => p.id === postId);
    if (index !== -1) {
      posts[index].isSaved = !posts[index].isSaved;
      storage.set(STORAGE_KEYS.FEED, posts);
    }
  },
};
