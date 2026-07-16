export const INTERNATIONAL_CITIES = [
  { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522, currency: "EUR", timezone: "Europe/Paris" },
  { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278, currency: "GBP", timezone: "Europe/London" },
  { name: "Dubai", country: "UAE", lat: 25.2048, lon: 55.2708, currency: "AED", timezone: "Asia/Dubai" },
  { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018, currency: "THB", timezone: "Asia/Bangkok" },
  { name: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198, currency: "SGD", timezone: "Asia/Singapore" },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503, currency: "JPY", timezone: "Asia/Tokyo" },
  { name: "Bali", country: "Indonesia", lat: -8.3405, lon: 115.0920, currency: "IDR", timezone: "Asia/Makassar" },
  { name: "New York", country: "USA", lat: 40.7128, lon: -74.0060, currency: "USD", timezone: "America/New_York" },
  { name: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041, currency: "EUR", timezone: "Europe/Amsterdam" },
  { name: "Zurich", country: "Switzerland", lat: 47.3769, lon: 8.5417, currency: "CHF", timezone: "Europe/Zurich" },
  { name: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964, currency: "EUR", timezone: "Europe/Rome" },
  { name: "Barcelona", country: "Spain", lat: 41.3851, lon: 2.1734, currency: "EUR", timezone: "Europe/Madrid" },
  { name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093, currency: "AUD", timezone: "Australia/Sydney" },
  { name: "Kuala Lumpur", country: "Malaysia", lat: 3.1390, lon: 101.6869, currency: "MYR", timezone: "Asia/Kuala_Lumpur" },
  { name: "Istanbul", country: "Turkey", lat: 41.0082, lon: 28.9784, currency: "TRY", timezone: "Europe/Istanbul" },
  { name: "Phuket", country: "Thailand", lat: 7.8804, lon: 98.3923, currency: "THB", timezone: "Asia/Bangkok" },
  { name: "Maldives", country: "Maldives", lat: 3.2028, lon: 73.2207, currency: "MVR", timezone: "Indian/Maldives" },
  { name: "Kathmandu", country: "Nepal", lat: 27.7172, lon: 85.3240, currency: "NPR", timezone: "Asia/Kathmandu" },
  { name: "Colombo", country: "Sri Lanka", lat: 6.9271, lon: 79.8612, currency: "LKR", timezone: "Asia/Colombo" },
  { name: "Cape Town", country: "South Africa", lat: -33.9249, lon: 18.4241, currency: "ZAR", timezone: "Africa/Johannesburg" },
] as const;

export type InternationalCity = {
  name: string;
  country: string;
  lat: number;
  lon: number;
  currency: string;
  timezone: string;
};