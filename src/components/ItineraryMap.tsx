"use client";
import { useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { OverpassPlace, formatDistance } from "@/lib/overpass";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const SHADOW_URL = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
const COLOR_MARKER_BASE = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img";

function makeColorIcon(color: string) {
  return new L.Icon({
    iconUrl: `${COLOR_MARKER_BASE}/marker-icon-2x-${color}.png`,
    shadowUrl: SHADOW_URL,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

const hotelIcon = makeColorIcon("gold");
const nearbyIcon = makeColorIcon("grey");
const selectedNearbyIcon = makeColorIcon("red");

interface Activity {
  name: string;
  time: string;
  lat: number;
  lng: number;
}

interface ItineraryMapProps {
  activities: Activity[];
  hotelLat: number;
  hotelLng: number;
  hotelName: string;
  nearbyPlaces?: OverpassPlace[];
  selectedPlaceId?: number | null;
}

function FlyToSelected({
  selectedPlaceId,
  places,
  markerRefs,
}: {
  selectedPlaceId?: number | null;
  places: OverpassPlace[];
  markerRefs: React.MutableRefObject<Record<number, L.Marker | null>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (selectedPlaceId == null) return;
    const place = places.find((p) => p.id === selectedPlaceId);
    if (!place) return;
    map.flyTo([place.lat, place.lng], 16, { duration: 0.75 });
    const marker = markerRefs.current[place.id];
    if (marker) {
      setTimeout(() => marker.openPopup(), 400);
    }
  }, [selectedPlaceId, places, map, markerRefs]);
  return null;
}

export default function ItineraryMap({
  activities,
  hotelLat,
  hotelLng,
  hotelName,
  nearbyPlaces = [],
  selectedPlaceId = null,
}: ItineraryMapProps) {
  const points: [number, number][] = [
    [hotelLat, hotelLng],
    ...activities.map((a): [number, number] => [a.lat, a.lng]),
    [hotelLat, hotelLng],
  ];

  const markerRefs = useRef<Record<number, L.Marker | null>>({});

  return (
    <MapContainer center={[hotelLat, hotelLng]} zoom={13} style={{ width: "100%", height: "450px" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToSelected selectedPlaceId={selectedPlaceId} places={nearbyPlaces} markerRefs={markerRefs} />

      <Marker position={[hotelLat, hotelLng]} icon={hotelIcon}>
        <Popup>🏨 {hotelName} — starting point</Popup>
      </Marker>

      {activities.map((activity, i) => (
        <Marker key={`activity-${i}`} position={[activity.lat, activity.lng]}>
          <Popup>{activity.time} — {activity.name}</Popup>
        </Marker>
      ))}

      {nearbyPlaces.map((place) => (
        <Marker
          key={`nearby-${place.id}`}
          position={[place.lat, place.lng]}
          icon={place.id === selectedPlaceId ? selectedNearbyIcon : nearbyIcon}
          ref={(marker) => {
            markerRefs.current[place.id] = marker;
          }}
        >
          <Popup>{place.name} — {formatDistance(place.distanceMeters)} from hotel</Popup>
        </Marker>
      ))}

      <Polyline positions={points} pathOptions={{ color: "blue", weight: 3, opacity: 0.6 }} />
    </MapContainer>
  );
}