import { action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

const UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos";

// Returns a single representative photo for a place name/category search
// term, or null if Unsplash has nothing relevant. This is decorative, not
// critical data, so callers should treat null (or a thrown error) as "just
// don't show an image" rather than a hard failure.
export const getPlaceImage = action({
  args: { query: v.string() },
  handler: async (_ctx, { query }) => {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      throw new ConvexError({
        code: "CONFIG",
        message: "Convex is missing UNSPLASH_ACCESS_KEY — run `npx convex env set UNSPLASH_ACCESS_KEY=your_key`.",
      });
    }

    const url = `${UNSPLASH_SEARCH_URL}?query=${encodeURIComponent(query)}&per_page=1&orientation=squarish`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Client-ID ${accessKey}` },
        signal: controller.signal,
      });
    } catch (err) {
      throw new ConvexError({
        code: "NETWORK",
        message: err instanceof Error ? err.message : "Could not reach Unsplash.",
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 401) {
      throw new ConvexError({
        code: "CONFIG",
        message: "Unsplash rejected the access key — check UNSPLASH_ACCESS_KEY in Convex env.",
      });
    }
    if (res.status === 403) {
      throw new ConvexError({ code: "RATE_LIMITED", message: "Unsplash's hourly rate limit was reached." });
    }
    if (!res.ok) {
      throw new ConvexError({ code: "UPSTREAM", message: `Unsplash request failed (${res.status})` });
    }

    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return null;

    // Per Unsplash API guidelines: attribution (photographer name + link,
    // and a link back to Unsplash) must be visibly displayed wherever the
    // photo is shown — see PlaceThumbnail.tsx on the client for how these
    // fields get rendered.
    return {
      thumbUrl: result.urls.thumb as string,
      smallUrl: result.urls.small as string,
      photographerName: result.user.name as string,
      photographerUrl: result.user.links.html as string,
      photoUrl: result.links.html as string,
    };
  },
});