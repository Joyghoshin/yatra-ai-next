"use client";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { OverpassPlace, formatDistance } from "@/lib/overpass";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// A distinct gold/orange marker for the hotel, so it's visually obvious
// which pin is the starting point vs. the surrounding places.
const hotelIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x-gold.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface NearbyPlacesMapProps {
  hotelLat: number;
  hotelLng: number;
  places: OverpassPlace[];
}

export default function NearbyPlacesMap({ hotelLat, hotelLng, places }: NearbyPlacesMapProps) {
  return (
    <MapContainer center={[hotelLat, hotelLng]} zoom={14} style={{ width: "100%", height: "300px" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[hotelLat, hotelLng]} icon={hotelIcon}>
        <Popup>🏨 Your hotel — starting point</Popup>
      </Marker>
      <Circle center={[hotelLat, hotelLng]} radius={500} pathOptions={{ color: "orange", fillOpacity: 0.05 }} />
      {places.map((place) => (
        <Marker key={place.id} position={[place.lat, place.lng]}>
          <Popup>{place.name} — {formatDistance(place.distanceMeters)} from hotel</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}