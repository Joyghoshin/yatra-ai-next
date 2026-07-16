import { NextRequest, NextResponse } from "next/server";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

export async function POST(req: NextRequest) {
  const { lat, lng, tag, radius } = await req.json();

  if (typeof lat !== "number" || typeof lng !== "number" || !tag || !radius) {
    return NextResponse.json({ error: "Missing or invalid parameters" }, { status: 400 });
  }

  const query = `[out:json][timeout:25];node["${tag}"](around:${radius},${lat},${lng});out body;`;

  let lastError: string | null = null;
  let wasRateLimited = false;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(endpoint, {
        method: "POST",
        body: query,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 429) {
        wasRateLimited = true;
        continue;
      }
      if (!res.ok) {
        lastError = `Overpass request failed (${res.status})`;
        continue;
      }

      const data = await res.json();
      return NextResponse.json(data);
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown Overpass error";
    }
  }

  if (wasRateLimited) {
    return NextResponse.json(
      { error: "Too many requests right now — please wait about 30 seconds and try again." },
      { status: 429 }
    );
  }

  return NextResponse.json({ error: lastError ?? "All Overpass endpoints failed" }, { status: 502 });
}