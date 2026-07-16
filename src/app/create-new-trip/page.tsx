"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { detectMode } from "@/lib/indiaDetect";

const PREFERENCE_OPTIONS = ["Beaches", "Adventure", "Culture & Heritage", "Food", "Nightlife", "Relaxation", "Shopping"];

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

export default function CreateNewTripPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const generateItinerary = useAction(api.ai.generateItinerary);
  const createTrip = useMutation(api.trips.createTrip);

  const [destination, setDestination] = useState("");
  const [origin, setOrigin] = useState("");
  const [mode, setMode] = useState<"india" | "international">("india");
  const [modeTouched, setModeTouched] = useState(false);
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState("moderate");
  const [preferences, setPreferences] = useState<string[]>([]);

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function togglePreference(pref: string) {
    setPreferences((prev) => (prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]));
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      router.push("/login");
      return;
    }
    setError("");
    setLoading(true);
    setItinerary(null);
    try {
      const result = await generateItinerary({ destination, mode, days, budget, preferences });
      setItinerary(result as Itinerary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate itinerary");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!token || !itinerary) return;
    setSaving(true);
    setError("");
    try {
      const { tripId } = await createTrip({ token, destination, origin, mode, days, budget, preferences, itinerary });
      router.push(`/view-trip/${tripId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save trip");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-16 p-4 space-y-8">
      <h1 className="text-2xl font-bold">Plan a new trip</h1>

      <form onSubmit={handleGenerate} className="space-y-4">
        <input
          className="w-full border rounded p-2"
          placeholder="Destination (e.g. Goa, India)"
          value={destination}
          onChange={(e) => {
            const value = e.target.value;
            setDestination(value);
            if (!modeTouched) setMode(detectMode(value));
          }}
          required
        />

        <input className="w-full border rounded p-2" placeholder="Departure city (optional, e.g. Bengaluru)" value={origin} onChange={(e) => setOrigin(e.target.value)} />

        <select
          className="w-full border rounded p-2"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as "india" | "international");
            setModeTouched(true);
          }}
        >
          <option value="india">India</option>
          <option value="international">International</option>
        </select>
        <p className="text-xs text-gray-500 -mt-2">
          {modeTouched ? "Manually set" : `Auto-detected from destination: ${mode === "india" ? "India" : "International"}`}
        </p>

        <input className="w-full border rounded p-2" type="number" min={1} max={14} placeholder="Number of days" value={days} onChange={(e) => setDays(Number(e.target.value))} required />

        <select className="w-full border rounded p-2" value={budget} onChange={(e) => setBudget(e.target.value)}>
          <option value="budget">Budget</option>
          <option value="moderate">Moderate</option>
          <option value="luxury">Luxury</option>
        </select>

        <div className="flex flex-wrap gap-2">
          {PREFERENCE_OPTIONS.map((pref) => (
            <button type="button" key={pref} onClick={() => togglePreference(pref)}
              className={`px-3 py-1 rounded-full border text-sm ${preferences.includes(pref) ? "bg-black text-white" : "bg-white text-black"}`}>
              {pref}
            </button>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button disabled={loading} className="w-full bg-black text-white rounded p-2">
          {loading ? "Generating itinerary..." : "Generate itinerary"}
        </button>
      </form>

      {itinerary !== null && (
        <div className="space-y-6 border-t pt-6">
          <h2 className="text-xl font-bold">Preview</h2>

          {itinerary.days.map((day) => (
            <div key={day.day} className="border rounded-lg p-4 space-y-3">
              <div>
                <span className="text-xs font-semibold uppercase text-gray-400">Day {day.day}</span>
                <h3 className="text-lg font-semibold">{day.title}</h3>
                <p className="text-xs text-gray-500 mt-1">🏨 {day.hotelSuggestion}</p>
              </div>

              <div className="space-y-2">
                {day.activities.map((activity, i) => (
                  <div key={i} className="text-sm border-l-2 border-gray-200 pl-3">
                    <div className="flex justify-between font-medium">
                      <span>{activity.time} — {activity.name}</span>
                      <span className="text-gray-500">{activity.estimatedCost}</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5">{activity.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={handleSave} disabled={saving} className="w-full bg-green-600 text-white rounded p-2">
            {saving ? "Saving..." : "Save this trip"}
          </button>
        </div>
      )}
    </div>
  );
}