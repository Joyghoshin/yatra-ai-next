"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

const DUFFEL_BASE_URL = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";

function duffelHeaders() {
  const key = process.env.DUFFEL_API_KEY;
  if (!key) {
    throw new Error(
      "DUFFEL_API_KEY is not set in Convex environment variables. " +
      "Add it under your Convex dashboard → Settings → Environment Variables."
    );
  }
  return {
    Authorization: `Bearer ${key}`,
    "Duffel-Version": DUFFEL_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// ── Local-currency conversion (mirrors the SkyBot Python implementation) ──
const AIRPORT_TO_CURRENCY: Record<string, string> = {
  DEL: "INR", BOM: "INR", BLR: "INR",
  JFK: "USD", LAX: "USD", ORD: "USD",
  LHR: "GBP",
  CDG: "EUR", FRA: "EUR", AMS: "EUR",
  DXB: "AED", AUH: "AED",
  NRT: "JPY", HND: "JPY",
  SIN: "SGD",
  SYD: "AUD",
  ICN: "KRW",
  HKG: "HKD",
  BKK: "THB",
  DOH: "QAR",
  CMB: "LKR",
  KTM: "NPR",
};

// Simple in-memory cache per Convex action instance. Actions are short-lived,
// so this mainly helps when several conversions happen within one search
// response (multiple offers, same currency pair) rather than across calls.
const fxCache = new Map<string, number>();

async function getFxRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return 1;

  const key = `${fromCurrency}:${toCurrency}`;
  if (fxCache.has(key)) return fxCache.get(key)!;

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.[toCurrency];
    if (typeof rate === "number") {
      fxCache.set(key, rate);
      return rate;
    }
    return null;
  } catch {
    return null;
  }
}

async function convertToLocal(
  amount: string | number,
  fromCurrency: string,
  originCode: string
): Promise<{ currency: string; amount: number } | null> {
  const localCurrency = AIRPORT_TO_CURRENCY[originCode];
  if (!localCurrency || localCurrency === fromCurrency) return null;

  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(numericAmount)) return null;

  const rate = await getFxRate(fromCurrency, localCurrency);
  if (rate === null) return null;

  return { currency: localCurrency, amount: Math.round(numericAmount * rate * 100) / 100 };
}

function parseDuffelError(status: number, rawBody: string): string {
  try {
    const parsed = JSON.parse(rawBody);
    const messages: string[] = (parsed?.errors ?? [])
      .map((e: any) => e?.message)
      .filter(Boolean);
    if (messages.length > 0) return messages.join(" ");
  } catch {
    // not JSON — fall through to raw text below
  }
  return rawBody.slice(0, 300);
}

// ══════════════════════════════════════════════════════════════
// searchFlights — real Duffel offer-request search
// ══════════════════════════════════════════════════════════════
export const searchFlights = action({
  args: {
    origin: v.string(),       // IATA code, e.g. "DEL"
    destination: v.string(),  // IATA code, e.g. "NRT"
    date: v.string(),         // ISO date, e.g. "2026-12-10"
    adults: v.optional(v.number()),
  },
  handler: async (ctx, { origin, destination, date, adults }) => {
    const url = `${DUFFEL_BASE_URL}/air/offer_requests?return_offers=true`;
    const body = {
      data: {
        slices: [{ origin, destination, departure_date: date }],
        passengers: Array.from({ length: Math.max(1, adults ?? 1) }, () => ({ type: "adult" })),
        cabin_class: "economy",
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: duffelHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(parseDuffelError(res.status, errText));
    }

    const data = await res.json();
    const offers: any[] = data?.data?.offers ?? [];

    // Attach a local-currency conversion to each offer, same as SkyBot does.
    const withConversion = await Promise.all(
      offers.slice(0, 10).map(async (o) => {
        const price = o.total_amount;
        const currency = o.total_currency;
        const converted = await convertToLocal(price, currency, origin);
        let carrier = "Unknown carrier";
        try {
          carrier = o.slices[0].segments[0].operating_carrier.name;
        } catch {
          // leave default
        }
        return {
          id: o.id,
          carrier,
          price,
          currency,
          localConversion: converted, // { currency, amount } | null
          slices: o.slices,
          conditions: o.conditions ?? null,
        };
      })
    );

    return { offers: withConversion, origin, destination, date };
  },
});

// Retries a Duffel GET a couple of times on transient 5xx errors (Duffel's
// docs treat these as retry-worthy — their live pricing/conditions checks can
// briefly hiccup while re-verifying an offer with the airline in real time).
// Does NOT retry on 4xx (e.g. an actually-expired or invalid offer ID) since
// retrying won't fix a permanent client-side error.
async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 2): Promise<Response> {
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, init);
    if (res.ok || res.status < 500) return res;
    lastRes = res;
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1))); // 500ms, then 1000ms
    }
  }
  return lastRes as Response;
}

// ══════════════════════════════════════════════════════════════
// getFareRules — real Duffel offer-detail call for a specific offer
// ══════════════════════════════════════════════════════════════
export const getFareRules = action({
  args: {
    offerId: v.string(),
    originHint: v.optional(v.string()), // pass the origin code again for currency conversion
  },
  handler: async (ctx, { offerId, originHint }) => {
    const url = `${DUFFEL_BASE_URL}/air/offers/${offerId}`;
    const res = await fetchWithRetry(url, { method: "GET", headers: duffelHeaders() });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status >= 500) {
        throw new Error(
          "This fare's live pricing check timed out after a few retries — the offer may have " +
          "expired since your search. Please re-run the search and try again."
        );
      }
      throw new Error(parseDuffelError(res.status, errText));
    }

    const data = await res.json();
    const o = data?.data;
    if (!o) throw new Error("Duffel returned no offer detail data.");

    let carrier = "Unknown carrier";
    try {
      carrier = o.slices[0].segments[0].operating_carrier.name;
    } catch {
      // leave default
    }

    let originCode = originHint;
    try {
      originCode = originCode ?? o.slices[0].origin.iata_code;
    } catch {
      // leave as-is
    }

    const converted = originCode
      ? await convertToLocal(o.total_amount, o.total_currency, originCode)
      : null;

    return {
      carrier,
      price: o.total_amount,
      currency: o.total_currency,
      localConversion: converted,
      conditions: o.conditions ?? null, // { refund_before_departure, change_before_departure, ... }
    };
  },
});