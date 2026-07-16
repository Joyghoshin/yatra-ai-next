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

export default function NearbyPlaces({ lat, lng, onPlacesChange, selectedPlaceId, onSelectPlace }: NearbyPlacesProps) {
  const [activeCategory, setActiveCategory] = useState(PLACE_CATEGORIES[0].key);
  const [places, setPlaces] = useState<OverpassPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const category = PLACE_CATEGORIES.find((c) => c.key === activeCategory)!;
    const cacheKey = `${lat}_${lng}_${category.key}`;

    // Serve from cache instantly if we've already fetched this combo (unless it's an explicit retry).
    const cached = placesCache.get(cacheKey);
    if (cached && retryKey === 0) {
      setPlaces(cached);
      setError("");
      setLoading(false);
      onPlacesChange?.(cached);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    setLoading(true);
    setError("");
    setPlaces([]);
    onPlacesChange?.([]);

    debounceRef.current = setTimeout(() => {
      fetchNearbyPlaces(lat, lng, category)
        .then((result) => {
          placesCache.set(cacheKey, result);
          setPlaces(result);
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
      <h3 className="text-lg font-semibold mb-2">Nearby your hotel</h3>
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

      {loading && <p className="text-sm text-gray-500">Loading...</p>}
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
    </div>
  );
}