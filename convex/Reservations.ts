import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Real airline PNRs are 6 chars; avoid ambiguous 0/O/1/I for readability.
const PNR_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePnrCode(): string {
  let pnr = "";
  for (let i = 0; i < 6; i++) {
    pnr += PNR_CHARS[Math.floor(Math.random() * PNR_CHARS.length)];
  }
  return pnr;
}

/**
 * Creates a DUMMY reservation — no real Duffel order, no payment, no ticket
 * issued. It exists to demo a full search -> fare rules -> book flow safely.
 * Retries on the (extremely unlikely) case of a PNR collision.
 */
export const createReservation = mutation({
  args: {
    offerId: v.string(),
    carrier: v.string(),
    origin: v.string(),
    destination: v.string(),
    price: v.string(),
    currency: v.string(),
    userId: v.optional(v.id("users")),
    tripId: v.optional(v.id("trips")),
  },
  handler: async (ctx, args) => {
    let pnr = generatePnrCode();
    let existing = await ctx.db
      .query("reservations")
      .withIndex("by_pnr", (q) => q.eq("pnr", pnr))
      .first();

    while (existing) {
      pnr = generatePnrCode();
      existing = await ctx.db
        .query("reservations")
        .withIndex("by_pnr", (q) => q.eq("pnr", pnr))
        .first();
    }

    const id = await ctx.db.insert("reservations", {
      userId: args.userId,
      tripId: args.tripId,
      pnr,
      offerId: args.offerId,
      carrier: args.carrier,
      origin: args.origin,
      destination: args.destination,
      price: args.price,
      currency: args.currency,
      status: "DUMMY_CONFIRMED",
      createdAt: Date.now(),
    });

    return { id, pnr };
  },
});

export const getReservationByPnr = query({
  args: { pnr: v.string() },
  handler: async (ctx, { pnr }) => {
    return await ctx.db
      .query("reservations")
      .withIndex("by_pnr", (q) => q.eq("pnr", pnr.toUpperCase()))
      .first();
  },
});