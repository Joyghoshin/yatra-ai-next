"use client";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";

export default function TestGroqPage() {
  const generateItinerary = useAction(api.ai.generateItinerary);
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleTest() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await generateItinerary({
        destination: "Goa, India",
        days: 3,
        budget: "moderate",
        preferences: ["beaches", "local food"],
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-20 p-4">
      <h1 className="text-2xl font-bold mb-4">Groq Itinerary Test</h1>
      <button onClick={handleTest} disabled={loading} className="bg-black text-white px-4 py-2 rounded">
        {loading ? "Generating..." : "Generate test itinerary (Goa, 3 days)"}
      </button>
      {error && <p className="text-red-500 mt-4 whitespace-pre-wrap">{error}</p>}
      {result !== null && (
        <pre className="mt-4 bg-gray-100 p-4 rounded text-xs overflow-auto text-black">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}