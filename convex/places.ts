import { action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

const GEOAPIFY_PLACES_URL = "https://api.geoapify.com/v2/places";

// Note: unlike the old Next.js API route, this action has no reliable
// in-memory cache or global throttle across invocations — Convex doesn't
// guarantee warm-instance reuse the way a long-running Node server does.
// That's fine: the client-side cache in lib/overpass.ts (15-minute
// localStorage cache + in-flight de-dup) already absorbs the vast majority
// of repeat requests, so the actual hit rate against Geoapify is low even
// without a server-side cache here.
export const getNearbyPlaces = action({
  args: {
    lat: v.number(),
    lng: v.number(),
    categories: v.string(),
    radius: v.number(),
  },
  handler: async (_ctx, { lat, lng, categories, radius }) => {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      throw new ConvexError({
        code: "CONFIG",
        message: "Convex is missing GEOAPIFY_API_KEY — run `npx convex env set GEOAPIFY_API_KEY=your_key`.",
      });
    }

    const url =
      `${GEOAPIFY_PLACES_URL}?categories=${encodeURIComponent(categories)}` +
      `&filter=circle:${lng},${lat},${radius}` +
      `&bias=proximity:${lng},${lat}` +
      `&limit=15&apiKey=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (err) {
      throw new ConvexError({
        code: "NETWORK",
        message: err instanceof Error ? err.message : "Could not reach Geoapify.",
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 429) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "Too many requests right now — please wait about 30 seconds and try again.",
      });
    }
    if (res.status === 401) {
      throw new ConvexError({
        code: "CONFIG",
        message: "Geoapify rejected the API key — check GEOAPIFY_API_KEY in Convex env.",
      });
    }
    if (!res.ok) {
      throw new ConvexError({ code: "UPSTREAM", message: `Geoapify request failed (${res.status})` });
    }

    return await res.json();
  },
});