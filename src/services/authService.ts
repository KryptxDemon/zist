import { User } from '@/types';
import { storage, STORAGE_KEYS } from './storage';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const generateId = () => Math.random().toString(36).substring(2, 15);

export const authService = {
  async login(email: string, password: string, rememberMe: boolean): Promise<{ user: User; token: string }> {
    await delay(800);

    if (password.length < 6) {
      throw new Error('Invalid credentials');
    }

    const user: User = {
      id: generateId(),
      email,
      displayName: email.split('@')[0],
      createdAt: new Date().toISOString(),
      preferences: {
        privacy: 'public',
        theme: 'night-cold',
      },
    };

    const token = `token_${generateId()}`;

    if (rememberMe) {
      storage.set(STORAGE_KEYS.USER, user);
      storage.set(STORAGE_KEYS.TOKEN, token);
    }

    return { user, token };
  },

  async signup(email: string, password: string, displayName: string): Promise<{ user: User; token: string }> {
    await delay(1000);

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const user: User = {
      id: generateId(),
      email,
      displayName,
      createdAt: new Date().toISOString(),
      preferences: {
        privacy: 'public',
        theme: 'night-cold',
      },
    };

    const token = `token_${generateId()}`;

    storage.set(STORAGE_KEYS.USER, user);
    storage.set(STORAGE_KEYS.TOKEN, token);

    return { user, token };
  },

  async logout(): Promise<void> {
    await delay(300);
    storage.remove(STORAGE_KEYS.USER);
    storage.remove(STORAGE_KEYS.TOKEN);
  },

  getStoredAuth(): { user: User | null; token: string | null } {
    return {
      user: storage.get<User>(STORAGE_KEYS.USER),
      token: storage.get<string>(STORAGE_KEYS.TOKEN),
    };
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    await delay(500);
    const currentUser = storage.get<User>(STORAGE_KEYS.USER);
    if (!currentUser) throw new Error('Not authenticated');

    const updatedUser = { ...currentUser, ...updates };
    storage.set(STORAGE_KEYS.USER, updatedUser);
    return updatedUser;
  },
};
