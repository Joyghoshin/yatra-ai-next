export interface Activity {
  time: string;
  name: string;
  description: string;
  estimatedCost: string;
  lat: number;
  lng: number;
}

export interface DayPlan {
  day: number;
  title: string;
  activities: Activity[];
  hotelSuggestion: string;
  hotelLat: number;
  hotelLng: number;
}

export interface Itinerary {
  destination: string;
  totalDays: number;
  days: DayPlan[];
}

export function buildTripContext(destination: string, itinerary: Itinerary): string {
  const lines: string[] = [`Trip destination: ${destination}`, `Total days: ${itinerary.totalDays}`];
  itinerary.days.forEach((day) => {
    lines.push(`\nDay ${day.day} — ${day.title}. Hotel: ${day.hotelSuggestion}.`);
    day.activities.forEach((a) => {
      lines.push(`  ${a.time} — ${a.name} (${a.estimatedCost}): ${a.description}`);
    });
  });
  return lines.join("\n");
}