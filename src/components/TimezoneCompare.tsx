"use client";
import { useState, useEffect } from "react";
import { getTimezoneFromCoords, geocodeCity, formatTimeInZone, getOffsetHours } from "@/lib/timezone";

interface TimezoneCompareProps {
  origin?: string;
  destLat: number;
  destLng: number;
  destinationLabel: string;
}

export default function TimezoneCompare({ origin, destLat, destLng, destinationLabel }: TimezoneCompareProps) {
  const [originTz, setOriginTz] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, forceTick] = useState(0);

  const destTz = getTimezoneFromCoords(destLat, destLng);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!origin) {
      setOriginTz(null);
      return;
    }
    setLoading(true);
    setError("");
    geocodeCity(origin)
      .then((coords) => {
        if (!coords) {
          setError("Couldn't find that city");
          return;
        }
        setOriginTz(getTimezoneFromCoords(coords.lat, coords.lng));
      })
      .catch(() => setError("Couldn't look up timezone"))
      .finally(() => setLoading(false));
  }, [origin]);

  if (!origin) return null;

  const originOffset = originTz ? getOffsetHours(originTz) : null;
  const destOffset = getOffsetHours(destTz);
  const diff = originOffset !== null ? destOffset - originOffset : null;

  return (
    <div className="mt-6 border rounded p-4 bg-white text-black">
      <h3 className="text-lg font-semibold mb-3">Time zones</h3>
      {loading && <p className="text-sm text-gray-500">Looking up {origin}...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {originTz && (
        <div className="flex justify-between items-center">
          <div>
            <div className="font-medium">{origin}</div>
            <div className="text-2xl">{formatTimeInZone(originTz)}</div>
          </div>
          <div className="text-center text-sm text-gray-500 px-2">
            {diff !== null && <span>{diff === 0 ? "Same time" : `${diff > 0 ? "+" : ""}${diff}h`}</span>}
          </div>
          <div className="text-right">
            <div className="font-medium capitalize">{destinationLabel}</div>
            <div className="text-2xl">{formatTimeInZone(destTz)}</div>
          </div>
        </div>
      )}
    </div>
  );
}