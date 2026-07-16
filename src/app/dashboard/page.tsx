"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-yellow-100 text-yellow-800",
  upcoming: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

export default function DashboardPage() {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const trips = useQuery(api.trips.listTrips, token ? { token } : "skip");

  useEffect(() => {
    if (token === null) router.push("/login");
  }, [token, router]);

  if (!token) return null;
  if (trips === undefined) return <p className="text-center mt-20">Loading your trips...</p>;

  return (
    <div className="max-w-3xl mx-auto mt-16 p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Trips</h1>
        <Link href="/create-new-trip" className="bg-black text-white px-4 py-2 rounded">
          + New Trip
        </Link>
      </div>

      {trips.length === 0 && <p className="text-gray-500">No trips yet. Plan your first one!</p>}

      <div className="space-y-3">
        {trips.map((trip) => (
          <Link
            key={trip._id}
            href={`/view-trip/${trip._id}`}
            className="block border rounded p-4 hover:border-black transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold capitalize">{trip.destination}</div>
                <div className="text-sm text-gray-500">
                  {trip.startDate} to {trip.endDate} &middot; {trip.budget}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[trip.status] ?? "bg-gray-100 text-gray-800"}`}>
                {trip.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}