/**
 * Browser `localStorage` / `sessionStorage` shims backed by AsyncStorage.
 *
 * The web app reads the auth token synchronously while building request
 * headers, so we keep an in-memory mirror of everything that is persisted.
 * Reads hit the mirror (synchronous, like the browser) and writes are
 * forwarded to AsyncStorage in the background.
 *
 * `hydrateStorage()` must be awaited once during app bootstrap so the mirror
 * is populated before the first request goes out.
 *
 * IMPORTANT: the two tiers are **separate** stores, exactly like the browser.
 * They used to share one Map, which silently broke sign-in: `authService`
 * persists the session and then clears the *other* tier for hygiene
 * (`sessionStorage.removeItem("auth_token")` after a persistent write, and
 * vice-versa). With a shared Map that cleanup deleted the key that had just
 * been written, so the app looked signed in (React state held the user) while
 * every request went out without an `Authorization` header — the backend
 * answered `403 "Not authenticated"`. A full app reload "fixed" it because
 * `hydrateStorage()` re-read the token from AsyncStorage. Keep them apart.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const PERSISTED_PREFIX = "@zist/";

/** Persistent tier (`localStorage`): mirrored here *and* written to disk. */
const persistentMemory = new Map<string, string>();

/** Ephemeral tier (`sessionStorage`): process lifetime only, never persisted. */
const sessionMemory = new Map<string, string>();

/** Keys known to exist on disk, so `removeItem` doesn't hit AsyncStorage blindly. */
const persistedKeys = new Set<string>();

async function hydrate(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((key) => key.startsWith(PERSISTED_PREFIX));
    if (ours.length === 0) return;
    const entries = await AsyncStorage.multiGet(ours);
    for (const [key, value] of entries) {
      if (value == null) continue;
      const bare = key.slice(PERSISTED_PREFIX.length);
      persistentMemory.set(bare, value);
      persistedKeys.add(bare);
    }
  } catch (error) {
    console.warn("[storage] hydrate failed", error);
  }
}

let hydration: Promise<void> | null = null;

export function hydrateStorage(): Promise<void> {
  if (!hydration) hydration = hydrate();
  return hydration;
}

function makeStorage(memory: Map<string, string>, persistent: boolean) {
  return {
    getItem(key: string): string | null {
      return memory.has(key) ? (memory.get(key) as string) : null;
    },
    setItem(key: string, value: string): void {
      memory.set(key, value);
      if (persistent) {
        persistedKeys.add(key);
        void AsyncStorage.setItem(PERSISTED_PREFIX + key, value).catch(() => {});
      }
    },
    removeItem(key: string): void {
      memory.delete(key);
      if (persistent && persistedKeys.has(key)) {
        persistedKeys.delete(key);
        void AsyncStorage.removeItem(PERSISTED_PREFIX + key).catch(() => {});
      }
    },
    key(index: number): string | null {
      return Array.from(memory.keys())[index] ?? null;
    },
    get length(): number {
      return memory.size;
    },
    clear(): void {
      const keys = Array.from(memory.keys());
      memory.clear();
      if (!persistent) return;
      for (const key of keys) {
        if (persistedKeys.delete(key)) {
          void AsyncStorage.removeItem(PERSISTED_PREFIX + key).catch(() => {});
        }
      }
    },
  };
}

/** Persistent tier — survives app restarts (browser `localStorage`). */
export const localStorage = makeStorage(persistentMemory, true);

/** Ephemeral tier — cleared when the process dies (browser `sessionStorage`). */
export const sessionStorage = makeStorage(sessionMemory, false);

/** Remove every key the app has ever written, both tiers. */
export function clearAllStorage(): void {
  persistentMemory.clear();
  sessionMemory.clear();
  for (const key of Array.from(persistedKeys)) {
    persistedKeys.delete(key);
    void AsyncStorage.removeItem(PERSISTED_PREFIX + key).catch(() => {});
  }
}
