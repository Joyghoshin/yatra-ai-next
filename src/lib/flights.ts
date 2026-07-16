import { findIataCode } from "@/lib/airports";

function toSkyscannerDate(isoDate: string): string {
  const d = new Date(isoDate);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

function readableDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function fallbackSearchUrl(destination: string, origin: string | undefined, date: string): string {
  const query = origin
    ? `flights from ${origin} to ${destination} on ${readableDate(date)}`
    : `flights to ${destination} on ${readableDate(date)}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Builds a flight search URL for the trip.
 * When both origin and destination resolve to a known IATA code,
 * this deep-links straight into Skyscanner with everything prefilled.
 * Otherwise it falls back to a plain Google Search query.
 */
export function buildFlightSearchUrl(
  destination: string,
  origin: string | undefined,
  date: string
): string {
  if (!origin) {
    return fallbackSearchUrl(destination, origin, date);
  }

  const destCode = findIataCode(destination);
  const originCode = findIataCode(origin);

  if (destCode && originCode) {
    const skyDate = toSkyscannerDate(date);
    return `https://www.skyscanner.net/transport/flights/${originCode.toLowerCase()}/${destCode.toLowerCase()}/${skyDate}/`;
  }

  return fallbackSearchUrl(destination, origin, date);
}