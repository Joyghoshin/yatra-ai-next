"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import dynamic from "next/dynamic";
import NearbyPlaces from "@/components/NearbyPlaces";
import TripChatbot from "@/components/TripChatbot";
import ShareButton from "@/components/ShareButton";
import FlightSearchPanel from "@/components/FlightSearchPanel";
import PlaceThumbnail from "@/components/PlaceThumbnail";
import { OverpassPlace } from "@/lib/overpass";
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

export default function ViewTripPage() {
  const params = useParams();
  const tripId = params.tripId as Id<"trips">;

  const trip = useQuery(api.trips.getTrip, { tripId });

  const [activeDay, setActiveDay] = useState(1);
  const [nearbyPlaces, setNearbyPlaces] = useState<OverpassPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [showFlights, setShowFlights] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  function selectPlace(id: string) {
    setSelectedPlaceId(id);
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (trip === undefined) {
    return <div className="p-8 text-center text-gray-500">Loading your trip...</div>;
  }

  if (trip === null) {
    return <div className="p-8 text-center text-red-500">Trip not found.</div>;
  }

  const itinerary = trip.itinerary as Itinerary;
  const day: DayPlan =
    itinerary.days.find((d) => d.day === activeDay) ?? itinerary.days[0];

  function selectDay(dayNumber: number) {
    setActiveDay(dayNumber);
    setSelectedPlaceId(null);
    setNearbyPlaces([]);
    setShowFlights(false);
  }

  return (
    <div className="max-w-7xl mx-auto p-6 pb-24">
      <h1 className="text-2xl font-bold mb-1">{trip.destination}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {trip.startDate} – {trip.endDate} · {trip.budget} budget
      </p>

      {/* Action row: flights, share, PDF */}
      <div className="flex gap-3 flex-wrap mb-6 items-start">
        <button
          onClick={() => setShowFlights((v) => !v)}
          className={`text-sm px-4 py-2 rounded ${
            showFlights ? "bg-blue-800 text-white" : "bg-blue-600 text-white"
          }`}
        >
          ✈ {showFlights ? "Hide flights" : "Search flights"}
        </button>

        <ShareButton tripId={tripId} />

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

      {/* Day tabs */}
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

      {/* Two-column layout: left column shows either the activity list or
          (when toggled) the flight search panel — right column is the map +
          nearby places. Both columns start at the same y-position and use
          items-start so their tops line up regardless of content height. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column */}
        <div>
          {showFlights ? (
            <FlightSearchPanel
              destination={trip.destination}
              origin={trip.origin}
              date={trip.startDate}
              tripId={tripId}
            />
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-3">{day.title}</h2>
              <div className="space-y-3">
                {day.activities.map((a, i) => (
                  <div key={i} className="border rounded p-3 flex gap-3 items-start">
                    <PlaceThumbnail
                      query={`${a.name} ${trip.destination}`}
                      alt={a.name}
                      size={110}
                      source="wikipedia"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm font-medium">
                        <span>
                          {a.time} — {a.name}
                        </span>
                        <span className="text-gray-500 shrink-0 ml-2">{a.estimatedCost}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right column: map + nearby places (kept together since selecting
            a nearby place highlights it directly on the map) */}
        <div className="lg:sticky lg:top-6 min-w-0">
          <div ref={mapRef}>
            <ItineraryMap
              activities={day.activities}
              hotelLat={day.hotelLat}
              hotelLng={day.hotelLng}
              hotelName={day.hotelSuggestion}
              nearbyPlaces={nearbyPlaces}
              selectedPlaceId={selectedPlaceId}
            />
          </div>

          <NearbyPlaces
            lat={day.hotelLat}
            lng={day.hotelLng}
            onPlacesChange={setNearbyPlaces}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={selectPlace}
          />
        </div>
      </div>

      <TripChatbot destination={trip.destination} itinerary={itinerary} />
    </div>
  );
}