// Client-side cache/de-dup wrapper around the Convex action
// `api.images.getPlaceImage` (Unsplash-backed). Kept separate from the
// Convex action itself so this file has no React/hook dependency — the
// calling component passes in the action function it got from useAction().

export interface PlaceImage {
  thumbUrl: string;
  smallUrl: string;
  photographerName: string;
  photographerUrl: string;
  photoUrl: string;
}

export type PlaceImageAction = (args: { query: string }) => Promise<PlaceImage | null>;

const CACHE_KEY = "yatra-place-images-cache-v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — a representative photo doesn't need refreshing often

interface CacheEntry {
  data: PlaceImage | null;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<PlaceImage | null>>();
let hydrated = false;

function loadPersistedCache() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed: Record<string, CacheEntry> = JSON.parse(raw);
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (now - entry.timestamp < CACHE_TTL_MS) {
        memoryCache.set(key, entry);
      }
    }
  } catch {
    // Corrupt/unavailable localStorage — start empty.
  }
}

function persistCache() {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, CacheEntry> = {};
    for (const [key, entry] of memoryCache.entries()) {
      obj[key] = entry;
    }
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Storage full/unavailable — just won't persist across reloads.
  }
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  loadPersistedCache();
}

/**
 * Fetch a representative photo for a place/category search string via the
 * given Convex action, with a 7-day persisted cache and in-flight de-dup.
 * This is decorative, not critical data — any error is swallowed and treated
 * as "no image", never thrown, so a flaky Unsplash call never breaks the
 * surrounding list UI.
 */
export async function getPlaceImage(
  query: string,
  runAction: PlaceImageAction
): Promise<PlaceImage | null> {
  ensureHydrated();

  const key = query.trim().toLowerCase();
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = runAction({ query })
    .catch(() => null)
    .then((result) => {
      memoryCache.set(key, { data: result, timestamp: Date.now() });
      persistCache();
      return result;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}