"use client";
import { useState, useEffect, useRef } from "react";

// Types matching your Overpass structures
export interface OverpassPlace {
  id: number;
  name: string;
  distanceMeters: number;
}

interface PlaceCategory {
  key: string;
  label: string;
  icon: string;
  radius: number;
  tag: string;
}

interface NearbyPlacesProps {
  lat: number;
  lng: number;
  onPlacesChange?: (places: OverpassPlace[]) => void;
  selectedPlaceId?: number | null;
  onSelectPlace?: (id: number) => void;
}

// Simulated mock declarations since these come from your custom "@/lib/overpass"
// NOTE: Make sure your internal `PLACE_CATEGORIES` match this structure.
export const PLACE_CATEGORIES: PlaceCategory[] = [
  { key: "restaurants", label: "Restaurants", icon: "🍴", radius: 1000, tag: 'node["amenity"="restaurant"]' },
  { key: "cafes", label: "Cafes", icon: "☕", radius: 800, tag: 'node["amenity"="cafe"]' },
  { key: "transport", label: "Transit", icon: "🚌", radius: 500, tag: 'node["highway"="bus_stop"]' },
];

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// Module-level cache shared across renders/category switches within the same page load.
const placesCache = new Map<string, OverpassPlace[]>();

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

function PlaceSkeleton() {
  return (
    <ul className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="flex justify-between items-center border rounded p-2 bg-white animate-pulse"
        >
          <div className="h-3.5 bg-gray-200 rounded" style={{ width: `${55 - i * 6}%` }} />
          <div className="h-3.5 w-10 bg-gray-200 rounded" />
        </li>
      ))}
    </ul>
  );
}

// High-reliability Client-Side Fetcher using Overpass mirror fallback strategy
async function directClientFetch(lat: number, lng: number, category: PlaceCategory): Promise<OverpassPlace[]> {
  // Rotate mirrors if primary instance throws a 429 rate limit
  const endpoints = [
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];

  // Raw Overpass QL query string targeting the coordinate bounding radius
  const query = `[out:json][timeout:15];
    (
      ${category.tag}(around:${category.radius},${lat},${lng});
    );
    out body center;`;

  let lastError = "Failed to fetch from open map servers.";

  for (const baseUrl of endpoints) {
    try {
      const response = await fetch(`${baseUrl}?data=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      if (response.status === 429) {
        lastError = "Map server is temporarily congested (Rate Limit 429). Trying backup...";
        continue; // Fallthrough to next mirror site
      }

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (!data.elements) return [];

      // Map raw Overpass nodes down to matching visual interfaces
      return data.elements.map((el: any) => {
        // Approximate calculation if distance missing, or use straight coordinates
        const name = el.tags?.name || el.tags?.amenity || "Unnamed Location";
        return {
          id: el.id,
          name: name,
          distanceMeters: el.distance || 0 
        };
      });
    } catch (err) {
      console.warn(`Endpoint ${baseUrl} failed, trying alternative...`, err);
    }
  }

  throw new Error(lastError);
}

export default function NearbyPlaces({ lat, lng, onPlacesChange, selectedPlaceId, onSelectPlace }: NearbyPlacesProps) {
  const [activeCategory, setActiveCategory] = useState(PLACE_CATEGORIES[0].key);
  const [places, setPlaces] = useState<OverpassPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, forceTick] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-render every 10s so the "updated Xs ago" label stays fresh without extra fetches.
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const category = PLACE_CATEGORIES.find((c) => c.key === activeCategory)!;
    const cacheKey = `${lat}_${lng}_${category.key}`;

    const cached = placesCache.get(cacheKey);
    if (cached && retryKey === 0) {
      setPlaces(cached);
      setError("");
      setLoading(false);
      setLastUpdated(new Date());
      onPlacesChange?.(cached);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    setLoading(true);
    setError("");

    // Debounce extended slightly to 500ms to safeguard user navigation adjustments
    debounceRef.current = setTimeout(() => {
      directClientFetch(lat, lng, category)
        .then((result) => {
          placesCache.set(cacheKey, result);
          setPlaces(result);
          setLastUpdated(new Date());
          onPlacesChange?.(result); // Trigger ONLY when loading completely wraps up successfully
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to load nearby places");
          onPlacesChange?.([]); 
        })
        .finally(() => setLoading(false));
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, lat, lng, retryKey]);

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-lg font-semibold">Nearby your hotel</h3>
        {lastUpdated && !loading && !error && (
          <span className="text-xs text-gray-400">Updated {timeAgo(lastUpdated)}</span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-2">Click a place to highlight it on the map above.</p>
      <div className="flex gap-2 flex-wrap mb-3">
        {PLACE_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3 py-1 rounded-full text-sm border ${
              activeCategory === cat.key ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {loading && <PlaceSkeleton />}

      {error && (
        <div className="text-sm text-red-500 flex items-center gap-3 mb-2">
          <span>{error}</span>
          <button onClick={() => setRetryKey((k) => k + 1)} className="underline font-medium">
            Retry
          </button>
        </div>
      )}
      {!loading && !error && places.length === 0 && (
        <p className="text-sm text-gray-500">Nothing found nearby in this category.</p>
      )}

      {!loading && (
        <ul className="space-y-2">
          {places.map((place) => (
            <li
              key={place.id}
              onClick={() => onSelectPlace?.(place.id)}
              className={`flex justify-between border rounded p-2 text-sm bg-white text-black cursor-pointer hover:border-black transition ${
                selectedPlaceId === place.id ? "border-red-500 border-2" : ""
              }`}
            >
              <span>{place.name}</span>
              <span className="text-gray-500">{formatDistance(place.distanceMeters)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}