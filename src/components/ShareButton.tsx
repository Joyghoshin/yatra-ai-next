"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuthStore } from "@/store/authStore";

interface ShareButtonProps {
  tripId: Id<"trips">;
}

export default function ShareButton({ tripId }: ShareButtonProps) {
  const token = useAuthStore((s) => s.token);
  const generateShareLink = useMutation(api.trips.generateShareLink);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleShare() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const { shareId } = await generateShareLink({ token, tripId });
      const url = `${window.location.origin}/trip/share/${shareId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate share link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-block">
      <button onClick={handleShare} disabled={loading} className="text-sm bg-purple-600 text-white px-4 py-2 rounded">
        {loading ? "Generating..." : copied ? "Link copied!" : "Share trip"}
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}