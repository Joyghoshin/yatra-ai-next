import { airports } from "@nwpr/airport-codes";

/**
 * Best-effort lookup of a city's primary IATA airport code.
 * Tries an exact city-name match first, then falls back to a
 * substring match (handles inputs like "Paris, France").
 * Returns null if nothing reasonable is found.
 */
export function findIataCode(place: string): string | null {
  const query = place.trim().toLowerCase();
  if (!query) return null;

  const exact = airports.find(
    (a) => a.city?.toLowerCase() === query && a.iata
  );
  if (exact?.iata) return exact.iata;

  const partial = airports.find(
    (a) =>
      a.iata &&
      a.city &&
      (query.includes(a.city.toLowerCase()) || a.city.toLowerCase().includes(query))
  );
  return partial?.iata ?? null;
}