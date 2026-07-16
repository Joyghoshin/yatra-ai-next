export interface OverpassPlace {
  id: number;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
}

export interface PlaceCategory {
  key: string;
  label: string;
  icon: string;
  tag: string;
  radius: number;
}

export const PLACE_CATEGORIES: PlaceCategory[] = [
  { key: "restaurant", label: "Restaurants", icon: "🍴", tag: 'amenity"="restaurant', radius: 1500 },
  { key: "cafe", label: "Cafés", icon: "☕", tag: 'amenity"="cafe', radius: 1500 },
  { key: "hospital", label: "Hospitals", icon: "🏥", tag: 'amenity"="hospital', radius: 3000 },
  { key: "atm", label: "ATMs", icon: "💰", tag: 'amenity"="atm', radius: 1000 },
  { key: "metro", label: "Metro / Rail", icon: "🚇", tag: 'railway"="station', radius: 3000 },
  { key: "ev", label: "EV Charging", icon: "⚡", tag: 'amenity"="charging_station', radius: 3000 },
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

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  category: PlaceCategory
): Promise<OverpassPlace[]> {
  const res = await fetch("/api/nearby-places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng, tag: category.tag, radius: category.radius }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  const elements: { id: number; lat: number; lon: number; tags?: { name?: string; operator?: string; brand?: string } }[] =
    data.elements ?? [];

  return elements
    .map((el) => ({
      id: el.id,
      name: el.tags?.name || el.tags?.operator || el.tags?.brand || category.label.replace(/s$/, ""),
      lat: el.lat,
      lng: el.lon,
      distanceMeters: haversineMeters(lat, lng, el.lat, el.lon),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 15);
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}