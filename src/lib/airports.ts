import { airports } from "@nwpr/airport-codes";

// The underlying @nwpr/airport-codes dataset (OurAirports-derived) still lists
// some airports under a city's OLD official name, even after the city itself
// was renamed. "Bengaluru" is a real example: the airport is only tagged
// city="Bangalore" in the data, and a plain substring match can't bridge two
// differently-spelled names for the same city. This alias map is checked
// first so renamed cities still resolve correctly.
const CITY_ALIASES: Record<string, string> = {
  "bengaluru": "bangalore",
  "mumbai": "bombay",
  "chennai": "madras",
  "kolkata": "calcutta",
  "kochi": "cochin",
  "thiruvananthapuram": "trivandrum",
  "varanasi": "benares",
};

/**
 * Best-effort lookup of a city's primary IATA airport code.
 * Tries an exact city-name match first, then a known-alias match (for
 * cities renamed after the airport dataset was built), then falls back to a
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

  const aliasTarget = CITY_ALIASES[query];
  if (aliasTarget) {
    const aliasMatch = airports.find(
      (a) => a.city?.toLowerCase() === aliasTarget && a.iata
    );
    if (aliasMatch?.iata) return aliasMatch.iata;
  }

  const partial = airports.find(
    (a) =>
      a.iata &&
      a.city &&
      (query.includes(a.city.toLowerCase()) || a.city.toLowerCase().includes(query))
  );
  return partial?.iata ?? null;
}