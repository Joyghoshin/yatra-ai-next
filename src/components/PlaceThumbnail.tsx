"use client";
import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getPlaceImage } from "@/lib/unsplash";
import { getWikipediaImage } from "@/lib/wikipedia";

interface PlaceThumbnailProps {
  query: string;
  alt: string;
  size?: number;
  /**
   * "wikipedia" — a real photo of the actual place, but only exists for
   * notable, named landmarks (works well for itinerary activities).
   * "unsplash" (default) — a decorative, representative photo matching the
   * search terms, not necessarily of the exact place (works for anything,
   * including small businesses in Nearby Places, but isn't the real thing).
   */
  source?: "wikipedia" | "unsplash";
  /**
   * Unsplash-only: a broader, more generic query to retry if the specific
   * one (e.g. "Bistro Monadnock Restaurants") finds nothing — usually just
   * the category name (e.g. "Restaurants"), which almost always has stock
   * photos available even when the specific place name doesn't.
   */
  fallbackQuery?: string;
}

interface ResolvedImage {
  thumbUrl: string;
  linkUrl: string | null;
  creditLabel: string;
  creditUrl: string;
}

export default function PlaceThumbnail({ query, alt, size = 72, source = "unsplash", fallbackQuery }: PlaceThumbnailProps) {
  const unsplashAction = useAction(api.images.getPlaceImage);
  const [image, setImage] = useState<ResolvedImage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      if (source === "wikipedia") {
        const result = await getWikipediaImage(query);
        if (cancelled) return;
        setImage(
          result
            ? { thumbUrl: result.thumbUrl, linkUrl: result.pageUrl, creditLabel: "Wikipedia", creditUrl: result.pageUrl }
            : null
        );
      } else {
        let result = await getPlaceImage(query, unsplashAction);
        if (!result && fallbackQuery) {
          result = await getPlaceImage(fallbackQuery, unsplashAction);
        }
        if (cancelled) return;
        setImage(
          result
            ? {
                thumbUrl: result.thumbUrl,
                // Intentionally not linking out to Unsplash on click — the
                // photo isn't of the actual place, so clicking through to
                // Unsplash's page for it isn't useful here. Attribution is
                // still shown via the credit line below, per Unsplash's
                // guidelines, just without making the image itself a link.
                linkUrl: null,
                creditLabel: result.photographerName,
                creditUrl: `${result.photographerUrl}?utm_source=yatra_ai&utm_medium=referral`,
              }
            : null
        );
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, source, fallbackQuery]);

  if (loading) {
    return <div className="shrink-0 rounded bg-gray-800 animate-pulse" style={{ width: size, height: size }} />;
  }

  if (!image) {
    return (
      <div
        className="shrink-0 rounded bg-gray-800 flex items-center justify-center text-gray-500 text-xs"
        style={{ width: size, height: size }}
      >
        🖼️
      </div>
    );
  }

  const img = (
    <img
      src={image.thumbUrl}
      alt={alt}
      width={size}
      height={size}
      className="rounded object-cover"
      style={{ width: size, height: size }}
    />
  );

  return (
    <div className="shrink-0" style={{ width: size }}>
      {image.linkUrl ? (
        <a href={image.linkUrl} target="_blank" rel="noopener noreferrer">
          {img}
        </a>
      ) : (
        img
      )}
      <a
        href={image.creditUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-[9px] text-gray-500 truncate hover:underline"
        style={{ maxWidth: size }}
      >
        📷 {image.creditLabel}
      </a>
    </div>
  );
}