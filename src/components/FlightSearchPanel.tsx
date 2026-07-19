"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { findIataCode } from "@/lib/airports";
import { buildFlightSearchUrl } from "@/lib/flights";

interface FlightSearchPanelProps {
  destination: string;
  origin: string | undefined;
  date: string;
  tripId?: Id<"trips">;
}

interface OfferResult {
  id: string;
  carrier: string;
  price: string;
  currency: string;
  localConversion: { currency: string; amount: number } | null;
  slices: unknown;
  conditions: unknown;
}

interface FareRulesResult {
  carrier: string;
  price: string;
  currency: string;
  localConversion: { currency: string; amount: number } | null;
  conditions: {
    refund_before_departure?: { allowed?: boolean; penalty_amount?: string; penalty_currency?: string } | null;
    change_before_departure?: { allowed?: boolean; penalty_amount?: string; penalty_currency?: string } | null;
  } | null;
}

interface PnrConfirmation {
  pnr: string;
  carrier: string;
  origin: string;
  destination: string;
  price: string;
  currency: string;
}

function conditionLine(
  label: string,
  cond?: { allowed?: boolean; penalty_amount?: string; penalty_currency?: string } | null
) {
  if (!cond || cond.allowed === undefined) return `${label}: Not specified by the airline for this fare.`;
  if (cond.allowed === false) return `${label}: Not permitted on this fare.`;
  const fee = cond.penalty_amount ? ` (fee: ${cond.penalty_currency ?? ""} ${cond.penalty_amount})` : " (no fee)";
  return `${label}: Permitted${fee}.`;
}

