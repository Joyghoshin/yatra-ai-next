"use client";
import { useState, useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  PLACE_CATEGORIES,
  getNearbyPlaces,
  formatDistance,
  OverpassPlace,
  RateLimitError,
  cooldownSecondsRemaining,
} from "@/lib/overpass";

interface NearbyPlacesProps {
  lat: number;
  lng: number;
  onPlacesChange?: (places: OverpassPlace[]) => void;
  selectedPlaceId?: string | null;
  onSelectPlace?: (id: string) => void;
}

export default function NearbyPlaces({ lat, lng, onPlacesChange, selectedPlaceId, onSelectPlace }: NearbyPlacesProps) {
  const nearbyPlacesAction = useAction(api.places.getNearbyPlaces);

  const [activeCategory, setActiveCategory] = useState(PLACE_CATEGORIES[0].key);
  const [places, setPlaces] = useState<OverpassPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rateLimited, setRateLimited] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!rateLimited) return;
    setCooldownLeft(cooldownSecondsRemaining());
    const interval = setInterval(() => {
      const remaining = cooldownSecondsRemaining();
      setCooldownLeft(remaining);
      if (remaining <= 0) {
        setRateLimited(false);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimited]);

  useEffect(() => {
    const category = PLACE_CATEGORIES.find((c) => c.key === activeCategory)!;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    setLoading(true);
    setError("");
    setRateLimited(false);

    const thisRequestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(() => {
      getNearbyPlaces(lat, lng, category, nearbyPlacesAction, { forceRefresh: retryKey > 0 })
        .then((result) => {
          if (requestIdRef.current !== thisRequestId) return;
          setPlaces(result);
          onPlacesChange?.(result);
        })
        .catch((err) => {
          if (requestIdRef.current !== thisRequestId) return;
          if (err instanceof RateLimitError) {
            setRateLimited(true);
            setError(err.message);
          } else {
            setError(err instanceof Error ? err.message : "Failed to load nearby places");
          }
        })
        .finally(() => {
          if (requestIdRef.current === thisRequestId) setLoading(false);
        });
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
            disabled={rateLimited}
            className={`px-3 py-1 rounded-full text-sm border disabled:opacity-40 disabled:cursor-not-allowed ${
              activeCategory === cat.key ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {loading && !rateLimited && <p className="text-sm text-gray-500">Loading...</p>}

      {error && (
        <div className="text-sm text-red-500 flex items-center gap-3 mb-2">
          <span>
            {rateLimited && cooldownLeft > 0
              ? `Too many requests right now — please wait ${cooldownLeft}s and try again.`
              : error}
          </span>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            disabled={rateLimited && cooldownLeft > 0}
            className="underline font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
          >
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