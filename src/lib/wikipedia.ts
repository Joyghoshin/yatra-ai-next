// Wikipedia's API is public, CORS-enabled (origin=* param), and needs no API
// key — so unlike Unsplash/Geoapify this can be called directly from the
// browser, no Convex action required. Only returns a real photo when the
// query resolves to an actual Wikipedia article, which in practice means:
// good coverage for named landmarks, poor/no coverage for small businesses.

export interface WikiImage {
  thumbUrl: string;
  pageUrl: string;
  title: string;
}

const CACHE_KEY = "yatra-wikipedia-image-cache-v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — landmark photos don't change

interface CacheEntry {
  data: WikiImage | null;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<WikiImage | null>>();
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

interface WikiPage {
  title: string;
  fullurl?: string;
  thumbnail?: { source: string; width: number; height: number };
}

async function fetchFromWikipedia(query: string): Promise<WikiImage | null> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&generator=search` +
    `&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1` +
    `&prop=pageimages|info&piprop=thumbnail&pithumbsize=400&inprop=url` +
    `&format=json&origin=*`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages as Record<string, WikiPage> | undefined;
    if (!pages) return null;

    const page = Object.values(pages)[0];
    if (!page?.thumbnail?.source || !page.fullurl) return null;

    return { thumbUrl: page.thumbnail.source, pageUrl: page.fullurl, title: page.title };
  } catch {
    return null; // decorative feature — fail silently, just show no image
  }
}

/**
 * Look up a real photo for a landmark/place name via Wikipedia, with a
 * 7-day persisted cache and in-flight de-dup. Returns null (not an error)
 * when there's no good match — this is expected for anything that isn't a
 * notable, named place.
 */
export async function getWikipediaImage(query: string): Promise<WikiImage | null> {
  ensureHydrated();

  const key = query.trim().toLowerCase();
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = fetchFromWikipedia(query)
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