export default function FlightSearchPanel({ destination, origin, date, tripId }: FlightSearchPanelProps) {
  // Today's date in the browser's local timezone, ISO format (YYYY-MM-DD).
  // Duffel rejects any departure_date that isn't strictly after "today" on
  // its own clock, so a trip's originally-stored startDate can go stale
  // (e.g. a demo trip planned for a date that has since passed).
  const todayIso = new Date().toISOString().slice(0, 10);
  const initialDate = date && date >= todayIso ? date : todayIso;

  const [originInput, setOriginInput] = useState(origin ?? "");
  const [destInput, setDestInput] = useState(destination);
  const [dateInput, setDateInput] = useState(initialDate);

  const [results, setResults] = useState<OfferResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [fareRulesFor, setFareRulesFor] = useState<string | null>(null); // offer id currently loading/showing
  const [fareRules, setFareRules] = useState<FareRulesResult | null>(null);
  const [fareRulesLoading, setFareRulesLoading] = useState(false);

  const [bookingFor, setBookingFor] = useState<string | null>(null); // offer id currently booking
  const [pnrModal, setPnrModal] = useState<PnrConfirmation | null>(null);

  const searchFlights = useAction(api.flights.searchFlights);
  const getFareRules = useAction(api.flights.getFareRules);
  const createReservation = useMutation(api.reservations.createReservation);

  const resolvedOriginCode = findIataCode(originInput) ?? (originInput.length === 3 ? originInput.toUpperCase() : null);
  const resolvedDestCode = findIataCode(destInput) ?? (destInput.length === 3 ? destInput.toUpperCase() : null);
  const canSearch = Boolean(resolvedOriginCode && resolvedDestCode && dateInput);

  async function handleSearch() {
    if (!resolvedOriginCode || !resolvedDestCode) {
      setSearchError("Couldn't resolve an airport code for one of these cities — try entering a 3-letter IATA code directly (e.g. DEL, NRT).");
      return;
    }
    if (dateInput < todayIso) {
      setSearchError("That date has already passed — please choose today or a future date to search live fares.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    setResults([]);
    setFareRules(null);
    setFareRulesFor(null);

    try {
      const res = await searchFlights({
        origin: resolvedOriginCode,
        destination: resolvedDestCode,
        date: dateInput,
      });
      setResults(res.offers as OfferResult[]);
      if (res.offers.length === 0) {
        setSearchError(`No flights found for ${resolvedOriginCode} → ${resolvedDestCode} on ${dateInput}.`);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Flight search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleViewFareRules(offerId: string) {
    setFareRulesFor(offerId);
    setFareRules(null);
    setFareRulesLoading(true);
    try {
      const res = await getFareRules({ offerId, originHint: resolvedOriginCode ?? undefined });
      setFareRules(res as FareRulesResult);
    } catch (err) {
      setFareRules({
        carrier: "—",
        price: "—",
        currency: "",
        localConversion: null,
        conditions: null,
      });
      setSearchError(err instanceof Error ? err.message : "Couldn't load fare rules for this offer.");
    } finally {
      setFareRulesLoading(false);
    }
  }

  async function handleBook(offer: OfferResult) {
    setBookingFor(offer.id);
    try {
      const res = await createReservation({
        offerId: offer.id,
        carrier: offer.carrier,
        origin: resolvedOriginCode ?? "?",
        destination: resolvedDestCode ?? "?",
        price: offer.price,
        currency: offer.currency,
        tripId,
      });
      setPnrModal({
        pnr: res.pnr,
        carrier: offer.carrier,
        origin: resolvedOriginCode ?? "?",
        destination: resolvedDestCode ?? "?",
        price: offer.price,
        currency: offer.currency,
      });
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Booking failed.");
    } finally {
      setBookingFor(null);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white text-gray-900">
      {/* Search form */}
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            value={originInput}
            onChange={(e) => setOriginInput(e.target.value)}
            placeholder="City or IATA code"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36 text-gray-900 placeholder-gray-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            value={destInput}
            onChange={(e) => setDestInput(e.target.value)}
            placeholder="City or IATA code"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36 text-gray-900 placeholder-gray-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={dateInput}
            min={todayIso}
            onChange={(e) => setDateInput(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 bg-white"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!canSearch || searching}
          className="text-sm bg-black text-white px-4 py-2 rounded disabled:opacity-40 h-[34px]"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

      {searchError && (
        <div className="text-sm text-red-600 mb-3">
          {searchError}{" "}
          <a
            href={buildFlightSearchUrl(destInput, originInput || undefined, dateInput)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Try Skyscanner instead
          </a>
        </div>
      )}

      {/* Results list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {results.map((o) => (
          <div key={o.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex justify-between items-center gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">{o.carrier}</div>
                <div className="text-sm text-gray-700">
                  {o.currency} {o.price}
                  {o.localConversion && (
                    <span className="text-gray-500">
                      {" "}
                      ≈ {o.localConversion.currency} {o.localConversion.amount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleViewFareRules(o.id)}
                  className="text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded whitespace-nowrap hover:bg-gray-50"
                >
                  Fare rules
                </button>
                <button
                  onClick={() => handleBook(o)}
                  disabled={bookingFor === o.id}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded disabled:opacity-40 whitespace-nowrap"
                >
                  {bookingFor === o.id ? "Booking..." : "Book this fare"}
                </button>
              </div>
            </div>

            {fareRulesFor === o.id && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-800 space-y-1">
                {fareRulesLoading ? (
                  <span className="text-gray-500">Loading fare rules...</span>
                ) : fareRules ? (
                  <>
                    <div className="font-semibold text-gray-900">
                      {fareRules.carrier} — {fareRules.currency} {fareRules.price}
                      {fareRules.localConversion && (
                        <span className="text-gray-500 font-normal">
                          {" "}
                          ≈ {fareRules.localConversion.currency}{" "}
                          {fareRules.localConversion.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div>{conditionLine("Refund before departure", fareRules.conditions?.refund_before_departure)}</div>
                    <div>{conditionLine("Change before departure", fareRules.conditions?.change_before_departure)}</div>
                  </>
                ) : (
                  <span className="text-gray-500">Couldn&apos;t load fare rules for this offer.</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* PNR confirmation modal */}
      {pnrModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setPnrModal(null)}
        >
          <div
            className="bg-white text-gray-900 rounded-lg p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2 text-gray-900">✅ Reservation confirmed</h3>
            <p className="text-sm text-gray-600 mb-4">
              This is a simulated demo booking — no real ticket has been issued and no payment
              was processed.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-900 space-y-1 mb-4">
              <div>
                <span className="text-gray-500">PNR: </span>
                <span className="font-mono font-bold">{pnrModal.pnr}</span>
              </div>
              <div>
                <span className="text-gray-500">Route: </span>
                {pnrModal.origin} → {pnrModal.destination}
              </div>
              <div>
                <span className="text-gray-500">Airline: </span>
                {pnrModal.carrier}
              </div>
              <div>
                <span className="text-gray-500">Fare: </span>
                {pnrModal.currency} {pnrModal.price}
              </div>
            </div>
            <button
              onClick={() => setPnrModal(null)}
              className="text-sm bg-black text-white px-4 py-2 rounded w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}