// Note: this file is still named overpass.ts (and OverpassPlace keeps its
// name) purely so every existing import across the app
// (NearbyPlaces.tsx, ItineraryMap.tsx, page.tsx) keeps working unchanged.
// Under the hood this now goes through the Convex action
// `api.places.getNearbyPlaces` (which calls the Geoapify Places API) instead
// of a Next.js API route — no more shared-IP rate limiting, and the API key
// lives in Convex env alongside your other integrations.

export interface OverpassPlace {
  id: string; // Geoapify place_id — a stable string, not a numeric OSM id
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
}

export interface PlaceCategory {
  key: string;
  label: string;
  icon: string;
  categories: string; // comma-separated Geoapify category keys
  radius: number;
}

export const PLACE_CATEGORIES: PlaceCategory[] = [
  { key: "restaurant", label: "Restaurants", icon: "🍴", categories: "catering.restaurant", radius: 1500 },
  { key: "cafe", label: "Cafés", icon: "☕", categories: "catering.cafe", radius: 1500 },
  { key: "hospital", label: "Hospitals", icon: "🏥", categories: "healthcare.hospital", radius: 3000 },
  { key: "atm", label: "ATMs", icon: "💰", categories: "service.financial.atm", radius: 1000 },
  {
    key: "metro",
    label: "Metro / Rail",
    icon: "🚇",
    categories: "public_transport.subway,public_transport.train",
    radius: 3000,
  },
  { key: "ev", label: "EV Charging", icon: "⚡", categories: "service.vehicle.charging_station", radius: 3000 },
];

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ---------------------------------------------------------------------------
// Persistent client-side cache (survives page reloads) + in-flight request
// de-dup + a cooldown window after a 429. This is now the PRIMARY defense
// against repeat/rapid requests, since the Convex action has no reliable
// server-side cache of its own (see places.ts).
// ---------------------------------------------------------------------------

const CACHE_KEY = "yatra-nearby-places-cache-v2";
const CACHE_TTL_MS = 15 * 60 * 1000;
const COOLDOWN_MS = 30 * 1000;

interface CacheEntry {
  data: OverpassPlace[];
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<OverpassPlace[]>>();
let cooldownUntil = 0;

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
    // Corrupt or unavailable localStorage — just start with an empty cache.
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
    // Storage full or unavailable — cache just won't persist across reloads.
  }
}

let hydrated = false;
function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  loadPersistedCache();
}

function cacheKey(lat: number, lng: number, category: PlaceCategory): string {
  return `${lat.toFixed(4)}_${lng.toFixed(4)}_${category.key}`;
}

export function isOnCooldown(): boolean {
  return Date.now() < cooldownUntil;
}

export function cooldownSecondsRemaining(): number {
  return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
}

export class RateLimitError extends Error {}

interface GeoapifyFeature {
  properties: { place_id: string; name?: string; address_line1?: string };
  geometry: { coordinates: [number, number] }; // [lon, lat]
}

interface GeoapifyResponse {
  features: GeoapifyFeature[];
}

// The shape of the Convex action `api.places.getNearbyPlaces`, as returned
// by useAction(...) in the calling component. Passed in rather than imported
// directly so this file doesn't need to know about React hooks.
export type NearbyPlacesAction = (args: {
  lat: number;
  lng: number;
  categories: string;
  radius: number;
}) => Promise<GeoapifyResponse>;

function convexErrorData(err: unknown): { code?: string; message?: string } | null {
  // Convex's ConvexError attaches the thrown payload as `.data` on the
  // client-side error. Duck-typed here so this file doesn't need to import
  // convex/values just to check `instanceof ConvexError`.
  const data = (err as { data?: unknown } | undefined)?.data;
  if (data && typeof data === "object") return data as { code?: string; message?: string };
  return null;
}

async function fetchFromApi(
  lat: number,
  lng: number,
  category: PlaceCategory,
  runAction: NearbyPlacesAction
): Promise<OverpassPlace[]> {
  let data: GeoapifyResponse;
  try {
    data = await runAction({ lat, lng, categories: category.categories, radius: category.radius });
  } catch (err) {
    const errData = convexErrorData(err);
    if (errData?.code === "RATE_LIMITED") {
      cooldownUntil = Date.now() + COOLDOWN_MS;
      throw new RateLimitError(errData.message || "Too many requests right now — please wait and try again.");
    }
    throw new Error(errData?.message || (err instanceof Error ? err.message : "Failed to load nearby places"));
  }

  const features = data.features ?? [];

  return features
    .map((f) => {
      const [placeLng, placeLat] = f.geometry.coordinates;
      return {
        id: f.properties.place_id,
        name: f.properties.name || f.properties.address_line1 || category.label.replace(/s$/, ""),
        lat: placeLat,
        lng: placeLng,
        distanceMeters: haversineMeters(lat, lng, placeLat, placeLng),
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 15);
}

/**
 * Fetch nearby places for a hotel + category via the given Convex action,
 * transparently using a 15-minute persisted cache and de-duplicating
 * concurrent requests for the same key. Throws RateLimitError (distinct from
 * a generic Error) if we're rate limited, so callers can show a cooldown
 * countdown instead of a plain retry.
 */
export async function getNearbyPlaces(
  lat: number,
  lng: number,
  category: PlaceCategory,
  runAction: NearbyPlacesAction,
  options: { forceRefresh?: boolean } = {}
): Promise<OverpassPlace[]> {
  ensureHydrated();

  if (isOnCooldown()) {
    throw new RateLimitError(
      `Too many requests right now — please wait ${cooldownSecondsRemaining()}s and try again.`
    );
  }

  const key = cacheKey(lat, lng, category);

  if (!options.forceRefresh) {
    const cached = memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = fetchFromApi(lat, lng, category, runAction)
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

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}