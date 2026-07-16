import tzLookup from "tz-lookup";

export function getTimezoneFromCoords(lat: number, lng: number): string {
  try {
    return tzLookup(lat, lng);
  } catch {
    return "UTC";
  }
}

// Free, no-key geocoding via Nominatim (OpenStreetMap) — only used for the
// origin city text field, since we don't have coordinates for that already.
export async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  if (!city.trim()) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export function formatTimeInZone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    weekday: "short",
  }).format(new Date());
}

export function getOffsetHours(timeZone: string): number {
  const now = new Date();
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone }));
  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60));
}