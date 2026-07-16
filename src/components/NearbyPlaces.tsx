"use client";
import { useState, useEffect, useRef } from "react";
import { PLACE_CATEGORIES, fetchNearbyPlaces, formatDistance, OverpassPlace } from "@/lib/overpass";

interface NearbyPlacesProps {
  lat: number;
  lng: number;
  onPlacesChange?: (places: OverpassPlace[]) => void;
  selectedPlaceId?: number | null;
  onSelectPlace?: (id: number) => void;
}

// Module-level cache shared across renders/category switches within the same page load.
// Key: "lat_lng_categoryKey" -> results
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
    onPlacesChange?.([]);

    debounceRef.current = setTimeout(() => {
      fetchNearbyPlaces(lat, lng, category)
        .then((result) => {
          placesCache.set(cacheKey, result);
          setPlaces(result);
          setLastUpdated(new Date());
          onPlacesChange?.(result);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load nearby places"))
        .finally(() => setLoading(false));
    }, 350);

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