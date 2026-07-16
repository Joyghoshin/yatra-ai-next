"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { api } from "../../../../../convex/_generated/api";
import NearbyPlaces from "@/components/NearbyPlaces";
import { OverpassPlace } from "@/lib/overpass";
import { buildFlightSearchUrl } from "@/lib/flights";
import { generateTripPdf } from "@/lib/pdfExport";

const ItineraryMap = dynamic(() => import("@/components/ItineraryMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] flex items-center justify-center bg-gray-100 text-gray-400 text-sm rounded">
      Loading map...
    </div>
  ),
});

interface Activity {
  time: string;
  name: string;
  description: string;
  estimatedCost: string;
  lat: number;
  lng: number;
}

interface DayPlan {
  day: number;
  title: string;
  activities: Activity[];
  hotelSuggestion: string;
  hotelLat: number;
  hotelLng: number;
}

interface Itinerary {
  destination: string;
  totalDays: number;
  days: DayPlan[];
}

export default function SharedTripPage() {
  const params = useParams();
  const shareId = params.shareId as string;

  const trip = useQuery(api.trips.getTripByShareId, { shareId });

  const [activeDay, setActiveDay] = useState(1);
  const [nearbyPlaces, setNearbyPlaces] = useState<OverpassPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);

  if (trip === undefined) {
    return <div className="p-8 text-center text-gray-500">Loading trip...</div>;
  }

  if (trip === null) {
    return <div className="p-8 text-center text-red-500">This share link is invalid or has expired.</div>;
  }

  const itinerary = trip.itinerary as Itinerary;
  const day: DayPlan =
    itinerary.days.find((d) => d.day === activeDay) ?? itinerary.days[0];

  function selectDay(dayNumber: number) {
    setActiveDay(dayNumber);
    setSelectedPlaceId(null);
    setNearbyPlaces([]);
  }

  return (
    <div className="max-w-5xl mx-auto p-6 pb-24">
      <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Shared trip</div>
      <h1 className="text-2xl font-bold mb-1">{trip.destination}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {trip.startDate} – {trip.endDate} · {trip.budget} budget
      </p>

      <div className="flex gap-3 flex-wrap mb-6">
        <a
          href={buildFlightSearchUrl(trip.destination, trip.origin, trip.startDate)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded"
        >
          ✈ Search flights
        </a>

        <button
          onClick={() =>
            generateTripPdf({
              destination: trip.destination,
              origin: trip.origin,
              startDate: trip.startDate,
              endDate: trip.endDate,
              budget: trip.budget ?? "moderate",
              itinerary,
            })
          }
          className="text-sm bg-gray-800 text-white px-4 py-2 rounded"
        >
          ⬇ Export PDF
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {itinerary.days.map((d) => (
          <button
            key={d.day}
            onClick={() => selectDay(d.day)}
            className={`px-4 py-2 rounded-full text-sm border ${
              activeDay === d.day ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            Day {d.day}
          </button>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-3">{day.title}</h2>

      <ItineraryMap
        key={activeDay}
        activities={day.activities}
        hotelLat={day.hotelLat}
        hotelLng={day.hotelLng}
        hotelName={day.hotelSuggestion}
        nearbyPlaces={nearbyPlaces}
        selectedPlaceId={selectedPlaceId}
      />

      <div className="mt-6 space-y-3">
        {day.activities.map((a, i) => (
          <div key={i} className="border rounded p-3">
            <div className="flex justify-between text-sm font-medium">
              <span>
                {a.time} — {a.name}
              </span>
              <span className="text-gray-500">{a.estimatedCost}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{a.description}</p>
          </div>
        ))}
      </div>

      <NearbyPlaces
        lat={day.hotelLat}
        lng={day.hotelLng}
        onPlacesChange={setNearbyPlaces}
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={setSelectedPlaceId}
      />
    </div>
  );
}